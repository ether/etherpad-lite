var async = require("async");
var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var ERR = require("async-stacktrace");

function getChangesets(pad, fromRev, callback) {
  var rev = fromRev + 1;
  var toRev = pad.getHeadRevisionNumber();

  //find out which revisions we need
  var revisions = [];
  for (var i=rev; i<toRev; i++){
    revisions.push(i);
  }

  var changesets = [];

  //get all needed revisions
  async.forEach(revisions, 

    function(rev, callback){
      pad.getRevision(rev, function(err, revision){
        if(err){
          return callback(err)
        }
        changesets.push(revision.changeset);
        callback();
      });
    },

    function(err){
      callback(err, changesets);
    }
  );
}

function getPadRaw(pad, fromRev, callback) {

  //check parameters
  if(!pad || !pad.id || !pad.atext || !pad.pool) {
    throw new Error('Invalid pad');
  }

  if (!fromRev) {
    fromRev = pad.getHeadRevisionNumber();
  } else {
    fromRev = parseInt(fromRev, 10);
    if(fromRev < 0 || fromRev > pad.getHeadRevisionNumber()) { 
      throw new Error('Invalid start revision ' + fromRev); 
    }
  }

  var atext;
  var changesets;

  async.series([
  //get all needed data out of the database
  function(callback) {
    async.parallel([

    // fetch start revision atext
    function (callback) {

      pad.getInternalRevisionAText(fromRev, function (err, revisionAText) {
        if(ERR(err, callback)) return;
        atext = revisionAText;
      });
      
      callback();
    },

    // get the changesets
    function(callback) {
      getChangesets(pad, fromRev, function(err, cs) { changesets = cs; callback(); }); 
    }

    ], callback);
  }], 

  // run final callback
  function (err) {
    if(ERR(err, callback)) return;
    if (changesets.length == 0) {
      changesets = undefined;
    }
    callback(null, {apool: pad.apool().numToAttrib, atext: { rev: fromRev, attributes: atext.attribs, text: atext.text}, changesets: changesets});
  });
}

exports.getPadRaw = getPadRaw;