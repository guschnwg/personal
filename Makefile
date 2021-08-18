PORT=8000

push-env:
	@while read key_value; do \
		heroku config:set $$key_value -a guznrdni-personal; \
	done < .env

build:
	GO111MODULE=on go build -o ./main cmd/app/main.go


# If you run into issues with file watchers, disable use gRPC... in docker preferences
docker-dev-heroku:
	PORT=$(PORT) DATABASE_URL=$(shell heroku config:get DATABASE_URL -a guznrdni-personal) \
		docker compose up back front

docker-dev:
	PORT=$(PORT) DATABASE_URL=postgresql://unicorn_user:magical_password@host.docker.internal:5432/rainbow_database \
		docker compose up back front database
