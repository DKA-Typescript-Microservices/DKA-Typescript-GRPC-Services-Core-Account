FROM yovanggaanandhika/node:latest
# Maintainer
LABEL maintainer="Yovangga Anandhika <dka.tech.dev@gmail.com>"
RUN apk add --no-cache protobuf-dev
# Copy Source
COPY . .
# yarn install
RUN yarn install && yarn run build && yarn cache clean && rm -rf /root/.cache/yarn && rm -rf node_modules/.cache
# remove src folder, Remove config json,
RUN rm -rf src javascript-obfuscator.json nest-cli.json tsconfig** .npmrc .yarnrc.yml