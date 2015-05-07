/*jslint node: true, indent: 4 */
'use strict';

process.on('uncaughtException', function (err) {
    /*eslint-disable no-process-exit, no-console*/
    console.error(err.stack);
    process.exit(1);
    /*eslint-enable no-process-exit, no-console*/
});

var http = require('http'),
    url = require('url'),
    async = require('async'),
    socketio = require('socket.io');
var cache = require('./cache'),
    checks = require('./check'),
    render = require('./render'),
    router = require('./router');
var port = parseInt(process.env.PORT || 8888, 10),
    ip = process.env.IP || undefined,
    server = http.createServer(handler),
    io = socketio(server);

require('./graph');

checks.start();

function handler(request, response) {
    var uri = url.parse(request.url).pathname;

    /* eslint-disable no-console */
    console.log(uri);
    /* eslint-enable no-console */
    var rendered = router.paths.some(function (point) {
        var res = point.path.test(uri);
        if (res) {
            point.renderer(uri, request, response);
        }
        return res;
    });
    if (!rendered) {
        render.render404Error(response);
    }
    return;

}
cache.buildCache(function (err) {
    /*eslint-disable no-console */
    if (err) {
        return console.error(err);
    }
    console.log('server started');
    server.listen(port, ip);
    /*eslint-neable no-console */
});

exports.io = io;

io.on('connection', function (socket) {
    socket.emit('connected', Date.now());
    socket.on('getdata', function (callback) {
        if (!cache.summary) {
            return callback('E_NO_DATA');
        }
        callback(null, cache.summary);
    });
    socket.on('render', function (template, callback) {
        if (!cache.summary) {
            return callback('E_NO_DATA');
        }
        render.formatHTML(cache.summary, template, callback);
    });
    socket.on('gettemplates', function(callback){
        callback(null, cache.templates);
    });
});

async.forever(function (next) {
    io.emit('heartbeat', Date.now());
    setTimeout(next, 30 * 1000);
});
