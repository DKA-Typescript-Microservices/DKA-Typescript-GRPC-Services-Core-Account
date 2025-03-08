REPOSITORY_NAME=yovanggaanandhika/services
TAG_NAME=grpc-core-account

# default
# For Development
dev: clean proto
	docker compose up -d
# Compile Dockerfile to image load
docker-local: clean proto
	# Remove container local if exists
	docker buildx build -t ${REPOSITORY_NAME}:${TAG_NAME} --load .

pull:
	docker pull ${REPOSITORY_NAME}:${TAG_NAME}

publish:
	docker buildx build --progress=plain --platform linux/amd64,linux/386 -t ${REPOSITORY_NAME}:${TAG_NAME} --push .

#Generated Proto
proto:
	@rm -rf src/model/proto/*.ts
	@protoc --plugin="protoc-gen-ts=$(which protoc-gen-ts)" \
	--ts_proto_opt=rpc=true,binary=true,metadata=true,addGrpcMetadata=true \
	--proto_path=src/model/proto \
	--ts_proto_out=src/model/proto \
	 $(shell find src/model/proto -name "*.proto")

# clean Dist Folder
clean:
	rm -rf dist