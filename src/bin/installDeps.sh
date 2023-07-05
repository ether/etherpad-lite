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

log "Removing src/node_modules."
rm -rf ./src/node_modules || true

# try to determine if plugins were installed using --no-save
ROOT_PLUGINS_EXIST=1
for file in node_modules/*
do
  if [ ! -e "$file" ]; then break; fi
  if [ -L "$file" ] && [ "$file" = "node_modules/ep_etherpad-lite" ]; then break; fi

  if expr "$file" : "node_modules/ep_*" > /dev/null; then
    ROOT_PLUGINS_EXIST=0
  fi
done

PACKAGE_EXISTS=1
PACKAGELOCK_EXISTS=1
if test -f ./package.json; then PACKAGE_EXISTS=0;fi
if test -f ./package-lock.json; then PACKAGELOCK_EXISTS=0;fi

if [ "$PACKAGE_EXISTS" = "1" ] || [ "$PACKAGELOCK_EXISTS" = "1" ]; then
  if [ "$ROOT_PLUGINS_EXIST" = "0" ]; then
    log "You have plugins in ./node_modules but don't have a package.json or package-lock.json file."
    log "Please manually remove your ./node_modules directory, run this script again and install any plugins with npm i ep_plugin1 ep_plugin2 afterwards"
    exit 1
  fi
fi

log "Linking src as new package ep_etherpad-lite."
exit_code=0
(cd ./src && npm link --bin-links=false) || exit_code=$?

if [ "$exit_code" != 0 ]; then
  log "npm link failed. If there was a permission error, please set a prefix for npm."
  log "The prefix can be set e.g. with npm config set prefix $HOME/.npm-packages"
  log "This will create a symlink in $HOME/.npm-packages/lib/node_modules that points to this directory."
  exit 1
fi

log "Installing dependencies..."
if [ "$NODE_ENV" = "production" ]; then
  log "Installing production dependencies"
  npm link ep_etherpad-lite --omit=optional --omit=dev --save --package-lock=true --bin-links=false || exit 1
else
  log "Installing dev dependencies"
  npm link ep_etherpad-lite --omit=optional --save --package-lock=true --bin-links=false || exit 1
fi

log "Adding symlinks for plugin backwards compatibility"
mkdir src/node_modules -p
ln -s ../../node_modules/async src/node_modules/async
ln -s ../../node_modules/cheerio src/node_modules/cheerio
ln -s ../../node_modules/express src/node_modules/express
ln -s ../../node_modules/formidable src/node_modules/formidable
ln -s ../../node_modules/log4js src/node_modules/log4js
ln -s ../../node_modules/supertest src/node_modules/supertest


# Remove all minified data to force node creating it new
log "Clearing minified cache..."
rm -f var/minified*

exit 0
