/*jslint indent: 4 */
/* eslint-disable no-console */
'use strict';

var discoRound = {
	init: function() {
		$('.dropdown-toggle').dropdown();
		
		$('#roundingbutton').on('click', function(evt) {
			evt.preventDefault();
			this.doRound();
		});
	},
	
	roundCSS: {
		"border-radius":"100px",
		"border":"1px solid black"
	},
	
	rounded: false,
	
	roundMs: function(time) {
		time = time.slice(0, -3);
		time = Math.round(time);
		if (time >= 1000) {
			time = Math.floor(time / 1000) + "k";
		}
		return time;
	},
	
	doRound: function() {
		var self = this;
		
		$("code.responseTime").each(function() {
			if (self.rounded) {
				$(this).text($(this).data("orig_value"));
			} else {
				var time = $(this).text();
				$(this).data("orig_value", time);
				$(this).text(self.roundMs(time));
			}
			
		});
		
		$("td.historyDate code").each(function() {
			if (self.rounded) {
				$(this).text($(this).data("orig_value"));
			} else {
				var timestamp = $(this).text();
				$(this).data("orig_value", timestamp);
				$(this).text(moment(timestamp).fromNow());
			}
		});
		
		$("td.historyTime code").each(function() {
			if (self.rounded) {
				$(this).text($(this).data("orig_value"));
			} else {
				var time = $(this).text();
				$(this).data("orig_value", time);
				$(this).text(self.roundMs(time));
			}
		});
		
		$("td.historyCode code").each(function() {
			if (self.rounded) {
				$(this).text($(this).data("orig_value"));
			} else {
				var code = $(this).text();
				$(this).data("orig_value", code);
				code = "." + code/100 + "k";
				$(this).text(code);
			}
		});
		
		if (self.rounded) {
			$('img').removeAttr("style");
			$('#flavorText').removeAttr("style");
			$('.btn').removeAttr("style");
			$('code').removeAttr("style");
			$('div.panel-heading').removeAttr("style");
		} else {
			$('img').css(self.roundCSS);
			$('#flavorText').css(self.roundCSS);
			$('.btn').css(self.roundCSS);
			$('code').css(self.roundCSS);
			$('div.panel-heading').css(self.roundCSS);
		}
		
		self.rounded = !self.rounded;
	}
};

$.ready(discoRound.init()); //Run automatically.