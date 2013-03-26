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

  function search(searchTerm, limit) {
    if(search.searchTerm != searchTerm) {
      search.offset = 0
      search.results = []
      search.end = false
    }
    limit = limit? limit : search.limit
    search.searchTerm = searchTerm;
    socket.emit("search", {searchTerm: searchTerm, offset:search.offset, limit: limit, sortBy: search.sortBy, sortDir: search.sortDir});
    search.offset += limit;
    $('#search-progress').show()
  }
  search.offset = 0;
  search.limit = 12;
  search.results = [];
  search.sortBy = 'name';
  search.sortDir = /*DESC?*/true;
  search.end = true;// have we received all results already?

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
  
  function sortPluginList(plugins, property, /*ASC?*/dir) {
    return plugins.sort(function(a, b) {
      if (a[property] < b[property])
         return dir? -1 : 1;
      if (a[property] > b[property])
         return dir? 1 : -1;
      // a must be equal to b
      return 0;
    })
  }

  var progress = {
    show: function(msg) {
      $('#progress').show()
      $('#progress .message').text(msg)
      $(window).scrollTop(0)
    },
    hide: function() {
      $('#progress').hide()
      $('#progress .message').text('')
    }
  }

  function updateHandlers() {
    // Search
    $("#search-query").unbind('keyup').keyup(function () {
      search($("#search-query").val());
    });

    // update & install
    $(".do-install, .do-update").unbind('click').click(function (e) {
      var row = $(e.target).closest("tr")
        , plugin = row.find(".name").text();
      socket.emit("install", plugin);
      progress.show('Installing plugin '+plugin+'...')
    });

    // uninstall
    $(".do-uninstall").unbind('click').click(function (e) {
      var row = $(e.target).closest("tr")
        , plugin = row.find(".name").text();
      socket.emit("uninstall", plugin);
      progress.show('Uninstalling plugin '+plugin+'...')
    });

    // Infinite scroll
    $(window).unbind('scroll').scroll(function() {
      if(search.end) return;// don't keep requesting if there are no more results
      var top = $('.search-results .results > tr:last').offset().top
      if($(window).scrollTop()+$(window).height() > top) search(search.searchTerm)
    })

    // Sort
    $('.sort.up').unbind('click').click(function() {
      search.sortBy = $(this).text().toLowerCase();
      search.sortDir = false;
      search.offset = 0;
      search(search.searchTerm, search.results.length);
      search.results = [];
    })
    $('.sort.down, .sort.none').unbind('click').click(function() {
      search.sortBy = $(this).text().toLowerCase();
      search.sortDir = true;
      search.offset = 0;
      search(search.searchTerm, search.results.length);
      search.results = [];
    })
  }

  socket.on('results:search', function (data) {
    if(!data.results.length) search.end = true;
    
    console.log('got search results', data)

    // add to results
    search.results = search.results.concat(data.results);

    // Update sorting head
    $('.sort')
      .removeClass('up down')
      .addClass('none');
    $('.search-results thead th[data-label='+data.query.sortBy+']')
      .removeClass('none')
      .addClass(data.query.sortDir? 'up' : 'down');

    // re-render search results
    var searchWidget = $(".search-results");
    searchWidget.find(".results *").remove();
    displayPluginList(search.results, searchWidget.find(".results"), searchWidget.find(".template tr"))
    $('#search-progress').hide()
  });

  socket.on('results:installed', function (data) {
    sortPluginList(data.installed, 'name', /*ASC?*/true);

    data.installed = data.installed.filter(function(plugin) {
      return plugin.name != 'ep_etherpad-lite'
    })
    $("#installed-plugins *").remove();
    displayPluginList(data.installed, $("#installed-plugins"), $("#installed-plugin-template"));
    progress.hide()

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

  socket.on('finished:install', function(data) {
    if(data.error) alert('An error occured while installing the plugin. \n'+data.error)
    socket.emit("getInstalled");
  })

  socket.on('finished:uninstall', function(data) {
    if(data.error) alert('An error occured while uninstalling the plugin. \n'+data.error)
    socket.emit("getInstalled");
  })

  // init
  updateHandlers();
  socket.emit("getInstalled");
  search('');
});
