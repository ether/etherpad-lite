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

function makeCSSManager(emptyStylesheetTitle, doc)
{
  if (doc === true)
  {
    doc = 'parent';
  } else if (!doc) {
    doc = 'inner';
  }

  function getSheetByTitle(title)
  {
    if (doc === 'parent')
    {
      win = window.parent.parent;
    }
    else if (doc === 'inner') {
      win = window;
    }
    else if (doc === 'outer') {
      win = window.parent;
    }
    else {
        throw "Unknown dynamic style container";
    }
    var allSheets = win.document.styleSheets;

    for (var i = 0; i < allSheets.length; i++)
    {
      var s = allSheets[i];
      if (s.title == title)
      {
        return s;
      }
    }
    return null;
  }

  var browserSheet = getSheetByTitle(emptyStylesheetTitle);

  function browserRules()
  {
    return (browserSheet.cssRules || browserSheet.rules);
  }

  function browserDeleteRule(i)
  {
    if (browserSheet.deleteRule) browserSheet.deleteRule(i);
    else browserSheet.removeRule(i);
  }

  function browserInsertRule(i, selector)
  {
    if (browserSheet.insertRule) browserSheet.insertRule(selector + ' {}', i);
    else browserSheet.addRule(selector, null, i);
  }
  var selectorList = [];

  function indexOfSelector(selector)
  {
    for (var i = 0; i < selectorList.length; i++)
    {
      if (selectorList[i] == selector)
      {
        return i;
      }
    }
    return -1;
  }

  function selectorStyle(selector)
  {
    var i = indexOfSelector(selector);
    if (i < 0)
    {
      // add selector
      browserInsertRule(0, selector);
      selectorList.splice(0, 0, selector);
      i = 0;
    }
    return browserRules().item(i).style;
  }

  function removeSelectorStyle(selector)
  {
    var i = indexOfSelector(selector);
    if (i >= 0)
    {
      browserDeleteRule(i);
      selectorList.splice(i, 1);
    }
  }

  return {
    selectorStyle: selectorStyle,
    removeSelectorStyle: removeSelectorStyle,
    info: function()
    {
      return selectorList.length + ":" + browserRules().length;
    }
  };
}

exports.makeCSSManager = makeCSSManager;
