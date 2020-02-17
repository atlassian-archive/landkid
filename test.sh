#!/bin/bash

trap "kill 0" exit

ngrok http 3000 --host-header=\"localhost:3000\" --subdomain landkid-dev > /dev/null 2>&1 &
docker-compose up > /dev/null 2>&1 &
yarn dev > /dev/null 2>&1 &

yarn test
