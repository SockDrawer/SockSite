//<link type="text/css" rel="stylesheet" media="screen" href="/static/styles/clownvomit.css">

/*jslint indent: 4 */
/* eslint-disable no-console */
'use strict';
$(function(){
	var normalImage = "/static/images/trwtf.png";
	var clownImage = "/static/images/trwtf_clown.png";
	
    $('#vomitbutton').on('click', function(evt) {
        evt.preventDefault();
		
		if ($("#clownvomit_css").length ) {
			$("#clownvomit_css").remove();
			$("#trwtfimg").attr("src", normalImage);
		} else {
			 $('head').append('<link id="clownvomit_css" type="text/css" rel="stylesheet" media="screen" href="/static/plugins/Clownify/clownvomit.css">');
			 $("#trwtfimg").attr("src", clownImage);
		}
	})
});
