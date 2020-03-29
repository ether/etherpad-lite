#!/bin/bash
#
# This script directly runs Etherpad, assuming its dependencies were already
# installed via bin/installDeps.sh
#
# Please check README.md before using it

set -eu

# source: https://stackoverflow.com/questions/59895/get-the-source-directory-of-a-bash-script-from-within-the-script-itself#246128
MY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

export NODE_ENV="production"

echo "Running Etherpad directly, without checking/installing dependencies"
node "${MY_DIR}/node_modules/ep_etherpad-lite/node/server.js" "${@}"
