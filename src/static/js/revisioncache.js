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
require('./jquery.class');
var libchangeset = require("./Changeset");

$.Class("Changeset",
  {//statics
  },
  {//instance
    init: function (from_revision, to_revision, deltatime, value) {
      this.from_revision = from_revision;
      this.to_revision = to_revision;
      this.deltatime = deltatime;
      this.value = value;
    },
    getValue: function () {
      return this.value;
    },
    compose: function (other, pad) {
      var newvalue = libchangeset.compose(this.value, other.value, pad.apool);
      var newchangeset = new Changeset(this.from_revision, other.to_revision,
                            this.deltatime + other.deltatime, newvalue);
      console.log(newchangeset);
      //TODO: insert new changeset into the graph somehow.
      return newchangeset;
    },
    /**
     * Apply this changeset to the passed pad.
     * @param {PadClient} pad - The pad to apply the changeset to.
     */
    apply: function (pad) {
      // must mutate attribution lines before text lines
      libchangeset.mutateAttributionLines(this.value, pad.alines, pad.apool);

      // Looks like this function can take a regular array of strings
      libchangeset.mutateTextLines(this.value, /* padcontents */ /*this.lines */ pad.divs);
    },
    /**
     * 'Follow' the Changeset in a given direction, returning the revision at
     * the specified end of the edge.
     * @param {bool} direction - If true, go to the 'from' revision, otherwise
     *                           go to the 'to' revision.
     * @returns {Revision}
     */
    follow: function () {
      return this.to_revision;
    }
  }
);

/**
 * Revision class. Represents a specific revision. Each instance has three
 * possible edges in each direction. Each edge is essentially a Changeset.
 * We store three edges at different granularities, to make skipping fast.
 *  e.g. to go from r1 to r251, you start at r1, use the big edge to go to
 *  r100, use the big edge again to go to r200, use the next 5 medium edges to
 *  go from r200 to r210, etc. until reaching r250, follow the next small edge
 *  to get to 251. A total of 8 edges are traversed (a.k.a. applied),
 *  making this significantly cheaper than applying all 250 changesets from r1
 *  to r251.
 */
$.Class("Revision",
  {//statics
    // we rely on the fact that granularities are always traversed biggest to
    // smallest. Changing this will break lots of stuff.
    granularities: {big: 100, medium: 10, small: 1}
  },
  {//instance
    /**
     * Create a new revision for the specified revision number.
     * @constructor
     * @param {number} revnum - The revision number this object represents.
     */
    init: function (revnum) {
      this.revnum = revnum;
      // next/previous edges, granularityed as big, medium and small
      this.next = {};
      this.previous = {};
      for (var granularity in this.granularties) {
        this.next[granularity] = null;
        this.previous[granularity] = null;
      }
    },
    /**
     * Add a changeset from this revision to the target.
     * @param {Revision} target - The target revision.
     * @param {object} changeset - The raw changeset data.
     * @param {time} timedelta - The difference in time between this revision
     *                          and the target.
     * @returns {Changeset} - The new changeset object.
     */
    addChangeset: function (target, changeset, timedelta) {
      if (this.revnum == target.revnum)
        // This should really never happen, but if it does, let's short-circuit.
        return;

      var delta_revnum = target.revnum - this.revnum;
      // select the right edge set:
      var direction_edges = delta_revnum < 0 ? this.previous : this.next;

      // find the correct granularity and add an edge (changeset) for that granularity
      for (var granularity in Revision.granularities) {
        if (Math.abs(delta_revnum) == Revision.granularities[granularity]) {
          //TODO: should we check whether the edge exists?
          direction_edges[granularity] = new Changeset(this, target, timedelta, changeset);
          return direction_edges[granularity];
        }
      }
      // our delta_revnum isn't one of the granularities. Something is wrong
      //TODO: handle this case?
      return null;
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
      this.head_revision = this.getRevision(head_revnum || 0);
      this.loader.start();
    },
    /**
     * Get a Revision instance for the specified revision number.
     * If we don't yet have a Revision instance for this revision, create a
     * new one. Also make sure that the head_revision attribute always refers
     * to the instance for the pad's head revision.
     * @param {number} revnum - The revision number for which we want a
     *                          Revision object.
     * @returns {Revision}
     */
    getRevision: function (revnum) {
      if (revnum in this.revisions)
        return this.revisions[revnum];
      var revision = new Revision(revnum);
      this.revisions[revnum] = revision;
      if (this.head_revision && revnum > this.head_revision.revnum) {
        this.head_revision = revision;
      }
      return revision;
    },
    /**
     * Links two revisions, specified by from and to with the changeset data
     * in value and reverseValue respectively.
     * @param {number} from - The revision number from which the forward
     *                        changeset originates.
     * @param {number} to - The revision number to which the forward changeset
     *                      bring us.
     * @param {changeset} forwardValue - The forward changeset data.
     * @param {changeset} reverseValue - The reverse changeset data.
     * @param {time} timedelta - The difference in time between the from and
     *                           to revisions.
     */
    addChangesetPair: function (from, to, value, reverseValue, timedelta) {
      var from_rev = this.getRevision(from);
      var to_rev = this.getRevision(to);
      from_rev.addChangeset(to_rev, value, timedelta);
      to_rev.addChangeset(from_rev, reverseValue, -timedelta);
    },
    /**
     * Find a (minimal) path from a given revision to another revision. If a
     * complete path cannot be found, return a path which comes as close as
     * possible to the to revision.
     * @param {Revision} from - The revision from which to start.
     * @param {Revision} to - The revision which the path should try to reach.
     * @returns {object} - A list of Changesets which describe a (partial) path
     *                  from 'from' to 'to', and the last revision reached.
     */
    findPath: function (from, to) {
      /*
       *TODO: currently we only ever move in the direction of sign(to-from).
       *It might be worth implementing 'jitter' movements, so that if you,
       *for example, you are trying to go from 0 to 99, and you have the
       *following edges:
       *  0 -> 100
       *  100 -> 99
       *The algorithm would be smart enough to provide you with that as a path
       */
      var path = [];
      var found_discontinuity = false;
      var current = from;
      var direction = (to.revnum - from.revnum) < 0;
      while (current.lt(to, direction) && !found_discontinuity) {
        var delta_revnum = to.revnum - current.revnum;
        var direction_edges = direction ? current.previous : current.next;
        for (var granularity in Revision.granularities) {
          if (Math.abs(delta_revnum) >= Revision.granularities[granularity]) {
            /*
             * the delta is larger than the granularity, let's use the granularity
             *TODO: what happens if we DON'T have the edge?
             *      in theory we need to fetch it (and this is certainly the case for playback
             *      at granularity = 1). However, when skipping, we might try to find the NEXT
             *      Revision (which is not linked by the graph to current) and request revisions
             *      from current to that Revision (at the largest possible granularity)
             */
            var edge = direction_edges[granularity];
            if (edge) {
              // add this edge to our path
              path.push(edge);
              // follow the edge to the next Revision node
              current = edge.follow();
              // no need to look for smaller granularities
              break;
            } else {
              // we don't have an edge. Normally we can just continue to the
              // next granularity level. BUT, if we are at the lowest
              // granularity and don't have an edge, we've reached a DISCONTINUITY
              // and can no longer continue.
              if (Revision.granularities[granularity] == 1)
                found_discontinuity = true;
            }
          }
        }
      }

      // return either a full path, or a path ending as close as we can get to
      // the target revision.
      return {path: path, end_revision: current};
    },
    //TODO: horrible name!
    transition: function (from_revnum, to_revnum, applyChangeset_callback) {
      var path = [];
      var current_revision = this.getRevision(from_revnum);
      var target_revision = this.getRevision(to_revnum);

      // For debugging:
      function print_path(path) {
        var res = "[";
        for (var p in path) {
          res += path[p].from_revision.revnum + "->" + path[p].to_revision.revnum + ", ";
        }
        res += "]";
        return res;
      }

      var _this = this;
      function partialTransition (current_revnum) {
        console.log("from: %d, to: %d, current: %d", from_revnum, to_revnum, current_revnum);
        var res = _this.findPath(_this.getRevision(from_revnum), target_revision);
        console.log("find: ", print_path(res.path));
        if (res.end_revision == target_revision) {
          console.log("found: ", print_path(res.path));
          if(applyChangeset_callback) {
            applyChangeset_callback(res.path);
          }
          return;
        }
        else {
          console.log("end: %d, target: %d", res.end_revision.revnum, target_revision.revnum);
        }

        // we don't yet have all the changesets we need. Let's try to
        // build a path from the current revision (the start of the range
        // in the response) to the target.
        res = _this.findPath(_this.getRevision(current_revnum), target_revision);
        console.log(res);
        console.log(print_path(res.path));
        // we can now request changesets from the end of that partial path
        // to the target:
        _this.requestChangesets(res.end_revision, target_revision, partialTransition);
      }

      partialTransition(from_revnum);

    },
    /**
     * Request changesets which will allow transitioning from 'from' to 'to'
     * from the server.
     * @param {Revision} from - The start revision.
     * @param {Revision} to - The end revision.
     * @param {function} changesetsProcessed_callback - A callback triggered
     *                              when the requested changesets have been
     *                              received and processed (added to the graph)
     */
    requestChangesets: function (from, to, changesetsProcessed_callback) {
      console.log("[revisioncache] requestChangesets: %d -> %d", from.revnum, to.revnum);
      var delta = to.revnum - from.revnum;
      var sign = delta > 0 ? 1 : -1;
      var start = delta > 0 ? from.revnum : to.revnum;
      var end = delta > 0 ? to.revnum : from.revnum;
      var adelta = Math.abs(delta);

      var _this = this;
      function process_received_changesets (data) {
        //console.log("[revisioncache] received changesets {from: %d, to: %d} @ granularity: %d", data.start, data.actualEndNum, data.granularity);
        var start = data.start;
        for (var i = 0; i < data.timeDeltas.length; i++, start += data.granularity) {
          _this.addChangesetPair(start, start + data.granularity, data.forwardsChangesets[i], data.backwardsChangesets[i], data.timeDeltas[i]);
        }
        if (changesetsProcessed_callback)
          changesetsProcessed_callback(data.start);
      }


      //TODO: it might be better to be stricter about start addresses.
      //At the moment if you request changesets from 2 -> 12, it will request at granularity 10.
      //Not sure if we shouldn't only request granularities > 1 when we have a strict multiple of 10,100 etc.
      //This is compounded by the fact that revisions are 1 based!
      for (var g in Revision.granularities) {
        var granularity = Revision.granularities[g];
        var num = Math.floor(adelta / granularity);
        adelta = adelta % granularity;
        if (num) {
          this.loader.enqueue(start, granularity, process_received_changesets);
          start = start + (num * granularity);
        }
      }
      if (adelta) {
        //Something went wrong!
      }
    },
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
      console.log("[thread] starting");
      var wrapper = function () {
        if (_this._is_running && _this._is_stopping) {
          console.log("[thread] shutting down");
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
      console.log("[thread] request stop");
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
      this.request_id = (this.granularity << 16) + this.start;
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
      this._super(2000);
      this.connection = connection;
      this.queues = {
        small: [],
        medium: [],
        large: [],
      };
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
      console.log("[changeset_loader] enqueue: %d, %d", start, granularity);
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

      var request = new ChangesetRequest(start, granularity, callback);
      if (! (request.getRequestID() in this.pending))
        queue.push(request);
    },
    _run: function () {
      console.log("[changesetloader] tick");
      var _this = this;
      function addToPending () {
        _this.pending[request.getRequestID()] = request;
      }
      //TODO: pop an item from the queue and perform a request.
      for (var q in this.queues) {
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

          this.connection.sendMessage("CHANGESET_REQ", {
            start: request.start,
            granularity: request.granularity,
            requestID: request.getRequestID(),
          }, addToPending);
        }
      }
      //TODO: this stop is just for debugging!!!!
      //FIXME: remove when done testing
      //this.stop();
    },
    on_response: function (data) {
      console.log("[changesetloader] on_response: ", data);
      if (!(data.requestID in this.pending)) {
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
     * @param {RevisionCache} revisionCache - A RevisionCache object to use.
     * @param {number} revision - The current revision of the pad.
     * @param {datetime} timestamp - The timestamp of the current revision.
     * @param {string} atext - The attributed text.
     * @param {string} attribs - The attributes string.
     * @param {object} apool - The attribute pool.
     */
    init: function (revisionCache, revision, timestamp, atext, attribs, apool) {
      this.revisionCache = revisionCache;
      this.revision = this.revisionCache.getRevision(revision);
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
      }

      //TODO: monkey patch divs.splice to use our custom splice function
      this.divs.original_splice = this.divs.splice;
      var _this = this;
      this.divs.splice = function () {
        return _this._spliceDivs.apply(_this, arguments);
      };
      // we need to provide a get, as we want to give
      // libchangeset the text of a div, not the div itself
      this.divs.get = function (index) {
        return this[index].data('text');
      };
    },
    goToRevision: function (revnum, atRevision_callback) {
      console.log("[padclient > goToRevision] revnum: %d", revnum);
      var _this = this;
      if (this.revision.revnum == revnum) {
        if (atRevision_callback)
          atRevision_callback.call(this, this.revision, this.timestamp);
        return;
      };

      this.revisionCache.transition(this.revision.revnum, revnum, function (path) {
        console.log("[padclient > applyChangeset_callback] path:", path);
        var time = _this.timestamp;
        var composed = path[0];
        var _path = path.slice(1);
        for (var p in _path) {
          console.log(p, _path[p].deltatime, _path[p].value);
          var changeset = _path[p];
          composed = composed.compose(changeset, _this);
          //time += changeset.deltatime * 1000;
          //changeset.apply(_this);
        }
        composed.apply(_this);
        time += composed.deltatime * 1000;

        // set revision and timestamp
        _this.revision = path.slice(-1)[0].to_revision;
        _this.timestamp = time;
        console.log(_this.revision, _this.timestamp);
        // fire the callback
        if (atRevision_callback) {
          console.log("[padclient] about to call atRevision_callback", _this.revision, _this.timestamp);
          atRevision_callback.call(_this, _this.revision, _this.timestamp);
        }
      });

    },
    _getDivForLine: function (text, atext) {
      var dominfo = domline.createDomLine(text != '\n', true);

      // Here begins the magic invocation:
      linestylefilter.populateDomLine(text, atext, this.apool, dominfo);
      dominfo.prepareForAdd();

      var div = $("<div class='" + dominfo.node.className + "' " +
                  "id='" + Math.random() + "' " +
                  "data-text='" + text + "'>" +
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
      elements = Array.prototype.slice.call(arguments, 2);
      // remove howMany divs starting from index. We need to remove them from
      // the DOM.
      for (var i = index; i < index + howMany && i < this.divs.length; i++)
        this.divs[i].remove();

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
      args = [index, howMany].concat(newdivs);
      return this.divs.original_splice.apply(this.divs, args);
    },
  }
);
