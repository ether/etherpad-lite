#!/bin/sh

#Move to the folder where ep-lite is installed
cd `dirname $0`

#Was this script started in the bin folder? if yes move out
if [ -d "../bin" ]; then
  cd "../"
fi

#Is gnu-grep (ggrep) installed on SunOS (Solaris)
if [ $(uname) = "SunOS" ]; then
  hash ggrep > /dev/null 2>&1 || { 
    echo "Please install ggrep (pkg install gnu-grep)" >&2
    exit 1 
  }
fi

#Is wget installed?
hash curl > /dev/null 2>&1 || { 
  echo "Please install curl" >&2
  exit 1 
}

#Is node installed?
hash node > /dev/null 2>&1 || { 
  echo "Please install node.js ( http://nodejs.org )" >&2
  exit 1 
}

#Is npm installed?
hash npm > /dev/null 2>&1 || { 
  echo "Please install npm ( http://npmjs.org )" >&2
  exit 1 
}

#check npm version
NPM_VERSION=$(npm --version)
if [ ! $(echo $NPM_VERSION | cut -d "." -f 1) = "1" ]; then
  echo "You're running a wrong version of npm, you're using $NPM_VERSION, we need 1.x" >&2
  exit 1 
fi

#check node version
NODE_VERSION=$(node --version)
NODE_V_MINOR=$(echo $NODE_VERSION | cut -d "." -f 1-2)
if [ ! $NODE_V_MINOR = "v0.8" ] && [ ! $NODE_V_MINOR = "v0.10" ]; then
  echo "You're running a wrong version of node, you're using $NODE_VERSION, we need v0.8.x or v0.10.x" >&2
  exit 1 
fi

#Get the name of the settings file
settings="settings.json"
a='';
for arg in $*; do
  if [ "$a" = "--settings" ] || [ "$a" = "-s" ]; then settings=$arg; fi
  a=$arg
done

#Does a $settings exist? if no copy the template
if [ ! -f $settings ]; then
  echo "Copy the settings template to $settings..."
  cp settings.json.template $settings || exit 1
fi

echo "Ensure that all dependencies are up to date...  If this is the first time you have run Etherpad please be patient."
(
  mkdir -p node_modules
  cd node_modules
  [ -e ep_etherpad-lite ] || ln -s ../src ep_etherpad-lite
  cd ep_etherpad-lite
  npm install --loglevel warn
) || { 
  rm -rf node_modules
  exit 1 
}

echo "Ensure jQuery is downloaded and up to date..."
DOWNLOAD_JQUERY="true"
NEEDED_VERSION="1.9.1"
if [ -f "src/static/js/jquery.js" ]; then
  if [ $(uname) = "SunOS" ]; then
    VERSION=$(cat src/static/js/jquery.js | head -n 3 | ggrep -o "v[0-9]\.[0-9]\(\.[0-9]\)\?");
  else
    VERSION=$(cat src/static/js/jquery.js | head -n 3 | grep -o "v[0-9]\.[0-9]\(\.[0-9]\)\?");
  fi

  if [ ${VERSION#v} = $NEEDED_VERSION ]; then
    DOWNLOAD_JQUERY="false"
  fi
fi

if [ $DOWNLOAD_JQUERY = "true" ]; then
  curl -lo src/static/js/jquery.js http://code.jquery.com/jquery-$NEEDED_VERSION.js || exit 1
fi

#Remove all minified data to force node creating it new
echo "Clear minfified cache..."
rm -f var/minified*

echo "ensure custom css/js files are created..."

for f in "index" "pad" "timeslider"
do
  if [ ! -f "src/static/custom/$f.js" ]; then
    cp "src/static/custom/js.template" "src/static/custom/$f.js" || exit 1
  fi
  
  if [ ! -f "src/static/custom/$f.css" ]; then
    cp "src/static/custom/css.template" "src/static/custom/$f.css" || exit 1
  fi
done

exit 0
