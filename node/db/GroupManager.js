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
var randomString = require("../utils/randomstring");
var async = require("async");

var GroupManager = function GroupManager(db, padManager, SessionManager) {
    this.db = db;
    this.padManager = padManager;
    this.SessionManager = SessionManager;

};

exports.GroupManager = GroupManager;

GroupManager.prototype.deleteGroup = function(groupID, callback)
{
  var group;
  var that = this;

  async.series([
    //ensure group exists
    function (callback)
    {
      //try to get the group entry
      that.db.get("group:" + groupID, function (err, _group)
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
        that.padManager.getPad(padID, function(err, pad)
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
      that.db.get("group2sessions:" + groupID, function (err, group2sessions)
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
      that.db.remove("group2sessions:" + groupID);
      that.db.remove("group:" + groupID);
      callback();
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    callback();
  });
};

GroupManager.prototype.doesGroupExist = function(groupID, callback)
{
  //try to get the group entry
  this.db.get("group:" + groupID, function (err, group)
  {
    if(ERR(err, callback)) return;
    callback(null, group != null);
  });
};

GroupManager.prototype.createGroup = function(callback)
{
  //search for non existing groupID
  var groupID = "g." + randomString(16);

  //create the group
  this.db.set("group:" + groupID, {pads: {}});
  callback(null, {groupID: groupID});
};

GroupManager.prototype.createGroupIfNotExistsFor = function(groupMapper, callback)
{
  var that = this;
  //ensure mapper is optional
  if(typeof groupMapper != "string")
  {
    callback(new customError("groupMapper is no string","apierror"));
    return;
  }

  //try to get a group for this mapper
  this.db.get("mapper2group:"+groupMapper, function(err, groupID)
  {
     if(ERR(err, callback)) return;

     //there is no group for this mapper, let's create a group
     if(groupID == null)
     {
       that.createGroup(function(err, responseObj)
       {
         if(ERR(err, callback)) return;

         //create the mapper entry for this group
         that.db.set("mapper2group:"+groupMapper, responseObj.groupID);

         callback(null, responseObj);
       });
     }
     //there is a group for this mapper, let's return it
     else
     {
       if(ERR(err, callback)) return;
       callback(null, {groupID: groupID});
     }
  });
};

GroupManager.prototype.createGroupPad = function(groupID, padName, text, callback)
{
  var that = this;
  //create the padID
  var padID = groupID + "$" + padName;

  async.series([
    //ensure group exists
    function (callback)
    {
      that.doesGroupExist(groupID, function(err, exists)
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
      that.padManager.doesPadExists(padID, function(err, exists)
      {
        if(ERR(err, callback)) return;

        //pad exists already
        if(exists)
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
      that.padManager.getPad(padID, text, function(err)
      {
        if(ERR(err, callback)) return;
        callback();
      });
    },
    //create an entry in the group for this pad
    function (callback)
    {
      that.db.setSub("group:" + groupID, ["pads", padID], 1);
      callback();
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    callback(null, {padID: padID});
  });
};

GroupManager.prototype.listPads = function(groupID, callback)
{
  var that = this;
  this.doesGroupExist(groupID, function(err, exists)
  {
    if(ERR(err, callback)) return;

    //group does not exist
    if(!exists)
    {
      callback(new customError("groupID does not exist","apierror"));
    }
    //group exists, let's get the pads
    else
    {
      that.db.getSub("group:" + groupID, ["pads"], function(err, pads)
      {
        if(ERR(err, callback)) return;
        callback(null, {padIDs: pads});
      });
    }
  });
};
