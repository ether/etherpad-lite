#!/bin/sh

set -e

pecho() { printf %s\\n "$*"; }
log() { pecho "$@"; }
error() { log "ERROR: $@" >&2; }
fatal() { error "$@"; exit 1; }
try() { "$@" || fatal "'$@' failed"; }
is_cmd() { command -v "$@" >/dev/null 2>&1; }

for x in unzip wget zip; do
  is_cmd "${x}" || fatal "Please install ${x}"
done

# Move to the folder where ep-lite is installed
mydir=$(try cd "${0%/*}" && try pwd -P) || exit 1
try cd "${mydir}/../.."

START_FOLDER=$(try pwd) || exit 1
TMP_FOLDER=$(try mktemp -d) || exit 1

log "create a clean environment in $TMP_FOLDER..."
try cp -ar . "$TMP_FOLDER"
try cd "$TMP_FOLDER"
try rm -rf node_modules
try rm -f etherpad-lite-win.zip

# setting NODE_ENV=production ensures that dev dependencies are not installed,
# making the windows package smaller
export NODE_ENV=production

log "do a normal unix install first..."
try ./src/bin/installDeps.sh

log "copy the windows settings template..."
try cp settings.json.template settings.json

log "resolve symbolic links..."
try cp -rL node_modules node_modules_resolved
try rm -rf node_modules
try mv node_modules_resolved node_modules

log "download windows node..."
try wget "https://nodejs.org/dist/latest-erbium/win-x86/node.exe" -O node.exe

log "remove git history to reduce folder size"
try rm -rf .git/objects

log "remove windows jsdom-nocontextify/test folder"
try rm -rf "$TMP_FOLDER"/src/node_modules/wd/node_modules/request/node_modules/form-data/node_modules/combined-stream/test
try rm -rf "$TMP_FOLDER"/src/node_modules/nodemailer/node_modules/mailcomposer/node_modules/mimelib/node_modules/encoding/node_modules/iconv-lite/encodings/tables

log "create the zip..."
try cd "$TMP_FOLDER"
try zip -9 -r "$START_FOLDER"/etherpad-lite-win.zip ./* -x var

log "clean up..."
try rm -rf "$TMP_FOLDER"

log "Finished. You can find the zip in the Etherpad root folder, it's called etherpad-lite-win.zip"
