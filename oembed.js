'use strict';
var EMBED_WIDTH = 600;
var EMBED_HEIGHT = 300;

var fs = require('fs'),
    path = require('path'),
    mustache = require('mustache'),
   url = require('url');
var cache = require('./cache'),
    quotes = require('./quotes'),
    database = require('./database');

exports.getEmbedCode = function getEmbedCode(uri, request, response) {
	var params = url.parse(request.url, true).query;
	if (!params.url) {
		respond("", 400, response);
		return;
	}
	
	//Check for format issues
	if (params.format && params.format !== "json") {
		respond("Not implemented. Please use JSON", 501, response);
		return;
	}
	
	//For now, respond to any url request the same way
	var embedCode = {};
	
	//As per the spec at http://oembed.com/
	
	/* type (required)
		The resource type. Valid values, along with value-specific parameters, are described below. */
	embedCode.type = "rich";
	
	/*version (required)
		The oEmbed version number. This must be 1.0.*/
	embedCode.version = 1.0;
	
	/*author_name (optional)
		The name of the author/owner of the resource. */
	embedCode.author_name = "Sock Drawer";
	
	/*author_url (optional)
		A URL for the author/owner of the resource.*/
		embedCode.author_url = "https://github.com/SockDrawer";

	/*html (required)
		The HTML required to display the resource. The HTML should have no padding or margins. Consumers may wish to load the HTML in an off-domain iframe to avoid XSS vulnerabilities. The markup should be valid XHTML 1.0 Basic. */
	cache.summary.host = request.headers.host;
	var data = cache.summary;
	data.height = EMBED_HEIGHT;
	data.width = EMBED_WIDTH;
	embedCode.html = mustache.render(cache.templates['embedTemplate'], data, cache.templates);
	
	/*width (required)
		The width in pixels required to display the HTML.*/
	embedCode.width = EMBED_WIDTH;
	
	/*height (required)
		The height in pixels required to display the HTML.*/
	embedCode.height = EMBED_HEIGHT;
	
    respond(JSON.stringify(embedCode), 200, response);
};

function respond(data, code, response) {
    response.writeHead(code);
    response.write(data, 'utf8');
    response.end();
}
