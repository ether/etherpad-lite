// Entry point for etherpad running on cloudfoundry
var path = require('path')
process.chdir( path.join( process.cwd(), 'node'))

var s = require("./node/server")
