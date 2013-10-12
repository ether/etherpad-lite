# Localization
Etherpad provides a  multi-language user interface, that's apart from your users' content, so users from different countries can collaborate on a single document, while still having the user interface displayed in their mother tongue.


## Translating
We rely on http://translatewiki.net to handle the translation process for us, so if you'd like to help...

1. sign up at http://translatewiki.net
2. Visit our [TWN project page](https://translatewiki.net/wiki/Translating:Etherpad_lite)
3. Click on `Translate Etherpad lite interface`
4. Choose a target language, you'd like to translate our interface to, and hit `Fetch`
5. Start translating!

Translations will be send back to us regularly and will eventually appear in the next release.

## Implementation

### Server-side
`/src/locales` contains files for all supported languages which contain the translated strings. Translation files are simple `*.json` files and look like this:

```json
{ "pad.modals.connected": "Connecté."
, "pad.modals.uderdup": "Ouvrir dans une nouvelle fenêtre."
, "pad.toolbar.unindent.title": "Dèsindenter"
, "pad.toolbar.undo.title": "Annuler (Ctrl-Z)"
, "timeslider.pageTitle": "{{appTitle}} Curseur temporel"
, ...
}
```

Each translation consists of a key (the id of the string that is to be translated) and the translated string. Terms in curly braces must not be touched but left as they are, since they represent a dynamically changing part of the string like a variable. Imagine a message welcoming a user: `Welcome, {{userName}}!` would be translated as `Ahoy, {{userName}}!` in pirate.

### Client-side
We use a `language` cookie to save your language settings if you change them. If you don't, we autodetect your locale using information from your browser. Now, that we know your preferred language this information is feeded into a very nice library called [html10n.js](https://github.com/marcelklehr/html10n.js), which loads the appropriate translations and applies them to our templates, providing translation params, pluralization, include rules and even a nice javascript API along the way.



## Localizing plugins

### 1. Mark the strings to translate

In the template files of your plugin, change all hardcoded messages/strings...

from:
```html
<option value="0">Heading 1</option>
```
to:
```html
<option data-l10n-id="ep_heading.h1" value="0"></option>
```

In the javascript files of your plugin, change all hardcoded messages/strings...

from:
```js
alert ('Chat');
```
to:
```js
alert(window._('pad.chat'));
```
### 2. Create translate files in the locales directory of your plugin

* The name of the file must be the language code of the language it contains translations for (see [supported lang codes](http://joker-x.github.com/languages4translatewiki/test/); e.g. en ? English, es ? Spanish...)
* The extension of the file must be `.json`
* The default language is English, so your plugin should always provide `en.json`
* In order to avoid naming conflicts, your message keys should start with the name of your plugin followed by a dot (see below)

*ep_your-plugin/locales/en.json*
```
{ "ep_your-plugin.h1": "Heading 1"
}
```

*ep_your-plugin/locales/es.json*
```
{ "ep_your-plugin.h1": "Título 1"
}
```

Everytime the http server is started, it will auto-detect your messages and merge them automatically with the core messages.

### Overwrite core messages

You can overwrite Etherpad's core messages in your plugin's locale files.
For example, if you want to replace `Chat` with `Notes`, simply add...

*ep_your-plugin/locales/en.json*
```
{ "ep_your-plugin.h1": "Heading 1"
, "pad.chat": "Notes"
}
```
