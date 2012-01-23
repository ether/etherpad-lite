#!/bin/sh

if [ -d "../bin" ]; then
  cd "../"
fi

JSHINT=./node_modules/jshint/bin/hint

$JSHINT ./node/
