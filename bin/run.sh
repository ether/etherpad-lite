#!/bin/sh

#Move to the folder where ep-lite is installed
cd `dirname $0`

#Was this script started in the bin folder? if yes move out
if [ -d "../bin" ]; then
  cd "../"
fi

#Stop the script if its started as root
if [ "$(id -u)" -eq 0 ]; then
   echo "You shouldn't start Etherpad-Lite as root!"
   echo "Please type 'Etherpad Lite rocks my socks' if you still want to start it as root"
   read rocks
   if [ ! $rocks = "Etherpad Lite rocks my socks" ]
   then
     echo "Your input was incorrect"
     exit 1
   fi
fi

#prepare the enviroment
bin/installDeps.sh $* || exit 1

#Move to the node folder and start
echo "start..."
cd "node"
node server.js $*
