#!/bin/bash
# download and unzip the sauce connector
curl http://saucelabs.com/downloads/Sauce-Connect-latest.zip > /tmp/sauce.zip
unzip /tmp/sauce.zip -d /tmp

# start the sauce connector in background and make sure it doesn't output the secret key
(java -jar /tmp/Sauce-Connect.jar $SAUCE_USERNAME $SAUCE_ACCESS_KEY -f /tmp/tunnel > /dev/null )&

# save the sauce pid in a file
echo $! > /tmp/sauce.pid

# wait for the tunnel to build up
while [ ! -e "/tmp/tunnel" ]
  do
  sleep 1 
done