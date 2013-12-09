/**
 * Helpers for export requests
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var async = require("async");
var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var padManager = require("../db/PadManager");
var ERR = require("async-stacktrace");
var Security = require('ep_etherpad-lite/static/js/security');
var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');

exports.getPadPlainText = function(pad, revNum){
  var atext = ((revNum !== undefined) ? pad.getInternalRevisionAText(revNum) : pad.atext());
  var textLines = atext.text.slice(0, -1).split('\n');
  var attribLines = Changeset.splitAttributionLines(atext.attribs, atext.text);
  var apool = pad.pool();

  var pieces = [];
  for (var i = 0; i < textLines.length; i++){
    var line = _analyzeLine(textLines[i], attribLines[i], apool);
    if (line.listLevel){
      var numSpaces = line.listLevel * 2 - 1;
      var bullet = '*';
      pieces.push(new Array(numSpaces + 1).join(' '), bullet, ' ', line.text, '\n');
    }
    else{
      pieces.push(line.text, '\n');
    }
  }

  return pieces.join('');
};


exports._analyzeLine = function(text, aline, apool){
  var line = {};

  // identify list
  var lineMarker = 0;
  line.listLevel = 0;
  if (aline){
    var opIter = Changeset.opIterator(aline);
    if (opIter.hasNext()){
      var listType = Changeset.opAttributeValue(opIter.next(), 'list', apool);
      if (listType){
        lineMarker = 1;
        listType = /([a-z]+)([12345678])/.exec(listType);
        if (listType){
          line.listTypeName = listType[1];
          line.listLevel = Number(listType[2]);
        }
      }
    }
  }
  if (lineMarker){
    line.text = text.substring(1);
    line.aline = Changeset.subattribution(aline, 1);
  }
  else{
    line.text = text;
    line.aline = aline;
  }
  return line;
};


exports._encodeWhitespace = function(s){
  return s.replace(/[^\x21-\x7E\s\t\n\r]/g, function(c){
    return "&#" +c.charCodeAt(0) + ";";
  });
};
