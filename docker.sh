TAG="latest"

if [ ! -z "$2" ]
then
   TAG="$2"
fi

case "$1" in

"init")
    docker create --name etherpad-db-data postgres:9.5 /bin/true
;;

"build")
    docker build --rm -t open/etherpad-server .
;;

"run")
    docker stop etherpad-server
    docker rm etherpad-server
    docker run --name etherpad-server -d -p 9001:9001 -e NODE_ENV=production --link etherpad-db-server:postgres open/etherpad-server:$TAG
;;

"enter")
    docker exec -i -t etherpad-server /bin/bash
;;

"db")
    docker stop etherpad-db-server
    docker rm etherpad-db-server
    docker run --name etherpad-db-server -d --volumes-from etherpad-db-data -v /var/lib/postgresql/data postgres:9.5
;;

"migrate")
    docker exec etherpad-server npm run migrate
;;

"backup")
    docker run --rm --volumes-from etherpad-db-data -v $(pwd)/backups:/backups busybox tar cvf /backups/backup_$(date +"%Y-%m-%dT%H-%M-%S").tar /var/lib/postgresql/data
;;

"restore")
    BACKUP_FILE="$2"

    if [ -z "$2" ]
    then
       BACKUP_FILE="$(ls -t backups | head -n 1)"
       echo "Backup file: $BACKUP_FILE"
    fi
    docker stop etherpad-db-server
    docker run --rm --volumes-from etherpad-db-data -v $(pwd)/backups:/backups busybox tar xvf /backups/$BACKUP_FILE
    docker start etherpad-db-server
;;

"clear")
    docker rmi $(docker images | grep "^<none>" | awk '{print $3}')
;;

esac