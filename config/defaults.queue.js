module.exports = {
    defaultType: 'rabbitmq',
    rabbitmq: {
        instance: {
            type: 'rabbitmq',
            appId: Object.defineProperty({}, 'prop', {get: () => process.title}).prop,
            logger: 'message',
            client: {
                host: 'localhost',
                user: 'guest',
                pass: 'guest',
                heartbeat: 30
            },
            channels: {}
        },
        channel: {
            cache: 'messageCache',
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
};
