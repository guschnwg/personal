package app

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"regexp"
	"strconv"
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
			Username: "gustavo",
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
	Username string `json:"username"`
}

func LoginOrRegisterHandler(w http.ResponseWriter, r *http.Request) {
	var body createUserBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	db := database.DB()
	user := database.User{Username: body.Username}
	tx := db.FirstOrCreate(&user, "username = ?", body.Username)

	json.NewEncoder(w).Encode(map[string]interface{}{"results": user, "error": tx.Error})
}

func CreateUserHandler(w http.ResponseWriter, r *http.Request) {
	var body createUserBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	db := database.DB()
	user := database.User{
		Username: body.Username,
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

type client struct {
	User database.User
	c    *websocket.Conn
}

func (c *client) listenToMessage(handler *websocketHandler) {
	for {
		mt, message, err := c.c.ReadMessage()
		if err != nil {
			continue
		}

		re := regexp.MustCompile(`\[(.+)\] (.+)`)
		subMatch := re.FindSubmatch(message)
		if subMatch == nil {
			handler.broadcastToAll(message)
			continue
		}

		userID, _ := strconv.Atoi(string(subMatch[1]))
		handler.sendToClient(userID, subMatch[2], mt)
	}
}

type websocketHandler struct {
	clients []*client
}

func (handler *websocketHandler) addClient(c *client) {
	handler.clients = append(handler.clients, c)

	// When disconnecting, remove me from the clients list
	c.c.SetCloseHandler(func(code int, text string) error {
		handler.removeClient(c)
		handler.broadcastClientLeft(c)
		return nil
	})
}

func (handler *websocketHandler) removeClient(c *client) {
	remainingClients := []*client{}
	for _, client := range handler.clients {
		if client.User.ID != c.User.ID {
			remainingClients = append(remainingClients, client)
		}
	}
	handler.clients = remainingClients
}

func (handler *websocketHandler) broadcastClientJoined(new *client) {
	msg := []byte(fmt.Sprintf("[JOINED]: %v %v", new.User.ID, new.User.Username))
	for _, client := range handler.clients {
		if client.User.ID != new.User.ID {
			client.c.WriteMessage(websocket.TextMessage, msg)
		}
	}
}

func (handler *websocketHandler) broadcastClientLeft(left *client) {
	msg := []byte(fmt.Sprintf("LEFT: %v", left.User.ID))
	for _, client := range handler.clients {
		client.c.WriteMessage(websocket.TextMessage, msg)
	}
}

func (handler *websocketHandler) broadcastEveryoneHere() {
	everyoneIDs := []int{}
	for _, client := range handler.clients {
		everyoneIDs = append(everyoneIDs, client.User.ID)
	}

	for _, client := range handler.clients {
		client.c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("HERE: %v", everyoneIDs)))
	}
}

func (handler *websocketHandler) broadcastToAll(message []byte) {
	for _, client := range handler.clients {
		client.c.WriteMessage(websocket.TextMessage, message)
	}
}

func (handler *websocketHandler) sendToClient(userID int, message []byte, mt int) {
	for _, client := range handler.clients {
		if client.User.ID == userID {
			client.c.WriteMessage(mt, message)
		}
	}
}

func BindWebSocket(r *mux.Router) {
	upgrader := websocket.Upgrader{}
	handler := &websocketHandler{[]*client{}}

	r.HandleFunc("/websocket", func(w http.ResponseWriter, r *http.Request) {
		id, _ := strconv.Atoi(r.URL.Query().Get("user_id"))

		db := database.DB()
		user := database.User{}
		db.First(&user, "id = ?", id)

		c, _ := upgrader.Upgrade(w, r, nil)
		defer c.Close()

		cli := &client{user, c}

		handler.addClient(cli)
		handler.broadcastClientJoined(cli)
		handler.broadcastEveryoneHere()

		cli.listenToMessage(handler)
	})

	r.HandleFunc("/websocket/{id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id, _ := strconv.Atoi(vars["id"])

		handler.sendToClient(id, []byte("HELLO"), websocket.TextMessage)

		json.NewEncoder(w).Encode(map[string]interface{}{"results": true})
	})
}

func PingHandler(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{"results": "PONG"})
}
