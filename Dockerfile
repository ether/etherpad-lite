# Etherpad Lite Dockerfile
#
# https://github.com/ether/etherpad-lite
#
# Author: muxator

FROM node:lts-alpine
LABEL maintainer="Etherpad team, https://github.com/ether/etherpad-lite"

ARG TIMEZONE=

RUN \
  [ -z "${TIMEZONE}" ] || { \
    apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/${TIMEZONE} /etc/localtime && \
    echo "${TIMEZONE}" > /etc/timezone; \
  }
ENV TIMEZONE=${TIMEZONE}

# Control the configuration file to be copied into the container.
ARG SETTINGS=./settings.json.docker

# plugins to install while building the container. By default no plugins are
# installed.
# If given a value, it has to be a space-separated, quoted list of plugin names.
#
# EXAMPLE:
#   ETHERPAD_PLUGINS="ep_codepad ep_author_neat"
ARG ETHERPAD_PLUGINS=

# Control whether abiword will be installed, enabling exports to DOC/PDF/ODT formats.
# By default, it is not installed.
# If given any value, abiword will be installed.
#
# EXAMPLE:
#   INSTALL_ABIWORD=true
ARG INSTALL_ABIWORD=

# Control whether libreoffice will be installed, enabling exports to DOC/PDF/ODT formats.
# By default, it is not installed.
# If given any value, libreoffice will be installed.
#
# EXAMPLE:
#   INSTALL_LIBREOFFICE=true
ARG INSTALL_SOFFICE=

# By default, Etherpad container is built and run in "production" mode. This is
# leaner (development dependencies are not installed) and runs faster (among
# other things, assets are minified & compressed).
ENV NODE_ENV=production
ENV ETHERPAD_PRODUCTION=true
# Install dependencies required for modifying access.
RUN apk add shadow bash
# Follow the principle of least privilege: run as unprivileged user.
#
# Running as non-root enables running this image in platforms like OpenShift
# that do not allow images running as root.
#
# If any of the following args are set to the empty string, default
# values will be chosen.
ARG EP_HOME=
ARG EP_UID=5001
ARG EP_GID=0
ARG EP_SHELL=

ENV NODE_ENV=production

RUN groupadd --system ${EP_GID:+--gid "${EP_GID}" --non-unique} etherpad && \
    useradd --system ${EP_UID:+--uid "${EP_UID}" --non-unique} --gid etherpad \
        ${EP_HOME:+--home-dir "${EP_HOME}"} --create-home \
        ${EP_SHELL:+--shell "${EP_SHELL}"} etherpad

ARG EP_DIR=/opt/etherpad-lite
RUN mkdir -p "${EP_DIR}" && chown etherpad:etherpad "${EP_DIR}"

# the mkdir is needed for configuration of openjdk-11-jre-headless, see
# https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=863199
RUN  \
    mkdir -p /usr/share/man/man1 && \
    npm install npm@6 -g  && \
    apk update && apk upgrade && \
    apk add  \
        ca-certificates \
        git \
        ${INSTALL_ABIWORD:+abiword abiword-plugin-command} \
        ${INSTALL_SOFFICE:+libreoffice openjdk8-jre libreoffice-common}

USER etherpad

WORKDIR "${EP_DIR}"

COPY --chown=etherpad:etherpad ./ ./

RUN { [ -z "${ETHERPAD_PLUGINS}" ] || /bin/bash -c 'ARR_PLUGINS=($ETHERPAD_PLUGINS) && jq -n "{plugins: \$ARGS.positional}" --args ${ARR_PLUGINS[@]} > var/installed_plugins.json'; } && \
    src/bin/installDeps.sh &&

# Copy the configuration file.
COPY --chown=etherpad:etherpad ${SETTINGS} "${EP_DIR}"/settings.json

# Fix group permissions
RUN chmod -R g=u .

USER root
RUN cd src && npm link
USER etherpad

HEALTHCHECK --interval=20s --timeout=3s CMD ["etherpad-healthcheck"]

EXPOSE 9001
CMD ["etherpad"]
