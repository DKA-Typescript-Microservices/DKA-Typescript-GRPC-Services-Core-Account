REPOSITORY_NAME=dka/services
TAG_NAME=core-account
# default
# For Development
dev: clean proto
	docker compose up -d
# Compile Dockerfile to image load
docker-local: clean proto
	# Remove container local if exists
	docker compose down app
	docker buildx build -t ${REPOSITORY_NAME}:${TAG_NAME} --load .

load-dev:
	docker run -d --network dka-dev --name dka-services-${TAG_NAME}-app -p 443:443 -e DKA_SERVER_SECURE=true -e DKA_MONGO_HOST=dka-services-core-account-mongo ${REPOSITORY_NAME}:${TAG_NAME}

unload-dev:
	docker rm -f dka-services-${TAG_NAME}-app

create-key:
	openssl genpkey \
	-algorithm RSA \
	-out src/config/ssl/server/private.key \
	-pkeyopt rsa_keygen_bits:8192

create-csr:
	openssl req -key src/config/ssl/server/private.key -new -out src/config/ssl/server/server.csr

#Generated Proto
proto:
	@protoc --plugin="protoc-gen-ts=$(which protoc-gen-ts)" --ts_proto_opt=rpc=true,binary=true,metadata=true,addGrpcMetadata=true --proto_path=src/model/proto/account --ts_proto_out=src/model/proto/account src/model/proto/**/*.proto
# clean Dist Folder
clean:
	rm -rf dist