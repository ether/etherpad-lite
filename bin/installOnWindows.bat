@echo off
set NODE_VERSION=0.8.1
set JQUERY_VERSION=1.7

:: change directory to etherpad-lite root
cd bin
cd ..

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
echo Copying custom templates...
set custom_dir=node_modules\ep_etherpad-lite\static\custom
FOR %%f IN (index pad timeslider) DO (
  if NOT EXIST "%custom_dir%\%%f.js" copy "%custom_dir%\js.template" "%custom_dir%\%%f.js"
  if NOT EXIST "%custom_dir%\%%f.css" copy "%custom_dir%\css.template" "%custom_dir%\%%f.css"
)

echo _
echo Clearing cache.
del /S var\minified*

echo _
echo Setting up settings.json...
IF NOT EXIST settings.json copy settings.json.template_windows settings.json

echo _
echo Installed Etherpad-lite!