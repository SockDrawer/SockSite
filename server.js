/*jslint node: true, indent: 4 */
'use strict';

process.on('uncaughtException', function (err) {
    /*eslint-disable no-process-exit, no-console*/
    console.error(err, err.stack);
    process.exit(1);
    /*eslint-enable no-process-exit, no-console*/
});

var cache = require('./cache'),
    database = require('./database'),
    checks = require('./check'),
    graph = require('./graph'),
    quotes = require('./quotes'),
    http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    mustache = require('mustache'),
    yaml = require('js-yaml');
var port = parseInt(process.env.PORT || 8888, 10),
    ip = process.env.IP || undefined,
    server,
    paths = [{
        path: /^\/static/,
        renderer: serveStatic
    }, {
        path: /^\/(index[.](html?|json|yml))?$/i,
        renderer: renderIndex
    }, {
        path: /^\/scripts[.]js/i,
        renderer: function (_, __, response) {
            renderMinified(cache.scripts, 'application/javascript', response);
        }
    }, {
        path: /^\/styles[.]css/i,
        renderer: function (_, __, response) {
            renderMinified(cache.styles, 'text/css', response);
        }
    }, {
        path: /^\/avatar\//i,
        renderer: quotes.serveAvatar
    }];

if (process.env.SOCKDEV) {
    paths = paths.concat([{
        path: /^\/reset([.]html)?/i,
        renderer: function (uri, request, response) {
            cache.buildCache(function () {
                renderIndex(uri, request, response);
            });
        }
    }, {
        path: /^\/great([.]html)?/i,
        renderer: function (_, __, response) {
            renderSample(100, response);
        }
    }, {
        path: /^\/good([.]html)?/i,
        renderer: function (_, __, response) {
            renderSample(1500, response);
        }
    }, {
        path: /^\/ok([.]html)?/i,
        renderer: function (_, __, response) {
            renderSample(2100, response);
        }
    }, {
        path: /^\/bad([.]html)?/i,
        renderer: function (_, __, response) {
            renderSample(3100, response);
        }
    }, {
        path: /^\/offline([.]html)?/i,
        renderer: function (_, __, response) {
            renderSample(21000, response);
        }
    }, {
        path: /^\/quote/i,
        renderer: function (_, __, response) {
            formatJSON(quotes.getQuote(), function (___, data) {
                respond(data, 200, 'text/json;charset=utf-8', response);
            });
        }
    }]);
}

checks.start();

function serveStatic(uri, _, response) {
    var filename = path.join(process.cwd(), uri);
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
            respond(file, 200, undefined, response);
        });
    });
}

function respond(data, code, contentType, response) {
    if (contentType) {
        response.writeHead(code, {
            'Content-Type': contentType
        });
    } else {
        response.writeHead(code);
    }
    response.write(data, /utf-8/.test(contentType || '') ? 'utf8' : 'binary');
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
formatJSON.contentType = 'application/json;charset=utf-8';

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
formatYAML.contentType = 'text/yaml;charset=utf-8';

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
formatHTML.contentType = 'text/html;charset=utf-8';

function renderIndex(uri, request, response) {
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
    cache.summary.discodefinition = quotes.getQuote;
    formatter(cache.summary, function (err2, data2) {
        if (err2) {
            return render500Error(err2, response);
        }
        respond(data2, 200, formatter.contentType, response);
    });
}

function renderMinified(data, mime, response) {
    var text = [];
    text.push(['/*', data.map(function (d) {
        return d.name;
    }), '*/'].join(' '));
    text = text.concat(data.map(function (d) {
        return d.data;
    }));
    respond(text.join('\n'), 200, mime, response);
}

function renderSample(time, response) {
    var data = database.summarizeData(database.getSampleData(time, 200), {});
    formatHTML(data, function (err2, data2) {
        if (err2) {
            return render500Error(err2, response);
        }
        respond(data2, 200, 'text/html', response);
    });

}


server = http.createServer(function (request, response) {
    var uri = url.parse(request.url).pathname;

    /* eslint-disable no-console */
    console.log(uri);
    /* eslint-enable no-console */
    var rendered = paths.some(function (point) {
        var res = point.path.test(uri);
        if (res) {
            point.renderer(uri, request, response);
        }
        return res;
    });
    if (!rendered) {
        render404Error(response);
    }
    return;

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
        if (err2) {
            data = err;
            mime = 'text/plain';
        }
        return respond(data, 500, mime, response);
    });
}
