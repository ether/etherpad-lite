#!/bin/sh

#Move to the folder where ep-lite is installed
cd `dirname $0`

#Was this script started in the bin folder? if yes move out
if [ -d "../bin" ]; then
  cd "../"
fi

#prepare the enviroment
bin/installDeps.sh || exit 1

hash node-inspector > /dev/null 2>&1 || { 
  echo "You need to install node-inspector to run the tests!" >&2
  echo "You can install it with npm" >&2
  echo "Run: npm install -g node-inspector" >&2
  exit 1 
}

node-inspector &

echo "If you are new to node-inspector, take a look at this video: http://youtu.be/AOnK3NVnxL8"

node --debug node_modules/ep_etherpad-lite/node/server.js $*

#kill node-inspector before ending 
kill $!
