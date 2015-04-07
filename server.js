/*jslint node: true, indent: 4 */
'use strict';

process.on('uncaughtException', function (err) {
    /*eslint-disable no-process-exit, no-console*/
    console.error(err);
    process.exit(1);
    /*eslint-enable no-process-exit, no-console*/
});

var database = require('./data'),
    checks = require('./check'),
    http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    mustache = require('mustache'),
    yaml = require('js-yaml'),
    async = require('async');
var port = parseInt(process.env.PORT || 8888, 10),
    ip = process.env.IP || undefined,
    templates;



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
        data = yaml.safeDump(data, {
            skipInvalid: true
        });
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
    if (!templates[template]) {
        return callback('Template `' + template + '` Not Loaded!');
    }

    try {
        callback(null, mustache.render(templates[template], data, templates));
    } catch (e) {
        callback(e);
    }

}

http.createServer(function (request, response) {
    var uri = url.parse(request.url).pathname,
        filename = path.join(process.cwd(), uri);

    /* eslint-disable no-console */
    console.log(uri);
    /* eslint-enable no-console */
    if (/^\/static/.test(uri)) {
        serveStatic(filename, response);
    } else if (/^\/(index[.](html?|json|yml))?$/i.test(uri)) {
        var formatter = formatHTML,
            contentType = 'text/html',
            accept = request.headers.accept;
        uri = uri.toLowerCase();
        if (uri === '/index.json' || accept === 'application/json') {
            formatter = formatJSON;
            contentType = 'application/json';
        } else if (uri === '/index.yml' || accept === 'application/yaml') {
            formatter = formatYAML;
            contentType = 'application/yaml';
        }

        database.getSummaryData({
            host: request.headers.host
        }, function (err, data) {
            if (err) {
                return render500Error(err, response);
            }
            formatter(data, function (err2, data2) {
                if (err2) {
                    return render500Error(err2, response);
                }

                if (checks.updated) { //update cache with new data.
                    checks.updated = false;
                }
                response.writeHead(200, {
                    'Content-Type': contentType
                });
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


fs.readdir('templates', function (err, files) {
    if (err) {
        throw err;
    }
    var suffix = /[.]html$/;
    var tpl = files.filter(function (file) {
        return suffix.test(file);
    }).map(function (file) {
        return 'templates/' + file;
    });
    async.map(tpl, function (f, callback) {
        fs.readFile(f, 'binary', callback);
    }, function (err2, data) {
        if (err2) {
            throw err2;
        }
        var x = {};
        files.forEach(function (file, idx) {
            x[file] = data[idx];
            x[file.replace(suffix, '')] = data[idx];
        });
        templates = x;
    });
});
