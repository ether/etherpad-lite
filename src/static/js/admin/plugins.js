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

  function search(searchTerm) {
    if(search.searchTerm != searchTerm) {
      search.offset = 0
      search.results = []
      search.end = false
    }
    search.searchTerm = searchTerm;
    socket.emit("search", {searchTerm: searchTerm, offset:search.offset, length: search.limit});
    search.offset += search.limit;
  }
  search.offset = 0
  search.limit = 12
  search.results = []
  search.end = true// have we received all results already?

  function displayPluginList(plugins, container, template) {
    plugins.forEach(function(plugin) {
      var row = template.clone();
      
      for (attr in plugin) {
        if(attr == "name"){ // Hack to rewrite URLS into name
          row.find(".name").html("<a target='_blank' href='https://npmjs.org/package/"+plugin['name']+"'>"+plugin['name']+"</a>");
        }else{
          row.find("." + attr).html(plugin[attr]);
        }
      }
      row.find(".version").html( plugin.version );
      
      container.append(row);
    })
    updateHandlers();
  }

  function updateHandlers() {
    // Search
    $("#search-query").unbind('keyup').keyup(function () {
      search($("#search-query").val());
    });

    // update & install
    $(".do-install, .do-update").unbind('click').click(function (e) {
      var row = $(e.target).closest("tr");
      socket.emit("install", row.find(".name").text());
    });

    // uninstall
    $(".do-uninstall").unbind('click').click(function (e) {
      var row = $(e.target).closest("tr");
      socket.emit("uninstall", row.find(".name").text());
    });

    // Infinite scroll
    $(window).unbind('scroll').scroll(function() {
      if(search.end) return;// don't keep requesting if there are no more results
      var top = $('.search-results .results > tr').last().offset().top
      if($(window).scrollTop()+$(window).height() > top) search(search.searchTerm)
    })
  }

  socket.on('results:search', function (data) {
    console.log('got search results', data)
    search.results = search.results.concat(data.results);
    if(!data.results.length) search.end = true;
    
    var searchWidget = $(".search-results");
    searchWidget.find(".results *").remove();
    displayPluginList(search.results, searchWidget.find(".results"), searchWidget.find(".template tr"))
  });

  socket.on('results:installed', function (data) {
    $("#installed-plugins *").remove();
    displayPluginList(data.installed, $("#installed-plugins"), $("#installed-plugin-template"))

    setTimeout(function() {
      socket.emit('checkUpdates');
    }, 5000)
  });
  
  socket.on('results:updatable', function(data) {
    $('#installed-plugins > tr').each(function(i, tr) {
      var pluginName = $(tr).find('.name').text()
      
      if (data.updatable.indexOf(pluginName) >= 0) {
        var actions = $(tr).find('.actions')
        actions.append('<input class="do-update" type="button" value="Update" />')
        actions.css('width', 200)
      }
    })
    updateHandlers();
  })

  // init
  updateHandlers();
  socket.emit("getInstalled");
  search('');
});
