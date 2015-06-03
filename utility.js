'use strict';
var async = require('async');
var config = require('./config.json');

/**
 * @typedef ServerCheck
 * @type {object}
 * @property {string} checkName Name of the checked endpoint
 * @property {number} checkId Id of the checkName.
 * @property {number} responseCode HTTP response code from the check
 * @property {number} responseTime Response time of the check in seconds
 * @property {number} checkedAt UNIX timestamp of the check
 *
 */

/**
 * turns an number into text. return value will be selected from the input by selecting the bigest key that is smaller
 * than the number. if the selected value is an array a random value of the array is selected.
 *
 * @param {number} value Value to flavorize
 * @param {Object<number, string>|Object<number, string[]>} arr flavors that can be applied
 * @returns {string} flavor selected based on value
 */
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

/**
 * Calculate DiscoApdex score from a remote server check.
 *
 * @param {ServerCheck} check the Check to calculate the score of
 * @returns {number} DiscoApdex score for the check
 */
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

/**
 * Get an array of numbers from 0 to num (exclusive)
 *
 * @param {number} num Endpoint of the range
 * @returns {number[]} array of [0-num)
 */
exports.range = function range(num) {
    return Array.apply(null, Array(num)).map(function (_, i) {
        return i;
    });
};

/**
 * Round a number to a specified number of decimal points. based on example from MDN
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round}
 * @param {number} num number to round
 * @param {integer} places number of decimal places
 * @returns {number} num rounded to places decimal places
 */
exports.round = function round(num, places) {
    places = places || 2;
    return Number(num.toFixed(places));
};

/**
 * Sum the values in an input array, optionally mapped through a map function.
 *
 * @param {*[]} arr Array of things to sum
 * @param {function} [mapper] Mapper of objects to number to apply to the input array
 * @returns {number} the sum
 */
exports.sum = function sum(arr, mapper) {
    if (!mapper || !mapper.call) {
        mapper = function (data) {
            return data;
        };
    }
    return arr.map(mapper).reduce(function (a, b) {
        return a + b;
    }, 0);
};

/**
 * Average the values in an input array, optionally mapped through a map function.
 *
 * @param {*[]} arr Array of things to average
 * @param {function} [mapper] Mapper of objects to number to apply to the input array
 * @returns {number} the average
 */
exports.average = function average(arr, mapper) {
    if (!mapper || !mapper.call) {
        mapper = function (data) {
            return data;
        };
    }
    return exports.sum(arr, mapper) / arr.length;
};

/**
 * Get the maximum of the values in an input array, optionally mapped through a map function.
 *
 * @param {*[]} arr Array of things to get the maximum
 * @param {function} [mapper] Mapper of objects to number to apply to the input array
 * @returns {number} the maximum value
 */
exports.max = function max(arr, mapper) {
    if (!mapper || !mapper.call) {
        mapper = function (data) {
            return data;
        };
    }
    return Math.max.apply(Math, arr.map(mapper));
};

/**
 * Get a function to calculate Scores for server checks, materialize "overall" points as they become available
 * @returns {function} row formatter
 */
exports.formattedRowGenerator = function formattedRowGenerator() {
    function format(row) {
        row.score = exports.getScore(row);
        row.response = exports.getFlavor(row.score, config.scoreCode);
        row.polledAt = new Date(row.checkedAt).toGMTString();
    }
    var avg = [];
    /**
     * Calculate Scores for server checks, materialize "overall" points as they become available
     */
    return function (row, callback) {
        var res = [row];
        avg.unshift(row);
        // Truncate average according to the rules for overall scores
        avg = avg.slice(0, config.scoreEntries * config.checks.length);
        format(row);
        row.readonly = !!row.readonly;
        if (avg.length < 1) {
            return process.nextTick(function () {
                callback(null, []);
            });
        }

        // Generate the overall score. This will be jittery for the first few entries formatted but should settle
        // quickly
        var overall = {
            checkName: 'overall',
            checkId: -1,
            responseCode: exports.round(exports.max(avg, function (n) {
                return n.responseCode;
            }), 2),
            responseTime: exports.round(exports.average(avg, function (n) {
                return n.responseTime;
            }), 3),
            checkedAt: avg[0].checkedAt,
            readonly: row.readonly
        };
        format(overall);
        overall.score = exports.round(exports.average(avg, function (n) {
            return n.score;
        }), 2);
        res.push(overall);
        // Make sure we don't block the server. schedule the callback for the next tick
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

/**
 * Truncate a data array, applying a filter and respecting a minimum number of entries
 *
 * @param {*[]} data array to truncate
 * @param {function} [filter] filter to apply to the data.
 * @param {integer} minimum minimum number of data entries.
 */
exports.truncateData = function truncateData(data, filter, minimum) {
    if (!data) {
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

/**
 * Average the values in an input array and round to a specified number of decimal places, mapped through a map function
 *
 * @param {*[]} data Array of things to average
 * @param {function} reduce Mapper of objects to number to apply to the input array
 * @param {integer} places number of decimal places to round to
 * @returns {number} the average, rounded to `places` decimal places
 */
exports.roundAverage = function roundAverage(data, reduce, places) {
    return exports.round(exports.average(data, reduce), places);
};
