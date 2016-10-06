# Use Docker's nodejs, which is based on ubuntu
FROM node:latest

# Get Etherpad-lite's dependencies
RUN apt-get update
RUN apt-get install -y gzip git-core curl python libssl-dev pkg-config build-essential supervisor

# Copy codebase
COPY ./ /opt/etherpad

WORKDIR /opt/etherpad

# Install node dependencies
RUN /opt/etherpad/bin/installDeps.sh

# Install plugins
RUN npm install \
    ep_align \
    ep_author_neat \
    ep_comments_page \
    ep_copy_paste_images \
    ep_embedmedia \
    ep_headings2 \
    ep_spellcheck \
    ep_sticky_attributes

# Add conf files
ADD supervisor.conf /etc/supervisor/supervisor.conf

EXPOSE 9001
CMD ["supervisord", "-c", "/etc/supervisor/supervisor.conf", "-n"]