process.env.SOCKDEV = true;

var webdriver = require('selenium-webdriver');
var SeleniumServer = require('selenium-webdriver/remote').SeleniumServer;
var socksite = require('../../server.js');
var cache = require('../../cache');
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

var badData = {
	up: false,
	score: 25,
	code: "BAD",
	status: "This is a bad status",
	flavor: "Flavor is muy mal!",
	readonly: false,
	global_notice: "",
	global_notice_text: "",
	summary: [
		{
			name: "overall",
			response: "BAD",
			responseCode: 504,
			responseScore: 25,
			responseTime: 15,
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
	
		socksite.log = function() {} //no-op log function == quiet mode
		socksite.start(8888, 'localhost', function() {
			selenium.start(function(err, child) {
			  if (err) throw err;
			  
			  driver = new webdriver.Builder().
					usingServer('http://localhost:4444/wd/hub').
					withCapabilities(webdriver.Capabilities.firefox()).
					build();
				driver.get("localhost:8888").then(done);
			});
		});
		
    }); 

    it('should be running', function(done) {
		driver.getTitle().then(function(title) {
			assert.strictEqual(title,'Is it just me or server cooties?',"Should have the right title");
			done();
		 });
	});
	
	it('should report good status with the Is You image', function(done) {
		cache.summary = goodData;
		
		driver.get("localhost:8888").then(function() {
			driver.findElement(webdriver.By.css("#header-image-wrapper img")).getAttribute("src").then(function(value) {
				assert.match( value,/isyou\.png/, "Image should say 'Is you'");
				done();
			})
		});
		
	});
	
	it('should report the correct flavor text', function(done) {
		cache.summary = goodData;
		
		driver.get("localhost:8888").then(function() {
			driver.findElement(webdriver.By.id("flavorText")).getText().then(function(value) {
				assert.equal( value,goodData.flavor, "Flavor text should be output");
				done();
			})
		});
		
	});
	
	it('should report the correct status text', function(done) {
		cache.summary = goodData;
		
		driver.get("localhost:8888").then(function() {
			driver.findElement(webdriver.By.id("statusText")).getText().then(function(value) {
				assert.equal( value,goodData.status, "Status text should be output");
				done();
			})
		});
	});
	
	it('should report bad status with the Is Discourse image', function(done) {
		cache.summary = badData;
		
		driver.get("localhost:8888").then(function() {
			driver.findElement(webdriver.By.css("#header-image-wrapper img")).getAttribute("src").then(function(value) {
				assert.match( value,/isdiscourse\.png/, "Image should say 'Is discourse'");
				done();
			})
		});
		
	});

    after('end browser session', function(done){ 
        driver.close().then(done);
    }); 
});
