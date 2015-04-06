'use strict';
var sqlite = require('sqlite3'),
    async = require('async');
var db = new sqlite.Database('servercooties.sql'),
    notify = [];
db.serialize(function () {
    db.run('CREATE TABLE IF NOT EXISTS checks (' +
        'key VARCHAR(100) NOT NULL,' +
        'status INT NOT NULL,' +
        'length INT NOT NULL,' +
        'responseTime INT NOT NULL,' +
        'checkedAt DATETIME NOT NULL' +
        ')');
});

exports.registerListener = function registerListener(fn) {
    notify.push(fn);
};

exports.addCheck = function addCheck(key, status, length, time, callback) {
    key = key.replace(/^https?:\/\//i, '');
    var now = new Date();
    db.run('INSERT INTO checks (key, status, length, responseTime, checkedAt)' +
        'VALUES (?, ?, ?, ?, ?)', [key, status, length, time, now],
        callback);
    async.each(notify, function (n, next) {
        n({
            key: key,
            status: status,
            length: length,
            responseTime: time,
            checkedAt: now.getTime()
        });
        next();
    });
};

exports.getRecentChecks = function getRecentChecks(offset, callback) {
    if (!offset) {
        offset = 10 * 60;
    }
    var date = new Date() - (offset * 1000);
    db.all('SELECT * FROM checks WHERE checkedAt > ?' +
        ' ORDER BY checkedAt DESC', [date], callback);
};
