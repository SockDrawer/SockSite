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

function summarize(data, extra, callback) {
    var cutoff = Date.now() - config.scorePeriod,
        result = {
            version: config.version,
            time: new Date().toISOString(),
            up: false,
            score: -1, //TODO: fill this
            code: null,
            status: null,
            flavor: null,
        },
        keys = Object.keys(data);
    Object.keys(extra).forEach(function (key) {
        result[key] = extra[key];
    });
    keys.sort();
    result.summary = keys.map(function (key) {
        var counts = truncateData(data[key], function (d) {
                return d.checkedAt > cutoff;
            }, config.scoreEntries),
            score = util.round(util.average(counts, function (a) {
                return a.score;
            }));
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
    result.up = result.score >= 50;
    result.code = util.getFlavor(result.score, config.scoreCode);
    result.status = util.getFlavor(result.score, config.status);
    result.flavor = util.getFlavor(result.score, config.flavor);
    callback(null, result);
}

db.getChecks(10 * 60, function (_, data) {
    util.parseData(data, formatRow, function (__, result) {
        summarize(result, {}, console.log);
    });
});
