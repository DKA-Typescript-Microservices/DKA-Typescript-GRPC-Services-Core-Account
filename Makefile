

default:
	yarn run build
	docker compose up -d app --force-recreate
all:
	docker compose down
	docker compose up -d