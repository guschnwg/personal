package app

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/guschnwg/personal/pkg/crawlers"
	"github.com/guschnwg/personal/pkg/database"
	"github.com/patrickmn/go-cache"
	"gopkg.in/guregu/null.v4"
)

var c = cache.New(5*time.Minute, 10*time.Minute)

func SpotifyHandler(w http.ResponseWriter, r *http.Request) {
	playlistID := r.URL.Query().Get("playlist")
	if playlistID == "" {
		playlistID = "1cwq7qqLZAyOb60rhzSiRb"
	}

	useCache := r.URL.Query().Get("no_cache") == ""
	cacheKey := "spotify - " + playlistID
	if songs, found := c.Get(cacheKey); found && useCache {
		json.NewEncoder(w).Encode(map[string]interface{}{"results": songs, "cached": true})
		return
	}

	songs, err := crawlers.FetchSpotifySongs(playlistID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	c.Set(cacheKey, songs, cache.DefaultExpiration)
	json.NewEncoder(w).Encode(map[string]interface{}{"results": songs})
}

func YoutubeHandler(w http.ResponseWriter, r *http.Request) {
	artist := r.URL.Query().Get("artist")
	if artist == "" {
		artist = "Oliver Schories"
	}

	title := r.URL.Query().Get("title")
	if title == "" {
		title = "One More Dance, Jules"
	}
	query := url.QueryEscape(artist + " - " + title)

	useCache := r.URL.Query().Get("no_cache") == ""
	cacheKey := "youtube - " + query
	if song, found := c.Get(cacheKey); found && useCache {
		json.NewEncoder(w).Encode(map[string]interface{}{"results": song, "cached": true})
		return
	}

	songs, err := crawlers.FetchYoutubeSongs(query)

	if len(songs) == 0 || err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	song := crawlers.YoutubeSongData{}
	song = songs[0]

	c.Set(cacheKey, song, cache.DefaultExpiration)
	json.NewEncoder(w).Encode(map[string]interface{}{"results": song})
}

func LyricsHandler(w http.ResponseWriter, r *http.Request) {
	artist := r.URL.Query().Get("artist")
	if artist == "" {
		artist = "Oliver Schories"
	}
	title := r.URL.Query().Get("title")
	if title == "" {
		title = "One More Dance, Jules"
	}
	query := url.QueryEscape(artist + " - " + title)

	useCache := r.URL.Query().Get("no_cache") == ""
	cacheKey := "lyrics - " + query
	if lyrics, found := c.Get(cacheKey); found && useCache {
		json.NewEncoder(w).Encode(map[string]interface{}{"results": lyrics, "cached": true})
		return
	}

	lyrics, err := crawlers.FetchLyrics(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	c.Set(cacheKey, lyrics, cache.DefaultExpiration)
	json.NewEncoder(w).Encode(map[string]interface{}{"results": lyrics})
}

func IndexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "web/front/build/index.html")
}

func FrontHandler() http.Handler {
	return http.StripPrefix("/front/", http.FileServer(http.Dir("./web/front/build")))
}

func StaticHandler() http.Handler {
	return http.StripPrefix("/static/", http.FileServer(http.Dir("./web/static")))
}

func FullHandler(w http.ResponseWriter, r *http.Request) {
	playlistID := r.URL.Query().Get("playlist")
	if playlistID == "" {
		playlistID = "5sUXSWQyDifhDrXJ65vVMA"
	}

	useCache := r.URL.Query().Get("no_cache") == ""
	cacheKey := "full - " + playlistID
	if data, found := c.Get(cacheKey); found && useCache {
		json.NewEncoder(w).Encode(map[string]interface{}{"results": data, "cached": true})
		return
	}

	data, err := fetchFull(playlistID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	c.Set(cacheKey, data, cache.DefaultExpiration)
	json.NewEncoder(w).Encode(map[string]interface{}{"results": data})
}

func DatabaseHandler(w http.ResponseWriter, r *http.Request) {
	db := database.DB()

	users := []database.User{}
	db.Find(&users)

	if len(users) == 0 {
		user := database.User{
			Name:  "Gustavo Zanardini",
			Email: "gustavo.zanardini@email.com",
		}
		db.Create(&user)
		db.Find(&users)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"results": users})
}

func ClearDatabaseHandler(w http.ResponseWriter, r *http.Request) {
	db := database.DB()

	db.Where("1 = 1").Delete(database.User{})

	json.NewEncoder(w).Encode(map[string]interface{}{"results": true})
}

func ToggleActivateUserHandler(w http.ResponseWriter, r *http.Request) {
	db := database.DB()

	user := database.User{}
	db.First(&user)
	user.ActivatedAt = null.NewTime(time.Now(), user.ActivatedAt.IsZero())
	db.Save(&user)

	json.NewEncoder(w).Encode(map[string]interface{}{"results": user})
}

type createUserBody struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func CreateUserHandler(w http.ResponseWriter, r *http.Request) {
	var body createUserBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	db := database.DB()
	user := database.User{
		Name:  body.Name,
		Email: body.Email,
	}
	tx := db.Create(&user)

	json.NewEncoder(w).Encode(map[string]interface{}{"results": user, "error": tx.Error})
}

func BindProxy(r *mux.Router) {
	proxy := &httputil.ReverseProxy{
		Director: func(r *http.Request) {
			originHost := r.URL.Query().Get("host")
			if originHost == "" {
				originHost = "r4---sn-8p8v-bg0sl.googlevideo.com"
			}

			r.Header.Add("X-Forwarded-Host", r.Host)
			r.Header.Add("X-Origin-Host", originHost)
			r.Host = originHost
			r.URL.Host = originHost
			r.URL.Scheme = "https"
		},
		Transport: &http.Transport{
			Dial: (&net.Dialer{
				Timeout: 50 * time.Second,
			}).Dial,
		},
		ModifyResponse: func(r *http.Response) error {
			r.Header.Del("Location") // Otherwise it is redirected to the "correct" googlevideo's host
			return nil
		},
	}

	r.HandleFunc("/videoplayback", func(w http.ResponseWriter, r *http.Request) {
		proxy.ServeHTTP(w, r)
	})
}

func BindWebSocket(r *mux.Router) {
	var upgrader = websocket.Upgrader{}

	handler := func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Print("upgrade:", err)
			return
		}
		defer c.Close()
		for {
			mt, message, err := c.ReadMessage()
			if err != nil {
				log.Println("read:", err)
				break
			}
			log.Printf("recv: %s", message)
			err = c.WriteMessage(mt, message)
			if err != nil {
				log.Println("write:", err)
				break
			}
		}
	}

	r.HandleFunc("/websocket", handler)
}

func PingHandler(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{"results": "PONG"})
}

func WebHookHandler(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{"results": "PONG"})
}
