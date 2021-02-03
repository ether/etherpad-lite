#!/bin/sh

pecho() { printf %s\\n "$*"; }
log() { pecho "$@"; }
error() { log "ERROR: $@" >&2; }
fatal() { error "$@"; exit 1; }
try() { "$@" || fatal "'$@' failed"; }

[ -n "${SAUCE_USERNAME}" ] || fatal "SAUCE_USERNAME is unset - exiting"
[ -n "${SAUCE_ACCESS_KEY}" ] || fatal "SAUCE_ACCESS_KEY is unset - exiting"

# download and unzip the sauce connector
#
# ACHTUNG: as of 2019-12-21, downloading sc-latest-linux.tar.gz does not work.
# It is necessary to explicitly download a specific version, for example
# https://saucelabs.com/downloads/sc-4.5.4-linux.tar.gz Supported versions are
# currently listed at:
# https://wiki.saucelabs.com/display/DOCS/Downloading+Sauce+Connect+Proxy
try curl -o /tmp/sauce.tar.gz \
    https://saucelabs.com/downloads/sc-4.6.2-linux.tar.gz
try tar zxf /tmp/sauce.tar.gz --directory /tmp
try mv /tmp/sc-*-linux /tmp/sauce_connect

# start the sauce connector in background and make sure it doesn't output the
# secret key
try rm -f /tmp/tunnel
/tmp/sauce_connect/bin/sc \
    --user "${SAUCE_USERNAME}" \
    --key "${SAUCE_ACCESS_KEY}" \
    -i "${TRAVIS_JOB_NUMBER}" \
    --pidfile /tmp/sauce.pid \
    --readyfile /tmp/tunnel >/dev/null &

# wait for the tunnel to build up
while ! [ -e "/tmp/tunnel" ]; do
    sleep 1
done
