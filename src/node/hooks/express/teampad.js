var express = require('express'),
    async = require('async'),
    eejs = require('ep_etherpad-lite/node/eejs'),
    teamManager = require('ep_etherpad-lite/node/db/TeamManager'),
    sessionManager = require('ep_etherpad-lite/node/db/SessionManager'),
    padManager = require('ep_etherpad-lite/node/db/PadManager'),
    https = require('https');

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.use(express.bodyParser());

  // TODO use more generic, pluggable auth, hardcoded to persona for now
  args.app.post('/teampad/verify', function(req, res) {
    console.log('sign in attempt');
    var body = JSON.stringify({
      assertion: req.param('assertion', null),
      audience: 'http://' + req.headers.host
    });

    var vreq = https.request({
        host: 'persona.org',
        path: '/verify',
        method: 'POST',
        headers: {
          'Content-Length': body.length,
          'Content-Type': 'application/json'
        }
    }, function(vres) {
      var body = '';
      vres.on('data', function(chunk) { body += chunk; });
      vres.on('end', function() {
        try {
          account = JSON.parse(body).email;
          validUntil = JSON.parse(body).expires;
          console.log(body);
          var sessionID = req.signedCookies.express_sid;
          sessionManager.createVerifiedSession(
          sessionID, account, validUntil, function(err, result) {
            if (err) {
              console.log(err);
              return;
            }
          });
          console.log(account + ' logged in');
        } catch(e) {
          console.log(e);
        }
      });
      res.redirect('/teampad');
    });
    vreq.write(body);
    vreq.end();
  });

  args.app.post('/teampad/createteam', function(req, res) {
    var sessionID = req.signedCookies.express_sid,
        currentUser = null,
        signedIn = false,
        teamName = null,
        rawTeamName = req.param('teamname', null);

    async.waterfall([
      function(callback) {
        sessionManager.getSessionInfo(sessionID, callback);
      },
      function(result, callback) {
        currentUser = result.account;
        signedIn = true;
        callback();
      },
      function(callback) {
        console.log('about to sanitize ' + rawTeamName);
        padManager.sanitizePadId(rawTeamName, function(teamName) {
          callback(null, teamName);
        }) 
      },
      function(result, callback) {
        teamName = result;
        console.log('sanitized ' + teamName);
        teamManager.createTeam(teamName, [], [currentUser], [currentUser],
          callback);
      },
      function(teamID, callback) {
        console.log(teamID + ' created for ' + teamName);
        res.redirect('/teampad');
      }
    ], function(err) {
      console.log('error: ' + err);
      res.redirect('/teampad');
    });
  });

  args.app.post('/teampad/createpad', function(req, res) {
    var sessionID = req.signedCookies.express_sid;

    var teamName = null,
        padName = null,
        currentUser = null,
        signedIn = false,
        teamID = req.param('teamID', null),
        rawTeamName = req.param('teamname', null),
        rawPadName = req.param('padname', null);

    async.waterfall([
      function(callback) {
        sessionManager.getSessionInfo(sessionID, callback);
      },
      function(result, callback) {
        currentUser = result.account;
        signedIn = true;
        padManager.sanitizePadId(rawTeamName, function(teamName) {
          callback(null, teamName);
        });
      },
      function(result, callback) {
        teamName = result;
        padManager.sanitizePadId(rawPadName, function(padName) {
          callback(null, padName);
        });
      },
      function(result, callback) {
        padName = result;
        teamManager.createTeamPad(teamName, teamID, padName, 'super sekrit!',
          callback);
      },
      function(callback) {
        console.log(padName + ' created for ' + teamName);
        res.redirect('/teampad/' + teamName);
      }
    ], function(err) {
      console.log(err);
      res.redirect('/teampad');
    });
  });

  args.app.post('/teampad/addaccount', function(req, res) {
    var sessionID = req.signedCookies.express_sid,
        currentUser = null,
        signedIn = false,
        teamName = null,
        teamID = req.param('teamID', null),
        rawTeamName = req.param('teamname', null),
        account = req.param('accountname', null);

    async.waterfall([
      function(callback) {
        sessionManager.getSessionInfo(sessionID, callback);
      },
      function(result, callback) {
        currentUser = result.account;
        padManager.sanitizePadId(rawTeamName, function(teamName) {
          callback(null, teamName);
        });
      },
      function(result, callback) {
        teamName = result;
        console.log('teamID: ' + teamID);
        teamManager.addAccountToTeam(teamID, account, callback);
      },
      function(result, callback) {
        teamID = result;
        console.log(account+ ' added to ' + teamID);
        res.redirect('/teampad/' + teamName);
      },
    ], function(err) {
      console.log(err);
    });
  });

  args.app.get('/teampad', function(req, res) { 
    var sessionID = req.signedCookies.express_sid;
    var currentUser = null;
    var signedIn = false;

    sessionManager.getSessionInfo(sessionID, function(err, result) {
      if (err) {
        console.log(err);
      } else {
        currentUser = result.account;
        signedIn = true;
      }
    });

    var teamsInfo = [];

    // TODO an index for finding teams by account would make this
    //    *way* faster and easier...
    teamManager.listAllTeams(function(err, teams) {
      for (var team in teams.teamIDs) {
        teamID = teams.teamIDs[team];
        teamManager.listInfo(teamID, function(err, info) {
          if (info.accounts) {
            if (info.accounts.indexOf(currentUser) != -1) {
              teamsInfo.push(info); 
            }
          }
        });
      } 
      res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

      res.send(eejs.require('ep_etherpad-lite/templates/teampad/index.html',
                { teamsInfo: teamsInfo,
                  signedIn: signedIn,
                  currentUser: currentUser}));
    });
  });

  args.app.get('/teampad/:teamName', function(req, res) { 
    var sessionID = req.signedCookies.express_sid;
    var currentUser = null;
    var signedIn = false;

    sessionManager.getSessionInfo(sessionID, function(err, result) {
      if (err) {
        console.log(err);
        res.redirect('/teampad');
      } else {
        currentUser = result.account;
        signedIn = true;

        var teamName = req.path.split('/')[2];
        var teamInfo = {
          pads: [],
          accounts: [],
          name: [],
          teamID: []
        };

        // TODO an index for finding pads/accounts by team would make this
        //    *way* faster and easier...
        teamManager.listAllTeams(function(err, teams) {
          for (var team in teams.teamIDs) {
            teamID = teams.teamIDs[team];
            teamManager.listInfo(teamID, function(err, info) {
              if (info.name) {
                if (teamName === info.name) {
                  teamInfo = info;
                  teamInfo.teamID = teamID;
                }
              }
            });
          } 
    
          res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

          res.send(eejs.require('ep_etherpad-lite/templates/teampad/team.html',
                    {teamInfo: teamInfo,
                     signedIn: false}));
        });
      }
    });
  });

  // TODO implement, for now we are linking to normal pads via templates
  args.app.get('/teampad/:teamName/:padName', function(req, res) { 
    var sessionID = req.signedCookies.express_sid;
    var currentUser = null;
    var signedIn = false;

    sessionManager.getSessionInfo(sessionID, function(err, result) {
      if (err) {
        console.log(err);
        res.redirect('/teampad');
      } else {
        currentUser = result.account;
        signedIn = true;
      }
    });

    var padName = req.path.split('/')[3];

    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

    res.send(eejs.require('ep_etherpad-lite/templates/teampad/pad.html'));
  });
}
