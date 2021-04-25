build:
	go build -o ./app.out cmd/app/main.go

run:
	PORT=8000 gow run -v cmd/app/main.go pkg/*

docker_build:
	docker build -t go-app .
docker_run:
	docker run -p 8000:8000 --env PORT=8000 --name go-app -it --rm go-app
