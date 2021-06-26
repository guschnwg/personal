PORT=8000

build:
	GO111MODULE=on go build -o ./main cmd/app/main.go
run:
	GO111MODULE=on gowatch -p cmd/app/main.go -o main
run-local:
	make PORT=8000 DATABASE_URL=$(shell heroku config:get DATABASE_URL -a guznrdni-personal) run

front-build:
	cd web/front && npm run build
front-run:
	cd web/front && npm run dev


docker-build:
	docker build --tag go-app .
docker-run:
	docker run \
		-p $(PORT):$(PORT) \
		--env PORT=$(PORT) \
		--env DATABASE_URL=$(shell heroku config:get DATABASE_URL -a guznrdni-personal) \
		--name go-app \
		-it \
		--rm \
		go-app

# If you run into issues with file watchers, disable use gRPC... in docker preferences
docker-dev:
	PORT=$(PORT) DATABASE_URL=$(shell heroku config:get DATABASE_URL -a guznrdni-personal) \
		docker compose up back front

docker-dev-local:
	PORT=$(PORT) DATABASE_URL=postgresql://unicorn_user:magical_password@host.docker.internal:5432/rainbow_database \
		docker compose up back front database
