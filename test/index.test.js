/* globals describe, it, after, before, afterEach, beforeEach */
const expect = require('chai').expect;


const MQ = require('../');

describe('Message', () => {
    describe('Factory', () => {
        beforeEach(() => MQ.reset());

        it('should allow to get an instance directly', () => {
            MQ.configure({ test: { client: { user: 'guest', pass: 'guest' }}}, true);
            let instance = MQ.instance('test');
            expect(instance.name).to.equal('test');
        });

        it('should return an instance with only default values if it is not configured', () => {
            let instance = MQ.instance();
            expect(instance.name).to.equal('_default_');
        });
    });

    describe('Middleware', () => {
        beforeEach(() => MQ.reset());

        it('shouldn\'t create a default instance if nothing is configured', done => {
            let req = {};
            let res = {};
            MQ.middleware()(req, res, () => {
                expect(req.mq).to.be.undefined;
                done();
            });
        });

        it('should make all other instances available on the mq property', done => {
            MQ.configure({ test: { client: { heartbeat: 10 }}}, true);
            let req = {};
            let res = {};
            MQ.middleware()(req, res, () => {
                expect(req.mq.name).to.equal('test');
                expect(req.mq.test.name).to.equal('test');
                expect(req.mq.config.client.heartbeat).to.equal(10);
                done();
            });
        });

        it('should allow to set a specific instance as default', done => {
            MQ.configure({
                test: { client: { user: 'guest', pass: 'guest' }},
                test2: { client: { user: 'guest', pass: 'guest' }, default: true}
            }, true);
            let req = {};
            let res = {};
            MQ.middleware()(req, res, () => {
                expect(req.mq.name).to.equal('test2');
                expect(req.mq.test.name).to.equal('test');
                expect(req.mq.test2.name).to.equal('test2');
                done();
            });
        });
    });
});
