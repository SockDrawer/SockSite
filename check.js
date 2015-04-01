'use strict';
var db = require('./database'),
    config = require('./config.json'),
    async = require('async'),
    request = require('request');
var toCheck = [
        'http://what.thedailywtf.com/',
        'http://what.thedailywtf.com/latest.json'
    ],
    checkers,
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

checkers = toCheck.map(function (url) {
    return createCheck(url);
});

exports.start = function () {
    async.forever(function (next) {
        async.eachSeries(checkers, function (check, callback) {
                check(function () {});
                setTimeout(callback, delay);
            },
            next);
    });
};
