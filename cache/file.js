const fs = require('fs');
const path = require('path');


/**
 * @typedef {Object} FileCacheConfig
 * @extends CacheConfig
 * @property {string} [path=queues] The directory in which to store queue information
 */

const cwd = process.cwd();

/**
 * This cache implementation will store queues and messages on disk in a given directory. Queues are mapped to
 * directories and message are stored as files. All data is also cached in memory, so that file read access only
 * happens after a reboot through lazy initialization.
 */
class FileCache {
    /**
     * @param {FileCacheConfig} config
     */
    constructor(config) {
        this._path = FileCache._mkDir(config && config.path || 'queues');
        this._queues = {};
    }

    /**
     * Recursively creates a path if doesn't exist yet.
     * @param {string} dir  An absolute path to be created
     * @private
     */
    static _mkDir(dir) {
        dir = path.isAbsolute(dir) ? dir : path.join(cwd, dir);
        let fullPath = '';
        for (let entry of dir.split(path.sep)) {
            fullPath += '/' + entry;
            fs.existsSync(fullPath) || fs.mkdirSync(fullPath);
        }
        return dir;
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
        let fullPath = path.join(this._path, queue);
        fs.existsSync(fullPath) || fs.mkdirSync(fullPath);
        fs.writeFile(path.join(fullPath, payload.id), JSON.stringify(payload), 'utf8', err => cb && cb(err));
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
            return this._queues[queue];
        }
        let fullPath = path.join(this._path, queue);
        let files = fs.readdirSync(fullPath);
        let response = {};
        for (let file of files) {
            let payload = JSON.parse(fs.readFileSync(path.join(fullPath, file), 'utf8'));
            response[payload.id] = payload;
        }
        cb && cb(null, response);
        return response;
    }

    /**
     * Removes all cached data from a queue
     * @param {string} queue    The id/name of the queue to clear
     * @param {Callback} [cb]   Callback to be notified on async clear operations
     */
    clear(queue, cb) {
        let fullPath = path.join(this._path, queue);
        fs.existsSync(fullPath) && fs.unlinkSync(fullPath);
        delete this._queues[queue];
        cb && cb();
    }

    /**
     * Remove an entry from cache.
     * @param {string} queue    The id/name of the queue from which to remove the message
     * @param {string} id       The id of the message to remove
     * @param {Callback} [cb]   Callback to be notified on async remove operations
     */
    remove(queue, id, cb) {
        let fullPath = path.join(this._path, queue, id);
        fs.existsSync(fullPath) && fs.unlinkSync(fullPath);
        delete this._queues[queue][id];
        cb && cb();
    }

    /**
     * Returns the path under which all queues are being cached
     * @returns {string}
     */
    get path() {
        return this._path;
    }
}

module.exports = FileCache;
