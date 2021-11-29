# Server-side hooks
These hooks are called on server-side.

## loadSettings
Called from: src/node/server.js

Things in context:

1. settings - the settings object

Use this hook to receive the global settings in your plugin.

## shutdown
Called from: src/node/server.js

Things in context: None

This hook runs before shutdown. Use it to stop timers, close sockets and files,
flush buffers, etc. The database is not available while this hook is running.
The shutdown function must not block for long because there is a short timeout
before the process is forcibly terminated.

The shutdown function must return a Promise, which must resolve to `undefined`.
Returning `callback(value)` will return a Promise that is resolved to `value`.

Example:

```
// using an async function
exports.shutdown = async (hookName, context) => {
  await flushBuffers();
};
```

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

## `init_<plugin name>`

Called from: `src/static/js/pluginfw/plugins.js`

Run during startup after the named plugin is initialized.

Context properties: None

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

## expressCloseServer

Called from: src/node/hooks/express.js

Things in context: Nothing

This hook is called when the HTTP server is closing, which happens during
shutdown (see the shutdown hook) and when the server restarts (e.g., when a
plugin is installed via the `/admin/plugins` page). The HTTP server may or may
not already be closed when this hook executes.

Example:

```
exports.expressCloseServer = async () => {
  await doSomeCleanup();
};
```

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

1. padID - the real ID (never the read-only ID) of the pad the user wants to
   access
2. token - the token of the author
3. sessionCookie - the session the use has

This hook gets called when the access to the concrete pad is being checked.
Return `false` to deny access.

## padCreate
Called from: src/node/db/Pad.js

Things in context:

1. pad - the pad instance
2. author - the id of the author who created the pad

This hook gets called when a new pad was created.

## `padLoad`

Called from: `src/node/db/PadManager.js`

Called when a pad is loaded, including after new pad creation.

Context properties:

* `pad`: The Pad object.

## padUpdate
Called from: src/node/db/Pad.js

Things in context:

1. pad - the pad instance
2. author - the id of the author who updated the pad
3. revs - the index of the new revision
4. changeset - the changeset of this revision (see [Changeset Library](#index_changeset_library))

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

## preAuthorize
Called from: src/node/hooks/express/webaccess.js

Things in context:

1. req - the request object
2. res - the response object
3. next - bypass callback. If this is called instead of the normal callback then
   all remaining access checks are skipped.

This hook is called for each HTTP request before any authentication checks are
performed. Example uses:

* Always grant access to static content.
* Process an OAuth callback.
* Drop requests from IP addresses that have failed N authentication checks
  within the past X minutes.

A preAuthorize function is always called for each request unless a preAuthorize
function from another plugin (if any) has already explicitly granted or denied
the request.

You can pass the following values to the provided callback:

* `[]` defers the access decision to the normal authentication and authorization
  checks (or to a preAuthorize function from another plugin, if one exists).
* `[true]` immediately grants access to the requested resource, unless the
  request is for an `/admin` page in which case it is treated the same as `[]`.
  (This prevents buggy plugins from accidentally granting admin access to the
  general public.)
* `[false]` immediately denies the request. The preAuthnFailure hook will be
  called to handle the failure.

Example:

```
exports.preAuthorize = (hookName, context, cb) => {
  if (ipAddressIsFirewalled(context.req)) return cb([false]);
  if (requestIsForStaticContent(context.req)) return cb([true]);
  if (requestIsForOAuthCallback(context.req)) return cb([true]);
  return cb([]);
};
```

## authorize
Called from: src/node/hooks/express/webaccess.js

Things in context:

1. req - the request object
2. res - the response object
3. next - ?
4. resource - the path being accessed

This hook is called to handle authorization. It is especially useful for
controlling access to specific paths.

A plugin's authorize function is only called if all of the following are true:

* The request is not for static content or an API endpoint. (Requests for static
  content and API endpoints are always authorized, even if unauthenticated.)
* The `requireAuthentication` and `requireAuthorization` settings are both true.
* The user has already successfully authenticated.
* The user is not an admin (admin users are always authorized).
* The path being accessed is not an `/admin` path (`/admin` paths can only be
  accessed by admin users, and admin users are always authorized).
* An authorize function from a different plugin has not already caused
  authorization to pass or fail.

Note that the authorize hook cannot grant access to `/admin` pages. If admin
access is desired, the `is_admin` user setting must be set to true. This can be
set in the settings file or by the authenticate hook.

You can pass the following values to the provided callback:

* `[true]` or `['create']` will grant access to modify or create the pad if the
  request is for a pad, otherwise access is simply granted. Access to a pad will
  be downgraded to modify-only if `settings.editOnly` is true or the user's
  `canCreate` setting is set to `false`, and downgraded to read-only if the
  user's `readOnly` setting is `true`.
* `['modify']` will grant access to modify but not create the pad if the request
  is for a pad, otherwise access is simply granted. Access to a pad will be
  downgraded to read-only if the user's `readOnly` setting is `true`.
* `['readOnly']` will grant read-only access.
* `[false]` will deny access.
* `[]` or `undefined` will defer the authorization decision to the next
  authorization plugin (if any, otherwise deny).

Example:

```
exports.authorize = (hookName, context, cb) => {
  const user = context.req.session.user;
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
authnFailure function unless falling back to HTTP basic authentication is
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

**DEPRECATED:** Use authnFailure or authzFailure instead.

This hook is called to handle an authentication or authorization failure.

Plugins that supply an authenticate function should probably also supply an
authnFailure function unless falling back to HTTP basic authentication is
appropriate upon authentication failure.

A plugin's authFailure function is only called if all of the following are true:

* There was an authentication or authorization failure.
* The failure was not already handled by an authFailure function from another
  plugin.
* For authentication failures: The failure was not already handled by the
  authnFailure hook.
* For authorization failures: The failure was not already handled by the
  authzFailure hook.

Calling the provided callback with `[true]` tells Etherpad that the failure was
handled and no further error handling is required. Calling the callback with
`[]` or `undefined` defers error handling to the next authFailure plugin (if
any, otherwise fall back to HTTP basic authentication for an authentication
failure or a generic 403 page for an authorization failure).

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

## preAuthzFailure
Called from: src/node/hooks/express/webaccess.js

Things in context:

1. req - the request object
2. res - the response object

This hook is called to handle a pre-authentication authorization failure.

A plugin's preAuthzFailure function is only called if the pre-authentication
authorization failure was not already handled by a preAuthzFailure function from
another plugin.

Calling the provided callback with `[true]` tells Etherpad that the failure was
handled and no further error handling is required. Calling the callback with
`[]` or `undefined` defers error handling to a preAuthzFailure function from
another plugin (if any, otherwise fall back to a generic 403 error page).

Example:

```
exports.preAuthzFailure = (hookName, context, cb) => {
  if (notApplicableToThisPlugin(context)) return cb([]);
  context.res.status(403).send(renderFancy403Page(context.req));
  return cb([true]);
};
```

## authnFailure
Called from: src/node/hooks/express/webaccess.js

Things in context:

1. req - the request object
2. res - the response object

This hook is called to handle an authentication failure.

Plugins that supply an authenticate function should probably also supply an
authnFailure function unless falling back to HTTP basic authentication is
appropriate upon authentication failure.

A plugin's authnFailure function is only called if the authentication failure
was not already handled by an authnFailure function from another plugin.

Calling the provided callback with `[true]` tells Etherpad that the failure was
handled and no further error handling is required. Calling the callback with
`[]` or `undefined` defers error handling to an authnFailure function from
another plugin (if any, otherwise fall back to the deprecated authFailure hook).

Example:

```
exports.authnFailure = (hookName, context, cb) => {
  if (notApplicableToThisPlugin(context)) return cb([]);
  context.res.redirect(makeLoginURL(context.req));
  return cb([true]);
};
```

## authzFailure
Called from: src/node/hooks/express/webaccess.js

Things in context:

1. req - the request object
2. res - the response object

This hook is called to handle a post-authentication authorization failure.

A plugin's authzFailure function is only called if the authorization failure was
not already handled by an authzFailure function from another plugin.

Calling the provided callback with `[true]` tells Etherpad that the failure was
handled and no further error handling is required. Calling the callback with
`[]` or `undefined` defers error handling to an authzFailure function from
another plugin (if any, otherwise fall back to the deprecated authFailure hook).

Example:

```
exports.authzFailure = (hookName, context, cb) => {
  if (notApplicableToThisPlugin(context)) return cb([]);
  if (needsPremiumAccount(context.req) && !context.req.session.user.premium) {
    context.res.status(200).send(makeUpgradeToPremiumAccountPage(context.req));
    return cb([true]);
  }
  // Use the generic 403 forbidden response.
  return cb([]);
};
```

## handleMessage
Called from: src/node/handler/PadMessageHandler.js

Things in context:

1. message - the message being handled
2. socket - the socket.io Socket object
3. client - **deprecated** synonym of socket

This hook allows plugins to drop or modify incoming socket.io messages from
clients, before Etherpad processes them.

The handleMessage function must return a Promise. If the Promise resolves to
`null`, the message is dropped. Returning `callback(value)` will return a
Promise that is resolved to `value`.

Examples:

```
// Using an async function:
exports.handleMessage = async (hookName, {message, socket}) => {
  if (message.type === 'USERINFO_UPDATE') {
    // Force the display name to the name associated with the account.
    const user = socket.client.request.session.user || {};
    if (user.name) message.data.userInfo.name = user.name;
  }
};

// Using a regular function:
exports.handleMessage = (hookName, {message, socket}, callback) => {
  if (message.type === 'USERINFO_UPDATE') {
    // Force the display name to the name associated with the account.
    const user = socket.client.request.session.user || {};
    if (user.name) message.data.userInfo.name = user.name;
  }
  return callback();
};
```

## handleMessageSecurity
Called from: src/node/handler/PadMessageHandler.js

Things in context:

1. message - the message being handled
2. socket - the socket.io Socket object
3. client - **deprecated** synonym of socket

This hook allows plugins to grant temporary write access to a pad. It is called
for each incoming message from a client. If write access is granted, it applies
to the current message and all future messages from the same socket.io
connection until the next `CLIENT_READY` message. Read-only access is reset
**after** each `CLIENT_READY` message, so granting write access has no effect
for those message types.

The handleMessageSecurity function must return a Promise. If the Promise
resolves to `true`, write access is granted as described above. Returning
`callback(value)` will return a Promise that is resolved to `value`.

Examples:

```
// Using an async function:
exports.handleMessageSecurity = async (hookName, {message, socket}) => {
  if (shouldGrantWriteAccess(message, socket)) return true;
  return;
};

// Using a regular function:
exports.handleMessageSecurity = (hookName, {message, socket}, callback) => {
  if (shouldGrantWriteAccess(message, socket)) return callback(true);
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

You can manipulate `clientVars` in two different ways:
* Return an object. The object will be merged into `clientVars` via
  `Object.assign()`, so any keys that already exist in `clientVars` will be
  overwritten by the values in the returned object.
* Modify `context.clientVars`. Beware: Other plugins might also be reading or
  manipulating the same `context.clientVars` object. To avoid race conditions,
  you are encouraged to return an object rather than modify
  `context.clientVars`.

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

## exportHTMLAdditionalContent
Called from: src/node/utils/ExportHtml.js

Things in context:

1. padId

This hook will allow a plug-in developer to include additional HTML content in
the body of the exported HTML.

Example:

```
exports.exportHTMLAdditionalContent = async (hookName, {padId}) => {
  return 'I am groot in ' + padId;
};
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

This hook is called when attributes are investigated on a line. It is useful if
you want to add another attribute type or property type to a pad.

An attributes object is passed to the aceAttribClasses hook functions instead of
the usual context object. A hook function can either modify this object directly
or provide an object whose properties will be assigned to the attributes object.

Example:

```
exports.aceAttribClasses = (hookName, attrs, cb) => {
  return cb([{
    sub: 'tag:sub',
  }]);
};
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

## exportEtherpadAdditionalContent
Called from src/node/utils/ExportEtherpad.js and
src/node/utils/ImportEtherpad.js

Things in context: Nothing

Useful for exporting and importing pad metadata that is stored in the database
but not in the pad's content or attributes. For example, in ep_comments_page the
comments are stored as `comments:padId:uniqueIdOfComment` so a complete export
of all pad data to an `.etherpad` file must include the `comments:padId:*`
records.

Example:

```
// Add support for exporting comments metadata
exports.exportEtherpadAdditionalContent = () => ['comments'];
```

## `import`

Called from: `src/node/handler/ImportHandler.js`

Called when a user submits a document for import, before the document is
converted to HTML. The hook function should return a truthy value if the hook
function elected to convert the document to HTML.

Context properties:

* `destFile`: The destination HTML filename.
* `fileEnding`: The lower-cased filename extension from `srcFile` **with leading
  period** (examples: `'.docx'`, `'.html'`, `'.etherpad'`).
* `padId`: The identifier of the destination pad.
* `srcFile`: The document to convert.

## `userJoin`

Called from: `src/node/handler/PadMessageHandler.js`

Called after users have been notified that a new user has joined the pad.

Context properties:

* `authorId`: The user's author identifier.
* `displayName`: The user's display name.
* `padId`: The real (not read-only) identifier of the pad the user joined. This
  MUST NOT be shared with any users that are connected with read-only access.
* `readOnly`: Whether the user only has read-only access.
* `readOnlyPadId`: The read-only identifier of the pad the user joined.
* `socket`: The socket.io Socket object.

Example:

```javascript
exports.userJoin = async (hookName, {authorId, displayName, padId}) => {
  console.log(`${authorId} (${displayName}) joined pad ${padId});
};
```

## `userLeave`

Called from: `src/node/handler/PadMessageHandler.js`

Called when a user disconnects from a pad. This is useful if you want to perform
certain actions after a pad has been edited.

Context properties:

* `authorId`: The user's author ID.
* `padId`: The pad's real (not read-only) identifier.
* `readOnly`: If truthy, the user only has read-only access.
* `readOnlyPadId`: The pad's read-only identifier.
* `socket`: The socket.io Socket object.

Example:

```javascript
exports.userLeave = async (hookName, {author, padId}) => {
  console.log(`${author} left pad ${padId}`);
};
```

## `chatNewMessage`

Called from: `src/node/handler/PadMessageHandler.js`

Called when a user (or plugin) generates a new chat message, just before it is
saved to the pad and relayed to all connected users.

Context properties:

* `message`: The chat message object. Plugins can mutate this object to change
  the message text or add custom metadata to control how the message will be
  rendered by the `chatNewMessage` client-side hook. The message's `authorId`
  property can be trusted (the server overwrites any client-provided author ID
  value with the user's actual author ID before this hook runs).
* `padId`: The pad's real (not read-only) identifier.
* `pad`: The pad's Pad object.
