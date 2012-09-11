/**
 * Handles the preview requests
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
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

var ERR = require("async-stacktrace");
var padManager = require("../db/PadManager");

/**
 * do a requested preview
 */

function _cleanText(text)
{
  if (!text)
    return null;

  var atext = text.split('\n');
  var clean = Array();
  for (n in atext)
  {
    var line = atext[n];

    if (line[0] === "*")
      line = line.substring(1);

    clean.push(line);
  }
  return clean.join('\n');
}

exports.doPreview = function(req, res, padId, type)
{
  padManager.getPad(padId, function(err, pad)
  {
    ERR(err);
    if(type == "html")
    {
      res.header("Content-Type","text/html; charset=utf-8");
      if(req.params.rev){
        pad.getInternalRevisionAText(req.params.rev, function(junk, text)
        {
          res.write(_cleanText(text.text));
        });
      }
      else
      {
        res.write(_cleanText(pad.text()));
      }
      res.end();
    }
  });
};
