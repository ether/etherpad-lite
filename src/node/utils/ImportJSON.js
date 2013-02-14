var log4js = require('log4js');
var Changeset = require("ep_etherpad-lite/static/js/Changeset");

function keepText(builder, text, from, to) {
  var chars = to - from;
  var keepText = text.substring(from, to);
  var keepLines = keepText.split("\n").length - 1;
  builder.keep(chars, keepLines);
}

function keepTextWithAttributes(builder, text, from, to, attributes, apool) {
  var keepText = text.substring(from, to);
  
  var linePos = 0;
  var length = keepText.length;
  while (linePos < length) {
    var lineEnd = keepText.indexOf('\n', linePos) + 1;
    var lines;
    if (lineEnd != 0) {
      lines = 1;
    } else {
      lines = 0;
      lineEnd = length;
    }
    var chars = lineEnd - linePos;

    builder.keep(chars, lines, attributes, apool);

    linePos += chars;
  }
}

function setPadJSON(pad, json, callback) {
  var apiLogger = log4js.getLogger("ImportHtml");

  // Set the text
  pad.setText(json.atext.text);

  // Set the apoll
  var nextNum = Math.max.apply(null, Object.keys(json.apool));
  pad.apool().fromJsonable({numToAttrib:json.apool, nextNum:nextNum});
  
  var padText = pad.text();
  var padTextLength = padText.length;

  // split the text into lines
  json.atext.attributes.forEach(function(att) {

    // use a builder
    var builder = Changeset.builder(padTextLength);

    var from = parseInt(att.from);
    var to = parseInt(att.to);

    // Keep everything before "from"
    if (from > 0) {
      keepText(builder, padText, 0, from);
    }

    // Keep but add the attribute
    keepTextWithAttributes(builder, padText, from, to, "*" + att.id, pad.apool());

    // Keep everything after "to"
    if (to < padTextLength) {
      keepText(builder, padText, to, padTextLength);
    }

    // apply the revision
    pad.appendRevision(builder.toString());
  })

}

exports.setPadJSON = setPadJSON;
