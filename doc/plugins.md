# Plugins

Etherpad allows you to extend its functionality with plugins. A plugin registers
hooks (functions) for certain events (thus certain features) in Etherpad to
execute its own functionality based on these events.

Publicly available plugins can be found in the npm registry (see
<https://npmjs.org>). Etherpad's naming convention for plugins is to prefix your
plugins with `ep_`. So, e.g. it's `ep_flubberworms`. Thus you can install
plugins from npm, using `npm install ep_flubberworm` in Etherpad's root
directory.

You can also browse to `http://yourEtherpadInstan.ce/admin/plugins`, which will
list all installed plugins and those available on npm. It even provides
functionality to search through all available plugins.

## Folder structure

Ideally a plugin has the following folder structure:

```
ep_<plugin>/
 ├ .github/
 │  └ workflows/
 │     └ npmpublish.yml  ◄─ GitHub workflow to auto-publish on push
 ├ static/
 │  ├ css/               ◄─ static .css files
 │  ├ images/            ◄─ static image files
 │  ├ js/
 │  │  └ index.js        ◄─ static client-side code
 │  └ tests/
 │     ├ backend/
 │     │  └ specs/       ◄─ backend (server) tests
 │     └ frontend/
 │        └ specs/       ◄─ frontend (client) tests
 ├ templates/            ◄─ EJS templates (.html, .js, .css, etc.)
 ├ locales/
 │  ├ en.json            ◄─ English (US) strings
 │  └ qqq.json           ◄─ optional hints for translators
 ├ .travis.yml           ◄─ Travis CI config
 ├ LICENSE
 ├ README.md
 ├ ep.json               ◄─ Etherpad plugin definition
 ├ index.js              ◄─ server-side code
 ├ package.json
 └ package-lock.json
```

If your plugin includes client-side hooks, put them in `static/js/`. If you're
adding in CSS or image files, you should put those files in `static/css/ `and
`static/image/`, respectively, and templates go into `templates/`. Translations
go into `locales/`. Tests go in `static/tests/backend/specs/` and
`static/tests/frontend/specs/`.

A Standard directory structure like this makes it easier to navigate through
your code. That said, do note, that this is not actually *required* to make your
plugin run. If you want to make use of our i18n system, you need to put your
translations into `locales/`, though, in order to have them integrated. (See
"Localization" for more info on how to localize your plugin.)

## Plugin definition

Your plugin definition goes into `ep.json`. In this file you register your hook
functions, indicate the parts of your plugin and the order of execution. (A
documentation of all available events to hook into can be found in chapter
[hooks](#all_hooks).)

```json
{
  "parts": [
    {
      "name": "nameThisPartHoweverYouWant",
      "hooks": {
        "authenticate": "ep_<plugin>/<file>:functionName1",
        "expressCreateServer": "ep_<plugin>/<file>:functionName2"
      },
      "client_hooks": {
        "acePopulateDOMLine": "ep_<plugin>/<file>:functionName3"
      }
    }
  ]
}
```

A hook function registration maps a hook name to a hook function specification.
The hook function specification looks like `ep_example/file.js:functionName`. It
consists of two parts separated by a colon: a module name to `require()` and the
name of a function exported by the named module. See
[`module.exports`](https://nodejs.org/docs/latest/api/modules.html#modules_module_exports)
for how to export a function.

For the module name you can omit the `.js` suffix, and if the file is `index.js`
you can use just the directory name. You can also omit the module name entirely,
in which case it defaults to the plugin name (e.g., `ep_example`).

You can also omit the function name. If you do, Etherpad will look for an
exported function whose name matches the name of the hook (e.g.,
`authenticate`).

If either the module name or the function name is omitted (or both), the colon
may also be omitted unless the provided module name contains a colon. (So if the
module name is `C:\foo.js` then the hook function specification with the
function name omitted would be `"C:\\foo.js:"`.)

Examples: Suppose the plugin name is `ep_example`. All of the following are
equivalent, and will cause the `authorize` hook to call the `exports.authorize`
function in `index.js` from the `ep_example` plugin:

* `"authorize": "ep_example/index.js:authorize"`
* `"authorize": "ep_example/index.js:"`
* `"authorize": "ep_example/index.js"`
* `"authorize": "ep_example/index:authorize"`
* `"authorize": "ep_example/index:"`
* `"authorize": "ep_example/index"`
* `"authorize": "ep_example:authorize"`
* `"authorize": "ep_example:"`
* `"authorize": "ep_example"`
* `"authorize": ":authorize"`
* `"authorize": ":"`
* `"authorize": ""`

### Client hooks and server hooks

There are server hooks, which will be executed on the server (e.g.
`expressCreateServer`), and there are client hooks, which are executed on the
client (e.g. `acePopulateDomLine`). Be sure to not make assumptions about the
environment your code is running in, e.g. don't try to access `process`, if you
know your code will be run on the client, and likewise, don't try to access
`window` on the server...

### Styling

When you install a client-side plugin (e.g. one that implements at least one
client-side hook), the plugin name is added to the `class` attribute of the div
`#editorcontainerbox` in the main window. This gives you the opportunity of
tuning the appearance of the main UI in your plugin.

For example, this is the markup with no plugins installed:

```html
<div id="editorcontainerbox" class="">
```

and this is the contents after installing `someplugin`:

```html
<div id="editorcontainerbox" class="ep_someplugin">
```

This feature was introduced in Etherpad **1.8**.

### Parts

As your plugins become more and more complex, you will find yourself in the need
to manage dependencies between plugins. E.g. you want the hooks of a certain
plugin to be executed before (or after) yours. You can also manage these
dependencies in your plugin definition file `ep.json`:

```json
{
  "parts": [
    {
      "name": "onepart",
      "pre": [],
      "post": ["ep_onemoreplugin/partone"]
      "hooks": {
        "storeBar": "ep_monospace/plugin:storeBar",
        "getFoo": "ep_monospace/plugin:getFoo",
      }
    },
    {
      "name": "otherpart",
      "pre": ["ep_my_example/somepart", "ep_otherplugin/main"],
      "post": [],
      "hooks": {
        "someEvent": "ep_my_example/otherpart:someEvent",
        "another": "ep_my_example/otherpart:another"
      }
    }
  ]
}
```

Usually a plugin will add only one functionality at a time, so it will probably
only use one `part` definition to register its hooks. However, sometimes you
have to put different (unrelated) functionalities into one plugin. For this you
will want use parts, so other plugins can depend on them.

#### pre/post

The `"pre"` and `"post"` definitions, affect the order in which parts of a
plugin are executed. This ensures that plugins and their hooks are executed in
the correct order.

`"pre"` lists parts that must be executed *before* the defining part. `"post"`
lists parts that must be executed *after* the defining part.

You can, on a basic level, think of this as double-ended dependency listing. If
you have a dependency on another plugin, you can make sure it loads before yours
by putting it in `"pre"`. If you are setting up things that might need to be
used by a plugin later, you can ensure proper order by putting it in `"post"`.

Note that it would be far more sane to use `"pre"` in almost any case, but if
you want to change config variables for another plugin, or maybe modify its
environment, `"post"` could definitely be useful.

Also, note that dependencies should *also* be listed in your package.json, so
they can be `npm install`'d automagically when your plugin gets installed.

## Package definition

Your plugin must also contain a [package definition
file](https://docs.npmjs.com/files/package.json), called package.json, in the
project root - this file contains various metadata relevant to your plugin, such
as the name and version number, author, project hompage, contributors, a short
description, etc. If you publish your plugin on npm, these metadata are used for
package search etc., but it's necessary for Etherpad plugins, even if you don't
publish your plugin.

```json
{
  "name": "ep_PLUGINNAME",
  "version": "0.0.1",
  "description": "DESCRIPTION",
  "author": "USERNAME (REAL NAME) <MAIL@EXAMPLE.COM>",
  "contributors": [],
  "dependencies": {"MODULE": "0.3.20"},
  "engines": { "node": ">= 10.13.0"}
}
```

## Templates

If your plugin adds or modifies the front end HTML (e.g. adding buttons or
changing their functions), you should put the necessary HTML code for such
operations in `templates/`, in files of type ".ejs", since Etherpad uses EJS for
HTML templating. See the following link for more information about EJS:
<https://github.com/visionmedia/ejs>.

## Writing and running front-end tests for your plugin

Etherpad allows you to easily create front-end tests for plugins.

1. Create a new folder: `%your_plugin%/static/tests/frontend/specs`
2. Put your spec file in there. (Example spec files are visible in
   `%etherpad_root_folder%/frontend/tests/specs`.)
3. Visit http://yourserver.com/frontend/tests and your front-end tests will run.
