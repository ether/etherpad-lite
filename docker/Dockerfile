# Etherpad Lite Dockerfile
#
# https://github.com/ether/etherpad-docker
#
# Author: muxator
#
# Version 0.1

FROM node:latest
LABEL maintainer="Etherpad team, https://github.com/ether/etherpad-lite"

# install supervisor
RUN apt-get update && apt-get install -y \
	supervisor \
	&& rm -rf /var/lib/apt/lists/*

# install supervisor.conf in a low layer of the container
ADD supervisor.conf /etc/supervisor/supervisor.conf

# git hash of the version to be built.
# If not given, build the latest development version.
ARG ETHERPAD_VERSION=develop

# grab the ETHERPAD_VERSION tarball from github (no need to clone the whole
# repository)
RUN echo "Getting version: ${ETHERPAD_VERSION}" && \
	curl \
		--location \
		--fail \
		--silent \
		--show-error \
		--output /opt/etherpad-lite.tar.gz \
		https://github.com/ether/etherpad-lite/archive/"${ETHERPAD_VERSION}".tar.gz && \
	mkdir /opt/etherpad-lite && \
	tar xf /opt/etherpad-lite.tar.gz \
		--directory /opt/etherpad-lite \
		--strip-components=1 && \
	rm /opt/etherpad-lite.tar.gz

# install node dependencies for Etherpad
RUN /opt/etherpad-lite/bin/installDeps.sh

# Copy the custom configuration file, if present. The configuration file has to
# be manually put inside the same directory containing the Dockerfile (we cannot
# directly point to "../settings.json" for Docker's security restrictions).
#
# For the conditional COPY trick, see:
#   https://stackoverflow.com/questions/31528384/conditional-copy-add-in-dockerfile#46801962
COPY nop setting[s].json /opt/etherpad-lite/

EXPOSE 9001
CMD ["supervisord", "-c", "/etc/supervisor/supervisor.conf", "-n"]
