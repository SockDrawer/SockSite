var webdriver = require('selenium-webdriver');
var SeleniumServer = require('selenium-webdriver/remote').SeleniumServer;
var socksite = require('../../server.js');
var cache = require('../../cache');
var fs = require('fs');
var selenium = require('selenium-standalone');
var siteURL = 'http://localhost:8888';
var testData = require('./testData');
var path = require('path');


describe('Taking screenshots...', function() {
    var browser = {}; 
	 this.timeout(40000);
	 var driver;
	 
	 var folder = path.resolve("test", "functional", "screenshots");

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

	

	it('when status is "Great"', function(done) {
		cache.summary = testData.greatData;
		
		driver.get("localhost:8888").then(function() {
			driver.takeScreenshot().then(function(image, err) {
				fs.writeFile(path.join(folder, 'great.png'), image, 'base64', done);
			});
		});
	});

	it('when status is "Good"', function(done) {
		cache.summary = testData.goodData;
		
		driver.get("localhost:8888").then(function() {
			driver.takeScreenshot().then(function(image, err) {
				fs.writeFile(path.join(folder, 'good.png'), image, 'base64', done);
			});
		});
	});
	
	it('when status is "OK"', function(done) {
		cache.summary = testData.okData;
		
		driver.get("localhost:8888").then(function() {
			driver.takeScreenshot().then(function(image, err) {
				fs.writeFile(path.join(folder, 'ok.png'), image, 'base64', done);
			});
		});
	});
	
	it('when status is "Bad"', function(done) {
		cache.summary = testData.badData;
		
		driver.get("localhost:8888").then(function() {
			driver.takeScreenshot().then(function(image, err) {
				fs.writeFile(path.join(folder, 'bad.png'), image, 'base64', done);
			});
		});
	});
	
	it('when status is "Offline"', function(done) {
		cache.summary = testData.offlineData;
		
		driver.get("localhost:8888").then(function() {
			driver.takeScreenshot().then(function(image, err) {
				fs.writeFile(path.join(folder, 'offline.png'), image, 'base64', done);
			});
		});
	});

    after('end browser session', function(done){ 
        driver.close().then(done);
    }); 
});