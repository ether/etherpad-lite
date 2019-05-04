#!/bin/bash

set -eu

npx --no-install browserify \
  ace2_common.js \
  ace.js \
  AttributeManager.js \
  AttributePool.js \
  broadcast.js \
  excanvas.js \
  pad_editor.js \
  pad.js \
  security.js \
  skiplist.js \
  timeslider.js \
  underscore.js \
  undomodule.js \
  --entry=entrypoint.js \
  --outfile=bundle.js
