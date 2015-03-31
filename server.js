/*jslint node: true, indent: 4 */
/* eslint-disable no-console */
'use strict';
var http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    mustache = require('mustache');
var port = process.env.PORT || 8888;

http.createServer(function (request, response) {
    var uri = url.parse(request.url).pathname,
        filename = path.join(process.cwd(), 'static', uri);

    console.log(uri);

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


            if (uri === '/') {
                fs.readFile(path.join(process.cwd(), 'example.json'), function (err, data) {
                    if (err) {
                        response.writeHead(500, {
                            'Content-Type': 'text/plain'
                        });
                        response.write(err + '\n');
                        response.end();
                        return;
                    }
                    try{
                        data = JSON.parse(data);
                    } catch (e) {
                        data = {};
                    }
                    response.writeHead(200);
                    response.write(mustache.render(file, data), 'binary');
                    response.end();
                });
            } else {
                response.writeHead(200);
                response.write(file, 'binary');
                response.end();
            }
        });
    });
}).listen(parseInt(port, 10));
