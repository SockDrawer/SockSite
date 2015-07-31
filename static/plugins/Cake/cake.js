var cake = {
	config: null,
	init: function() {
		//load config
		
		$.getJSON("/static/plugins/Cake/config.json", function(config) {
			cake.config = config;
			cake.checkCake();
			setInterval(function(){ alert("Hello"); }, 3600000);
		});
	},
	checkCake: function() {
		var today = moment();
		var numDevs = cake.config.cupcakes.length;
		var $cakeDiv = $('#cakediv');

		var found = false;
		for (var i = 0; i < numDevs; i++) {
			var bday = moment(cake.config.cupcakes[i].date, "MM-DD");

			if (today.isSame(bday, "day")) {
				found = true;
				var name = cake.config.cupcakes[i].name;
				var img = cake.config.cupcakes[i].image;
				$('head').append('<link id="cake_css" type="text/css" rel="stylesheet" media="screen" href="/static/plugins/Cake/bday.css">');
				
				if ($cakeDiv.children().length == 0) {
					$cakeDiv.append('<p class="bdayFont">Happy Birthday</p>');
					$cakeDiv.append('<img src="/static/plugins/Cake/img/' + img + '">');
					$cakeDiv.append('<p class="bdayFont">' + name + '</p>');

					window.Notify("Psst...", "Hey, @" + name +", there's a problem with the site...", '/static/plugins/Cake/img/cupcake_icon.png');
				}				
			}
		}

		if (!found && $cakeDiv.children().length > 0) {
			$cakeDiv.html("");
		}
	}
}
$.ready(cake.init()); //Run automatically.