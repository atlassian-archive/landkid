FROM node:18.16.1-alpine@sha256:bf6c61feabc1a1bd565065016abe77fa378500ec75efa67f5b04e5e5c4d447cd

WORKDIR /opt/service

# update all OS dependencies to prevent vuln's
RUN apk update && apk upgrade apk-tools

# Copy PJ, changes should invalidate entire image
COPY package.json yarn.lock /opt/service/

## Install dependencies
RUN yarn --cache-folder ../ycache

# Copy commong typings
COPY typings /opt/service/typings

# Copy TS configs
COPY tsconfig* /opt/service/

# Build backend
COPY src /opt/service/src

# Build Frontend
COPY webpack.*.js README.md /opt/service/

COPY tools /opt/service/tools

# Build
RUN NODE_ENV=production yarn build

# Retain only dependencies
RUN yarn --production --cache-folder ../ycache && rm -rf ../ycache

## Cleanup folders
RUN rm -rf src && rm -rf tools && rm -rf typings

ENV NODE_ENV=production

EXPOSE 8080

ENTRYPOINT ["npm", "run", "start", "--"]
