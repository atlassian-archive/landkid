FROM node:carbon
WORKDIR /usr/src/app
COPY package.json yarn.lock .babelrc index.js server.js ./
COPY src ./src
RUN yarn install --pure-lockfile
EXPOSE 8000
CMD [ "yarn", "start" ]
