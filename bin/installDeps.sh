#Move to the folder where ep-lite is installed
FOLDER=$(dirname $(readlink -f $0))
cd $FOLDER 

#Was this script started in the bin folder? if yes move out
if [ -d "../bin" ]; then
  cd "../"
fi

#Is wget installed?
hash wget > /dev/null 2>&1 || { 
  echo "Please install wget" >&2
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

#Does a settings.json exist? if no copy the template
if [ ! -f "settings.json" ]; then
  echo "Copy the settings template to settings.json..."
  cp -v settings.json.template settings.json || exit 1
fi

echo "Ensure that all dependencies are up to date..."
npm install || exit 1

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
  wget -O static/js/jquery.min.js http://code.jquery.com/jquery-$NEEDED_VERSION.min.js || exit 1
fi

#Remove all minified data to force node creating it new
echo "Clear minfified cache..."
rm -f var/minified*

echo "ensure custom css/js files are created..."
for f in $(cat "static/custom/.gitignore")
do
  if [ ! -f "static/custom/$f" ]; then
    touch "static/custom/$f"
  fi
done

exit 0
