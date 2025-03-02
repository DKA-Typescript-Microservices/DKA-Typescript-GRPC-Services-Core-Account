FROM yovanggaanandhika/mongo:12-slim-mongo-node-8.0.5
# Maintainer
LABEL maintainer="Yovangga Anandhika <dka.tech.dev@gmail.com>"
RUN apt update && apt install -y protobuf-compiler
# Copy Source
COPY . .
# yarn install
RUN yarn install && yarn run build && yarn cache clean && rm -rf /root/.cache/yarn && rm -rf node_modules/.cache
# remove src folder, Remove config json,
RUN rm -rf src javascript-obfuscator.json nest-cli.json tsconfig** .npmrc .yarnrc.yml