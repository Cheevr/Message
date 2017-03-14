const config = require('cheevr-config');
const Database = require('cheevr-database');

class ElasticsearchCache {
    constructor(config, logger) {
        this._db = Database.factory(config.database);
        this._log = logger;
        this._config = config;
    }

    store(queue, payload, cb) {
        if (!payload.id) {
            throw new Error('Unable to cache message queue payload because of missing id');
        }
        this._db.indices.existsType({
            index: this._config.index,
            type: queue
        }, err => {
            this._createMapping(err && queue, err => {
                if (err) {
                    return cb && cb(err);
                }
                this._db.index({
                    index: this._config.type,
                    type: queue,
                    id: payload.id,
                    body: {
                        date: Date.now(),
                        content: payload
                    }
                }, err => cb && cb(err));
            });
        });
    }

    _createMapping(type, cb) {
        if (!type) {
            return cb();
        }
        this._db.indices.putMapping({
            index: this._config.index,
            type,
            body: {
                properties: {
                    date: { type:'date' },
                    content: { dynamic: true, enabled: false }
                }
            }
        }, cb);
    }

    get(queue, cb) {
        this._db.search({
            index: this._config.index,
            type: queue,
            body: {
                query: {
                    match_all: {}
                },
                sort: [{
                    date: { order: 'desc' }
                }]
            }
        }, (err, results) => {
            if (err) {
                return cb && cb([]);
            }
            let response = [];
            for (let hit of results.hits.hits) {
                response.push(hit._source);
            }
            cb && cb(response);
        });
    }

    clear(queue, cb) {
        this._db.deleteByQuery({
            index: this._config.index,
            type: queue,
            body: {
                query: {
                    match_all: {}
                }
            }
        }, err => {
            err && this._log.warn('Error trying to clear queue %s from elasticsearch', queue, err);
            cb && cb();
        });
    }

    remove(queue, id, cb) {
        this._db.delete({
            index: this._config.index,
            type: queue,
            id
        }, err => {
            err && this._log.warn('Error trying to remove an entry from elasticsearch stored queue %s and id %s:', queue, id, err);
            cb && cb();
        });
    }
}

module.exports = ElasticsearchCache;
