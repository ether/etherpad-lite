#!/bin/bash
#
# Run Etherpad directly, assuming all the dependencies are already installed.
#
# Useful for developers, or users that know what they are doing. If you just
# upgraded Etherpad version, installed a new dependency, or are simply unsure
# of what to do, please execute bin/installDeps.sh once before running this
# script.

set -eu

# source: https://stackoverflow.com/questions/59895/how-to-get-the-source-directory-of-a-bash-script-from-within-the-script-itself#246128
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

echo "Running directly, without checking/installing dependencies"

# move to the base Etherpad directory. This will be necessary until Etherpad
# learns to run from arbitrary CWDs.
cd "${DIR}/.."

# run Etherpad main class
node "${DIR}/../node_modules/ep_etherpad-lite/node/server.js" "${@}"
