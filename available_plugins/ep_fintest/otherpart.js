test = require("ep_fintest/static/js/test.js");
console.log("FOOO:", test.foo);

exports.somehook = function (hook_name, args, cb) {
  return cb(["otherpart:somehook was here"]);
}

exports.morehook = function (hook_name, args, cb) {
  return cb(["otherpart:morehook was here"]);
}

exports.expressServer = function (hook_name, args, cb) {
  args.app.get('/otherpart', function(req, res) { 
      res.send("<em>Abra cadabra</em>");
  });
}

exports.eejsBlock_editbarMenuLeft = function (hook_name, args, cb) {
  args.content = args.content + '\
		    <li id="testButton" onClick="window.pad&amp;&amp;pad.editbarClick(\'clearauthorship\');return false;">\
			<a class="buttonicon buttonicon-test" title="Test test test"></a>\
		    </li>\
  ';
  return cb();
}
