/**
 * The pad object, defined with joose
 */

var CommonCode = require('../utils/common_code');
var ERR = require("async-stacktrace");
var Changeset = CommonCode.require("/Changeset");
var AttributePoolFactory = CommonCode.require("/AttributePoolFactory");
var randomString = CommonCode.require('/pad_utils').randomString;
var db = require("./DB").db;
var async = require("async");
var settings = require('../utils/Settings');
var authorManager = require("./AuthorManager");
var padManager = require("./PadManager");
var padMessageHandler = require("../handler/PadMessageHandler");
var readOnlyManager = require("./ReadOnlyManager");
var crypto = require("crypto");

/**
 * Copied from the Etherpad source code. It converts Windows line breaks to Unix line breaks and convert Tabs to spaces
 * @param txt
 */
exports.cleanText = function (txt) {
  return txt.replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/\t/g, '        ').replace(/\xa0/g, ' ');
};


var Pad = function Pad(id) {

  this.atext = Changeset.makeAText("\n");
  this.pool = AttributePoolFactory.createAttributePool();
  this.head = -1;
  this.chatHead = -1;
  this.publicStatus = false;
  this.passwordHash = null;
  this.id = id;

};

exports.Pad = Pad;

Pad.prototype.apool = function apool() {
  return this.pool;
};

Pad.prototype.getHeadRevisionNumber = function getHeadRevisionNumber() {
  return this.head;
};

Pad.prototype.getPublicStatus = function getPublicStatus() {
  return this.publicStatus;
};

Pad.prototype.appendRevision = function appendRevision(aChangeset, author) {
  if(!author)
    author = '';

  var newAText = Changeset.applyToAText(aChangeset, this.atext, this.pool);
  Changeset.copyAText(newAText, this.atext);

  var newRev = ++this.head;

  var newRevData = {};
  newRevData.changeset = aChangeset;
  newRevData.meta = {};
  newRevData.meta.author = author;
  newRevData.meta.timestamp = new Date().getTime();

  //ex. getNumForAuthor
  if(author != '')
    this.pool.putAttrib(['author', author || '']);

  if(newRev % 100 == 0)
  {
    newRevData.meta.atext = this.atext;
  }

  db.set("pad:"+this.id+":revs:"+newRev, newRevData);
  db.set("pad:"+this.id, {atext: this.atext,
                          pool: this.pool.toJsonable(),
                          head: this.head,
                          chatHead: this.chatHead,
                          publicStatus: this.publicStatus,
                          passwordHash: this.passwordHash});
};

Pad.prototype.getRevisionChangeset = function getRevisionChangeset(revNum, callback) {
  db.getSub("pad:"+this.id+":revs:"+revNum, ["changeset"], callback);
};

Pad.prototype.getRevisionAuthor = function getRevisionAuthor(revNum, callback) {
  db.getSub("pad:"+this.id+":revs:"+revNum, ["meta", "author"], callback);
};

Pad.prototype.getRevisionDate = function getRevisionDate(revNum, callback) {
  db.getSub("pad:"+this.id+":revs:"+revNum, ["meta", "timestamp"], callback);
};

Pad.prototype.getAllAuthors = function getAllAuthors() {
  var authors = [];

  for(key in this.pool.numToAttrib)
  {
    if(this.pool.numToAttrib[key][0] == "author" && this.pool.numToAttrib[key][1] != "")
    {
      authors.push(this.pool.numToAttrib[key][1]);
    }
  }

  return authors;
};

Pad.prototype.getInternalRevisionAText = function getInternalRevisionAText(targetRev, callback) {
  var _this = this;

  var keyRev = this.getKeyRevisionNumber(targetRev);
  var atext;
  var changesets = [];

  //find out which changesets are needed
  var neededChangesets = [];
  var curRev = keyRev;
  while (curRev < targetRev)
  {
    curRev++;
    neededChangesets.push(curRev);
  }

  async.series([
    //get all needed data out of the database
    function(callback)
    {
      async.parallel([
        //get the atext of the key revision
        function (callback)
        {
          db.getSub("pad:"+_this.id+":revs:"+keyRev, ["meta", "atext"], function(err, _atext)
          {
            if(ERR(err, callback)) return;
            atext = Changeset.cloneAText(_atext);
            callback();
          });
        },
        //get all needed changesets
        function (callback)
        {
          async.forEach(neededChangesets, function(item, callback)
          {
            _this.getRevisionChangeset(item, function(err, changeset)
            {
              if(ERR(err, callback)) return;
              changesets[item] = changeset;
              callback();
            });
          }, callback);
        }
      ], callback);
    },
    //apply all changesets to the key changeset
    function(callback)
    {
      var apool = _this.apool();
      var curRev = keyRev;

      while (curRev < targetRev)
      {
        curRev++;
        var cs = changesets[curRev];
        atext = Changeset.applyToAText(cs, atext, apool);
      }

      callback(null);
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    callback(null, atext);
  });
};

Pad.prototype.getKeyRevisionNumber = function getKeyRevisionNumber(revNum) {
  return Math.floor(revNum / 100) * 100;
};

Pad.prototype.text = function text() {
  return this.atext.text;
};

Pad.prototype.setText = function setText(newText) {
  //clean the new text
  newText = exports.cleanText(newText);

  var oldText = this.text();

  //create the changeset
  var changeset = Changeset.makeSplice(oldText, 0, oldText.length-1, newText);

  //append the changeset
  this.appendRevision(changeset);
};

Pad.prototype.appendChatMessage = function appendChatMessage(text, userId, time) {
      this.chatHead++;
      //save the chat entry in the database
      db.set("pad:"+this.id+":chat:"+this.chatHead, {"text": text, "userId": userId, "time": time});
      //save the new chat head
      db.setSub("pad:"+this.id, ["chatHead"], this.chatHead);
};

Pad.prototype.getChatMessage = function getChatMessage(entryNum, callback) {
  var _this = this;
  var entry;

  async.series([
    //get the chat entry
    function(callback)
    {
      db.get("pad:"+_this.id+":chat:"+entryNum, function(err, _entry)
      {
        if(ERR(err, callback)) return;
        entry = _entry;
        callback();
      });
    },
    //add the authorName
    function(callback)
    {
      //this chat message doesn't exist, return null
      if(entry == null)
      {
        callback();
        return;
      }

      //get the authorName
      authorManager.getAuthorName(entry.userId, function(err, authorName)
      {
        if(ERR(err, callback)) return;
        entry.userName = authorName;
        callback();
      });
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    callback(null, entry);
  });
};

Pad.prototype.getLastChatMessages = function getLastChatMessages(count, callback) {
  //return an empty array if there are no chat messages
  if(this.chatHead == -1)
  {
    callback(null, []);
    return;
  }

  var _this = this;

  //works only if we decrement the amount, for some reason
  count--;

  //set the startpoint
  var start = this.chatHead-count;
  if(start < 0)
    start = 0;

  //set the endpoint
  var end = this.chatHead;

  //collect the numbers of chat entries and in which order we need them
  var neededEntries = [];
  var order = 0;
  for(var i=start;i<=end; i++)
  {
    neededEntries.push({entryNum:i, order: order});
    order++;
  }

  //get all entries out of the database
  var entries = [];
  async.forEach(neededEntries, function(entryObject, callback)
  {
    _this.getChatMessage(entryObject.entryNum, function(err, entry)
    {
      if(ERR(err, callback)) return;
      entries[entryObject.order] = entry;
      callback();
    });
  }, function(err)
  {
    if(ERR(err, callback)) return;

    //sort out broken chat entries
    //it looks like in happend in the past that the chat head was
    //incremented, but the chat message wasn't added
    var cleanedEntries = [];
    for(var i=0;i<entries.length;i++)
    {
      if(entries[i]!=null)
        cleanedEntries.push(entries[i]);
      else
        console.warn("WARNING: Found broken chat entry in pad " + _this.id);
    }

    callback(null, cleanedEntries);
  });
};

Pad.prototype.init = function init(text, callback) {
  var _this = this;

  //replace text with default text if text isn't set
  if(text == null)
  {
    text = settings.defaultPadText;
  }

  //try to load the pad
  db.get("pad:"+this.id, function(err, value)
  {
    if(ERR(err, callback)) return;

    //if this pad exists, load it
    if(value != null)
    {
      _this.head = value.head;
      _this.atext = value.atext;
      _this.pool = _this.pool.fromJsonable(value.pool);

      //ensure we have a local chatHead variable
      if(value.chatHead != null)
        _this.chatHead = value.chatHead;
      else
        _this.chatHead = -1;

      //ensure we have a local publicStatus variable
      if(value.publicStatus != null)
        _this.publicStatus = value.publicStatus;
      else
        _this.publicStatus = false;

      //ensure we have a local passwordHash variable
      if(value.passwordHash != null)
        _this.passwordHash = value.passwordHash;
      else
        _this.passwordHash = null;
    }
    //this pad doesn't exist, so create it
    else
    {
      var firstChangeset = Changeset.makeSplice("\n", 0, 0, exports.cleanText(text));

      _this.appendRevision(firstChangeset, '');
    }

    callback(null);
  });
};

Pad.prototype.remove = function remove(callback) {
  var padID = this.id;
  var _this = this;

  //kick everyone from this pad
  padMessageHandler.kickSessionsFromPad(padID);

  async.series([
    //delete all relations
    function(callback)
    {
      async.parallel([
        //is it a group pad? -> delete the entry of this pad in the group
        function(callback)
        {
          //is it a group pad?
          if(padID.indexOf("$")!=-1)
          {
            var groupID = padID.substring(0,padID.indexOf("$"));

            db.get("group:" + groupID, function (err, group)
            {
              if(ERR(err, callback)) return;

              //remove the pad entry
              delete group.pads[padID];

              //set the new value
              db.set("group:" + groupID, group);

              callback();
            });
          }
          //its no group pad, nothing to do here
          else
          {
            callback();
          }
        },
        //remove the readonly entries
        function(callback)
        {
          readOnlyManager.getReadOnlyId(padID, function(err, readonlyID)
          {
            if(ERR(err, callback)) return;

            db.remove("pad2readonly:" + padID);
            db.remove("readonly2pad:" + readonlyID);

            callback();
          });
        },
        //delete all chat messages
        function(callback)
        {
          var chatHead = _this.chatHead;

          for(var i=0;i<=chatHead;i++)
          {
            db.remove("pad:"+padID+":chat:"+i);
          }

          callback();
        },
        //delete all revisions
        function(callback)
        {
          var revHead = _this.head;

          for(var i=0;i<=revHead;i++)
          {
            db.remove("pad:"+padID+":revs:"+i);
          }

          callback();
        }
      ], callback);
    },
    //delete the pad entry and delete pad from padManager
    function(callback)
    {
      db.remove("pad:"+padID);
      padManager.unloadPad(padID);
      callback();
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    callback();
  });
};
    //set in db
Pad.prototype.setPublicStatus = function setPublicStatus(publicStatus) {
  this.publicStatus = publicStatus;
  db.setSub("pad:"+this.id, ["publicStatus"], this.publicStatus);
};

Pad.prototype.setPassword = function setPassword(password) {
  this.passwordHash = password == null ? null : hash(password, generateSalt());
  db.setSub("pad:"+this.id, ["passwordHash"], this.passwordHash);
};

Pad.prototype.isCorrectPassword = function isCorrectPassword(password) {
  return compare(this.passwordHash, password);
};

Pad.prototype.isPasswordProtected = function isPasswordProtected() {
  return this.passwordHash != null;
};

/* Crypto helper methods */

function hash(password, salt)
{
  var shasum = crypto.createHash('sha512');
  shasum.update(password + salt);
  return shasum.digest("hex") + "$" + salt;
}

function generateSalt()
{
  return randomString(86);
}

function compare(hashStr, password)
{
  return hash(password, hashStr.split("$")[1]) === hashStr;
}
