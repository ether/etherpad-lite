# Skins
You can customize Etherpad appearance using skins.
A skin is a directory located under `static/skins/<skin_name>`, with the following contents:

* `index.js`: javascript that will be run in `/`
* `index.css`: stylesheet affecting `/`
* `pad.js`: javascript that will be run in `/p/:padid`
* `pad.css`: stylesheet affecting `/p/:padid`
* `timeslider.js`: javascript that will be run in `/p/:padid/timeslider`
* `timeslider.css`: stylesheet affecting `/p/:padid/timeslider`
* `favicon.ico`: overrides the default favicon
* `robots.txt`: overrides the default `robots.txt`

You can choose a skin changing the parameter `skinName` in `settings.json`.

Since Etherpad **1.7.5**, two skins are included:

* `no-skin`: an empty skin, leaving the default Etherpad appearance unchanged, that you can use as a guidance to develop your own.
* `colibris`: a new, experimental skin, that will become the default in Etherpad 2.0.
