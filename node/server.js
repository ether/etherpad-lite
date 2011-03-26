// Simple Node & Socket server

var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('socket.io')
  , sys = require('sys')
  , server;

server = http.createServer(function(req, res){
  var path = url.parse(req.url).pathname;
  
  if(path.substring(0,"/static".length) == "/static" || path.substring(0,"/p/".length) == "/p/")
  {
    if(path.substring(0,"/p/".length) == "/p/")
    {
      if(path.length < 7)
        send404(res, path);
    
      path = "/static/padhtml";
    }
    
    sendFile(res, path, __dirname + "/.." + path);
  }
  else if(path == "/")
  {
    sendRedirect(res, path, "/p/test");
  }
  else if(path == "/newpad")
  {
    sendRedirect(res, path, "/p/" + randomPadName());
  }
  else if(path == "/ep/pad/reconnect")
  {
    if(req.headers.referer != null)
      sendRedirect(res, path, req.headers.referer);
    else
      send404(res, path);
  }
  else
  {
    send404(res, path);
  }
});
server.listen(80);

function randomPadName() {
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
	var string_length = 10;
	var randomstring = '';
	for (var i=0; i<string_length; i++) {
		var rnum = Math.floor(Math.random() * chars.length);
		randomstring += chars.substring(rnum,rnum+1);
	}
	return randomstring;
}

function sendFile(res, reqPath, path)
{
  fs.readFile(path, function(err, data){
    if (err){
      send404(res, reqPath);
    } else {
      var contentType = "text/html";
    
      if (path.substring(path.length -3, path.length) == ".js")
        contentType = "text/javascript";
      else if (path.substring(path.length -4, path.length) == ".css")
        contentType = "text/css";
      else if (path.substring(path.length -4, path.length) == ".gif")
        contentType = "image/gif";
    
      res.writeHead(200, {'Content-Type': contentType});
      res.write(data, 'utf8');
      res.end();
      
      requestLog(200, reqPath, "-> " + path);
    }
  });
}

function send404(res, reqPath)
{
  res.writeHead(404);
  res.write("404 - Not Found");
  res.end();
  
  requestLog(404, reqPath, "NOT FOUND!");
}

function sendRedirect(res, reqPath, location)
{
  res.writeHead(302, {'Location': location});
  res.end();
  
  requestLog(302, reqPath, "-> " + location);
}

function requestLog(code, path, desc)
{
  //console.log(code +", " + path + ", " + desc);
}

var io = io.listen(server);
var messageHandler = require("./MessageHandler");
messageHandler.setSocketIO(io);

io.on('connection', function(client){
  try{
    messageHandler.handleConnect(client);
  }catch(e){console.error(e);}
  
  client.on('message', function(message){
    //try{
      messageHandler.handleMessage(client, message);
    //}catch(e){console.error(e);}
  });

  client.on('disconnect', function(){
    try{
      messageHandler.handleDisconnect(client);
    }catch(e){console.error(e);}
  });
});




