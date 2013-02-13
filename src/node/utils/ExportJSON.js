var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var ERR = require("async-stacktrace");

function getJSONAttributes(attribs) {
  var pos = 0;
  var iter = Changeset.opIterator(attribs);
  var attr = [];
  while (iter.hasNext()) {
    var op = iter.next();
    Changeset.eachAttribNumber(op.attribs, function (a){
      attr.push({id: a, from:pos, to: pos + op.chars});
    });
    pos += op.chars;
  }
  return attr;
}

function getPadJSON(pad, rev, callback) {

  //check parameters
  if(!pad || !pad.id || !pad.atext || !pad.pool) {
    throw new Error('Invalid pad');
  }

  if (!rev) {
    rev = pad.getHeadRevisionNumber();
  } else {
    rev = parseInt(rev, 10);
    if(rev < 0 || rev > pad.getHeadRevisionNumber()) {
      throw new Error('Invalid start revision ' + fromRev);
    }
  }

  pad.getInternalRevisionAText(rev, function (err, atext) {
    if(ERR(err, callback)) return;
    attributes = getJSONAttributes(atext.attribs);
    callback(null, {apool: pad.apool().numToAttrib, atext: { attributes: attributes, text: atext.text}});
  });
}

exports.getPadJSON = getPadJSON;