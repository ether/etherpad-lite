var formidable = require('formidable');

module.exports = function(app)
{
  //The Etherpad client side sends information about how a disconnect happen
  app.post('/ep/pad/connection-diagnostic-info', function(req, res)
  {
    new formidable.IncomingForm().parse(req, function(err, fields, files)
    {
      console.log("DIAGNOSTIC-INFO: " + fields.diagnosticInfo);
      res.end("OK");
    });
  });

  //The Etherpad client side sends information about client side javscript errors
  app.post('/jserror', function(req, res)
  {
    new formidable.IncomingForm().parse(req, function(err, fields, files)
    {
      console.error("CLIENT SIDE JAVASCRIPT ERROR: " + fields.errorInfo);
      res.end("OK");
    });
  });

};
