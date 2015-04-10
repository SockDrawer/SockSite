/*jslint indent: 4 */
/* eslint-disable no-console */
'use strict';
$(function(){
    $('#spin-button').on('click', function(evt) {
        evt.preventDefault();

        if($(this).closest('div').hasClass('spinning')) {
            $('.spinning').removeClass('spinning');
        } else {
            $('div').each(function(){
    
                var spinTime = Math.floor((Math.random() * 4000) + 1000);
    
                $(this).css({
                    '-webkit-animation-duration': spinTime + 'ms',
                    '-moz-animation-duration': spinTime + 'ms',
                    '-ms-animation-duration': spinTime + 'ms',
                }).addClass('spinning');
            });
        }
    });
});
