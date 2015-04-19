/*jslint indent: 4 */
/* eslint-disable no-console */
'use strict';
$(function(){
	$('.dropdown-toggle').dropdown();
	
	var roundCSS = {
		"border-radius":"100px",
		"border":"1px solid black"
	}
	
	function roundMs(time) {
		time = time.slice(0, -3);
		time = Math.round(time);
		if (time >= 1000) {
			time = Math.floor(time / 1000) + "k";
		}
		return time;
	}
	
    $('#roundingbutton').on('click', function(evt) {
        evt.preventDefault();
		
		$("code.responseTime").each(function() {
			var time = $(this).text();			
			$(this).text(roundMs(time));
		});
		
		$("td.historyDate code").each(function() {
			var timestamp = $(this).text();
			$(this).text(moment(timestamp).fromNow());
		});
		
		$("td.historyTime code").each(function() {
			var time = $(this).text();			
			$(this).text(roundMs(time));
		});
		
		$("td.historyCode code").each(function() {
			var code = $(this).text();
			code = "." + code/100 + "k";
			$(this).text(code);
		});
		

        $('img').each(function(){
            $(this).css(roundCSS);
        });
		
		$('#flavorText').css(roundCSS);
		
		$('.btn').each(function(){
			$(this).css(roundCSS);
        });
		
		$('code').each(function(){
            $(this).css(roundCSS);
        });
		
		$('div.panel-heading').each(function() {
			$(this).css(roundCSS);
		})
		
    });
});
