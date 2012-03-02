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

var HTML_ENTITY_MAP = {
  '&': '&amp;'
, '<': '&lt;'
, '>': '&gt;'
, '"': '&quot;'
, "'": '&#x27;'
, '/': '&#x2F;'
};

// OSWASP Guidlines: &, <, >, ", ' plus forward slash.
var HTML_CHARACTERS_EXPRESSION = /[&"'<>\/]/g;
function escapeHTML(text) {
  return text && text.replace(HTML_CHARACTERS_EXPRESSION, function (c) {
    return HTML_ENTITY_MAP[c] || c;
  });
}

// OSWASP Guidlines: escape all non alphanumeric characters in ASCII space.
var HTML_ATTRIBUTE_CHARACTERS_EXPRESSION =
    /[\x00-\x2F\x3A-\x40\5B-\x60\x7B-\xFF]/g;
function escapeHTMLAttribute(text) {
  return text && text.replace(HTML_ATTRIBUTE_CHARACTERS_EXPRESSION, function (c) {
    return "&#x" + ('00' + c.charCodeAt(0).toString(16)).slice(-2) + ";";
  });
};

// OSWASP Guidlines: escape all non alphanumeric characters in ASCII space.
var JAVASCRIPT_CHARACTERS_EXPRESSION =
    /[\x00-\x2F\x3A-\x40\5B-\x60\x7B-\xFF]/g;
function escapeJavaScriptData(text) {
  return text && text.replace(JAVASCRIPT_CHARACTERS_EXPRESSION, function (c) {
    return "\\x" + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  });
}

exports.escapeHTML = escapeHTML;
exports.escapeHTMLAttribute = escapeHTMLAttribute;
exports.escapeJavaScriptData = escapeJavaScriptData;
