#!/usr/bin/env bash

# IMPORTANT
# Protect against misspelling a var and rm -rf /
set -u
set -e

SRC=/tmp/etherpad-deb-src
DIST=/tmp/etherpad-deb-dist
SYSROOT=${SRC}/sysroot
DEBIAN=${SRC}/DEBIAN

rm -rf ${DIST}
mkdir -p ${DIST}/

rm -rf ${SRC}
rsync -a bin/deb-src/ ${SRC}/
mkdir -p ${SYSROOT}/opt/

rsync --exclude '.git' -a . ${SYSROOT}/opt/etherpad/ --delete
mkdir -p ${SYSROOT}/usr/share/doc
cp README.md ${SYSROOT}/usr/share/doc/etherpad
find ${SRC}/ -type d -exec chmod 0755 {} \;
find ${SRC}/ -type f -exec chmod go-w {} \;
chown -R root:root ${SRC}/

let SIZE=$(du -s ${SYSROOT} | sed s'/\s\+.*//')+8
pushd ${SYSROOT}/
tar czf ${DIST}/data.tar.gz [a-z]*
popd
sed s"/SIZE/${SIZE}/" -i ${DEBIAN}/control
pushd ${DEBIAN}
tar czf ${DIST}/control.tar.gz *
popd

pushd ${DIST}/
echo 2.0 > ./debian-binary

find ${DIST}/ -type d -exec chmod 0755 {} \;
find ${DIST}/ -type f -exec chmod go-w {} \;
chown -R root:root ${DIST}/
ar r ${DIST}/etherpad-1.deb debian-binary control.tar.gz data.tar.gz
popd
rsync -a ${DIST}/etherpad-1.deb ./
