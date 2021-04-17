FROM golang:1.15.7 AS base

ENV PORT 8000

RUN apt-get update
RUN apt-get install -y gzip

COPY . /app
WORKDIR /app

RUN make build


FROM python:3.8-buster AS dist

COPY --from=base /app/app.out /

RUN pip install youtube_dl

CMD PORT=${PORT} ./app.out