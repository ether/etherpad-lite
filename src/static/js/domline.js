/**
 * This code is mostly from the old Etherpad. Please help us to comment this code. 
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

// THIS FILE IS ALSO AN APPJET MODULE: etherpad.collab.ace.domline
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

// requires: top
// requires: plugins
// requires: undefined

var Security = require('./security');
var hooks = require('./pluginfw/hooks');
var _ = require('./underscore');
var lineAttributeMarker = require('./linestylefilter').lineAttributeMarker;
var noop = function(){};

function addToLineClass(lineClass, cls)
{
  // an "empty span" at any point can be used to add classes to
  // the line, using line:className.  otherwise, we ignore
  // the span.
  cls.replace(/\S+/g, function(c)
  {
    if (c.indexOf("line:") == 0)
    {
      // add class to line
      lineClass = (lineClass ? lineClass + ' ' : '') + c.substring(5);
    }
  });
  return lineClass;
}

function DOMLine(nonEmpty, doesWrap, browser, document) {
  this.node = null;
  this.lineMarker = 0;
  this.nonEmpty = nonEmpty;
  this.doesWrap = doesWrap;
  this.browser = browser;
  this.document = document;

  // if "document" is falsy we don't create a DOM node, just
  // an object with innerHTML and className
  if (document)
  {
    this.node = document.createElement("div");
  }
  else
  {
    this.node = {
      innerHTML: '',
      className: ''
    };
  }

  this.html = [];
  this.preHtml = '';
  this.postHtml = '';
  this.curHTML = null;

  this.lineClass = 'ace-line';

  // Apparently overridden at the instance level sometimes...
  this.notifyAdded = function () {this._notifyAdded()};
  this.finishUpdate = function () {this._finishUpdate()};
}

DOMLine.prototype = {};
(function () {

  this.perTextNodeProcess = function (s) {
    if (this.doesWrap) {
      return _.identity(s);
    } else {
      return this.processSpaces(s);
    }
  }

  this.perHtmlLineProcess = function (s) {
    if (this.doesWrap) {
      return this.processSpaces(s);
    } else {
      return _.identity(s);
    }
  }

  this.processSpaces = function(s)
  {
    return processSpaces(s, this.doesWrap);
  }
  this._notifyAdded = function () {};

  this.appendSpan = function(txt, cls)
  {
    var processedMarker = false;
    // Handle lineAttributeMarker, if present
    if (cls.indexOf(lineAttributeMarker) >= 0)
    {
      var listType = /(?:^| )list:(\S+)/.exec(cls);
      var start = /(?:^| )start:(\S+)/.exec(cls);
      if (listType)
      {
        listType = listType[1];
        start = start?'start="'+Security.escapeHTMLAttribute(start[1])+'"':'';
        if (listType)
        {
          if(listType.indexOf("number") < 0)
          {
            this.preHtml = '<ul class="list-' + Security.escapeHTMLAttribute(listType) + '"><li>';
            this.postHtml = '</li></ul>';
          }
          else
          {
            this.preHtml = '<ol '+start+' class="list-' + Security.escapeHTMLAttribute(listType) + '"><li>';
            this.postHtml = '</li></ol>';
          }
        } 
        processedMarker = true;
      }
      
      _.map(hooks.callAll("aceDomLineProcessLineAttributes", {
        domline: exports,
        cls: cls
      }), function(modifier)
      {
        this.preHtml += modifier.preHtml;
        this.postHtml += modifier.postHtml;
        processedMarker |= modifier.processedMarker;
      });
      
      if( processedMarker ){
        this.lineMarker += txt.length;
        return; // don't append any text
      } 


    }
    var href = null;
    var simpleTags = null;
    if (cls.indexOf('url') >= 0)
    {
      cls = cls.replace(/(^| )url:(\S+)/g, function(x0, space, url)
      {
        href = url;
        return space + "url";
      });
    }
    if (cls.indexOf('tag') >= 0)
    {
      cls = cls.replace(/(^| )tag:(\S+)/g, function(x0, space, tag)
      {
        if (!simpleTags) simpleTags = [];
        simpleTags.push(tag.toLowerCase());
        return space + tag;
      });
    }

    var extraOpenTags = "";
    var extraCloseTags = "";

    _.map(hooks.callAll("aceCreateDomLine", {
      domline: exports,
      cls: cls
    }), function(modifier)
    {
      cls = modifier.cls;
      extraOpenTags = extraOpenTags + modifier.extraOpenTags;
      extraCloseTags = modifier.extraCloseTags + extraCloseTags;
    });

    if ((!txt) && cls)
    {
      this.lineClass = addToLineClass(this.lineClass, cls);
    }
    else if (txt)
    {
      if (href)
      {
        if(!~href.indexOf("http")) // if the url doesn't include http or https etc prefix it.
        {
          href = "http://"+href;
        }
        extraOpenTags = extraOpenTags + '<a href="' + Security.escapeHTMLAttribute(href) + '">';
        extraCloseTags = '</a>' + extraCloseTags;
      }
      if (simpleTags)
      {
        simpleTags.sort();
        extraOpenTags = extraOpenTags + '<' + simpleTags.join('><') + '>';
        simpleTags.reverse();
        extraCloseTags = '</' + simpleTags.join('></') + '>' + extraCloseTags;
      }
      this.html.push('<span class="', Security.escapeHTMLAttribute(cls || ''), '">', extraOpenTags, this.perTextNodeProcess(Security.escapeHTML(txt)), extraCloseTags, '</span>');
    }
  };
  this.clearSpans = function()
  {
    this.html = [];
    this.lineClass = ''; // non-null to cause update
    this.lineMarker = 0;
  };

  this._writeHTML = function ()
  {
    var newHTML = this.perHtmlLineProcess(this.html.join(''));
    if (!newHTML)
    {
      if ((!this.document) || (!this.browser))
      {
        newHTML += '&nbsp;';
      }
      else if (!(this.browser || {}).msie)
      {
        newHTML += '<br/>';
      }
    }
    if (this.nonEmpty)
    {
      newHTML = (this.preHtml || '') + newHTML + (this.postHtml || '');
    }
    this.html = this.preHtml = this.postHtml = ''; // free memory
    if (newHTML !== this.curHTML)
    {
      this.curHTML = newHTML;
      this.node.innerHTML = this.curHTML;
    }
    if (this.lineClass !== null) this.node.className = this.lineClass;
	
	  hooks.callAll("acePostWriteDomLineHTML", {
        node: this.node
	  });
  }
  this.prepareForAdd = function () {
    return this._writeHTML();
  };
  this._finishUpdate = function () {
    return this._writeHTML();
  };
  this.getInnerHTML = function()
  {
    return this.curHTML || '';
  };

}).call(DOMLine.prototype);

function SpecialIEDOMLine(nonEmpty, doesWrap, browser, document) {
  this.node = null;
  this.lineMarker = 0;
  this.node = document.createElement("div")

  this.lineClass = 'ace-line';

  // Apparently overridden at the instance level sometimes...
  this.notifyAdded = function () {this._notifyAdded()};
  this.finishUpdate = function () {this._finishUpdate()};;
}
SpecialIEDOMLine.prototype = {};
(function () {
  this._notifyAdded = function () {
    // magic -- settng an empty div's innerHTML to the empty string
    // keeps it from collapsing.  Apparently innerHTML must be set *after*
    // adding the node to the DOM.
    // Such a div is what IE 6 creates naturally when you make a blank line
    // in a document of divs.  However, when copy-and-pasted the div will
    // contain a space, so we note its emptiness with a property.
    this.node.innerHTML = " "; // Frist we set a value that isnt blank
    // a primitive-valued property survives copy-and-paste
    Ace2Common.setAssoc(lineElem, "shouldBeEmpty", true);
    // an object property doesn't
    Ace2Common.setAssoc(lineElem, "unpasted", {});
    this.node.innerHTML = ""; // Then we make it blank..  New line and no space = Awesome :)
  }

  this.appendSpan = function (txt, cls) {
    if ((!txt) && cls) {
      // gain a whole-line style (currently to show insertion point in CSS)
      this.lineClass = addToLineClass(lineClass, cls);
    }
    // otherwise, ignore appendSpan, this is an empty line
  }

  this.clearSpans = function () {
    this.lineClass = ''; // non-null to cause update
  }

  this._writeClass = function () {
    if (this.lineClass !== null) {
      this.node.className = this.lineClass;
    }
  }

  this.prepareForAdd = function () {
    return this._writeClass;
  }
  this._finishUpdate = function () {
    return this._writeClass;
  }
  this.getInnerHTML = function () {
    return "";
  }
}).call(SpecialIEDOMLine.prototype);

function createDomLine(nonEmpty, doesWrap, browser, document)
{
  if (browser.msie && (!nonEmpty)) {
    // TODO: Why is this necessary?
    return new SpecialIEDOMLine(nonEmpty, doesWrap, browser, document);
  } else {
    return new DOMLine(nonEmpty, doesWrap, browser, document);
  }
};

function processSpaces(s, doesWrap)
{
  if (s.indexOf("<") < 0 && !doesWrap)
  {
    // short-cut
    return s.replace(/ /g, '&nbsp;');
  }
  var parts = [];
  s.replace(/<[^>]*>?| |[^ <]+/g, function(m)
  {
    parts.push(m);
  });
  if (doesWrap)
  {
    var endOfLine = true;
    var beforeSpace = false;
    // last space in a run is normal, others are nbsp,
    // end of line is nbsp
    for (var i = parts.length - 1; i >= 0; i--)
    {
      var p = parts[i];
      if (p == " ")
      {
        if (endOfLine || beforeSpace) parts[i] = '&nbsp;';
        endOfLine = false;
        beforeSpace = true;
      }
      else if (p.charAt(0) != "<")
      {
        endOfLine = false;
        beforeSpace = false;
      }
    }
    // beginning of line is nbsp
    for (var i = 0; i < parts.length; i++)
    {
      var p = parts[i];
      if (p == " ")
      {
        parts[i] = '&nbsp;';
        break;
      }
      else if (p.charAt(0) != "<")
      {
        break;
      }
    }
  }
  else
  {
    for (var i = 0; i < parts.length; i++)
    {
      var p = parts[i];
      if (p == " ")
      {
        parts[i] = '&nbsp;';
      }
    }
  }
  return parts.join('');
};

exports.addToLineClass = addToLineClass;
exports.createDomLine = createDomLine;
exports.processSpaces = processSpaces;

exports.domline = exports; // For compatibility
