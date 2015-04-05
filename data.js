'use strict';
var config = require('./config'),
    db = require('./database');

function round(num, places) {
    if (!places) {
        places = 0;
    }
    places = Math.pow(10, places);
    return Math.round(num * places) / places;
}

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
            score = (percentage + (time / 10)) / 2,
            result = {
                ok: function () {
                    return percentage < 250 && time < 3000;
                },
                version: config.version,
                time: new Date().toISOString(),
                up: percentage < 300,
                percentage: round(percentage, 2),
                precisionPercentage: percentage,
                average: round(time, 2),
                precisionAverage: time,
                score: round(score, 2),
                precisionScore: score,
                code: getFlavor(score, config.statusTime),
                status: getFlavor(score, config.status),
                flavor: getFlavor(score, config.flavor)
            },
            checks = {},
            keys;
        Object.keys(cfg).map(function (key) {
            result[key] = cfg[key];
        });
        data = data.map(function (a) {
            a.checkedAt = new Date(a.checkedAt);
            return a;
        });
        data.map(function (a) {
            checks[a.key] = checks[a.key] || [];
            checks[a.key].push({
                responseCode: a.status,
                responseTime: a.responseTime,
                polledAt: a.checkedAt
            });
        });
        keys = Object.keys(checks);
        keys.sort();
        result.summary = keys.map(function (key) {
            var avg = average(checks[key], function (a) {
                return a.responseCode;
            });
            return {
                name: key,
                response: getFlavor(avg, config.statusType),
                responseCode: avg,
                responseTime: average(checks[key], function (a) {
                    return a.responseTime;
                }),
                polledAt: checks[key][0].polledAt,
                values: checks[key]
            };
        });
        callback(null, result);
    });
};
