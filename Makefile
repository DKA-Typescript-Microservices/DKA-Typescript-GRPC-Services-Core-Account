

proto:
	npx protoc --plugin=protoc-gen-ts=$(which protoc-gen-ts) \
    --ts_out=./src/model \
    --proto_path=./src/proto ./src/proto/*.proto