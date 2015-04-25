/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

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

define(['ep_etherpad-lite/static/js/pluginfw/hooks', 'underscore'], function (hooks, _) {
  Ace2Editor.registry = {
    nextId: 1
  };

  function scriptTag(source) {
    return (
      '<script type="text/javascript">\n'
      + source.replace(/<\//g, '<\\/') +
      '</script>'
    )
  }

  function Ace2Editor()
  {
    var ace2 = Ace2Editor;

    var editor = {};
    var info = {
      editor: editor,
      id: (ace2.registry.nextId++)
    };
    var loaded = false;

    var actionsPendingInit = [];

    function pendingInit(func, optDoNow)
    {
      return function()
      {
        var that = this;
        var args = arguments;
        var action = function()
        {
          func.apply(that, args);
        }
        if (optDoNow)
        {
          optDoNow.apply(that, args);
        }
        if (loaded)
        {
          action();
        }
        else
        {
          actionsPendingInit.push(action);
        }
      };
    }

    function doActionsPendingInit()
    {
      _.each(actionsPendingInit, function(fn,i){
        fn()
      });
      actionsPendingInit = [];
    }

    ace2.registry[info.id] = info;

    // The following functions (prefixed by 'ace_')  are exposed by editor, but
    // execution is delayed until init is complete
    var aceFunctionsPendingInit = ['importText', 'importAText', 'focus',
    'setEditable', 'getFormattedCode', 'setOnKeyPress', 'setOnKeyDown',
    'setNotifyDirty', 'setProperty', 'setBaseText', 'setBaseAttributedText',
    'applyChangesToBase', 'applyPreparedChangesetToBase',
    'setUserChangeNotificationCallback', 'setAuthorInfo',
    'setAuthorSelectionRange', 'callWithAce', 'execCommand', 'replaceRange'];

    _.each(aceFunctionsPendingInit, function(fnName,i){
      var prefix = 'ace_';
      var name = prefix + fnName;
      editor[fnName] = pendingInit(function(){
        info[prefix + fnName].apply(this, arguments);
      });
    });

    editor.exportText = function()
    {
      if (!loaded) return "(awaiting init)\n";
      return info.ace_exportText();
    };

    editor.getFrame = function()
    {
      return info.frame || null;
    };

    editor.getDebugProperty = function(prop)
    {
      return info.ace_getDebugProperty(prop);
    };

    editor.getInInternationalComposition = function()
    {
      if (!loaded) return false;
      return info.ace_getInInternationalComposition();
    };

    // prepareUserChangeset:
    // Returns null if no new changes or ACE not ready.  Otherwise, bundles up all user changes
    // to the latest base text into a Changeset, which is returned (as a string if encodeAsString).
    // If this method returns a truthy value, then applyPreparedChangesetToBase can be called
    // at some later point to consider these changes part of the base, after which prepareUserChangeset
    // must be called again before applyPreparedChangesetToBase.  Multiple consecutive calls
    // to prepareUserChangeset will return an updated changeset that takes into account the
    // latest user changes, and modify the changeset to be applied by applyPreparedChangesetToBase
    // accordingly.
    editor.prepareUserChangeset = function()
    {
      if (!loaded) return null;
      return info.ace_prepareUserChangeset();
    };

    editor.getUnhandledErrors = function()
    {
      if (!loaded) return [];
      // returns array of {error: <browser Error object>, time: +new Date()}
      return info.ace_getUnhandledErrors();
    };

    function pushStyleTagsFor(buffer, files) {
      for (var i = 0, ii = files.length; i < ii; i++) {
        var file = files[i];
        buffer.push('<link rel="stylesheet" type="text/css" href="' + file + '"\/>');
      }
    }

    editor.destroy = pendingInit(function()
    {
      info.ace_dispose();
      info.frame.parentNode.removeChild(info.frame);
      delete ace2.registry[info.id];
      info = null; // prevent IE 6 closure memory leaks
    });

    editor.init = function(containerId, initialCode, doneFunc)
    {
      editor.importText(initialCode);

      info.onEditorReady = function()
      {
        loaded = true;
        doActionsPendingInit();
        doneFunc();
      };

      requirejs(["ep_etherpad-lite/static/js/ace2_inner"], function (Ace2Inner) {
        var editorId = info.id;
        var editorInfo = Ace2Editor.registry[editorId];
        Ace2Inner.init(editorInfo);
      });
    };

    return editor;
  }

  return {Ace2Editor: Ace2Editor};
});
