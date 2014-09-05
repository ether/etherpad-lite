
# Installation
 1. Download the `etherpad-lite-cf.zip` in release tab on github.
 2. Extract the zip file
 3. Go to the extracted archive with your console
 4. Run `cf push etherpad-lite -m 512M`
 5. You've done

## Install new plugin(s)
To install new etherpad plugin (you can see a list here: [https://github.com/.../Plugin,-a-list](https://github.com/ether/etherpad-lite/wiki/Plugin,-a-list) ) you shoud add them in `package.json` in the root app directory to let the nodejs buildpack build/download them.

## Note
This version can be runned offline (with no access to internet) if you don't add any plugin in `package.json`

# License
[Apache License v2](http://www.apache.org/licenses/LICENSE-2.0.html)
