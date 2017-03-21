const _ = require('lodash');
const amqp = require('amqplib/callback_api');
const Channel = require('./channel');
const config = require('cheevr-config');
const EventEmitter = require('events').EventEmitter;
const Logging = require('cheevr-logging');

/**
 * @typedef {object} RabbitInstanceConfig
 * @extends InstanceConfig
 * @property {string} appId                                 The appId with which to identify this application in queue names
 * @property {string} logger                                The name of the logger to use
 * @property {RabbitClientConfig} client                    The client configuration object
 * @property {Object<string, RabbitChannelConfig>} channels A map with channel configurations
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
 * @property {string} cache         The name of the cache instance to use for caching purposes
 * @property {object} queue         Options for setting up a queue (for more options see
 *                                  http://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue)
 * @property {object} message       Options when sending messages to a queue (for more options see
 *                                  http://www.squaremobius.net/amqp.node/channel_api.html#channel_publish)
 */


/**
 * TODO close open client connections on exit for graceful shutdown
 * @fires Instance#connected
 * @fires Instance#disconnected
 * @fires Instance#interrupted
 * @fires Instance#reconnected
 * @fires Instance#error
 */
class Instance extends EventEmitter {

    /**
     *
     * @param {string} name
     * @param {RabbitInstanceConfig} instanceConfig
     */
    constructor(name, instanceConfig) {
        super();
        this._channels = {};
        this._name = name;
        this._config = _.defaultsDeep({}, instanceConfig, config.defaults.queue.rabbitmq.instance);
        this._host = this._config.client.host;
        this._log = Logging[this._config.logger];
        this._interrupted = false;
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
                this._interrupted = true;
                this.emit('error', err);
                this.emit('interrupted', this);
                this.disconnect();
            });
            this.emit('connected', this);
            if (this._interrupted) {
                this._interrupted = false;
                this.emit('reconnected', this);
            }
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
        if (this._config.channels) {
            for (let name in this._config.channels) {
                let channel = this._channels[name] = new Channel(this.name + '-' + name, this, this._config.channels[name]);
                channel.on('error', err => this.emit('error', err, this, channel));
            }
        }
    }

    get connection() {
        return this._connection;
    }

    get name() {
        return this._name;
    }

    get config() {
        return this._config;
    }

    get ready() {
        if (!this._connection) {
            return false;
        }
        for (let name in this._channels) {
            if (!this._channels[name].ready) {
                return false;
            }
        }
        return true;
    }

    /**
     * Returns the channel object on which you can send/receive or listen for events
     * @param name
     * @return {Channel}
     */
    channel(name) {
        if (!this._channels[name]) {
            let channel = this._channels[name] = new Channel(this.name + '-' + name, this, this._config.channels[name]);
            channel.on('error', err => this.emit('error', err, this, channel));
        }
        return this._channels[name];
    }
}

module.exports = Instance;
