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

For more examples check out the test folder.


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

Allows to reset the entire system and triggers a reload of the configuration. An optional configuration
map the has the same structure as the document format can be passed in if you want to override specific
instance configurations.
Returns as a reference of the MQ instance so that methods can be chained.

## MQ.configure({Map<string, InstanceConfig>} config, {boolean} \[merge = true\])

If you want to change the configuration for your queues at runtime you can use this method to override
them. File configs will still be applied as defaults if they are not overridden.
Returns as a reference of the MQ instance so that methods can be chained.

## MQ.instance({string} \[name = "_default_"\])

This will return the instance of the queue that you want to operate on. If no name is given a default
queue is returned that tries to connect to localhost via rabbitmq. You can override the behavior of this
queue by specifying a queue name "_default_" in your configuration.

## MQ.queue({string} name, {string} \[instanceName = "_default_"\])

This will return a reference to a named channel/queue on a given instance. If no instanceName is given
the default queue will be assumed. See below what methods are available on a channel.

## MQ.ready()

Returns true if all instances and their queues are ready for operation.

## MQ.middleware()

This method makes it easy to make message queue instances available on request handlers. Every request
object of a standard handler will have a new ```req.mq``` property. The default instance will have its
methods available directly on the object, while named instances will be properties on the mq object.

E.g. calling ```req.mq.send('mychannel', 'a message')``` will send a message on the default instance.
Calling ```req.mq.myinstance.send('myotherchannel', 'a message')``` will send a message on the
instance called **myinstance**.

## MQ.send({string} queue, {string} \[instance = "_default_",\], {*} msg, {function} callback)

This will send a message on the given queue for the name instance. If no instance name is given the
default instance is used.

## MQ.receive({string} queue, {string} \[instance = "_default_",\], {function} callback)

This will allow you to receive a single message from a given queue for the name of the instance. If no
instance name is given the default instance is used.

## MQ.listen({string} queue, {string} \[instance = "_default_",\], {function} callback)

This will allow you to receive all messages from a given queue for the name of the instance. If no
instance name is given the default instance is used.
Returns the consumer id that can be used to remove the listener (see next method)

## MQ.unlisten({string} queue, {string} \[instance = "_default_",\], {string} id, {function} callback)

This will allow you to remove a message listener from a given queue for the name of the instance. If no
instance name is given the default instance is used. The required id to identify the queue is returned
from the **listen()** method.

## <instance>.connect({function} callback)

This will cause the instance to try to connect to the rabbitmq server using the existing configuration.
Note that this is usually not required for you to do since the module will attempt to connect and
reconnect in case there are any errors.

## <instance>.disconnect({function} callback)

This will allow you to disconnect from a service. You will need to manually reconnect to be able to use
the instance again.

## <instance>.connection {object}

Getter that returns a reference to the rabbitmq connection. You can use this if you want to perform
actions on the connection directly. Mostly you will probably not need to access this.

## <instance>.name {string}

Getter that returns the name of this instance based on the configuration.

## <instance>.config {object}

Getter that returns the current state of the configuration for this instance.

## <instance>.ready {boolean}

Getter that returns true if the instance is ready to be used.

## <instance>.channel({string} name)

This method will return a reference to a channel with which you can send and receive message (see
below).

## <channel>.destroy()

This method will remove all listeners and close the channel. Once a channel is destroyed it can no
longer be used.

## <channel>.ready {boolean}

Getter that returns true if the channel is set up and ready to use.

## <channel>.send({*} msg, {function} \[callback\], {string} \[id\])

This method allows you to send a message to this channel. The method allows you to pass in a custom
id for the message. If omitted the id will be automatically generated for you. Which ever method you
use, that's the id that will be returned from this method.

## <channel>.listen({function} \[callback\], {string} \[id\])

Allows you to set up a listener on this channel. This method will also allow you to specify a specific
id for this listener that can be used to remove it (see below). If no id is given it will be automatically
generated for you. In either case the method will return the id used for this listener.
The callback function receives 3 parameters: an error object, the payload and option ack reference that can
be called to acknowledge the reception of a message. if the passed in method has only 2 parameters the
message will automatically be acknowldeged.

## <channel>.unlisten({string} \[id\], {function} \[callback\])

Using the id received from the **listen()** method, this allows to remove the channel listener.

## <channel>.receive({function} \[callback\], {string} \[id\])

This method will allow you to receive a single message from the channel. You can optionally pass in an id
that will be used to identify the consumer. If it is omitted an id will be generated automatically for you.
The callback function receives 3 parameters: an error object, the payload and option ack reference that can
be called to acknowledge the reception of a message. if the passed in method has only 2 parameters the
message will automatically be acknowldeged.


# Future Features for Consideration

* Add implementations for other message queues (e.g. Kafka, SQS, Redis)
* Support passing ids to channels form MQ Manager instance
