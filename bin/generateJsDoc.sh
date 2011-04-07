#!/bin/sh
if [ ! -x /usr/bin/java ]; then
  echo "You need to install Java to generate the JSDocs!"
  exit 1
fi

if [ -d "../bin" ]; then
  cd "../"
fi

cd "doc/jsdoc-toolkit"

JSRUN="jsrun.jar"
RUNJS="app/run.js"
OUTPUT_DIR="../jsdoc"
NODE_DIR="../../node"
TEMPLATE_DIR="templates/jsdoc"

java -jar $JSRUN $RUNJS -v -d=$OUTPUT_DIR -t=$TEMPLATE_DIR $NODE_DIR && 
echo "Look on http://code.google.com/p/jsdoc-toolkit/wiki/InlineDocs to get Tipps for better documentation"
