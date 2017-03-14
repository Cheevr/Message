const Cache = require('../cache');
const EventEmitter = require('events').EventEmitter;
const shortId = require('shortid');


class Channel extends EventEmitter {
    /**
     * @param {string} name                 The name of this channel
     * @param {Instance} host               The host instance in case we need to access host operations
     * @param {RabbitChannelConfig} config  The configuration for this channel
     */
    constructor(name, host, config) {
        super();
        this._name = name;
        this._config = config;
        this._host = host;
        this._log = host._log;
        this._cache = Cache.get(config.cache, this._log);
        this._host.on('reconnected', () => {
            this._cache.get(this.name, (err, entries) => {
                err && this._log.error('Unable to restore cached messages for channel %s:', this.name, err);
                for (let entry of entries) {
                    this._cache.remove(entry);
                    entry.listener && this.listen(entry.noAck, entry.listener, entry.id);
                    entry.receiver && this.receive(entry.noAck, entry.receiver, entry.id);
                    entry.payload && this.send(entry.payload, entry.callback, entry.id);
                }
            });
        });
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
            this._host.once('connected', this._setUp.bind(this));
            return cb && cb(new Error('Connection is not available yet, channel is not connected'));
        }
        connection.createChannel((err, channel) => {
            if (err) {
                return cb && cb(err);
            }
            channel.on('error', err => {
                this._log.error('MQ Channel %s has gone away', this.name, err);
                this.emit('error', err, this);
            });
            channel.on('return', msg => {
                this._log.warn('Message for %s has not been delivered and instead returned on:', this.name, msg);
                this.emit('return', msg, this);
            });
            channel.on('close', () => {
                this._log.debug('Channel closed on %s', this.name);
                this.emit('close', this);
            });
            this._channel = channel;
            this._channel.assertQueue(this.name, this._config.queue);
            cb && cb();
        });
    }

    /**
     * Close this channel and remove all listeners. Once destroyed the channel can no longer be used.
     */
    destroy() {
        this._channel.deleteQueue(this.name, err => {
            err && this._log.warn('There was an error trying to delete queue %s', this.name, err);
            this._channel.removeAllListeners();
            this._cache.clear();
            delete this._channel;
        });
    }

    get ready() {
        return this._channel != null;
    }

    /**
     * Creates a queue if it doesn't exist and then publishes the given message.
     * @param {string} msg      The message to send
     * @param {Callback} [cb]   A callback that will be called once the request has completed
     * @param {string} [id]     The id used for this message
     * @returns {object} The id that was used for this message
     */
    send(msg, cb, id = shortId.generate()) {
        this._cache.store(this.name, {id, payload:msg, callback:cb});
        this._setUp(err => {
            this._cache.remove(this.name, id);
            if (err) {
                return cb && cb(err);
            }
            let msgSettings = Object.assign({ messageId: id, timestamp: Date.now() }, this._config.message);
            this._channel.sendToQueue(this.name, Buffer.from(JSON.stringify(msg), 'utf8'), msgSettings);
            cb && cb(null, id);
        });
        return id;
    }

    /**
     * Register a listener for a queue.
     * @param {Callback} [cb]   The callback function. If the function has 3 parameters the 3rd is a manual callback to
     *                          ack or noAck a message
     * @param {string} [id]     The consumer id for this listener
     */
    listen(cb, id = shortId.generate()) {
        let noAck = !cb || cb.length < 3;
        this._setUp(err => {
            if (err) {
                return cb && cb(err);
            }
            this._cache.store(this.name, { id, listener: cb, noAck });
            this._channel.consume(this._name, msg => {
                cb && cb(null, JSON.parse(msg.content.toString('utf8')), ( ack = true ) => {
                    noAck || (ack ? this._channel.ack(msg) : this._channel.nack(msg));
                });
            }, { consumerTag:id, noAck });
        });
        return id;
    }

    /**
     * Removes a listener with the given id from a queue.
     * @param id
     * @param cb
     */
    unlisten(id, cb) {
        this._channel.cancel(id, cb);
    }

    /**
     * Receive a single message on the given queue.
     * @param {Callback} [cb]   The callback function. If the function has 3 parameters the 3rd is a manual callback to
     *                          ack or noAck a message
     * @param {string} [id]     The consumer id for this receiver
     */
    receive(cb, id = shortId.generate()) {
        let noAck = !cb || cb.length < 3;
        this._setUp(err => {
            if (err) {
                return cb && cb(err);
            }
            this._cache.store(this.name, { id, receiver:cb, noAck });
            this._channel.consume(this.name, msg => {
                this._cache.remove(this.name, id);
                noAck && this._channel.cancel(id);
                cb && cb(null, JSON.parse(msg.content.toString('utf8')), ( ack = true ) => {
                    if (!noAck) {
                        ack ? this._channel.ack(msg) : this._channel.nack(msg);
                        this._channel.cancel(id);
                    }
                });
            }, { consumerTag: id, noAck });
        });
    }

    get name() {
        return this._name;
    }
}

module.exports = Channel;
