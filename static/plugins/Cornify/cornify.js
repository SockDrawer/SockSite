//<link type="text/css" rel="stylesheet" media="screen" href="/static/styles/clownvomit.css">

/*jslint indent: 4 */
/* eslint-disable no-console */
'use strict';

document.cookie = 'cornify=0;expires=' + new Date().toUTCString();

$(function () {
    $('#cornifybutton').on('click', function (evt) {
        evt.preventDefault();
        cornify_add();
    });
});