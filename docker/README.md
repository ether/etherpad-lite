# Docker image

This directory contains the files that are used to build the official Docker image on https://hub.docker.com/r/etherpad/etherpad.

# Downloading from Docker Hub
If you are ok downloading a [prebuilt image from Docker Hub](https://hub.docker.com/r/etherpad/etherpad), these are the commands:
```bash
# gets the latest published version
docker pull etherpad/etherpad

# gets a specific version
docker pull etherpad/etherpad:1.7.5
```

# Build a personalized container

If you want to use a personalized settings file, **you will have to rebuild your image**.
All of the following instructions are as a member of the `docker` group.

## Rebuilding with custom settings
Prepare your custom `settings.json` file:
```bash
cd <BASEDIR>/docker
cp ../settings.json.template settings.json
[ further edit your settings.json as needed]
```

**Each configuration parameter can also be set via an environment variable**, using the syntax `"${ENV_VAR}"` or `"${ENV_VAR:default_value}"`. For details, refer to `settings.json.template`.

## Examples

Build the latest development version:
```bash
docker build --tag <YOUR_USERNAME>/etherpad .
```

Build the latest stable version:
```bash
docker build --build-arg ETHERPAD_VERSION=master --build-arg NODE_ENV=production --tag <YOUR_USERNAME>/etherpad .
```

Build a specific tagged version:
```bash
docker build --build-arg ETHERPAD_VERSION=1.7.5 --build-arg NODE_ENV=production --tag <YOUR_USERNAME>/etherpad .
```

Build a specific git hash:
```bash
docker build --build-arg ETHERPAD_VERSION=4c45ac3cb1ae --tag <YOUR_USERNAME>/etherpad .
```

# Running your instance:

To run your instance:
```bash
docker run --detach --publish <DESIDERED_PORT>:9001 <YOUR_USERNAME>/etherpad
```

And point your browser to `http://<YOUR_IP>:<DESIDERED_PORT>`
