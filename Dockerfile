FROM yovanggaanandhika/node:latest
# Maintainer
LABEL maintainer="Yovangga Anandhika <dka.tech.dev@gmail.com>"
# Copy Source
COPY . .
# yarn install
RUN yarn install && yarn run build
# Remove Source Code
RUN rm -rf src javascript-obfuscator.json nest-cli.json .dockerignore tsconfig**

