const _ = require('lodash');
const config = require('cheevr-config');
const globalConfig = require('cheevr-config').addDefaultConfig(__dirname, 'config');
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
        this.reset();
    }

    /**
     * Resets and removes all instances. Allows to optionally pass in a configuration.
     * @param {Object<string, InstanceConfig>} [config] A map with names pointing to instance configuration
     * @returns {Instance.Manager}
     */
    reset(config = _.cloneDeep(globalConfig.queue)) {
        this._instances = {};
        config && this.configure(config);
        return this;
    }

    /**
     * Set the configuration for the message queues manually.
     * @param {Object<string, InstanceConfig>} config   A map with names pointing to instance configuration
     * @param {boolean} [merge=false]                   Whether to merge the given config with the current one.
     * @returns {Instance.Manager}
     */
    configure(config, merge) {
        merge ? Object.assign(this._config, config) : this._config = config;
        return this;
    }

    /**
     * Returns the instance object that holds information about all the channels it has.
     * @param {string} [name=_default_] The name of instance to return.
     * @returns {Instance}
     */
    instance(name = '_default_') {
        let opts = this._config[name];
        if (!opts) {
            opts =  config.defaults.queue[config.defaults.queue.defaultType].instance;
        }
        let type = (opts && opts.type) || config.defaults.queue.defaultType;
        this._instances[name] = this._instances[name] || new (require('./' + type))(name, opts);
        this._instances[name].on('error', err => this.emit('error', err));
        return this._instances[name];
    }

    /**
     * Returns a channel object that you can send, receive or listen for messages on.
     * @param {string} name                     The name of the channel you want to operate on
     * @param {string} [instanceName=_default_] The name name of the message queue instance
     * @returns {Channel}
     */
    queue(name, instanceName) {
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
        for (let instanceName in this._config) {
            if (this._config[instanceName].default || !defaultInstance) {
                defaultInstance = this.instance(instanceName);
            }
        }
        if (defaultInstance) {
            for (let instanceName in this._config) {
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
     * @param {string} queue                The name of the queue to operate on
     * @param {string} [instance=_default_] Server instance name to look for queue
     * @param {Object|String|Buffer} msg    The message to put on the queue
     * @param {function} cb                 Callback that will receive err/response
     */
    send(queue, instance, msg, cb) {
        if (!(instance instanceof String)) {
            cb = msg;
            msg = instance;
            instance = undefined;
        }
        return this.queue(queue, instance).send(msg, cb);
    }

    /**
     * Receive a message from a queue on the default server instance.
     * @param {string} queue                The name of the queue to operate on
     * @param {string} [instance=_default_] Server instance name to look for queue
     * @param {function} cb                 Callback that will receive err/response
     */
    receive(queue, instance, cb) {
        if (!(instance instanceof String)) {
            cb = instance;
            instance = undefined;
        }
        return this.queue(queue, instance).receive(cb);
    }

    /**
     * Listen for messages on a queue on the default server instance.
     * @param {string} queue                The name of the queue to operate on
     * @param {string} [instance=_default_] Server instance name to look for queue
     * @param {function} cb                 Callback that will receive err/response
     * @returns {string} The consumer id that can be used to unlisten.
     */
    listen(queue, instance, cb) {
        if (!(instance instanceof String)) {
            cb = instance;
            instance = undefined;
        }
        return this.queue(queue, instance).listen(cb);
    }

    /**
     * Remove a listener on a queue on the default service instance.
     * @param {string} queue                The name of the queue to operate on
     * @param {string} [instance=_default_] Server instance name to look for queue
     * @param {string} id                   The consumer id of the listener
     * @param {function} cb                 Callback that will receive err/response
     * @returns {*}
     */
    unlisten(queue, instance, id, cb) {
        if (!(instance instanceof String)) {
            cb = id;
            id = instance;
            instance = undefined;
        }
        return this.queue(queue, instance).unlisten(id, cb);
    }
}

module.exports = new Manager();
