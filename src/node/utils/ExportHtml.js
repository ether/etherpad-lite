/**
 * Copyright 2009 Google Inc.
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
var _analyzeLine = require('./ExportHelper')._analyzeLine;
var _encodeWhitespace = require('./ExportHelper')._encodeWhitespace;

function getPadHTML(pad, revNum, callback)
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
    html = getHTMLFromAtext(pad, atext);
    callback(null);
  }],
  // run final callback


  function (err)
  {
    if(ERR(err, callback)) return;
    callback(null, html);
  });
}

exports.getPadHTML = getPadHTML;
exports.getHTMLFromAtext = getHTMLFromAtext;

function getHTMLFromAtext(pad, atext, authorColors)
{
  var apool = pad.apool();
  var textLines = atext.text.slice(0, -1).split('\n');
  var attribLines = Changeset.splitAttributionLines(atext.attribs, atext.text);

  var tags = ['h1', 'h2', 'strong', 'em', 'u', 's'];
  var props = ['heading1', 'heading2', 'bold', 'italic', 'underline', 'strikethrough'];

  hooks.aCallAll("exportHtmlAdditionalTags", pad, function(err, newProps){
    newProps.forEach(function (propName, i){
      tags.push(propName);
      props.push(propName);
    });
  });

  // holds a map of used styling attributes (*1, *2, etc) in the apool
  // and maps them to an index in props
  // *3:2 -> the attribute *3 means strong
  // *2:5 -> the attribute *2 means s(trikethrough)
  var anumMap = {};
  var css = "";

  var stripDotFromAuthorID = function(id){
    return id.replace(/\./g,'_');
  };

  if(authorColors){
    css+="<style>\n";

    for (var a in apool.numToAttrib) {
      var attr = apool.numToAttrib[a];

      //skip non author attributes
      if(attr[0] === "author" && attr[1] !== ""){
        //add to props array
        var propName = "author" + stripDotFromAuthorID(attr[1]);
        var newLength = props.push(propName);
        anumMap[a] = newLength -1;

        css+="." + propName + " {background-color: " + authorColors[attr[1]]+ "}\n";
      } else if(attr[0] === "removed") {
        var propName = "removed";

        var newLength = props.push(propName);
        anumMap[a] = newLength -1;

        css+=".removed {text-decoration: line-through; " + 
             "-ms-filter:'progid:DXImageTransform.Microsoft.Alpha(Opacity=80)'; "+ 
             "filter: alpha(opacity=80); "+
             "opacity: 0.8; "+
             "}\n";
      }
    }

    css+="</style>";
  }

  // iterates over all props(h1,h2,strong,...), checks if it is used in
  // this pad, and if yes puts its attrib id->props value into anumMap
  props.forEach(function (propName, i)
  {
    var propTrueNum = apool.putAttrib([propName, true], true);
    if (propTrueNum >= 0)
    {
      anumMap[propTrueNum] = i;
    }
  });

  function getLineHTML(text, attribs)
  {
    // Use order of tags (b/i/u) as order of nesting, for simplicity
    // and decent nesting.  For example,
    // <b>Just bold<b> <b><i>Bold and italics</i></b> <i>Just italics</i>
    // becomes
    // <b>Just bold <i>Bold and italics</i></b> <i>Just italics</i>
    var taker = Changeset.stringIterator(text);
    var assem = Changeset.stringAssembler();
    var openTags = [];

    function getSpanClassFor(i){
      //return if author colors are disabled
      if (!authorColors) return false;

      var property = props[i];

      if(property.substr(0,6) === "author"){
        return stripDotFromAuthorID(property);
      }

      if(property === "removed"){
        return "removed";
      }

      return false;
    }

    function emitOpenTag(i)
    {
      openTags.unshift(i);
      var spanClass = getSpanClassFor(i);

      if(spanClass){
        assem.append('<span class="');
        assem.append(spanClass);
        assem.append('">');
      } else {
        assem.append('<');
        assem.append(tags[i]);
        assem.append('>');
      }
    }

    // this closes an open tag and removes its reference from openTags
    function emitCloseTag(i)
    {
      openTags.shift();
      var spanClass = getSpanClassFor(i);

      if(spanClass){
        assem.append('</span>');
      } else {
        assem.append('</');
        assem.append(tags[i]);
        assem.append('>');
      }
    }

    var urls = _findURLs(text);

    var idx = 0;

    function processNextChars(numChars)
    {
      if (numChars <= 0)
      {
        return;
      }

      var iter = Changeset.opIterator(Changeset.subattribution(attribs, idx, idx + numChars));
      idx += numChars;

      // this iterates over every op string and decides which tags to open or to close
      // based on the attribs used
      while (iter.hasNext())
      {
        var o = iter.next();
        var usedAttribs = [];

        // mark all attribs as used
        Changeset.eachAttribNumber(o.attribs, function (a)
        {
          if (a in anumMap)
          {
            usedAttribs.push(anumMap[a]); // i = 0 => bold, etc.
          }
        });
        var outermostTag = -1;
        // find the outer most open tag that is no longer used
        for (var i = openTags.length - 1; i >= 0; i--)
        {
          if (usedAttribs.indexOf(openTags[i]) === -1)
          {
            outermostTag = i;
            break;
          }
        }

        // close all tags upto the outer most
        if (outermostTag != -1)
        {
          while ( outermostTag >= 0 )
          {
            emitCloseTag(openTags[0]);
            outermostTag--;
          }
        }

        // open all tags that are used but not open
        for (i=0; i < usedAttribs.length; i++)
        {
          if (openTags.indexOf(usedAttribs[i]) === -1)
          {
            emitOpenTag(usedAttribs[i])
          }
        }

        var chars = o.chars;
        if (o.lines)
        {
          chars--; // exclude newline at end of line, if present
        }

        var s = taker.take(chars);

        //removes the characters with the code 12. Don't know where they come 
        //from but they break the abiword parser and are completly useless
        s = s.replace(String.fromCharCode(12), "");

        assem.append(_encodeWhitespace(Security.escapeHTML(s)));
      } // end iteration over spans in line

      // close all the tags that are open after the last op
      while (openTags.length > 0)
      {
        emitCloseTag(openTags[0])
      }
    } // end processNextChars
    if (urls)
    {
      urls.forEach(function (urlData)
      {
        var startIndex = urlData[0];
        var url = urlData[1];
        var urlLength = url.length;
        processNextChars(startIndex - idx);
        assem.append('<a href="' + Security.escapeHTMLAttribute(url) + '">');
        processNextChars(urlLength);
        assem.append('</a>');
      });
    }
    processNextChars(text.length - idx);

    return _processSpaces(assem.toString());
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
  var listLevels = []
  for (var i = 0; i < textLines.length; i++)
  {
    var line = _analyzeLine(textLines[i], attribLines[i], apool);
    var lineContent = getLineHTML(line.text, line.aline);
    listLevels.push(line.listLevel)

    if (line.listLevel)//If we are inside a list
    {
      // do list stuff
      var whichList = -1; // index into lists or -1
      if (line.listLevel)
      {
        whichList = lists.length;
        for (var j = lists.length - 1; j >= 0; j--)
        {
          if (line.listLevel <= lists[j][0])
          {
            whichList = j;
          }
        }
      }

      if (whichList >= lists.length)//means we are on a deeper level of indentation than the previous line
      {
        if(lists.length > 0){
          pieces.push('</li>')
        }
        lists.push([line.listLevel, line.listTypeName]);

        // if there is a previous list we need to open x tags, where x is the difference of the levels
        // if there is no previous list we need to open x tags, where x is the wanted level
        var toOpen = lists.length > 1 ? line.listLevel - lists[lists.length - 2][0] - 1 : line.listLevel - 1

        if(line.listTypeName == "number")
        {
          if(toOpen > 0){
            pieces.push(new Array(toOpen + 1).join('<ol>'))
          }
          pieces.push('<ol class="'+line.listTypeName+'"><li>', lineContent || '<br>');
        }
        else
        {
          if(toOpen > 0){
            pieces.push(new Array(toOpen + 1).join('<ul>'))
          }
          pieces.push('<ul class="'+line.listTypeName+'"><li>', lineContent || '<br>');
        }
      }
      //the following code *seems* dead after my patch.
      //I keep it just in case I'm wrong...
      /*else if (whichList == -1)//means we are not inside a list
      {
        if (line.text)
        {
          console.log('trace 1');
          // non-blank line, end all lists
          if(line.listTypeName == "number")
          {
            pieces.push(new Array(lists.length + 1).join('</li></ol>'));
          }
          else
          {
            pieces.push(new Array(lists.length + 1).join('</li></ul>'));
          }
          lists.length = 0;
          pieces.push(lineContent, '<br>');
        }
        else
        {
          console.log('trace 2');
          pieces.push('<br><br>');
        }
      }*/
      else//means we are getting closer to the lowest level of indentation or are at the same level 
      {
        var toClose = lists.length > 0 ? listLevels[listLevels.length - 2] - line.listLevel : 0
        if( toClose > 0){
          pieces.push('</li>')
          if(lists[lists.length - 1][1] == "number")
          {
            pieces.push(new Array(toClose+1).join('</ol>'))
            pieces.push('<li>', lineContent || '<br>');
          }
          else
          {
            pieces.push(new Array(toClose+1).join('</ul>'))
            pieces.push('<li>', lineContent || '<br>');
          }
          lists = lists.slice(0,whichList+1)
        } else {
          pieces.push('</li><li>', lineContent || '<br>');
        }
      }
    }
    else//outside any list, need to close line.listLevel of lists
    {
      if(lists.length > 0){
        if(lists[lists.length - 1][1] == "number"){
          pieces.push('</li></ol>');
          pieces.push(new Array(listLevels[listLevels.length - 2]).join('</ol>'))
        } else {
          pieces.push('</li></ul>');
          pieces.push(new Array(listLevels[listLevels.length - 2]).join('</ul>'))
        }
      }
      lists = []

      var context = {
        line: line,
        lineContent: lineContent,
        apool: apool,
        attribLine: attribLines[i],
        text: textLines[i]
      }

      var lineContentFromHook = hooks.callAllStr("getLineHTMLForExport", context, " ", " ", "");

      if (lineContentFromHook)
      {
        pieces.push(lineContentFromHook, '');
      }
      else
      {
        pieces.push(lineContent, '<br>');
      }
    }
  }
  
  for (var k = lists.length - 1; k >= 0; k--)
  {
    if(lists[k][1] == "number")
    {
      pieces.push('</li></ol>');
    }
    else
    {
      pieces.push('</li></ul>');
    }
  }

  return pieces.join('');
}

exports.getPadHTMLDocument = function (padId, revNum, noDocType, callback)
{
  padManager.getPad(padId, function (err, pad)
  {
    if(ERR(err, callback)) return;

    var stylesForExportCSS = "";
    // Include some Styles into the Head for Export
    hooks.aCallAll("stylesForExport", padId, function(err, stylesForExport){
      stylesForExport.forEach(function(css){
        stylesForExportCSS += css;
      });
      // Core inclusion of head etc.
      var head = 
        (noDocType ? '' : '<!doctype html>\n') + 
        '<html lang="en">\n' + (noDocType ? '' : '<head>\n' + 
          '<title>' + Security.escapeHTML(padId) + '</title>\n' +
          '<meta charset="utf-8">\n' + 
          '<style> * { font-family: arial, sans-serif;\n' + 
            'font-size: 13px;\n' + 
            'line-height: 17px; }' + 
            'ul.indent { list-style-type: none; }' +

            'ol { list-style-type: none; padding-left:0;}' +
            'body > ol { counter-reset: first second third fourth fifth sixth seventh eigth ninth tenth eleventh twelth thirteenth fourteenth fifteenth sixteenth; }' +
            'ol > li:before {' +
            'content: counter(first) ". " ;'+
            'counter-increment: first;}' +

            'ol > ol > li:before {' +
            'content: counter(first) "." counter(second) ". " ;'+
            'counter-increment: second;}' +

            'ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) ". ";'+
            'counter-increment: third;}' +

            'ol > ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) "." counter(fourth) ". ";'+
            'counter-increment: fourth;}' +

            'ol > ol > ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) "." counter(fourth) "." counter(fifth) ". ";'+
            'counter-increment: fifth;}' +

            'ol > ol > ol > ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) "." counter(fourth) "." counter(fifth) "." counter(sixth) ". ";'+
            'counter-increment: sixth;}' +

            'ol > ol > ol > ol > ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) "." counter(fourth) "." counter(fifth) "." counter(sixth) "." counter(seventh) ". ";'+
            'counter-increment: seventh;}' +

            'ol > ol > ol > ol > ol > ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) "." counter(fourth) "." counter(fifth) "." counter(sixth) "." counter(seventh) "." counter(eigth) ". ";'+
            'counter-increment: eigth;}' +

            'ol > ol > ol > ol > ol > ol > ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) "." counter(fourth) "." counter(fifth) "." counter(sixth) "." counter(seventh) "." counter(eigth) "." counter(ninth) ". ";'+
            'counter-increment: ninth;}' +

            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) "." counter(fourth) "." counter(fifth) "." counter(sixth) "." counter(seventh) "." counter(eigth) "." counter(ninth) "." counter(tenth) ". ";'+
            'counter-increment: tenth;}' +

            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) "." counter(fourth) "." counter(fifth) "." counter(sixth) "." counter(seventh) "." counter(eigth) "." counter(ninth) "." counter(tenth) "." counter(eleventh) ". ";'+
            'counter-increment: eleventh;}' +

            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) "." counter(fourth) "." counter(fifth) "." counter(sixth) "." counter(seventh) "." counter(eigth) "." counter(ninth) "." counter(tenth) "." counter(eleventh) "." counter(twelth) ". ";'+
            'counter-increment: twelth;}' +

            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) "." counter(fourth) "." counter(fifth) "." counter(sixth) "." counter(seventh) "." counter(eigth) "." counter(ninth) "." counter(tenth) "." counter(eleventh) "." counter(twelth) "." counter(thirteenth) ". ";'+
            'counter-increment: thirteenth;}' +

            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) "." counter(fourth) "." counter(fifth) "." counter(sixth) "." counter(seventh) "." counter(eigth) "." counter(ninth) "." counter(tenth) "." counter(eleventh) "." counter(twelth) "." counter(thirteenth) "." counter(fourteenth) ". ";'+
            'counter-increment: fourteenth;}' +

            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) "." counter(fourth) "." counter(fifth) "." counter(sixth) "." counter(seventh) "."  counter(eigth) "."  counter(ninth) "."  counter(tenth) "."  counter(eleventh) "."  counter(twelth) "."  counter(thirteenth) "."  counter(fourteenth) "." counter(fifteenth) ". ";'+
            'counter-increment: fifteenth;}' +

            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > li:before {' +
            'content: counter(first) "." counter(second) "." counter(third) "." counter(fourth) "." counter(fifth) "." counter(sixth) "." counter(seventh) "."  counter(eigth) "."  counter(ninth) "."  counter(tenth) "."  counter(eleventh) "."  counter(twelth) "."  counter(thirteenth) "."  counter(fourteenth) "."  counter(fifteenth) "."  counter(sixthteenth) ". ";'+
            'counter-increment: sixthteenth;}' +

            'ol{ text-indent: 0px; }' +
            'ol > ol{ text-indent: 10px; }' +
            'ol > ol > ol{ text-indent: 20px; }' +
            'ol > ol > ol > ol{ text-indent: 30px; }' +
            'ol > ol > ol > ol > ol{ text-indent: 40px; }' +
            'ol > ol > ol > ol > ol > ol{ text-indent: 50px; }' +
            'ol > ol > ol > ol > ol > ol > ol{ text-indent: 60px; }' +
            'ol > ol > ol > ol > ol > ol > ol > ol{ text-indent: 70px; }' +
            'ol > ol > ol > ol > ol > ol > ol > ol > ol{ text-indent: 80px; }' +
            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol{ text-indent: 90px; }' +
            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol{ text-indent: 100px; }' +
            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol{ text-indent: 110px; }' +
            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol { text-indent: 120px; }' +
            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol{ text-indent: 130px; }' +
            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol{ text-indent: 140px; }' +
            'ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol > ol{ text-indent: 150px; }' +

            stylesForExportCSS + 
            '</style>\n' + '</head>\n') + 
        '<body>';
      var foot = '</body>\n</html>\n';

      getPadHTML(pad, revNum, function (err, html)
      {
        if(ERR(err, callback)) return;
        callback(null, head + html + foot);
      });
    });
  });
};

// copied from ACE
var _REGEX_WORDCHAR = /[\u0030-\u0039\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u1FFF\u3040-\u9FFF\uF900-\uFDFF\uFE70-\uFEFE\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFDC]/;
var _REGEX_SPACE = /\s/;
var _REGEX_URLCHAR = new RegExp('(' + /[-:@a-zA-Z0-9_.,~%+\/\\?=&#;()$]/.source + '|' + _REGEX_WORDCHAR.source + ')');
var _REGEX_URL = new RegExp(/(?:(?:https?|s?ftp|ftps|file|smb|afp|nfs|(x-)?man|gopher|txmt):\/\/|mailto:)/.source + _REGEX_URLCHAR.source + '*(?![:.,;])' + _REGEX_URLCHAR.source, 'g');

// returns null if no URLs, or [[startIndex1, url1], [startIndex2, url2], ...]


function _findURLs(text)
{
  _REGEX_URL.lastIndex = 0;
  var urls = null;
  var execResult;
  while ((execResult = _REGEX_URL.exec(text)))
  {
    urls = (urls || []);
    var startIndex = execResult.index;
    var url = execResult[0];
    urls.push([startIndex, url]);
  }

  return urls;
}


// copied from ACE
function _processSpaces(s){
  var doesWrap = true;
  if (s.indexOf("<") < 0 && !doesWrap){
    // short-cut
    return s.replace(/ /g, '&nbsp;');
  }
  var parts = [];
  s.replace(/<[^>]*>?| |[^ <]+/g, function (m){
    parts.push(m);
  });
  if (doesWrap){
    var endOfLine = true;
    var beforeSpace = false;
    // last space in a run is normal, others are nbsp,
    // end of line is nbsp
    for (var i = parts.length - 1; i >= 0; i--){
      var p = parts[i];
      if (p == " "){
        if (endOfLine || beforeSpace) parts[i] = '&nbsp;';
        endOfLine = false;
        beforeSpace = true;
      }
      else if (p.charAt(0) != "<"){
        endOfLine = false;
        beforeSpace = false;
      }
    }
    // beginning of line is nbsp
    for (i = 0; i < parts.length; i++){
      p = parts[i];
      if (p == " "){
        parts[i] = '&nbsp;';
        break;
      }
      else if (p.charAt(0) != "<"){
        break;
      }
    }
  }
  else
  {
    for (i = 0; i < parts.length; i++){
      p = parts[i];
      if (p == " "){
        parts[i] = '&nbsp;';
      }
    }
  }
  return parts.join('');
}
