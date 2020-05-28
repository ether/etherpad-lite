#!/bin/sh

#Move to the folder where ep-lite is installed
cd $(dirname $0)

#Was this script started in the bin folder? if yes move out
if [ -d "../bin" ]; then
  cd "../"
fi

# npm outdated --depth=0 | grep -v "^Package" | awk '{print $1}' | xargs npm install $1 --save-dev
OUTDATED=$(npm outdated --depth=0 | grep -v "^Package" | awk '{print $1}')
# echo $OUTDATED
if test -n "$OUTDATED"; then
  echo "Plugins require update, doing this now..."
  echo "Updating $OUTDATED"
  npm install $OUTDATED --save-dev
else
  echo "Plugins are all up to date"
fi
