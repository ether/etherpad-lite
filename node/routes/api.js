var formidable = require('formidable');
var log4js = require('log4js');

module.exports = function(app)
{
  var apiLogger = log4js.getLogger("API");

  //This is for making an api call, collecting all post information and passing it to the apiHandler
  var apiCaller = function(req, res, fields)
  {
    res.header("Content-Type", "application/json; charset=utf-8");

    apiLogger.info("REQUEST, " + req.params.func + ", " + JSON.stringify(fields));

    //wrap the send function so we can log the response
    res._send = res.send;
    res.send = function(response)
    {
      response = JSON.stringify(response);
      apiLogger.info("RESPONSE, " + req.params.func + ", " + response);

      //is this a jsonp call, if yes, add the function call
      if(req.query.jsonp)
        response = req.query.jsonp + "(" + response + ")";

      res._send(response);
    };

    //call the api handler
    app.apiHandler.handle(req.params.func, fields, req, res);
  };

  //This is a api GET call, collect all post informations and pass it to the apiHandler
  app.get('/api/1/:func', function(req, res)
  {
    apiCaller(req, res, req.query);
  });

  //This is a api POST call, collect all post informations and pass it to the apiHandler
  app.post('/api/1/:func', function(req, res)
  {
    new formidable.IncomingForm().parse(req, function(err, fields, files)
    {
      apiCaller(req, res, fields);
    });
  });

};
