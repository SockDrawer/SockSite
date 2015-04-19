/*jslint node: true, indent: 4 */
'use strict';

process.on('uncaughtException', function (err) {
    /*eslint-disable no-process-exit, no-console*/
    console.error(err.stack);
    process.exit(1);
    /*eslint-enable no-process-exit, no-console*/
});

var cache = require('./cache'),
    checks = require('./check'),
    render = require('./render'),
    router = require('./router'),
    http = require('http'),
    url = require('url');
require('./graph');
var port = parseInt(process.env.PORT || 8888, 10),
    ip = process.env.IP || undefined,
    server;

checks.start();

server = http.createServer(function (request, response) {
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
