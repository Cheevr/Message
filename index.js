const config = require('cheevr-config').addDefaultConfig(__dirname, 'config');
const EventEmitter = require('events').EventEmitter;

/**
 * The standard callback definition that can be used anywhere where standards are followed.
 * @typedef {function} Callback
 * @param {Error|string} [err]  Will contain error information if there's has been one
 * @param {*} [...args]
 */

/**
 * The generic instance configuration that will be implemented by the individual instance implementations
 * @typedef {object} InstanceConfig
 * @property {string} type  The type of message service to use
 * @abstract
 */


/**
 * This event is fired whenever a connection to the RabbitMQ server has been established
 * @event Instance#connected
 * @param {Instance} instance   The instance that emitted the event
 */

/**
 * This event is fired whenever a connection to the RabbitMQ server is lost
 * @event Instance#disconnected
 * @param {Instance} instance   The instance that emitted the event
 */

/**
 * This event is fired whenever a connection to the RabbitMQ server is interrupted (as in unexpectedly disconnected)
 * @event Instance#interrupted
 * @param {Instance} instance   The instance that emitted the event
 */

/**
 * This event is fired whenever a connection to the RabbitMQ server has been established after it has been lost
 * through an interrupt.
 * @event Instance#reconnected
 * @param {Instance} instance   The instance that emitted the event
 */

/**
 * Whenever this host or one of the channels emits an error it will emitted as an error
 * @event Instance#error
 * @param {Error|string}        The error that occurred
 * @param {Instance} instance   The instance that emitted the event
 * @param {Channel} [channel]   If the error was emitted from the channel this is the instance that emitted it
 */


class Manager extends EventEmitter {
    constructor() {
        super();
        this._instances = {};
        this._config = config.queue;
        this.configure(config.queue);
    }

    /**
     * Set the configuration for the message queues manually.
     * @param {Object<string, InstanceConfig>} config   A map with names pointing to instance configuration
     * @param {boolean} [merge=false]                   Whether to merge the given config with the current one.
     */
    configure(config, merge) {
        merge ? Object.assign(this._config, config) : this._config = config;
    }

    /**
     * Returns the instance object that holds information about all the channels it has.
     * @param {string} name The name of instance to return.
     * @returns {Instance}
     */
    instance(name = '_default_') {
        let opts = config.queue[name];
        if (!opts) {
            throw new Error('Missing configuration for message queue server named ' + name);
        }
        name != '_default_' && (opts = Object.assign({}, config.queue._default_, opts || {}));
        this._instances[name] = this._instances[name] || new (require('./' + opts.type))(name, opts);
        this._instances[name].on('error', err => this.emit('error', err));
        return this._instances[name];
    }

    /**
     * Returns a channel object that you can send, receive or listen for messages on.
     * @param {string} name                     The name of the channel you want to operate on
     * @param {string} [instanceName=_default_] The name name of the message queue instance
     * @returns {Channel}
     */
    queue(name, instanceName = '_default_') {
        return this.instance(instanceName).channel(name);
    }

    /**
     * Checks each instance and channel if they are connected.
     * @returns {boolean}
     */
    ready() {
        for (let name in this._instances) {
            if (!this._instances[name].ready) {
                return false;
            }
        }
        return true;
    }

    /**
     * Middleware function that will add an .mq property on the request that gives access to the message queue system.
     * The default message queue will be made available right on the .mq object, others will be reachable through their
     * name on .mq.<queueName>. Should there be no default queue defined, the first one found will be used as default.
     * @returns {function}  The middleware function that can be used by any standard express format web server.
     */
    middleware() {
        let defaultInstance;
        for (let instanceName in config.queue) {
            if (instanceName != '_default_' && (config.queue[instanceName.default] || !defaultInstance)) {
                defaultInstance = this.instance(instanceName);
            }
        }
        if (defaultInstance) {
            for (let instanceName in config.queue) {
                defaultInstance[instanceName] = this.instance(instanceName)
            }
        }
        return (req, res, next) => {
            req.mq = defaultInstance;
            next();
        }
    }

    /**
     * Send a message to a queue on the default server instance.
     * @param {string} queue              The name of the queue to operate on
     * @param {string} [instance=_default_] Server instance name to look for queue
     * @param {Object|String|Buffer} msg    The message to put on the queue
     * @param {function} cb                 Callback that will receive err/response
     */
    send(queue, instance, msg, cb) {
        if (instance instanceof String) {
            cb = msg;
            msg = instance;
            instance = '_default_';
        }
        this.queue(queue, instance).send(msg, cb);
    }

    /**
     * Receive a message from a queue on the default server instance.
     * @param {string} queue              The name of the queue to operate on
     * @param {string} [instance=_default_] Server instance name to look for queue
     * @param {boolean} [noAck=false]       Whether the server should expect an acknowledgement from the client or not
     * @param {function} cb                 Callback that will receive err/response
     */
    receive(queue, instance, noAck, cb) {
        if (typeof instance != 'string') {
            cb = noAck;
            noAck = instance;
            instance = '_default_';
        }
        if (typeof noAck != 'boolean') {
            cb = noAck;
            noAck = false;
        }
        this.queue(queue, instance).receive(noAck, cb);
    }

    /**
     * Listen for messages on a queue on the default server instance.
     * @param {string} queue              The name of the queue to operate on
     * @param {string} [instance=_default_] Server instance name to look for queue
     * @param {boolean} [noAck=false]       Whether the server should expect an acknowledgement from the client or not
     * @param {function} cb                 Callback that will receive err/response
     */
    listen(queue, instance, noAck, cb) {
        if (typeof instance != 'string') {
            cb = noAck;
            noAck = instance;
            instance = '_default_';
        }
        if (typeof noAck != 'boolean') {
            cb = noAck;
            noAck = false;
        }
        this.queue(queue, instance).listen(noAck, cb);
    }
}

module.exports = new Manager();
