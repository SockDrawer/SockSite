'use strict';
var sqlite = require('sqlite3');
var db = new sqlite.Database('servercooties.sql');
db.serialize(function () {
    db.run('CREATE TABLE IF NOT EXISTS checks (' +
        'key VARCHAR(100) NOT NULL,' +
        'status INT NOT NULL,' +
        'length INT NOT NULL,' +
        'responseTime INT NOT NULL,' +
        'checkedAt DATETIME NOT NULL' +
        ')');
});

exports.addCheck = function addCheck(key, status, length, time, callback) {
    key = key.replace(/^https?:\/\//i, '');
    db.run('INSERT INTO checks (key, status, length, responseTime, checkedAt)' +
        'VALUES (?, ?, ?, ?, ?)', [key, status, length, time, new Date()],
        callback);
};

exports.getRecentChecks = function getRecentChecks(offset, callback) {
    if (!offset) {
        offset = 10 * 60;
    }
    var date = new Date() - (offset * 1000);
    db.all('SELECT * FROM checks WHERE checkedAt > ?' +
        ' ORDER BY checkedAt DESC', [date], callback);
};
