# Docker

The official Docker image is available on https://hub.docker.com/r/etherpad/etherpad.

## Downloading from Docker Hub
If you are ok downloading a [prebuilt image from Docker Hub](https://hub.docker.com/r/etherpad/etherpad), these are the commands:
```bash
# gets the latest published version
docker pull etherpad/etherpad

# gets a specific version
docker pull etherpad/etherpad:1.8.0
```

## Build a personalized container

If you want to use a personalized settings file, **you will have to rebuild your image**.
All of the following instructions are as a member of the `docker` group.
By default, the Etherpad Docker image is built and run in `production` mode: no development dependencies are installed, and asset bundling speeds up page load time.

### Rebuilding with custom settings
Edit `<BASEDIR>/settings.json.docker` at your will. When rebuilding the image, this file will be copied inside your image and renamed to `setting.json`.

**Each configuration parameter can also be set via an environment variable**, using the syntax `"${ENV_VAR}"` or `"${ENV_VAR:default_value}"`. For details, refer to `settings.json.template`.

### Rebuilding including some plugins
If you want to install some plugins in your container, it is sufficient to list them in the ETHERPAD_PLUGINS build variable.
The variable value has to be a space separated, double quoted list of plugin names (see examples).

Some plugins will need personalized settings. Just refer to the previous section, and include them in your custom `settings.json.docker`.

### Examples

Build a Docker image from the currently checked-out code:
```bash
docker build --tag <YOUR_USERNAME>/etherpad .
```

Include two plugins in the container:
```bash
docker build --build-arg ETHERPAD_PLUGINS="ep_codepad ep_author_neat" --tag <YOUR_USERNAME>/etherpad .
```

## Running your instance:

To run your instance:
```bash
docker run --detach --publish <DESIRED_PORT>:9001 <YOUR_USERNAME>/etherpad
```

And point your browser to `http://<YOUR_IP>:<DESIRED_PORT>`

## Options available by default

The `settings.json.docker` available by default allows to control almost every setting via environment variables.

### General

| Variable           | Description                                                                                | Default                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TITLE`            | The name of the instance                                                                   | `Etherpad`                                                                                                                                                                                                                          |
| `FAVICON`          | favicon default name, or a fully specified URL to your own favicon                         | `favicon.ico`                                                                                                                                                                                                                       |
| `DEFAULT_PAD_TEXT` | The default text of a pad                                                                  | `Welcome to Etherpad! This pad text is synchronized as you type, so that everyone viewing this page sees the same text. This allows you to collaborate seamlessly on documents! Get involved with Etherpad at https://etherpad.org` |
| `IP`               | IP which etherpad should bind at. Change to `::` for IPv6                                  | `0.0.0.0`                                                                                                                                                                                                                           |
| `PORT`             | port which etherpad should bind at                                                         | `9001`                                                                                                                                                                                                                              |
| `ADMIN_PASSWORD`   | the password for the `admin` user (leave unspecified if you do not want to create it)      |                                                                                                                                                                                                                                     |
| `USER_PASSWORD`    | the password for the first user `user` (leave unspecified if you do not want to create it) |                                                                                                                                                                                                                                     |


### Database

| Variable      | Description                                                    | Default                                                               |
| ------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| `DB_TYPE`     | a database supported by https://www.npmjs.com/package/ueberdb2 | not set, thus will fall back to `DirtyDB` (please choose one instead) |
| `DB_HOST`     | the host of the database                                       |                                                                       |
| `DB_PORT`     | the port of the database                                       |                                                                       |
| `DB_NAME`     | the database name                                              |                                                                       |
| `DB_USER`     | a database user with sufficient permissions to create tables   |                                                                       |
| `DB_PASS`     | the password for the database username                         |                                                                       |
| `DB_CHARSET`  | the character set for the tables (only required for MySQL)     |                                                                       |
| `DB_FILENAME` | in case `DB_TYPE` is `DirtyDB`, the database filename.         | `var/dirty.db`                                                        |

If your database needs additional settings, you will have to use a personalized `settings.json.docker` and rebuild the container (or otherwise put the updated `settings.json` inside your image).


### Pad Options

| Variable                         | Description | Default |
| -------------------------------- | ----------- | ------- |
| `PAD_OPTIONS_NO_COLORS`          |             | `false` |
| `PAD_OPTIONS_SHOW_CONTROLS`      |             | `true`  |
| `PAD_OPTIONS_SHOW_CHAT`          |             | `true`  |
| `PAD_OPTIONS_SHOW_LINE_NUMBERS`  |             | `true`  |
| `PAD_OPTIONS_USE_MONOSPACE_FONT` |             | `false` |
| `PAD_OPTIONS_USER_NAME`          |             | `false` |
| `PAD_OPTIONS_USER_COLOR`         |             | `false` |
| `PAD_OPTIONS_RTL`                |             | `false` |
| `PAD_OPTIONS_ALWAYS_SHOW_CHAT`   |             | `false` |
| `PAD_OPTIONS_CHAT_AND_USERS`     |             | `false` |
| `PAD_OPTIONS_LANG`               |             | `en-gb` |


### Shortcuts

| Variable                            | Description                                      | Default |
| ----------------------------------- | ------------------------------------------------ | ------- |
| `PAD_SHORTCUTS_ENABLED_ALT_F9`      | focus on the File Menu and/or editbar            | `true`  |
| `PAD_SHORTCUTS_ENABLED_ALT_C`       | focus on the Chat window                         | `true`  |
| `PAD_SHORTCUTS_ENABLED_CMD_S`       | save a revision                                  | `true`  |
| `PAD_SHORTCUTS_ENABLED_CMD_Z`       | undo/redo                                        | `true`  |
| `PAD_SHORTCUTS_ENABLED_CMD_Y`       | redo                                             | `true`  |
| `PAD_SHORTCUTS_ENABLED_CMD_I`       | italic                                           | `true`  |
| `PAD_SHORTCUTS_ENABLED_CMD_B`       | bold                                             | `true`  |
| `PAD_SHORTCUTS_ENABLED_CMD_U`       | underline                                        | `true`  |
| `PAD_SHORTCUTS_ENABLED_CMD_H`       | backspace                                        | `true`  |
| `PAD_SHORTCUTS_ENABLED_CMD_5`       | strike through                                   | `true`  |
| `PAD_SHORTCUTS_ENABLED_CMD_SHIFT_1` | ordered list                                     | `true`  |
| `PAD_SHORTCUTS_ENABLED_CMD_SHIFT_2` | shows a gritter popup showing a line author      | `true`  |
| `PAD_SHORTCUTS_ENABLED_CMD_SHIFT_L` | unordered list                                   | `true`  |
| `PAD_SHORTCUTS_ENABLED_CMD_SHIFT_N` | ordered list                                     | `true`  |
| `PAD_SHORTCUTS_ENABLED_CMD_SHIFT_C` | clear authorship                                 | `true`  |
| `PAD_SHORTCUTS_ENABLED_DELETE`      |                                                  | `true`  |
| `PAD_SHORTCUTS_ENABLED_RETURN`      |                                                  | `true`  |
| `PAD_SHORTCUTS_ENABLED_ESC`         | in mozilla versions 14-19 avoid reconnecting pad | `true`  |
| `PAD_SHORTCUTS_ENABLED_TAB`         | indent                                           | `true`  |
| `PAD_SHORTCUTS_ENABLED_CTRL_HOME`   | scroll to top of pad                             | `true`  |
| `PAD_SHORTCUTS_ENABLED_PAGE_UP`     |                                                  | `true`  |
| `PAD_SHORTCUTS_ENABLED_PAGE_DOWN`   |                                                  | `true`  |


### Skins

You can use the UI skin variants builder at `/p/test#skinvariantsbuilder`

For the colibris skin only, you can choose how to render the three main containers:
  * toolbar (top menu with icons)
  * editor (containing the text of the pad)
  * background (area outside of editor, mostly visible when using page style)

For each of the 3 containers you can choose 4 color combinations:
   * super-light
   * light
   * dark
   * super-dark

For the editor container, you can also make it full width by adding `full-width-editor` variant (by default editor is rendered as a page, with a max-width of 900px).

| Variable        | Description                                                                    | Default                                                   |
| --------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `SKIN_NAME`     | either `no-skin`, `colibris` or an existing directory under `src/static/skins` | `colibris`                                                |
| `SKIN_VARIANTS` | multiple skin variants separated by spaces                                     | `super-light-toolbar super-light-editor light-background` |


### Logging

| Variable             | Description                                          | Default |
| -------------------- | ---------------------------------------------------- | ------- |
| `LOGLEVEL`           | valid values are `DEBUG`, `INFO`, `WARN` and `ERROR` | `INFO`  |
| `DISABLE_IP_LOGGING` | Privacy: disable IP logging                          | `false` |


### Advanced

| Variable                          | Description                                                                                                                                                                                            | Default            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| `SHOW_SETTINGS_IN_ADMIN_PAGE`     | hide/show the settings.json in admin page                                                                                                                                                              | `true`             |
| `TRUST_PROXY`                     | set to `true` if you are using a reverse proxy in front of Etherpad (for example: Traefik for SSL termination via Let's Encrypt). This will affect security and correctness of the logs if not done    | `false`            |
| `IMPORT_MAX_FILE_SIZE`            | maximum allowed file size when importing a pad, in bytes.                                                                                                                                              | `52428800` (50 MB) |
| `IMPORT_EXPORT_MAX_REQ_PER_IP`    | maximum number of import/export calls per IP.                                                                                                                                                          | `10`               |
| `IMPORT_EXPORT_RATE_LIMIT_WINDOW` | the call rate for import/export requests will be estimated in this time window (in milliseconds)                                                                                                       | `90000`            |
| `SUPPRESS_ERRORS_IN_PAD_TEXT`     | Should we suppress errors from being visible in the default Pad Text?                                                                                                                                  | `false`            |
| `REQUIRE_SESSION`                 | If this option is enabled, a user must have a session to access pads. This effectively allows only group pads to be accessed.                                                                          | `false`            |
| `EDIT_ONLY`                       | Users may edit pads but not create new ones. Pad creation is only via the API. This applies both to group pads and regular pads.                                                                       | `false`            |
| `SESSION_NO_PASSWORD`             | If set to true, those users who have a valid session will automatically be granted access to password protected pads.                                                                                  | `false`            |
| `MINIFY`                          | If true, all css & js will be minified before sending to the client. This will improve the loading performance massively, but makes it difficult to debug the javascript/css                           | `true`             |
| `MAX_AGE`                         | How long may clients use served javascript code (in seconds)? Not setting this may cause problems during deployment. Set to 0 to disable caching.                                                      | `21600` (6 hours)  |
| `ABIWORD`                         | Absolute path to the Abiword executable. Abiword is needed to get advanced import/export features of pads. Setting it to null disables Abiword and will only allow plain text and HTML import/exports. | `null`             |
| `SOFFICE`                         | This is the absolute path to the soffice executable. LibreOffice can be used in lieu of Abiword to export pads. Setting it to null disables LibreOffice exporting.                                     | `null`             |
| `TIDY_HTML`                       | Path to the Tidy executable. Tidy is used to improve the quality of exported pads. Setting it to null disables Tidy.                                                                                   | `null`             |
| `ALLOW_UNKNOWN_FILE_ENDS`         | Allow import of file types other than the supported ones: txt, doc, docx, rtf, odt, html & htm                                                                                                         | `true`             |
| `REQUIRE_AUTHENTICATION`          | This setting is used if you require authentication of all users. Note: "/admin" always requires authentication.                                                                                        | `false`            |
| `REQUIRE_AUTHORIZATION`           | Require authorization by a module, or a user with is_admin set, see below.                                                                                                                             | `false`            |
| `AUTOMATIC_RECONNECTION_TIMEOUT`  | Time (in seconds) to automatically reconnect pad when a "Force reconnect" message is shown to user. Set to 0 to disable automatic reconnection.                                                        | `0`                |
| `FOCUS_LINE_PERCENTAGE_ABOVE`     | Percentage of viewport height to be additionally scrolled. e.g. 0.5, to place caret line in the middle of viewport, when user edits a line above of the viewport. Set to 0 to disable extra scrolling  | `0`                |
| `FOCUS_LINE_PERCENTAGE_BELOW`     | Percentage of viewport height to be additionally scrolled. e.g. 0.5, to place caret line in the middle of viewport, when user edits a line below of the viewport. Set to 0 to disable extra scrolling  | `0`                |
| `FOCUS_LINE_PERCENTAGE_ARROW_UP`  | Percentage of viewport height to be additionally scrolled when user presses arrow up in the line of the top of the viewport. Set to 0 to let the scroll to be handled as default by Etherpad           | `0`                |
| `FOCUS_LINE_DURATION`             | Time (in milliseconds) used to animate the scroll transition. Set to 0 to disable animation                                                                                                            | `0`                |
| `FOCUS_LINE_CARET_SCROLL`         | Flag to control if it should scroll when user places the caret in the last line of the viewport                                                                                                        | `false`            |
| `LOAD_TEST`                       | Allow Load Testing tools to hit the Etherpad Instance. WARNING: this will disable security on the instance.                                                                                            | `false`            |
| `EXPOSE_VERSION`                  | Expose Etherpad version in the web interface and in the Server http header. Do not enable on production machines.                                                                                      | `false`            |


### Examples

Use a Postgres database, no admin user enabled:

```shell
docker run -d \
	--name etherpad         \
	-p 9001:9001            \
	-e 'DB_TYPE=postgres'   \
	-e 'DB_HOST=db.local'   \
	-e 'DB_PORT=4321'       \
	-e 'DB_NAME=etherpad'   \
	-e 'DB_USER=dbusername' \
	-e 'DB_PASS=mypassword' \
	etherpad/etherpad
```

Run enabling the administrative user `admin`:

```shell
docker run -d \
	--name etherpad \
	-p 9001:9001 \
	-e 'ADMIN_PASSWORD=supersecret' \
	etherpad/etherpad
```

Run a test instance running DirtyDB on a persistent volume:

```
docker run -d \
	-v etherpad_data:/opt/etherpad-lite/var \
	-p 9001:9001 \
	etherpad/etherpad
```
