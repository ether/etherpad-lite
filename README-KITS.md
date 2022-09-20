## Etherpad Lite for KITS

## Maintenance

### Restore MariaDB backup

```bash
docker compose -f docker-compose-prod.yml -f docker-compose-prod.override.yml --env-file .env.prod exec -T mariadb_prod mysql -u prod_database_user --password=prod_database_user_password -D prod_database_name < path_mysql_dump.sql
```

If you want to create a dump in a new database then you should execute the following command beforehand:

```bash
docker compose -f docker-compose-prod.yml -f docker-compose-prod.override.yml --env-file .env.prod exec -T mariadb_prod mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS prod_database_name; GRANT ALL PRIVILEGES ON prod_database_name.* TO prod_database_user@localhost"
```