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
    var browser = {}; 
	 this.timeout(500000);

    before('init browser session', function(done){
		
        browser = webdriverio.remote(webdriveroptions); 
        browser.init(done); 
    }); 

    it('should be running', function(done) {
		browser 
            .url(siteURL)
			 .title(function(err, res) {
				assert.equal(undefined, err);
                assert.strictEqual(res.value,'Is it just me or server cooties?');
				done();
			  })
	});

    after('end browser session', function(done){ 
        browser.endAll(done); 
    }); 
});
