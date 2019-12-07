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

The `settings.json.docker` available by default enables some configuration to be set from the environment.

Available options:

* `TITLE`: The name of the instance
* `FAVICON`: favicon default name, or a fully specified URL to your own favicon
* `SKIN_NAME`: either `no-skin`, `colibris` or an existing directory under `src/static/skins`.
* `IP`: IP which etherpad should bind at. Change to `::` for IPv6
* `PORT`: port which etherpad should bind at
* `SHOW_SETTINGS_IN_ADMIN_PAGE`: hide/show the settings.json in admin page
* `DB_TYPE`: a database supported by https://www.npmjs.com/package/ueberdb2
* `DB_HOST`: the host of the database
* `DB_PORT`: the port of the database
* `DB_NAME`: the database name
* `DB_USER`: a database user with sufficient permissions to create tables
* `DB_PASS`: the password for the database username
* `DB_CHARSET`: the character set for the tables (only required for MySQL)
* `DB_FILENAME`: in case `DB_TYPE` is `DirtyDB`, the database filename. Default: `var/dirty.db`
* `ADMIN_PASSWORD`: the password for the `admin` user (leave unspecified if you do not want to create it)
* `USER_PASSWORD`: the password for the first user `user` (leave unspecified if you do not want to create it)
* `TRUST_PROXY`: set to `true` if you are using a reverse proxy in front of Etherpad (for example: Traefik for SSL termination via Let's Encrypt). This will affect security and correctness of the logs if not done
* `LOGLEVEL`: valid values are `DEBUG`, `INFO`, `WARN` and `ERROR`

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
