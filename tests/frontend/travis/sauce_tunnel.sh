#!/bin/bash
# download and unzip the sauce connector
curl https://saucelabs.com/downloads/sc-latest-linux.tar.gz > /tmp/sauce.tar.gz
tar zxf /tmp/sauce.tar.gz --directory /tmp
mv /tmp/sc-*-linux /tmp/sauce_connect

# start the sauce connector in background and make sure it doesn't output the secret key
(/tmp/sauce_connect/bin/sc --user $SAUCE_USERNAME --key $SAUCE_ACCESS_KEY --pidfile /tmp/sauce.pid --readyfile /tmp/tunnel > /dev/null )&

# wait for the tunnel to build up
while [ ! -e "/tmp/tunnel" ]
  do
  sleep 1
done
