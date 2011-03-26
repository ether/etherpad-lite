#!/bin/sh

#if [[ $EUID -eq 0 ]]; then
#   echo "You shouldn't start LinePad as root!" 1>&2
#   exit 1
#fi

#if [ ! type -P node &>/dev/null ]; then
#  echo "You have no node installed!" 1>&2
#  exit 1
#fi
#|| { echo "I require foo but it's not installed.  Aborting." >&2; exit 1; }

cd ../node
authbind node server.js
