@echo off

:: change directory to etherpad-lite root
cd /D "%~dp0\.."

:: Is node installed?
cmd /C node -e "" || ( echo "Please install node.js ( http://nodejs.org )" && exit /B 1 )

echo _
echo Checking node version...
set check_version="if(['6','8'].indexOf(process.version.split('.')[1].toString()) === -1) { console.log('You are running a wrong version of Node. Etherpad Lite requires v0.6.x or v0.8.x'); process.exit(1) }"
cmd /C node -e %check_version% || exit /B 1

echo _
echo Installing etherpad-lite and dependencies...
cmd /C npm install src/ || exit /B 1

echo _
echo Copying custom templates...
set custom_dir=node_modules\ep_etherpad-lite\static\custom
FOR %%f IN (index pad timeslider) DO (
  if NOT EXIST "%custom_dir%\%%f.js" copy "%custom_dir%\js.template" "%custom_dir%\%%f.js"
  if NOT EXIST "%custom_dir%\%%f.css" copy "%custom_dir%\css.template" "%custom_dir%\%%f.css"
)

echo _
echo Clearing cache...
del /S var\minified*

echo _
echo Setting up settings.json...
IF NOT EXIST settings.json (
  echo Can't find settings.json.
  echo Copying settings.json.template...
  cmd /C copy settings.json.template settings.json || exit /B 1
)

echo _
echo Installed Etherpad-lite!  To run Etherpad type start.bat