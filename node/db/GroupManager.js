/**
 * The Group Manager provides functions to manage groups in the database
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
 
var db = require("./DB").db;
var async = require("async");
var padManager = require("./PadManager");
 
exports.doesGroupExist = function(groupID, callback)
{
  //try to get the group entry
  db.get("group:" + groupID, function (err, group)
  {
    callback(err, group != null);
  });
}

exports.createGroup = function(callback)
{
  //search for non existing groupID
  var groupID;
  var foundNonExistingGroupID = false;
  async.whilst(
    function () { return !foundNonExistingGroupID; },
    function (callback) 
    {
       //generate a random 10 digit groupID
       groupID = "";
       for(var i=0;i<10;i++)
       {
         groupID+=Math.floor(Math.random()*10);
       }
       
       //check if this groupID already exisits
       exports.doesGroupExist(groupID, function(err, exists)
       {
         foundNonExistingGroupID = !exists;
         callback(err);
       })
    },
    //we found a non existing groupID or an error happend
    function (err) 
    {
      //check for errors
      if(err)
      {
        callback(err);
        return;
      }
      
      //create the group
      db.set("group:" + groupID, {pads: {}});
      callback(null, {groupID: groupID});
    }
  );
}

exports.getMappedGroup4 = function(groupMapper, callback)
{
  //ensure mapper is optional
  if(typeof groupMapper != "string")
  {
    callback({stop: "groupMapper is no string"});
    return;
  }
  
  //try to get a group for this mapper
  db.get("mapper2group:"+groupMapper, function(err, groupID)
  {
     if(err)
     {
       callback(err);
       return;
     }
     
     //there is no group for this mapper, let's create a group
     if(groupID == null)
     {
       exports.createGroup(function(err, responseObj)
       {
         //check for errors
         if(err)
         {
           callback(err);
           return;
         }
         
         //create the mapper entry for this group
         db.set("mapper2group:"+groupMapper, responseObj.groupID);
         
         callback(null, responseObj);
       });
     }
     //there is a group for this mapper, let's return it
     else
     {
       callback(err, {groupID: groupID});
     }
  });
}

exports.createGroupPad = function(groupID, padName, text, callback)
{
  //create the padID
  var padID = groupID + "$" + padName;

  async.series([
    //ensure group exists 
    function (callback)
    {
      exports.doesGroupExist(groupID, function(err, exists)
      {
        //error
        if(err) 
        {
          callback(err);
        }
        //group does not exist
        else if(exists == false)
        {
          callback({stop: "groupID does not exist"});
        }
        //group exists, everything is fine
        else
        {
          callback();
        }
      });
    },
    //ensure pad does not exists
    function (callback)
    {
      padManager.doesPadExists(padID, function(err, exists)
      {
        //error
        if(err) 
        {
          callback(err);
        }
        //pad exists already
        else if(exists == true)
        {
          callback({stop: "padName does already exist"});
        }
        //pad does not exist, everything is fine
        else
        {
          callback();
        }
      });
    },
    //create the pad
    function (callback)
    {
      padManager.getPad(padID, text, function(err)
      {
        callback(err);
      });
    },
    //create an entry in the group for this pad
    function (callback)
    {
      db.setSub("group:" + groupID, ["pads", padID], 1);
      callback();
    }
  ], function(err)
  {
    callback(err, {padID: padID});
  });

  //check if groupID exists
  //check if pad already exists
  //create the pad
  //create the subentry in the padobject
}

exports.listPads = function(groupID, callback)
{
  exports.doesGroupExist(groupID, function(err, exists)
  {
    //error
    if(err) 
    {
      callback(err);
    }
    //group does not exist
    else if(exists == false)
    {
      callback({stop: "groupID does not exist"});
    }
    //group exists, let's get the pads
    else
    {
      db.getSub("group:" + groupID, ["pads"], function(err, pads)
      {
        callback(err, {padIDs: pads});
      });
    }
  });
}
