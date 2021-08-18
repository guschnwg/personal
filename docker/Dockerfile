FROM golang:1.16.4 AS base

ENV PORT 8000

COPY . /app
WORKDIR /app

RUN make build

FROM node:14.17.0 AS front

COPY web /app
WORKDIR /app

RUN yarn install
RUN yarn build

FROM python:3.8-buster AS dist

COPY --from=base /app/main /
COPY --from=front /app/build/ /web/build/

RUN pip install youtube_dl

CMD PORT=${PORT} ./main