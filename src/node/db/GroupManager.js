/**
 * The Group Manager provides functions to manage groups in the database
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
var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
var db = require("./DB").db;
var async = require("async");
var padManager = require("./PadManager");
var sessionManager = require("./SessionManager");

exports.listAllGroups = function(callback) {
  db.get("groups", function (err, groups) {
    if(ERR(err, callback)) return;
    
    // there are no groups
    if(groups == null) {
      callback(null, {groupIDs: []});
      return;
    }
    
    var groupIDs = [];
    for ( var groupID in groups ) {
      groupIDs.push(groupID);
    }
    callback(null, {groupIDs: groupIDs});
  });
}
 
exports.deleteGroup = function(groupID, callback)
{
  var group;

  async.series([
    //ensure group exists 
    function (callback)
    {
      //try to get the group entry
      db.get("group:" + groupID, function (err, _group)
      {
        if(ERR(err, callback)) return;
        
        //group does not exist
        if(_group == null)
        {
          callback(new customError("groupID does not exist","apierror"));
        }
        //group exists, everything is fine
        else
        {
          group = _group;
          callback();
        }
      });
    },
    //iterate trough all pads of this groups and delete them
    function(callback)
    {
      //collect all padIDs in an array, that allows us to use async.forEach
      var padIDs = [];
      for(var i in group.pads)
      {
        padIDs.push(i);
      }
      
      //loop trough all pads and delete them 
      async.forEach(padIDs, function(padID, callback)
      {
        padManager.getPad(padID, function(err, pad)
        {
          if(ERR(err, callback)) return;
          
          pad.remove(callback);
        });
      }, callback);
    },
    //iterate trough group2sessions and delete all sessions
    function(callback)
    {
      //try to get the group entry
      db.get("group2sessions:" + groupID, function (err, group2sessions)
      {
        if(ERR(err, callback)) return;
        
        //skip if there is no group2sessions entry
        if(group2sessions == null) {callback(); return}
        
        //collect all sessions in an array, that allows us to use async.forEach
        var sessions = [];
        for(var i in group2sessions.sessionsIDs)
        {
          sessions.push(i);
        }
        
        //loop trough all sessions and delete them 
        async.forEach(sessions, function(session, callback)
        {
          sessionManager.deleteSession(session, callback);
        }, callback);
      });
    },
    //remove group and group2sessions entry
    function(callback)
    {
      db.remove("group2sessions:" + groupID);
      db.remove("group:" + groupID);
      callback();
    },
    //unlist the group
    function(callback)
    {
      exports.listAllGroups(function(err, groups) {
        if(ERR(err, callback)) return;
        groups = groups? groups.groupIDs : [];

        // it's not listed
        if(groups.indexOf(groupID) == -1) {
          callback();
          return;
        }

        groups.splice(groups.indexOf(groupID), 1);
        
        // store empty groupe list
        if(groups.length == 0) {
          db.set("groups", {});
          callback();
          return;
        }

        // regenerate group list
        var newGroups = {};
        async.forEach(groups, function(group, cb) {
          newGroups[group] = 1;
          cb();
        },function() {
          db.set("groups", newGroups);
          callback();
        });
      });
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    callback();
  });
}
 
exports.doesGroupExist = function(groupID, callback)
{
  //try to get the group entry
  db.get("group:" + groupID, function (err, group)
  {
    if(ERR(err, callback)) return;
    callback(null, group != null);
  });
}

exports.createGroup = function(callback)
{
  //search for non existing groupID
  var groupID = "g." + randomString(16);
  
  //create the group
  db.set("group:" + groupID, {pads: {}});
  
  //list the group
  exports.listAllGroups(function(err, groups) {
    if(ERR(err, callback)) return;
    groups = groups? groups.groupIDs : [];
    
    groups.push(groupID);
    
    // regenerate group list
    var newGroups = {};
    async.forEach(groups, function(group, cb) {
      newGroups[group] = 1;
      cb();
    },function() {
      db.set("groups", newGroups);
      callback(null, {groupID: groupID});
    });
  });
}

exports.createGroupIfNotExistsFor = function(groupMapper, callback)
{
  //ensure mapper is optional
  if(typeof groupMapper != "string")
  {
    callback(new customError("groupMapper is no string","apierror"));
    return;
  }
  
  //try to get a group for this mapper
  db.get("mapper2group:"+groupMapper, function(err, groupID)
  {
     if(ERR(err, callback)) return;
     
     // there is a group for this mapper
     if(groupID) {
       exports.doesGroupExist(groupID, function(err, exists) {
         if(ERR(err, callback)) return;
         if(exists) return callback(null, {groupID: groupID});
         
         // hah, the returned group doesn't exist, let's create one
         createGroupForMapper(callback)
       })
     }
     //there is no group for this mapper, let's create a group
     else {
       createGroupForMapper(callback)
     }
     
     function createGroupForMapper(cb) {
       exports.createGroup(function(err, responseObj)
       {
         if(ERR(err, cb)) return;
         
         //create the mapper entry for this group
         db.set("mapper2group:"+groupMapper, responseObj.groupID);
         
         cb(null, responseObj);
       });
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
        if(ERR(err, callback)) return;
        
        //group does not exist
        if(exists == false)
        {
          callback(new customError("groupID does not exist","apierror"));
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
        if(ERR(err, callback)) return;
        
        //pad exists already
        if(exists == true)
        {
          callback(new customError("padName does already exist","apierror"));
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
        if(ERR(err, callback)) return;
        callback();
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
    if(ERR(err, callback)) return;
    callback(null, {padID: padID});
  });
}

exports.listPads = function(groupID, callback)
{
  exports.doesGroupExist(groupID, function(err, exists)
  {
    if(ERR(err, callback)) return;
    
    //group does not exist
    if(exists == false)
    {
      callback(new customError("groupID does not exist","apierror"));
    }
    //group exists, let's get the pads
    else
    {
      db.getSub("group:" + groupID, ["pads"], function(err, result)
      {
        if(ERR(err, callback)) return;
        var pads = [];
        for ( var padId in result ) {
          pads.push(padId);
        }
        callback(null, {padIDs: pads});
      });
    }
  });
}
