var padManager = require('../../db/PadManager');
var url = require('url');

exports.expressCreateServer = function (hook_name, args, cb) {

  // redirects browser to the pad's sanitized url if needed. otherwise, renders the html
  args.app.param('pad', async function (req, res, next, padId) {
    // ensure the padname is valid and the url doesn't end with a /
    if (!padManager.isValidPadId(padId) || /\/$/.test(req.url)) {
      res.status(404).send('Such a padname is forbidden');
      return;
    }

    let sanitizedPadId = await padManager.sanitizePadId(padId);

    if (sanitizedPadId === padId) {
      // the pad id was fine, so just render it
      next();
    } else {
      // the pad id was sanitized, so we redirect to the sanitized version
      var real_url = sanitizedPadId;
      real_url = encodeURIComponent(real_url);
      var query = url.parse(req.url).query;
      if ( query ) real_url += '?' + query;
      res.header('Location', real_url);
      res.status(302).send('You should be redirected to <a href="' + real_url + '">' + real_url + '</a>');
    }
  });
}
