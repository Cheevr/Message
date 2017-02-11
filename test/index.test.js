/* globals describe, it, after, before, afterEach, beforeEach */
const expect = require('chai').expect;


const MQ = require('../');

describe('Message', () => {
    describe('Factiory', () => {

    });

    describe('Middleware', () => {
        it('should create at least one default instance', done => {
            let req = {};
            let res = {};
            MQ.middleware(req, res, () => {
                expect(req.mq).itself.respondsTo('send');
                expect(req.mq).itself.respondsTo('receive');
                done();
            });
        });

        it('should make all other instances available on the mq property', () => {

        });

        it('should allow to disable any instances via config', () => {

        });

        it('should allow to set a specific instance as default', () => {

        });
    });
});
