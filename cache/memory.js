class MemoryCache {
    constructor() {
        this._queues = {};
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
        cb && cb();
    }

    /**
     * Returns all cached messages and listeners
     * @param {string} queue    The id/name of the queue for which to fetch data
     * @param {Callback} [cb]   Callback function for async fetching
     * @returns {Object<string, Object>}    A map with message id's mapping to payloads
     */
    get(queue, cb) {
        cb && cb(null, this._queues[queue]);
        return this._queues[queue];
    }

    /**
     * Removes all cached data from a queue
     * @param {string} queue    The id/name of the queue to clear
     * @param {Callback} [cb]   Callback to be notified on async clear operations
     */
    clear(queue, cb) {
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
        delete this._queues[queue][id];
        cb && cb();
    }
}

module.exports = MemoryCache;
