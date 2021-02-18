# Etherpad Lite Dockerfile
#
# https://github.com/ether/etherpad-lite
#
# Author: muxator

FROM node:10-buster-slim
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
RUN useradd --uid 5001 --create-home etherpad

RUN mkdir /opt/etherpad-lite && chown etherpad:0 /opt/etherpad-lite

# install abiword for DOC/PDF/ODT export
RUN [ -z "${INSTALL_ABIWORD}" ] || (apt update && apt -y install abiword && apt clean && rm -rf /var/lib/apt/lists/*)

# install libreoffice for DOC/PDF/ODT export
# the mkdir is needed for configuration of openjdk-11-jre-headless, see https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=863199
RUN [ -z "${INSTALL_SOFFICE}" ] || (apt update && mkdir -p /usr/share/man/man1 && apt -y install libreoffice && apt clean && rm -rf /var/lib/apt/lists/*)

USER etherpad

WORKDIR /opt/etherpad-lite

COPY --chown=etherpad:0 ./ ./

# install node dependencies for Etherpad
RUN src/bin/installDeps.sh && \
	rm -rf ~/.npm/_cacache

# Install the plugins, if ETHERPAD_PLUGINS is not empty.
#
# Bash trick: in the for loop ${ETHERPAD_PLUGINS} is NOT quoted, in order to be
# able to split at spaces.
RUN for PLUGIN_NAME in ${ETHERPAD_PLUGINS}; do npm install "${PLUGIN_NAME}" || exit 1; done

# Copy the configuration file.
COPY --chown=etherpad:0 ./settings.json.docker /opt/etherpad-lite/settings.json

# Fix permissions for root group
RUN chmod -R g=u .

EXPOSE 9001
CMD ["node", "--experimental-worker", "src/node/server.js"]
