'use strict';

exports.eejsBlock_styles = function (hook_name, args, cb) {
  args.content = args.content + "<link href='../static/plugins/ep_replace/static/css/fontello.css' rel='stylesheet'>";
  return cb();
}