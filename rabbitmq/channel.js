const EventEmitter = require('events').EventEmitter;


class Channel extends EventEmitter {
    /**
     *
     * @param {Object} config   The configuration for this channel
     * @param {RabbitMQ} host   The host instance in case we need to access host operations
     */
    constructor(config, host) {
        this._config = config;
        this._host = host;
        this.on('error', err => host.emit('error', err));
        host.on('connect', this._setUp.bind(this));
    }

    /**
     * Sets up the channel according to configuration.
     * @private
     */
    _setUp() {

    }
}

module.exports = Channel;
