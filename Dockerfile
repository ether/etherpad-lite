# Etherpad Lite Dockerfile
#
# https://github.com/ether/etherpad-lite
#
# Author: muxator

FROM node:14-buster-slim
LABEL maintainer="Etherpad team, https://github.com/ether/etherpad-lite"

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
RUN export DEBIAN_FRONTEND=noninteractive; \
    mkdir -p /usr/share/man/man1 && \
    apt-get -qq update && \
    apt-get -qq --no-install-recommends install \
        ca-certificates \
        git \
        curl \
        ${INSTALL_ABIWORD:+abiword} \
        ${INSTALL_SOFFICE:+libreoffice} \
        && \
    apt-get -qq clean && \
    rm -rf /var/lib/apt/lists/*

USER etherpad

WORKDIR "${EP_DIR}"

COPY --chown=etherpad:etherpad ./ ./

# Plugins must be installed before installing Etherpad's dependencies, otherwise
# npm will try to hoist common dependencies by removing them from
# src/node_modules and installing them in the top-level node_modules. As of
# v6.14.10, npm's hoist logic appears to be buggy, because it sometimes removes
# dependencies from src/node_modules but fails to add them to the top-level
# node_modules. Even if npm correctly hoists the dependencies, the hoisting
# seems to confuse tools such as `npm outdated`, `npm update`, and some ESLint
# rules.
RUN { [ -z "${ETHERPAD_PLUGINS}" ] || \
      npm install --no-save ${ETHERPAD_PLUGINS}; } && \
    src/bin/installDeps.sh && \
    rm -rf ~/.npm

# Copy the configuration file.
COPY --chown=etherpad:etherpad ./settings.json.docker "${EP_DIR}"/settings.json

# Fix group permissions
RUN chmod -R g=u .

HEALTHCHECK --interval=20s --timeout=3s CMD curl -f http://localhost:9001 || exit 1

EXPOSE 9001
CMD ["node", "src/node/server.js"]
