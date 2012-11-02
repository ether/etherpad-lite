$(document).ready(function () {
  var socket,
    loc = document.location,
    port = loc.port == "" ? (loc.protocol == "https:" ? 443 : 80) : loc.port,
    url = loc.protocol + "//" + loc.hostname + ":" + port + "/",
    pathComponents = location.pathname.split('/'),
    // Strip admin/plugins
    baseURL = pathComponents.slice(0,pathComponents.length-2).join('/') + '/',
    resource = baseURL.substring(1) + "socket.io";

  //connect
  socket = io.connect(url, {resource : resource}).of("/settings");

  $('.search-results').data('query', {
    pattern: '',
    offset: 0,
    limit: 12,
  });

  var doUpdate = false;

  var search = function () {
    socket.emit("search", $('.search-results').data('query'));
  }

  function updateHandlers() {
    $("#progress.dialog .close").unbind('click').click(function () {
      $("#progress.dialog").hide();
    });

    $("#do-search").unbind('click').click(function () {
      var query = $('.search-results').data('query');
      query.pattern = $("#search-query")[0].value;
      query.offset = 0;
      search();
    });

    $(".do-install").unbind('click').click(function (e) {
      var row = $(e.target).closest("tr");
      doUpdate = true;
      socket.emit("install", row.find(".name").html());
    });

    $(".do-uninstall").unbind('click').click(function (e) {
      var row = $(e.target).closest("tr");
      doUpdate = true;
      socket.emit("uninstall", row.find(".name").html());
    });

    $(".do-prev-page").unbind('click').click(function (e) {
      var query = $('.search-results').data('query');
      query.offset -= query.limit;
      if (query.offset < 0) {
        query.offset = 0;
      }
      search();
    });
    $(".do-next-page").unbind('click').click(function (e) {
      var query = $('.search-results').data('query');
      var total = $('.search-results').data('total');
      if (query.offset + query.limit < total) {
        query.offset += query.limit;
      }
      search();
    });
  }

  updateHandlers();
/*
  socket.on('progress', function (data) {
    if (data.progress > 0 && $('#progress.dialog').data('progress') > data.progress) return;

    $("#progress.dialog .close").hide();
    $("#progress.dialog").show();

    $('#progress.dialog').data('progress', data.progress);

    var message = "Unknown status";
    if (data.message) {
      message = "<span class='status'>" + data.message.toString() + "</span>";
    }
    if (data.error) {
      message = "<span class='error'>" + data.error.toString() + "<span>";            
    }
    $("#progress.dialog .message").html(message);
    $("#progress.dialog .history").append("<div>" + message + "</div>");

    if (data.progress >= 1) {
      if (data.error) {
        $("#progress.dialog .close").show();
      } else {
        if (doUpdate) {
          doUpdate = false;
          socket.emit("load");
        }
        $("#progress.dialog").hide();
      }
    }
  });

  socket.on('search-result', function (data) {
    var widget=$(".search-results");

    widget.data('query', data.query);
    widget.data('total', data.total);

    widget.find('.offset').html(data.query.offset);
    widget.find('.limit').html(data.query.offset + data.query.limit);
    widget.find('.total').html(data.total);

    widget.find(".results *").remove();
    for (plugin_name in data.results) {
      var plugin = data.results[plugin_name];
      var row = widget.find(".template tr").clone();

      for (attr in plugin) {
        row.find("." + attr).html(plugin[attr]);
      }
      widget.find(".results").append(row);
    }

    updateHandlers();
  });
*/

  socket.on('settings', function (data) {
    $('.settings').append(data.results);
    $('.settings').sloppyForm(); // Turn JSON into Form

/*    $("#installed-plugins *").remove();
    for (plugin_name in data.results) {
      if (plugin_name == "ep_etherpad-lite") continue; // Hack...
      var plugin = data.results[plugin_name];
      var row = $("#installed-plugin-template").clone();

      for (attr in plugin.package) {
        row.find("." + attr).html(plugin.package[attr]);
      }
      $("#installed-plugins").append(row);
    }
    updateHandlers();
*/
  });

  socket.emit("load");
  search();
});


/* A jQuery plugin to turn JSON strings into forms */
(function($){
  $.fn.sloppyForm = function() {  
    return this.each(function() {  
      // Firstly get a clean object with comments stripped out
      var settings = ($.parseJSON(JSON.minify($(this).text())));
 
      // For each create form bla bla

    });  
 };  
})(jQuery);




/* Strip crap out of JSON */
/*! JSON.minify() 
	v0.1 (c) Kyle Simpson
	MIT License
        https://github.com/getify/JSON.minify
*/

(function(global){
	if (typeof global.JSON == "undefined" || !global.JSON) {
		global.JSON = {};
	}
	
	global.JSON.minify = function(json) {
		
		var tokenizer = /"|(\/\*)|(\*\/)|(\/\/)|\n|\r/g,
			in_string = false,
			in_multiline_comment = false,
			in_singleline_comment = false,
			tmp, tmp2, new_str = [], ns = 0, from = 0, lc, rc
		;
		
		tokenizer.lastIndex = 0;
		
		while (tmp = tokenizer.exec(json)) {
			lc = RegExp.leftContext;
			rc = RegExp.rightContext;
			if (!in_multiline_comment && !in_singleline_comment) {
				tmp2 = lc.substring(from);
				if (!in_string) {
					tmp2 = tmp2.replace(/(\n|\r|\s)*/g,"");
				}
				new_str[ns++] = tmp2;
			}
			from = tokenizer.lastIndex;
			
			if (tmp[0] == "\"" && !in_multiline_comment && !in_singleline_comment) {
				tmp2 = lc.match(/(\\)*$/);
				if (!in_string || !tmp2 || (tmp2[0].length % 2) == 0) {	// start of string with ", or unescaped " character found to end string
					in_string = !in_string;
				}
				from--; // include " character in next catch
				rc = json.substring(from);
			}
			else if (tmp[0] == "/*" && !in_string && !in_multiline_comment && !in_singleline_comment) {
				in_multiline_comment = true;
			}
			else if (tmp[0] == "*/" && !in_string && in_multiline_comment && !in_singleline_comment) {
				in_multiline_comment = false;
			}
			else if (tmp[0] == "//" && !in_string && !in_multiline_comment && !in_singleline_comment) {
				in_singleline_comment = true;
			}
			else if ((tmp[0] == "\n" || tmp[0] == "\r") && !in_string && !in_multiline_comment && in_singleline_comment) {
				in_singleline_comment = false;
			}
			else if (!in_multiline_comment && !in_singleline_comment && !(/\n|\r|\s/.test(tmp[0]))) {
				new_str[ns++] = tmp[0];
			}
		}
		new_str[ns++] = rc;
		return new_str.join("");
	};
})(this);
