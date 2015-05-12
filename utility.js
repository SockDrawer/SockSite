'use strict';
var async = require('async');
var config = require('./config.json');

exports.getFlavor = function getFlavor(value, arr) {
    var key = Object.keys(arr).filter(function (a) {
            return a <= value;
        }),
        res;
    key = key[key.length - 1];
    res = arr[key];
    if (typeof res !== 'string' && res !== undefined) {
        res = res[Math.floor(Math.random() * res.length)];
    }
    return res;
};


exports.getScore = function getScore(check) {
    var code = check.responseCode,
        time = check.responseTime;
    if ((code !== 200 && code !== 204) || time > 12) {
        return 0;
    } else if (time > 3) {
        return 50;
    }
    return 100;
};

exports.range = function range(num) {
    return Array.apply(null, Array(num)).map(function (_, i) {
        return i;
    });
};

exports.round = function round(num, places) {
    if (!places) {
        places = 0;
    }
    places = Math.pow(10, places);
    return Math.round(num * places) / places;
};

exports.sum = function sum(arr, mapper) {
    if (!mapper || !mapper.call) {
        mapper = function mapper(data) {
            return data;
        };
    }
    return arr.map(mapper).reduce(function (a, b) {
        return a + b;
    }, 0);
};

exports.average = function average(arr, mapper) {
    if (!mapper || !mapper.call) {
        mapper = function mapper(data) {
            return data;
        };
    }
    return exports.sum(arr, mapper) / arr.length;
};

exports.max = function max(arr, mapper) {
    if (!mapper || !mapper.call) {
        mapper = function mapper(data) {
            return data;
        };
    }
    return Math.max(arr.map(mapper));
};

exports.formattedRowGenerator = function formattedRowGenerator() {
    function format(row) {
        row.score = exports.getScore(row);
        row.response = exports.getFlavor(row.score, config.scoreCode);
        row.polledAt = new Date(row.checkedAt).toGMTString();
    }
    var avg = [];
    return function (row, callback) {
        var res = [row];
        avg.unshift(row);
        format(row);
        if (avg.length === config.checks.length) {
            var overall = {
                checkName: 'overall',
                checkId: -1,
                responseCode: exports.round(exports.max(avg, function (n) {
                    return n.responseCode;
                })),
                responseTime: exports.round(exports.average(avg, function (n) {
                    return n.responseTime;
                }), 3),
                checkedAt: avg[0].checkedAt
            };
            format(overall);
            res.push(overall);
            avg.pop();
        }
        process.nextTick(function () {
            callback(null, res);
        });
    };
};

exports.parseData = function parseData(data, formatter, callback) {
    var result = {
        'overall': []
    };
    config.checks.forEach(function (key) {
        result[key.replace(/^https?:\/\//, '')] = [];
    });
    async.eachSeries(data, function (row, next) {
        formatter(row, function (_, rows) {
            rows.forEach(function (r) {
                result[r.checkName].unshift(r);
            });
            next();
        });
    }, function () {
        callback(null, result);
    });
};


exports.truncateData = function truncateData(data, filter, minimum) {
    if (!data){
        return [];
    }
    if (typeof filter === 'number') {
        minimum = filter;
        filter = function () {
            return true;
        };
    }
    var res = data.filter(filter);
    if (res.length < minimum) {
        res = data.slice(0, minimum);
    }
    return res;
};

exports.roundAverage = function roundAverage(data, reduce, places) {
    return exports.round(exports.average(data, reduce), places);
};
