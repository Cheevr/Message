const async = require('async');
const s3 = new require('aws-sdk').S3();

/**
 * @typedef {Object} S3CacheConfig
 * @extends CacheConfig
 * @property {string} bucket
 * @property {string} [region]
 * @property {string} [key]
 * @property {string} [secret]
 */


class S3Cache {
    /**
     * @param {S3CacheConfig} config
     * @param {Object} logger
     */
    constructor(config, logger) {
        this._config = config;
        this._log = logger;
        this._queues = {};
        s3.createBucket({
            Bucket: config.bucket,
            ACL: 'private',
            CreateBucketConfiguration: {
                LocationConstraint: config.region || 'us-west-1'
            },
        }, err => err && logger.error('Unable to create bucket %s for message queue caching', config.bucket));
    }

    /**
     * Stores the payload in cache.
     * @param {string} queue        The id/name of the queue to cache for
     * @param {object} payload      The data to cache
     * @param {string} payload.id   The id that is being used to reference the message later on
     * @param {Callback} [cb]       Callback to be notified on async store operations
     */
    store(queue, payload, cb) {
        if (!payload.id) {
            throw new Error('Unable to cache message queue payload because of missing id');
        }
        this._queues[queue][payload.id] = payload;
        s3.putObject({
            Bucket: this._config.bucket,
            Key: queue + '/' + payload.id,
            Body: Buffer.from(JSON.stringify(payload), 'utf8'),
            ContentType: 'application/json'
        }, cb);
    }

    /**
     * Returns all cached messages and listeners
     * @param {string} queue    The id/name of the queue for which to fetch data
     * @param {Callback} [cb]   Callback function for async fetching
     * @returns {Object<string, Object>}    A map with message id's mapping to payloads
     */
    get(queue, cb) {
        if (this._queues[queue]) {
            cb(null, this._queues[queue]);
        }
        s3.listObjectsV2({
            Bucket: this._config.bucket,
            Prefix: queue
        }, (err, data) => {
            let response = {};
            let tasks = [];
            for (let entry of data.Contents) {
                tasks.push(cb => {
                    s3.getObject({
                        Bucket: this._config.bucket,
                        Key: entry.Key
                    }, (err, data) => {
                        if (err) {
                            return cb(err);
                        }
                        let payload = JSON.parse(data.Body.toString('utf8'));
                        response[payload.id] = payload;
                        cb();
                    });
                });
            }
            async.parallel(tasks, err => {
                cb(err, response);
            });
        });
    }

    /**
     * Removes all cached data from a queue
     * @param {string} queue    The id/name of the queue to clear
     * @param {Callback} [cb]   Callback to be notified on async clear operations
     */
    clear(queue, cb) {
        delete this._queues[queue];
        s3.listObjectsV2({
            Bucket: this._config.bucket,
            Prefix: queue
        }, (err, data) => {
            let keys = [];
            for (let entry of data.Contents) {
                keys.push({
                    Key: entry.Key
                })
            }
            s3.deleteObjects({
                Bucket: this._config.bucket,
                Delete: {
                    Objects: keys
                }
            }, cb);
        });
    }

    /**
     * Remove an entry from cache.
     * @param {string} queue    The id/name of the queue from which to remove the message
     * @param {string} id       The id of the message to remove
     * @param {Callback} [cb]   Callback to be notified on async remove operations
     */
    remove(queue, id, cb) {
        delete this._queues[queue][id];
        s3.deleteObjects({
            Bucket: this._config.bucket,
            Delete: {
                Objects: [{
                    Key: queue + '/' + id
                }]
            }
        }, cb);
    }
}

module.exports = S3Cache;
