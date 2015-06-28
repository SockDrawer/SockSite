var assert = chai.assert;

describe('DiscoRound', function() {
	
	beforeEach('init fixture', function(){
		$('body').append("<div id='testFixture'></div>");
	});
	
	afterEach('teardown fixture', function(){
		$('#testFixture').remove();
	});
	
	it('should greet people', function() {
		assert.ok("Helllo World");
	});
	
	describe('temporal rounding', function() {
		it('should round 0 to 0', function() {
			assert.equal(0,discoRound.roundMs("0 ms"));
		});
		
		it('should round 1000 to 1k', function() {
			assert.equal("1k",discoRound.roundMs("1000 ms"));
		});
		
		it('should round 1001 to 1k', function() {
			assert.equal("1k",discoRound.roundMs("1001 ms"));
		});
		
		it('should round 1999 to 1k', function() {
			assert.equal("1k",discoRound.roundMs("1999 ms"));
		});
		
		it('should round 2000 to 2k', function() {
			assert.equal("2k",discoRound.roundMs("2000 ms"));
		});
		
		it('should round 10000 to 10k', function() {
			assert.equal("10k",discoRound.roundMs("10000 ms"));
		});
		
		it('should round 100000 to 100k', function() {
			assert.equal("100k",discoRound.roundMs("100000 ms"));
		});
		
		it('should round Response Times', function() {
			$('#testFixture').append('<code id="responseCode" class="responseTime">1000 ms</code>');
			
			discoRound.rounded = false;
			discoRound.doRound();
			
			assert.equal($('#responseCode').text(),"1k");
		});
		
		it('should round History Times', function() {
			$('#testFixture').append('<td class="historyTime"><code id="historyCode">1000 ms</code></td>');
			
			discoRound.rounded = false;
			discoRound.doRound();
			
			assert.equal($('#historyCode').text(),"1k");
		});
		
		it('should round History Codes', function() {
			$('#testFixture').append('<td class="historyCode"><code id="historyCode">500</code></td>');
			
			discoRound.rounded = false;
			discoRound.doRound();
			
			assert.equal($('#historyCode').text(),".5k");
		});
	});
	
	describe('spatial rounding', function() {
		
		var checkBorder = function(element) {
			assert.equal(element.css("border-radius"),"100px");
			
			assert.equal(element.css("borderLeftWidth"),"1px");
			assert.equal(element.css("borderRightWidth"),"1px");
			assert.equal(element.css("borderTopWidth"),"1px");
			assert.equal(element.css("borderBottomWidth"),"1px");
			
			assert.equal(element.css("border-left-style"),"solid");
			assert.equal(element.css("border-right-style"),"solid");
			assert.equal(element.css("border-top-style"),"solid");
			assert.equal(element.css("border-bottom-style"),"solid");
		};
		
		it('should round images', function() {
			$('#testFixture').append('<img id="testimg" src="https://www.samhober.com/howtofoldpocketsquares/Flat1.jpg">');
			assert.equal($('#testimg').css("border-radius"),"0px");
			assert.equal($('#testimg').css("border"),"0px none rgb(0, 0, 0)");
			
			discoRound.rounded = false;
			discoRound.doRound();
			
			checkBorder($('#testimg'));
		});
		
		it('should round flavor text', function() {
			$('#testFixture').append('<div id="flavorText">Flavor text</div>');
			assert.equal($('#flavorText').css("border-radius"),"0px");
			
			discoRound.rounded = false;
			discoRound.doRound();
			
			checkBorder($('#flavorText'));
		});
		
		it('should round buttons', function() {
			$('#testFixture').append('<div id="testButton" class="btn">Button</div>');
			assert.equal($('#testButton').css("border-radius"),"0px");
			
			discoRound.rounded = false;
			discoRound.doRound();
			
			checkBorder($('#testButton'));
		});
		
		it('should round code', function() {
			$('#testFixture').append('<code id="testCode">Code</div>');
			assert.equal($('#testCode').css("border-radius"),"0px");
			
			discoRound.rounded = false;
			discoRound.doRound();
			
			checkBorder($('#testCode'));
		});
		
		it('should round panel headings', function() {
			$('#testFixture').append('<div id="testHeading" class="panel-heading">Heading</div>');
			assert.equal($('#testHeading').css("border-radius"),"0px");
			
			discoRound.rounded = false;
			discoRound.doRound();
			
			checkBorder($('#testHeading'));
		});
	});
});