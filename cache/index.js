/**
 * @typedef {Object} CacheConfig
 * @property {string} type  The cache type that should be used to store data. Maps directly to the file names of the caches
 */

class Cache {
    /**
     * @param {CacheConfig} config
     * @param {Object} logger
     */
    get(config, logger) {
        logger.trace('Using %s as caching mechanism for message queues', config.type);
        return new (require('./' + config.type))(config, logger);
    }
}

module.exports = new Cache();
