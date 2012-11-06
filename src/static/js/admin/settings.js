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

    /* Check to make sure the JSON is clean before proceeding */
    if(isJSONClean(settings.results))
    {
      $('.settings').append(settings.results);
      $('.settings').focus();
      $('.settings').autosize();  
    }
    else{
      alert("YOUR JSON IS BAD AND YOU SHOULD FEEL BAD");
    }    
  });

  /* When the admin clicks save Settings check the JSON then send the JSON back to the server */
  $('#saveSettings').on('click', function(){
    var editedSettings = $('.settings').val();
    if(isJSONClean(editedSettings)){
      // JSON is clean so emit it to the server
      socket.emit("saveSettings", $('.settings').val());
    }else{
      alert("YOUR JSON IS BAD AND YOU SHOULD FEEL BAD")
      $('.settings').focus();
    }
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


function isJSONClean(data){
  var cleanSettings = JSON.minify(data);
  try{
    var response = jQuery.parseJSON(cleanSettings);
  }
  catch(e){
    return false; // the JSON failed to be parsed
  }
  if(typeof response !== 'object'){
    return false;
  }else{
    return true;
  }
}

