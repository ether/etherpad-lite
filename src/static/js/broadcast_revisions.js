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

function loadBroadcastRevisionsJS()
{
  function Revision(revNum)
  {
    this.rev = revNum;
    this.changesets = [];
  }

  Revision.prototype.addChangeset = function(destIndex, changeset, timeDelta)
  {
    var changesetWrapper = {
      deltaRev: destIndex - this.rev,
      deltaTime: timeDelta,
      getValue: function()
      {
        return changeset;
      }
    };
    this.changesets.push(changesetWrapper);
    this.changesets.sort(function(a, b)
    {
      return (b.deltaRev - a.deltaRev)
    });
  }

  revisionInfo = {};
  revisionInfo.addChangeset = function(fromIndex, toIndex, changeset, backChangeset, timeDelta)
  {
    var startRevision = revisionInfo[fromIndex] || revisionInfo.createNew(fromIndex);
    var endRevision = revisionInfo[toIndex] || revisionInfo.createNew(toIndex);
    startRevision.addChangeset(toIndex, changeset, timeDelta);
    endRevision.addChangeset(fromIndex, backChangeset, -1 * timeDelta);
  }

  revisionInfo.latest = clientVars.collab_client_vars.rev || -1;

  revisionInfo.createNew = function(index)
  {
    revisionInfo[index] = new Revision(index);
    if (index > revisionInfo.latest)
    {
      revisionInfo.latest = index;
    }

    return revisionInfo[index];
  }

  // assuming that there is a path from fromIndex to toIndex, and that the links
  // are laid out in a skip-list format
  revisionInfo.getPath = function(fromIndex, toIndex)
  {
    var changesets = [];
    var spans = [];
    var times = [];
    var elem = revisionInfo[fromIndex] || revisionInfo.createNew(fromIndex);
    if (elem.changesets.length != 0 && fromIndex != toIndex)
    {
      var reverse = !(fromIndex < toIndex)
      while (((elem.rev < toIndex) && !reverse) || ((elem.rev > toIndex) && reverse))
      {
        var couldNotContinue = false;
        var oldRev = elem.rev;

        for (var i = reverse ? elem.changesets.length - 1 : 0;
        reverse ? i >= 0 : i < elem.changesets.length;
        i += reverse ? -1 : 1)
        {
          if (((elem.changesets[i].deltaRev < 0) && !reverse) || ((elem.changesets[i].deltaRev > 0) && reverse))
          {
            couldNotContinue = true;
            break;
          }

          if (((elem.rev + elem.changesets[i].deltaRev <= toIndex) && !reverse) || ((elem.rev + elem.changesets[i].deltaRev >= toIndex) && reverse))
          {
            var topush = elem.changesets[i];
            changesets.push(topush.getValue());
            spans.push(elem.changesets[i].deltaRev);
            times.push(topush.deltaTime);
            elem = revisionInfo[elem.rev + elem.changesets[i].deltaRev];
            break;
          }
        }

        if (couldNotContinue || oldRev == elem.rev) break;
      }
    }

    var status = 'partial';
    if (elem.rev == toIndex) status = 'complete';

    return {
      'fromRev': fromIndex,
      'rev': elem.rev,
      'status': status,
      'changesets': changesets,
      'spans': spans,
      'times': times
    };
  }
}

exports.loadBroadcastRevisionsJS = loadBroadcastRevisionsJS;
