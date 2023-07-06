@echo off

:: Change directory to etherpad-lite root
cd /D "%~dp0\..\.."

:: Is node installed?
cmd /C node -e "" || ( echo "Please install node.js ( https://nodejs.org )" && exit /B 1 )

echo _
echo Ensure that all dependencies are up to date...  If this is the first time you have run Etherpad please be patient.

echo Deleting old node_modules and src/node_modules
del /q .\node_modules
del /q .\src\node_modules
echo Deleting old package.json and package-lock.json
del /q .\package.json
del /q .\package-lock.json

cd /D src
cmd /C npm link --bin-links=false || exit /B 1

cd ..

cmd /C npm link ep_etherpad-lite --omit=optional --omit=dev --save --package-lock=true --bin-links=false || exit /B 1

echo _
echo Clearing cache...
del /S var\minified*

echo Adding symlinks for plugin backwards compatibility
mkdir src\node_modules
cd /D src\node_modules
mklink /D "async" "..\..\node_modules\async"
mklink /D "express" "..\..\node_modules\express"
mklink /D "formidable" "..\..\node_modules\formidable"
mklink /D "log4js" "..\..\node_modules\log4js"
mklink /D "supertest" "..\..\node_modules\supertest"
cd ..\..

echo _
echo Setting up settings.json...
IF NOT EXIST settings.json (
  echo Can't find settings.json.
  echo Copying settings.json.template...
  cmd /C copy settings.json.template settings.json || exit /B 1
)

echo _
echo Installed Etherpad!  To run Etherpad type start.bat
