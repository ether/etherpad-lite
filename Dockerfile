FROM node
WORKDIR /app
COPY . /app
RUN chown -R 1000 /app && \
chmod -R u+x /app/bin && \
chgrp -R 0 /app && \
chmod -R g=u /app
EXPOSE 9001
USER 1000
ENTRYPOINT [ "./bin/run.sh" ]