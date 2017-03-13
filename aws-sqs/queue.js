const Cache = require('../cache');
const EventEmitter = require('events').EventEmitter;
const shortId = require('shortid');
const sqs = new require('aws-sdk').SQS();

class Queue extends EventEmitter {
    constructor(name, host, config) {
        super();
        this._name = name;
        this._config = config;
        this._host = host;
        this._log = host._log;
        this._cache = Cache.get(config.cache, this._log);

    }

    _setUp(db) {

    }

    send(msg, cb, id = shortId.generate()) {

    }

    listen(noAck, cb = noAck, id = shortId.generate()) {

    }

    receive(noAck, cb = noAck, id = shortId.generate()) {

    }

    get name() {
        return this._name;
    }

    get ready() {

    }
}

module.exports = Queue;
