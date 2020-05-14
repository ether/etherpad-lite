#!/bin/sh

# minimum required node version
REQUIRED_NODE_MAJOR=10
REQUIRED_NODE_MINOR=13

# minimum required npm version
REQUIRED_NPM_MAJOR=5
REQUIRED_NPM_MINOR=5

pecho() { printf %s\\n "$*"; }
log() { pecho "$@"; }
error() { log "ERROR: $@" >&2; }
fatal() { error "$@"; exit 1; }
is_cmd() { command -v "$@" >/dev/null 2>&1; }

require_minimal_version() {
  PROGRAM_LABEL="$1"
  VERSION_STRING="$2"
  REQUIRED_MAJOR="$3"
  REQUIRED_MINOR="$4"

  # Flag -s (--only-delimited on GNU cut) ensures no string is returned
  # when there is no match
  DETECTED_MAJOR=$(pecho "$VERSION_STRING" | cut -s -d "." -f 1)
  DETECTED_MINOR=$(pecho "$VERSION_STRING" | cut -s -d "." -f 2)

  [ -n "$DETECTED_MAJOR" ] || fatal "Cannot extract $PROGRAM_LABEL major version from version string \"$VERSION_STRING\""

  [ -n "$DETECTED_MINOR" ] || fatal "Cannot extract $PROGRAM_LABEL minor version from version string \"$VERSION_STRING\""

  case "$DETECTED_MAJOR" in
      ''|*[!0-9]*)
        fatal "$PROGRAM_LABEL major version from \"$VERSION_STRING\" is not a number. Detected: \"$DETECTED_MAJOR\""
        ;;
  esac

  case "$DETECTED_MINOR" in
      ''|*[!0-9]*)
        fatal "$PROGRAM_LABEL minor version from \"$VERSION_STRING\" is not a number. Detected: \"$DETECTED_MINOR\""
  esac

  [ "$DETECTED_MAJOR" -gt "$REQUIRED_MAJOR" ] || ([ "$DETECTED_MAJOR" -eq "$REQUIRED_MAJOR" ] && [ "$DETECTED_MINOR" -ge "$REQUIRED_MINOR" ]) \
    || fatal "Your $PROGRAM_LABEL version \"$VERSION_STRING\" is too old. $PROGRAM_LABEL $REQUIRED_MAJOR.$REQUIRED_MINOR.x or higher is required."
}

# Move to the folder where ep-lite is installed
cd "$(dirname "$0")"/..

# Is node installed?
# Not checking io.js, default installation creates a symbolic link to node
is_cmd node || fatal "Please install node.js ( https://nodejs.org )"

# Is npm installed?
is_cmd npm || fatal "Please install npm ( https://npmjs.org )"

# Check npm version
NPM_VERSION_STRING=$(npm --version)

require_minimal_version "npm" "$NPM_VERSION_STRING" "$REQUIRED_NPM_MAJOR" "$REQUIRED_NPM_MINOR"

# Check node version
NODE_VERSION_STRING=$(node --version)
NODE_VERSION_STRING=${NODE_VERSION_STRING#"v"}

require_minimal_version "nodejs" "$NODE_VERSION_STRING" "$REQUIRED_NODE_MAJOR" "$REQUIRED_NODE_MINOR"

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

log "Ensure that all dependencies are up to date...  If this is the first time you have run Etherpad please be patient."
(
  mkdir -p node_modules
  cd node_modules
  [ -e ep_etherpad-lite ] || ln -s ../src ep_etherpad-lite
  cd ep_etherpad-lite
  npm ci
) || {
  rm -rf src/node_modules
  exit 1
}

# Remove all minified data to force node creating it new
log "Clearing minified cache..."
rm -f var/minified*

exit 0
