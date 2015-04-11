'use strict';

var plotly = require('plotly'),
    database = require('./database');

var data = {},
    layout = {
        fileopt: 'overwrite',
        filename: 'Latest Response Times',
        layout: {
            showlegend: true,
            title: 'Latest Response Times'
        }
    },
    layoutData = {
        data: [{
            x: [],
            y: [],
            name: '/',
            type: 'scatter'
        }, {
            x: [],
            y: [],
            name: '/latest.json',
            type: 'scatter'
        }],
        
    };
plotly = plotly('servercooties', 'ismuxlxups');

function makePlot(){
    var lines = Object.keys(data).map(function(key){
        return {
            name: key,
            type: 'scatter',
            x: data[key].map(function(check){return new Date(check.checkedAt).toISOString();}),
            y: data[key].map(function(check){return check.responseTime/1000;}),
        };
    });
    console.log (data, lines, layout);
    //plotly.plot(lines, layout, function(err, msg){
    //    console.log(arguments);
    //});
}

function sortData(checks) {
    var cutoff = Date.now() - 60*60*1000;
    console.log(checks);
    checks.forEach(function (check) {
        var key = /\/.*$/.exec(check.key),
            d = data[key] || [];
        console.log(key);
        d.push(check);
        data[key] = d;
    });
    Object.keys(data).forEach(function(key){
        data[key] = data[key].filter(function(check){
            return check.checkedAt >= cutoff;
        });
    });
}

function setData(check) {
    sortData([check]);
}


database.getRecentChecks(15 * 60 * 60, function (err, checks) {
    if (err) {
        return;
    }
    database.registerListener(setData);
    sortData(checks);
    makePlot();
    process.exit();
});
