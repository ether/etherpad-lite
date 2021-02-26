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

// requires: top
// requires: undefined

const hooks = require('./pluginfw/hooks');
const pluginUtils = require('./pluginfw/shared');

// The inner and outer iframe's locations are about:blank, so relative URLs are relative to that.
// Firefox and Chrome seem to do what the developer intends if given a relative URL, but Safari
// errors out unless given an absolute URL for a JavaScript-created element.
const absUrl = (url) => new URL(url, window.location.href).href;

const eventFired = async (obj, event, cleanups = [], predicate = () => true) => {
  if (typeof cleanups === 'function') {
    predicate = cleanups;
    cleanups = [];
  }
  await new Promise((resolve, reject) => {
    let cleanup;
    const successCb = () => {
      if (!predicate()) return;
      cleanup();
      resolve();
    };
    const errorCb = () => {
      const err = new Error(`Ace2Editor.init() error event while waiting for ${event} event`);
      cleanup();
      reject(err);
    };
    cleanup = () => {
      cleanup = () => {};
      obj.removeEventListener(event, successCb);
      obj.removeEventListener('error', errorCb);
    };
    cleanups.push(cleanup);
    obj.addEventListener(event, successCb);
    obj.addEventListener('error', errorCb);
  });
};

const pollCondition = async (predicate, cleanups, pollPeriod, timeout) => {
  let done = false;
  cleanups.push(() => { done = true; });
  // Pause a tick to give the predicate a chance to become true before adding latency.
  await new Promise((resolve) => setTimeout(resolve, 0));
  const start = Date.now();
  while (!done && !predicate()) {
    if (Date.now() - start > timeout) throw new Error('timeout');
    await new Promise((resolve) => setTimeout(resolve, pollPeriod));
  }
};

// Resolves when the frame's document is ready to be mutated:
//   - Firefox seems to replace the frame's contentWindow.document object with a different object
//     after the frame is created so we need to wait for the window's load event before continuing.
//   - Chrome doesn't need any waiting (not even next tick), but on Windows it never seems to fire
//     any events. Eventually the document's readyState becomes 'complete' (even though it never
//     fires a readystatechange event), so this function waits for that to happen to avoid returning
//     too soon on Firefox.
//   - Safari behaves like Chrome.
// I'm not sure how other browsers behave, so this function throws the kitchen sink at the problem.
// Maybe one day we'll find a concise general solution.
const frameReady = async (frame) => {
  // Can't do `const doc = frame.contentDocument;` because Firefox seems to asynchronously replace
  // the document object after the frame is first created for some reason. ¯\_(ツ)_/¯
  const doc = () => frame.contentDocument;
  const cleanups = [];
  try {
    await Promise.race([
      eventFired(frame, 'load', cleanups),
      eventFired(frame.contentWindow, 'load', cleanups),
      eventFired(doc(), 'load', cleanups),
      eventFired(doc(), 'DOMContentLoaded', cleanups),
      eventFired(doc(), 'readystatechange', cleanups, () => doc.readyState === 'complete'),
      // If all else fails, poll.
      pollCondition(() => doc().readyState === 'complete', cleanups, 10, 5000),
    ]);
  } finally {
    for (const cleanup of cleanups) cleanup();
  }
};

const Ace2Editor = function () {
  let info = {editor: this};
  let loaded = false;

  let actionsPendingInit = [];

  const pendingInit = (func) => function (...args) {
    const action = () => func.apply(this, args);
    if (loaded) return action();
    actionsPendingInit.push(action);
  };

  const doActionsPendingInit = () => {
    for (const fn of actionsPendingInit) fn();
    actionsPendingInit = [];
  };

  // The following functions (prefixed by 'ace_')  are exposed by editor, but
  // execution is delayed until init is complete
  const aceFunctionsPendingInit = [
    'importText',
    'importAText',
    'focus',
    'setEditable',
    'getFormattedCode',
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
    'setAuthorSelectionRange',
    'callWithAce',
    'execCommand',
    'replaceRange',
  ];

  for (const fnName of aceFunctionsPendingInit) {
    // Note: info[`ace_${fnName}`] does not exist yet, so it can't be passed directly to
    // pendingInit(). A simple wrapper is used to defer the info[`ace_${fnName}`] lookup until
    // method invocation.
    this[fnName] = pendingInit(function (...args) {
      info[`ace_${fnName}`].apply(this, args);
    });
  }

  this.exportText = () => loaded ? info.ace_exportText() : '(awaiting init)\n';

  this.getDebugProperty = (prop) => info.ace_getDebugProperty(prop);

  this.getInInternationalComposition =
      () => loaded ? info.ace_getInInternationalComposition() : false;

  // prepareUserChangeset:
  // Returns null if no new changes or ACE not ready.  Otherwise, bundles up all user changes
  // to the latest base text into a Changeset, which is returned (as a string if encodeAsString).
  // If this method returns a truthy value, then applyPreparedChangesetToBase can be called at some
  // later point to consider these changes part of the base, after which prepareUserChangeset must
  // be called again before applyPreparedChangesetToBase. Multiple consecutive calls to
  // prepareUserChangeset will return an updated changeset that takes into account the latest user
  // changes, and modify the changeset to be applied by applyPreparedChangesetToBase accordingly.
  this.prepareUserChangeset = () => loaded ? info.ace_prepareUserChangeset() : null;

  // returns array of {error: <browser Error object>, time: +new Date()}
  this.getUnhandledErrors = () => loaded ? info.ace_getUnhandledErrors() : [];

  const sortFilesByEmbeded = (files) => {
    const embededFiles = [];
    let remoteFiles = [];

    if (Ace2Editor.EMBEDED) {
      for (let i = 0, ii = files.length; i < ii; i++) {
        const file = files[i];
        if (Object.prototype.hasOwnProperty.call(Ace2Editor.EMBEDED, file)) {
          embededFiles.push(file);
        } else {
          remoteFiles.push(file);
        }
      }
    } else {
      remoteFiles = files;
    }

    return {embeded: embededFiles, remote: remoteFiles};
  };

  const addStyleTagsFor = (doc, files) => {
    const sorted = sortFilesByEmbeded(files);
    const embededFiles = sorted.embeded;
    const remoteFiles = sorted.remote;

    if (embededFiles.length > 0) {
      const css = embededFiles.map((f) => Ace2Editor.EMBEDED[f]).join('\n');
      const style = doc.createElement('style');
      style.type = 'text/css';
      style.appendChild(doc.createTextNode(css));
      doc.head.appendChild(style);
    }
    for (const file of remoteFiles) {
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = absUrl(encodeURI(file));
      doc.head.appendChild(link);
    }
  };

  this.destroy = pendingInit(() => {
    info.ace_dispose();
    info.frame.parentNode.removeChild(info.frame);
    info = null; // prevent IE 6 closure memory leaks
  });

  this.init = async function (containerId, initialCode) {
    this.importText(initialCode);

    // calls to these functions ($$INCLUDE_...)  are replaced when this file is processed
    // and compressed, putting the compressed code from the named file directly into the
    // source here.
    // these lines must conform to a specific format because they are passed by the build script:
    const includedCSS = [];
    const $$INCLUDE_CSS = (filename) => { includedCSS.push(filename); };
    $$INCLUDE_CSS('../static/css/iframe_editor.css');
    $$INCLUDE_CSS(`../static/css/pad.css?v=${clientVars.randomVersionString}`);
    includedCSS.push(...hooks.callAll('aceEditorCSS').map(
        // Allow urls to external CSS - http(s):// and //some/path.css
        (p) => /\/\//.test(p) ? p : `../static/plugins/${p}`));
    $$INCLUDE_CSS(
        `../static/skins/${clientVars.skinName}/pad.css?v=${clientVars.randomVersionString}`);

    const skinVariants = clientVars.skinVariants.split(' ').filter((x) => x !== '');

    const outerFrame = document.createElement('iframe');
    outerFrame.name = 'ace_outer';
    outerFrame.frameBorder = 0; // for IE
    outerFrame.title = 'Ether';
    info.frame = outerFrame;
    document.getElementById(containerId).appendChild(outerFrame);
    const outerWindow = outerFrame.contentWindow;

    // For some unknown reason Firefox replaces outerWindow.document with a new Document object some
    // time between running the above code and firing the outerWindow load event. Work around it by
    // waiting until the load event fires before mutating the Document object.
    await frameReady(outerFrame);

    // This must be done after the Window's load event. See above comment.
    const outerDocument = outerWindow.document;

    // <html> tag
    outerDocument.documentElement.classList.add('inner-editor', 'outerdoc', ...skinVariants);

    // <head> tag
    addStyleTagsFor(outerDocument, includedCSS);
    const outerStyle = outerDocument.createElement('style');
    outerStyle.type = 'text/css';
    outerStyle.title = 'dynamicsyntax';
    outerDocument.head.appendChild(outerStyle);
    const link = outerDocument.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'data:text/css,';
    outerDocument.head.appendChild(link);

    // <body> tag
    outerDocument.body.id = 'outerdocbody';
    outerDocument.body.classList.add('outerdocbody', ...pluginUtils.clientPluginNames());
    const sideDiv = outerDocument.createElement('div');
    sideDiv.id = 'sidediv';
    sideDiv.classList.add('sidediv');
    outerDocument.body.appendChild(sideDiv);
    const lineMetricsDiv = outerDocument.createElement('div');
    lineMetricsDiv.id = 'linemetricsdiv';
    lineMetricsDiv.appendChild(outerDocument.createTextNode('x'));
    outerDocument.body.appendChild(lineMetricsDiv);

    const innerFrame = outerDocument.createElement('iframe');
    innerFrame.name = 'ace_inner';
    innerFrame.title = 'pad';
    innerFrame.scrolling = 'no';
    innerFrame.frameBorder = 0;
    innerFrame.allowTransparency = true; // for IE
    innerFrame.ace_outerWin = outerWindow;
    outerDocument.body.insertBefore(innerFrame, outerDocument.body.firstChild);
    const innerWindow = innerFrame.contentWindow;

    // Wait before mutating the inner document. See above comment recarding outerWindow load.
    await frameReady(innerFrame);

    // This must be done after the Window's load event. See above comment.
    const innerDocument = innerWindow.document;

    // <html> tag
    innerDocument.documentElement.classList.add('inner-editor', ...skinVariants);

    // <head> tag
    addStyleTagsFor(innerDocument, includedCSS);
    const requireKernel = innerDocument.createElement('script');
    requireKernel.type = 'text/javascript';
    requireKernel.src =
        absUrl(`../static/js/require-kernel.js?v=${clientVars.randomVersionString}`);
    innerDocument.head.appendChild(requireKernel);
    // Pre-fetch modules to improve load performance.
    for (const module of ['ace2_inner', 'ace2_common']) {
      const script = innerDocument.createElement('script');
      script.type = 'text/javascript';
      script.src = absUrl(`../javascripts/lib/ep_etherpad-lite/static/js/${module}.js` +
                          `?callback=require.define&v=${clientVars.randomVersionString}`);
      innerDocument.head.appendChild(script);
    }
    const innerStyle = innerDocument.createElement('style');
    innerStyle.type = 'text/css';
    innerStyle.title = 'dynamicsyntax';
    innerDocument.head.appendChild(innerStyle);
    const headLines = [];
    hooks.callAll('aceInitInnerdocbodyHead', {iframeHTML: headLines});
    const tmp = innerDocument.createElement('div');
    tmp.innerHTML = headLines.join('\n');
    while (tmp.firstChild) innerDocument.head.appendChild(tmp.firstChild);

    // <body> tag
    innerDocument.body.id = 'innerdocbody';
    innerDocument.body.classList.add('innerdocbody');
    innerDocument.body.setAttribute('role', 'application');
    innerDocument.body.setAttribute('spellcheck', 'false');
    innerDocument.body.appendChild(innerDocument.createTextNode('\u00A0')); // &nbsp;

    await eventFired(requireKernel, 'load');
    const require = innerWindow.require;
    require.setRootURI(absUrl('../javascripts/src'));
    require.setLibraryURI(absUrl('../javascripts/lib'));
    require.setGlobalKeyPath('require');

    // intentially moved before requiring client_plugins to save a 307
    innerWindow.Ace2Inner = require('ep_etherpad-lite/static/js/ace2_inner');
    innerWindow.plugins = require('ep_etherpad-lite/static/js/pluginfw/client_plugins');
    innerWindow.plugins.adoptPluginsFromAncestorsOf(innerWindow);

    innerWindow.$ = innerWindow.jQuery = require('ep_etherpad-lite/static/js/rjquery').jQuery;

    await new Promise((resolve, reject) => innerWindow.plugins.ensure(
        (err) => err != null ? reject(err) : resolve()));
    await new Promise((resolve, reject) => innerWindow.Ace2Inner.init(
        info, (err) => err != null ? reject(err) : resolve()));
    loaded = true;
    doActionsPendingInit();
  };
};

exports.Ace2Editor = Ace2Editor;
