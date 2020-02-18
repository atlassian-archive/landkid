#!/bin/bash

trap "kill 0" exit

ngrok http 3000 --host-header=\"localhost:3000\" --subdomain landkid-dev &
docker-compose up &
yarn dev &

yarn test
