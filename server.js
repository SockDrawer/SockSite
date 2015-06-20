/*jslint node: true, indent: 4 */
'use strict';
/**
 * Main entry point to SockSite. Server starts here.
 * @module server
 * @author Accalia
 * @license MIT
 */

if (process.env.SOCKDEV && !process.env.SOCKPERM) {
    // Terminate devmode server after 60 minutes
    setTimeout(function () {
        console.error('Terminating dev mode server on schedule'); //eslint-disable-line no-console
        process.exit(); //eslint-disable-line no-process-exit
    }, 60 * 60 * 1000);
}

// Make sure we get a stack trace on uncaught exception.
// we're not supposed to get those but just in case
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



/**
 * Handler for HTTP requests. All HTTP requests start here
 */
function handler(request, response) {
    var uri = url.parse(request.url).pathname;

    // Log request
    /* eslint-disable no-console */
    console.log(uri);
    /* eslint-enable no-console */

    // Check the paths known to router to render response.
    // Response is handled by the renderer. we only care about is it handled
    var rendered = router.paths.some(function (point) {
        var res = point.path.test(uri);
        if (res) {
            point.renderer(uri, request, response);
        }
        return res;
    });
    // Render 404 if no route found
    if (!rendered) {
        render.render404Error(response);
    }
    return;

}
exports.handler = handler;

//Export websockets socket for other modules
exports.io = io;

io.on('error', function (e) {
    console.warn(e); //eslint-disable-line no-console
});

exports.start = function (m_port, m_ip, callback) {
    // Kick off the initial cache build.
    // Start the HTTP server in the callback to this so initial cache is
    // loaded first
    cache.buildCache(function (err) {
        if (err) {
            console.error(err); //eslint-disable-line no-console
            return callback(err);
        }
        console.log('server started'); //eslint-disable-line no-console
        server.listen(m_port, m_ip);
        callback();
    });
};
if (require.main === module) {
    require('./graph');

    checks.start();

    exports.start(port, ip, function () {
        //Emit heartbeat event regularly
        async.forever(function (next) {
            io.emit('heartbeat', Date.now());
            setTimeout(next, 30 * 1000);
        });
    });
}


// Set up per connection socket events
io.on('connection', function (socket) {
    // Send the date on connection
    socket.emit('connected', Date.now());
    // When client emits `getdata` reply with current summary
    socket.on('getdata', function (callback) {
        if (!cache.summary) {
            return callback('E_NO_DATA');
        }
        callback(null, cache.summary);
    });
    // render templates server side on request.
    socket.on('render', function (template, callback) {
        if (!cache.summary) {
            return callback('E_NO_DATA');
        }
        render.formatHTML(cache.summary, template, callback);
    });
    // send client currently loaded templates on request
    socket.on('gettemplates', function (callback) {
        callback(null, cache.templates);
    });
    // send client graph data on req
    socket.on('getgraphs', function (callback) {
        callback(null, {
            'timings': cache.summary.getTimeChart(),
            'scores': cache.summary.getScoreChart()
        });
    });
    socket.on('error', function () {
        return;
    });
});
