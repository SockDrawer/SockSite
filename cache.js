'use strict';
var async = require('async'),
    fs = require('fs'),
    path = require('path'),
    jsmin = require('jsmin').jsmin,
    cssmin = require('cssmin');
var config = require('./config.json'),
    database = require('./database'),
    graph = require('./graph'),
    server = require('./server');
var cache;

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
        files.forEach(function (file) {
            try {
                file.data = jsmin(file.data);
            } catch (e) {
                /*eslint-disable no-console */
                console.warn('Error minifying ' + file.name + ': ' + e);
                /*eslint-enable no-console */
            }
        });
        callback(null, files);
    });
}

function readStyles(callback) {
    readall('static/styles', /[.]css/, function (err, files) {
        if (err) {
            return callback(err);
        }
        files.forEach(function (file) {
            try {
                file.data = cssmin(file.data);
            } catch (e) {
                /*eslint-disable no-console */
                console.warn('Error minifying ' + file.name + ': ' + e);
                /*eslint-enable no-console */
            }
        });
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

exports.templates = {};
exports.scripts = {};
exports.styles = {};

function setData(data) {
    cache.push(data);
    var limit = Date.now() - (config.dataPeriod * 1000),
        minimum = config.minimumEntries || 10,
        old = cache;
    cache = cache.filter(function (d) {
        return d.checkedAt > limit;
    });
    if (cache.length < minimum) {
        cache = old.slice(Math.max(old.length - minimum, 0));
    }
    cache.dataPeriod = config.dataPeriod;
    exports.summary = database.summarizeData(cache);
    exports.summary.getTimeChart = graph.getTimeChart;
    updateClient();
}
database.registerListener(setData);

database.getRecentChecks(config.dataPeriod, function (err, data) {
    if (err) {
        /*eslint-disable no-console */
        return console.warn(err);
        /*eslint-enable no-console */
    }
    cache = data;
    exports.summary = database.summarizeData(cache);
    exports.summary.getTimeChart = graph.getTimeChart;
    updateClient();
});

exports.summary = {};

function updateClient() {
    var latest = {
        up: exports.summary.up,
        score: exports.summary.score,
        code: exports.summary.code,
        status: exports.summary.status,
        flavor: exports.summary.flavor,
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