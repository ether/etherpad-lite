#!/bin/sh

set -e

for dir in node_modules/ep_*; do
  dir=${dir#node_modules/}
  [ "$dir" != ep_etherpad-lite ] || continue
  node src/bin/plugins/checkPlugin.js "$dir" autofix autocommit autoupdate
done
