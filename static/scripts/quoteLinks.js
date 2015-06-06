$(function() {
    $('.quote img').each(function() {
        if($(this).parent('a').length == 0) {
            $(this).wrap('<a></a>');
            $(this).parent('a').attr('href', $(this).attr('src'));
        }
        $(this).parent('a').data('featherlight', 'image');
        $(this).parent('a').featherlight();
    });
    
    $('.quote a').each(function() {
       $(this).prop('target', '_blank'); 
    });
});