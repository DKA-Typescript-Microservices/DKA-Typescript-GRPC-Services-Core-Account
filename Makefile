REPOSITORY_NAME=dka/services
TAG_NAME=core-account
# default
# For Development
dev: clean proto
	docker compose up -d
# Compile Dockerfile to image load
load: clean proto
	docker buildx build -t ${REPOSITORY_NAME}:${TAG_NAME} --load .
#Generated Proto
proto:
	@protoc --plugin="protoc-gen-ts=$(which protoc-gen-ts)" --ts_proto_opt=rpc=true,binary=true,metadata=true,addGrpcMetadata=true --proto_path=src/model/proto/account --ts_proto_out=src/model/proto/account src/model/proto/**/*.proto
# clean Dist Folder
clean:
	rm -rf dist