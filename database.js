'use strict';
var sqlite = require('sqlite3'),
    async = require('async');
var config = require('./config.json');
var db = new sqlite.Database('servercooties.sql'),
    notify = [],
    pages = {};
db.serialize(function () {
    db.run('CREATE TABLE IF NOT EXISTS pages (' +
        '    key VARCHAR(255) NOT NULL' +
        ');');
    db.run('CREATE TABLE IF NOT EXISTS checks2 (' +
        '    page INT NOT NULL,' +
        '    status INT NOT NULL,' +
        '    responseTime INT NOT NULL,' +
        '    checkedAt DATETIME NOT NULL,' +
        '    FOREIGN KEY (page) REFERENCES pages(OID)' +
        ')');
});

exports.registerListener = function registerListener(fn) {
    notify.push(fn);
};

function getPageId(page, callback) {
    if (pages[page]) {
        var res = pages[page];
        return process.nextTick(function () {
            callback(null, res);
        });
    }
    db.run('INSERT INTO pages (key) VALUES (?)', [page], function (err) {
        if (err) {
            return callback(err);
        }
        db.all('SELECT OID FROM pages WHERE key = ? LIMIT 1', [page],
            function (err2, ids) {
                if (err) {
                    return callback(err2);
                }
                pages[page] = ids[0].rowid;
                callback(null, ids[0].rowid);
            });
    });
}

exports.addCheck = function addCheck(key, status, length, time, callback) {
    key = key.replace(/^https?:\/\//i, '');
    getPageId(key, function (err, id) {
        var now = new Date();
        db.run('INSERT INTO checks2 (page, status, responseTime, checkedAt)' +
            'VALUES (?, ?, ?, ?, ?)', [key, status, time, now],
            callback);
        async.each(notify, function (n, next) {
            n({
                key: key,
                status: status,
                responseTime: time,
                checkedAt: now.getTime()
            });
            next();
        });
    });
};

exports.getRecentChecks = function getRecentChecks(offset, callback) {
    if (!offset) {
        offset = 10 * 60;
    }
    var date = new Date() - (offset * 1000);
    db.all('SELECT p.key, c.status, c.responseTime, c.checkedAt FROM checks2 c JOIN pages p ON c.page = p.OID WHERE checkedAt > ?' +
        ' ORDER BY checkedAt DESC', [date], callback);
};

function range(num) {
    return Array.apply(null, Array(num)).map(function (_, i) {
        return i;
    });
}

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


exports.getSampleData = function getSampleData(responseTime, responseCode) {
    var now = Date.now();
    return range(10).map(function () {
        return {
            key: 'Sample Data',
            status: responseCode,
            length: 0,
            responseTime: responseTime + Math.round(Math.random() * 500) - 250,
            checkedAt: now + Math.round(Math.random() * 60000) - 30000
        };
    });
};

exports.summarizeData = function summarizeData(data, cfg) {
    cfg = cfg || {};
    var percentage = average(data, function (a) {
            return a.status;
        }),
        time = average(data, function (a) {
            return a.responseTime;
        }),
        score = average([percentage, time / 10]),
        result = {
            ok: function () {
                return score < 300;
            },
            version: config.version,
            time: new Date().toISOString(),
            up: score < 300,
            percentage: round(percentage, 2),
            precisionPercentage: percentage,
            average: round(time, 2),
            precisionAverage: time,
            score: round(score, 2),
            precisionScore: score,
            code: getFlavor(score, config.statusCode),
            status: getFlavor(score, config.status),
            flavor: getFlavor(score, config.flavor)
        },
        checks = {},
        keys;
    Object.keys(cfg).forEach(function (key) {
        result[key] = cfg[key];
    });
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
            response: getFlavor(score, config.statusCode),
            responseCode: avg,
            responseTime: stime,
            responseScore: average([avg, stime / 10]),
            polledAt: checks[key][0].polledAt,
            values: checks[key]
        };
    });
    return result;
};
