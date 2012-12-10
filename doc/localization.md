# Localization
Etherpad lite provides a  multi-language user interface, that's apart from your users' content, so users from different countries can collaborate on a single document, while still having the user interface displayed in their mother tongue.

## Translating
`/src/locales` contains files for all supported languages which contain the translated strings. To add support for a new language, copy the English language file named `en.ini` and translate it.
Translation files are simply `*.ini` files and look like this:

```
pad.modals.connected = Connecté.
pad.modals.uderdup = Ouvrir dans une nouvelle fenêtre.
pad.toolbar.unindent.title = Désindenter
pad.toolbar.undo.title = Annuler (Ctrl-Z)
timeslider.pageTitle = {{appTitle}} Curseur temporel

```

There must be only one translation per line. Each translation consists of a key (the id of the string that is to be translated), an equal sign and the translated string. Anything after the equa sign will be used as the translated string (you may put some spaces after `=` for better readability, though). Terms in curly braces must not be touched but left as they are, since they represent a dynamically changing part of the string like a variable. Imagine a message welcoming a user: `Welcome, {{userName}}!` would be translated as `Ahoy, {{userName}}!` in pirate.

## Under the hood
We use a `language` cookie to save your language settings if you change them. If you don't, we autodetect your locale using information from your browser. Now, that we know your preferred language this information is feeded into a very nice library called [webL10n](https://github.com/fabi1cazenave/webL10n), which loads the appropriate translations and applies them to our templates, providing translation params, pluralization, include rules and even a nice javascript API along the way.

## How to internationalize a plugin (for developers)

You can see the [ep_headings-trl8 source code](https://github.com/joker-x/etherpad-plugins/tree/master/ep_headings-trl8) for a functional example.

### 1.  Mark the strings to translate

#### In a template file of your plugin
From:
```html
<option value="0">Heading 1</option>
```
To:
```html
<option data-l10n-id="ep_heading-trl8.h1" value="0"></option>
```

#### In a javascript file of your plugin
From:
```js
alert ('Chat');
```
To:
```js
alert(_('pad.chat'));
```
### 2.  Create translate files under locales directory of your plugin:

*  The name of the file must be one of the [language code supported by translatewiki](http://joker-x.github.com/languages4translatewiki/test/) in lowercase: (en → English, es → Spanish...)
*  The extension of the file must be ``.ini``
*  The language by default is English, you will always provide a en.ini file with ``[*]`` in its first line, instead of ``[en]``.
*  For avoid name conflicts, we recommend starting yours keys with the name of your plugin followed by a dot.

*your-plugin-dir/locales/en.ini*
```
[*]
ep_heading-trl8.h1 = Heading 1
```

*your-plugin-dir/locales/es.ini*
```
[es]
ep_heading-trl8.h1 = Título 1
```

**This is all!**
When start Etherpad server it will detect your new messages and merge automatically with messages core.

### Overwrite core messages

You can overwrite the translated message of the Etherpad core in yours ini files.
For example, if you can show *Notes* instead of *Chat* edit

*your-plugin-dir/locales/en.ini*
```
[*]
ep_heading-trl8.h1 = Heading 1
pad.chat = Notes
```

and restart server
