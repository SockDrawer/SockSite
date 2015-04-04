/*jslint node: true, indent: 4 */
/* eslint-disable no-console */
'use strict';
var database = require('./data'),
    checks = require('./check'),
    config = require('./config.json'),
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
            return render404Error(response);
        }

        if (fs.statSync(filename).isDirectory()) {
            filename += '/index.html';
        }

        fs.readFile(filename, 'binary', function (err, file) {
            if (err) {
                return render500Error(err, response);
            }

            response.writeHead(200);
            response.write(file, 'binary');
            response.end();
        });
    });
}

function formatJSON(data, callback) {
    try {
        data = JSON.stringify(data, undefined, '\t');
    } catch (e) {
        return callback(e);
    }
    callback(null, data);
}

function formatYAML(data, callback) {
    try {
        data = yaml.safeDump(data,{skipInvalid:true});
    } catch (e) {
        return callback(e);
    }
    callback(null, data);
}

function formatHTML(data, template, callback) {
    if (typeof (template) === 'function') {
        callback = template;
        template = 'index.html';
    }
    fs.readFile(path.join(process.cwd(), 'templates', template),
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
        } else if (uri === '/index.yml' || accept === 'application/yaml') {
            formatter = formatYAML;
        }
        database.getData({
            dataPeriod: config.dataPeriod,
            host: request.headers.host
        }, function (err, data) {
            if (err) {
                return render500Error(err, response);
            }
            formatter(data, function (err2, data2) {
                if (err2) {
                    return render500Error(err2, response);
                }
                response.writeHead(200);
                response.write(data2, 'binary');
                response.end();
            });
        });
    } else {
        render404Error(response);
    }
}).listen(port, ip);

function render404Error(response) {
    formatHTML(null, 'error404.html', function (err, data) {
        if (err) {
            response.writeHead(404, {
                'Content-Type': 'text/plain'
            });
            response.write('404 Not Found\n');
            return response.end();
        }
        response.writeHead(404);
        response.write(data, 'binary');
        response.end();
    });
}

function render500Error(err, response) {
    formatHTML(null, 'error500.html', function (err2, data) {
        if (err || err2) {
            response.writeHead(500, {
                'Content-Type': 'text/plain'
            });
            response.write(err + '\n');
            return response.end();
        }
        response.writeHead(500);
        response.write(data, 'binary');
        response.end();
    });
}
