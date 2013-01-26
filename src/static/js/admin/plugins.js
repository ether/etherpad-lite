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
  socket = io.connect(url, {resource : resource}).of("/pluginfw/installer");

  $('.search-results').data('query', {
    pattern: '',
    offset: 0,
    limit: 12,
  });

  var doUpdate = false;

  var search = function () {
    socket.emit("search", $('.search-results').data('query'));
    tasks++;
  }

  function updateHandlers() {
    $("form").submit(function(){
      var query = $('.search-results').data('query');
      query.pattern = $("#search-query").val();
      query.offset = 0;
      search();
      return false;
    });
    
    $("#search-query").unbind('keyup').keyup(function () {
      var query = $('.search-results').data('query');
      query.pattern = $("#search-query").val();
      query.offset = 0;
      search();
    });

    $(".do-install, .do-update").unbind('click').click(function (e) {
      var row = $(e.target).closest("tr");
      doUpdate = true;
      socket.emit("install", row.find(".name").text());
      tasks++;
    });

    $(".do-uninstall").unbind('click').click(function (e) {
      var row = $(e.target).closest("tr");
      doUpdate = true;
      socket.emit("uninstall", row.find(".name").text());
      tasks++;
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

  var tasks = 0;
  socket.on('progress', function (data) {
    $("#progress").show();
    $('#progress').data('progress', data.progress);

    var message = "Unknown status";
    if (data.message) {
      message = data.message.toString();
    }
    if (data.error) {
      data.progress = 1;
    }
    
    $("#progress .message").html(message);

    if (data.progress >= 1) {
      tasks--;
      if (tasks <= 0) {
        // Hide the activity indicator once all tasks are done
        $("#progress").hide();
        tasks = 0;
      }
      
      if (data.error) {
        alert('An error occurred: '+data.error+' -- the server log might know more...');
      }else {
        if (doUpdate) {
          doUpdate = false;
          socket.emit("load");
          tasks++;
        }
      }
    }
  });

  socket.on('search-result', function (data) {
    var widget=$(".search-results");

    widget.data('query', data.query);
    widget.data('total', data.total);

    widget.find('.offset').html(data.query.offset);
    if (data.query.offset + data.query.limit > data.total){
      widget.find('.limit').html(data.total);
    }else{
      widget.find('.limit').html(data.query.offset + data.query.limit);
    }
    widget.find('.total').html(data.total);

    widget.find(".results *").remove();
    for (plugin_name in data.results) {
      var plugin = data.results[plugin_name];
      var row = widget.find(".template tr").clone();
      
      for (attr in plugin) {
        if(attr == "name"){ // Hack to rewrite URLS into name
          row.find(".name").html("<a target='_blank' href='https://npmjs.org/package/"+plugin['name']+"'>"+plugin[attr]+"</a>");
        }else{
          row.find("." + attr).html(plugin[attr]);
        }
      }
      row.find(".version").html( data.results[plugin_name]['dist-tags'].latest );
      
      widget.find(".results").append(row);
    }

    updateHandlers();
  });

  socket.on('installed-results', function (data) {
    $("#installed-plugins *").remove();

    for (plugin_name in data.results) {
      if (plugin_name == "ep_etherpad-lite") continue; // Hack...
      var plugin = data.results[plugin_name];
      var row = $("#installed-plugin-template").clone();

      for (attr in plugin.package) {
        if(attr == "name"){ // Hack to rewrite URLS into name
          row.find(".name").html("<a target='_blank' href='https://npmjs.org/package/"+plugin.package['name']+"'>"+plugin.package[attr]+"</a>");
        }else{
          row.find("." + attr).html(plugin.package[attr]);
        }
      }
      $("#installed-plugins").append(row);
    }
    updateHandlers();

    socket.emit('checkUpdates');
    tasks++;
  });
  
  socket.on('updatable', function(data) {
    $('#installed-plugins>tr').each(function(i,tr) {
      var pluginName = $(tr).find('.name').text()
      
      if (data.updatable.indexOf(pluginName) >= 0) {
        var actions = $(tr).find('.actions')
        actions.append('<input class="do-update" type="button" value="Update" />')
        actions.css('width', 200)
      }
    })
    updateHandlers();
  })

  socket.emit("load");
  tasks++;
  
  search();
});
