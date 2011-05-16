/**
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

/*
The Pad Module trys to simulate the pad object from EtherPad. You can find the original code in /etherpad/src/etherpad/pad/model.js
see https://github.com/ether/pad/blob/master/etherpad/src/etherpad/pad/model.js
*/

var Changeset = require("./Models/Pad");

/**
 * A Array with all known Pads
 */
globalPads = [];

/**
 * Return a Function Wrapper to work with the Pad
 * @param id A String with the id of the pad
 * @param createIfNotExist A Boolean which says the function if it should create the Pad if it not exist
 */
exports.getPad = function(id, createIfNotExist)
{  
	var pad = globalPads[id];

  if(!pad && createIfNotExist == true)
  {
    pad = new Pad(id);
    globalPads[id] = pad;
    console.log(pad);
  }
  
  if(!pad) return null;
  
  //globalPads[id].timestamp = new Date().getTime();
  
  return pad;
}

/**
 * Ensures that the Pad exists
 * @param id The Pad id
 */
exports.ensurePadExists = function(id)
{
  if(!globalPads[id])
  {
    exports.getPad(id, true);
  }
}