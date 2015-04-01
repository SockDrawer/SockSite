/*jslint node: true, indent: 4 */
/* eslint-disable no-console */
'use strict';
var db = require('./database'),
    config = require('./config.json'),
    checks = require('./check'),
    http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    mustache = require('mustache');
var port = parseInt(process.env.PORT || 8888, 10),
    ip = process.env.IP || undefined;

checks.start();

function getData(callback) {
    db.getRecentChecks(10 * 60 * 1000, function (err, data) {
        if (err || !data) {
            return callback(err || 'NO DATA');
        }
        var keys,
            sum = 0,
            result = {
                version: config.version,
                time: new Date().toISOString(),
                checks: [],
                summary: []
            };
        keys = Object.keys(data);
        keys.sort();
        keys.forEach(function (key) {
            var time = [],
                status = [],
                polled = 0,
                type = 'BAD',
                check = {
                    name: key,
                    values: data[key].map(function (row) {
                        polled = Math.max(0, row.checkedAt);
                        time.push(row.responseTime);
                        status.push(row.status);
                        return {
                            code: row.status,
                            responseTime: row.responseTime,
                            polledAt: row.checkedAt
                        };
                    })
                };
            time = time.reduce(function (a, b) {
                return a + b;
            }, 0) / time.length;
            status = status.reduce(function (a, b) {
                return a + b;
            }, 0) / status.length;
            if (status === 200) {
                type = 'GREAT';
            } else if (status < 300) {
                type = 'OK';
            }
            sum += status;
            result.summary.push({
                name: key,
                code: status,
                response: type,
                responseTime: time,
                polledAt: polled
            });
            result.checks.push(check);
        });
        sum /= keys.length;
        result.up = sum < 300;
        result.percentage = sum;
        callback(null, result);
    });
}


function serveStatic(filename, response) {
    fs.exists(filename, function (exists) {
        if (!exists) {
            response.writeHead(404, {
                'Content-Type': 'text/plain'
            });
            response.write('404 Not Found\n');
            response.end();
            return;
        }

        if (fs.statSync(filename).isDirectory()) {
            filename += '/index.html';
        }

        fs.readFile(filename, 'binary', function (err, file) {
            if (err) {
                response.writeHead(500, {
                    'Content-Type': 'text/plain'
                });
                response.write(err + '\n');
                response.end();
                return;
            }


            response.writeHead(200);
            response.write(file, 'binary');
            response.end();
        });
    });
}

http.createServer(function (request, response) {
    var uri = url.parse(request.url).pathname,
        filename = path.join(process.cwd(), uri);

    console.log(uri);
    if (/^\/static/.test(uri)) {
        serveStatic(filename, response);
    } else if (uri === '/' || uri === '/index.json') {
        getData(function (err, data) {
            if (err) {
                response.writeHead(500, {
                    'Content-Type': 'text/plain'
                });
                response.write(err + '\n');
                response.end();
                return;
            }
            data.host = request.headers.host;
            response.writeHead(200);
            if (uri === '/index.json') {
                response.write(JSON.stringify(data), 'binary');
                response.end();
            } else {
                fs.readFile(path.join(process.cwd(), 'templates', 'index.html'),
                    'binary',
                    function (err2, file) {
                        if (err2) {
                            response.writeHead(500, {
                                'Content-Type': 'text/plain'
                            });
                            response.write(err2 + '\n');
                            response.end();
                            return;
                        }
                        response.write(mustache.render(file, data), 'binary');
                        response.end();
                    });
            }
        });
    } else {
        response.writeHead(404, {
            'Content-Type': 'text/plain'
        });
        response.write('404 Not Found\n');
        response.end();
    }
}).listen(port, ip);
