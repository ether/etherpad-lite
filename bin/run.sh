#!/bin/sh

pecho() { printf %s\\n "$*"; }
log() { pecho "$@"; }
error() { log "ERROR: $@" >&2; }
fatal() { error "$@"; exit 1; }

# Move to the folder where ep-lite is installed
cd "$(dirname "$0")"/..

ignoreRoot=0
for ARG in "$@"; do
  if [ "$ARG" = "--root" ]; then
    ignoreRoot=1
  fi
done

# Stop the script if it's started as root
if [ "$(id -u)" -eq 0 ] && [ "$ignoreRoot" -eq 0 ]; then
  cat <<EOF >&2
You shouldn't start Etherpad as root!
Please type 'Etherpad rocks my socks' (or restart with the '--root'
argument) if you still want to start it as root:
EOF
  printf "> " >&2
  read rocks
  [ "$rocks" = "Etherpad rocks my socks" ] || fatal "Your input was incorrect"
fi

# Prepare the environment
bin/installDeps.sh "$@" || exit 1

# Move to the node folder and start
log "Starting Etherpad..."

SCRIPTPATH=$(pwd -P)
exec node "$SCRIPTPATH/node_modules/ep_etherpad-lite/node/server.js" "$@"
