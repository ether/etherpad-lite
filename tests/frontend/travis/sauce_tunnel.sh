#!/bin/bash
#download and unzip the sauce connector
echo "hello world" 
#curl http://saucelabs.com/downloads/Sauce-Connect-latest.zip > /tmp/sauce.zip
#unzip /tmp/sauce.zip -d /tmp

#start the sauce connector in background and make sure it doesn't output the secret key
#(java -jar /tmp/Sauce-Connect.jar $SAUCE_USER $SAUCE_KEY | grep -v $SAUCE_KEY)&

#save the sauce pid in a file and give it a bit of time to connect
#echo $! > /tmp/sauce.pid
#wait 30
#kill $!