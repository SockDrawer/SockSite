'use strict';
jQuery(function () {

    function makechart(id, title, data, suffix) {
        return new window.CanvasJS.Chart(id, {
            animation: false,
            responsive: true,
            title: {
                text: title
            },
            height: 300,
            axisX: {
                valueFormatString: "HH:mm"
            },
            axisY: {
                suffix: suffix
            },
            data: data
        });
    }

    function rerender(graphdata, selector, chart, data) {
        graphdata.forEach(function (time) {
            if (time.name !== data.key) {
                return;
            }
            time.dataPoints.push({
                y: selector(data),
                x: data.checkedAt
            });
            time.dataPoints.shift();
            time.dataPoints.sort(function (a, b) {
                return a.x - b.x;
            });
        });
        chart.render();
    }

    var chart = makechart("timeChartContainer", "Latest Response Times",
            window.graphs.timings, ' s'),
        chart2 = makechart("scoreChartContainer", "Latest Discoappdex Scores",
            window.graphs.scores, '%');
    chart.render();
    chart2.render();
    window.socket.on('graphData', function (data) {
        if($('#timeChartContainer:visible').length > 0) {
            rerender(window.graphs.timings, function (data) {
                return data.responseTime;
            }, chart, data);
            rerender(window.graphs.scores, function (data) {
                return data.score;
            }, chart2, data);
        }
    });
});