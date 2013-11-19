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

  socket.on('settings', function (settings) {

    // (removed JSON validation, cause it's not JSON!)
    $('.settings').append(settings.results);
    $('.settings').focus();
    $('.settings').autosize();   
  });

  /* When the admin clicks save Settings check the JSON then send the JSON back to the server */
  $('#saveSettings').on('click', function(){
    var editedSettings = $('.settings').val();
    // (removed JSON validation, cause it's not JSON!)
    // emit it to the server
    socket.emit("saveSettings", $('.settings').val());
  });

  /* Tell Etherpad Server to restart */
  $('#restartEtherpad').on('click', function(){
    socket.emit("restartServer");
  });

  socket.on('saveprogress', function(progress){
    $('#response').show();
    $('#response').text(progress);
    $('#response').fadeOut('slow');
  });

  socket.emit("load"); // Load the JSON from the server

});
