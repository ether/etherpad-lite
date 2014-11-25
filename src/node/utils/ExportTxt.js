/**
 * TXT export
 */

/*
 * 2013 John McLear
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
var getPadPlainText = require('./ExportHelper').getPadPlainText;
var _analyzeLine = require('./ExportHelper')._analyzeLine;

// This is slightly different than the HTML method as it passes the output to getTXTFromAText
function getPadTXT(pad, revNum, callback)
{
  var atext = pad.atext;
  var html;
  async.waterfall([
  // fetch revision atext


  function (callback)
  {
    if (revNum != undefined)
    {
      pad.getInternalRevisionAText(revNum, function (err, revisionAtext)
      {
        if(ERR(err, callback)) return;
        atext = revisionAtext;
        callback();
      });
    }
    else
    {
      callback(null);
    }
  },

  // convert atext to html


  function (callback)
  {
    html = getTXTFromAtext(pad, atext); // only this line is different to the HTML function
    callback(null);
  }],
  // run final callback


  function (err)
  {
    if(ERR(err, callback)) return;
    callback(null, html);
  });
}

exports.getPadTXT = getPadTXT;


// This is different than the functionality provided in ExportHtml as it provides formatting
// functionality that is designed specifically for TXT exports
function getTXTFromAtext(pad, atext, authorColors)
{
  var apool = pad.apool();
  var textLines = atext.text.slice(0, -1).split('\n');
  var attribLines = Changeset.splitAttributionLines(atext.attribs, atext.text);

  var tags = ['h1', 'h2', 'strong', 'em', 'u', 's'];
  var props = ['heading1', 'heading2', 'bold', 'italic', 'underline', 'strikethrough'];
  var anumMap = {};
  var css = "";

  props.forEach(function (propName, i)
  {
    var propTrueNum = apool.putAttrib([propName, true], true);
    if (propTrueNum >= 0)
    {
      anumMap[propTrueNum] = i;
    }
  });

  function getLineTXT(text, attribs)
  {
    var propVals = [false, false, false];
    var ENTER = 1;
    var STAY = 2;
    var LEAVE = 0;

    // Use order of tags (b/i/u) as order of nesting, for simplicity
    // and decent nesting.  For example,
    // <b>Just bold<b> <b><i>Bold and italics</i></b> <i>Just italics</i>
    // becomes
    // <b>Just bold <i>Bold and italics</i></b> <i>Just italics</i>
    var taker = Changeset.stringIterator(text);
    var assem = Changeset.stringAssembler();
    var openTags = [];

    var idx = 0;

    function processNextChars(numChars)
    {
      if (numChars <= 0)
      {
        return;
      }

      var iter = Changeset.opIterator(Changeset.subattribution(attribs, idx, idx + numChars));
      idx += numChars;

      while (iter.hasNext())
      {
        var o = iter.next();
        var propChanged = false;
        Changeset.eachAttribNumber(o.attribs, function (a)
        {
          if (a in anumMap)
          {
            var i = anumMap[a]; // i = 0 => bold, etc.
            if (!propVals[i])
            {
              propVals[i] = ENTER;
              propChanged = true;
            }
            else
            {
              propVals[i] = STAY;
            }
          }
        });
        for (var i = 0; i < propVals.length; i++)
        {
          if (propVals[i] === true)
          {
            propVals[i] = LEAVE;
            propChanged = true;
          }
          else if (propVals[i] === STAY)
          {
            propVals[i] = true; // set it back
          }
        }
        // now each member of propVal is in {false,LEAVE,ENTER,true}
        // according to what happens at start of span
        if (propChanged)
        {
          // leaving bold (e.g.) also leaves italics, etc.
          var left = false;
          for (var i = 0; i < propVals.length; i++)
          {
            var v = propVals[i];
            if (!left)
            {
              if (v === LEAVE)
              {
                left = true;
              }
            }
            else
            {
              if (v === true)
              {
                propVals[i] = STAY; // tag will be closed and re-opened
              }
            }
          }

          var tags2close = [];

          for (var i = propVals.length - 1; i >= 0; i--)
          {
            if (propVals[i] === LEAVE)
            {
              //emitCloseTag(i);
              tags2close.push(i);
              propVals[i] = false;
            }
            else if (propVals[i] === STAY)
            {
              //emitCloseTag(i);
              tags2close.push(i);
            }
          }
          
          for (var i = 0; i < propVals.length; i++)
          {
            if (propVals[i] === ENTER || propVals[i] === STAY)
            {
              propVals[i] = true;
            }
          }
          // propVals is now all {true,false} again
        } // end if (propChanged)

        var chars = o.chars;
        if (o.lines)
        {
          chars--; // exclude newline at end of line, if present
        }
        
        var s = taker.take(chars);

        // removes the characters with the code 12. Don't know where they come 
        // from but they break the abiword parser and are completly useless
        // s = s.replace(String.fromCharCode(12), "");

        // remove * from s, it's just not needed on a blank line..  This stops
        // plugins from being able to display * at the beginning of a line
        // s = s.replace("*", ""); // Then remove it

        assem.append(s);
      } // end iteration over spans in line
      
      var tags2close = [];
      for (var i = propVals.length - 1; i >= 0; i--)
      {
        if (propVals[i])
        {
          tags2close.push(i);
          propVals[i] = false;
        }
      }
      
    } // end processNextChars
    processNextChars(text.length - idx);
    return(assem.toString());
  } // end getLineHTML
  var pieces = [css];

  // Need to deal with constraints imposed on HTML lists; can
  // only gain one level of nesting at once, can't change type
  // mid-list, etc.
  // People might use weird indenting, e.g. skip a level,
  // so we want to do something reasonable there.  We also
  // want to deal gracefully with blank lines.
  // => keeps track of the parents level of indentation
  var lists = []; // e.g. [[1,'bullet'], [3,'bullet'], ...]
  for (var i = 0; i < textLines.length; i++)
  {
    var line = _analyzeLine(textLines[i], attribLines[i], apool);
    var lineContent = getLineTXT(line.text, line.aline);
    if(line.listTypeName == "bullet"){
      lineContent = "* " + lineContent; // add a bullet
    }
    if(line.listLevel > 0){
      for (var j = line.listLevel - 1; j >= 0; j--){
        pieces.push('\t');
      }
      if(line.listTypeName == "number"){
        pieces.push(line.listLevel + ". ");
        // This is bad because it doesn't truly reflect what the user
        // sees because browsers do magic on nested <ol><li>s
      }
      pieces.push(lineContent, '\n');
    }else{
      pieces.push(lineContent, '\n');
    }
  }

  return pieces.join('');
}
exports.getTXTFromAtext = getTXTFromAtext;

exports.getPadTXTDocument = function (padId, revNum, noDocType, callback)
{
  padManager.getPad(padId, function (err, pad)
  {
    if(ERR(err, callback)) return;

    getPadTXT(pad, revNum, function (err, html)
    {
      if(ERR(err, callback)) return;
      callback(null, html);
    });
  });
};
