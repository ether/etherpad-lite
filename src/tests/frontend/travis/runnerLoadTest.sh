#!/bin/sh

pecho() { printf %s\\n "$*"; }
log() { pecho "$@"; }
error() { log "ERROR: $@" >&2; }
fatal() { error "$@"; exit 1; }
try() { "$@" || fatal "'$@' failed"; }

# Move to the Etherpad base directory.
MY_DIR=$(try cd "${0%/*}" && try pwd -P) || exit 1
try cd "${MY_DIR}/../../../.."

try sed -e '
s!"loadTest":[^,]*!"loadTest": true!
# Reduce rate limit aggressiveness
s!"points":[^,]*!"points": 1000!
' settings.json.template >settings.json

log "Assuming src/bin/installDeps.sh has already been run"
node src/node/server.js "${@}" >/dev/null &
ep_pid=$!

log "Waiting for Etherpad to accept connections (http://localhost:9001)..."
connected=false
can_connect() {
    curl -sSfo /dev/null http://localhost:9001/ || return 1
    connected=true
}
now() { date +%s; }
start=$(now)
while [ $(($(now) - $start)) -le 15 ] && ! can_connect; do
    sleep 1
done
[ "$connected" = true ] \
    || fatal "Timed out waiting for Etherpad to accept connections"
log "Successfully connected to Etherpad on http://localhost:9001"

# Build the minified files
try curl http://localhost:9001/p/minifyme -f -s >/dev/null

# just in case, let's wait for another 10 seconds before going on
sleep 10

log "Running the load tests..."
# -d is duration of test, -a is number of authors to test with
# by specifying the number of authors we set the overall rate of messages
etherpad-loadtest -d $1 -a $2
exit_code=$?

kill "$ep_pid" && wait "$ep_pid"
log "Done."
exit "$exit_code"
