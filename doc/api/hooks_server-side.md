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
Called from: src/node/hooks/express.js

Things in context:

1. app - the main application object

This is a helpful hook for changing the behavior and configuration of the application. It's called right after the application gets configured.

## expressCreateServer
Called from: src/node/hooks/express.js

Things in context:

1. app - the main express application object (helpful for adding new paths and such)
2. server - the http server object

This hook gets called after the application object has been created, but before it starts listening. This is similar to the expressConfigure hook, but it's not guaranteed that the application object will have all relevant configuration variables.

## eejsBlock_`<name>`
Called from: src/node/eejs/index.js

Things in context:

1. content - the content of the block

This hook gets called upon the rendering of an ejs template block. For any specific kind of block, you can change how that block gets rendered by modifying the content object passed in.

Available blocks in `pad.html` are:

 * `htmlHead` - after `<html>` and immediately before the title tag
 * `styles` - the style `<link>`s
 * `body` - the contents of the body tag
 * `editbarMenuLeft` - the left tool bar (consider using the toolbar controller instead of manually adding html here)
 * `editbarMenuRight` - right tool bar
 * `afterEditbar` - allows you to add stuff immediately after the toolbar
 * `userlist` - the contents of the userlist dropdown
 * `loading` - the initial loading message
 * `mySettings` - the left column of the settings dropdown ("My view"); intended for adding checkboxes only
 * `mySettings.dropdowns` - add your dropdown settings here
 * `globalSettings` - the right column of the settings dropdown ("Global view")
 * `importColumn` - import form
 * `exportColumn` - export form
 * `modals` - Contains all connectivity messages
 * `embedPopup` - the embed dropdown
 * `scripts` - Add your script tags here, if you really have to (consider use client-side hooks instead)

`timeslider.html` blocks:

 * `timesliderStyles`
 * `timesliderScripts`
 * `timesliderBody`
 * `timesliderTop`
 * `timesliderEditbarRight`
 * `modals`

 `index.html` blocks:

 * `indexWrapper` - contains the form for creating new pads

## padInitToolbar
Called from: src/node/hooks/express/specialpages.js

Things in context:

1. toolbar - the toolbar controller that will render the toolbar eventually

Here you can add custom toolbar items that will be available in the toolbar config in `settings.json`. For more about the toolbar controller see the API section.

Usage examples:

* https://github.com/tiblu/ep_authorship_toggle

## onAccessCheck
Called from: src/node/db/SecurityManager.js

Things in context:

1. padID - the pad the user wants to access
2. password - the password the user has given to access the pad
3. token - the token of the author
4. sessionCookie - the session the use has

This hook gets called when the access to the concrete pad is being checked. Return `false` to deny access.

## padCreate
Called from: src/node/db/Pad.js

Things in context:

1. pad - the pad instance
2. author - the id of the author who created the pad

This hook gets called when a new pad was created.

## padLoad
Called from: src/node/db/Pad.js

Things in context:

1. pad - the pad instance

This hook gets called when a pad was loaded. If a new pad was created and loaded this event will be emitted too.

## padUpdate
Called from: src/node/db/Pad.js

Things in context:

1. pad - the pad instance
2. author - the id of the author who updated the pad

This hook gets called when an existing pad was updated.

## padCopy
Called from: src/node/db/Pad.js

Things in context:

1. originalPad - the source pad instance
2. destinationID - the id of the pad copied from originalPad

This hook gets called when an existing pad was copied.

Usage examples:

* https://github.com/ether/ep_comments

## padRemove
Called from: src/node/db/Pad.js

Things in context:

1. padID

This hook gets called when an existing pad was removed/deleted.

Usage examples:

* https://github.com/ether/ep_comments

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

This hook will be called once a message arrive. If a plugin calls `callback(null)` the message will be dropped. However, it is not possible to modify the message.

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

## handleMessageSecurity
Called from: src/node/handler/PadMessageHandler.js

Things in context:

1. message - the message being handled
2. client - the client object from socket.io

This hook will be called once a message arrives. If a plugin calls `callback(true)` the message will be allowed to be processed. This is especially useful if you want read only pad visitors to update pad contents for whatever reason.

**WARNING**: handleMessageSecurity will be called, even if the client is not authorized to send this message. It's up to the plugin to check permissions.

Example:

```
function handleMessageSecurity ( hook, context, callback ) {
  if ( context.message.boomerang == 'hipster' ) {
    // If the message boomer is hipster, allow the request
    callback(true);
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

This hook will be called once a client connects and the `clientVars` are being sent. Plugins can use this hook to give the client an initial configuration, like the tracking-id of an external analytics-tool that is used on the client-side. You can also overwrite values from the original `clientVars`.

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

Example:
```
var Changeset = require("ep_etherpad-lite/static/js/Changeset");

exports.getLineHTMLForExport = function (hook, context) {
  var header = _analyzeLine(context.attribLine, context.apool);
  if (header) {
    return "<" + header + ">" + context.lineContent + "</" + header + ">";
  }
}

function _analyzeLine(alineAttrs, apool) {
  var header = null;
  if (alineAttrs) {
    var opIter = Changeset.opIterator(alineAttrs);
    if (opIter.hasNext()) {
      var op = opIter.next();
      header = Changeset.opAttributeValue(op, 'heading', apool);
    }
  }
  return header;
}
```

## stylesForExport
Called from: src/node/utils/ExportHtml.js

Things in context:

1. padId - The Pad Id

This hook will allow a plug-in developer to append Styles to the Exported HTML.

Example:

```
exports.stylesForExport = function(hook, padId, cb){
  cb("body{font-size:13.37em !important}");
}
```

## aceAttribClasses
Called from: src/static/js/linestylefilter.js

Things in context:
1. Attributes - Object of Attributes

This hook is called when attributes are investigated on a line.  It is useful if you want to add another attribute type or property type to a pad.

Example:

```
exports.aceAttribClasses = function(hook_name, attr, cb){
  attr.sub = 'tag:sub';
  cb(attr);
}
```

## exportFileName
Called from src/node/handler/ExportHandler.js

Things in context:

1. padId

This hook will allow a plug-in developer to modify the file name of an exported pad.  This is useful if you want to export a pad under another name and/or hide the padId under export.  Note that the doctype or file extension cannot be modified for security reasons.

Example:

```
exports.exportFileName = function(hook, padId, callback){
  callback("newFileName"+padId);
}
```

## exportHtmlAdditionalTags
Called from src/node/utils/ExportHtml.js

Things in context:

1. Pad object

This hook will allow a plug-in developer to include more properties and attributes to support during HTML Export. If tags are stored as `['color', 'red']` on the attribute pool, use `exportHtmlAdditionalTagsWithData` instead. An Array should be returned.

Example:
```
// Add the props to be supported in export
exports.exportHtmlAdditionalTags = function(hook, pad, cb){
  var padId = pad.id;
  cb(["massive","jugs"]);
};
```

## exportHtmlAdditionalTagsWithData
Called from src/node/utils/ExportHtml.js

Things in context:

1. Pad object

Identical to `exportHtmlAdditionalTags`, but for tags that are stored with a specific value (not simply `true`) on the attribute pool. For example `['color', 'red']`, instead of `['bold', true]`. This hook will allow a plug-in developer to include more properties and attributes to support during HTML Export. An Array of arrays should be returned. The exported HTML will contain tags like `<span data-color="red">` for the content where attributes are `['color', 'red']`.

Example:
```
// Add the props to be supported in export
exports.exportHtmlAdditionalTagsWithData = function(hook, pad, cb){
  var padId = pad.id;
  cb([["color", "red"], ["color", "blue"]]);
};
```

## userLeave
Called from src/node/handler/PadMessageHandler.js

This in context:

1. session (including the pad id and author id)

This hook gets called when an author leaves a pad. This is useful if you want to perform certain actions after a pad has been edited

Example:

```
exports.userLeave = function(hook, session, callback) {
  console.log('%s left pad %s', session.author, session.padId);
};
```

### clientReady
Called from src/node/handler/PadMessageHandler.js

This in context:

1. message

This hook gets called when handling a CLIENT_READY which is the first message from the client to the server.

Example:

```
exports.clientReady = function(hook, message) {
  console.log('Client has entered the pad' + message.padId);
};
```
