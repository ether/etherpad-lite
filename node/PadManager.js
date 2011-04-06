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

var Changeset = require("./Changeset");
var AttributePoolFactory = require("./AttributePoolFactory");

/**
 * The initial Text of a Pad
 */
exports.startText = "Welcome to Etherpad Lite.  This pad text is synchronized as you type, so that everyone viewing this page sees the same text.";

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
  if(!globalPads[id] && createIfNotExist == true)
  {
    createPad(id);
  }
  
  if(!globalPads[id])
    return null;
  
  globalPads[id].timestamp = new Date().getTime();
  
  var functionWrapper = {};
  
  functionWrapper.id = id;
  functionWrapper.appendRevision = function (theChangeset, author) {return appendRevision(id, theChangeset, author)};
  functionWrapper.text = function () {return text(id)};
  functionWrapper.atext = function () {return atext(id)};
  functionWrapper.pool = function () {return pool(id)};
  functionWrapper.getHeadRevisionNumber = function () {return getHeadRevisionNumber(id)};
  functionWrapper.getRevisionChangeset = function (revNum) {return getRevisionChangeset(id, revNum)};
  functionWrapper.getRevisionAuthor = function (revNum) {return getRevisionAuthor(id, revNum)};
  functionWrapper.getAllAuthors = function () {return getAllAuthors(id)};
  
  return functionWrapper;
}

/**
 * Ensures that the Pad exists
 * @param id The Pad id
 */
exports.ensurePadExists = function(id)
{
  if(!globalPads[id])
  {
    createPad(id);
  }
}

/**
 * Creates an empty pad
 * @param id The Pad id
 */
function createPad(id)
{
  var pad = {};
  globalPads[id] = pad;
  
  pad.id = id;
  pad.rev = [];
  pad.head = -1;
  pad.atext = Changeset.makeAText("\n");
  pad.apool = AttributePoolFactory.createAttributePool();
  pad.authors = [];
  
  var firstChangeset = Changeset.makeSplice("\n", 0, 0,
                        exports.cleanText(exports.startText));                      
  appendRevision(id, firstChangeset, '');
}

/**
 * Append a changeset to a pad
 * @param id The Pad id
 * @param theChangeset the changeset which should apply to the text
 * @param The author of the revision, can be null
 */
function appendRevision(id, theChangeset, author)
{
  throwExceptionIfPadDontExist(id);

  if(!author)
    author = '';

  var atext = globalPads[id].atext;
  var apool = globalPads[id].apool;
  var newAText = Changeset.applyToAText(theChangeset, atext, apool);
  Changeset.copyAText(newAText, atext);
  
  var newRev = ++globalPads[id].head;
  globalPads[id].rev[newRev] = {};
  globalPads[id].rev[newRev].changeset = theChangeset;
  globalPads[id].rev[newRev].meta = {};
  globalPads[id].rev[newRev].meta.author = author;
  globalPads[id].rev[newRev].meta.timestamp = new Date().getTime();
  
  //ex. getNumForAuthor
  if(author != '')
    apool.putAttrib(['author',author||'']);
  
  if(newRev%100==0)
  {
    globalPads[id].rev[newRev].meta.atext=atext;
  }
}

/**
 * Returns all Authors of a Pad
 * @param id The Pad id
 */
function getAllAuthors(id)
{
  var authors = [];
  
  for(key in globalPads[id].apool.numToAttrib)
  {
    if(globalPads[id].apool.numToAttrib[key][0] == "author" && globalPads[id].apool.numToAttrib[key][1] != "")
    {
      authors.push(globalPads[id].apool.numToAttrib[key][1]);
    }
  }
  
  return authors;
}

/**
 * Returns the plain text of a pad
 * @param id The Pad id
 */
 
function text(id)
{
  throwExceptionIfPadDontExist(id);
  
  return globalPads[id].atext.text;
}

/**
 * Returns the Attributed Text of a pad
 * @param id The Pad id
 */
function atext(id)
{
  throwExceptionIfPadDontExist(id);
  
  return globalPads[id].atext;
}

/**
 * Returns the Attribute Pool whichs the Pad is using
 * @param id The Pad id
 */
function pool(id)
{
  throwExceptionIfPadDontExist(id);
  
  return globalPads[id].apool;
}

/**
 * Returns the latest Revision Number of the Pad
 * @param id The Pad id
 */
function getHeadRevisionNumber(id)
{
  throwExceptionIfPadDontExist(id);
  
  return globalPads[id].head;
}

/**
 * Returns the changeset of a specific revision
 * @param id The Pad id
 * @param revNum The Revision Number
 */
function getRevisionChangeset(id, revNum)
{
  throwExceptionIfPadDontExist(id);
  throwExceptionIfRevDontExist(id, revNum);
  
  return globalPads[id].rev[revNum].changeset;
}

/**
 * Returns the author of a specific revision
 * @param id The Pad id
 * @param revNum The Revision Number
 */
function getRevisionAuthor(id, revNum)
{
  throwExceptionIfPadDontExist(id);
  throwExceptionIfRevDontExist(id, revNum);
  
  return globalPads[id].rev[revNum].meta.author;
}

/**
 * Check if the ID is a valid Pad ID and trows an Exeption if not
 * @param id The Pad id
 */
function throwExceptionIfPadDontExist(id)
{
  if(id == null)
  {
    throw "Padname is null!";
  }
  if(!globalPads[id])
  {
    throw "Pad don't exist!'";
  }
}

/**
 * Check if the Revision of a Pad is valid and throws an Exeption if not
 * @param id The Pad id
 */
function throwExceptionIfRevDontExist(id, revNum)
{
  if(revNum == null)
    throw "revNum is null";

  if((typeof revNum) != "number")
    throw revNum + " is no Number";
    
  if(revNum < 0 || revNum > globalPads[id].head)
    throw "The Revision " + revNum + " don't exist'";
}

/**
 * Copied from the Etherpad source code, don't know what its good for
 * @param txt
 */
exports.cleanText = function (txt) {
  return txt.replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/\t/g, '        ').replace(/\xa0/g, ' ');
}


