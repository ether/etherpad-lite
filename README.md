
# Introduction

This repo contains a modified version of the original etherpad-lite modified to natively run on cloudfoundry, possibly on an offline mode (ie. without requiring internet access)

# Installation
 1. Download the `etherpad-lite-cf.zip` in release tab on github.
 2. Extract the zip file
 3. Go to the extracted archive with your console
 4. Run `cf push etherpad-lite -m 512M`
 5. You've done

## Install new plugin(s)
To install new etherpad plugin (you can see a list here: [https://github.com/.../Plugin,-a-list](https://github.com/ether/etherpad-lite/wiki/Plugin,-a-list) ) you shoud add them in `package.json` in the root app directory to let the nodejs buildpack build/download them.

## Current limitations

* no plugins are installed by default. Currently working on installing a tested set of plugins
* db credentials need to be hardcoded into settings.json. Edit this file manually. Currently working on fetching credentials from VCAP_SERVICES
* adding the ldap module requires to manually add ldap server credentials into settings.json. Currently working on fetching credentials from VCAP_SERVICES
* etherpad-lite does not support being instanciated as a cluster. Prefer a single instance `-i 1` in your Cf push. This implies that unplanned maintenances of instances crash won't be transparent to etherpad-lite users


## Note
This version can be runned offline (with no access to internet) if you don't add any plugin in `package.json`

# License
[Apache License v2](http://www.apache.org/licenses/LICENSE-2.0.html)
