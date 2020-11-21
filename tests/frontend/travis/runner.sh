#!/bin/sh

pecho() { printf %s\\n "$*"; }
log() { pecho "$@"; }
error() { log "ERROR: $@" >&2; }
fatal() { error "$@"; exit 1; }
try() { "$@" || fatal "'$@' failed"; }

[ -n "${SAUCE_USERNAME}" ] || fatal "SAUCE_USERNAME is unset - exiting"
[ -n "${SAUCE_ACCESS_KEY}" ] || fatal "SAUCE_ACCESS_KEY is unset - exiting"

MY_DIR=$(try cd "${0%/*}" && try pwd) || exit 1

# reliably move to the etherpad base folder before running it
try cd "${MY_DIR}/../../../"

log "Assuming bin/installDeps.sh has already been run"
node node_modules/ep_etherpad-lite/node/server.js --experimental-worker "${@}" &
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

# start the remote runner
try cd "${MY_DIR}"
log "Starting the remote runner..."
node remote_runner.js
exit_code=$?

kill "$(cat /tmp/sauce.pid)"
kill "$ep_pid" && wait "$ep_pid"
log "Done."
exit "$exit_code"
