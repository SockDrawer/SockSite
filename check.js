'use strict';
var db = require('./database'),
    config = require('./config.json'),
    cache = require('./cache'),
    async = require('async'),
    request = require('request'),
    sanitize = require('sanitize-html');
var checkers = config.checks.map(function (url) {
        return createCheck(url);
    }),
    delay = config.pollDelay * 1000,
    timeout = Math.max(12 + 3, config.pollDelay * config.checks.length) * 1000;

function createCheck(url) {
    return function sitehome(next) {
        var now = Date.now();
        request({
            rejectUnauthorized: false,
            url: url,
            timeout: timeout,
            headers: {
                'User-Agent': 'servercooties.io',
                'accept': 'text/html'
            }
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
    return callback(); // disable notice for now as it's not on nodebb
    request({
        rejectUnauthorized: false,
        url: config.siteSettings,
        timeout: 3 * 1000,
        headers: {
            'User-Agent': 'servercooties.io',
            'accept': 'text/html'
        }
    }, function (err, _, body) {
        if (err) {
            return callback();
        }
        try {
            var settings = JSON.parse(body);
            if (settings.global_notice) {
                cache.global_notice = sanitize(settings.global_notice, {
                    allowedTags: ['a', 'abbr', 'b', 'i', 'em', 'strong'],
                    allowedAttributes: {
                        a: ['href', 'target'],
                        abbr: ['title']
                    },
                    transformTags: {
                        'a': sanitize.simpleTransform('a', {
                            target: '_blank'
                        })
                    }
                });
                cache.global_notice_text = sanitize(settings.global_notice, {
                    allowedTags: []
                });
            } else {
                cache.global_notice = '';
                cache.global_notice_text = '';
            }
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
