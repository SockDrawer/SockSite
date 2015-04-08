/*jslint node: true, indent: 4 */
'use strict';

process.on('uncaughtException', function (err) {
    /*eslint-disable no-process-exit, no-console*/
    console.error(err);
    process.exit(1);
    /*eslint-enable no-process-exit, no-console*/
});

var cache = require('./cache'),
    checks = require('./check'),
    http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    mustache = require('mustache'),
    yaml = require('js-yaml');
var port = parseInt(process.env.PORT || 8888, 10),
    ip = process.env.IP || undefined,
    server;



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
            respond(file, 200, 'application/octet-stream', response);
        });
    });
}

function respond(data, code, contentType, response) {
    response.writeHead(code, {
        'Content-Type': contentType
    });
    response.write(data, 'binary');
    response.end();
}

function formatJSON(data, callback) {
    try {
        data = JSON.stringify(data, undefined, '\t');
    } catch (e) {
        return callback(e);
    }
    callback(null, data);
}
formatJSON.contentType = 'application/json';

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
formatYAML.contentType = 'text/yaml';

function formatHTML(data, template, callback) {
    if (typeof (template) === 'function') {
        callback = template;
        template = 'index.html';
    }
    if (!cache.templates[template]) {
        return callback('Template `' + template + '` Not Loaded!');
    }

    try {
        callback(null, mustache.render(cache.templates[template], data,
            cache.templates));
    } catch (e) {
        callback(e);
    }

}
formatHTML.contentType = 'text/html';

server = http.createServer(function (request, response) {
    var uri = url.parse(request.url).pathname,
        filename = path.join(process.cwd(), uri);

    /* eslint-disable no-console */
    console.log(uri);
    /* eslint-enable no-console */
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

        if (!cache.summary) {
            return render500Error('E_NO_DATA', response);
        }
        cache.summary.host = request.headers.host;
        formatter(cache.summary, function (err2, data2) {
            if (err2) {
                return render500Error(err2, response);
            }
            respond(data2, 200, formatter.contentType, response);
        });
    } else {
        render404Error(response);
    }
});
cache.buildCache(function (err) {
    /*eslint-disable no-console */
    if (err) {
        return console.error(err);
    }
    console.log('server started');
    server.listen(port, ip);
    /*eslint-neable no-console */
});

function render404Error(response) {
    formatHTML(null, 'error404.html', function (err, data) {
        var mime = 'text/html';
        if (err) {
            data = '404 Not Found';
            mime = 'text/plain';
        }
        return respond(data, 404, mime, response);
    });
}

function render500Error(err, response) {
    formatHTML(null, 'error500.html', function (err2, data) {
        var mime = 'text/html';
        if (err) {
            data = err || err2;
            mime = 'text/plain';
        }
        return respond(data, 500, mime, response);
    });
}
