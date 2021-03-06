'use strict';
var async = require('async'),
    fs = require('fs'),
    path = require('path'),
    jsmin = require('jsmin').jsmin,
    cssmin = require('cssmin');
var config = require('./config.json'),
    database = require('./database'),
    graph = require('./graph'),
    util = require('./utility'),
    server = require('./server');

var formatRow = util.formattedRowGenerator(),
    checks = {};

function readall(dir, filter, callback) {
    fs.readdir(dir, function (err, files) {
        if (err) {
            callback(err);
        }
        var tpl = files.filter(function (file) {
            return filter.test(file);
        });
        async.map(tpl.map(function (file) {
            return path.join(dir, file);
        }), function (file, next) {
            fs.readFile(file, 'binary', next);
        }, function (errs, data) {
            if (errs) {
                return callback(errs);
            }
            callback(null, tpl.map(function (name, idx) {
                return {
                    name: name,
                    data: data[idx]
                };
            }));
        });

    });

}

function readTemplates(callback) {
    var suffix = /[.]html?$/;
    readall('templates', suffix, function (err, files) {
        if (err) {
            return callback(err);
        }
        var templates = {};
        files.forEach(function (file) {
            templates[file.name] = file.data;
            templates[file.name.replace(suffix, '')] = file.data;
        });
        callback(null, templates);
    });
}

function readScripts(callback) {
    readall('static/scripts', /[.]js/, function (err, files) {
        if (err) {
            return callback(err);
        }
        if (!process.env.SOCKDEV) {
            files.forEach(function (file) {
                if (/[.]min[.]js$/.test(file.name)) {
                    return;
                }
                try {
                    file.data = jsmin(file.data);
                } catch (e) {
                    /*eslint-disable no-console */
                    console.warn('Error minifying ' + file.name + ': ' + e);
                    /*eslint-enable no-console */
                }
            });
        }
        callback(null, files);
    });
}

function readStyles(callback) {
    readall('static/styles', /[.]css/, function (err, files) {
        if (err) {
            return callback(err);
        }
        if (!process.env.SOCKDEV) {
            files.forEach(function (file) {
                if (/[.]min[.]css$/.test(file.name)) {
                    return;
                }
                try {
                    file.data = cssmin(file.data);
                } catch (e) {
                    /*eslint-disable no-console */
                    console.warn('Error minifying ' + file.name + ': ' + e);
                    /*eslint-enable no-console */
                }
            });
        }
        callback(null, files);
    });
}

exports.buildCache = function buildCache(callback) {
    async.parallel({
        templates: readTemplates,
        scripts: readScripts,
        styles: readStyles
    }, function (err, results) {
        if (err) {
            return callback(err);
        }
        exports.templates = results.templates;
        exports.scripts = results.scripts;
        exports.styles = results.styles;
        callback();
    });
};

exports.global_notice = '';
exports.global_notice_text = '';
exports.templates = {};
exports.scripts = {};
exports.styles = {};

function setSummary(summary) {
    exports.summary = summary;
    exports.summary.getTimeChart = graph.getTimeChart;
    exports.summary.getScoreChart = graph.getScoreChart;
    updateClient();
}


function summarizeEndpoint(key, data, cutoff) {
    var counts = util.truncateData(data, function (d) {
            return d.checkedAt > cutoff;
        }, config.scoreEntries),
        score = util.roundAverage(counts, function (a) {
            return a.score;
        });
    if (!counts) {
        return undefined;
    }
    return {
        name: key,
        response: util.getFlavor(score, config.scoreCode),
        responseCode: util.roundAverage(counts, function (a) {
            return a.responseCode;
        }, 2),
        responseTime: util.roundAverage(counts, function (a) {
            return a.responseTime;
        }, 2),
        responseScore: score,
        polledAt: (counts[0] || {}).polledAt,
        checkIndex: (counts[0] || {}).checkId,
        values: data.slice(0, config.historyEntries)
    };
}

function summarize(data, extra, callback) {
    var cutoff = Date.now() - (config.scorePeriod * 1000),
        overall = summarizeEndpoint('overall', data.overall, cutoff),
        score = data.overall[0].score,
        result = {
            version: config.version,
            time: new Date().toISOString(),
            up: score > 50,
            score: score,
            code: util.getFlavor(score, config.scoreCode),
            status: util.getFlavor(score, config.status),
            flavor: util.getFlavor(score, config.flavor),
            global_notice: exports.global_notice,
            global_notice_text: exports.global_notice_text,
            readonly: data.overall[0].readonly
        },
        keys = Object.keys(data);
    if (result.readonly) {
        result.code = config.readonly.code;
        result.status = config.readonly.status;
        result.flavor = config.readonly.flavor;
    }
    Object.keys(extra).forEach(function (key) {
        result[key] = extra[key];
    });
    keys.sort();
    result.summary = keys.map(function (key) {
        if (key === 'overall') {
            return null;
        }
        return summarizeEndpoint(key, data[key], cutoff);
    }).filter(function (d) {
        return d;
    });
    result.summary.unshift(overall);
    callback(null, result);
}

database.getChecks(config.historyPeriod, function (err, data) {
    if (err || !data || data.length < 1) {
        return;
    }
    util.parseData(data, formatRow, function (__, result) {
        checks = result;
        summarize(checks, {}, function (___, summary) {
            setSummary(summary);
        });
    });
});

database.registerListener(function (data) {
    formatRow(data, function (_, rows) {
        rows.forEach(function (r) {
            var check = checks[r.checkName] || [];
            check.unshift(r);
            check = util.truncateData(check, config.historyEntries);
            checks[r.checkName] = check;
            server.io.emit('data', null, r);
        });
        summarize(checks, {}, function (__, summary) {
            setSummary(summary);
        });
    });
});

exports.summary = {};

function updateClient() {
    var latest = {
        up: exports.summary.up,
        score: exports.summary.score,
        code: exports.summary.code,
        status: exports.summary.status,
        flavor: exports.summary.flavor,
        readonly: exports.summary.readonly,
        global_notice: exports.summary.global_notice,
        global_notice_text: exports.summary.global_notice_text,
        summary: exports.summary.summary.map(function (summary) {
            return {
                name: summary.name,
                response: summary.response,
                responseCode: summary.responseCode,
                responseScore: summary.responseScore,
                responseTime: summary.responseTime,
                polledAt: summary.polledAt,
                checkIndex: summary.checkIndex
            };
        })
    };
    server.io.emit('summary', latest);
}
