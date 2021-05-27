FROM golang:1.15.7 AS base

ENV PORT 8000

COPY . /app
WORKDIR /app

RUN make build

FROM node:14.17.0 AS front

COPY web/front /app
WORKDIR /app

RUN npm install
RUN npm run build

FROM python:3.8-buster AS dist

COPY --from=base /app/main /
COPY --from=front /app/build/ /web/static/

RUN pip install youtube_dl

CMD PORT=${PORT} ./main