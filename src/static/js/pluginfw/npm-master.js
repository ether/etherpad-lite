/**
 * This module exposes the same methods as installer.js, but runs them in a separate child process
 */
var child_process = require('child_process')
  , rpc = require('rpc-stream')

var worker = child_process.fork(__dirname+'/npm-worker', {silent:true})

var client = rpc()

worker.stdout.pipe(client).pipe(worker.stdin)

worker.stderr.pipe(process.stdout)

module.exports = {
  commands: client.wrap(['install', 'uninstall', 'search'])
, load: function(opts, cb) {cb()}
, on: function(){}
}