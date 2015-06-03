'use strict';
var sqlite = require('sqlite3'),
    async = require('async'),
    url = require('url'),
    querystring = require('querystring'),
    stringify = require('csv-stringify');
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

exports.addCheck = function addCheck(key, status, readonly, time, callback) {
    key = key.replace(/^https?:\/\//i, '');
    getPageId(key, function (err, id) {
        if (err) {
            return callback(err);
        }
        var now = new Date();
        db.run('INSERT INTO checks2 (page, status, responseTime, checkedAt)' +
            'VALUES (?, ?, ?, ?)', [id, status, time, now],
            function (e) {
                if (e) {
                    console.warn(e); //eslint-disable-line no-console
                }
                callback();
            });
        async.each(notify, function (n, next) {
            n({
                checkName: key,
                checkId: id,
                responseCode: status,
                responseTime: time / 1000,
                checkedAt: now.getTime(),
                readonly: readonly
            });
            next();
        });
    });
};

exports.getChecks = function getChecks(offset, callback) {
    if (!offset) {
        offset = 10 * 60;
    }
    var date = new Date() - (offset * 1000);
    db.all('SELECT p.key AS checkName, c.page AS checkId, ' +
        'c.status AS responseCode, c.responseTime/1000.0 AS responseTime, ' +
        'c.checkedAt FROM checks2 c JOIN pages p ON c.page = p.OID ' +
        'WHERE checkedAt > ? ORDER BY checkedAt ASC', [date], callback);
};
exports.getRecentChecks = function getRecentChecks(offset, callback) {
    if (!offset) {
        offset = 10 * 60;
    }
    var date = new Date() - (offset * 1000);
    db.all('SELECT p.key, c.status, c.responseTime, c.checkedAt FROM ' +
        'checks2 c JOIN pages p ON c.page = p.OID WHERE checkedAt > ?' +
        ' ORDER BY checkedAt DESC', [date], callback);
};

exports.formatData = function formatData(data, callback) {
    setImmediate(function () {
        var score = getScore(data.status, data.responseTime);
        callback(null, {
            checkName: data.key,
            checkId: pages[data.key],
            responseCode: data.status,
            responseTime: data.responseTime,
            responseScore: score,
            response: getFlavor(score, config.scoreCode),
            polledAt: new Date(data.checkedAt).toUTCString(),
            readonly: false
        });
    });
};

function getScore(code, time) {
    if ((code !== 200 && code !== 204) || time > 12000) {
        return 0;
    } else if (time > 3000) {
        return 50;
    }
    return 100;
}
exports.getScore = getScore;

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
    var score = average(data.map(function (row) {
            var s = getScore(row.status, row.responseTime);
            row.score = s;
            return s;
        })),
        result = {
            version: config.version,
            time: new Date().toISOString(),
            up: score > 50,
            score: round(score, 2),
            code: getFlavor(score, config.scoreCode),
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
            responseScore: a.score,
            response: getFlavor(a.score, config.scoreCode),
            polledAt: new Date(a.checkedAt).toUTCString()
        });
    });
    keys = Object.keys(checks);
    keys.sort();
    result.summary = keys.map(function (key) {
        var checkScore = round(average(checks[key], function (a) {
            return a.responseScore;
        }), 2);
        return {
            name: key,
            response: getFlavor(checkScore, config.scoreCode),
            responseCode: round(average(checks[key], function (a) {
                return a.responseCode;
            }), 2),
            responseTime: round(average(checks[key], function (a) {
                return a.responseTime;
            }), 2),
            responseScore: checkScore,
            polledAt: checks[key][0].polledAt,
            checkIndex: pages[key],
            values: checks[key]
        };
    });
    return result;
};

var chunkSize = 100;

function formatRawData(data, callback) {
    var results = [
        ['Endpoint', 'Response Code', 'Response Time',
            'Response Score', 'Response Label', 'Checked At'
        ]
    ];
    async.whilst(function () {
            return data.length > 0;
        },
        function (next) {
            var batch = data.slice(0, chunkSize);
            data = data.slice(chunkSize);
            results = results.concat(batch.map(function (row) {
                var score = getScore(row.status, row.responseTime);
                return [row.key, row.status, row.responseTime,
                    score, getFlavor(score, config.scoreCode),
                    new Date(row.checkedAt).toISOString()
                ];
            }));
            setImmediate(next);
        },
        function (err) {
            if (err) {
                return callback(err);
            }
            callback(null, results);
        });
}

exports.getRawData = function getRawData(_, request, response) {
    var query = querystring.parse(url.parse(request.url).query),
        now = Date.now();
    var start = Date.parse(query.start);
    if (!isNaN(start)) {
        query.start = start;
    } else if (/^[0-9]+$/.test(query.start)) {
        query.start = parseInt(query.start, 10);
    } else {
        query.start = now - 24 * 60 * 60 * 1000;
    }
    var end = Date.parse(query.end);
    if (!isNaN(end)) {
        query.end = end;
    } else if (/^[0-9]+$/.test(query.end)) {
        query.end = parseInt(query.end, 10);
    } else {
        query.end = now;
    }
    db.all('SELECT p.key, c.status, c.responseTime, c.checkedAt FROM ' +
        'checks2 c JOIN pages p ON c.page = p.OID WHERE checkedAt > ?' +
        'AND checkedAt <= ? ORDER BY checkedAt ASC LIMIT 100000', [
            query.start, query.end
        ],
        function (err, data) {
            if (err) {
                response.writeHead(500);
                response.write(err);
                return response.end();
            }
            formatRawData(data, function (err2, result) {
                if (err2) {
                    response.writeHead(500);
                    response.write(err2);
                    return response.end();
                }
                stringify(result, function (err3, csv) {
                    if (err3) {
                        response.writeHead(500);
                        response.write(err3);
                        return response.end();
                    }
                    response.writeHead(200);
                    response.write(csv);
                    response.end();
                });
            });
        });
};
