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

function log()
  console.log.apply(console, arguments);
}

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
    granularities: {huge: 1000, big: 100, medium: 10, small: 1}
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
    VERBOSE: false,
  },
  {//instance
    /**
     * Create a new RevisionCache.
     * @constructor
     * @param {TimesliderClient} connection - The connection to be used for loading changesets.
     * @param {number} head_revnum - The current head revision number. TODO: we can probably do away with this now.
     */
    init: function (connection, head_revnum) {
      this.log = RevisionCache.VERBOSE ? log : function () {};
      this.connection = connection;
      this.loader = new ChangesetLoader(connection);
      this.revisions = {};
      this.head_revision = this.getRevision(head_revnum || 0);
      this.loader.start();
    },
    /**
     * Get the head revision.
     * @returns {Revision} - the head revision.
     */
    getHeadRevision: function () {
      return this.head_revision;
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
     * Add a new revision at the head.
     * @param {number} revnum - the revision number of the new revision.
     * @param {string} forward - the forward changeset to get here from previous head.
     * @param {string} reverse - the reverse changeset.
     * @param {string} timedelta - the time difference.
     */
    appendHeadRevision: function (revnum, forward, reverse, timedelta) {
      this.addChangesetPair(this.head_revision.revnum, revnum, forward, reverse, timedelta);
      this.head_revision = this.getRevision(revnum);
      //TODO: render it if we are currently at the head_revision?
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
      var granularity = 0;

      //log("[findpath] from: %d, to: %d", from.revnum, to.revnum);
      while (current.lt(to, direction) && !found_discontinuity) {
        //log("\t[findPath] while current: ", current.revnum);
        var delta_revnum = to.revnum - current.revnum;
        var direction_edges = direction ? current.previous : current.next;
        for (granularity in Revision.granularities) {
          if (Math.abs(delta_revnum) >= Revision.granularities[granularity]) {
            //log("\t\t[findPath] for delta: %d, granularity: %d", delta_revnum, Revision.granularities[granularity]);
            /*
             * the delta is larger than the granularity, let's use the granularity
             *TODO: what happens if we DON'T have the edge?
             *      in theory we need to fetch it (and this is certainly the case for playback
             *      at granularity = 1). However, when skipping, we might try to find the NEXT
             *      Revision (which is not linked by the graph to current) and request revisions
             *      from current to that Revision (at the largest possible granularity)
             */
            var edge = direction_edges[granularity];
            //log("\t\t[findpath] edge:", edge);
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

      //log("[findpath] ------------------");
      // return either a full path, or a path ending as close as we can get to
      // the target revision.
      return {path: path, end_revision: current, granularity: granularity};
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
        //log("from: %d, to: %d, current: %d", from_revnum, to_revnum, current_revnum);
        var res = _this.findPath(_this.getRevision(from_revnum), target_revision);
        //log("find: ", print_path(res.path));
        if (res.end_revision == target_revision) {
          //log("found: ", print_path(res.path));
          if(applyChangeset_callback) {
            applyChangeset_callback(res.path);
          }
          return;
        }
        else {
          //log("end: %d, target: %d", res.end_revision.revnum, target_revision.revnum);
        }

        // we don't yet have all the changesets we need. Let's try to
        // build a path from the current revision (the start of the range
        // in the response) to the target.
        res = _this.findPath(_this.getRevision(current_revnum), target_revision);
        //log(print_path(res.path));
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
      this.log("[revisioncache] requestChangesets: %d -> %d", from.revnum, to.revnum);
      var delta = to.revnum - from.revnum;
      var sign = delta > 0 ? 1 : -1;
      var start = delta > 0 ? from.revnum : to.revnum;
      var end = delta > 0 ? to.revnum : from.revnum;
      var adelta = Math.abs(delta);

      var _this = this;
      function process_received_changesets (data) {
        //log("[revisioncache] received changesets {from: %d, to: %d} @ granularity: %d", data.start, data.actualEndNum, data.granularity);
        var start = data.start;
        for (var i = 0; i < data.timeDeltas.length; i++, start += data.granularity) {
          _this.addChangesetPair(start, start + data.granularity, data.forwardsChangesets[i], data.backwardsChangesets[i], data.timeDeltas[i]);
        }
        if (changesetsProcessed_callback)
          changesetsProcessed_callback(data.start);
      }

      var rounddown = function (a, b) {
        return Math.floor(a / b) * b;
      };
      var roundup = function (a, b) {
        return (Math.floor(a / b)+1) * b;
      };
      //log("[requestChangesets] start: %d, end: %d, delta: %d, adelta: %d", start, end, delta, adelta);
      for (var g in Revision.granularities) {
        var granularity = Revision.granularities[g];
        var remainder = Math.floor(adelta / granularity);
        //log("\t[requestChangesets] start: %d, granularity: %d, adelta: %d, //: %d", start, granularity, adelta, remainder);
        //log("\t rounddown delta: %d, start: %d", rounddown(adelta, granularity), rounddown(start, granularity));
        if (remainder) {
          //this.loader.enqueue(start, granularity, process_received_changesets);
          //log("\t[requestChangesets] REQUEST start: %d, end: %d, granularity: %d", rounddown(start, granularity), roundup(adelta, granularity), granularity);
          this.loader.enqueue(rounddown(start, granularity), granularity, process_received_changesets);
          // for the next granularity, we assume that we have now successfully navigated
          // as far as required for this granularity. We should also make sure that only
          // the significant part of the adelta is used in the next granularity.
          start = rounddown(start, granularity) + rounddown(adelta, granularity);
          adelta = adelta - rounddown(adelta, granularity);
          //log("\t new start: %d, delta: %d", start, adelta);
        }
      }
    },
  }
);

$.Class("Thread",
  {//statics
    VERBOSE: true
  },
  {//instance
    init: function (interval) {
      this._is_running = false;
      this._is_stopping = false;
      this._interval_id = null;
      this._interval = interval ? interval : 1000;
      this.log = Thread.VERBOSE ? log : function () {};
    },
    _run: function () {
      this.log("[thread] tick");
    },
    // start the run loop
    start: function () {
      var _this = this;
      this.log("[thread] starting");
      var wrapper = function () {
        if (_this._is_running && _this._is_stopping) {
          this.log("[thread] shutting down");
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
      this.log("[thread] request stop");
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
      this.log = ChangesetLoader.VERBOSE ? log : function () {};
      this.start = start;
      this.granularity = granularity;
      this.request_id = (this.granularity << 16) + this.start;
      this.fulfill_callback = callback;
    },
    getRequestID: function () {
      return this.request_id;
    },
    fulfill: function (data) {
      this.log("[changesetrequest] Fulfilling request %d", this.getRequestID());
      if (this.fulfill_callback)
        this.fulfill_callback(data);
    }

  }
);

Thread("ChangesetLoader",
  {//statics
    VERBOSE: false
  },
  {//instance
    /**
     * Create a new ChangesetLoader.
     * @constructor
     * @param {TimesliderClient} connection - a TimesliderClient object to be used
     *                                    for communication with the server.
     */
    init: function (connection) {
      this._super(200);
      this.connection = connection;
      this.queues = {};
      for (var granularity in Revision.granularities) {
        this.queues[granularity] = [];
      }
      this.pending = {};
      var _this = this;
      this.connection.on("CHANGESET_REQ", function () {
        _this.on_response.apply(_this, arguments);
      });
      this.log = ChangesetLoader.VERBOSE ? log : function () {};
    },
    /**
     * Enqueue a request for changesets. The changesets will be retrieved
     * asynchronously.
     * @param {number} start - The revision from which to start.
     *
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
      this.log("[changeset_loader] enqueue: %d, %d", start, granularity);
      //TODO: check cache to see if we really need to fetch this
      //      maybe even do splices if we just need a smaller range
      //      in the middle
      var queue = null;
      for (var g in Revision.granularities) {
        if (granularity == Revision.granularities[g]) {
          queue = this.queues[g];
          break;
        }
      }

      var request = new ChangesetRequest(start, granularity, callback);
      if (! (request.getRequestID() in this.pending))
        queue.push(request);
    },
    _run: function () {
      this.log("[changesetloader] tick");
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
          if (request.getRequestID() in this.pending) {
            //this request is already pending!
            var id = request.getRequestID();
            this.log("ALREADY PENDING REQUEST: %d, start: %d, granularity: %d", id, id & 0xffff, id >> 16);
            continue;
          }
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
      this.log("[changesetloader] on_response: ", data);
      if (!(data.requestID in this.pending)) {
        this.log("[changesetloader] WTF? changeset not pending: ", data.requestID);
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

var libcssmanager = require("./cssmanager");
var linestylefilter = require("./linestylefilter").linestylefilter;
var libcolorutils = require('./colorutils').colorutils;
$.Class("Author",
  {//static
  },
  {//instance
    init: function (id, data, palette) {
      this.id = id;
      this.name = data.name;
      this.is_anonymous = !this.name;
      // if the colorId is an integer, it's an index into the color palette,
      // otherwise we assume it is a valid css color string
      this.background_color = typeof data.colorId == "number" ? palette[data.colorId] : data.colorId;
      // foreground color should be black unless the luminosity of the
      // background color is lower than 0.5. This effectively makes sure
      // that the text is readable.
      this.color = (libcolorutils.luminosity(libcolorutils.css2triple(this.background_color)) < 0.5 ? "#ffffff" : "#000000");
      // generate a css class name for this author.
      this.cssclass = linestylefilter.getAuthorClassName(this.id);
    },
    /**
     * Create and add a rule to the stylesheet setting the foreground and
     * background colors for this authors cssclass. This class can then be
     * applied to any span authored by this author, and the colors will just work.
     * @param {object} cssmanager - A cssmanager wrapper for the stylesheet to
     *                              which the rules should be added.
     */
    addStyleRule: function (cssmanager) {
      // retrieve a style selector for '.<authorid>' class, which is applied
      // to blobs which were authored by that <authorid>.
      var selector = cssmanager.selectorStyle("." + this.cssclass);
      // apply the colors
      selector.backgroundColor = this.background_color;
      selector.color = this.color;
    },
    /**
     * Retrieve the name of this user.
     */
    getName: function () {
      return this.is_anonymous ? "anonymous" : this.name;
    },
    /**
     * Retrieve the cssclass for this user.
     */
    getCSSClass: function () {
      return this.cssclass;
    },
  }
);

var AttribPool = require("./AttributePool");
var domline = require("./domline").domline;
$.Class("PadClient",
  {//static
    USE_COMPOSE: false,
    VERBOSE: true,
  },
  {//instance
    /**
     * Create a PadClient.
     * @constructor
     * @param {RevisionCache} revisionCache - A RevisionCache object to use.
     * @param {dict} options - All the necessary options. TODO: document this.
     */
    init: function (revisionCache, options) {
      this.revisionCache = revisionCache;
      this.revision = this.revisionCache.getRevision(options.revnum);
      this.timestamp = options.timestamp;
      this.alines = libchangeset.splitAttributionLines(options.atext.attributes, options.atext.text);
      this.apool = (new AttribPool()).fromJsonable(options.atext.apool);
      this.lines = libchangeset.splitTextLines(options.atext.text);
      this.authors = {};
      this.dynamicCSS = libcssmanager.makeCSSManager('dynamicsyntax');
      this.palette = options.palette;
      this.log = PadClient.VERBOSE ? log : function () {};

      this.updateAuthors(options.author_info);

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
      this.log("[padclient > goToRevision] revnum: %d", revnum);
      var _this = this;
      if (this.revision.revnum == revnum) {
        if (atRevision_callback)
          atRevision_callback.call(this, this.revision, this.timestamp);
        return;
      }

      this.revisionCache.transition(this.revision.revnum, revnum, function (path) {
        _this.log("[padclient > applyChangeset_callback] path:", path);
        var time = _this.timestamp;
        var p, changeset = null; //pre-declare, because they're used in both blocks.
        if (PadClient.USE_COMPOSE) {
          var composed = path[0];
          var _path = path.slice(1);
          for (p in _path) {
            changeset = _path[p];
            composed = composed.compose(changeset, _this);
          }
          composed.apply(_this);
          time += composed.deltatime * 1000;
        } else { // Don't compose, just apply
          for (p in path) {
            changeset = path[p];
            time += changeset.deltatime * 1000;
            //try {
              _this.log("[transition] %d -> %d, changeset: %s", changeset.from_revision.revnum, changeset.to_revision.revnum, changeset.value);
              _this.log(_this.alines, _this.lines, _this.apool);
              changeset.apply(_this);
            /*} catch (err) {
              log("Error applying changeset: ");
              log("\t", changeset.value);
              log("\t %d -> %d ", changeset.from_revision.revnum, changeset.to_revision.revnum);
              log(err);
              log("--------------");
            }*/
          }
        }

        // set revision and timestamp
        _this.revision = path.slice(-1)[0].to_revision;
        _this.timestamp = time;
        // fire the callback
        if (atRevision_callback) {
          _this.log("[padclient] about to call atRevision_callback", _this.revision, _this.timestamp);
          atRevision_callback.call(_this, _this.revision, _this.timestamp);
        }
      });
    },
    /**
     * Update the authors of this pad.
     * @param {object} author_info - The author info object sent by the server
     */
    updateAuthors: function (author_info) {
      var authors = author_info;
      this.log("[updateAuthors]: ", authors);
      for (var authorid in authors) {
        if (authorid in this.authors) {
          // just dispose of existing ones instead of trying to update existing
          // objects.
          delete this.authors[authorid];
        }
        var author = new Author(authorid, authors[authorid], this.palette);
        this.authors[authorid] = author;
        author.addStyleRule(this.dynamicCSS);
      }
    },
    /**
     * Merge a foreign (forward) changeset into our data. This involves rebuilding
     * the forward changeset in our apool and building a reverse changeset.
     * This is used to move new upstream changesets/revisions into our apool context.
     * @param {string} changeset - The foreign changeset to merge
     * @param {object} apool - The apool for that changeset
     * @returns {object} - A values object with forward and reverse changesets.
     */
    mergeForeignChangeset: function (changeset, apool) {
      var values = {};
      values.forward = libchangeset.moveOpsToNewPool(
                          changeset,
                          (new AttribPool()).fromJsonable(apool),
                          this.apool
                        );
      var reverseValue = libchangeset.inverse(
                          changeset,
                          this.divs,
                          this.alines,
                          this.apool
                        );
      values.reverse = libchangeset.moveOpsToNewPool(
                          reverseValue,
                          (new AttribPool()).fromJsonable(apool),
                          this.apool
                        );
      return values;
    },
    /**
     * Get a div jquery element for a given attributed text line.
     * @param {string} text - The text content of the line.
     * @param {string} atext - The attributes string.
     * @return {jquery object} - The div element ready for insertion into the DOM.
     */
    _getDivForLine: function (text, atext) {
      this.log("[_getDivsForLine] %s; %s", text, atext);
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
      this.log("[_spliceDivs]: ", index, howMany);
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
      // super primitive scrollIntoView
      if (newdivs.length) {
        for(var x in newdivs){
          var div = newdivs[x][0];
          this.log("ND> ", div.id, div.className, div.innerHTML);
        }
        newdivs[0][0].scrollIntoView(false);
      }

      // perform the splice on our array itself
      // TODO: monkey patching divs.splice, so use divs.original_splice or something
      args = [index, howMany].concat(newdivs);
      return this.divs.original_splice.apply(this.divs, args);
    },
  }
);
