'use strict';
var db = require('./database'),
    config = require('./config.json'),
    async = require('async'),
    request = require('request');
var checkers = config.checks.map(function (url) {
        return createCheck(url);
    }),
    delay = (config.pollDelay || 15) * 1000;

function createCheck(url) {
    return function sitehome(next) {
        var now = Date.now();
        request(url, function (err, resp) {
            var complete = Date.now() - now;
            if (err) {
                return db.addCheck(url, 599, 0, complete, function () {
                    next();
                });
            }
            db.addCheck(url, resp.statusCode, (resp.body || '').length,
                complete,
                next);
        });
    };
}

exports.start = function () {
    async.forever(function (next) {
        async.eachSeries(checkers, function (check, callback) {
                check(function () {});
                setTimeout(callback, delay);
            },
            next);
    });
};
