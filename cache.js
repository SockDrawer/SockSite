'use strict';
var async = require('async'),
    fs = require('fs'),
    path = require('path'),
    jsmin = require('jsmin').jsmin,
    cssmin = require('cssmin');
var config = require('./config.json'),
    database = require('./database');
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
            file.data = jsmin(file.data);
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
            file.data = cssmin(file.data);
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

function getScripts() {
    return exports.scripts;
}

function getStyles() {
    return exports.styles;
}

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
    exports.summary.styles = getStyles;
    exports.summary.scripts = getScripts;
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
    exports.summary.styles = getStyles();
    exports.summary.check = 'checked';
});

exports.summary = {};
