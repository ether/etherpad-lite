/**
 * This is a worker that should be run using child_process.fork (see installer-master.js for reference)
 * Stdin and stdout are connected to an rpc server exposing the methods of installer.js
 */
var RPC = require('rpc-stream')
  , npm = require('npm')

npm.load({}, function (er) {
  if(er) throw er
})
console.log = function() {process.stderr.write(Array.prototype.slice(arguments).join('')+'\n')}

var server = RPC({
  search: function(args, cb) {
    npm.commands.search.apply(npm, Array.prototype.concat(args, [cb]))
  }
, install: function(args, cb) {
    npm.commands.install.apply(npm, Array.prototype.concat(args, [cb]))
  }
, uninstall: function(args, cb) {
    npm.commands.uninstall.apply(npm, Array.prototype.concat(args, [cb]))
  }
})
process.stdin.pipe(server).pipe(process.stdout)