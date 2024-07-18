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

import AttributeMap from './AttributeMap'
import AttributePool from "./AttributePool";
import {AText} from "../../node/types/PadType";
import {Attribute} from "./types/Attribute";

const Changeset = require('./Changeset');


class Changesettracker {
  private scheduler: WindowProxy
  private readonly apool: AttributePool
  private baseAText: {
    attribs: Attribute[]
  }
  private submittedChangeset: null
  private userChangeset: any
  private tracking: boolean
  private applyingNonUserChanges: boolean
  private aceCallbacksProvider: any
  private changeCallback: (() => void) | null = null
  private changeCallbackTimeout: number | null = null

  constructor(scheduler: WindowProxy, apool: AttributePool, aceCallbacksProvider: any) {
    this.scheduler = scheduler
    this.apool = apool
    this.aceCallbacksProvider = aceCallbacksProvider
    // latest official text from server
    this.baseAText = Changeset.makeAText('\n');
    // changes applied to baseText that have been submitted
    this.submittedChangeset = null
    // changes applied to submittedChangeset since it was prepared
    this.userChangeset = Changeset.identity(1)
    // is the changesetTracker enabled
    this.tracking = false
    this.applyingNonUserChanges = false
  }

  setChangeCallbackTimeout = () => {
    // can call this multiple times per call-stack, because
    // we only schedule a call to changeCallback if it exists
    // and if there isn't a timeout already scheduled.
    if (this.changeCallback && this.changeCallbackTimeout == null) {
      this.changeCallbackTimeout = this.scheduler.setTimeout(() => {
        try {
          this.changeCallback!();
        } catch (pseudoError) {
          // as empty as my soul
        } finally {
          this.changeCallbackTimeout = null;
        }
      }, 0);
    }
  }
  isTracking = () => this.tracking
  setBaseText = (text: string) => {
    this.setBaseAttributedText(Changeset.makeAText(text), null);
  }
  setBaseAttributedText = (atext: AText, apoolJsonObj?: AttributePool | null) => {
    this.aceCallbacksProvider.withCallbacks('setBaseText', (callbacks: { setDocumentAttributedText: (arg0: AText) => void; }) => {
      this.tracking = true;
      this.baseAText = Changeset.cloneAText(atext);
      if (apoolJsonObj) {
        const wireApool = (new AttributePool()).fromJsonable(apoolJsonObj);
        this.baseAText.attribs = Changeset.moveOpsToNewPool(this.baseAText.attribs, wireApool, this.apool);
      }
      this.submittedChangeset = null;
      this.userChangeset = Changeset.identity(atext.text.length);
      this.applyingNonUserChanges = true;
      try {
        callbacks.setDocumentAttributedText(atext);
      } finally {
        this.applyingNonUserChanges = false;
      }
    });
  }
  composeUserChangeset = (c: number) => {
    if (!this.tracking) return;
    if (this.applyingNonUserChanges) return;
    if (Changeset.isIdentity(c)) return;
    this.userChangeset = Changeset.compose(this.userChangeset, c, this.apool);

    this.setChangeCallbackTimeout();
  }

  applyChangesToBase = (c: number, optAuthor: string, apoolJsonObj: AttributePool) => {
    if (!this.tracking) return;

    this.aceCallbacksProvider.withCallbacks('applyChangesToBase', (callbacks: { applyChangesetToDocument: (arg0: any, arg1: boolean) => void; }) => {
      if (apoolJsonObj) {
        const wireApool = (new AttributePool()).fromJsonable(apoolJsonObj);
        c = Changeset.moveOpsToNewPool(c, wireApool, this.apool);
      }

      this.baseAText = Changeset.applyToAText(c, this.baseAText, this.apool);

      let c2 = c;
      if (this.submittedChangeset) {
        const oldSubmittedChangeset = this.submittedChangeset;
        this.submittedChangeset = Changeset.follow(c, oldSubmittedChangeset, false, this.apool);
        c2 = Changeset.follow(oldSubmittedChangeset, c, true, this.apool);
      }

      const preferInsertingAfterUserChanges = true;
      const oldUserChangeset = this.userChangeset;
      this.userChangeset = Changeset.follow(
        c2, oldUserChangeset, preferInsertingAfterUserChanges, this.apool);
      const postChange = Changeset.follow(
        oldUserChangeset, c2, !preferInsertingAfterUserChanges, this.apool);

      const preferInsertionAfterCaret = true; // (optAuthor && optAuthor > thisAuthor);
      this.applyingNonUserChanges = true;
      try {
        callbacks.applyChangesetToDocument(postChange, preferInsertionAfterCaret);
      } finally {
        this.applyingNonUserChanges = false;
      }
    });
  }

  prepareUserChangeset = () => {
    // If there are user changes to submit, 'changeset' will be the
    // changeset, else it will be null.
    let toSubmit;
    if (this.submittedChangeset) {
      // submission must have been canceled, prepare new changeset
      // that includes old submittedChangeset
      toSubmit = Changeset.compose(this.submittedChangeset, this.userChangeset, this.apool);
    } else {
      // Get my authorID
      // @ts-ignore
      const authorId = parent.parent.pad.myUserInfo.userId;

      // Sanitize authorship: Replace all author attributes with this user's author ID in case the
      // text was copied from another author.
      const cs = Changeset.unpack(this.userChangeset);
      const assem = Changeset.mergingOpAssembler();

      for (const op of Changeset.deserializeOps(cs.ops)) {
        if (op.opcode === '+') {
          const attribs = AttributeMap.fromString(op.attribs, this.apool);
          const oldAuthorId = attribs.get('author');
          if (oldAuthorId != null && oldAuthorId !== authorId) {
            attribs.set('author', authorId);
            op.attribs = attribs.toString();
          }
        }
        assem.append(op);
      }
      assem.endDocument();
      this.userChangeset = Changeset.pack(cs.oldLen, cs.newLen, assem.toString(), cs.charBank);
      Changeset.checkRep(this.userChangeset);

      if (Changeset.isIdentity(this.userChangeset)) toSubmit = null;
      else toSubmit = this.userChangeset;
    }

    let cs = null;
    if (toSubmit) {
      this.submittedChangeset = toSubmit;
      this.userChangeset = Changeset.identity(Changeset.newLen(toSubmit));

      cs = toSubmit;
    }
    let wireApool = null;
    if (cs) {
      const forWire = Changeset.prepareForWire(cs, this.apool);
      wireApool = forWire.pool.toJsonable();
      cs = forWire.translated;
    }

    const data = {
      changeset: cs,
      apool: wireApool,
    };
    return data;
  }
  applyPreparedChangesetToBase = () => {
    if (!this.submittedChangeset) {
      // violation of protocol; use prepareUserChangeset first
      throw new Error('applySubmittedChangesToBase: no submitted changes to apply');
    }
// bumpDebug("applying committed changeset: "+submittedChangeset.encodeToString(false));
    this.baseAText = Changeset.applyToAText(this.submittedChangeset, this.baseAText, this.apool);
    this.submittedChangeset = null;
  }
  setUserChangeNotificationCallback = (callback: (() => void) | null) => {
    this.changeCallback = callback;
  }
  hasUncommittedChanges = () => !!(this.submittedChangeset || (!Changeset.isIdentity(this.userChangeset)))
}

export default Changesettracker
