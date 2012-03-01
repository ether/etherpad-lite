exports.foo = 42;

exports.bar = function (hook_name, args, cb) {
 return cb(["FOOOO"]);
}