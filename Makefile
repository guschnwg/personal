HEROKU_DATABASE_URL = $(shell heroku config:get DATABASE_URL -a guznrdni-personal)

build:
	go build -o ./app.out cmd/app/main.go

run:
	PORT=8000 DATABASE_URL=$(HEROKU_DATABASE_URL) gow run -v cmd/app/main.go pkg/*

docker_build:
	docker compose build
docker_run:
	docker compose run \
		-e DATABASE_URL=$(HEROKU_DATABASE_URL) \
		web
