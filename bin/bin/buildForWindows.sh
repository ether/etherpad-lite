#!/bin/sh

NODE_VERSION="0.8.4"

#Move to the folder where ep-lite is installed
cd `dirname $0`

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

echo "create a clean environment in /tmp/etherpad-lite-win..." 
rm -rf /tmp/etherpad-lite-win
cp -ar . /tmp/etherpad-lite-win
cd /tmp/etherpad-lite-win
rm -rf node_modules
rm -f etherpad-lite-win.zip

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
wget "http://nodejs.org/dist/v$NODE_VERSION/node.exe" -O ../node.exe

echo "remove git history to reduce folder size"
rm -rf .git/objects

echo "remove windows jsdom-nocontextify/test folder"
rm -rf /tmp/etherpad-lite-win/node_modules/ep_etherpad-lite/node_modules/jsdom-nocontextifiy/test/
rm -rf /tmp/etherpad-lite-win/src/node_modules/jsdom-nocontextifiy/test/

echo "create the zip..."
cd /tmp
zip -9 -r etherpad-lite-win.zip etherpad-lite-win
mv etherpad-lite-win.zip $START_FOLDER

echo "clean up..."
rm -rf /tmp/etherpad-lite-win

echo "Finished. You can find the zip in the Etherpad root folder, it's called etherpad-lite-win.zip"
