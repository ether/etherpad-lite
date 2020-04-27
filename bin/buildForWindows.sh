#!/bin/sh

NODE_VERSION="10.20.1"

#Move to the folder where ep-lite is installed
cd $(dirname $0)

#Was this script started in the bin folder? if yes move out
if [ -d "../bin" ]; then
  cd "../"
fi

#Is wget installed?
hash wget > /dev/null 2>&1 || {
  echo "Please install wget" >&2
  exit 1
}

#Is zip installed?
hash zip > /dev/null 2>&1 || {
  echo "Please install zip" >&2
  exit 1
}

#Is zip installed?
hash unzip > /dev/null 2>&1 || {
  echo "Please install unzip" >&2
  exit 1
}

START_FOLDER=$(pwd);
TMP_FOLDER=$(mktemp -d)

echo "create a clean environment in $TMP_FOLDER..."
cp -ar . $TMP_FOLDER
cd $TMP_FOLDER
rm -rf node_modules
rm -f etherpad-lite-win.zip

# setting NODE_ENV=production ensures that dev dependencies are not installed,
# making the windows package smaller
export NODE_ENV=production

echo "do a normal unix install first..."
bin/installDeps.sh || exit 1

echo "copy the windows settings template..."
cp settings.json.template settings.json

echo "resolve symbolic links..."
cp -rL node_modules node_modules_resolved
rm -rf node_modules
mv node_modules_resolved node_modules

echo "download windows node..."
cd bin
wget "https://nodejs.org/dist/v$NODE_VERSION/win-x86/node.exe" -O ../node.exe

echo "remove git history to reduce folder size"
rm -rf .git/objects

echo "remove windows jsdom-nocontextify/test folder"
rm -rf $TMP_FOLDER/src/node_modules/wd/node_modules/request/node_modules/form-data/node_modules/combined-stream/test
rm -rf $TMP_FOLDER/src/node_modules/nodemailer/node_modules/mailcomposer/node_modules/mimelib/node_modules/encoding/node_modules/iconv-lite/encodings/tables

echo "create the zip..."
cd $TMP_FOLDER
zip -9 -r $START_FOLDER/etherpad-lite-win.zip ./*

echo "clean up..."
rm -rf $TMP_FOLDER

echo "Finished. You can find the zip in the Etherpad root folder, it's called etherpad-lite-win.zip"
