module.exports = {
    _default_: {
        type: 'rabbitmq',
        appId: Object.defineProperty({}, 'prop', { get: () => process.title }).prop,
        logger: 'message',
        client: {
            host: 'localhost',
            user: 'queue-client',
            pass: 'ChangeMe!!!',
            heartbeat: 30
        },
        channels: {
            _default_: {
                cache: {
                    type: 'memory'
                },
                queue: {
                    durable: true,
                    messageTtl: 24 * 60 * 60 * 1000 // 24h
                },
                message: {
                    persistent: true,
                    mandatory: true
                }
            }
        }
    }
};
