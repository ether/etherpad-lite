#!/bin/sh

# Move to the Etherpad base directory.
MY_DIR=$(cd "${0%/*}" && pwd -P) || exit 1
cd "${MY_DIR}/../.." || exit 1

# Source constants and useful functions
. src/bin/functions.sh

# Is node installed?
# Not checking io.js, default installation creates a symbolic link to node
is_cmd node || fatal "Please install node.js ( https://nodejs.org )"

# Is npm installed?
is_cmd npm || fatal "Please install npm ( https://npmjs.org )"

# Check npm version
require_minimal_version "npm" "$(get_program_version "npm")" \
    "$REQUIRED_NPM_MAJOR" "$REQUIRED_NPM_MINOR"

# Check node version
require_minimal_version "nodejs" "$(get_program_version "node")" \
    "$REQUIRED_NODE_MAJOR" "$REQUIRED_NODE_MINOR"

# Get the name of the settings file
settings="settings.json"
a='';
for arg in "$@"; do
  if [ "$a" = "--settings" ] || [ "$a" = "-s" ]; then settings=$arg; fi
  a=$arg
done

# Does a $settings exist? if not copy the template
if [ ! -f "$settings" ]; then
  log "Copy the settings template to $settings..."
  cp settings.json.template "$settings" || exit 1
fi

log "Installing dependencies..."
(
  mkdir -p node_modules &&
  cd node_modules &&
  { [ -d ep_etherpad-lite ] || ln -sf ../src ep_etherpad-lite; } &&
  cd ep_etherpad-lite &&
  npm ci --no-optional
) || exit 1

# Remove all minified data to force node creating it new
log "Clearing minified cache..."
rm -f var/minified*

exit 0
