#!/bin/sh

#Move to the folder where ep-lite is installed
FOLDER=$(dirname $(readlink -f $0))
cd $FOLDER 

#Was this script started in the bin folder? if yes move out
if [ -d "../bin" ]; then
  cd "../"
fi

#Stop the script if its started as root
if [ "$(id -u)" -eq 0 ]; then
   echo "You shouldn't start Etherpad-Lite as root!" 1>&2
   echo "Use authbind if you want to use a port lower than 1024 -> http://en.wikipedia.org/wiki/Authbind" 1>&2
   exit 1
fi

#prepare the enviroment
bin/installDeps.sh || exit 1

#Move to the node folder and start
echo "start..."
cd "node"
node server.js
