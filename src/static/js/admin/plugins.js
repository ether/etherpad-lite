$(document).ready(function () {
  var socket = io.connect().of("/pluginfw/installer");

  var doUpdate = false;

  function updateHandlers() {
    $("#progress.dialog .close").unbind('click').click(function () {
      $("#progress.dialog").hide();
    });

    $("#do-search").unbind('click').click(function () {
        socket.emit("search", {
          pattern: $("#search-query")[0].value,
          offset: $('#search-results').data('offset') || 0,
          limit: 4});
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
  }

  updateHandlers();

  socket.on('progress', function (data) {
    if ($('#progress.dialog').data('progress') > data.progress) return;

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

  socket.on('installed-results', function (data) {
    $("#installed-plugins *").remove();
    for (plugin_name in data.results) {
      var plugin = data.results[plugin_name];
      var row = $("#installed-plugin-template").clone();

      for (attr in plugin.package) {
        row.find("." + attr).html(plugin.package[attr]);
      }
      $("#installed-plugins").append(row);
    }
    updateHandlers();
  });

  socket.emit("load");

});
