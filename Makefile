build:
	go build -o ./app.out main.go handlers.go

run:
	go run main.go handlers.go

docker_build:
	docker build -t go-app .
docker_run:
	docker run -p 8000:8000 --env PORT=8000 --name go-app -it --rm go-app
