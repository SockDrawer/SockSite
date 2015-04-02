/*jslint node: true, indent: 4 */
/* eslint-disable no-console */
'use strict';
var database = require('./data'),
    checks = require('./check'),
    http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    mustache = require('mustache'),
    yaml = require('js-yaml');
var port = parseInt(process.env.PORT || 8888, 10),
    ip = process.env.IP || undefined;

checks.start();

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

function formatJSON(data, callback) {
    try {
        data = JSON.stringify(data);
    } catch (e) {
        return callback(e);
    }
    callback(null, data);
}
function formatYAML(data, callback) {
    try {
        data = yaml.safeDump(data);
    } catch (e) {
        return callback(e);
    }
    callback(null, data);
}

function formatHTML(data, callback) {
    fs.readFile(path.join(process.cwd(), 'templates', 'index.html'),
        'binary',
        function (err, file) {
            if (err) {
                return callback(err);
            }
            try {
                callback(null, mustache.render(file, data));
            } catch (e) {
                callback(e);
            }
        });
}

http.createServer(function (request, response) {
    var uri = url.parse(request.url).pathname,
        filename = path.join(process.cwd(), uri);

    console.log(uri);
    if (/^\/static/.test(uri)) {
        serveStatic(filename, response);
    } else if (/^\/(index[.](html?|json|yml))?$/i.test(uri)) {
        var formatter = formatHTML,
        accept = request.headers.accept;
        uri = uri.toLowerCase();
        if (uri === '/index.json' || accept === 'application/json') {
            formatter = formatJSON;
        }else if (uri === '/index.yml' || accept === 'application/yaml') {
            formatter = formatYAML;
        }
        database.getData({
            dataPeriod: 5 * 60,
            host: request.headers.host
        }, function (err, data) {
            if (err) {
                response.writeHead(500, {
                    'Content-Type': 'text/plain'
                });
                response.write(err + '\n');
                response.end();
                return;
            }
            formatter(data, function (err2, data2) {
                if (err2) {
                    response.writeHead(500, {
                        'Content-Type': 'text/plain'
                    });
                    response.write(err2 + '\n');
                    return response.end();
                }
                response.writeHead(200);
                response.write(data2, 'binary');
                response.end();
            });
        });
    } else {
        response.writeHead(404, {
            'Content-Type': 'text/plain'
        });
        response.write('404 Not Found\n');
        response.end();
    }
}).listen(port, ip);
