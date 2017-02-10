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
        this._log = Logger[config.queue._default_.logger];
        this._instances = {};
    }

    /**
     * Send a message to a queue on the default server instance.
     * @param {string} queue                The name of the queue to operate on
     * @param {Object|String|Buffer} msg    The message to put on the queue
     * @param {function} cb                 Callback that will receive err/response
     * @param {string} [instance=_default_] Server instance name to look for queue
     */
    send(queue, msg, cb, instance) {
        this.get(queue, instance).send(msg, cb);
    }

    /**
     * Receive a message from a queue on the default server instance.
     * @param {string} queue                The name of the queue to operate on
     * @param {Object|String|Buffer} msg    The message to put on the queue
     * @param {function} cb                 Callback that will receive err/response
     * @param {string} [instance=_default_] Server instance name to look for queue
     */
    receive(queue, msg, cb, instance) {
        this.get(queue, instance).receive(msg, cb);
    }

    /**
     * Listen for messages on a queue on the default server instance.
     * @param {string} queue                The name of the queue to operate on
     * @param {function} cb                 Callback that will receive err/response
     * @param {string} [instance=_default_] Server instance name to look for queue
     */
    listen(queue, cb, instance) {
        this.get(queue, instance).listen(cb);
    }

    /**
     * Returns a queue object that you can send, receive or listen for messages on.
     * @param {string} queue                The name of the queue you want to operate on
     * @param {string} [instance=_default_] The name name of the message queue instance
     */
    get(queue, instance = '_default_') {
        let opts = config.queue[instance];
        if (!opts) {
            // TODO Maybe allow just using the default config
            throw new Error('Trying to connect to an unknown host');
        }
        this._instances[instance] = this._instances[instance] || new require('./' + opts.type)(opts);
        this._instances[instance].on('error', err => this.emit('error', err));
        // TODO return the queue object OR create it if doesn't exists yet based on configuration values/defaults
    }

    /**
     * Middleware function that will add an .mq property on the request that gives access to the message queue system.
     * @param {ClientRequest} req
     * @param {ServerResponse} res
     * @param {function} next
     */
    middleware(req, res, next) {
        // TODO go through all configured server instances and make them on the request object available under req.mq
        // TODO make the default instance available
        next();
    }
}

module.exports = new Manager();
