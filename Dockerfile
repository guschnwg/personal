FROM golang:1.15.7 AS base

ENV PORT 8000
ENV DATABASE_URL ""

COPY . /app
WORKDIR /app

RUN make build

FROM python:3.8-buster AS dist

COPY --from=base /app/app.out /
COPY --from=base /app/web/ /web/

RUN pip install youtube_dl

CMD PORT=${PORT} DATABASE_URL=${DATABASE_URL} ./app.out