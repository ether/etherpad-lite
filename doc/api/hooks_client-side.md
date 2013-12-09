# Client-side hooks
Most of these hooks are called during or in order to set up the formatting process.

## documentReady
Called from: src/templates/pad.html

Things in context:

nothing

This hook proxies the functionality of jQuery's `$(document).ready` event.

## aceDomLineProcessLineAttributes
Called from: src/static/js/domline.js

Things in context:

1. domline - The current DOM line being processed
2. cls - The class of the current block element (useful for styling)

This hook is called for elements in the DOM that have the "lineMarkerAttribute" set. You can add elements into this category with the aceRegisterBlockElements hook above.

The return value of this hook should have the following structure:

`{ preHtml: String, postHtml: String, processedMarker: Boolean }`

The preHtml and postHtml values will be added to the HTML display of the element, and if processedMarker is true, the engine won't try to process it any more.

## aceCreateDomLine
Called from: src/static/js/domline.js

Things in context:

1. domline - the current DOM line being processed
2. cls - The class of the current element (useful for styling)

This hook is called for any line being processed by the formatting engine, unless the aceDomLineProcessLineAttributes hook from above returned true, in which case this hook is skipped.

The return value of this hook should have the following structure:

`{ extraOpenTags: String, extraCloseTags: String, cls: String }`

extraOpenTags and extraCloseTags will be added before and after the element in question, and cls will be the new class of the element going forward.

## acePostWriteDomLineHTML
Called from: src/static/js/domline.js

Things in context:

1. node - the DOM node that just got written to the page

This hook is for right after a node has been fully formatted and written to the page.

## aceAttribsToClasses
Called from: src/static/js/linestylefilter.js

Things in context:

1. linestylefilter - the JavaScript object that's currently processing the ace attributes
2. key - the current attribute being processed
3. value - the value of the attribute being processed

This hook is called during the attribute processing procedure, and should be used to translate key, value pairs into valid HTML classes that can be inserted into the DOM.

The return value for this function should be a list of classes, which will then be parsed into a valid class string.

## aceGetFilterStack
Called from: src/static/js/linestylefilter.js

Things in context:

1. linestylefilter - the JavaScript object that's currently processing the ace attributes
2. browser - an object indicating which browser is accessing the page

This hook is called to apply custom regular expression filters to a set of styles. The one example available is the ep_linkify plugin, which adds internal links. They use it to find the telltale `[[ ]]` syntax that signifies internal links, and finding that syntax, they add in the internalHref attribute to be later used by the aceCreateDomLine hook (documented above).

## aceEditorCSS
Called from: src/static/js/ace.js

Things in context: None

This hook is provided to allow custom CSS files to be loaded. The return value should be an array of paths relative to the plugins directory.

## aceInitInnerdocbodyHead
Called from: src/static/js/ace.js

Things in context:

1. iframeHTML - the HTML of the editor iframe up to this point, in array format

This hook is called during the creation of the editor HTML. The array should have lines of HTML added to it, giving the plugin author a chance to add in meta, script, link, and other tags that go into the `<head>` element of the editor HTML document.

## aceEditEvent
Called from: src/static/js/ace2_inner.js

Things in context:

1. callstack - a bunch of information about the current action
2. editorInfo - information about the user who is making the change
3. rep - information about where the change is being made
4. documentAttributeManager - information about attributes in the document (this is a mystery to me)

This hook is made available to edit the edit events that might occur when changes are made. Currently you can change the editor information, some of the meanings of the edit, and so on. You can also make internal changes (internal to your plugin) that use the information provided by the edit event.

## aceRegisterBlockElements
Called from: src/static/js/ace2_inner.js

Things in context: None

The return value of this hook will add elements into the "lineMarkerAttribute" category, making the aceDomLineProcessLineAttributes hook (documented below) call for those elements.

## aceInitialized
Called from: src/static/js/ace2_inner.js

Things in context:

1. editorInfo - information about the user who will be making changes through the interface, and a way to insert functions into the main ace object (see ep_headings)
2. rep - information about where the user's cursor is
3. documentAttributeManager - some kind of magic

This hook is for inserting further information into the ace engine, for later use in formatting hooks.

## postAceInit
Called from: src/static/js/pad.js

Things in context:

1. ace - the ace object that is applied to this editor.
2. pad - the pad object of the current pad.

There doesn't appear to be any example available of this particular hook being used, but it gets fired after the editor is all set up.

## postTimesliderInit
Called from: src/static/js/timeslider.js

There doesn't appear to be any example available of this particular hook being used, but it gets fired after the timeslider is all set up.

## userJoinOrUpdate
Called from: src/static/js/pad_userlist.js

Things in context:

1. info - the user information

This hook is called on the client side whenever a user joins or changes. This can be used to create notifications or an alternate user list.

## chatNewMessage
Called from: src/static/js/chat.js

Things in context:

1. authorName - The user that wrote this message
2. author - The authorID of the user that wrote the message
2. text - the message text
3. sticky (boolean) - if you want the gritter notification bubble to fade out on its own or just sit there
3. timestamp - the timestamp of the chat message
4. timeStr - the timestamp as a formatted string

This hook is called on the client side whenever a chat message is received from the server. It can be used to create different notifications for chat messages.

## collectContentPre
Called from: src/static/js/contentcollector.js

Things in context:

1. cc - the contentcollector object
2. state - the current state of the change being made
3. tname - the tag name of this node currently being processed
4. style - the style applied to the node (probably CSS)
5. cls - the HTML class string of the node

This hook is called before the content of a node is collected by the usual methods. The cc object can be used to do a bunch of things that modify the content of the pad. See, for example, the heading1 plugin for etherpad original.

## collectContentPost
Called from: src/static/js/contentcollector.js

Things in context:

1. cc - the contentcollector object
2. state - the current state of the change being made
3. tname - the tag name of this node currently being processed
4. style - the style applied to the node (probably CSS)
5. cls - the HTML class string of the node

This hook is called after the content of a node is collected by the usual methods. The cc object can be used to do a bunch of things that modify the content of the pad. See, for example, the heading1 plugin for etherpad original.

## handleClientMessage_`name`
Called from: `src/static/js/collab_client.js`

Things in context:

1. payload - the data that got sent with the message (use it for custom message content)

This hook gets called every time the client receives a message of type `name`. This can most notably be used with the new HTTP API call, "sendClientsMessage", which sends a custom message type to all clients connected to a pad. You can also use this to handle existing types.

`collab_client.js` has a pretty extensive list of message types, if you want to take a look.

##aceStartLineAndCharForPoint-aceEndLineAndCharForPoint 
Called from: src/static/js/ace2_inner.js

Things in context:

1. callstack - a bunch of information about the current action
2. editorInfo - information about the user who is making the change
3. rep - information about where the change is being made
4. root - the span element of the current line
5. point - the starting/ending element where the cursor highlights
6. documentAttributeManager - information about attributes in the document

This hook is provided to allow a plugin to turn DOM node selection into [line,char] selection.
The return value should be an array of [line,char]

##aceKeyEvent 
Called from: src/static/js/ace2_inner.js

Things in context:

1. callstack - a bunch of information about the current action
2. editorInfo - information about the user who is making the change
3. rep - information about where the change is being made
4. documentAttributeManager - information about attributes in the document
5. evt - the fired event

This hook is provided to allow a plugin to handle key events.
The return value should be true if you have handled the event.

##collectContentLineText 
Called from: src/static/js/contentcollector.js

Things in context:

1. cc - the contentcollector object
2. state - the current state of the change being made
3. tname - the tag name of this node currently being processed
4. text - the text for that line

This hook allows you to validate/manipulate the text before it's sent to the server side.
The return value should be the validated/manipulated text.

##collectContentLineBreak 
Called from: src/static/js/contentcollector.js

Things in context:

1. cc - the contentcollector object
2. state - the current state of the change being made
3. tname - the tag name of this node currently being processed

This hook is provided to allow whether the br tag should induce a new magic domline or not.
The return value should be either true(break the line) or false.

##disableAuthorColorsForThisLine 
Called from: src/static/js/linestylefilter.js

Things in context:

1. linestylefilter - the JavaScript object that's currently processing the ace attributes
2. text - the line text
3. class - line class

This hook is provided to allow whether a given line should be deliniated with multiple authors.
Multiple authors in one line cause the creation of magic span lines. This might not suit you and
now you can disable it and handle your own deliniation.
The return value should be either true(disable) or false.

## aceSetAuthorStyle
Called from: src/static/js/ace2_inner.js

Things in context:

1. dynamicCSS - css manger for inner ace
2. outerDynamicCSS - css manager for outer ace
3. parentDynamicCSS - css manager for parent document
4. info - author style info
5. author - author info
6. authorSelector - css selector for author span in inner ace

This hook is provided to allow author highlight style to be modified.
Registered hooks should return 1 if the plugin handles highlighting.  If no plugin returns 1, the core will use the default background-based highlighting.
