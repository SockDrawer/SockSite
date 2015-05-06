'use strict';
var db = require('./database'),
    util = require('./utility'),
    config = require('./config.json');
var formatRow = util.formattedRowGenerator();

function truncateData(data, filter, minimum) {
    var res = data.filter(filter);
    if (res.length < minimum) {
        res = data.slice(0, minimum);
    }
    return res;
}

function roundAverage(data, reduce, places) {
    return util.round(util.average(data, reduce), places);
}

function getScore(data, cutoff, minimum) {
    var counts = truncateData(data, function (d) {
        return d.checkedAt > cutoff;
    }, minimum);
    return roundAverage(counts, function (a) {
        return a.score;
    });
}

function summarize(data, extra, callback) {
    var cutoff = Date.now() - config.scorePeriod,
        score = getScore(data.overall, cutoff, config.scoreEntries),
        result = {
            version: config.version,
            time: new Date().toISOString(),
            up: score >= 50,
            score: score,
            code: util.getFlavor(score, config.scoreCode),
            status: util.getFlavor(score, config.status),
            flavor: util.getFlavor(score, config.flavor)
        },
        keys = Object.keys(data);
    Object.keys(extra).forEach(function (key) {
        result[key] = extra[key];
    });
    cutoff = Date.now() - config.dataPeriod;
    keys.sort();
    result.summary = keys.map(function (key) {
        score = getScore(data[key], cutoff, config.historyEntries);
        return {
            name: key,
            response: util.getFlavor(score, config.scoreCode),
            responseCode: util.round(util.average(data[key], function (a) {
                return a.responseCode;
            }), 2),
            responseTime: util.round(util.average(data[key], function (a) {
                return a.responseTime;
            }), 2),
            responseScore: score,
            polledAt: data[key][0].polledAt,
            checkIndex: data[key][0].checkId,
            values: data[key]
        };
    });
    callback(null, result);
}

db.getChecks(10 * 60, function (_, data) {
    util.parseData(data, formatRow, function (__, result) {
        summarize(result, {}, console.log);
    });
});
