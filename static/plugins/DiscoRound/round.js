/*jslint indent: 4 */
/* eslint-disable no-console */
'use strict';
$(function(){
	$('.dropdown-toggle').dropdown();
	
	var roundCSS = {
		"border-radius":"100px",
		"border":"1px solid black"
	}
	
	var rounded = false;
	
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
			if (rounded) {
				$(this).text($(this).data("orig_value"));
			} else {
				var time = $(this).text();
				$(this).data("orig_value", time);
				$(this).text(roundMs(time));
			}
			
		});
		
		$("td.historyDate code").each(function() {
			if (rounded) {
				$(this).text($(this).data("orig_value"));
			} else {
				var timestamp = $(this).text();
				$(this).data("orig_value", timestamp);
				$(this).text(moment(timestamp).fromNow());
			}
		});
		
		$("td.historyTime code").each(function() {
			if (rounded) {
				$(this).text($(this).data("orig_value"));
			} else {
				var time = $(this).text();
				$(this).data("orig_value", time);
				$(this).text(roundMs(time));
			}
		});
		
		$("td.historyCode code").each(function() {
			if (rounded) {
				$(this).text($(this).data("orig_value"));
			} else {
				var code = $(this).text();
				$(this).data("orig_value", code);
				code = "." + code/100 + "k";
				$(this).text(code);
			}
		});
		
		if (rounded) {
			$('img').removeAttr("style");
			$('#flavorText').removeAttr("style");
			$('.btn').removeAttr("style");
			$('code').removeAttr("style");
			$('div.panel-heading').removeAttr("style");
		} else {
			$('img').css(roundCSS);
			$('#flavorText').css(roundCSS);
			$('.btn').css(roundCSS);
			$('code').css(roundCSS);
			$('div.panel-heading').css(roundCSS);
		}
		
		rounded = !rounded;
    });
});
