exports.somehook = function (hook_name, args, cb) {
  return cb(["partlast:somehook was here"]);
}
