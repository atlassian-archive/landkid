#!/bin/bash

function deleteTunnel {
    echo -e "${GREEN}Deleting tunnel and attached hostnames${ENDCOLOUR}"
    rm -f ${CREDFILE}
    atlas slauth curl -a atlastunnel-issuer -e prod -- \
        "https://atlastunnel-issuer.ap-southeast-2.prod.atl-paas.net/delete?tunnel=${TUNNEL_NAME}"
}

# This will clean everything up after the script exits
trap deleteTunnel INT TERM

GREEN="\033[1;32m"
RED="\033[1;31m"
ENDCOLOUR="\033[0m"
BOLD="\033[0;1m"

# Check for required command line args
if [ $# != 2 ]; then
    echo -e "${BOLD}Usage: yarn tunnel <TUNNELNAME> <HOSTNAME>${ENDCOLOUR}"
    exit 1
fi

TUNNEL_NAME="$1"
HOST_NAME="$2"

TMPFILE=$(mktemp -t tmp)
CLOUDFLARED_DIR=$(cd ~/.cloudflared && pwd)

# Generate cloudflared tunnel
echo -e "${GREEN}Creating tunnel: ${BOLD}${TUNNEL_NAME}${ENDCOLOUR}"
atlas slauth curl -a atlastunnel-issuer -e prod -- \
    "https://atlastunnel-issuer.ap-southeast-2.prod.atl-paas.net/generate?tunnel=${TUNNEL_NAME}" \
    > ${TMPFILE}

# Move credentials (provided by generate step) into credentials file
TUNNEL_ID=$(jq -r .TunnelID ${TMPFILE})
CREDFILE="${CLOUDFLARED_DIR}/${TUNNEL_ID}.json"
cp "${TMPFILE}" "${CREDFILE}"
rm -f ${TMPFILE}

echo -e "${GREEN}Created file with tunnel credentials: ${BOLD}${CREDFILE}${ENDCOLOUR}"

# Attach hostname to tunnel
echo -e "${GREEN}Attaching hostname: ${BOLD}${HOST_NAME}${ENDCOLOUR}"
atlas slauth curl -a atlastunnel-issuer -e prod -- \
    "https://atlastunnel-issuer.ap-southeast-2.prod.atl-paas.net/attach?tunnel=${TUNNEL_NAME}&hostname=${HOST_NAME}"

# Generate tunnel config
cp tunnel-config.template.yml ~/.cloudflared/config.yml
sed -i ".backup" "s:<TUNNELID>:${TUNNEL_ID}:gi" ~/.cloudflared/config.yml
sed -i ".backup" "s:<CREDFILE>:${CREDFILE}:gi" ~/.cloudflared/config.yml
sed -i ".backup" "s:<HOSTNAME>:${HOST_NAME}:gi" ~/.cloudflared/config.yml

echo -e "${GREEN}Created tunnel config${ENDCOLOUR}"

cloudflared tunnel --config ~/.cloudflared/config.yml ingress validate
cloudflared tunnel --config ~/.cloudflared/config.yml run ${TUNNEL_ID}
