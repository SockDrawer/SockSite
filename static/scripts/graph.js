'use strict';
/*global jQuery */
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
                valueFormatString: 'HH:mm'
            },
            axisY: {
                suffix: suffix
            },
            data: data
        });
    }

    function rerender(chart) {
        setInterval(function () {
                var visible = $('#timeChartContainer:visible').length > 0;
                if (chart.shouldRender && visible) {
                    chart.render();
                    chart.shouldRender = false;
                }
            },
            5000);
    }

    function redata(graphdata, selector, chart, data) {
        graphdata.forEach(function (time) {
            if (time.name !== data.checkName) {
                return;
            }
            time.dataPoints.unshift({
                y: selector(data),
                x: data.checkedAt
            });
            var cutoff = Date.now() - time.dataPeriod,
                points = time.dataPoints.filter(function (point) {
                    return point.x >= cutoff;
                });
            if (points.length < 30) {
                points = time.dataPoints.slice(0, 30);
            }
            time.dataPoints = points;

        });
        chart.shouldRender = true;
    }

    var timeChart = makechart('timeChartContainer',
            'Latest Response Times', window.graphs.timings, ' s'),
        scoreChart = makechart('scoreChartContainer',
            'Latest DiscoApdex Scores', window.graphs.scores, '%');
    timeChart.render();
    rerender(timeChart);
    scoreChart.render();
    rerender(scoreChart);
    window.socket.on('data', function (_, data) {
        redata(window.graphs.timings, function (d) {
            return d.responseTime;
        }, timeChart, data);
        redata(window.graphs.scores, function (d) {
            return d.score;
        }, scoreChart, data);
    });
});
