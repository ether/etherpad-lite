#!/bin/bash

#Move to the folder where ep-lite is installed 
FOLDER=$(dirname $(readlink -f $0))
cd $FOLDER                     

if [[ $EUID -eq 0 ]]; then
   echo "You shouldn't start Etherpad-Lite as root!" 1>&2
   echo "Use authbind if you want to use a port lower than 1024 -> http://en.wikipedia.org/wiki/Authbind" 1>&2
   exit 1
fi

type -P node &>/dev/null || { 
  echo "You need to install node to run Etherpad-Lite!" >&2
  exit 1 
}

if [ -d "../bin" ]; then
  cd "../"
fi

if [ ! -f "settings.json" ]; then
  cp settings.json.template settings.json 
fi

cd "node"
node server.js
