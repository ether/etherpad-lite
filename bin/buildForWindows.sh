#!/bin/sh

NODE_VERSION="0.5.4"

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
cp settings.json.template_windows settings.json

echo "resolve symbolic links..."
cp -rL node_modules node_modules_resolved
rm -rf node_modules
mv node_modules_resolved node_modules

echo "remove sqlite, cause we can't use it with windows..."
rm -rf node_modules/ueberDB/node_modules/sqlite3

echo "replace log4js with a patched log4js, this log4js runs on windows too..."
rm -rf node_modules/log4js/* 
wget https://github.com/Pita/log4js-node/zipball/master -O log4js.zip
unzip log4js.zip
mv Pita-log4js-node*/* node_modules/log4js
rm -rf log4js.zip Pita-log4js-node*

echo "download windows node..."
cd bin
wget "http://nodejs.org/dist/v$NODE_VERSION/node.exe" -O node.exe

echo "create the zip..."
cd /tmp
zip -9 -r etherpad-lite-win.zip etherpad-lite-win
mv etherpad-lite-win.zip $START_FOLDER

echo "clean up..."
rm -rf /tmp/etherpad-lite-win

echo "Finished. You can find the zip in the Etherpad Lite root folder, it's called etherpad-lite-win.zip"
