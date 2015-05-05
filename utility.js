'use strict';

exports.getFlavor = function getFlavor(value, arr) {
    var key = Object.keys(arr).filter(function (a) {
        return a <= value;
    });
    key = key[key.length - 1];
    return arr[key];
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