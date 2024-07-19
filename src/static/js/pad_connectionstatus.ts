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

import {padModals} from "./pad_modals";

class PadConnectionStatus {
  private status: {
    what: string,
    why?: string
  } = {
    what: 'connecting',
  }

  init = () => {
    $('button#forcereconnect').on('click', () => {
      window.location.reload();
    });
  }

  connected = () => {
    this.status = {
      what: 'connected',
    };
    padModals.showModal('connected');
    padModals.hideOverlay();
  }
  reconnecting = () => {
    this.status = {
      what: 'reconnecting',
    };

    padModals.showModal('reconnecting');
    padModals.showOverlay();
  }
  disconnected
    =
    (msg: string) => {
      if (this.status.what === 'disconnected') return;

      this.status =
        {
          what: 'disconnected',
          why: msg,
        }

// These message IDs correspond to localized strings that are presented to the user. If a new
// message ID is added here then a new div must be added to src/templates/pad.html and the
// corresponding l10n IDs must be added to the language files in src/locales.
      const knownReasons = [
        'badChangeset',
        'corruptPad',
        'deleted',
        'disconnected',
        'initsocketfail',
        'looping',
        'rateLimited',
        'rejected',
        'slowcommit',
        'unauth',
        'userdup',
      ];
      let k = String(msg);
      if (knownReasons.indexOf(k) === -1) {
        // Fall back to a generic message.
        k = 'disconnected';
      }

      padModals.showModal(k);
      padModals.showOverlay();
    }
  isFullyConnected
    =
    () => this.status.what === 'connected'
  getStatus
    =
    () => this.status
}


export const padconnectionstatus = new PadConnectionStatus()
exports.padconnectionstatus = padconnectionstatus;
