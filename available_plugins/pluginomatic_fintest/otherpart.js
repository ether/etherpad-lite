test = ep_client_require("/plugins/pluginomatic_fintest/test.js");
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
