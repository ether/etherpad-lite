# Docker image

This directory contains the files that are used to build the official Docker image on https://hub.docker.com/r/etherpad/etherpad.

# Rebuilding with custom settings
In order to use a personalized settings file, **you will have to rebuild your image**.

All of these instructions are as a member of the `docker` group.

Prepare your custom `settings.json` file:
```bash
cd <BASEDIR>/docker
cp ../settings.json.template settings.json
[ further edit your settings.json as needed]
```

**Each configuration parameter can also be set via an environment variable**, using the syntax `"${ENV_VAR}"` or `"${ENV_VAR:default_value}"`. For details, refer to `settings.json.template`.

Build the version you prefer:
```bash
# builds latest development version
docker build --tag <YOUR_USERNAME>/etherpad .

# builds latest stable version
docker build --build-arg ETHERPAD_VERSION=master --build-arg NODE_ENV=production --tag <YOUR_USERNAME>/etherpad .

# builds a specific version
docker build --build-arg ETHERPAD_VERSION=1.7.5 --build-arg NODE_ENV=production --tag <YOUR_USERNAME>/etherpad .

# builds a specific git hash
docker build --build-arg ETHERPAD_VERSION=4c45ac3cb1ae --tag <YOUR_USERNAME>/etherpad .
```

# Downloading from Docker Hub
If you are ok downloading a [prebuilt image from Docker Hub](https://hub.docker.com/r/etherpad/etherpad), these are the commands:
```bash
# gets the latest published version
docker pull etherpad/etherpad

# gets a specific version
docker pull etherpad/etherpad:1.7.5
```

# Running your instance:

To run your instance:
```bash
docker run --detach --publish <DESIDERED_PORT>:9001 <YOUR_USERNAME>/etherpad
```

And point your browser to `http://<YOUR_IP>:<DESIDERED_PORT>`
