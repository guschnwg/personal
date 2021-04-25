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
	r.HandleFunc("/api/spotify", app.SpotifyHandler)
	r.HandleFunc("/api/youtube", app.YoutubeHandler)
	r.HandleFunc("/api/lyrics", app.LyricsHandler)
	r.HandleFunc("/api/full", app.FullHandler)

	app.BindProxy(r)

	r.PathPrefix("/static/").Handler(app.StaticHandler())

	http.Handle("/", r)

	port := os.Getenv("PORT")
	log.Fatal(http.ListenAndServe(":"+port, r))
}
