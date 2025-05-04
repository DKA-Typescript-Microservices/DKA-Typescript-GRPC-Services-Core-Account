REPOSITORY_NAME=yovanggaanandhika/microservices-core-account
TAG_NAME=latest


# build dist folder
build: clean
	yarn run build

# clean Dist Folder
clean:
	rm -rf dist

# docker command
pull:
	docker pull ${REPOSITORY_NAME}:${TAG_NAME}

publish:
	docker buildx build --progress=plain --platform linux/amd64,linux/386 -t ${REPOSITORY_NAME}:${TAG_NAME} --push .