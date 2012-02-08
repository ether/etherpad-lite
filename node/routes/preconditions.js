module.exports = function(app)
{
    //redirects browser to the pad's sanitized url if needed. otherwise, renders the html
  app.param('pad', function (req, res, next, padId) {
    //ensure the padname is valid and the url doesn't end with a /
    if(!app.padManager.isValidPadId(padId) || /\/$/.test(req.url))
    {
      res.send('Such a padname is forbidden', 404);
    }
    else
    {
      app.padManager.sanitizePadId(padId, function(sanitizedPadId) {
        //the pad id was sanitized, so we redirect to the sanitized version
        if(sanitizedPadId != padId)
        {
          var real_path = req.path.replace(/^\/p\/[^\/]+/, '/p/' + sanitizedPadId);
          res.header('Location', real_path);
          res.send('You should be redirected to <a href="' + real_path + '">' + real_path + '</a>', 302);
        }
        //the pad id was fine, so just render it
        else
        {
          next();
        }
      });
    }
  });
};
