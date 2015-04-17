$(function() {
     $.get('/templates/discodefinition.html', {}, function(template) {
        $.get('/quote', {}, function(data) {
            $('#status').append(Mustache.render(template, data));
        }, 'json');
    }, 'html');
})