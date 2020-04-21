#!/bin/sh

#Move to the folder where ep-lite is installed
cd $(dirname $0)

#Was this script started in the bin folder? if yes move out
if [ -d "../bin" ]; then
  cd "../"
fi

#Prepare the environment
bin/installDeps.sh || exit 1

echo "If you are new to debugging Node.js with Chrome DevTools, take a look at this page:"
echo "https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27"
echo "Open 'chrome://inspect' on Chrome to start debugging."

#Use 0.0.0.0 to allow external connections to the debugger
#(ex: running Etherpad on a docker container). Use default port # (9229)
node --inspect=0.0.0.0:9229 node_modules/ep_etherpad-lite/node/server.js "$@"
