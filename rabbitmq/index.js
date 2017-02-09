const amqp = require('amqplib');
const Channel = require('./channel');
const EventEmitter = require('events').EventEmitter;
const Logging = require('cheevr-logging');


class RabbitMQ extends EventEmitter {
    constructor(config) {
        super();
        this._queues = {};
        this._config = config;
        this._host = config.client.host;
        this._log = Logging[config.logger];
        this.connect();
        this.on('interrupted', () => setTimeout(this.connect.bind(this)), 100);
    }

    /**
     * Will connect to a message server instance and establish all queues.
     * @param {Callback} [cb]
     */
    connect(cb) {
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
                this._queues = {};
                this.emit('disconnected', this);
                cb && cb();
            });
        } else {
            cb && cb();
        }
    }

    /**
     * Will read the config and create all channels/queues on this server.
     * @private
     */
    _setUp() {
        let defaultConf = this._config.queues._default_;
        if (this._config.queues) {
            for (let name in this._config.queues) {
                if (name == '_default_') {
                    continue;
                }
                let queueConfig = Object.assign({}, defaultConf, this._config.queues[name]);
                let channel = this._queues[name] = new Channel(queueConfig, this);
                channel.on('error', err => this.emit('error', err));
            }
        }
    }
}

module.exports = RabbitMQ;
