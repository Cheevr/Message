const EventEmitter = require('events').EventEmitter;
const Queue = require('./queue');

class Instance extends EventEmitter {
    constructor(config) {
        this._queues = {};
        super();
    }
}

module.exports = Instance;
