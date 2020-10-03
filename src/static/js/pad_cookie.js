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

const createCookie = require('./pad_utils').createCookie;
const readCookie = require('./pad_utils').readCookie;

exports.padcookie = new class {
  constructor() {
    this.cookieName_ = window.location.protocol === 'https:' ? 'prefs' : 'prefsHttp';
    const prefs = this.readPrefs_() || {};
    delete prefs.userId;
    delete prefs.name;
    delete prefs.colorId;
    this.prefs_ = prefs;
    this.savePrefs_();
  }

  init() {
    if (this.readPrefs_() == null) {
      $.gritter.add({
        title: 'Error',
        text: html10n.get('pad.noCookie'),
        sticky: true,
        class_name: 'error',
      });
    }
  }

  readPrefs_() {
    const jsonEsc = readCookie(this.cookieName_);
    if (jsonEsc == null) return null;
    try {
      return JSON.parse(unescape(jsonEsc));
    } catch (e) {
      return null;
    }
  }

  savePrefs_() {
    createCookie(this.cookieName_, escape(JSON.stringify(this.prefs_)), 365 * 100);
  }

  getPref(prefName) {
    return this.prefs_[prefName];
  }

  setPref(prefName, value) {
    this.prefs_[prefName] = value;
    this.savePrefs_();
  }
}();
