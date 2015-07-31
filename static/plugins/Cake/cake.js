var cake = {
	init: function() {
		//load config
		var today = moment();
		$.getJSON("/static/plugins/Cake/config.json", function(config) {
			var numDevs = config.cupcakes.length;
			for (var i = 0; i < numDevs; i++) {
				var bday = moment(config.cupcakes[i].date, "MM-DD");

				if (today.isSame(bday, "day")) {
					$('head').append('<link id="cake_css" type="text/css" rel="stylesheet" media="screen" href="/static/styles/bday.css">');
					var $cakeDiv = $('#cakediv');

					$cakeDiv.append('<p class="bdayFont">Happy Birthday</p>');
					$cakeDiv.append('<img src="/static/plugins/Cake/img/' + config.cupcakes[i].image + '">');
					$cakeDiv.append('<p class="bdayFont">' + config.cupcakes[i].name + '</p>');
				}
			}
		});
	}
}
$.ready(cake.init()); //Run automatically.