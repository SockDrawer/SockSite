'use strict';
var server = require('./server'),
    database = require('./database'),
    config = require('./config.json');
var checks = {
        overall: []
    },
    avg = [],
    numChecks = config.checks.length,
    graphPeriod = (config.graphPeriod || 60 * 60),
    cutoff = Date.now() - graphPeriod * 1000;

function average(arr, map) {
    return arr.map(map).reduce(function (a, b) {
        return a + b;
    }, 0) / arr.length;
}



function setData(data, suppress) {
    if (data) {
        server.io.emit('graphData', data);
        avg.unshift(data);
        if (avg.length === numChecks) {
            var point = {
                key: 'overall',
                status: average(avg, function (d) {
                    return d.status;
                }),
                responseTime: average(avg, function (d) {
                    return d.responseTime;
                }),
                checkedAt: avg[0].checkedAt,
                score: average(avg, function (d) {
                    return d.score;
                })
            };
            checks.overall.push(point);
            server.io.emit('graphData', point);
            avg.pop();
        }
        checks[data.key] = checks[data.key] || [];
        checks[data.key].push(data);
    }
    if (!suppress) {
        Object.keys(checks).forEach(function (key) {
            var rows = checks[key].filter(function (r) {
                    return r.checkedAt >= cutoff;
                }),
                length = rows.length;
            if (rows.length < config.minimumEntries) {
                rows = checks[key].slice(length - config.minimumEntries);
            }
            checks[key] = rows;
        });
    }
}
database.getRecentChecks(graphPeriod, function (_, data) {
    data.sort(function (a, b) {
        return a.checkedAt - b.checkedAt;
    });
    data.forEach(function (d) {
        d.score = database.getScore(d.status, d.responseTime);
        d.responseTime = d.responseTime / 1000;
        setData(d, true);
    });
    setData();
    database.registerListener(function (newdata) {
        newdata.score = database.getScore(newdata.status, newdata.responseTime);
        newdata.responseTime = newdata.responseTime / 1000;
        setData(newdata);
    });
});

exports.getTimeChart = function getTimeChart() {
    var keys = Object.keys(checks);
    keys.sort();
    return JSON.stringify(keys.map(function (key) {
        var name = key.replace('what.thedailywtf.com', '');
        return {
            type: 'spline',
            xValueType: 'dateTime',
            showInLegend: true,
            legendText: name,
            name: key,
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
            type: 'spline',
            xValueType: 'dateTime',
            showInLegend: true,
            legendText: name,
            name: key,
            dataPoints: checks[key].map(function (r) {
                return {
                    y: r.score,
                    x: r.checkedAt
                };
            })
        };
    }));
};
