'use strict';

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

type RevisionDelta = {
  deltaRev: number;
  deltaTime: number;
  getValue: () => RevisionDelta;
}

export class Revision {
  rev: number;
  changesets: RevisionDelta[];

  constructor(revNum: number) {
    this.rev = revNum;
    this.changesets = [];
  }

  addChangeset(destIndex: number, changeset: RevisionDelta, timeDelta: number) {
    const changesetWrapper = {
      deltaRev: destIndex - this.rev,
      deltaTime: timeDelta,
      getValue: () => changeset,
    };
    this.changesets.push(changesetWrapper);
    this.changesets.sort((a, b) => (b.deltaRev - a.deltaRev));
  }
}

class RevisionInfo {
  private revisionInfo: Record<number|string, number|Revision> = {};

  constructor() {
    this.revisionInfo.latest = window.clientVars.collab_client_vars.rev || -1;
    window.revisionInfo = this.revisionInfo;
  }

  addChangeset =  (fromIndex: number, toIndex: number, changeset: RevisionDelta, backChangeset: RevisionDelta, timeDelta: number)=> {
    const startRevision = (this.revisionInfo[fromIndex] || this.createNew(fromIndex)) as Revision;
    const endRevision = (this.revisionInfo[toIndex] || this.createNew(toIndex)) as Revision;
    startRevision.addChangeset(toIndex, changeset, timeDelta);
    endRevision.addChangeset(fromIndex, backChangeset, -1 * timeDelta);
  }

  createNew =  (index: number)=> {
    this.revisionInfo![index] = new Revision(index);
    if (index > (this.revisionInfo.latest as number)) {
      this.revisionInfo.latest = index;
    }

    return this.revisionInfo[index];
  }
  // assuming that there is a path from fromIndex to toIndex, and that the links
  // are laid out in a skip-list format
  getPath =  (fromIndex: number, toIndex: number)=> {
    const changesets = [];
    const spans = [];
    const times = [];
    let elem = (this.revisionInfo[fromIndex] || this.createNew(fromIndex)) as Revision;
    if (elem.changesets.length !== 0 && fromIndex !== toIndex) {
      const reverse = !(fromIndex < toIndex);
      while (((elem.rev < toIndex) && !reverse) || ((elem.rev > toIndex) && reverse)) {
        let couldNotContinue = false;
        const oldRev = elem.rev;

        for (let i = reverse ? elem.changesets.length - 1 : 0;
             reverse ? i >= 0 : i < elem.changesets.length;
             i += reverse ? -1 : 1) {
          if (((elem.changesets[i].deltaRev < 0) && !reverse) ||
            ((elem.changesets[i].deltaRev > 0) && reverse)) {
            couldNotContinue = true;
            break;
          }

          if (((elem.rev + elem.changesets[i].deltaRev <= toIndex) && !reverse) ||
            ((elem.rev + elem.changesets[i].deltaRev >= toIndex) && reverse)) {
            const topush = elem.changesets[i];
            changesets.push(topush.getValue());
            spans.push(elem.changesets[i].deltaRev);
            times.push(topush.deltaTime);
            elem = this.revisionInfo[elem.rev + elem.changesets[i].deltaRev] as Revision;
            break;
          }
        }

        if (couldNotContinue || oldRev === elem.rev) break;
      }
    }

    let status = 'partial';
    if (elem.rev === toIndex) status = 'complete';

    return {
      fromRev: fromIndex,
      rev: elem.rev,
      status,
      changesets,
      spans,
      times,
    };
  }
}

export default new RevisionInfo();
