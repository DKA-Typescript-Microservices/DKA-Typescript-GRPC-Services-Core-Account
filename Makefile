

default:
	yarn run build
	docker compose up -d app --force-recreate
all:
	docker compose down
	docker compose up -d

proto:
	protoc --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
      --ts_proto_out=. ./src/model/proto/info/account.info.gprc.proto