/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

// THIS FILE IS ALSO AN APPJET MODULE: etherpad.collab.ace.contentcollector
// %APPJET%: import("etherpad.collab.ace.easysync2.Changeset");
// %APPJET%: import("etherpad.admin.plugins");
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

var _MAX_LIST_LEVEL = 16;

var UNorm = require('unorm');
var Changeset = require('./Changeset');
var hooks = require('./pluginfw/hooks');
var _ = require('./underscore');

function sanitizeUnicode(s)
{
  return UNorm.nfc(s);
}

function makeContentCollector(collectStyles, abrowser, apool, domInterface, className2Author)
{
  abrowser = abrowser || {};
  // I don't like the above.

  var dom = domInterface || {
    isNodeText: function(n)
    {
      return (n.nodeType == 3);
    },
    nodeTagName: function(n)
    {
      return n.tagName;
    },
    nodeValue: function(n)
    {
      return n.nodeValue;
    },
    nodeNumChildren: function(n)
    {
      if(n.childNodes == null) return 0;
      return n.childNodes.length;
    },
    nodeChild: function(n, i)
    {
      if(n.childNodes.item == null){
        return n.childNodes[i];
      }
      return n.childNodes.item(i);
    },
    nodeProp: function(n, p)
    {
      return n[p];
    },
    nodeAttr: function(n, a)
    {
      if(n.getAttribute != null) return n.getAttribute(a);
      if(n.attribs != null) return n.attribs[a];
      return null;
    },
    optNodeInnerHTML: function(n)
    {
      return n.innerHTML;
    }
  };

  var _blockElems = {
    "div": 1,
    "p": 1,
    "pre": 1,
    "li": 1
  };

  _.each(hooks.callAll('ccRegisterBlockElements'), function(element){
    _blockElems[element] = 1;
  });

  function isBlockElement(n)
  {
    return !!_blockElems[(dom.nodeTagName(n) || "").toLowerCase()];
  }

  function textify(str)
  {
    return sanitizeUnicode(
    str.replace(/(\n | \n)/g, ' ').replace(/[\n\r ]/g, ' ').replace(/\xa0/g, ' ').replace(/\t/g, '        '));
  }

  function getAssoc(node, name)
  {
    return dom.nodeProp(node, "_magicdom_" + name);
  }

  var lines = (function()
  {
    var textArray = [];
    var attribsArray = [];
    var attribsBuilder = null;
    var op = Changeset.newOp('+');
    var self = {
      length: function()
      {
        return textArray.length;
      },
      atColumnZero: function()
      {
        return textArray[textArray.length - 1] === "";
      },
      startNew: function()
      {
        textArray.push("");
        self.flush(true);
        attribsBuilder = Changeset.smartOpAssembler();
      },
      textOfLine: function(i)
      {
        return textArray[i];
      },
      appendText: function(txt, attrString)
      {
        textArray[textArray.length - 1] += txt;
        //dmesg(txt+" / "+attrString);
        op.attribs = attrString;
        op.chars = txt.length;
        attribsBuilder.append(op);
      },
      textLines: function()
      {
        return textArray.slice();
      },
      attribLines: function()
      {
        return attribsArray;
      },
      // call flush only when you're done
      flush: function(withNewline)
      {
        if (attribsBuilder)
        {
          attribsArray.push(attribsBuilder.toString());
          attribsBuilder = null;
        }
      }
    };
    self.startNew();
    return self;
  }());
  var cc = {};

  function _ensureColumnZero(state)
  {
    if (!lines.atColumnZero())
    {
      cc.startNewLine(state);
    }
  }
  var selection, startPoint, endPoint;
  var selStart = [-1, -1],
      selEnd = [-1, -1];
  function _isEmpty(node, state)
  {
    // consider clean blank lines pasted in IE to be empty
    if (dom.nodeNumChildren(node) == 0) return true;
    if (dom.nodeNumChildren(node) == 1 && getAssoc(node, "shouldBeEmpty") && dom.optNodeInnerHTML(node) == "&nbsp;" && !getAssoc(node, "unpasted"))
    {
      if (state)
      {
        var child = dom.nodeChild(node, 0);
        _reachPoint(child, 0, state);
        _reachPoint(child, 1, state);
      }
      return true;
    }
    return false;
  }

  function _pointHere(charsAfter, state)
  {
    var ln = lines.length() - 1;
    var chr = lines.textOfLine(ln).length;
    if (chr == 0 && !_.isEmpty(state.lineAttributes))
    {
      chr += 1; // listMarker
    }
    chr += charsAfter;
    return [ln, chr];
  }

  function _reachBlockPoint(nd, idx, state)
  {
    if (!dom.isNodeText(nd)) _reachPoint(nd, idx, state);
  }

  function _reachPoint(nd, idx, state)
  {
    if (startPoint && nd == startPoint.node && startPoint.index == idx)
    {
      selStart = _pointHere(0, state);
    }
    if (endPoint && nd == endPoint.node && endPoint.index == idx)
    {
      selEnd = _pointHere(0, state);
    }
  }
  cc.incrementFlag = function(state, flagName)
  {
    state.flags[flagName] = (state.flags[flagName] || 0) + 1;
  }
  cc.decrementFlag = function(state, flagName)
  {
    state.flags[flagName]--;
  }
  cc.incrementAttrib = function(state, attribName)
  {
    if (!state.attribs[attribName])
    {
      state.attribs[attribName] = 1;
    }
    else
    {
      state.attribs[attribName]++;
    }
    _recalcAttribString(state);
  }
  cc.decrementAttrib = function(state, attribName)
  {
    state.attribs[attribName]--;
    _recalcAttribString(state);
  }

  function _enterList(state, listType)
  {
    var oldListType = state.lineAttributes['list'];
    if (listType != 'none')
    {
      state.listNesting = (state.listNesting || 0) + 1;
    }

    if(listType === 'none' || !listType ){
      delete state.lineAttributes['list'];
    }
    else{
      state.lineAttributes['list'] = listType;
    }

    _recalcAttribString(state);
    return oldListType;
  }

  function _exitList(state, oldListType)
  {
    if (state.lineAttributes['list'])
    {
      state.listNesting--;
    }
    if (oldListType && oldListType != 'none') { state.lineAttributes['list'] = oldListType; }
    else { delete state.lineAttributes['list']; }
    _recalcAttribString(state);
  }

  function _enterAuthor(state, author)
  {
    var oldAuthor = state.author;
    state.authorLevel = (state.authorLevel || 0) + 1;
    state.author = author;
    _recalcAttribString(state);
    return oldAuthor;
  }

  function _exitAuthor(state, oldAuthor)
  {
    state.authorLevel--;
    state.author = oldAuthor;
    _recalcAttribString(state);
  }

  function _recalcAttribString(state)
  {
    var lst = [];
    for (var a in state.attribs)
    {
      if (state.attribs[a])
      {
        // The following splitting of the attribute name is a workaround
        // to enable the content collector to store key-value attributes
        // see https://github.com/ether/etherpad-lite/issues/2567 for more information
        // in long term the contentcollector should be refactored to get rid of this workaround
        var ATTRIBUTE_SPLIT_STRING = "::";

        // see if attributeString is splittable
        var attributeSplits = a.split(ATTRIBUTE_SPLIT_STRING);
        if (attributeSplits.length > 1) {
            // the attribute name follows the convention key::value
            // so save it as a key value attribute
            lst.push([attributeSplits[0], attributeSplits[1]]);
        } else {
            // the "normal" case, the attribute is just a switch
            // so set it true
            lst.push([a, 'true']);
        }
      }
    }
    if (state.authorLevel > 0)
    {
      var authorAttrib = ['author', state.author];
      if (apool.putAttrib(authorAttrib, true) >= 0)
      {
        // require that author already be in pool
        // (don't add authors from other documents, etc.)
        lst.push(authorAttrib);
      }
    }
    state.attribString = Changeset.makeAttribsString('+', lst, apool);
  }

  function _produceLineAttributesMarker(state)
  {
    // TODO: This has to go to AttributeManager.
    var attributes = [
      ['lmkr', '1'],
      ['insertorder', 'first']
    ].concat(
      _.map(state.lineAttributes,function(value,key){
        return [key, value];
      })
    );
    lines.appendText('*', Changeset.makeAttribsString('+', attributes , apool));
  }
  cc.startNewLine = function(state)
  {
    if (state)
    {
      var atBeginningOfLine = lines.textOfLine(lines.length() - 1).length == 0;
      if (atBeginningOfLine && !_.isEmpty(state.lineAttributes))
      {
        _produceLineAttributesMarker(state);
      }
    }
    lines.startNew();
  }
  cc.notifySelection = function(sel)
  {
    if (sel)
    {
      selection = sel;
      startPoint = selection.startPoint;
      endPoint = selection.endPoint;
    }
  };
  cc.doAttrib = function(state, na)
  {
    state.localAttribs = (state.localAttribs || []);
    state.localAttribs.push(na);
    cc.incrementAttrib(state, na);
  };
  cc.collectContent = function(node, state)
  {
    if (!state)
    {
      state = {
        flags: { /*name -> nesting counter*/
        },
        localAttribs: null,
        attribs: { /*name -> nesting counter*/
        },
        attribString: '',
        // lineAttributes maintain a map from attributes to attribute values set on a line
        lineAttributes: {
          /*
          example:
          'list': 'bullet1',
          */
        }
      };
    }
    var localAttribs = state.localAttribs;
    state.localAttribs = null;
    var isBlock = isBlockElement(node);
    var isEmpty = _isEmpty(node, state);
    if (isBlock) _ensureColumnZero(state);
    var startLine = lines.length() - 1;
    _reachBlockPoint(node, 0, state);
    if (dom.isNodeText(node))
    {
      var txt = dom.nodeValue(node);
      var tname = dom.nodeAttr(node.parentNode,"name");

      var txtFromHook = hooks.callAll('collectContentLineText', {
        cc: this,
        state: state,
        tname: tname,
        node:node,
        text:txt,
        styl: null,
        cls: null
      });
      var txt = (typeof(txtFromHook)=='object'&&txtFromHook.length==0)?dom.nodeValue(node):txtFromHook[0];

      var rest = '';
      var x = 0; // offset into original text
      if (txt.length == 0)
      {
        if (startPoint && node == startPoint.node)
        {
          selStart = _pointHere(0, state);
        }
        if (endPoint && node == endPoint.node)
        {
          selEnd = _pointHere(0, state);
        }
      }
      while (txt.length > 0)
      {
        var consumed = 0;
        if (state.flags.preMode)
        {
          var firstLine = txt.split('\n', 1)[0];
          consumed = firstLine.length + 1;
          rest = txt.substring(consumed);
          txt = firstLine;
        }
        else
        { /* will only run this loop body once */
        }
        if (startPoint && node == startPoint.node && startPoint.index - x <= txt.length)
        {
          selStart = _pointHere(startPoint.index - x, state);
        }
        if (endPoint && node == endPoint.node && endPoint.index - x <= txt.length)
        {
          selEnd = _pointHere(endPoint.index - x, state);
        }
        var txt2 = txt;
        if ((!state.flags.preMode) && /^[\r\n]*$/.exec(txt))
        {
          // prevents textnodes containing just "\n" from being significant
          // in safari when pasting text, now that we convert them to
          // spaces instead of removing them, because in other cases
          // removing "\n" from pasted HTML will collapse words together.
          txt2 = "";
        }
        var atBeginningOfLine = lines.textOfLine(lines.length() - 1).length == 0;
        if (atBeginningOfLine)
        {
          // newlines in the source mustn't become spaces at beginning of line box
          txt2 = txt2.replace(/^\n*/, '');
        }
        if (atBeginningOfLine && !_.isEmpty(state.lineAttributes))
        {
          _produceLineAttributesMarker(state);
        }
        lines.appendText(textify(txt2), state.attribString);
        x += consumed;
        txt = rest;
        if (txt.length > 0)
        {
          cc.startNewLine(state);
        }
      }
    }
    else
    {
      var tname = (dom.nodeTagName(node) || "").toLowerCase();

      if (tname == "img"){
        var collectContentImage = hooks.callAll('collectContentImage', {
          cc: cc,
          state: state,
          tname: tname,
          styl: styl,
          cls: cls,
          node: node
        });
      }else{
        // THIS SEEMS VERY HACKY! -- Please submit a better fix!
        delete state.lineAttributes.img
      }

      if (tname == "br")
      {
        this.breakLine = true;
        var tvalue = dom.nodeAttr(node, 'value');
        var induceLineBreak = hooks.callAll('collectContentLineBreak', {
          cc: this,
          state: state,
          tname: tname,
          tvalue:tvalue,
          styl: null,
          cls: null
        });
        var startNewLine= (typeof(induceLineBreak)=='object'&&induceLineBreak.length==0)?true:induceLineBreak[0];
        if(startNewLine){
          cc.startNewLine(state);
        }
      }
      else if (tname == "script" || tname == "style")
      {
        // ignore
      }
      else if (!isEmpty)
      {
        var styl = dom.nodeAttr(node, "style");
        var cls = dom.nodeAttr(node, "class");
        var isPre = (tname == "pre");
        if ((!isPre) && abrowser.safari)
        {
          isPre = (styl && /\bwhite-space:\s*pre\b/i.exec(styl));
        }
        if (isPre) cc.incrementFlag(state, 'preMode');
        var oldListTypeOrNull = null;
        var oldAuthorOrNull = null;

        // LibreOffice Writer puts in weird items during import or copy/paste, we should drop them.
        if (cls === "Numbering_20_Symbols" || cls === "Bullet_20_Symbols") {
          styl = null;
          cls = null;

          // We have to return here but this could break things in the future, for now it shows how to fix the problem
          return;
        }

        if (collectStyles)
        {
          hooks.callAll('collectContentPre', {
            cc: cc,
            state: state,
            tname: tname,
            styl: styl,
            cls: cls
          });
          if (tname == "b" || (styl && /\bfont-weight:\s*bold\b/i.exec(styl)) || tname == "strong")
          {
            cc.doAttrib(state, "bold");
          }
          if (tname == "i" || (styl && /\bfont-style:\s*italic\b/i.exec(styl)) || tname == "em")
          {
            cc.doAttrib(state, "italic");
          }
          if (tname == "u" || (styl && /\btext-decoration:\s*underline\b/i.exec(styl)) || tname == "ins")
          {
            cc.doAttrib(state, "underline");
          }
          if (tname == "s" || (styl && /\btext-decoration:\s*line-through\b/i.exec(styl)) || tname == "del")
          {
            cc.doAttrib(state, "strikethrough");
          }
          if (tname == "ul" || tname == "ol")
          {
            if(node.attribs){
              var type = node.attribs.class;
            }else{
              var type = null;
            }
            var rr = cls && /(?:^| )list-([a-z]+[0-9]+)\b/.exec(cls);
            // lists do not need to have a type, so before we make a wrong guess, check if we find a better hint within the node's children
            if(!rr && !type){
              for (var i in node.children){
                if(node.children[i] && node.children[i].name=='ul'){
                  type = node.children[i].attribs.class
                  if(type){
                    break
                  }
                }
              }
            }
            if(rr && rr[1]){
              type = rr[1]
            } else {
              if(tname == "ul"){
                if((type && type.match("indent")) || (node.attribs && node.attribs.class && node.attribs.class.match("indent"))){
                  type = "indent"
                } else {
                  type = "bullet"
                }
              } else {
                type = "number"
              }
              type = type + String(Math.min(_MAX_LIST_LEVEL, (state.listNesting || 0) + 1));
            }
            oldListTypeOrNull = (_enterList(state, type) || 'none');
          }
          else if ((tname == "div" || tname == "p") && cls && cls.match(/(?:^| )ace-line\b/))
          {
            // This has undesirable behavior in Chrome but is right in other browsers.
            // See https://github.com/ether/etherpad-lite/issues/2412 for reasoning
            if(!abrowser.chrome) oldListTypeOrNull = (_enterList(state, type) || 'none');
          }
          if (className2Author && cls)
          {
            var classes = cls.match(/\S+/g);
            if (classes && classes.length > 0)
            {
              for (var i = 0; i < classes.length; i++)
              {
                var c = classes[i];
                var a = className2Author(c);
                if (a)
                {
                  oldAuthorOrNull = (_enterAuthor(state, a) || 'none');
                  break;
                }
              }
            }
          }
        }

        var nc = dom.nodeNumChildren(node);
        for (var i = 0; i < nc; i++)
        {
          var c = dom.nodeChild(node, i);
          cc.collectContent(c, state);
        }

        if (collectStyles)
        {
          hooks.callAll('collectContentPost', {
            cc: cc,
            state: state,
            tname: tname,
            styl: styl,
            cls: cls
          });
        }

        if (isPre) cc.decrementFlag(state, 'preMode');
        if (state.localAttribs)
        {
          for (var i = 0; i < state.localAttribs.length; i++)
          {
            cc.decrementAttrib(state, state.localAttribs[i]);
          }
        }
        if (oldListTypeOrNull)
        {
          _exitList(state, oldListTypeOrNull);
        }
        if (oldAuthorOrNull)
        {
          _exitAuthor(state, oldAuthorOrNull);
        }
      }
    }
    if (!abrowser.msie)
    {
      _reachBlockPoint(node, 1, state);
    }
    if (isBlock)
    {
      if (lines.length() - 1 == startLine)
      {
        // commented out to solve #2412 - https://github.com/ether/etherpad-lite/issues/2412
        // cc.startNewLine(state);
      }
      else
      {
        _ensureColumnZero(state);
      }
    }
    if (abrowser.msie)
    {
      // in IE, a point immediately after a DIV appears on the next line
      _reachBlockPoint(node, 1, state);
    }
    state.localAttribs = localAttribs;
  };
  // can pass a falsy value for end of doc
  cc.notifyNextNode = function(node)
  {
    // an "empty block" won't end a line; this addresses an issue in IE with
    // typing into a blank line at the end of the document.  typed text
    // goes into the body, and the empty line div still looks clean.
    // it is incorporated as dirty by the rule that a dirty region has
    // to end a line.
    if ((!node) || (isBlockElement(node) && !_isEmpty(node)))
    {
      _ensureColumnZero(null);
    }
  };
  // each returns [line, char] or [-1,-1]
  var getSelectionStart = function()
    {
      return selStart;
      };
  var getSelectionEnd = function()
    {
      return selEnd;
      };

  // returns array of strings for lines found, last entry will be "" if
  // last line is complete (i.e. if a following span should be on a new line).
  // can be called at any point
  cc.getLines = function()
  {
    return lines.textLines();
  };

  cc.finish = function()
  {
    lines.flush();
    var lineAttribs = lines.attribLines();
    var lineStrings = cc.getLines();

    lineStrings.length--;
    lineAttribs.length--;

    var ss = getSelectionStart();
    var se = getSelectionEnd();

    function fixLongLines()
    {
      // design mode does not deal with with really long lines!
      var lineLimit = 2000; // chars
      var buffer = 10; // chars allowed over before wrapping
      var linesWrapped = 0;
      var numLinesAfter = 0;
      for (var i = lineStrings.length - 1; i >= 0; i--)
      {
        var oldString = lineStrings[i];
        var oldAttribString = lineAttribs[i];
        if (oldString.length > lineLimit + buffer)
        {
          var newStrings = [];
          var newAttribStrings = [];
          while (oldString.length > lineLimit)
          {
            //var semiloc = oldString.lastIndexOf(';', lineLimit-1);
            //var lengthToTake = (semiloc >= 0 ? (semiloc+1) : lineLimit);
            var lengthToTake = lineLimit;
            newStrings.push(oldString.substring(0, lengthToTake));
            oldString = oldString.substring(lengthToTake);
            newAttribStrings.push(Changeset.subattribution(oldAttribString, 0, lengthToTake));
            oldAttribString = Changeset.subattribution(oldAttribString, lengthToTake);
          }
          if (oldString.length > 0)
          {
            newStrings.push(oldString);
            newAttribStrings.push(oldAttribString);
          }

          function fixLineNumber(lineChar)
          {
            if (lineChar[0] < 0) return;
            var n = lineChar[0];
            var c = lineChar[1];
            if (n > i)
            {
              n += (newStrings.length - 1);
            }
            else if (n == i)
            {
              var a = 0;
              while (c > newStrings[a].length)
              {
                c -= newStrings[a].length;
                a++;
              }
              n += a;
            }
            lineChar[0] = n;
            lineChar[1] = c;
          }
          fixLineNumber(ss);
          fixLineNumber(se);
          linesWrapped++;
          numLinesAfter += newStrings.length;

          newStrings.unshift(i, 1);
          lineStrings.splice.apply(lineStrings, newStrings);
          newAttribStrings.unshift(i, 1);
          lineAttribs.splice.apply(lineAttribs, newAttribStrings);
        }
      }
      return {
        linesWrapped: linesWrapped,
        numLinesAfter: numLinesAfter
      };
    }
    var wrapData = fixLongLines();

    return {
      selStart: ss,
      selEnd: se,
      linesWrapped: wrapData.linesWrapped,
      numLinesAfter: wrapData.numLinesAfter,
      lines: lineStrings,
      lineAttribs: lineAttribs
    };
  }

  return cc;
}

exports.sanitizeUnicode = sanitizeUnicode;
exports.makeContentCollector = makeContentCollector;
