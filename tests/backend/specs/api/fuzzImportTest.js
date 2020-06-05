/*
 * Fuzz testing the import endpoint
 */
/*
const fs = require('fs');
const settings = require(__dirname+'/../../../../tests/container/loadSettings.js').loadSettings();
const host = "http://" + settings.ip + ":" + settings.port;
const path = require('path');
const async = require(__dirname+'/../../../../src/node_modules/async');
const request = require(__dirname+'/../../../../src/node_modules/request');
const froth = require(__dirname+'/../../../../src/node_modules/mocha-froth');

var filePath = path.join(__dirname, '../../../../APIKEY.txt');
var apiKey = fs.readFileSync(filePath,  {encoding: 'utf-8'});
apiKey = apiKey.replace(/\n$/, "");
var apiVersion = 1;
var testPadId = "TEST_fuzz" + makeid();

var endPoint = function(point, version){
  version = version || apiVersion;
  return '/api/'+version+'/'+point+'?apikey='+apiKey;
}

//console.log("Testing against padID", testPadId);
//console.log("To watch the test live visit " + host + "/p/" + testPadId);
//console.log("Tests will start in 5 seconds, click the URL now!");

setTimeout(function(){
  for (let i=1; i<5; i++) { // 5000 runs
    setTimeout( function timer(){
      runTest(i);
    }, i*100 ); // 100 ms
  }
  process.exit(0);
},5000); // wait 5 seconds

function runTest(number){
  request(host + endPoint('createPad') + '&padID=' + testPadId, function(err, res, body){
    var req = request.post(host + '/p/'+testPadId+'/import', function (err, res, body) {
      if (err) {
        throw new Error("FAILURE", err);
      }else{
        console.log("Success");
      }
    });

    var fN = '/tmp/fuzztest.txt';
    var cT = 'text/plain';

    if (number % 2 == 0) {
      fN = froth().toString();
      cT = froth().toString();
    }

    let form = req.form();

    form.append('file', froth().toString(), {
      filename: fN,
      contentType: cT
    });
console.log("here");
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
*/
