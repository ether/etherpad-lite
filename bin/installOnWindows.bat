@echo off
set NODE_VERSION=0.6.5
set JQUERY_VERSION=1.7

:: change directory to etherpad-lite root
cd bin
cd ..

echo _
echo Setting up settings.json...
copy settings.json.template_windows settings.json

echo _
echo Updating node...
curl -lo bin\node.exe http://nodejs.org/dist/v%NODE_VERSION%/node.exe

echo _
echo Installing etherpad-lite and dependencies...
cmd /C npm install src/

echo _
echo Updating jquery...
curl -lo "node_modules\ep_etherpad-lite\static\js\jquery.min.js" "http://code.jquery.com/jquery-%JQUERY_VERSION%.min.js"

echo _
echo Some other stuff...
copy node_modules\ep_etherpad-lite\static\custom\js.template node_modules\ep_etherpad-lite\static\custom\index.template
copy node_modules\ep_etherpad-lite\static\custom\js.template node_modules\ep_etherpad-lite\static\custom\pad.template
copy node_modules\ep_etherpad-lite\static\custom\js.template node_modules\ep_etherpad-lite\static\custom\timeslider.template
copy node_modules\ep_etherpad-lite\static\custom\css.template node_modules\ep_etherpad-lite\static\custom\index.template
copy node_modules\ep_etherpad-lite\static\custom\css.template node_modules\ep_etherpad-lite\static\custom\pad.template
copy node_modules\ep_etherpad-lite\static\custom\css.template node_modules\ep_etherpad-lite\static\custom\timeslider.template

echo _
echo Installed Etherpad-lite!