The files in this folder are for Plugin developers.

# Get suggestions to improve your Plugin

This code will check your plugin for known usual issues and some suggestions for improvements.  No changes will be made to your project.

```
node bin/plugins/checkPlugin.js $PLUGIN_NAME$
```

# Basic Example:
```
node bin/plugins/checkPlugin.js ep_webrtc
```

## Autofixing - will autofix any issues it can
```
node bin/plugins/checkPlugins.js ep_whatever autofix
```

## Autocommitting, push, npm minor patch and npm publish (highly dangerous)
```
node bin/plugins/checkPlugins.js ep_whatever autofix autocommit
```

# All the plugins
Replace johnmclear with your github username

```
# Clones
cd node_modules
GHUSER=johnmclear; curl "https://api.github.com/users/$GHUSER/repos?per_page=1000" | grep -o 'git@[^"]*' | grep /ep_ | xargs -L1 git clone
cd ..

# autofixes and autocommits /pushes & npm publishes
for dir in `ls node_modules`;
do
# echo $0
if [[ $dir == *"ep_"* ]]; then
if [[ $dir != "ep_etherpad-lite" ]]; then
node bin/plugins/checkPlugin.js $dir autofix autocommit
fi
fi
# echo $dir
done
```
