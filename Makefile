

default:
	yarn run build
	docker compose up -d app --force-recreate
all:
	docker compose down
	docker compose up -d

proto:
	@protoc --plugin="protoc-gen-ts=$(which protoc-gen-ts)" --ts_proto_opt=rpc=true,binary=true,metadata=true --proto_path=src/model/proto/account --ts_proto_out=src/model/proto/account src/model/proto/**/*.proto