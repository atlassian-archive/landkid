FROM node:18.14.2-alpine@sha256:0d2712ac2b2c1149391173de670406f6e3dbdb1b2ba44e8530647e623e0e1b17

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
