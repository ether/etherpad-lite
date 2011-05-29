#!/bin/bash

if [ -d "../bin" ]; then
  cd "../"
fi

type -P node &>/dev/null || { 
  echo "You need to install node!" >&2
  exit 1 
}

type -P doc.md &>/dev/null || { 
  echo "You need to install doc.md! npm install -g doc.md" >&2
  exit 1 
}

doc.md node doc/jsdoc
