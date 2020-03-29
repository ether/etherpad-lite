#!/bin/bash

# do not continue if there is an error
set -eu

# source: https://stackoverflow.com/questions/59895/get-the-source-directory-of-a-bash-script-from-within-the-script-itself#246128
MY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

# reliably move to the etherpad base folder before running it
cd "${MY_DIR}/../../../"

# start Etherpad assuming all dependencies are already installed
echo "Running Etherpad directly, assuming bin/installDeps.sh has already been run"
node node_modules/ep_etherpad-lite/node/server.js "${@}" > /dev/null &

# wait for at most 15 seconds until Etherpad starts accepting connections
#
# modified from:
# https://unix.stackexchange.com/questions/5277/how-do-i-tell-a-script-to-wait-for-a-process-to-start-accepting-requests-on-a-po#349138
#
(timeout 15 bash -c 'until echo > /dev/tcp/localhost/9001; do sleep 0.5; done') || \
    (echo "Could not connect to Etherpad on http://localhost:9001" ; exit 1)

# We successfully connected to Etherpad.
# Just in case, let's wait for another second before going on
sleep 1

# On the Travis VM, remote_runner.js is found at
# /home/travis/build/ether/[secure]/tests/frontend/travis/remote_runner.js
# which is the same directory that contains this script.
# Let's move back there.
#
# Probably remote_runner.js is injected by Saucelabs.
cd "${MY_DIR}"

# start the remote runner
echo "Now starting the remote runner"
node remote_runner.js
exit_code=$?

kill $!
kill $(cat /tmp/sauce.pid)
sleep 30

exit $exit_code
