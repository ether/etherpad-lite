# Server-side hooks
These hooks are called on server-side.

## loadSettings
Called from: src/node/server.js

Things in context:

1. settings - the settings object

Use this hook to receive the global settings in your plugin.

## pluginUninstall
Called from: src/static/js/pluginfw/installer.js

Things in context:

1. plugin_name - self-explanatory

If this hook returns an error, the callback to the uninstall function gets an error as well. This mostly seems useful for handling additional features added in based on the installation of other plugins, which is pretty cool!

## pluginInstall
Called from: src/static/js/pluginfw/installer.js

Things in context:

1. plugin_name - self-explanatory

If this hook returns an error, the callback to the install function gets an error, too. This seems useful for adding in features when a particular plugin is installed.

## init_`<plugin name>`
Called from: src/static/js/pluginfw/plugins.js

Things in context: None

This function is called after a specific plugin is initialized. This would probably be more useful than the previous two functions if you only wanted to add in features to one specific plugin.

## expressConfigure
Called from: src/node/server.js

Things in context:

1. app - the main application object

This is a helpful hook for changing the behavior and configuration of the application. It's called right after the application gets configured.

## expressCreateServer
Called from: src/node/server.js

Things in context:

1. app - the main express application object (helpful for adding new paths and such)
2. server - the http server object

This hook gets called after the application object has been created, but before it starts listening. This is similar to the expressConfigure hook, but it's not guaranteed that the application object will have all relevant configuration variables.

## eejsBlock_`<name>`
Called from: src/node/eejs/index.js

Things in context:

1. content - the content of the block

This hook gets called upon the rendering of an ejs template block. For any specific kind of block, you can change how that block gets rendered by modifying the content object passed in.

Have a look at `src/templates/pad.html` and `src/templates/timeslider.html` to see which blocks are available.

## padCreate
Called from: src/node/db/Pad.js

Things in context:

1. pad - the pad instance

This hook gets called when a new pad was created.

## padLoad
Called from: src/node/db/Pad.js

Things in context:

1. pad - the pad instance

This hook gets called when an pad was loaded. If a new pad was created and loaded this event will be emitted too.

## padUpdate
Called from: src/node/db/Pad.js

Things in context:

1. pad - the pad instance

This hook gets called when an existing pad was updated.

## padRemove
Called from: src/node/db/Pad.js

Things in context:

1. padID

This hook gets called when an existing pad was removed/deleted.

## socketio
Called from: src/node/hooks/express/socketio.js

Things in context:

1. app - the application object
2. io - the socketio object
3. server - the http server object

I have no idea what this is useful for, someone else will have to add this description.

## authorize
Called from: src/node/hooks/express/webaccess.js

Things in context:

1. req - the request object
2. res - the response object
3. next - ?
4. resource - the path being accessed

This is useful for modifying the way authentication is done, especially for specific paths.

## authenticate
Called from: src/node/hooks/express/webaccess.js

Things in context:

1. req - the request object
2. res - the response object
3. next - ?
4. username - the username used (optional)
5. password - the password used (optional)

This is useful for modifying the way authentication is done.

## authFailure
Called from: src/node/hooks/express/webaccess.js

Things in context:

1. req - the request object
2. res - the response object
3. next - ?

This is useful for modifying the way authentication is done.

## handleMessage
Called from: src/node/handler/PadMessageHandler.js

Things in context:

1. message - the message being handled
2. client - the client object from socket.io

This hook will be called once a message arrive. If a plugin calls `callback(null)` the message will be dropped. However it is not possible to modify the message.

Plugins may also decide to implement custom behavior once a message arrives.

**WARNING**: handleMessage will be called, even if the client is not authorized to send this message. It's up to the plugin to check permissions.

Example:

```
function handleMessage ( hook, context, callback ) {
  if ( context.message.type == 'USERINFO_UPDATE' ) {
    // If the message type is USERINFO_UPDATE, drop the message
    callback(null);
  }else{
    callback();
  }
};
```

## clientVars
Called from: src/node/handler/PadMessageHandler.js

Things in context:

1. clientVars - the basic `clientVars` built by the core
2. pad - the pad this session is about

This hook will be called once a client connects and the `clientVars` are being sent. Plugins can use this hook to give the client a initial configuriation, like the tracking-id of an external analytics-tool that is used on the client-side. You can also overwrite values from the original `clientVars`.

Example:

```
exports.clientVars = function(hook, context, callback)
{
  // tell the client which year we are in
  return callback({ "currentYear": new Date().getFullYear() });
};
```

This can be accessed on the client-side using `clientVars.currentYear`.

## getLineHTMLForExport
Called from: src/node/utils/ExportHtml.js

Things in context:

1. apool - pool object
2. attribLine - line attributes
3. text - line text

This hook will allow a plug-in developer to re-write each line when exporting to HTML.

