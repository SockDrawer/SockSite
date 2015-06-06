'use strict';
var db = require('./database'),
    config = require('./config.json'),
    cache = require('./cache'),
    async = require('async'),
    request = require('request');
var checkers = config.checks.map(function (url) {
        return createCheck(url);
    }),
    delay = config.pollDelay * 1000,
    timeout = Math.max(12 + 3, config.pollDelay * config.checks.length) * 1000;

function createCheck(url) {
    return function sitehome(next) {
        var now = Date.now();
        request({
            url: url,
            timeout: timeout
        }, function (err, resp) {
            var complete = Date.now() - now;
            if (err) {
                return db.addCheck(url, 599, 0, complete, function () {
                    next();
                });
            }
            var readonly = !!resp.headers['Discourse-Readonly'];
            db.addCheck(url, resp.statusCode, readonly,
                complete,
                function () {
                    next();
                });
        });
    };
}
exports.updated = false;

function getNotice(callback) {
    request(config.siteSettings, function (err, _, body) {
        if (err) {
            return callback();
        }
        try {
            var settings = JSON.parse(body);
            cache.global_notice = settings.global_notice;
        } catch (ignore) {} //eslint-disable-line no-empty
        callback();
    });
}

exports.start = function () {
    async.forever(function (next) {
        async.eachSeries(checkers, function (check, callback) {
                exports.updated = true;
                check(function () {
                    setTimeout(callback, delay);
                });
            },
            function () {
                getNotice(next);
            });
    });
};
