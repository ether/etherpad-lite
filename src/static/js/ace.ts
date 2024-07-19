'use strict';
/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

import {InnerWindow} from "./types/InnerWindow";
import {AText} from "./types/AText";
import AttributePool from "./AttributePool";

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

// requires: top
// requires: undefined

const hooks = require('./pluginfw/hooks');

const pluginUtils = require('./pluginfw/shared');
const ace2_inner = require('ep_etherpad-lite/static/js/ace2_inner')
const debugLog = (...args: string[] | Object[] | null[]) => {
};
const cl_plugins = require('ep_etherpad-lite/static/js/pluginfw/client_plugins')
const {Cssmanager} = require("./cssmanager");
// The inner and outer iframe's locations are about:blank, so relative URLs are relative to that.
// Firefox and Chrome seem to do what the developer intends if given a relative URL, but Safari
// errors out unless given an absolute URL for a JavaScript-created element.
const absUrl = (url: string) => new URL(url, window.location.href).href;

const eventFired = async (obj: any, event: string, cleanups: Function[] = [], predicate = () => true) => {
  if (typeof cleanups === 'function') {
    predicate = cleanups;
    cleanups = [];
  }
  await new Promise((resolve: Function, reject: Function) => {
    let cleanup: Function;
    const successCb = () => {
      if (!predicate()) return;
      debugLog(`Ace2Editor.init() ${event} event on`, obj);
      cleanup();
      resolve();
    };
    const errorCb = () => {
      const err = new Error(`Ace2Editor.init() error event while waiting for ${event} event`);
      debugLog(`${err} on object`, obj);
      cleanup();
      reject(err);
    };
    cleanup = () => {
      cleanup = () => {
      };
      obj!.removeEventListener(event, successCb);
      obj!.removeEventListener('error', errorCb);
    };
    cleanups.push(cleanup);
    obj!.addEventListener(event, successCb);
    obj!.addEventListener('error', errorCb);
  });
};

// Resolves when the frame's document is ready to be mutated. Browsers seem to be quirky about
// iframe ready events so this function throws the kitchen sink at the problem. Maybe one day we'll
// find a concise general solution.
const frameReady = async (frame: HTMLIFrameElement) => {
  // Can't do `const doc = frame.contentDocument;` because Firefox seems to asynchronously replace
  // the document object after the frame is first created for some reason. ¯\_(ツ)_/¯
  const doc: any = () => frame.contentDocument;
  const cleanups: Function[] = [];
  try {
    await Promise.race([
      eventFired(frame, 'load', cleanups),
      eventFired(frame.contentWindow, 'load', cleanups),
      eventFired(doc(), 'load', cleanups),
      eventFired(doc(), 'DOMContentLoaded', cleanups),
      eventFired(doc(), 'readystatechange', cleanups, () => doc.readyState === 'complete'),
    ]);
  } finally {
    for (const cleanup of cleanups) cleanup();
  }
};

export class Ace2Editor {
  callWithAce(arg0: (ace: any) => void, cmd?: string, flag?: boolean) {
    throw new Error("Method not implemented.");
  }

  focus = () => {

  }

  setEditable = (editable: boolean)=>{

  }

  importAText = (atext: AText, apool: AttributePool, flag: boolean)=>{

}

  setProperty = (ev: string, padFontFam: string|boolean)=>{

  }

  info = {editor: this};
  loaded = false;
  actionsPendingInit: Function[] = [];


  constructor() {
    for (const fnName of this.aceFunctionsPendingInit) {
      // Note: info[`ace_${fnName}`] does not exist yet, so it can't be passed directly to
      // pendingInit(). A simple wrapper is used to defer the info[`ace_${fnName}`] lookup until
      // method invocation.
      // @ts-ignore
      this[fnName] = this.pendingInit(function (...args) {
        // @ts-ignore
        this.info[`ace_${fnName}`].apply(this, args);
      });
    }
  }

  pendingInit = (func: Function) => (...args: any[]) => {
    const action = () => func.apply(this, args);
    if (this.loaded) return action();
    this.actionsPendingInit.push(action);
  }

  doActionsPendingInit = () => {
    for (const fn of this.actionsPendingInit) fn();
    this.actionsPendingInit = [];
  }

  // The following functions (prefixed by 'ace_')  are exposed by editor, but
  // execution is delayed until init is complete
  aceFunctionsPendingInit = [
    'importText',
    'importAText',
    'focus',
    'setEditable',
    'setOnKeyPress',
    'setOnKeyDown',
    'setNotifyDirty',
    'setProperty',
    'setBaseText',
    'setBaseAttributedText',
    'applyChangesToBase',
    'applyPreparedChangesetToBase',
    'setUserChangeNotificationCallback',
    'setAuthorInfo',
    'callWithAce',
    'execCommand',
    'replaceRange',
  ]

  // @ts-ignore
  exportText = () => this.loaded ? this.info.ace_exportText() : '(awaiting init)\n';
  // @ts-ignore
  getInInternationalComposition = () => this.loaded ? this.info.ace_getInInternationalComposition() : null;


  // prepareUserChangeset:
  // Returns null if no new changes or ACE not ready.  Otherwise, bundles up all user changes
  // to the latest base text into a Changeset, which is returned (as a string if encodeAsString).
  // If this method returns a truthy value, then applyPreparedChangesetToBase can be called at some
  // later point to consider these changes part of the base, after which prepareUserChangeset must
  // be called again before applyPreparedChangesetToBase. Multiple consecutive calls to
  // prepareUserChangeset will return an updated changeset that takes into account the latest user
  // changes, and modify the changeset to be applied by applyPreparedChangesetToBase accordingly.
  // @ts-ignore
  prepareUserChangeset = () => this.loaded ? this.info.ace_prepareUserChangeset() : null;
  addStyleTagsFor = (doc: Document, files: string[]) => {
    for (const file of files) {
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = absUrl(encodeURI(file));
      doc.head.appendChild(link);
    }
  }

  destroy = this.pendingInit(() => {
    // @ts-ignore
    this.info.ace_dispose();
    // @ts-ignore
    this.info.frame.parentNode.removeChild(this.info.frame);
    // @ts-ignore
    this.info = null; // prevent IE 6 closure memory leaks
  });

  init = async (containerId: string, initialCode: string) => {
    debugLog('Ace2Editor.init()');
    // @ts-ignore
    this.importText(initialCode);

    const includedCSS = [
      `../static/css/iframe_editor.css?v=${window.clientVars.randomVersionString}`,
      `../static/css/pad.css?v=${window.clientVars.randomVersionString}`,
      ...hooks.callAll('aceEditorCSS').map(
        // Allow urls to external CSS - http(s):// and //some/path.css
        (p: string) => /\/\//.test(p) ? p : `../static/plugins/${p}`),
      `../static/skins/${window.clientVars.skinName}/pad.css?v=${window.clientVars.randomVersionString}`,
    ];

    const skinVariants = window.clientVars.skinVariants.split(' ').filter((x: string) => x !== '');

    const outerFrame = document.createElement('iframe');
    outerFrame.name = 'ace_outer';
    outerFrame.frameBorder = String(0); // for IE
    outerFrame.title = 'Ether';
    // Some browsers do strange things unless the iframe has a src or srcdoc property:
    //   - Firefox replaces the frame's contentWindow.document object with a different object after
    //     the frame is created. This can be worked around by waiting for the window's load event
    //     before continuing.
    //   - Chrome never fires any events on the frame or document. Eventually the document's
    //     readyState becomes 'complete' even though it never fires a readystatechange event.
    //   - Safari behaves like Chrome.
    // srcdoc is avoided because Firefox's Content Security Policy engine does not properly handle
    // 'self' with nested srcdoc iframes: https://bugzilla.mozilla.org/show_bug.cgi?id=1721296
    outerFrame.src = '../static/empty.html';
    // @ts-ignore
    this.info.frame = outerFrame;
    document.getElementById(containerId)!.appendChild(outerFrame);
    const outerWindow = outerFrame.contentWindow;

    debugLog('Ace2Editor.init() waiting for outer frame');
    await frameReady(outerFrame);
    debugLog('Ace2Editor.init() outer frame ready');

    // Firefox might replace the outerWindow.document object after iframe creation so this variable
    // is assigned after the Window's load event.
    const outerDocument = outerWindow!.document;

    // <html> tag
    outerDocument.documentElement.classList.add('outer-editor', 'outerdoc', ...skinVariants);

    // <head> tag
    this.addStyleTagsFor(outerDocument, includedCSS);
    const outerStyle = outerDocument.createElement('style');
    outerStyle.type = 'text/css';
    outerStyle.title = 'dynamicsyntax';
    outerDocument.head.appendChild(outerStyle);

    // <body> tag
    outerDocument.body.id = 'outerdocbody';
    outerDocument.body.classList.add('outerdocbody', ...pluginUtils.clientPluginNames());
    const sideDiv = outerDocument.createElement('div');
    sideDiv.id = 'sidediv';
    sideDiv.classList.add('sidediv');
    outerDocument.body.appendChild(sideDiv);
    const sideDivInner = outerDocument.createElement('div');
    sideDivInner.id = 'sidedivinner';
    sideDivInner.classList.add('sidedivinner');
    sideDiv.appendChild(sideDivInner);
    const lineMetricsDiv = outerDocument.createElement('div');
    lineMetricsDiv.id = 'linemetricsdiv';
    lineMetricsDiv.appendChild(outerDocument.createTextNode('x'));
    outerDocument.body.appendChild(lineMetricsDiv);

    const innerFrame = outerDocument.createElement('iframe');
    innerFrame.name = 'ace_inner';
    innerFrame.title = 'pad';
    // The iframe MUST have a src or srcdoc property to avoid browser quirks. See the comment above
    // outerFrame.srcdoc.
    innerFrame.src = 'empty.html';
    outerDocument.body.insertBefore(innerFrame, outerDocument.body.firstChild);
    const innerWindow: InnerWindow = innerFrame.contentWindow!;

    debugLog('Ace2Editor.init() waiting for inner frame');
    await frameReady(innerFrame);
    debugLog('Ace2Editor.init() inner frame ready');

    // Firefox might replace the innerWindow.document object after iframe creation so this variable
    // is assigned after the Window's load event.
    const innerDocument = innerWindow!.document;

    // <html> tag
    innerDocument.documentElement.classList.add('inner-editor', ...skinVariants);

    // <head> tag
    this.addStyleTagsFor(innerDocument, includedCSS);

    const innerStyle = innerDocument.createElement('style');
    innerStyle.type = 'text/css';
    innerStyle.title = 'dynamicsyntax';
    innerDocument.head.appendChild(innerStyle);
    const headLines: string[] = [];
    hooks.callAll('aceInitInnerdocbodyHead', {iframeHTML: headLines});
    innerDocument.head.appendChild(
      innerDocument.createRange().createContextualFragment(headLines.join('\n')));

    // <body> tag
    innerDocument.body.id = 'innerdocbody';
    innerDocument.body.classList.add('innerdocbody');
    innerDocument.body.setAttribute('spellcheck', 'false');
    innerDocument.body.appendChild(innerDocument.createTextNode('\u00A0')); // &nbsp;

    // intentially moved before requiring client_plugins to save a 307
    innerWindow!.Ace2Inner = ace2_inner;
    innerWindow!.plugins = cl_plugins;

    innerWindow!.$ = innerWindow.jQuery = window.$;

    debugLog('Ace2Editor.init() waiting for plugins');


    debugLog('Ace2Editor.init() waiting for Ace2Inner.init()');
    await innerWindow.Ace2Inner.init(this.info, {
      inner: new Cssmanager(innerStyle.sheet),
      outer: new Cssmanager(outerStyle.sheet),
      parent: new Cssmanager((document.querySelector('style[title="dynamicsyntax"]') as HTMLStyleElement)!.sheet),
    });
    debugLog('Ace2Editor.init() Ace2Inner.init() returned');
    this.loaded = true;
    this.doActionsPendingInit();
    debugLog('Ace2Editor.init() done');
  }
}
