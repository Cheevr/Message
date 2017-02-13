const EventEmitter = require('events').EventEmitter;
const shortId = require('shortid');


class Channel extends EventEmitter {
    /**
     *
     * @param {string} name                 The name of this channel
     * @param {Instance} host               The host instance in case we need to access host operations
     * @param {RabbitChannelConfig} config  The configuration for this channel
     */
    constructor(name, host, config) {
        this._name = name;
        this._config = config;
        this._host = host;
        this._log = host._log;
        this.on('error', err => host.emit('error', err));
        host.on('connect', this._setUp.bind(this));
        this._setUp();
    }

    /**
     * Sets up the channel according to configuration.
     * @param {Callback} [cb]
     * @private
     */
    _setUp(cb) {
        let connection = this._host.connection;
        if(!connection) {
            return cb && cb(new Error('Connection is not available yet, channel is not connected'));
        }
        connection.createChannel().then((channel, err) => {
            if (err) {
                return cb && cb(err);
            }
            channel.on('error', err => {
                this._log.error('MQ Channel %s:%s has gone away', this._host.name, this.name, err);
                this.emit('error', err, this);
            });
            channel.on('return', msg => {
                this._log.warn('Message for %s:%s has not been delivered and instead returned on:', this._host.name, this.name, msg);
                this.emit('return', msg, this);
            });
            channel.on('close', () => {
                this._log.debug('Channel closed on %s:%s', this._host.name, this.name);
                this.emit('close', this);
            });
            this._channel = channel;
            this._channel.assertQueue(this._name, this._config.queue);
            cb && cb();
        });
    }

    destroy() {
        this._channel.deleteQueue(this._name);
    }

    get ready() {
        // TODO return ready state
    }

    /**
     * Creates a queue if it doesn't exist and then publishes the given message.
     * @param {string} msg      The message to send
     * @param {Callback} [cb]   A callback that will be called once the request has completed
     * @returns {object} The id that was used for this message
     */
    send(msg, cb) {
        // TODO persists messages until they've been sent successfully
        const id = shortId.generate();
        this._setUp(err => {
            if (err) {
                return cb && cb(err);
            }
            let msgSettings = Object.assign({ messageId: id, timestamp: Date.now() }, this._config.message);
            this._channel.sendToQueue(name, Buffer.from(JSON.stringify(msg), 'utf8'), msgSettings);
            cb && cb(null, id);
        });
        return id;
    }

    /**
     * Register a listener for a queue.
     * @param {boolean} [noAck=false]   Flag this message as one that doesn't need a confirmation upon completion.
     * @param {Callback} [cb]
     */
    listen(noAck, cb = noAck) {
        // TODO on reconnect register all listeners again
        typeof noAck == 'function' && (noAck = false);
        this._setUp(err => {
            if (err) {
                return cb && cb(err);
            }
            let consumerTag = shortId.generate();
            this._channel.consume(this._name, msg => {
                cb && cb(null, JSON.parse(msg.toString('utf8')));
            }, { consumerTag, noAck });
        });
    }

    /**
     * Receive a single message on the given queue.
     * @param {boolean} [noAck=false]   Flag this message as one that doesn't need a confirmation upon completion.
     * @param {Callback} [cb]
     */
    receive(noAck, cb = noAck) {
        // TODO on reconnect set up all receivers
        typeof noAck == 'function' && (noAck = false);
        this._setUp(err => {
            if (err) {
                return cb && cb(err);
            }
            let consumerTag = shortid.generate();
            this._channel.consume(name, msg => {
                this._channel.cancel(consumerTag);
                cb && cb(null, JSON.parse(msg.toString('utf8')));
            }, { consumerTag, noAck });
        });
    }

    get name() {
        return this._name;
    }
}

module.exports = Channel;
