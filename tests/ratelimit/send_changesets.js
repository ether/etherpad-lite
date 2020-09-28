try{
  var etherpad = require("../../src/node_modules/etherpad-cli-client");
  //ugly
} catch {
  var etherpad = require("etherpad-cli-client")
}
var pad = etherpad.connect(process.argv[2]);
pad.on("connected", function(){

  setTimeout(function(){
    setInterval(function(){
      pad.append("1");
    }, process.argv[3]);
  },500); // wait because CLIENT_READY message is included in ratelimit

  setTimeout(function(){
    process.exit(0);
  },11000)
});
// in case of disconnect exit code 1
pad.on("message", function(message){
  if(message.disconnect == 'rateLimited'){
    process.exit(1);
  }
})
