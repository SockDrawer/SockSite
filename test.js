var db = require('./database'),
    config = require('./config.json'),
    util = require('./utility');
var checks = {
        overall: []
    },
    numChecks = config.checks.length,
    protocol=/^https?:\/\//;
config.checks.forEach(function (key) {
    checks[key.replace(protocol, '')] = [];
});
db.getChecks(10 * 60, function (_, data) {
    var avg = [],
        parts = [];
    data.forEach(function (row) {
        row.score = util.getScore(row);
        row.response = util.getFlavor(row.score, config.scoreCode);
        row.polledAt = new Date(row.checkedAt).toUTCString();
        parts.push(row);
        avg.unshift(row);
        checks[row.checkName.replace(protocol,'')].unshift(row);
        if (avg.length === numChecks) {
            var overall = {
                checkName: 'overall',
                checkId: -1,
                responseCode: util.round(util.average(avg, function (n) {
                    return n.responseCode;
                })),
                responseTime: util.round(util.average(avg, function (n) {
                    return n.responseTime;
                }), 3),
                checkedAt: avg[0].checkedAt,
                polledAt: avg[0].polledAt
            };
            overall.score = util.getScore(overall);
            overall.response = util.getFlavor(overall.score, config.scoreCode);
            parts.push(overall);
            avg.pop();
            checks.overall.unshift(overall);
        }
    });
    console.log(checks);
});
