/* globals describe, it, after, before, afterEach, beforeEach */
const expect = require('chai').expect;


const MQ = require('../');

describe('Message', () => {
    describe('Factiory', () => {

    });

    describe('Middleware', () => {
        it('shouldn\'t create a default instance if nothing is configured', done => {
            let req = {};
            let res = {};
            MQ.middleware()(req, res, () => {
                expect(req.mq).to.be.undefined;
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
