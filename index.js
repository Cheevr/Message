const config = require('cheevr-config').addDefaultConfig(__dirname, 'config');
const EventEmitter = require('events').EventEmitter;
const Logger = require('cheevr-logging');

/**
 * The standard callback definition that can be used anywhere where standards are followed.
 * @typedef {function} Callback
 * @param {Error|string} [err]  Will contain error information if there's has been one
 * @param {*} [...args]
 */


class Manager extends EventEmitter {
    constructor() {
        super();
        this._instances = {};
        this._config = config.queue;
        this.configure(config.queue);
    }

    configure(config, merge) {
        merge && Object.assign(this._config, config);
        this._log = Logger[this._config._default_.logger];
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
        this._instances[name] = this._instances[name] || new (require('./' + opts.type))(opts);
        this._instances[name].on('error', err => this.emit('error', err));
        return this._instances[name];
    }

    /**
     * Returns a channel object that you can send, receive or listen for messages on.
     * @param {string} name                The name of the channel you want to operate on
     * @param {string} [instanceName=_default_] The name name of the message queue instance
     * @returns {Channel}
     */
    channel(name, instanceName = '_default_') {
        return this.instance(instanceName).channel(name);
    }

    /**
     * Middleware function that will add an .mq property on the request that gives access to the message queue system.
     * @returns {function}  The middleware function that can be used by any standard express format web server.
     */
    middleware() {
        let defaultInstance;
        for (let instanceName in config.queue) {
            if (config.queue[instanceName.default]) {
                defaultInstance = this.instance(instanceName)
            }
        }
        if (defaultInstance) {
            for (let instanceName in config.queue) {
                if (config.queue[instanceName.default]) {
                    defaultInstance[instanceName] = this.instance(instanceName)
                }
            }
        }
        return (req, res, next) => {
            req.mq = defaultInstance;
            next();
        }
    }

    /**
     * Send a message to a queue on the default server instance.
     * @param {string} channel                The name of the queue to operate on
     * @param {Object|String|Buffer} msg    The message to put on the queue
     * @param {function} cb                 Callback that will receive err/response
     * @param {string} [instance=_default_] Server instance name to look for queue
     */
    send(channel, msg, cb, instance) {
        this.get(channel, instance).send(msg, cb);
    }

    /**
     * Receive a message from a queue on the default server instance.
     * @param {string} channel                The name of the queue to operate on
     * @param {Object|String|Buffer} msg    The message to put on the queue
     * @param {function} cb                 Callback that will receive err/response
     * @param {string} [instance=_default_] Server instance name to look for queue
     */
    receive(channel, msg, cb, instance) {
        this.get(channel, instance).receive(msg, cb);
    }

    /**
     * Listen for messages on a queue on the default server instance.
     * @param {string} channel                The name of the queue to operate on
     * @param {function} cb                 Callback that will receive err/response
     * @param {string} [instance=_default_] Server instance name to look for queue
     */
    listen(channel, cb, instance) {
        this.get(channel, instance).listen(cb);
    }
}

module.exports = new Manager();
