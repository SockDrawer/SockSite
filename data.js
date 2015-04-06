'use strict';
var config = require('./config'),
    db = require('./database');
var cache = [],
    cachedSummary = {};

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
        var result = summarize(data);
        Object.keys(cfg).map(function (key) {
            result[key] = cfg[key];
        });
        callback(null, result);
    });
};

function summarize(data) {
    var percentage = average(data, function (a) {
            return a.status;
        }),
        time = average(data, function (a) {
            return a.responseTime;
        }),
        score = average([percentage, time / 10]),
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
    data.map(function (a) {
        checks[a.key] = checks[a.key] || [];
        checks[a.key].push({
            responseCode: a.status,
            responseTime: a.responseTime,
            polledAt: new Date(a.checkedAt)
        });
    });
    keys = Object.keys(checks);
    keys.sort();
    result.summary = keys.map(function (key) {
        var avg = average(checks[key], function (a) {
                return a.responseCode;
            }),
            stime = average(checks[key], function (a) {
                return a.responseTime;
            });
        return {
            name: key,
            response: getFlavor(avg, config.statusType),
            responseCode: avg,
            responseTime: stime,
            responseScore: average([avg, stime / 10]),
            polledAt: checks[key][0].polledAt,
            values: checks[key]
        };
    });
    return result;
}

function setData(data) {
    cache.push(data);
    var limit = Date.now() - (config.dataPeriod * 1000);
    cache = cache.filter(function (d) {
        return d.checkedAt > limit;
    });
    cache.dataPeriod = config.dataPeriod;
    cachedSummary = summarize(cache);
}
db.registerListener(setData);

db.getRecentChecks(config.dataPeriod, function (err, data) {
    if (err) {
        /*eslint-disable no-console */
        return console.warn(err);
        /*eslint-enable no-console */
    }
    cache = data;
});

exports.getSummaryData = function getSummaryData(cfg, callback) {
    if (!cache) {
        return callback('NO DATA');
    }
    var result = cachedSummary;
    Object.keys(cfg).map(function (key) {
        result[key] = cfg[key];
    });
    callback(null, result);
};
