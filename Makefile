build:
	GO111MODULE=on go build -o ./app.out cmd/app/main.go
run:
	GO111MODULE=on watchrun go run cmd/app/main.go
run-local:
	GO111MODULE=on PORT=8000 DATABASE_URL=$(shell heroku config:get DATABASE_URL -a guznrdni-personal) watchrun go run cmd/app/main.go

front-build:
	cd web/front && npm run build
front-run:
	cd web/front && npm run dev


docker-build:
	docker build --tag go-app .
docker-run:
	docker run \
		-p 8000:8000 \
		--env PORT=8000 \
		--env DATABASE_URL=$(shell heroku config:get DATABASE_URL -a guznrdni-personal) \
		--name go-app \
		-it \
		--rm \
		go-app

docker-dev:
	docker compose build

	PORT=8000 DATABASE_URL=$(shell heroku config:get DATABASE_URL -a guznrdni-personal) \
		docker compose up
