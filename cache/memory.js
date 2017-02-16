class MemoryCache {
    constructor() {
        this._queues = {};
    }

    store(queue, payload) {
        if (!payload.id) {
            throw new Error('Unable to cache message queue payload because of missing id');
        }
        this._queues[queue][payload.id] = payload;
    }

    get(queue) {
        return this._queues[queue];
    }

    clear(queue) {
        delete this._queues[queue]
    }

    remove(queue, id) {
        delete this._queues[queue][id];
    }
}

module.exports = MemoryCache;
