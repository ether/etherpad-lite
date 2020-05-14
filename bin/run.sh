#!/bin/sh

pecho() { printf %s\\n "$*"; }
log() { pecho "$@"; }
error() { log "ERROR: $@" >&2; }
fatal() { error "$@"; exit 1; }

# Move to the folder where ep-lite is installed
cd $(dirname $0)

# Was this script started in the bin folder? if yes move out
if [ -d "../bin" ]; then
  cd "../"
fi

ignoreRoot=0
for ARG in "$@"
do
  if [ "$ARG" = "--root" ]; then
    ignoreRoot=1
  fi
done

# Stop the script if it's started as root
if [ "$(id -u)" -eq 0 ] && [ $ignoreRoot -eq 0 ]; then
  echo "You shouldn't start Etherpad as root!"
  echo "Please type 'Etherpad rocks my socks' or supply the '--root' argument if you still want to start it as root"
  read rocks
  if [ ! "$rocks" = "Etherpad rocks my socks" ]
  then
    fatal "Your input was incorrect"
  fi
fi

# Prepare the environment
bin/installDeps.sh "$@" || exit 1

# Move to the node folder and start
log "Starting Etherpad..."

SCRIPTPATH=$(pwd -P)
exec node "$SCRIPTPATH/node_modules/ep_etherpad-lite/node/server.js" "$@"
