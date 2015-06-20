/*jslint indent: 4 */
/* eslint-disable no-console */
'use strict';
$(function (){
    function addSpin(_, e) {
        var spinTime = Math.floor((Math.random() * 4000) + 1000);
        $(e).css({
            '-webkit-animation-duration': spinTime + 'ms',
            '-moz-animation-duration': spinTime + 'ms',
            '-ms-animation-duration': spinTime + 'ms'
        }).addClass('spinning');
    }

    $(document).bind('DOMNodeInserted', function (e) {
        if ($(e.target).is('div') && $('.spinning').length > 0) {
            addSpin(0, e.target);
        }
    });

    $('#spin-button').on('click', function(evt) {
        evt.preventDefault();

        if($(this).closest('div').hasClass('spinning')) {
            $('.spinning').removeClass('spinning');
        } else {
            $('div').each(addSpin);
        }
    });
});
