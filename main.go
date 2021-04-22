package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
)

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/", IndexHandler)
	r.HandleFunc("/spotify", SpotifyHandler)
	r.HandleFunc("/youtube", YoutubeHandler)
	r.HandleFunc("/lyrics", LyricsHandler)
	r.HandleFunc("/full", FullHandler)

	BindProxy(r)
	http.Handle("/", r)

	port := os.Getenv("PORT")
	log.Fatal(http.ListenAndServe(":"+port, r))
}
