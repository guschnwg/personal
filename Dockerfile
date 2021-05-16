FROM golang:1.15.7 AS base

ENV PORT 8000

COPY . /app
WORKDIR /app

RUN make build

FROM node:12.20.1 AS front

COPY web/front /app
WORKDIR /app

RUN npm run build

FROM python:3.8-buster AS dist

COPY --from=base /app/app.out /
COPY --from=front /app/build/ /web/static/

RUN pip install youtube_dl

CMD PORT=${PORT} ./app.out