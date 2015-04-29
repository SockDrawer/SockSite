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

    function rerender(chart){
        setInterval(function(){
        var visible = $('#timeChartContainer:visible').length > 0;
        if (chart._shouldRender && visible) {
            chart.render();
            chart._shouldRender = false;
        }},
        5000);
    }
    
    function redata(graphdata, selector, chart, data) {
        graphdata.forEach(function (time) {
            if (time.name !== data.key) {
                return;
            }
            time.dataPoints.push({
                y: selector(data),
                x: data.checkedAt
            });
            time.dataPoints.sort(function (a, b) {
                return a.x - b.x;
            });
            var cutoff = Date.now() - graphdata.dataPeriod,
            points = time.dataPoints.filter(function(point){
                return point.x >= cutoff;
            });
            if (points.length < 30){
                points = time.dataPoints.slice(time.dataPoints.length - 30);
            }
            time.dataPoints = points;
        });
        chart._shouldRender = true;
    }

    var chart = makechart("timeChartContainer", "Latest Response Times",
            window.graphs.timings, ' s'),
        chart2 = makechart("scoreChartContainer", "Latest Discoappdex Scores",
            window.graphs.scores, '%');
    chart.render();
    rerender(chart);
    chart2.render();
    rerender(chart2);
    window.socket.on('graphData', function (data) {
        redata(window.graphs.timings, function (data) {
            return data.responseTime;
        }, chart, data);
        redata(window.graphs.scores, function (data) {
            return data.score;
        }, chart2, data);
    });
});