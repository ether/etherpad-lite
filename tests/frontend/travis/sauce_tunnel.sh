#!/bin/bash
# download and unzip the sauce connector
curl "https://doc-04-2c-docs.googleusercontent.com/docs/securesc/ha0ro937gcuc7l7deffksulhg5h7mbp1/2h0v0tdergb76jsikuo259nptvbvje4o/1351958400000/18059634261225994552/*/0Bx8MZz0WtyeGalRKeG9oRE1nRlk?e=download" | gunzip > /tmp/Sauce-Connect.jar

# start the sauce connector in background and make sure it doesn't output the secret key
(java -jar /tmp/Sauce-Connect.jar $SAUCE_USER $SAUCE_KEY -f /tmp/tunnel > /dev/null )&

# save the sauce pid in a file
echo $! > /tmp/sauce.pid

# wait for the tunnel to build up
while [ ! -e "/tmp/tunnel" ]
  do
  sleep 1 
done