#!/bin/sh

#Move to the folder where ep-lite is installed
cd `dirname $0`

#Was this script started in the bin folder? if yes move out
if [ -d "../bin" ]; then
  cd "../"
fi

hash node > /dev/null 2>&1 || { 
  echo "You need to install node!" >&2
  exit 1 
}

hash doc.md > /dev/null 2>&1 || { 
  echo "You need to install doc.md! npm install -g doc.md" >&2
  exit 1 
}

echo "empty doc folder..."
rm -rf doc/jsdoc/*

doc.md node doc/jsdoc
