'use strict';
var database = require('./database'),
    util = require('./utility'),
    config = require('./config.json');
var graphPeriod = (config.graphPeriod || 60 * 60),
    formatRow = util.formattedRowGenerator(),
    checks = {};

database.getChecks(graphPeriod, function (_, data) {
    util.parseData(data, formatRow, function (__, result) {
        checks = result;
    });
    database.registerListener(function (newdata) {
        var cutoff = Date.now() - (config.graphPeriod * 1000);
        formatRow(newdata, function (__, rows) {
            rows.forEach(function (r) {
                var check = checks[r.checkName] || [];
                check.unshift(r);
                check = util.truncateData(check, function (d) {
                    return d.checkedAt >= cutoff;
                }, 0);
                checks[r.checkName] = check;
            });
        });
    });
});

exports.getTimeChart = function getTimeChart() {
    var keys = Object.keys(checks);
    keys.sort();
    return JSON.stringify(keys.map(function (key) {
        var name = key.replace('what.thedailywtf.com', '');
        return {
            type: 'line',
            xValueType: 'dateTime',
            showInLegend: true,
            legendText: name,
            name: key,
            dataPeriod: config.graphPeriod * 1000,
            dataPoints: checks[key].map(function (r) {
                return {
                    y: r.responseTime,
                    x: r.checkedAt
                };
            })
        };
    }));
};

exports.getScoreChart = function getTimeChart() {
    var keys = Object.keys(checks);
    keys.sort();
    return JSON.stringify(keys.map(function (key) {
        var name = key.replace('what.thedailywtf.com', '');
        return {
            type: 'line',
            xValueType: 'dateTime',
            showInLegend: true,
            legendText: name,
            name: key,
            dataPeriod: config.graphPeriod * 1000,
            dataPoints: checks[key].map(function (r) {
                return {
                    y: r.score,
                    x: r.checkedAt
                };
            })
        };
    }));
};
