FROM node:18.16-alpine@sha256:67cb6aae3415f1a5106579aa1400b18368860f922d55fcac589f6c2af104bad5

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
