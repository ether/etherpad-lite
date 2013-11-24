#!/bin/bash

# connect 500 instances to display :0
for i in {1..500}
do
  echo 	$i
  echo "Displaying Some shit"
  DISPLAY=:0 screen -d -m /home/phantomjs/bin/phantomjs loader.js http://10.0.0.55:9001/p/pad2 && sleep 2
done

# connect 500 instances to display :1
for i in {1..500}
do
  echo $i
  DISPLAY=:1 screen -d -m /home/phantomjs/bin/phantomjs loader.js http://10.0.0.55:9001/p/pad2 && sleep 2
done
