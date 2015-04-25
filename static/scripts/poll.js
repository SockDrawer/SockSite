window.last_polled_data = null;

var tabs = {
    "status": {template:statusTemplate, element: $('#status').find('.table'), renderer:function(){        
        var rendered_template = Mustache.render(this.template, last_polled_data.data);
        this.element.html( rendered_template );
    } },

    "history": {template:historyTemplate,element:null, renderer: function(){
        var rendered_template = Mustache.render(this.template,last_polled_data.data);
        $($.parseHTML(rendered_template)).find('.panel-collapse').each(function(){
            $('#' + $(this).attr('id')).html($(this).html());
        });
    } },
    //"graph": {}
}

$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) { //update tab trigger when user switch tab
        update_active_tab(); 
});

/**
    Render only the active tab
**/
function update_active_tab(){ 
    var active_tab_el = $('div.tab-content div.tab-pane.active');
    var active_tab_id = active_tab_el[0].id;

    if( tabs.hasOwnProperty( active_tab_id ) ){
        var active_tab = tabs[active_tab_id];  
        if(active_tab.last_render && last_polled_data.time < active_tab.last_render) { //check if tab was already rendered by the most recent data poll
            return; //nothing to render exit 
        }
        tabs[active_tab_id].renderer(); //call the renderer of the tab
        tabs[active_tab_id].last_render = Date.now(); //update tab last render time
    }
}

function pollForData() {
    $.get('/index.json', {}, function(data) {
        window.last_polled_data = {time:Date.now(), data:data}; //keep last polled data globally.
        var headerbarRendered = Mustache.render(headerbarTemplate, data);
        $('#header-image-wrapper').html(headerbarRendered);
        update_active_tab(); //optimized tab render
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