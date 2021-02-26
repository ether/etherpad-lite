#!/bin/sh

pecho() { printf %s\\n "$*"; }
log() { pecho "$@"; }
error() { log "ERROR: $@" >&2; }
fatal() { error "$@"; exit 1; }
is_cmd() { command -v "$@" >/dev/null 2>&1; }

# Move to the folder where ep-lite is installed
cd "$(cd "${0%/*}" && pwd -P)/../.."

# Is wget installed?
is_cmd wget || fatal "Please install wget"

# Is zip installed?
is_cmd zip || fatal "Please install zip"

# Is zip installed?
is_cmd unzip || fatal "Please install unzip"

START_FOLDER=$(pwd);
TMP_FOLDER=$(mktemp -d)

log "create a clean environment in $TMP_FOLDER..."
cp -ar . "$TMP_FOLDER"
cd "$TMP_FOLDER"
rm -rf node_modules
rm -f etherpad-lite-win.zip

# setting NODE_ENV=production ensures that dev dependencies are not installed,
# making the windows package smaller
export NODE_ENV=production

log "do a normal unix install first..."
src/bin/installDeps.sh || exit 1

log "copy the windows settings template..."
cp settings.json.template settings.json

log "resolve symbolic links..."
cp -rL node_modules node_modules_resolved
rm -rf node_modules
mv node_modules_resolved node_modules

log "download windows node..."
wget "https://nodejs.org/dist/latest-erbium/win-x86/node.exe" -O node.exe

log "remove git history to reduce folder size"
rm -rf .git/objects

log "remove windows jsdom-nocontextify/test folder"
rm -rf "$TMP_FOLDER"/src/node_modules/wd/node_modules/request/node_modules/form-data/node_modules/combined-stream/test
rm -rf "$TMP_FOLDER"/src/node_modules/nodemailer/node_modules/mailcomposer/node_modules/mimelib/node_modules/encoding/node_modules/iconv-lite/encodings/tables

log "create the zip..."
cd "$TMP_FOLDER"
zip -9 -r "$START_FOLDER"/etherpad-lite-win.zip ./* -x var

log "clean up..."
rm -rf "$TMP_FOLDER"

log "Finished. You can find the zip in the Etherpad root folder, it's called etherpad-lite-win.zip"
