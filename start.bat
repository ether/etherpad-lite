@echo off
start "Etherpad-Lite Server" /min /D "%CD%" "%CD%\node" "%CD%\node_modules\ep_etherpad-lite\node\server.js"
echo "Please wait for the server to finish starting"
pause
start http://%COMPUTERNAME%.%USERDNSDOMAIN%:9001
