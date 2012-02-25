var log4js = require('log4js');
var apiLogger = log4js.getLogger("API");
var apiHandler = require('./handler/APIHandler');
var formidable = require('formidable');

//This is for making an api call, collecting all post information and passing it to the apiHandler
exports.apiCaller = function(req, res, fields) {
  res.header("Content-Type", "application/json; charset=utf-8");

  apiLogger.info("REQUEST, " + req.params.func + ", " + JSON.stringify(fields));

  //wrap the send function so we can log the response
  res._send = res.send;
  res.send = function (response) {
    response = JSON.stringify(response);
    apiLogger.info("RESPONSE, " + req.params.func + ", " + response);

    //is this a jsonp call, if yes, add the function call
    if(req.query.jsonp)
      response = req.query.jsonp + "(" + response + ")";

    res._send(response);
  }

  //call the api handler
  apiHandler.handle(req.params.func, fields, req, res);
}


exports.expressCreateServer = function (hook_name, args, cb) {
  //This is a api GET call, collect all post informations and pass it to the apiHandler
  args.app.get('/api/1/:func', function (req, res) {
    apiCaller(req, res, req.query)
  });

  //This is a api POST call, collect all post informations and pass it to the apiHandler
  args.app.post('/api/1/:func', function(req, res) {
    new formidable.IncomingForm().parse(req, function (err, fields, files) {
      apiCaller(req, res, fields)
    });
  });

  //The Etherpad client side sends information about how a disconnect happen
  args.app.post('/ep/pad/connection-diagnostic-info', function(req, res) {
    new formidable.IncomingForm().parse(req, function(err, fields, files) { 
      console.log("DIAGNOSTIC-INFO: " + fields.diagnosticInfo);
      res.end("OK");
    });
  });

  //The Etherpad client side sends information about client side javscript errors
  args.app.post('/jserror', function(req, res) {
    new formidable.IncomingForm().parse(req, function(err, fields, files) { 
      console.error("CLIENT SIDE JAVASCRIPT ERROR: " + fields.errorInfo);
      res.end("OK");
    });
  });
}