#!/bin/bash
#
# Quick bootstrap script for an Ubuntu Lucid host
#
# This allows you to bootstrap any Lucid box (VM, physical hardware, etc)
# using Puppet and automatically install a full Etherpad environment on it.
#

apt-get install git-core puppet rsync

GIT_REPO_URL="git://github.com/rhelmer/etherpad.git"

mkdir /puppet

# Clone the project from github
useradd etherpad
su - etherpad
mkdir dev
cd dev
git clone $GIT_REPO_URL etherpad

# copy the files from the git checkout to /puppet
rsync -a ./etherpad/puppet/ /puppet/
exit

# Let puppet take it from here...
puppet /home/etherpad/dev/puppet/manifests/*.pp

