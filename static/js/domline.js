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

var domline = {};
domline.noop = function() {};
domline.identity = function(x) { return x; };

domline.addToLineClass = function(lineClass, cls) {
  // an "empty span" at any point can be used to add classes to
  // the line, using line:className.  otherwise, we ignore
  // the span.
  cls.replace(/\S+/g, function (c) {
    if (c.indexOf("line:") == 0) {
      // add class to line
      lineClass = (lineClass ? lineClass+' ' : '')+c.substring(5);
    }
  });
  return lineClass;
}

// if "document" is falsy we don't create a DOM node, just
// an object with innerHTML and className
domline.createDomLine = function(nonEmpty, doesWrap, optBrowser, optDocument) {
  var result = { node: null,
                 appendSpan: domline.noop,
                 prepareForAdd: domline.noop,
                 notifyAdded: domline.noop,
                 clearSpans: domline.noop,
                 finishUpdate: domline.noop,
                 lineMarker: 0 };

  var browser = (optBrowser || {});
  var document = optDocument;

  if (document) {
    result.node = document.createElement("div");
  }
  else {
    result.node = {innerHTML: '', className: ''};
  }

  var html = [];
  var preHtml, postHtml;
  var curHTML = null;
  function processSpaces(s) {
    return domline.processSpaces(s, doesWrap);
  }
  var identity = domline.identity;
  var perTextNodeProcess = (doesWrap ? identity : processSpaces);
  var perHtmlLineProcess = (doesWrap ? processSpaces : identity);
  var lineClass = 'ace-line';
  result.appendSpan = function(txt, cls) {
    if (cls.indexOf('list') >= 0) {
      var listType = /(?:^| )list:(\S+)/.exec(cls);
      if (listType) {
        listType = listType[1];
        if (listType) {
          preHtml = '<ul class="list-'+listType+'"><li>';
          postHtml = '</li></ul>';
        }
        result.lineMarker += txt.length;
        return; // don't append any text
      }
    }
    var href = null;
    var simpleTags = null;
    if (cls.indexOf('url') >= 0) {
      cls = cls.replace(/(^| )url:(\S+)/g, function(x0, space, url) {
	href = url;
	return space+"url";
      });
    }
    if (cls.indexOf('tag') >= 0) {
      cls = cls.replace(/(^| )tag:(\S+)/g, function(x0, space, tag) {
	if (! simpleTags) simpleTags = [];
	simpleTags.push(tag.toLowerCase());
	return space+tag;
      });
    }

    var extraOpenTags = "";
    var extraCloseTags = "";

    var plugins_;
    if (typeof(plugins)!='undefined') {
      plugins_ = plugins;
    } else {
      plugins_ = parent.parent.plugins;
    }

    plugins_.callHook(
      "aceCreateDomLine", {domline:domline, cls:cls}
    ).map(function (modifier) {
      cls = modifier.cls;
      extraOpenTags = extraOpenTags+modifier.extraOpenTags;
      extraCloseTags = modifier.extraCloseTags+extraCloseTags;
    });

    if ((! txt) && cls) {
      lineClass = domline.addToLineClass(lineClass, cls);
    }
    else if (txt) {
      if (href) {
	extraOpenTags = extraOpenTags+'<a href="'+
	  href.replace(/\"/g, '&quot;')+'">';
	extraCloseTags = '</a>'+extraCloseTags;
      }
      if (simpleTags) {
	simpleTags.sort();
	extraOpenTags = extraOpenTags+'<'+simpleTags.join('><')+'>';
	simpleTags.reverse();
	extraCloseTags = '</'+simpleTags.join('></')+'>'+extraCloseTags;
      }
      html.push('<span class="',cls||'','">',extraOpenTags,
		perTextNodeProcess(domline.escapeHTML(txt)),
                extraCloseTags,'</span>');
    }
  };
  result.clearSpans = function() {
    html = [];
    lineClass = ''; // non-null to cause update
    result.lineMarker = 0;
  };
  function writeHTML() {
    var newHTML = perHtmlLineProcess(html.join(''));
    if (! newHTML) {
      if ((! document) || (! optBrowser)) {
        newHTML += '&nbsp;';
      }
      else if (! browser.msie) {
        newHTML += '<br/>';
      }
    }
    if (nonEmpty) {
      newHTML = (preHtml||'')+newHTML+(postHtml||'');
    }
    html = preHtml = postHtml = null; // free memory
    if (newHTML !== curHTML) {
      curHTML = newHTML;
      result.node.innerHTML = curHTML;
    }
    if (lineClass !== null) result.node.className = lineClass;
  }
  result.prepareForAdd = writeHTML;
  result.finishUpdate = writeHTML;
  result.getInnerHTML = function() { return curHTML || ''; };

  return result;
};

domline.escapeHTML = function(s) {
  var re = /[&<>'"]/g; /']/; // stupid indentation thing
  if (! re.MAP) {
    // persisted across function calls!
    re.MAP = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&#34;',
      "'": '&#39;'
    };
  }
  return s.replace(re, function(c) { return re.MAP[c]; });
};

domline.processSpaces = function(s, doesWrap) {
  if (s.indexOf("<") < 0 && ! doesWrap) {
    // short-cut
    return s.replace(/ /g, '&nbsp;');
  }
  var parts = [];
  s.replace(/<[^>]*>?| |[^ <]+/g, function(m) { parts.push(m); });
  if (doesWrap) {
    var endOfLine = true;
    var beforeSpace = false;
    // last space in a run is normal, others are nbsp,
    // end of line is nbsp
    for(var i=parts.length-1;i>=0;i--) {
      var p = parts[i];
      if (p == " ") {
	if (endOfLine || beforeSpace)
	  parts[i] = '&nbsp;';
	endOfLine = false;
	beforeSpace = true;
      }
      else if (p.charAt(0) != "<") {
	endOfLine = false;
	beforeSpace = false;
      }
    }
    // beginning of line is nbsp
    for(var i=0;i<parts.length;i++) {
      var p = parts[i];
      if (p == " ") {
	parts[i] = '&nbsp;';
	break;
      }
      else if (p.charAt(0) != "<") {
	break;
      }
    }
  }
  else {
    for(var i=0;i<parts.length;i++) {
      var p = parts[i];
      if (p == " ") {
	parts[i] = '&nbsp;';
      }
    }
  }
  return parts.join('');
};
