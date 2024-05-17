#!/bin/bash
exec 3>&1 4>&2
trap 'exec 2>&4 1>&3' 0 1 2 3
exec 1>backup_log.out 2>&1

POSTGRES_DOCKER_ID=fd7ebcbdadbf
sudo docker exec -it $POSTGRES_DOCKER_ID sh -c "pg_dump postgres" | aws s3 cp - s3://mtgraterdbbackups/db_backup_$(date +"%FT%H%M").sql