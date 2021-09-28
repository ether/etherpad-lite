@echo off

:: Change directory to etherpad-lite root
cd /D "%~dp0\..\.."

:: Is node installed?
cmd /C node -e "" || ( echo "Please install node.js ( https://nodejs.org )" && exit /B 1 )

echo _
echo Ensure that all dependencies are up to date...  If this is the first time you have run Etherpad please be patient.

mkdir node_modules
cd /D node_modules
mklink /D "ep_etherpad-lite" "..\src"

cd /D "ep_etherpad-lite"
cmd /C npm ci || exit /B 1

cd /D "%~dp0\..\.."

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
echo Installed Etherpad!  To run Etherpad type start.bat
