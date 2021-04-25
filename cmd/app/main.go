package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"

	"github.com/guschnwg/personal/pkg/app"
)

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/", app.IndexHandler)
	r.HandleFunc("/spotify", app.SpotifyHandler)
	r.HandleFunc("/youtube", app.YoutubeHandler)
	r.HandleFunc("/lyrics", app.LyricsHandler)
	r.HandleFunc("/full", app.FullHandler)

	app.BindProxy(r)

	r.PathPrefix("/static/").Handler(app.StaticHandler())

	http.Handle("/", r)

	port := os.Getenv("PORT")
	log.Fatal(http.ListenAndServe(":"+port, r))
}
