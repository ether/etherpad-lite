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

prep=1
#If merely looking for help, don't prep the environment
for arg in $*; do
  if [ "$arg" = "--help" ] || [ "$arg" = "-h" ]; then prep=0; fi
done

#prepare the enviroment
if [ $prep -eq 1 ]; then
  bin/installDeps.sh $* || exit 1
  echo "start..."
fi

#Move to the node folder and start
cd "node"
node server.js $*
