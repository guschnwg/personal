package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"

	"github.com/guschnwg/personal/pkg/app"
	"github.com/guschnwg/personal/pkg/database"
)

func main() {
	db := database.DB()
	database.Migrate(db)

	r := mux.NewRouter()
	r.HandleFunc("/api/spotify", app.SpotifyHandler).Methods("GET")
	r.HandleFunc("/api/youtube", app.YoutubeHandler).Methods("GET")
	r.HandleFunc("/api/lyrics", app.LyricsHandler).Methods("GET")
	r.HandleFunc("/api/full", app.FullHandler).Methods("GET")

	r.HandleFunc("/api/db", app.DatabaseHandler).Methods("GET")
	r.HandleFunc("/api/db/clear", app.ClearDatabaseHandler).Methods("GET")
	r.HandleFunc("/api/db/toggle", app.ToggleActivateUserHandler).Methods("GET")

	r.HandleFunc("/api/users/create", app.CreateUserHandler).Methods("POST")

	r.PathPrefix("/api").HandlerFunc(http.NotFound)

	app.BindProxy(r)
	app.BindWebSocket(r)

	r.PathPrefix("/static/").Handler(app.StaticHandler())

	r.PathPrefix("/front/").Handler(app.FrontHandler())
	r.PathPrefix("/").HandlerFunc(app.IndexHandler)

	port := os.Getenv("PORT")
	log.Println("Listening on port: " + port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
