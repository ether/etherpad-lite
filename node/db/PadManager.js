/**
 * The Pad Manager is a Factory for pad Objects
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
var customError = require("../utils/customError");
var Pad = require("../db/Pad").Pad;

/**
 * An Object containing all known Pads. Provides "get" and "set" functions,
 * which should be used instead of indexing with brackets. These prepend a
 * colon to the key, to avoid conflicting with built-in Object methods or with
 * these functions themselves.
 *
 * If this is needed in other places, it would be wise to make this a prototype
 * that's defined somewhere more sensible.
 */

var PadManager = function PadManager(settings, db, authorManager, readOnlyManager) {
    this.settings = settings;
    this.db = db;
    this.authorManager = authorManager;
    this.readOnlyManager = readOnlyManager;

    this.globalPads = {
        get: function (name) { return this[':'+name]; },
        set: function (name, value) { this[':'+name] = value; },
        remove: function (name) { delete this[':'+name]; }
    };

};

exports.PadManager = PadManager;

/**
 * An array of padId transformations. These represent changes in pad name policy over
 * time, and allow us to "play back" these changes so legacy padIds can be found.
 */
var padIdTransforms = [
  [/\s+/g, '_']
];

/**
 * Returns a Pad Object with the callback
 * @param id A String with the id of the pad
 * @param {Function} callback
 */
PadManager.prototype.getPad = function getPad(id, text, callback)
{
  var that = this;

  //TODO remove api specific shit
  //check if this is a valid padId
  if(!this.isValidPadId(id))
  {
    callback(new customError(id + " is not a valid padId","apierror"));
    return;
  }

  //make text an optional parameter
  if(typeof text == "function")
  {
    callback = text;
    text = null;
  }

  //check if this is a valid text
  if(text != null)
  {
    //check if text is a string
    if(typeof text != "string")
    {
      callback(new customError("text is not a string","apierror"));
      return;
    }

    //check if text is less than 100k chars
    if(text.length > 100000)
    {
      callback(new customError("text must be less than 100k chars","apierror"));
      return;
    }
  }

  var pad = this.globalPads.get(id);

  //return pad if its already loaded
  if(pad != null) {
    callback(null, pad);
  }
  //try to load pad
  else {
    pad = new Pad(id);

    //add some references
    //TODO is this realy nice?
    pad.padManager = this;
    pad.db = this.db;
    pad.readOnlyManager = this.readOnlyManager;
    pad.authorManager = this.authorManager;

    //initalize the pad
    if(!text) {
        text = this.settings.defaultPadText;
    }
    pad.init(text, function(err) {
      if(ERR(err, callback)) return;

      that.globalPads.set(id, pad);
      callback(null, pad);
    });
  }
};

//checks if a pad exists
PadManager.prototype.doesPadExists = function doesPadExists(padId, callback)
{
  this.db.get("pad:"+padId, function(err, value)
  {
    if(ERR(err, callback)) return;
    callback(null, value != null);
  });
};

//returns a sanitized padId, respecting legacy pad id formats
PadManager.prototype.sanitizePadId = function sanitizePadId(padId, callback) {
  var that = this;
  var transform_index = arguments[2] || 0;
  //we're out of possible transformations, so just return it
  if(transform_index >= padIdTransforms.length)
  {
    callback(padId);
  }
  //check if padId exists
  else
  {
    this.doesPadExists(padId, function(junk, exists)
    {
      if(exists)
      {
        callback(padId);
      }
      else
      {
        //get the next transformation *that's different*
        var transformedPadId = padId;
        while(transformedPadId == padId && transform_index < padIdTransforms.length)
        {
          transformedPadId = padId.replace(padIdTransforms[transform_index][0], padIdTransforms[transform_index][1]);
          transform_index += 1;
        }
        //check the next transform
        that.sanitizePadId(transformedPadId, callback, transform_index);
      }
    });
  }
};

PadManager.prototype.isValidPadId = function(padId) {
    return (/^(g.[a-zA-Z0-9]{16}\$)?[^$]{1,50}$/).test(padId);
};

//removes a pad from the array
Pad.prototype.unloadPad = function unloadPad(padId) {
  if(this.globalPads.get(padId))
    this.globalPads.remove(padId);
};
