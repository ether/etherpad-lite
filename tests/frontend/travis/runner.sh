#!/bin/sh

# source: https://stackoverflow.com/questions/59895/get-the-source-directory-of-a-bash-script-from-within-the-script-itself#246128
MY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

# reliably move to the etherpad base folder
cd "${MY_DIR}/../../../"

# start Etherpad assuming all dependencies are already installed
echo "Running Etherpad directly, without checking/installing dependencies"
node "${MY_DIR}/node_modules/ep_etherpad-lite/node/server.js" "${@}" > /dev/null &

sleep 10

#start remote runner
node remote_runner.js
exit_code=$?

kill $!
kill $(cat /tmp/sauce.pid)
sleep 30

exit $exit_code
