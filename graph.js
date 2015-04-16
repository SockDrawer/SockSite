'use strict';

var plotly = require('plotly'),
    async = require('async'),
    database = require('./database');

var data = {},
    layout = {
        fileopt: 'overwrite',
        filename: 'Latest Response Times',
        layout: {
            showlegend: true,
            title: 'Latest Response Times',
            autosize: true,
            width: 1368,
            height: 781,
            xaxis: {
                tickformat: '%H:%M',
                title: 'Time of Check',
                type: 'date',
                hoverformat: '%H:%M:%S'
            },
            yaxis: {
                title: 'Response Time',
                ticksuffix: 's'
            }
        }
    };
plotly = plotly('servercooties', 'ismuxlxups');

function makePlot(callback) {
    var lines = Object.keys(data).map(function (key) {
        return {
            name: key,
            type: 'scatter',
            x: data[key].map(function (check) {
                var d = new Date(check.checkedAt);
                return d.toISOString().replace('T', ' ').replace('Z', '');
            }),
            y: data[key].map(function (check) {
                return check.responseTime / 1000;
            })
        };
    });
    plotly.plot(lines, layout, function () {
        callback();
    });
}

function sortData(checks) {
    var cutoff = Date.now() - 60 * 60 * 1000;
    checks.forEach(function (check) {
        var key = /\/.*$/.exec(check.key)[0],
            d = data[key] || [];
        d.push(check);
        data[key] = d;
    });
    Object.keys(data).forEach(function (key) {
        data[key] = data[key].filter(function (check) {
            return check.checkedAt >= cutoff;
        });
        data[key].sort(function (a, b) {
            return a.checkedAt - b.checkedAt;
        });
    });
}

function setData(check) {
    sortData([check]);
}


database.getRecentChecks(15 * 60 * 60, function (err, checks) {
    if (err) {
        return;
    }
    database.registerListener(setData);
    sortData(checks);

    async.forever(function (next) {
        makePlot(function () {
            setTimeout(next, 60 * 1000);
        });
    });
});
