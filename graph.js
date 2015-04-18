'use strict';

var plotly = require('plotly'),
    database = require('./database');
var config,
    streams = {};
try {
    config = require('./graph.json');
} catch (e) {
    console.warn(e); //eslint-disable-line no-console
    config = {};
}

function createStream(line) {
    function onClose(err) {
        delete streams[line.key];
        /*eslint-disable no-console */
        if (err) {
            console.warn(err);
        } else {
            console.log('Stream close: ' + line.label);
        }
        /*eslint-enable no-console */
        setTimeout(function () {
            createStream(line);
        }, (err ? 60 : 3) * 1000);
    }
    var stream = plotly.stream(line.token, onClose);
    stream.on('error', onClose);
    streams[line.key] = stream;
}

function createStreams() {
    config.stream.lines.forEach(function (line) {
        createStream(line);
    });
}

function makePlot(callback) {
    var lines = config.stream.lines.map(function (line) {
            return {
                name: line.label,
                type: 'scatter',
                x: [],
                y: [],
                stream: {
                    token: line.token,
                    maxpoints: config.stream.points
                }
            };
        }),
        layout = {
            fileopt: 'extend',
            filename: config.stream.filename,
            layout: {
                showlegend: true,
                title: config.stream.name,
                autosize: true,
                width: 1368,
                height: 781,
                xaxis: {
                    tickformat: '%H:%M',
                    title: 'Time of Check',
                    type: 'date',
                    hoverformat: '%H:%M:%S'
                },
                yaxis: {
                    title: 'Response Time',
                    ticksuffix: 's'
                }
            }
        };
    plotly.plot(lines, layout, function () {
        callback();
    });
}

if (config.username) {
    plotly = plotly(config.username, config.apikey);
    createStreams();
    makePlot(function () {});
    database.registerListener(function (data) {
        if (streams[data.key]) {
            var d = new Date(data.checkedAt);
            streams[data.key].write(JSON.stringify({
                x: d.toISOString().replace('T', ' ').replace('Z', ''),
                y: data.responseTime / 1000
            }) + '\n');
        }
    });
}
