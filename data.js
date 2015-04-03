'use strict';
var config = require('./config'),
    db = require('./database');

function average(arr, map) {
    return sum(arr, map) / arr.length;
}

function sum(arr, map) {
    if (!map) {
        map = function (a) {
            return a;
        };
    }
    return arr.map(map).reduce(function (a, b) {
        return a + b;
    }, 0);
}

function getFlavor(value, arr) {
    var key = Object.keys(arr).filter(function (a) {
        return a <= value;
    });
    key = key[key.length - 1];
    return arr[key];
}

exports.getData = function getData(cfg, callback) {
    db.getRecentChecks(cfg.dataPeriod, function (err, data) {
        if (err || !data) {
            return callback(err || 'NO DATA');
        }
        var percentage = average(data, function (a) {
                return a.status;
            }),
            time = average(data, function (a) {
                return a.responseTime;
            }),
            result = {
                version: config.version,
                time: new Date().toISOString(),
                up: percentage < 300,
                percentage: percentage,
                average: time,
                code: getFlavor(time, config.statusTime),
                status: getFlavor(percentage, config.status),
                flavor: getFlavor(percentage, config.flavor)
            },
            checks = {}, keys;
        Object.keys(cfg).map(function (key) {
            result[key] = cfg[key];
        });
        result.checks = [];
        data = data.map(function (a) {
            a.checkedAt = new Date(a.checkedAt);
            return a;
        });
        data.map(function (a) {
            checks[a.key] = checks[a.key] || [];
            checks[a.key].push({
                code: a.status,
                responseTime: a.responseTime,
                polledAt: a.checkedAt
            });
        });
        keys = Object.keys(checks);
        keys.sort();
        result.summary = keys.map(function (key) {
            var avg = average(checks[key], function (a) {
                return a.code;
            });
            result.checks.push({
                name: key,
                values: checks[key]
            });
            return {
                name: key,
                response: getFlavor(avg, config.statusType),
                code: avg,
                responseTime: average(checks[key], function (a) {
                    return a.responseTime;
                }),
                polledAt: checks[key][0].polledAt
            };
        });
        callback(null, result);
    });
};
