/**
 * The Pad Manager is a Factory for pad Objects
 */

/*
 * 2011 Peter 'Pita' Martischka
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

var Changeset = require("./Models/Pad");

/**
 * A Array with all known Pads
 */
globalPads = [];

/**
 * Returns a Pad Object with the callback
 * @param id A String with the id of the pad
 * @param {Function} callback 
 */
exports.getPad = function(id, callback)
{    
  var pad = globalPads[id];
  
  //return pad if its already loaded
  if(pad != null)
  {
    callback(null, pad);
  }
  //try to load pad
  else
  {
    pad = new Pad(id);
    
    //initalize the pad
    pad.init(function(err)
    {
      if(err)
      {
        callback(err, null);
      }
      else
      {
        globalPads[id] = pad;
        callback(null, pad);
      }
    });
  }
  
  //globalPads[id].timestamp = new Date().getTime();
}
