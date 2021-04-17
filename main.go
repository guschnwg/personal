package main

import (
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/", IndexHandler)
	r.HandleFunc("/spotify", SpotifyHandler)
	r.HandleFunc("/youtube", YoutubeHandler)
	r.HandleFunc("/lyrics", LyricsHandler)

	http.Handle("/", r)
	log.Fatal(http.ListenAndServe(":8000", r))
}
