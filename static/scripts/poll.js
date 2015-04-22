var statusTemplate;
var headerbarTemplate;
var historyTemplate;

function pollForData() {
    $.get('/index.json', {}, function(data) {
        var statusRendered = Mustache.render(statusTemplate, data);
        var headerbarRendered = Mustache.render(headerbarTemplate, data);
        var historyRendered = Mustache.render(historyTemplate, data);
        
        $('#status').find('.table').html(statusRendered);
        $('#header-image-wrapper').html(headerbarRendered);
        
        $($.parseHTML(historyRendered)).find('.panel-collapse').each(function(){
            $('#' + $(this).attr('id')).html($(this).html());
        });
        
        $('#flavorText').html(data.flavor);

    }, 'json');
}

$(function() {
    $.get('/templates/status_table.html', {}, function(data) {
        statusTemplate = data;
    }, 'html');
    
    $.get('/templates/headerbar.html', {}, function(data) {
        headerbarTemplate = data;
    }, 'html');
    
    $.get('/templates/history_table.html', {}, function(data) {
        historyTemplate = data;
    }, 'html');
    
    setInterval(pollForData, 5000);
});