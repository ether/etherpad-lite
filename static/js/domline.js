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
domline.noop = function()
{};
domline.identity = function(x)
{
  return x;
};

domline.addToLineClass = function(lineClass, cls)
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

// if "document" is falsy we don't create a DOM node, just
// an object with innerHTML and className
domline.createDomLine = function(nonEmpty, doesWrap, optBrowser, optDocument)
{
  var result = {
    node: null,
    appendSpan: domline.noop,
    prepareForAdd: domline.noop,
    notifyAdded: domline.noop,
    clearSpans: domline.noop,
    finishUpdate: domline.noop,
    lineMarker: 0
  };

  var browser = (optBrowser || {});
  var document = optDocument;

  if (document)
  {
    result.node = document.createElement("div");
  }
  else
  {
    result.node = {
      innerHTML: '',
      className: ''
    };
  }

  var html = [];
  var preHtml, postHtml;
  var curHTML = null;

  function processSpaces(s)
  {
    return domline.processSpaces(s, doesWrap);
  }
  var identity = domline.identity;
  var perTextNodeProcess = (doesWrap ? identity : processSpaces);
  var perHtmlLineProcess = (doesWrap ? processSpaces : identity);
  var lineClass = 'ace-line';
  result.appendSpan = function(txt, cls)
  {
    if (cls.indexOf('list') >= 0)
    {
      var listType = /(?:^| )list:(\S+)/.exec(cls);
      if (listType)
      {
        listType = listType[1];
        if (listType)
        {
          preHtml = '<ul class="list-' + listType + '"><li>';
          postHtml = '</li></ul>';
        }
        result.lineMarker += txt.length;
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

    var plugins_;
    if (typeof(plugins) != 'undefined')
    {
      plugins_ = plugins;
    }
    else
    {
      plugins_ = parent.parent.plugins;
    }

    plugins_.callHook("aceCreateDomLine", {
      domline: domline,
      cls: cls
    }).map(function(modifier)
    {
      cls = modifier.cls;
      extraOpenTags = extraOpenTags + modifier.extraOpenTags;
      extraCloseTags = modifier.extraCloseTags + extraCloseTags;
    });

    if ((!txt) && cls)
    {
      lineClass = domline.addToLineClass(lineClass, cls);
    }
    else if (txt)
    {
      if (href)
      {
        
         // if the url doesn't include http or https prefix it
        if(!~href.indexOf("http"))
        {
          href = "http://"+href;
        }
        
        // check extension and decide, whether it's media (image,audio,video) or a simple link
        var href_ext = href.slice(-4);
        var mtype = null;
        
        // images
        if (href_ext==".jpg" || href_ext==".png" || href_ext==".gif" || href_ext==".svg") { mtype = 1; }
        
        // music
        if (href_ext==".mp3" || href_ext==".wav" || href_ext==".oga") {  mtype = 2; }
        
        // video
        if (href_ext==".mp4" || href_ext==".ogv" || href_ext==".ogg" || href.slice(-5)==".webm" || href_ext==".mov") { mtype = 3; }  

        // YouTube
        if (href.match(/[http|https]\:\/\/www\.youtube\.com\/watch\?v=([A-z0-9-_]{11})/) != null) { mtype = 4; }
        // Vimeo
        if (href.match(/[http|https]\:\/\/vimeo\.com\/(\d{8})/) != null) { mtype = 5; }
        
        switch (mtype) {
          case 1:
            extraOpenTags = extraOpenTags + '<img src="' + href.replace(/\"/g, '&quot;') + '"><br>';
            break;
          case 2:
            extraOpenTags = extraOpenTags + '<audio controls preload="metadata" src="' + href.replace(/\"/g, '&quot;') + '"></audio><br>';
            break;
          case 3:
            extraOpenTags = extraOpenTags + '<video controls preload="metadata" src="' + href.replace(/\"/g, '&quot;') + '"></video><br>';
            break;
          case 4:
            var youtube_id = href.match(/[http|https]\:\/\/www\.youtube\.com\/watch\?v=([A-z0-9-_]{11})/)[1];
            txt = 'https://www.youtube.com/watch?v=' + youtube_id;
            extraOpenTags = extraOpenTags + '<div style="height:385px"><iframe width=640 height=385 src="https://www.youtube.com/embed/' + youtube_id + '"></iframe></div><br>';
            break;
          case 5:
            var vimeo_id = href.match(/[http|https]\:\/\/vimeo\.com\/(\d{8})/)[1];
            txt = 'https://vimeo.com/' + vimeo_id;
            extraOpenTags = extraOpenTags + '<div style="height:338px"><iframe width=640 height=338 src="https://player.vimeo.com/video/' + vimeo_id + '?title=0&byline=0&portrait=0"></iframe></div><br>';
            break;
          // if nothing applies, consider it as a normal link
          default:
            extraOpenTags = extraOpenTags + '<a href="' + href.replace(/\"/g, '&quot;') + '">';
            extraCloseTags = '</a>' + extraCloseTags;
            break;
        }
        
      }
      if (simpleTags)
      {
        simpleTags.sort();
        extraOpenTags = extraOpenTags + '<' + simpleTags.join('><') + '>';
        simpleTags.reverse();
        extraCloseTags = '</' + simpleTags.join('></') + '>' + extraCloseTags;
      }
      html.push('<span class="', cls || '', '">', extraOpenTags, perTextNodeProcess(domline.escapeHTML(txt)), extraCloseTags, '</span>');
    }
  };
  result.clearSpans = function()
  {
    html = [];
    lineClass = ''; // non-null to cause update
    result.lineMarker = 0;
  };

  function writeHTML()
  {
    var newHTML = perHtmlLineProcess(html.join(''));
    if (!newHTML)
    {
      if ((!document) || (!optBrowser))
      {
        newHTML += '&nbsp;';
      }
      else if (!browser.msie)
      {
        newHTML += '<br/>';
      }
    }
    if (nonEmpty)
    {
      newHTML = (preHtml || '') + newHTML + (postHtml || '');
    }
    html = preHtml = postHtml = null; // free memory
    if (newHTML !== curHTML)
    {
      curHTML = newHTML;
      result.node.innerHTML = curHTML;
    }
    if (lineClass !== null) result.node.className = lineClass;
  }
  result.prepareForAdd = writeHTML;
  result.finishUpdate = writeHTML;
  result.getInnerHTML = function()
  {
    return curHTML || '';
  };

  return result;
};

domline.escapeHTML = function(s)
{
  var re = /[&<>'"]/g;
  /']/; // stupid indentation thing
  if (!re.MAP)
  {
    // persisted across function calls!
    re.MAP = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&#34;',
      "'": '&#39;'
    };
  }
  return s.replace(re, function(c)
  {
    return re.MAP[c];
  });
};

domline.processSpaces = function(s, doesWrap)
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
