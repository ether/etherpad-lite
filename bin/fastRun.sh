#!/bin/bash
#
# Run Etherpad directly, assuming all the dependencies are already installed.
#
# Useful for developers, or users that know what they are doing. If you just
# upgraded Etherpad version, installed a new dependency, or are simply unsure
# of what to do, please execute bin/installDeps.sh once before running this
# script.

pecho() { printf %s\\n "$*"; }
log() { pecho "$@"; }
error() { log "ERROR: $@" >&2; }
fatal() { error "$@"; exit 1; }

# Move to the folder where ep-lite is installed
cd "$(dirname "$0")"/..


# Move to the node folder and start
log "Starting Etherpad..."

SCRIPTPATH=$(pwd -P)
exec node "$SCRIPTPATH/node_modules/ep_etherpad-lite/node/server.js" "$@"
