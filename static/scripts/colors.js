//<link type="text/css" rel="stylesheet" media="screen" href="/static/styles/clownvomit.css">

/*jslint indent: 4 */
/* eslint-disable no-console */
'use strict';
$(function(){
    $('#vomitbutton').on('click', function(evt) {
        evt.preventDefault();
		
		if ($("#clownvomit_css").length ) {
			$("#clownvomit_css").remove();
		} else {
			 $('head').append('<link id="clownvomit_css" type="text/css" rel="stylesheet" media="screen" href="/static/styles/clownvomit.css">');
		}
	})
});
