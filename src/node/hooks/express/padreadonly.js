var async = require('async');
var ERR = require("async-stacktrace");
var readOnlyManager = require("../../db/ReadOnlyManager");
var hasPadAccess = require("../../padaccess");
var exporthtml = require("../../utils/ExportHtml");

exports.expressCreateServer = function (hook_name, args, cb) {
  //serve read only pad
  args.app.get('/ro/:id', function(req, res)
  { 
    var html;
    var padId;
    var pad;

    async.series([
      //translate the read only pad to a padId
      function(callback)
      {
	readOnlyManager.getPadId(req.params.id, function(err, _padId)
	{
	  if(ERR(err, callback)) return;

	  padId = _padId;

	  //we need that to tell hasPadAcess about the pad  
	  req.params.pad = padId; 

	  callback();
	});
      },
      //render the html document
      function(callback)
      {
	//return if the there is no padId
	if(padId == null)
	{
	  callback("notfound");
	  return;
	}

	hasPadAccess(req, res, function()
	{
	  //render the html document
	  exporthtml.getPadHTMLDocument(padId, null, false, function(err, _html)
	  {
	    if(ERR(err, callback)) return;
	    html = _html;
	    callback();
	  });
	});
      }
    ], function(err)
    {
      //throw any unexpected error
      if(err && err != "notfound")
	ERR(err);

      if(err == "notfound")
	res.send(404, '404 - Not Found');
      else
	res.send(html);
    });
  });

}