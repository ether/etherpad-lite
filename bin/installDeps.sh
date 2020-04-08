#!/bin/sh

# minimum required node version
REQUIRED_NODE_MAJOR=10
REQUIRED_NODE_MINOR=13

# minimum required npm version
REQUIRED_NPM_MAJOR=5
REQUIRED_NPM_MINOR=5

require_minimal_version() {
  PROGRAM_LABEL="$1"
  VERSION_STRING="$2"
  REQUIRED_MAJOR="$3"
  REQUIRED_MINOR="$4"

  # Flag -s (--only-delimited on GNU cut) ensures no string is returned
  # when there is no match
  DETECTED_MAJOR=$(echo $VERSION_STRING | cut -s -d "." -f 1)
  DETECTED_MINOR=$(echo $VERSION_STRING | cut -s -d "." -f 2)

  if [ -z "$DETECTED_MAJOR" ]; then
    printf 'Cannot extract %s major version from version string "%s"\n' "$PROGRAM_LABEL" "$VERSION_STRING" >&2
    exit 1
  fi

  if [ -z "$DETECTED_MINOR" ]; then
    printf 'Cannot extract %s minor version from version string "%s"\n' "$PROGRAM_LABEL" "$VERSION_STRING" >&2
    exit 1
  fi

  case "$DETECTED_MAJOR" in
      ''|*[!0-9]*)
        printf '%s major version from "%s" is not a number. Detected: "%s"\n' "$PROGRAM_LABEL" "$VERSION_STRING" "$DETECTED_MAJOR" >&2
        exit 1
        ;;
  esac

  case "$DETECTED_MINOR" in
      ''|*[!0-9]*)
        printf '%s minor version from "%s" is not a number. Detected: "%s"\n' "$PROGRAM_LABEL" "$VERSION_STRING" "$DETECTED_MINOR" >&2
        exit 1
  esac

  if [ "$DETECTED_MAJOR" -lt "$REQUIRED_MAJOR" ] || ([ "$DETECTED_MAJOR" -eq "$REQUIRED_MAJOR" ] && [ "$DETECTED_MINOR" -lt "$REQUIRED_MINOR" ]); then
    printf 'Your %s version "%s" is too old. %s %d.%d.x or higher is required.\n' "$PROGRAM_LABEL" "$VERSION_STRING" "$PROGRAM_LABEL" "$REQUIRED_MAJOR" "$REQUIRED_MINOR" >&2
    exit 1
  fi
}

#Move to the folder where ep-lite is installed
cd $(dirname $0)

#Was this script started in the bin folder? if yes move out
if [ -d "../bin" ]; then
  cd "../"
fi

#Is node installed?
#Not checking io.js, default installation creates a symbolic link to node
hash node > /dev/null 2>&1 || {
  echo "Please install node.js ( https://nodejs.org )" >&2
  exit 1
}

#Is npm installed?
hash npm > /dev/null 2>&1 || {
  echo "Please install npm ( https://npmjs.org )" >&2
  exit 1
}

#Check npm version
NPM_VERSION_STRING=$(npm --version)

require_minimal_version "npm" "$NPM_VERSION_STRING" "$REQUIRED_NPM_MAJOR" "$REQUIRED_NPM_MINOR"

#Check node version
NODE_VERSION_STRING=$(node --version)
NODE_VERSION_STRING=${NODE_VERSION_STRING#"v"}

require_minimal_version "nodejs" "$NODE_VERSION_STRING" "$REQUIRED_NODE_MAJOR" "$REQUIRED_NODE_MINOR"

#Get the name of the settings file
settings="settings.json"
a='';
for arg in "$@"; do
  if [ "$a" = "--settings" ] || [ "$a" = "-s" ]; then settings=$arg; fi
  a=$arg
done

#Does a $settings exist? if not copy the template
if [ ! -f $settings ]; then
  echo "Copy the settings template to $settings..."
  cp settings.json.template $settings || exit 1
fi

echo "Ensure that all dependencies are up to date...  If this is the first time you have run Etherpad please be patient."
(
  mkdir -p node_modules
  cd node_modules
  [ -e ep_etherpad-lite ] || ln -s ../src ep_etherpad-lite
  cd ep_etherpad-lite
  npm install --save --loglevel warn
) || {
  rm -rf src/node_modules
  exit 1
}

#Remove all minified data to force node creating it new
echo "Clearing minified cache..."
rm -f var/minified*

exit 0
