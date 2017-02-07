const config = require('cheevr-config');
const EventEmitter = require('event').EventEmitter;
const Instance = require('./instance');
const Logger = require('cheevr-logging');


class Manager extends EventEmitter {
    constructor() {
        super();
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
        this.get(queue, host).receive(msg, cb);
    }

    /**
     * Listen for messages on a queue on the default server instance.
     * @param {string} queue                The name of the queue to operate on
     * @param {function} cb                 Callback that will receive err/response
     * @param {string} [instance=_default_] Server instance name to look for queue
     */
    listen(queue, cb, instance) {
        this.get(queue, host``).listen(cb);
    }

    /**
     * Returns a queue object that you can send, receive or listen for messages on.
     * @param {string} queue                The name of the queue you want to operate on
     * @param {string} [instance=_default_] The name name of the message queue instance
     */
    get(queue, instance = '_default_') {
        // TODO create server instance and queues if they don't already exist
        // TODO get the host for this queue OR throw error if it doesn't exist
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
