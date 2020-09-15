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

 * `indexCustomStyles` - contains the `index.css` `<link>` tag, allows you to add your own or to customize the one provided by the active skin
 * `indexWrapper` - contains the form for creating new pads
 * `indexCustomScripts` - contains the `index.js` `<script>` tag, allows you to add your own or to customize the one provided by the active skin
 * `indexCustomInlineScripts` - contains the inline `<script>` of home page, allows you to customize `go2Name()`, `go2Random()` or `randomPadName()` functions

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

This hook is called to handle authorization. It is especially useful for
controlling access to specific paths.

A plugin's authorize function is typically called twice for each access: once
before authentication and again after. Specifically, it is called if all of the
following are true:

* The request is not for static content or an API endpoint. (Requests for static
  content and API endpoints are always authorized, even if unauthenticated.)
* Either authentication has not yet been performed (`context.req.session.user`
  is undefined) or the user has successfully authenticated
  (`context.req.session.user` is an object containing user-specific settings).
* If the user has successfully authenticated, the user is not an admin. (Admin
  users are always authorized.)
* Either the request is for an `/admin` page or the `requireAuthentication`
  setting is true.
* Either the request is for an `/admin` page, or the user has not yet
  authenticated, or the user has authenticated and the `requireAuthorization`
  setting is true.
* For pre-authentication invocations of a plugin's authorize function
  (`context.req.session.user` is undefined), an authorize function from a
  different plugin has not already caused the pre-authentication authorization
  to pass or fail.
* For post-authentication invocations of a plugin's authorize function
  (`context.req.session.user` is an object), an authorize function from a
  different plugin has not already caused the post-authentication authorization
  to pass or fail.

For pre-authentication invocations of your authorize function, you can pass the
following values to the provided callback:

* `[true]` or `['create']` will immediately grant access without requiring the
  user to authenticate.
* `[false]` will trigger authentication unless authentication is not required.
* `[]` or `undefined` will defer the decision to the next authorization plugin
  (if any, otherwise it is the same as calling with `[false]`).

**WARNING:** Your authorize function can be called for an `/admin` page even if
the user has not yet authenticated. It is your responsibility to fail or defer
authorization if you do not want to grant admin privileges to the general
public.

For post-authentication invocations of your authorize function, you can pass the
following values to the provided callback:

* `[true]` or `['create']` will grant access.
* `[false]` will deny access.
* `[]` or `undefined` will defer the authorization decision to the next
  authorization plugin (if any, otherwise deny).

Example:

```
exports.authorize = (hookName, context, cb) => {
  const user = context.req.session.user;
  if (!user) {
    // The user has not yet authenticated so defer the pre-authentication
    // authorization decision to the next plugin.
    return cb([]);
  }
  const path = context.req.path;  // or context.resource
  if (isExplicitlyProhibited(user, path)) return cb([false]);
  if (isExplicitlyAllowed(user, path)) return cb([true]);
  return cb([]);  // Let the next authorization plugin decide
};
```

## authenticate
Called from: src/node/hooks/express/webaccess.js

Things in context:

1. req - the request object
2. res - the response object
3. users - the users object from settings.json (possibly modified by plugins)
4. next - ?
5. username - the username used (optional)
6. password - the password used (optional)

This hook is called to handle authentication.

Plugins that supply an authenticate function should probably also supply an
authFailure function unless falling back to HTTP basic authentication is
appropriate upon authentication failure.

This hook is only called if either the `requireAuthentication` setting is true
or the request is for an `/admin` page.

Calling the provided callback with `[true]` or `[false]` will cause
authentication to succeed or fail, respectively. Calling the callback with `[]`
or `undefined` will defer the authentication decision to the next authentication
plugin (if any, otherwise fall back to HTTP basic authentication).

If you wish to provide a mix of restricted and anonymous access (e.g., some pads
are private, others are public), you can "authenticate" (as a guest account)
users that have not yet logged in, and rely on other hooks (e.g., authorize,
onAccessCheck, handleMessageSecurity) to authorize specific privileged actions.

If authentication is successful, the authenticate function MUST set
`context.req.session.user` to the user's settings object. The `username`
property of this object should be set to the user's username. The settings
object should come from global settings (`context.users[username]`).

Example:

```
exports.authenticate = (hook_name, context, cb) => {
  if (notApplicableToThisPlugin(context)) {
    return cb([]);  // Let the next authentication plugin decide
  }
  const username = authenticate(context);
  if (!username) {
    console.warn(`ep_myplugin.authenticate: Failed authentication from IP ${context.req.ip}`);
    return cb([false]);
  }
  console.info(`ep_myplugin.authenticate: Successful authentication from IP ${context.req.ip} for user ${username}`);
  const users = context.users;
  if (!(username in users)) users[username] = {};
  users[username].username = username;
  context.req.session.user = users[username];
  return cb([true]);
};
```

## authFailure
Called from: src/node/hooks/express/webaccess.js

Things in context:

1. req - the request object
2. res - the response object
3. next - ?

This hook is called to handle an authentication or authorization failure.

Plugins that supply an authenticate function should probably also supply an
authFailure function unless falling back to HTTP basic authentication is
appropriate upon authentication failure.

A plugin's authFailure function is only called if all of the following are true:

* There was an authentication or authorization failure.
* The failure was not already handled by an authFailure function from another
  plugin.

Calling the provided callback with `[true]` tells Etherpad that the failure was
handled and no further error handling is required. Calling the callback with
`[]` or `undefined` defers error handling to the next authFailure plugin (if
any, otherwise fall back to HTTP basic authentication).

Example:

```
exports.authFailure = (hookName, context, cb) => {
  if (notApplicableToThisPlugin(context)) {
    return cb([]);  // Let the next plugin handle the error
  }
  context.res.redirect(makeLoginURL(context.req));
  return cb([true]);
};
```

## handleMessage
Called from: src/node/handler/PadMessageHandler.js

Things in context:

1. message - the message being handled
2. client - the socket.io Socket object

This hook allows plugins to drop or modify incoming socket.io messages from
clients, before Etherpad processes them.

The handleMessage function must return a Promise. If the Promise resolves to
`null`, the message is dropped. Returning `callback(value)` will return a
Promise that is resolved to `value`.

**WARNING:** handleMessage is called for every message, even if the client is
not authorized to send the message. It is up to the plugin to check permissions.

Examples:

```
// Using an async function:
exports.handleMessage = async (hookName, {message, client}) => {
  if (message.type === 'USERINFO_UPDATE') {
    // Force the display name to the name associated with the account.
    const user = client.client.request.session.user || {};
    if (user.name) message.data.userInfo.name = user.name;
  }
};

// Using a regular function:
exports.handleMessage = (hookName, {message, client}, callback) => {
  if (message.type === 'USERINFO_UPDATE') {
    // Force the display name to the name associated with the account.
    const user = client.client.request.session.user || {};
    if (user.name) message.data.userInfo.name = user.name;
  }
  return cb();
};
```

## handleMessageSecurity
Called from: src/node/handler/PadMessageHandler.js

Things in context:

1. message - the message being handled
2. client - the socket.io Socket object

This hook allows plugins to grant temporary write access to a pad. It is called
for each incoming message from a client. If write access is granted, it applies
to the current message and all future messages from the same socket.io
connection until the next `CLIENT_READY` or `SWITCH_TO_PAD` message. Read-only
access is reset **after** each `CLIENT_READY` or `SWITCH_TO_PAD` message, so
granting write access has no effect for those message types.

The handleMessageSecurity function must return a Promise. If the Promise
resolves to `true`, write access is granted as described above. Returning
`callback(value)` will return a Promise that is resolved to `value`.

**WARNING:** handleMessageSecurity is called for every message, even if the
client is not authorized to send the message. It is up to the plugin to check
permissions.

Examples:

```
// Using an async function:
exports.handleMessageSecurity = async (hookName, {message, client}) => {
  if (shouldGrantWriteAccess(message, client)) return true;
  return;
};

// Using a regular function:
exports.handleMessageSecurity = (hookName, {message, client}, callback) => {
  if (shouldGrantWriteAccess(message, client)) return callback(true);
  return callback();
};
```

## clientVars
Called from: src/node/handler/PadMessageHandler.js

Things in context:

1. clientVars - the basic `clientVars` built by the core
2. pad - the pad this session is about
3. socket - the socket.io Socket object

This hook is called after a client connects but before the initial configuration
is sent to the client. Plugins can use this hook to manipulate the
configuration. (Example: Add a tracking ID for an external analytics tool that
is used client-side.)

The clientVars function must return a Promise that resolves to an object (or
null/undefined) whose properties will be merged into `context.clientVars`.
Returning `callback(value)` will return a Promise that is resolved to `value`.

You can modify `context.clientVars` to change the values sent to the client, but
beware: async functions from other clientVars plugins might also be reading or
manipulating the same `context.clientVars` object. For this reason it is
recommended you return an object rather than modify `context.clientVars`.

If needed, you can access the user's account information (if authenticated) via
`context.socket.client.request.session.user`.

Examples:

```
// Using an async function
exports.clientVars = async (hookName, context) => {
  const user = context.socket.client.request.session.user || {};
  return {'accountUsername': user.username || '<unknown>'}
};

// Using a regular function
exports.clientVars = (hookName, context, callback) => {
  const user = context.socket.client.request.session.user || {};
  return callback({'accountUsername': user.username || '<unknown>'});
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
