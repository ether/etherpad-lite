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
    /**
     * Create a new RevisionCache.
     * @constructor
     * @param {TimesliderClient} connection - The connection to be used for loading changesets.
     * @param {number} head_revnum - The current head revision number. TODO: we can probably do away with this now.
     */
    init: function (connection, head_revnum) {
      this.connection = connection;
      this.loader = new ChangesetLoader(connection);
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
      var res = {
        from: current_rev,
        current: current_rev,
        is_complete: false,
        changesets: [],
      };

      if (from == to) {
        //TODO: implement short-circuit
        return res;
      }

      if (!res.current.changesets.length) {
        // You cannot build a path if the starting revision hasn't
        // got any changesets
        //TODO: implement short-circuit
        return res;
      }

      while (res.current.lt(to_rev, is_reverse)) {
        var changeset_iterator = new DirectionalIterator(res.current.changesets, is_reverse);
        while (changeset_iterator.haveNext()) {
          var current_changeset = changeset_iterator.next();
          // we might get stuck on a particular revision if only a
          // partial path is available.
          old_rev = res.current;
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
          var delta_rev = this.getRevision(res.current.revnum + current_changeset.deltarev);
          if (delta_rev.lt(to_rev, is_reverse)) {
            res.changesets.push(current_changeset);
            res.current = delta_rev;
            break;
          }
        }
        if (stop || res.current == old_rev)
          break;
      }

      res.is_complete = res.current == to_rev;

      return res;
    },
    addChangeset: function (from, to, value, reverseValue, timedelta) {
      var from_rev = this.getRevision(from);
      var to_rev = this.getRevision(to);
      from_rev.addChangeset(to, value, timedelta);
      to_rev.addChangeset(from, reverseValue, -timedelta);
    },
    /**
     * Iterate over the list of changesets required to go from one revision to another.
     * @param {number} from - The starting revision.
     * @param {number} to - The end revision.
     * @param {function} callback - The function to apply to each changeset.
     */
    iterChangesets: function (from, to, callback) {
      // first try to build a path from the cache:
      var path = this.findPath(from, to);
      if (!path.is_complete) {
        // TODO: request load of any other changesets.
        //       before we start iterating over existing
        //       in the hope that some of them will be
        //       fulfilled soon.bt
      }
      // we have a partial path
      console.log(from, to, path.current.revnum);
      // TODO: loop over existing changesets and apply
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
     * @param {TimesliderClient} connection - a TimesliderClient object to be used
     *                                    for communication with the server.
     */
    init: function (connection) {
      this._super(100);
      this.connection = connection;
      this.queues = {
        small: [],
        medium: [],
        large: [],
      }
      this.pending = {};
      var _this = this;
      this.connection.on("CHANGESET_REQ", function () {
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
     *                              been fulfilled. The context of the callback will be the
     *                              ChangesetRequest object, so you can check what you actually
     *                              asked for.
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
          this.connection.sendMessage("CHANGESET_REQ", {
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

var libchangeset = require("./Changeset");
var AttribPool = require("./AttributePool");
var domline = require("./domline").domline;
var linestylefilter = require("./linestylefilter").linestylefilter;
$.Class("PadClient",
  {//static
  },
  {//instance
    /**
     * Create a PadClient.
     * @constructor
     * @param {number} revision - The current revision of the pad.
     * @param {datetime} timestamp - The timestamp of the current revision.
     * @param {string} atext - The attributed text.
     * @param {string} attribs - The attributes string.
     * @param {object} apool - The attribute pool.
     */
    init: function (revision, timestamp, atext, attribs, apool) {
      this.revision = revision;
      this.timestamp = timestamp;
      this.alines = libchangeset.splitAttributionLines(attribs, atext);
      this.apool = (new AttribPool()).fromJsonable(apool);
      this.lines = libchangeset.splitTextLines(atext);

      //TODO: this is a kludge! we should receive the padcontent as an
      //injected dependency
      this.divs = [];
      this.padcontent = $("#padcontent");
      for (var i in this.lines) {
        var div = this._getDivForLine(this.lines[i], this.alines[i]);
        this.divs.push(div);
        this.padcontent.append(div);
      };

      //TODO: monkey patch divs.splice to use our custom splice function
      this.divs.original_splice = this.divs.splice;
      this.divs.splice = this._spliceDivs;

    },
    applyChangeset: function (changeset) {
      //TODO: changeset should be a Changeset object
      //
      // must mutate attribution lines before text lines
      libchangeset.mutateAttributionLines(changeset, this.alines, this.apool);

      // Looks like this function can take a regular array of strings
      libchangeset.mutateTextLines(changeset, /* padcontents */ this.lines);

      //TODO: get authors (and set in UI)

    },
    _getDivForLine: function (text, atext) {
      var dominfo = domline.createDomLine(text != '\n', true);

      // Here begins the magic invocation:
      linestylefilter.populateDomLine(text, atext, this.apool, dominfo);
      dominfo.prepareForAdd();

      var div = $("<div class='" + dominfo.node.className +
                  "' id='" + Math.random() + "'>" +
                  dominfo.node.innerHTML + "</div>");
      return div;
    },
    /**
     * we need a customized splice function for our divs array, because we
     * need to be able to:
     *  - remove elements from the DOM when they are spliced out
     *  - create a new div for line elements and add them to the array
     *    instead of the raw line
     *  - add the new divs to the DOM
     * this function is fully compliant with the Array.prototype.splice
     * spec, as we're monkey-patching it on to the divs array.
     * @param {number} index - Index at which to start changing the array.
     * @param {number} howMany - An integer indicating the number of old array elements to remove.
     * @param {array} elements - The elements to add to the array. In our case, these are lines.
     */
    _spliceDivs: function (index, howMany, elements) {
      // remove howMany divs starting from index. We need to remove them from
      // the DOM.
      for (var i = index; i < howMany && i < this.divs.length; i++)
        this.divs[i].remove()

      // generate divs for the new elements:
      var newdivs = [];
      for (i in elements)
        newdivs.push(this._getDivForLine(elements[i], this.alines[index + i]));

      // if we are splicing at the beginning of the array, we need to prepend
      // to the padcontent DOM element
      if (!this.divs[index - 1])
        this.padcontent.prepend(newdivs);
      // otherwise just add the new divs after the index-th div
      else
        this.divs[index - 1].after(newdivs);

      // perform the splice on our array itself
      // TODO: monkey patching divs.splice, so use divs.original_splice or something
      return this.divs.splice(index, howMany, newdivs);
    },
  }
);
function loadBroadcastRevisionsJS(clientVars, connection)
{

    revisionCache = new RevisionCache(connection, clientVars.collab_client_vars.rev || 0);
//  revisionInfo.latest = clientVars.collab_client_vars.rev || -1;

  var collabClientVars = clientVars.collab_client_vars;
  p = new PadClient(collabClientVars.rev, collabClientVars.time, collabClientVars.initialAttributedText.text, collabClientVars.initialAttributedText.attribs, collabClientVars.apool);

   cl = new ChangesetLoader(connection);
   return cl;

}
exports.loadBroadcastRevisionsJS = loadBroadcastRevisionsJS;
