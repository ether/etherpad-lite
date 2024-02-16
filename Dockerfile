# Etherpad Lite Dockerfile
#
# https://github.com/ether/etherpad-lite
#
# Author: muxator

FROM node:alpine as build
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
    npm install pnpm -g  && \
    apk update && apk upgrade && \
    apk add  \
        ca-certificates \
        curl \
        git \
        ${INSTALL_ABIWORD:+abiword abiword-plugin-command} \
        ${INSTALL_SOFFICE:+libreoffice openjdk8-jre libreoffice-common}

USER etherpad

WORKDIR "${EP_DIR}"

# etherpads version feature requires this. Only copy what is really needed
COPY --chown=etherpad:etherpad ./.git/HEAD ./.git/HEAD
COPY --chown=etherpad:etherpad ./.git/refs ./.git/refs
COPY --chown=etherpad:etherpad ${SETTINGS} ./settings.json
COPY --chown=etherpad:etherpad ./var ./var
COPY --chown=etherpad:etherpad ./node_modules ./node_modules

FROM build as development

COPY --chown=etherpad:etherpad ./src/package.json .npmrc ./src/pnpm-lock.yaml ./src/
COPY --chown=etherpad:etherpad ./src/bin ./src/bin

RUN { [ -z "${ETHERPAD_PLUGINS}" ] || \
      pnpm install --no-save --legacy-peer-deps ${ETHERPAD_PLUGINS}; } && \
    src/bin/installDeps.sh

FROM build as production

# By default, Etherpad container is built and run in "production" mode. This is
# leaner (development dependencies are not installed) and runs faster (among
# other things, assets are minified & compressed).
ENV NODE_ENV=production
ENV ETHERPAD_PRODUCTION=true

COPY --chown=etherpad:etherpad ./src ./src

# Plugins must be installed before installing Etherpad's dependencies, otherwise
# npm will try to hoist common dependencies by removing them from
# src/node_modules and installing them in the top-level node_modules. As of
# v6.14.10, npm's hoist logic appears to be buggy, because it sometimes removes
# dependencies from src/node_modules but fails to add them to the top-level
# node_modules. Even if npm correctly hoists the dependencies, the hoisting
# seems to confuse tools such as `npm outdated`, `npm update`, and some ESLint
# rules.
RUN { [ -z "${ETHERPAD_PLUGINS}" ] || \
      pnpm install --no-save --legacy-peer-deps ${ETHERPAD_PLUGINS}; } && \
    src/bin/installDeps.sh && \
    rm -rf ~/.npm

# Copy the configuration file.
COPY --chown=etherpad:etherpad ${SETTINGS} "${EP_DIR}"/settings.json

# Fix group permissions
# Note: For some reason increases image size from 257 to 334.
# RUN chmod -R g=u .

USER etherpad

HEALTHCHECK --interval=5s --timeout=3s \
  CMD curl --silent http://localhost:9001/health | grep -E "pass|ok|up" > /dev/null || exit 1

EXPOSE 9001
CMD ["npm", "run", "prod", "--prefix", "./src"]
