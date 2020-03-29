#!/bin/bash

# source: https://stackoverflow.com/questions/59895/get-the-source-directory-of-a-bash-script-from-within-the-script-itself#246128
MY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

# reliably move to the etherpad base folder
cd "${MY_DIR}/../../../"

# start Etherpad assuming all dependencies are already installed
echo "Running Etherpad directly, without checking/installing any dependencies"
node node_modules/ep_etherpad-lite/node/server.js "${@}" > /dev/null &

echo "Look for remote_runner.js"
find / -name remote_runner.js
echo "Search ended"

sleep 10

#start remote runner

cd "${MY_DIR}"

# On the Travs VM, remote_runner.js is found on
# /home/travis/build/ether/[secure]/tests/frontend/travis/remote_runner.js
# probably it is injected by travis or Saucelabs

node remote_runner.js
exit_code=$?

kill $!
kill $(cat /tmp/sauce.pid)
sleep 30

exit $exit_code
