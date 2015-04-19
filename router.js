'use strict';

var render = require('./render'),
    quotes = require('./quotes'),
    database = require('./database'),
    cache = require('./cache');

exports.paths = [{
    path: /^\/static/,
    renderer: render.serveStatic
}, {
    path: /^\/templates/,
    renderer: render.serveStatic
}, {
    path: /^\/(index[.](html?|json|yml))?$/i,
    renderer: render.renderIndex
}, {
    path: /^\/scripts[.]js$/,
    renderer: render.renderScripts
}, {
    path: /^\/styles[.]css$/,
    renderer: render.renderStyles
}, {
    path: /^\/avatar\//,
    renderer: quotes.serveAvatar
}, {
    path: /^\/raw$/,
    renderer: database.getRawData
}];

if (process.env.SOCKDEV) {
    exports.paths = exports.paths.concat([{
        path: /^\/reset([.]html)?$/i,
        renderer: function (uri, request, response) {
            cache.buildCache(function () {
                render.renderIndex(uri, request, response);
            });
        }
    }, {
        path: /^\/great([.]html)?$/i,
        renderer: function (_, __, response) {
            render.renderSample(100, response);
        }
    }, {
        path: /^\/good([.]html)?$/i,
        renderer: function (_, __, response) {
            render.renderSample(1500, response);
        }
    }, {
        path: /^\/ok([.]html)?$/i,
        renderer: function (_, __, response) {
            render.renderSample(2100, response);
        }
    }, {
        path: /^\/bad([.]html)?$/i,
        renderer: function (_, __, response) {
            render.renderSample(3100, response);
        }
    }, {
        path: /^\/offline([.]html)?$/i,
        renderer: function (_, __, response) {
            render.renderSample(21000, response);
        }
    }]);
}
