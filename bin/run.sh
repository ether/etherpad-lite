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

#Is node installed?
hash node > /dev/null 2>&1 || { 
  echo "You need to install node to run Etherpad-Lite!" >&2
  exit 1 
}

#Is npm installed?
hash npm > /dev/null 2>&1 || { 
  echo "You need to install npm to run Etherpad-Lite!" >&2
  exit 1 
}

#Does a settings.json exist? if no copy the template
if [ ! -f "settings.json" ]; then
  echo "Copy the settings template to settings.json..."
  cp -v settings.json.template settings.json 
fi

echo "Ensure that all dependencies are up to date..."
npm install

echo "Ensure jQuery is downloaded and up to date..."
DOWNLOAD_JQUERY="true"
NEEDED_VERSION="1.6.2"
if [ -f "static/js/jquery.min.js" ]; then
  VERSION=$(cat static/js/jquery.min.js | head -n 2 | tail -n 1 | grep -o "v[0-9]*\.[0-9]*\.[0-9]*");
  
  if [ ${VERSION#v} = $NEEDED_VERSION ]; then
    DOWNLOAD_JQUERY="false"
  fi
fi

if [ $DOWNLOAD_JQUERY = "true" ]; then
  wget -O static/js/jquery.min.js http://code.jquery.com/jquery-$NEEDED_VERSION.min.js
fi

#Remove all minified data to force node creating it new
echo "Clear minfified cache..."
rm var/minified* 2> /dev/null

#Move to the node folder and start
echo "start..."
cd "node"
node server.js
