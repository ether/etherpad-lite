var log4js = require('log4js');
var clientLogger = log4js.getLogger("client");
var formidable = require('formidable');
var apiHandler = require('../../handler/APIHandler');

exports.expressCreateServer = function (hook_name, args, cb) {
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
