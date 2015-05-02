function showTab() {
    var hash = window.location.hash;

    if(hash) {
        $('ul.nav-tabs a[href="' + hash + '"]').tab('show');
    } else {
        $('ul.nav-tabs li:first a').tab('show');
    }
}

$(function(){
    showTab();

    $('.nav-tabs a').click(function (e) {
        e.preventDefault();
        
        $(this).tab('show');
        var scrollmem = $('body').scrollTop();
        window.location.hash = this.hash;
        $('html,body').scrollTop(scrollmem);
        
        window.socket.emit('getdata', function (err, data) {
            $('*[data-template]:visible').each(function() {    // find any elements with data-template attribute
                $(this).html(Mustache.render(window.TemplateCache[$(this).data('template')], data));
            });
            
            if($('a[href^="#collapse"]:visible').length > 0) {
                $('div[id^="collapse"').each(function() {
                    $(this).html(Mustache.render(window.TemplateCache['history_panel'], window.History[$(this).data('checkindex')]));
                });
            }
        });
    });
  
    $('.panel-collapse:first').addClass('in');

    window.onpopstate = function(evt) {
        showTab();
    }
});