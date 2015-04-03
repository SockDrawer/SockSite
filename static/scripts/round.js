/*jslint indent: 4 */
/* eslint-disable no-console */
'use strict';
$(function(){
	$('.dropdown-toggle').dropdown();
	
	var roundCSS = {
		"border-radius":"100px",
		"border":"1px solid black"
	}
	
    $('#roundingbutton').on('click', function(evt) {
        evt.preventDefault();
		
		$("code.responseTime").each(function() {
			var time = $(this).text().slice(0,-3);
			time = Math.round(time);
			if (time >= 1000) {
				time = Math.floor(time / 1000) + "k";
			}
			$(this).text(time);
		});

        $('img').each(function(){
            $(this).css(roundCSS);
        });
		
		$('.btn').each(function(){
			$(this).css(roundCSS);
        });
		
		$('code').each(function(){
            $(this).css(roundCSS);
        });
    });
});
