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