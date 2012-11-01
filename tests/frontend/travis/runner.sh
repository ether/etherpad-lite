#!/bin/sh

#Move to the base folder
cd `dirname $0`

#start etherpad lite
../../../bin/run.sh &
sleep 10

#start remote runner
node remote_runner.js

kill $!
kill $(cat /tmp/sauce.pid)