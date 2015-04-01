/*jslint indent: 4 */
/* eslint-disable no-console */
'use strict';
$(function(){
    $('.btn').on('click', function(evt) {
        evt.preventDefault();

        $('div').each(function(){

            var spinTime = Math.floor((Math.random() * 4000) + 1000);

            $(this).css({
                '-webkit-animation-name': 'spin',
                '-webkit-animation-duration': spinTime + 'ms',
                '-webkit-animation-iteration-count': 'infinite',
                '-webkit-animation-timing-function': 'linear',
                '-moz-animation-name': 'spin',
                '-moz-animation-duration': spinTime + 'ms',
                '-moz-animation-iteration-count': 'infinite',
                '-moz-animation-timing-function': 'linear',
                '-ms-animation-name': 'spin',
                '-ms-animation-duration': spinTime + 'ms',
                '-ms-animation-iteration-count': 'infinite',
                '-ms-animation-timing-function': 'linear'
            });
        });
    });
});
