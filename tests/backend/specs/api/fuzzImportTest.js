/*
 * Fuzz testing the import endpoint
 */
const fs = require('fs');
const settings = require(__dirname+'/../../loadSettings').loadSettings();
const host = 'http://127.0.0.1:'+settings.port;
const path = require('path');
const async = require(__dirname+'/../../../../src/node_modules/async');
const request = require('request');
var filePath = path.join(__dirname, '../../../../APIKEY.txt');
var apiKey = fs.readFileSync(filePath,  {encoding: 'utf-8'});
apiKey = apiKey.replace(/\n$/, "");
var apiVersion = 1;
var testPadId = "TEST_fuzz";
var froth = require('mocha-froth')

var endPoint = function(point, version){
  version = version || apiVersion;
  return '/api/'+version+'/'+point+'?apikey='+apiKey;
}

var i = 0; // lazy syntax but who cares

console.log("Testing against padID", testPadId);

for (let i=1; i<100000; i++) {
    setTimeout( function timer(){
      runTest();
    }, i*100 );
}

function runTest(){
  request(host + endPoint('createPad') + '&padID=' + testPadId, function(err, res, body){
    var req = request.post(host + '/p/'+testPadId+'/import', function (err, res, body) {
      if (err) {
        // xconsole.error("Failure", err);
        throw new Error("FAILURE", err);
      }else{
        console.log("Success");
      }
    });

    let form = req.form();
    form.append('file', froth().toString(), {
      filename: '/test.txt',
      contentType: 'text/plain'
    });

  });
}

function makeid()
{
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for( var i=0; i < 5; i++ ){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}


