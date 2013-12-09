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
// revision info is a skip list whos entries represent a particular revision
// of the document.  These revisions are connected together by various
// changesets,  or deltas, between any two revisions.

//require('./jquery.class');

$.Class("Changeset",
  {//statics
  },
  {//instance
    init: function (deltarev, deltatime, value) {
      this.deltarev = deltarev;
      this.deltatime = deltatime;
      this.value = value;
    },
    getValue: function () {
      return this.value;
    },
  }
);

$.Class("DirectionalIterator",
  {//statics
  },
  {//instance
    init: function (list, direction) {
      self.list = list;
      self.direction = direction;
      self.current = self.direction ? self.list.length - 1 : 0;
    },
    haveNext: function () {
      if ((self.direction && self.current > 0)
        || (!self.direction && self.current < self.list.length))
        return true;
      return false;
    },
    next: function () {
      if (self.direction && self.current > 0)
        return self.list[self.current--];
      if (!self.direction && self.current < self.list.length)
        return self.list[self.current++];

      return undefined;
    }
  }
);

$.Class("Revision",
  {//statics
  },
  {//instance
    init: function (revnum) {
      this.revnum = revnum;
      this.changesets = [];
    },
    addChangeset: function (destindex, changeset, timedelta) {
      this.changesets.push(new Changeset(destindex - this.revnum, timedelta, changeset));
      this.changesets.sort(function (a, b) {
        return (b.deltarev - a.deltarev);
      });
    },
    lt: function (other, is_reverse) {
      if (is_reverse)
        return this.gt(other);
      return this.revnum < other.revnum;
    },
    gt: function (other, is_reverse) {
      if (is_reverse)
        return this.lt(other);
      return this.revnum > other.revnum;
    }
  }
);

$.Class("RevisionCache",
  {
  },
  {//instance
    init: function (head_revnum) {
      this.revisions = {};
      this.head_revnum = head_revnum || 0;
    },
    getRevision: function (revnum) {
      if (revnum in this.revisions)
        return this.revisions[revnum];
      this.revisions[revnum] = new Revision(revnum);
      this.head_revnum = Math.max(this.head_revnum, revnum);
      return this.revisions[revnum];
    },
    findPath: function (from, to) {
      var current_rev = this.getRevision(from);
      var to_rev = this.getRevision(to);
      var is_reverse = !(from < to);
      var changesets = [];

      if (from == to) {
        //TODO: implement short-circuit
      }

      if (!current_rev.changesets.length) {
        // You cannot build a path if the starting revision hasn't
        // got any changesets
        //TODO: implement short-circuit
      }

      while (current_rev.lt(to_rev, is_reverse)) {
        var changeset_iterator = DirectionalIterator(current_rev.changesets, is_reverse);
        while (changeset_iterator.haveNext()) {
          var current_changeset = changeset_iterator.next();
          // we might get stuck on a particular revision if only a
          // partial path is available.
          old_rev = current_rev;
          // the next (first) changeset in the current revision has a delta
          // in the opposite direction to that in which we are trying to
          // move, and so cannot help us. Because the changeset list is
          // sorted, we can just stop here.
          if (current_changeset.deltarev < 0) {
            // When can this happen?
            stop = true;
          }

          // the current revision has a changeset which helps us get to a revision
          // which is closer to our target, so we should push that changeset to
          // the list and move to that new revision to continue building a path
          var delta_rev = this.getRevision(current_rev.revnum + current_changeset.deltarev);
          if (delta_rev.lt(to_rev, is_reverse)) {
            changesets.push(current_changeset);
            current_rev = delta_rev;
            break;
          }
        }
        if (stop || current_rev == old_rev)
          break;
      }
      var status = 'partial';
      if (current_rev == to_rev)
        status = 'complete';

      return {
        'fromRev': from,
        'rev': current_rev.rev,
        'status': status,
        'changesets': changesets,
      };
    },
    addChangeset: function (from, to, value, reverseValue, timedelta) {
      var from_rev = this.getRevision(from);
      var to_rev = this.getRevision(to);
      from_rev.addChangeset(to, value, timedelta);
      to_rev.addChangeset(from, reverseValue, -timedelta);
    }
  }
);

$.Class("Thread",
  {//statics
  },
  {//instance
    init: function (interval) {
      this._is_running = false;
      this._is_stopping = false;
      this._interval_id = null;
      this._interval = interval ? interval : 1000;
    },
    _run: function () {
      console.log("[thread] tick");
    },
    // start the run loop
    start: function () {
      var _this = this;
      console.log("[thread] starting")
      var wrapper = function () {
        if (_this._is_running && _this._is_stopping) {
          console.log("[thread] shutting down")
          clearInterval(_this._interval_id);
          _this._is_running = false;
          return;
        }
        _this._run.apply(_this);
      };
      this._is_running = true;
      this._is_stopping = false;
      this._interval_id = setInterval(wrapper, this._interval);
    },
    // stop the run loop
    stop: function () {
      this._is_stopping = true;
      console.log("[thread] request stop")
      // TODO: consider finding a way to make this block
      // or alternatively, having a callback which is called
      // when the thread stops
    }
  }
);

$.Class("ChangesetRequest",
  {//statics
  },
  {//instance
    init: function (start, granularity, callback) {
      this.start = start;
      this.granularity = granularity;
      this.request_id = (this.start << 16) + granularity;
      this.fulfill_callback = callback;
    },
    getRequestID: function () {
      return this.request_id;
    },
    fulfill: function (data) {
      console.log("[changesetrequest] Fulfilling request %d", this.getRequestID());
      if (this.fulfill_callback)
        this.fulfill_callback(data);
    }

  }
);

Thread("ChangesetLoader",
  {//statics
  },
  {//instance
    /**
     * Create a new ChangesetLoader.
     * @constructor
     * @param {TimesliderClient} client - a TimesliderClient object to be used
     *                                    for communication with the server.
     */
    init: function (client) {
      this._super(100);
      this.client = client;
      this.queues = {
        small: [],
        medium: [],
        large: [],
      }
      this.pending = {};
      var _this = this;
      this.client.on("CHANGESET_REQ", function () {
        _this.on_response.apply(_this, arguments);
      });
    },
    /**
     * Enqueue a request for changesets. The changesets will be retrieved
     * asynchronously.
     * @param {number} start - The revision from which to start.
     * @param {number} granularity - The granularity of the changesets. If this
     *                               is 1, the response will include changesets which
     *                               can be applied to go from revision r to r+1.
     *                               If 10 is specified, the resulting changesets will
     *                               be 'condensed', so that each changeset will go from
     *                               r to r+10.
     *                               If any other number is specified, that granularity will
     *                               apply.
     *
     *                               TODO: there is currently no 'END' revision implemented
     *                               in the server. The 'END' calculated at the server is:
     *                                start + (100 * granularity)
     *                               We should probably fix this so that you can specify
     *                               exact ranges. Right now, the minimum number of
     *                               changesets/revisions you can retrieve is 100, which
     *                               feels broken.
     * @param {function} callback - A callback which will be triggered when the request has
     *                              been fulfilled.
     */
    enqueue: function (start, granularity, callback) {
      //TODO: check cache to see if we really need to fetch this
      //      maybe even to splices if we just need a smaller range
      //      in the middle
      var queue = null;
      if (granularity == 1)
        queue = this.queues.small;
      else if (granularity == 10)
        queue = this.queues.medium;
      else
        queue = this.queues.large;

      queue.push(new ChangesetRequest(start, granularity, callback));
    },
    _run: function () {
      console.log("[changesetloader] tick");
      //TODO: pop an item from the queue and perform a request.
      for (q in this.queues) {
        var queue = this.queues[q];
        if (queue.length > 0) {
          // TODO: pop and handle
          var request = queue.pop();
          //TODO: test AGAIN to make sure that it hasn't been retrieved and cached by
          //a previous request. This should handle the case when two requests for the
          //same changesets are enqueued (which would be fine, as at enqueue time, we
          //only check the cache of AVAILABLE changesets, not the pending requests),
          //the first one is fulfilled, and then we pop the second one, and don't
          //need to perform a server request. Note: it might be worth changing enqueue
          //to check the pending requests queue to avoid this situation entirely.

          var _this = this;
          this.client.sendMessage("CHANGESET_REQ", {
            start: request.start,
            granularity: request.granularity,
            requestID: request.getRequestID(),
          }, function () {
            _this.pending[request.getRequestID()] = request;
          });
        };
      };
      //TODO: this stop is just for debugging!!!!
      //FIXME: remove when done testing
      this.stop();
    },
    on_response: function (data) {
      console.log("on_response: ", data)
      if (!data.requestID in this.pending) {
        console.log("[changesetloader] WTF? changeset not pending: ", data.requestID);
        return;
      }

      // pop it from the pending list:
      var request = this.pending[data.requestID];
      delete this.pending[data.requestID];
      //fulfill the request
      request.fulfill(data);
    },
  }
);
function loadBroadcastRevisionsJS(clientVars, client)
{

      console.log("here")
//  revisionCache = new RevisionCache(clientVars.collab_client_vars.rev || 0);
//  revisionInfo.latest = clientVars.collab_client_vars.rev || -1;

   cl = new ChangesetLoader(client);
   return cl;

}

exports.loadBroadcastRevisionsJS = loadBroadcastRevisionsJS;
