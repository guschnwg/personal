HEROKU_DATABASE_URL = $(shell heroku config:get DATABASE_URL -a guznrdni-personal)

build:
	go build -o ./app.out cmd/app/main.go
run:
	PORT=8000 DATABASE_URL=$(HEROKU_DATABASE_URL) gow run -v cmd/app/main.go pkg/*


front-build:
	cd web/front && npm run build
front-run:
	cd web/front && npm run dev


docker-build:
	docker build -t go-app .
docker-run:
	docker run \
	-p 8000:8000 \
	--env PORT=8000 \
	--env DATABASE_URL=$(HEROKU_DATABASE_URL) \
	--name go-app \
	-it \
	--rm \
	go-app
