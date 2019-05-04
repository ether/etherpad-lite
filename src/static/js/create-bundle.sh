#!/bin/bash

set -eu

npx --no-install browserify \
  -r ./ace2_inner.js:ep_etherpad-lite/static/js/ace2_inner \
  -r ./browser.js:ep_etherpad-lite/static/js/browser \
  -r ./chat.js:ep_etherpad-lite/static/js/chat \
  -r ./pad_editbar.js:ep_etherpad-lite/static/js/pad_editbar \
  -r ./pad_impexp.js:ep_etherpad-lite/static/js/pad_impexp \
  -r ./pad.js:ep_etherpad-lite/static/js/pad \
  -r ./pluginfw/client_plugins.js:ep_etherpad-lite/static/js/pluginfw/client_plugins \
  -r ./pluginfw/hooks.js:ep_etherpad-lite/static/js/pluginfw/hooks \
  -r ./rjquery.js:ep_etherpad-lite/static/js/rjquery \
  ace2_common.js \
  ace.js \
  AttributeManager.js \
  AttributePool.js \
  broadcast.js \
  excanvas.js \
  pad_editor.js \
  security.js \
  skiplist.js \
  timeslider.js \
  underscore.js \
  undomodule.js \
  --outfile=bundle.js
