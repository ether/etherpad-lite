var log4js = require('log4js');
var apiLogger = log4js.getLogger("API");
var clientLogger = log4js.getLogger("client");
var formidable = require('formidable');
var apiHandler = require('../../handler/APIHandler');

//This is for making an api call, collecting all post information and passing it to the apiHandler
var apiCaller = function(req, res, fields) {
  res.header("Content-Type", "application/json; charset=utf-8");

  apiLogger.info("REQUEST, v"+ req.params.version + ":" + req.params.func + ", " + JSON.stringify(fields));

  //wrap the send function so we can log the response
  //note: res._send seems to be already in use, so better use a "unique" name
  res._____send = res.send;
  res.send = function (response) {
    response = JSON.stringify(response);
    apiLogger.info("RESPONSE, " + req.params.func + ", " + response);

    //is this a jsonp call, if yes, add the function call
    if(req.query.jsonp)
      response = req.query.jsonp + "(" + response + ")";

    res._____send(response);
  }

  //call the api handler
  apiHandler.handle(req.params.version, req.params.func, fields, req, res);
}

exports.apiCaller = apiCaller;

exports.expressCreateServer = function (hook_name, args, cb) {
  //This is a api GET call, collect all post informations and pass it to the apiHandler
  args.app.get('/api/:version/:func', function (req, res) {
    apiCaller(req, res, req.query)
  });

  //This is a api POST call, collect all post informations and pass it to the apiHandler
  args.app.post('/api/:version/:func', function(req, res) {
    new formidable.IncomingForm().parse(req, function (err, fields, files) {
      apiCaller(req, res, fields)
    });
  });

  //The Etherpad client side sends information about how a disconnect happened
  args.app.post('/ep/pad/connection-diagnostic-info', function(req, res) {
    new formidable.IncomingForm().parse(req, function(err, fields, files) { 
      clientLogger.info("DIAGNOSTIC-INFO: " + fields.diagnosticInfo);
      res.end("OK");
    });
  });

  //The Etherpad client side sends information about client side javscript errors
  args.app.post('/jserror', function(req, res) {
    new formidable.IncomingForm().parse(req, function(err, fields, files) { 
      try {
        var data = JSON.parse(fields.errorInfo)
      }catch(e){
        return res.end()
      }
      clientLogger.warn(data.msg+' --', data);
      res.end("OK");
    });
  });
  
  //Provide a possibility to query the latest available API version
  args.app.get('/api', function (req, res) {
     res.json({"currentVersion" : apiHandler.latestApiVersion});
  });
}
