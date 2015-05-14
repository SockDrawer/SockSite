'use strict';
var fs = require('fs'),
    path = require('path'),
    mustache = require('mustache'),
    yaml = require('js-yaml');
var cache = require('./cache'),
    quotes = require('./quotes'),
    database = require('./database');

/**
 * Render data as JSON text
 */
function formatJSON(data, callback) {
    try {
        data = JSON.stringify(data, undefined, '\t');
    } catch (e) {
        return callback(e);
    }
    callback(null, data);
}
formatJSON.contentType = 'application/json;charset=utf-8';

/**
 * Render data as YAML text
 */
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

/**
 * Render data using mustache.js
 */
function formatHTML(data, template, callback) {
    if (typeof (template) === 'function') {
        callback = template;
        template = 'index';
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
exports.formatHTML = formatHTML;

/**
 * render the 404 NOT FOUND template
 */
function render404Error(response) {
    formatHTML(null, 'error404', function (err, data) {
        var mime = 'text/html';
        if (err) {
            data = '404 Not Found';
            mime = 'text/plain';
        }
        return respond(data, 404, mime, response);
    });
}
exports.render404Error = render404Error;

/**
 * render the 500 INTERNAL SERVER ERROR template
 */
function render500Error(err, response) {
    formatHTML(null, 'error500', function (err2, data) {
        var mime = 'text/html';
        if (err2) {
            data = err;
            mime = 'text/plain';
        }
        return respond(data, 500, mime, response);
    });
}
exports.render500Error = render500Error;

/**
 * write out the data to the response using the specified HTTP status code and
 * contentType.
 */
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

/**
 * Serve files from `/static`
 *
 * This should not end up getting called from production as the host web server
 * should handle this. as such efficiency is not a concern
 */
exports.serveStatic = function serveStatic(uri, _, response) {
    var filename = path.join(process.cwd(), uri);
    fs.exists(filename, function (exists) {
        if (!exists) {
            return render404Error(response);
        }

        //TODO: this really shouldn't be the sync version.
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
};

/**
 * Render the index with the current data
 */
exports.renderIndex = function renderIndex(uri, request, response) {
    var formatter = formatHTML,
        accept = request.headers.accept;

    // Determine the correct data formatter (HTML/JSON/YAML)
    uri = uri.toLowerCase();
    if (uri === '/index.json' || accept === 'application/json') {
        formatter = formatJSON;
    } else if (uri === '/index.yml' || accept === 'application/yaml') {
        formatter = formatYAML;
    }

    // Protection against rendering data without having any checks loaded
    // (shouldn't happen anyway, but just in case)
    if (!cache.summary) {
        return render500Error('E_NO_DATA', response);
    }

    // Site is served under multiple hosts so put that in the data to render
    cache.summary.host = request.headers.host;
    cache.summary.discodefinition = quotes.getQuote;

    // Run the data through the formatter and respond with the results
    formatter(cache.summary, function (err2, data2) {
        if (err2) {
            return render500Error(err2, response);
        }
        respond(data2, 200, formatter.contentType, response);
    });
};

/**
 * Rrender all loaded and minified scripts to client
 *
 * NOTA BENE: Order of scripts is not guaranteed and may change from
 * load to load
 */
exports.renderScripts = function renderScripts(_, __, response) {
    if (!cache.scripts) {
        return render500Error('E_NO_DATA', response);
    }
    var text = [];
    text.push(['/*', cache.scripts.map(function (d) {
        return d.name;
    }), '*/'].join(' '));
    text = text.concat(cache.scripts.map(function (d) {
        return d.data;
    }));
    respond(text.join('\n'), 200, 'application/javascript', response);
};

/**
 * Render all loaded and minified stylesheets to the client
 */
exports.renderStyles = function renderStyles(_, __, response) {
    if (!cache.styles) {
        return render500Error('E_NO_DATA', response);
    }
    var text = [];
    text.push(['/*', cache.styles.map(function (d) {
        return d.name;
    }), '*/'].join(' '));
    text = text.concat(cache.styles.map(function (d) {
        return d.data;
    }));
    respond(text.join('\n'), 200, 'text/css', response);
};

/**
 * PROBABLY BROKEN.
 *
 * Render faked sample data to the client.
 *
 * TODO: Fix or replace this.
 */
exports.renderSample = function renderSample(time, response) {
    var data = database.summarizeData(database.getSampleData(time, 200), {});
    formatHTML(data, function (err2, data2) {
        if (err2) {
            return render500Error(err2, response);
        }
        respond(data2, 200, 'text/html', response);
    });
};
