"use strict"

const utility = require('../../utility.js');
require('chai').should();

describe('CalculateScore', () => {
    it('Should return 0 when the site throws a 500', () => {
        utility.getScore({
           responseCode: 500,
           responseTime: 1
        }).should.equal(0);
    });
    it('Should return 0 when the site times out', () => {
        utility.getScore({
           responseCode: 200,
           responseTime: 13
        }).should.equal(0);
    });
    it('Should return 100 when the site replies in sub-one-second', () => {
        utility.getScore({
           responseCode: 200,
           responseTime: .5
        }).should.equal(100);
    });
    it('Should return 19 when the site replies in 2 seconds', () => {
        utility.getScore({
           responseCode: 200,
           responseTime: 2
        }).should.equal(19);
    });
    it('Should return 0 when the site replies in 10 seconds', () => {
        utility.getScore({
           responseCode: 200,
           responseTime: 10
        }).should.equal(0);
    });
    it('Should treat 204 like 200', () => {
        utility.getScore({
           responseCode: 204,
           responseTime: .5
        }).should.equal(100);
    });
});
