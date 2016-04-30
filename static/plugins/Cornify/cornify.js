/*jslint indent: 4 */
/* eslint-disable no-console */
'use strict';

document.cookie = 'cornify=0;expires=' + new Date().toUTCString();

function cornify(evt) {
    evt.preventDefault();
    cornify_add();
}

$(function () {
    var blocks = $('div.quote p');
    var block = blocks[Math.floor(Math.random() * blocks.length)];
    $(block).on('click', cornify);
    $('#cornifybutton').on('click', cornify);
});