PORT=8000

run:
	GO111MODULE=on \
	CompileDaemon \
		-polling \
		-verbose \
		-build="go build -o ./main cmd/app/main.go" \
		-exclude-dir=.git \
		-exclude-dir=web/front \
		-exclude-dir=app/web/front \
		-command="./main"
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

docker-dev:
	docker compose build
	PORT=$(PORT) DATABASE_URL=$(shell heroku config:get DATABASE_URL -a guznrdni-personal) \
		docker compose up
