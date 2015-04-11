/**
 * This code is mostly from the old Etherpad. Please help us to comment this code. 
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

/**
 * Copyright 2009 Google Inc.
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

var AttributePool = require('./AttributePool');
var Changeset = require('./Changeset');

function makeChangesetTracker(scheduler, apool, aceCallbacksProvider)
{

  // latest official text from server
  var baseAText = Changeset.makeAText("\n");
  // changes applied to baseText that have been submitted
  var submittedChangeset = null;
  // changes applied to submittedChangeset since it was prepared
  var userChangeset = Changeset.identity(1);
  // is the changesetTracker enabled
  var tracking = false;
  // stack state flag so that when we change the rep we don't
  // handle the notification recursively.  When setting, always
  // unset in a "finally" block.  When set to true, the setter
  // takes change of userChangeset.
  var applyingNonUserChanges = false;

  var changeCallback = null;

  var changeCallbackTimeout = null;

  function setChangeCallbackTimeout()
  {
    // can call this multiple times per call-stack, because
    // we only schedule a call to changeCallback if it exists
    // and if there isn't a timeout already scheduled.
    if (changeCallback && changeCallbackTimeout === null)
    {
      changeCallbackTimeout = scheduler.setTimeout(function()
      {
        try
        {
          changeCallback();
        }
        catch(pseudoError) {}
        finally
        {
          changeCallbackTimeout = null;
        }
      }, 0);
    }
  }

  var self;
  return self = {
    isTracking: function()
    {
      return tracking;
    },
    setBaseText: function(text)
    {
      self.setBaseAttributedText(Changeset.makeAText(text), null);
    },
    setBaseAttributedText: function(atext, apoolJsonObj)
    {
      aceCallbacksProvider.withCallbacks("setBaseText", function(callbacks)
      {
        tracking = true;
        baseAText = Changeset.cloneAText(atext);
        if (apoolJsonObj)
        {
          var wireApool = (new AttributePool()).fromJsonable(apoolJsonObj);
          baseAText.attribs = Changeset.moveOpsToNewPool(baseAText.attribs, wireApool, apool);
        }
        submittedChangeset = null;
        userChangeset = Changeset.identity(atext.text.length);
        applyingNonUserChanges = true;
        try
        {
          callbacks.setDocumentAttributedText(atext);
        }
        finally
        {
          applyingNonUserChanges = false;
        }
      });
    },
    composeUserChangeset: function(c)
    {
      if (!tracking) return;
      if (applyingNonUserChanges) return;
      if (Changeset.isIdentity(c)) return;
      userChangeset = Changeset.compose(userChangeset, c, apool);

      setChangeCallbackTimeout();
    },
    applyChangesToBase: function(c, optAuthor, apoolJsonObj)
    {
      if (!tracking) return;

      aceCallbacksProvider.withCallbacks("applyChangesToBase", function(callbacks)
      {

        if (apoolJsonObj)
        {
          var wireApool = (new AttributePool()).fromJsonable(apoolJsonObj);
          c = Changeset.moveOpsToNewPool(c, wireApool, apool);
        }

        baseAText = Changeset.applyToAText(c, baseAText, apool);

        var c2 = c;
        if (submittedChangeset)
        {
          var oldSubmittedChangeset = submittedChangeset;
          submittedChangeset = Changeset.follow(c, oldSubmittedChangeset, false, apool);
          c2 = Changeset.follow(oldSubmittedChangeset, c, true, apool);
        }

        var preferInsertingAfterUserChanges = true;
        var oldUserChangeset = userChangeset;
        userChangeset = Changeset.follow(c2, oldUserChangeset, preferInsertingAfterUserChanges, apool);
        var postChange = Changeset.follow(oldUserChangeset, c2, !preferInsertingAfterUserChanges, apool);

        var preferInsertionAfterCaret = true; //(optAuthor && optAuthor > thisAuthor);
        applyingNonUserChanges = true;
        try
        {
          callbacks.applyChangesetToDocument(postChange, preferInsertionAfterCaret);
        }
        finally
        {
          applyingNonUserChanges = false;
        }
      });
    },
    prepareUserChangeset: function()
    {
      // If there are user changes to submit, 'changeset' will be the
      // changeset, else it will be null.
      var toSubmit;
      if (submittedChangeset)
      {
        // submission must have been canceled, prepare new changeset
        // that includes old submittedChangeset
        toSubmit = Changeset.compose(submittedChangeset, userChangeset, apool);
      }
      else
      {

        // add forEach function to Array.prototype for IE8      
        if (!('forEach' in Array.prototype)) {
          Array.prototype.forEach= function(action, that /*opt*/) {
            for (var i= 0, n= this.length; i<n; i++)
              if (i in this)
                action.call(that, this[i], i, this);
          };
        }

        // Get my authorID
        var authorId = parent.parent.pad.myUserInfo.userId;

        // Sanitize authorship
        // We need to replace all author attribs with thisSession.author, in case they copy/pasted or otherwise inserted other peoples changes
        if(apool.numToAttrib){
          for (var attr in apool.numToAttrib){
            if (apool.numToAttrib[attr][0] == 'author' && apool.numToAttrib[attr][1] == authorId) var authorAttr = Number(attr).toString(36)
          }

          // Replace all added 'author' attribs with the value of the current user
          var cs = Changeset.unpack(userChangeset)
            , iterator = Changeset.opIterator(cs.ops)
            , op
            , assem = Changeset.mergingOpAssembler();

          while(iterator.hasNext()) {
            op = iterator.next()
            if(op.opcode == '+') {
              var newAttrs = ''

              op.attribs.split('*').forEach(function(attrNum) {
                if(!attrNum) return
                var attr = apool.getAttrib(parseInt(attrNum, 36))
                if(!attr) return
                if('author' == attr[0])  {
                  // replace that author with the current one
                  newAttrs += '*'+authorAttr; 
                }
                else newAttrs += '*'+attrNum // overtake all other attribs as is
              })
              op.attribs = newAttrs
            }
            assem.append(op)
          }
          assem.endDocument();
          userChangeset = Changeset.pack(cs.oldLen, cs.newLen, assem.toString(), cs.charBank)
          Changeset.checkRep(userChangeset)
        }
        if (Changeset.isIdentity(userChangeset)) toSubmit = null;
        else toSubmit = userChangeset;
      }

      var cs = null;
      if (toSubmit)
      {
        submittedChangeset = toSubmit;
        userChangeset = Changeset.identity(Changeset.newLen(toSubmit));

        cs = toSubmit;
      }
      var wireApool = null;
      if (cs)
      {
        var forWire = Changeset.prepareForWire(cs, apool);
        wireApool = forWire.pool.toJsonable();
        cs = forWire.translated;
      }

      var data = {
        changeset: cs,
        apool: wireApool
      };
      return data;
    },
    applyPreparedChangesetToBase: function()
    {
      if (!submittedChangeset)
      {
        // violation of protocol; use prepareUserChangeset first
        throw new Error("applySubmittedChangesToBase: no submitted changes to apply");
      }
      //bumpDebug("applying committed changeset: "+submittedChangeset.encodeToString(false));
      baseAText = Changeset.applyToAText(submittedChangeset, baseAText, apool);
      submittedChangeset = null;
    },
    setUserChangeNotificationCallback: function(callback)
    {
      changeCallback = callback;
    },
    hasUncommittedChanges: function()
    {
      return !!(submittedChangeset || (!Changeset.isIdentity(userChangeset)));
    }
  };

}

exports.makeChangesetTracker = makeChangesetTracker;
