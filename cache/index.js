class Cache {
    /**
     *
     * @param {string} type
     */
    get(type = 'memory') {
        return new (require('./' + type))();
    }
}

module.exports = new Cache();
