#!/bin/bash

# source: https://stackoverflow.com/questions/59895/get-the-source-directory-of-a-bash-script-from-within-the-script-itself#246128
MY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

# reliably move to the etherpad base folder before running it
cd "${MY_DIR}/../../../"

# start Etherpad assuming all dependencies are already installed
echo "Running Etherpad directly, assuming bin/installDeps.sh has already been run"
node node_modules/ep_etherpad-lite/node/server.js "${@}" > /dev/null &

sleep 10

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
