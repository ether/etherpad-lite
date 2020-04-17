#!/bin/bash

set -eu

# source: https://stackoverflow.com/questions/59895/how-to-get-the-source-directory-of-a-bash-script-from-within-the-script-itself#246128
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

echo "Running directly, without checking/installing dependencies"
node "${DIR}/node_modules/ep_etherpad-lite/node/server.js" "${@}"