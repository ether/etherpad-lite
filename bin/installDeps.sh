#!/bin/sh

#Move to the folder where ep-lite is installed
cd `dirname $0`

#Was this script started in the bin folder? if yes move out
if [ -d "../bin" ]; then
  cd "../"
fi

#Is wget installed?
hash curl > /dev/null 2>&1 || { 
  echo "Please install curl" >&2
  exit 1 
}

#Is node installed?
hash node > /dev/null 2>&1 || { 
  echo "Please install node.js ( http://nodesjs.org )" >&2
  exit 1 
}

#Is npm installed?
hash npm > /dev/null 2>&1 || { 
  echo "Please install npm ( http://npmjs.org )" >&2
  exit 1 
}

#check npm version
NPM_VERSION=$(npm --version)
if [ ! $(echo $NPM_VERSION | cut -d "." -f 1-2) = "1.0" ]; then
  echo "You're running a wrong version of npm, you're using $NPM_VERSION, we need 1.0.x" >&2
  exit 1 
fi

#Does a settings.json exist? if no copy the template
if [ ! -f "settings.json" ]; then
  echo "Copy the settings template to settings.json..."
  cp -v settings.json.template settings.json || exit 1
fi

echo "Ensure that all dependencies are up to date..."
npm install || { 
  rm -rf node_modules
  exit 1 
}

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
  curl -lo static/js/jquery.min.js http://code.jquery.com/jquery-$NEEDED_VERSION.min.js || exit 1
fi

#Remove all minified data to force node creating it new
echo "Clear minfified cache..."
rm -f var/minified*

echo "ensure custom css/js files are created..."

for f in "index" "pad" "timeslider"
do
  if [ ! -f "static/custom/$f.js" ]; then
    cp -v "static/custom/js.template" "static/custom/$f.js" || exit 1
  fi
  
  if [ ! -f "static/custom/$f.css" ]; then
    cp -v "static/custom/css.template" "static/custom/$f.css" || exit 1
  fi
done

exit 0
