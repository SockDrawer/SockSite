'use strict';
jQuery(function () {
    var chart = new window.CanvasJS.Chart("timeChartContainer", {
        title: {
            text: "Latest Response Times"
        },
        width: $(".tab-content").width(),
        height: 300,
        axisX: {
            valueFormatString: "HH:mm"
        },
        axisY: {
            suffix: ' s'
        },
        data: window.graphs.timings
    });
    chart.render();
    window.socket.on('graphData', function (data) {
        window.graphs.timings.forEach(function (time) {
            if (time.name !== data.key) {
                return;
            }
            time.dataPoints.push({
                y: data.responseTime,
                x: data.checkedAt
            });
            time.dataPoints.shift();
            time.dataPoints.sort(function (a, b) {
                return a.x - b.x;
            });
        });
        chart.render();
    });
});