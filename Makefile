REPOSITORY_NAME=yovanggaanandhika/microservices-core
TAG_NAME=account


# build dist folder
build: clean
	yarn run build

# clean Dist Folder
clean:
	rm -rf dist

run-db:
	docker compose -f compose.prod.yml up -d

clear-db:
	docker compose -f compose.prod.yml down -v

# docker command
pull:
	docker pull ${REPOSITORY_NAME}:${TAG_NAME}

publish:
	docker buildx build --progress=plain --platform linux/amd64,linux/386 -t ${REPOSITORY_NAME}:${TAG_NAME} --push .