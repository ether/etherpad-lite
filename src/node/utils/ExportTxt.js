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

var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var padManager = require("../db/PadManager");
var _analyzeLine = require('./ExportHelper')._analyzeLine;
const ExportHtml = require('./ExportHtml');
const htmlToText = require('@mxiii/html-to-text');
const EtherpadHtmlToText = require('./HtmlToText').EtherpadHtmlToText;

// This is slightly different than the HTML method as it passes the output to getTXTFromAText
var getPadTXT = async function(pad, revNum)
{
  if (revNum != undefined) {
    var html = await ExportHtml.getPadHTML(pad, revNum);
  }else{
    var html = await ExportHtml.getPadHTML(pad);
  }

  let text = htmlToText.fromString(html, EtherpadHtmlToText);

  return text;
}


exports.getPadTXTDocument = async function(padId, revNum)
{
  let pad = await padManager.getPad(padId);
  return getPadTXT(pad, revNum);
}
