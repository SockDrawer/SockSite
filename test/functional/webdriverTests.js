var webdriverio = require('webdriverio');
var server = require('../../server.js')
var siteURL = 'http://localhost:8888'; 

var chai        = require('chai'),
    assert      = chai.assert;

var webdriveroptions = { 
    desiredCapabilities: { 
        browserName: 'firefox' 
    }, 
    port: 4444
}; 

describe('Socksite', function(){ 
    //this.timeout(99999999); 
    var browser = {}; 

    before('init browser session', function(done){
        browser = webdriverio.remote(webdriveroptions); 
        browser.init(done); 
    }); 

    it('should be running', function() {
		browser 
            .url(siteURL)
			 .title(function(err, title) {
				assert.equal(undefined, err);
                assert.strictEqual(title,'Is it just me or server cooties?');
			  })
	});

    after('end browser session', function(done){ 
        browser.endAll(done); 
    }); 
});
