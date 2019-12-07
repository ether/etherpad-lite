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

var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var padManager = require("../db/PadManager");
var _ = require('underscore');
var Security = require('ep_etherpad-lite/static/js/security');
var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');
var eejs = require('ep_etherpad-lite/node/eejs');
var _analyzeLine = require('./ExportHelper')._analyzeLine;
var _encodeWhitespace = require('./ExportHelper')._encodeWhitespace;

async function getPadHTML(pad, revNum)
{
  let atext = pad.atext;

  // fetch revision atext
  if (revNum != undefined) {
    atext = await pad.getInternalRevisionAText(revNum);
  }

  // convert atext to html
  return getHTMLFromAtext(pad, atext);
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

  // prepare tags stored as ['tag', true] to be exported
  hooks.aCallAll("exportHtmlAdditionalTags", pad, function(err, newProps){
    newProps.forEach(function (propName, i) {
      tags.push(propName);
      props.push(propName);
    });
  });

  // prepare tags stored as ['tag', 'value'] to be exported. This will generate HTML
  // with tags like <span data-tag="value">
  hooks.aCallAll("exportHtmlAdditionalTagsWithData", pad, function(err, newProps){
    newProps.forEach(function (propName, i) {
      tags.push('span data-' + propName[0] + '="' + propName[1] + '"');
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
    var attrib = [propName, true];
    if (_.isArray(propName)) {
      // propName can be in the form of ['color', 'red'],
      // see hook exportHtmlAdditionalTagsWithData
      attrib = propName;
    }
    var propTrueNum = apool.putAttrib(attrib, true);
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

      // we are not insterested on properties in the form of ['color', 'red'],
      // see hook exportHtmlAdditionalTagsWithData
      if (_.isArray(property)) {
        return false;
      }

      if(property.substr(0,6) === "author"){
        return stripDotFromAuthorID(property);
      }

      if(property === "removed"){
        return "removed";
      }

      return false;
    }

    // tags added by exportHtmlAdditionalTagsWithData will be exported as <span> with
    // data attributes
    function isSpanWithData(i){
      var property = props[i];
      return _.isArray(property);
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
      var spanWithData = isSpanWithData(i);

      if(spanClass || spanWithData){
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
        if (outermostTag !== -1)
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
            emitOpenTag(usedAttribs[i]);
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
        emitCloseTag(openTags[0]);
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
        // Using rel="noreferrer" stops leaking the URL/location of the exported HTML when clicking links in the document.
        // Not all browsers understand this attribute, but it's part of the HTML5 standard.
        // https://html.spec.whatwg.org/multipage/links.html#link-type-noreferrer
        // Additionally, we do rel="noopener" to ensure a higher level of referrer security.
        // https://html.spec.whatwg.org/multipage/links.html#link-type-noopener
        // https://mathiasbynens.github.io/rel-noopener/
        // https://github.com/ether/etherpad-lite/pull/3636
        assem.append('<a href="' + Security.escapeHTMLAttribute(url) + '" rel="noreferrer noopener">');
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
  var openLists = [];
  for (var i = 0; i < textLines.length; i++)
  {
    var context;
    var line = _analyzeLine(textLines[i], attribLines[i], apool);
    var lineContent = getLineHTML(line.text, line.aline);

    if (line.listLevel)//If we are inside a list
    {
      context = {
        line: line,
        lineContent: lineContent,
        apool: apool,
        attribLine: attribLines[i],
        text: textLines[i],
        padId: pad.id
      };
      var prevLine = null;
      var nextLine = null;
      if (i > 0)
      {
        prevLine = _analyzeLine(textLines[i -1], attribLines[i -1], apool);
      }
      if (i < textLines.length)
      {
        nextLine = _analyzeLine(textLines[i + 1], attribLines[i + 1], apool);
      }
      hooks.aCallAll('getLineHTMLForExport', context);
      //To create list parent elements
      if ((!prevLine || prevLine.listLevel !== line.listLevel) || (prevLine && line.listTypeName !== prevLine.listTypeName))
      {
        var exists = _.find(openLists, function (item)
        {
          return (item.level === line.listLevel && item.type === line.listTypeName);
        });
        if (!exists) {
          var prevLevel = 0;
          if (prevLine && prevLine.listLevel) {
            prevLevel = prevLine.listLevel;
          }
          if (prevLine && line.listTypeName !== prevLine.listTypeName)
          {
            prevLevel = 0;
          }

          for (var diff = prevLevel; diff < line.listLevel; diff++) {
            openLists.push({level: diff, type: line.listTypeName});
            var prevPiece = pieces[pieces.length - 1];

            if (prevPiece.indexOf("<ul") === 0 || prevPiece.indexOf("<ol") === 0 || prevPiece.indexOf("</li>") === 0)
            {
              pieces.push("<li>");
            }

            if (line.listTypeName === "number")
            {
              pieces.push("<ol class=\"" + line.listTypeName + "\">");
            }
            else
            {
              pieces.push("<ul class=\"" + line.listTypeName + "\">");
            }
          }
        }
      }

      pieces.push("<li>", context.lineContent);

      // To close list elements
      if (nextLine && nextLine.listLevel === line.listLevel && line.listTypeName === nextLine.listTypeName)
      {
        pieces.push("</li>");
      }
      if ((!nextLine || !nextLine.listLevel || nextLine.listLevel < line.listLevel) || (nextLine && line.listTypeName !== nextLine.listTypeName))
      {
        var nextLevel = 0;
        if (nextLine && nextLine.listLevel) {
          nextLevel = nextLine.listLevel;
        }
        if (nextLine && line.listTypeName !== nextLine.listTypeName)
        {
          nextLevel = 0;
        }

        for (var diff = nextLevel; diff < line.listLevel; diff++)
        {
          openLists = openLists.filter(function(el)
          {
            return el.level !== diff && el.type !== line.listTypeName;
          });

          if (pieces[pieces.length - 1].indexOf("</ul") === 0 || pieces[pieces.length - 1].indexOf("</ol") === 0)
          {
            pieces.push("</li>");
          }

          if (line.listTypeName === "number")
          {
            pieces.push("</ol>");
          }
          else
          {
            pieces.push("</ul>");
          }
        }
      }
    }
    else//outside any list, need to close line.listLevel of lists
    {
      context = {
        line: line,
        lineContent: lineContent,
        apool: apool,
        attribLine: attribLines[i],
        text: textLines[i],
        padId: pad.id
      };

      hooks.aCallAll("getLineHTMLForExport", context);
        pieces.push(context.lineContent, "<br>");
    }
  }

  return pieces.join('');
}

exports.getPadHTMLDocument = async function (padId, revNum)
{
  let pad = await padManager.getPad(padId);

  // Include some Styles into the Head for Export
  let stylesForExportCSS = "";
  let stylesForExport = await hooks.aCallAll("stylesForExport", padId);
  stylesForExport.forEach(function(css){
    stylesForExportCSS += css;
  });

  let html = await getPadHTML(pad, revNum);

  return eejs.require("ep_etherpad-lite/templates/export_html.html", {
    body: html,
    padId: Security.escapeHTML(padId),
    extraCSS: stylesForExportCSS
  });
}

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
