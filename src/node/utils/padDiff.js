exports.createDiff = function(padID, startRev, endRev, callback){
console.warn("WTF");

  //check if rev is a number
  if(startRev !== undefined && typeof startRev != "number")
  {
    //try to parse the number
    if(!isNaN(parseInt(startRev)))
    {
      startRev = parseInt(startRev, 10);
    }
    else
    {
      callback({stop: "startRev is not a number"});
      return;
    }
  }
 
  //check if rev is a number
  if(endRev !== undefined && typeof endRev != "number")
  {
    //try to parse the number
    if(!isNaN(parseInt(endRev)))
    {
      endRev = parseInt(endRev, 10);
    }
    else
    {
      callback({stop: "endRev is not a number"});
      return;
    }
  }
 
  //get the pad
  getPadSafe(padID, true, function(err, pad)
  {
    if(err){
      return callback(err);
    }
 
    try {
      var padDiff = new PadDiff(pad, startRev, endRev);
    } catch(e) {
      return callback({stop:e.message});
    }
 
    var html, authors;
 
    async.series([
      function(callback){
        padDiff.getHtml(function(err, _html){
          if(err){
            return callback(err);
          }
 
          html = _html;
          callback();
        });
      },
      function(callback){
        padDiff.getAuthors(function(err, _authors){
          if(err){
            return callback(err);
          }
 
          authors = _authors;
          callback();
        });
      }
    ], function(err){
      callback(err, {html: html, authors: authors})
    });
  });
}
