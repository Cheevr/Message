# Cheevr-Message
[![npm version](https://badge.fury.io/js/%40cheevr%2Fmessage.svg)](https://badge.fury.io/js/%40cheevr%2Fmessage)
[![Build Status](https://travis-ci.org/Cheevr/Message.svg?branch=master)](https://travis-ci.org/Cheevr/Message)
[![Coverage Status](https://coveralls.io/repos/Cheevr/Message/badge.svg?branch=master&service=github)](https://coveralls.io/github/Cheevr/Message?branch=master)
[![Dependency Status](https://david-dm.org/Cheevr/Message.svg)](https://david-dm.org/Cheevr/Message)

# About

This modules is wrapper around common message queue operations that will automate things like connection tracking
and message caching. Right now we only support RabbitMQ as a sink, but further systems will be added over time.
The configuration uses [@cheevr/config](https://github.com/cheevr/config) to support tiered config files.


# Installation

```Bash
npm i @cheevr/message
```


# Example

The module uses a config file to set up channels and specify behavior. To get started create a new file in your
project under **config/default.json**:

```JavaScript
{
    "myInstance": {
        "appId": "myApp",
        "channels": {
            "channel1": {}
        }
    }
}
```

since we're using the default settings we don't actually have to specify anything for our first channel. Using this
channel is now pretty simple:

```JavaScript
const MQ = require('@cheevr/message');
const myQ = MQ.instance('myInstance');

myQ.listen('channel1', (err, msg) => {
    console.log('msg');
});

myQ.on('connected', () => {
    myQ.send('channel1', 'Hello world');
});
```

And this snippet of code will write "Hello World" to the terminal.


# Configuration

The configuration system uses [@cheevr/config](https://github.com/cheevr/config) to read config files from disk. The
system supports reading configs for different environments with sensible defaults for all ops. For more details check
the documentation in the project page.

## queue.<instance> {Map<string, object>}

The module supports connecting to multiple queue instances. Each configuration is mapped with it's own configuration
key.

## queue.<instance>.type {string = "rabbitmq" }

This sets the queue implementation which defaults to rabbitmq. Since this is the only implementation right now all
subsequent options will most likely be specific to rabbitmq.

## queue.<instance>.appId {string = process.title}

Sets the appId with which this client will identify itself on rabbitmq.

## queue.<instance>.logger {string = "message"}

Specifies the name of the logger to be used. A predefined logger named message has been defined that you can overwrite.
Alternatively you can change the name to a different logger that you define yourself. For more information check out
the documentation at [@cheevr/logging](https://github.com/cheevr/logging).

## queue.<instance>.client {object}

This is the client configuration that is used to set various rabbitmq options.

## queue.<instance>.client.host {string = "localhost"}

Sets the hostname to which to connect with.

## queue.<instance>.client.user {string = "guest" }

Sets the username with which to connect with.

## queue.<instance>.client.pass {string = "guest"}

Sets the password with which to connect with.

## queue.<instance>.client.heartbeat {number = 30}

Sets the interval with which to check whether the service is up and running.

## queue.<instance>.channels {Map<string, object>}

This is another map in which you can specify what channels you want to set up. Each key is the channel name with the
value specifying the channel configuration.

## queue.<instance>.channels.<channel>.cache {string = "messageCache"}

This module supports caching queued up messages to ensure that data is sent when connection lost and reestablished
with a rabbitmq instance. The default configuration will cache these messages to the file system so that even restarts
can be dealt with. The module uses [@cheevr/cache](https://github.com/cheevr/cache) for this. For more information
on how to configure your cache differently check out the projects documentation. This option allows to change the cache
reference should you choose to prefer a different configuration.

## queue.<instance>.channels.<channel>.queue {object}

This is the configuration object that is passed on to rabbitmq when asserting a queue. For more details on the available
options check out the [RabbitMQ documentation](http://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue).

## queue.<instance>.channels.<channel>.queue.durable {boolean = true}

Specifies whether a queue should survive a broker restart.

## queue.<instance>.channels.<channel>.queue.messageTtl {number = 86400000 (24h)}

Specifies how long messages should be kept (in ms) on a queue without being processed.

## queue.<instance>.channels.<channel>.message {object}

This is the configuration object that is passed on to rabbitmq when posting a message onto a queue. For more details on
the available options check out the [RabbitMQ documentation](http://www.squaremobius.net/amqp.node/channel_api.html#channel_publish).

## queue.<instance>.channels.<channel>.message.persistent {boolean = true}

Specifies whether a message should survive a broker restart (assuming the queue is also persistent)

## queue.<instance>.channels.<channel>.message.mandatory {boolean = true}

Specifies whether the message should be returned if there are no bindings for the given queue.


# API

## MQ.reset({Map<string, InstanceConfig>} \[config\])

## MQ.configure({Map<string, InstanceConfig>} config, {boolean} \[merge = true\])

## MQ.instance({string} \[name = "_default_"\])

## MQ.queue({string} name, {string} \[instanceName = "_default_"\])

## MQ.ready()

## MQ.middleware()

## MQ.send({string} queue, {string} \[instance = "_default_",\], {*} msg, {function} callback)

## MQ.receive({string} queue, {string} \[instance = "_default_",\], {function} callback)

## MQ.listen({string} queue, {string} \[instance = "_default_",\], {function} callback)

## MQ.unlisten({string} queue, {string} \[instance = "_default_",\], {string} id, {function} callback)

## <instance>.connect({function} callback)

## <instance>.disconnect({function} callback)

## <instance>.connection

## <instance>.name

## <instance>.config

## <instance>.ready

## <instance>.channel({string} name)

## <channel>.destroy()

## <channel>.ready

## <channel>.send({*} msg, {function} \[callback\], {string} \[id\])

## <channel>.listen({function} \[callback\], {string} \[id\])

## <channel>.unlisten({string} \[id\], {function} \[callback\])

## <channel>.receive({function} \[callback\], {string} \[id\])


# Future Features for Consideration

* Add implementations for other message queues (e.g. Kafka, SQS, Redis)
* Support passing ids to channels form MQ Manager instance
