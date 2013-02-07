/**
 * The Team Manager provides functions to manage teams in the database
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

exports.listAllTeams = function(callback) {
  db.get("teams", function (err, teams) {
    if(ERR(err, callback)) return;
    
    // there are no teams
    if(teams == null) {
      callback(null, {teamIDs: []});
      return;
    }
    
    var teamIDs = [];
    for ( var teamID in teams) {
      teamIDs.push(teamID);
    }
    callback(null, {teamIDs: teamIDs});
  });
}
 
exports.doesTeamExist = function(teamID, callback)
{
  //try to get the team entry
  db.get("team:" + teamID, function (err, team)
  {
    if(ERR(err, callback)) return;
    callback(null, team != null);
  });
}

exports.createTeam = function(teamName, pads, accounts, admins, callback)
{
  //search for non existing teamID
  var teamID = "t." + randomString(16);

  //create the team
  db.set("team:" + teamID, {name: teamName, pads: pads, accounts: accounts,
                            admins: admins});
  
  //list the team
  exports.listAllTeams(function(err, teams) {
    if(ERR(err, callback)) return;
    teams = teams? teams.teamIDs : [];
    
    teams.push(teamID);
    
    // regenerate team list
    var newTeams = {};
    async.forEach(teams, function(team, cb) {
      newTeams[team] = 1;
      cb();
    },function() {
      db.set("teams", newTeams);
      callback(null, {teamID: teamID});
    });
  });
}

exports.createTeamPad = function(teamName, teamID, padName, text, callback)
{
  //create the padID
  var padID = teamName + "+" + padName;

  async.series([
    //ensure team exists 
    function (callback)
    {
      exports.doesTeamExist(teamID, function(err, exists)
      {
        if(ERR(err, callback)) return;
        
        //team does not exist
        if(exists == false)
        {
          callback(new customError("teamID does not exist","apierror"));
        }
        //team exists, everything is fine
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
      padManager.getPad(padID, text, function(err, pad)
      {
        if(ERR(err, callback)) return;

        pad.setTeamStatus(true);
     
        callback();
      });
    },
    //add to DB
    function (callback)
    {
      db.get("team:" + teamID, function(err, result)
      {
        if(ERR(err, callback)) return;

        result.pads.push(padID);
        db.set('team:' + teamID, result);
      });
      callback();
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    callback(null, {padID: padID});
  });
}

exports.listInfo = function(teamID, callback)
{
  exports.doesTeamExist(teamID, function(err, exists)
  {
    if(ERR(err, callback)) return;
    
    //team does not exist
    if(exists == false)
    {
      callback(new customError("teamID does not exist","apierror"));
    }
    //team exists, let's get the info
    else
    {
      db.get("team:" + teamID, function(err, result)
      {
        if(ERR(err, callback)) return;
        
        callback(null, result);
      });
    }
  });
}

exports.addAccountToTeam = function(teamID, account, callback)
{
  exports.doesTeamExist(teamID, function(err, exists)
  {
    if(ERR(err, callback)) return;
    
    //team does not exist
    if(exists == false)
    {
      console.log('debug1: ' + teamID);
      callback(new customError("teamID does not exist","apierror"));
    }
    //team exists, let's get the info
    else
    {
      db.get("team:" + teamID, function(err, result)
      {
        if(ERR(err, callback)) return;
        
        result.accounts.push(account);
        console.log('setting team to: ' + result);
        db.set("team:" + teamID, result);
        callback(null, result);
      });
    }
  });
}
