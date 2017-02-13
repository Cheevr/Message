const amqp = require('amqplib');
const Channel = require('./channel');
const EventEmitter = require('events').EventEmitter;
const Logging = require('cheevr-logging');

/**
 * @typedef {object} RabbitInstanceConfig
 * @property {string} type
 * @property {string} appId
 * @property {string} logger
 * @property {RabbitClientConfig} client
 * @property {Object<string, RabbitChannelConfig>} channels
 */

/**
 * This is the configuration object for a RabbitMQ client
 * @typedef {object} RabbitClientConfig
 * @property {string} host      The host dns or ip to connect to
 * @property {string} user      Username for the user on RabbitMQ instance
 * @property {string} pass      Password for the user on RabbitMQ instance
 * @property {number} heartbeat Interval for how often connection to server should be checked
 */

/**
 * @typedef {object} RabbitChannelConfig
 * @property {object} queue             Options for setting up a queue (for more options see
 *                                      http://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue)
 * @property {object} message           Options when sending messages to a queue (for more options see
 *                                      http://www.squaremobius.net/amqp.node/channel_api.html#channel_publish)
 */


class Instance extends EventEmitter {
    /**
     *
     * @param {RabbitInstanceConfig} config
     */
    constructor(config) {
        super();
        this._channels = {};
        this._config = config;
        this._host = config.client.host;
        this._log = Logging[config.logger];
        this.connect();
        this.on('interrupted', () => setTimeout(this.connect.bind(this)), 100);
    }

    /**
     * Will connect to a message server instance and establish all channels.
     * @param {Callback} [cb]
     */
    connect(cb) {
        // TODO allow to specify multiple hosts that we attempt to connect to
        let clientConf = this._config.client;
        let url = 'amqp://';
        url += clientConf.user + ':' + encodeURIComponent(clientConf.pass);
        url += '@' + this._host;
        url += '?heartbeat=' + clientConf.heartbeat;
        amqp.connect(url, (err, connection) => {
            if (err) {
                this._log.error('Unable to connect to messaging server:', this._host);
                this.emit('error', err);
                return cb && cb(err, connection);
            }
            this._log.info('Connected successfully to messaging server:', this._host);
            this._connection = connection;
            connection.on('error', err => {
                this._log.error('Lost connection to messaging server:', this._host, err);
                this.emit('error', err);
                this.disconnect();
                this.emit('interrupted', this);
            });
            this.emit('connected', this);
            this._setUp();
            cb && cb(err, connection);
        });
    }

    /**
     * Disconnect from the messaging server and clear all local stored data.
     * @param {Callback} [cb]
     */
    disconnect(cb) {
        if (this._connection) {
            this._connection.close(() => {
                this._log.debug('Closed connection to messaging server', this._host);
                delete this._connection;
                this._channels = {};
                this.emit('disconnected', this);
                cb && cb();
            });
        } else {
            cb && cb();
        }
    }

    /**
     * Will read the config and create all channels on this server.
     * @private
     */
    _setUp() {
        let defaultConf = this._config.channels._default_;
        if (this._config.channels) {
            for (let name in this._config.channels) {
                if (name == '_default_') {
                    continue;
                }
                let channelConfig = Object.assign({}, defaultConf, this._config.channels[name]);
                let channel = this._channels[name] = new Channel(name, this, channelConfig);
                channel.on('error', err => this.emit('error', err));
            }
        }
    }

    get connection() {
        return this._connection;
    }

    get name() {
        return this._host;
    }

    /**
     * Returns the channel object on which you can send/receive or listen for events
     * @param name
     * @return {Channel}
     */
    channel(name) {
        // TODO the name should include the application as a prefix
        if (!this._channels[name]) {
            let channelConfig = Object.assign({}, this._config.channels._default_, this._config.channels[name]);
            this._channels[name] = new Channel(name, this, channelConfig);
        }
        return this._channels[name];
    }
}

module.exports = Instance;
