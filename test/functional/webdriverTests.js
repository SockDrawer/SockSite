var webdriver = require('selenium-webdriver');
var SeleniumServer = require('selenium-webdriver/remote').SeleniumServer;
var socksite = require('../../server.js');
var selenium = require('selenium-standalone');
var siteURL = 'http://localhost:8888'; 

var chai        = require('chai'),
    assert      = chai.assert;


/*Test data*/
 var goodData = {
	up: true,
	score: 100,
	code: "GREAT",
	status: "This is a good status",
	flavor: "Flavor is delicious!",
	readonly: false,
	global_notice: "",
	global_notice_text: "",
	summary: [
		{
			name: "overall",
			response: "GREAT",
			responseCode: 200,
			responseScore: 100,
			responseTime: 0.11,
			polledAt: "Sat, 20 Jun 2015 21:37:36 GMT",
			checkIndex: -1
		}
	]
};

describe('Socksite', function(){ 
    var browser = {}; 
	 this.timeout(40000);
	 var driver;

    before('init browser session', function(done){
		
		process.env.SOCKDEV = true;
		
		selenium.install({
			  // check for more recent versions of selenium here:
			  // http://selenium-release.storage.googleapis.com/index.html
			  version: '2.45.0',
			  baseURL: 'http://selenium-release.storage.googleapis.com',
			  drivers: {
				chrome: {
				  // check for more recent versions of chrome driver here:
				  // http://chromedriver.storage.googleapis.com/index.html
				  version: '2.15',
				  arch: process.arch,
				  baseURL: 'http://chromedriver.storage.googleapis.com'
				},
				ie: {
					version: '2.45.0',
					arch: process.arch,
					baseURL: 'http://selenium-release.storage.googleapis.com'
				}
			  }
			}, function() {
				socksite.start(8888, 'localhost', function() {
					selenium.start(function(err, child) {
					  if (err) throw err;
					  
					  driver = new webdriver.Builder().
							usingServer('http://localhost:4444/wd/hub').
							withCapabilities(webdriver.Capabilities.firefox()).
							build();
						driver.get("localhost:8888").then(function() {
								console.log("Done with startuip");
								done();		
							});
					});
				})
			});
		
    }); 

    it('should be running', function(done) {
		driver.getTitle().then(function(title) {
			assert.strictEqual(title,'Is it just me or server cooties?',"Should have the right title");
			done();
		 });
	});
	
	it('should report good status', function(done) {
		done();
	});

    after('end browser session', function(){ 
        driver.close();
    }); 
});
