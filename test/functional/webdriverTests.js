process.env.SOCKDEV = true;

var webdriver = require('selenium-webdriver');
var SeleniumServer = require('selenium-webdriver/remote').SeleniumServer;
var socksite = require('../../server.js');
var cache = require('../../cache');
var selenium = require('selenium-standalone');
var siteURL = 'http://localhost:8888';
var testData = require('./testData');

var chai        = require('chai'),
    assert      = chai.assert;

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

	it('should report the correct flavor text when Good', function(done) {
		cache.summary = testData.goodData;
		
		driver.get("localhost:8888").then(function() {
			driver.findElement(webdriver.By.id("flavorText")).getText().then(function(value) {
				assert.equal( value,testData.goodData.flavor, "Flavor text should be output");
				done();
			})
		});
	});
	
	it('should report the correct flavor text when Bad', function(done) {
		cache.summary = testData.badData;
		
		driver.get("localhost:8888").then(function() {
			driver.findElement(webdriver.By.id("flavorText")).getText().then(function(value) {
				assert.equal( value,testData.badData.flavor, "Flavor text should be output");
				done();
			})
		});
	});
	
	it('should report the correct status text when Good', function(done) {
		cache.summary = testData.goodData;
		
		driver.get("localhost:8888").then(function() {
			driver.findElement(webdriver.By.id("statusText")).getText().then(function(value) {
				assert.equal( value,testData.goodData.status, "Status text should be output");
				done();
			})
		});
	});
	
	it('should report the correct status text when Bad', function(done) {
		cache.summary = testData.badData;
		
		driver.get("localhost:8888").then(function() {
			driver.findElement(webdriver.By.id("statusText")).getText().then(function(value) {
				assert.equal( value,testData.badData.status, "Status text should be output");
				done();
			})
		});
	});
	
	describe('TRWTF', function() {
		it('is You when status is "Great"', function(done) {
			cache.summary = testData.greatData;
			
			driver.get("localhost:8888").then(function() {
				driver.findElement(webdriver.By.css("#header-image-wrapper img")).getAttribute("src").then(function(value) {
					assert.match( value,/isyou\.png/, "Image should say 'Is you'");
					done();
				})
			});
		});
	
		it('is You when status is "Good"', function(done) {
			cache.summary = testData.goodData;
			
			driver.get("localhost:8888").then(function() {
				driver.findElement(webdriver.By.css("#header-image-wrapper img")).getAttribute("src").then(function(value) {
					assert.match( value,/isyou\.png/, "Image should say 'Is you'");
					done();
				})
			});
		});
		
		it('is Discourse when status is "OK"', function(done) {
			cache.summary = testData.okData;
			
			driver.get("localhost:8888").then(function() {
				driver.findElement(webdriver.By.css("#header-image-wrapper img")).getAttribute("src").then(function(value) {
					assert.match( value,/isdiscourse\.png/, "Image should say 'Is discourse'");
					done();
				})
			});
		});
		
		it('is Discourse when status is "Bad"', function(done) {
			cache.summary = testData.badData;
			
			driver.get("localhost:8888").then(function() {
				driver.findElement(webdriver.By.css("#header-image-wrapper img")).getAttribute("src").then(function(value) {
					assert.match( value,/isdiscourse\.png/, "Image should say 'Is discourse'");
					done();
				})
			});
		});
		
		it('is Discourse when status is "Offline"', function(done) {
			cache.summary = testData.offlineData;
			
			driver.get("localhost:8888").then(function() {
				driver.findElement(webdriver.By.css("#header-image-wrapper img")).getAttribute("src").then(function(value) {
					assert.match( value,/isdiscourse\.png/, "Image should say 'Is discourse'");
					done();
				})
			});
		});
	})

    after('end browser session', function(done){ 
        driver.close().then(done);
    }); 
});
