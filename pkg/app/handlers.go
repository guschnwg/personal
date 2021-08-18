package app

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"time"

	socketio "github.com/googollee/go-socket.io"
	"github.com/googollee/go-socket.io/engineio"
	"github.com/googollee/go-socket.io/engineio/transport"
	"github.com/googollee/go-socket.io/engineio/transport/polling"
	"github.com/googollee/go-socket.io/engineio/transport/websocket"
	"github.com/gorilla/mux"
	"github.com/guschnwg/personal/pkg/crawlers"
	"github.com/guschnwg/personal/pkg/database"
	"github.com/patrickmn/go-cache"
	twilio "github.com/twilio/twilio-go"
	openapi "github.com/twilio/twilio-go/rest/api/v2010"
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
	query := r.URL.Query().Get("id")

	artist := r.URL.Query().Get("artist")
	if artist == "" {
		artist = "Oliver Schories"
	}

	title := r.URL.Query().Get("title")
	if title == "" {
		title = "One More Dance, Jules"
	}

	if query == "" {
		query = url.QueryEscape(artist + " - " + title)
	}

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

func SendTwilioSms(w http.ResponseWriter, r *http.Request) {
	client := twilio.NewRestClient(os.Getenv("TWILIO_ACCOUNT_SID"), os.Getenv("TWILIO_AUTH_TOKEN"))

	params := &openapi.CreateMessageParams{}
	params.SetTo(os.Getenv("TO_PHONE_NUMBER"))
	params.SetFrom(os.Getenv("TWILIO_PHONE_NUMBER"))
	params.SetBody("Hello from Golang!")

	_, err := client.ApiV2010.CreateMessage(params)
	if err != nil {
		fmt.Println(err.Error())
	} else {
		fmt.Println("SMS sent successfully!")
	}
}

func SendTwilioCall(w http.ResponseWriter, r *http.Request) {
	client := twilio.NewRestClient(os.Getenv("TWILIO_ACCOUNT_SID"), os.Getenv("TWILIO_AUTH_TOKEN"))

	params := &openapi.CreateCallParams{}
	params.SetTo(os.Getenv("TO_PHONE_NUMBER"))
	params.SetFrom(os.Getenv("TWILIO_PHONE_NUMBER"))
	params.SetUrl("https://demo.twilio.com/docs/voice.xml")
	params.SetStatusCallbackEvent([]string{"initiated", "answered"})

	_, err := client.ApiV2010.CreateCall(params)
	if err != nil {
		fmt.Println(err.Error())
	} else {
		fmt.Println("SMS sent successfully!")
	}
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

func BindSocketIo(r *mux.Router) {
	allowOriginFunc := func(r *http.Request) bool {
		return true
	}

	server := socketio.NewServer(&engineio.Options{
		Transports: []transport.Transport{
			&polling.Transport{
				CheckOrigin: allowOriginFunc,
			},
			&websocket.Transport{
				CheckOrigin: allowOriginFunc,
			},
		},
	})

	server.OnConnect("/", func(s socketio.Conn) error {
		s.SetContext("")
		fmt.Println("connected:", s.ID())
		return nil
	})

	server.OnEvent("/", "notice", func(s socketio.Conn, msg string) {
		fmt.Println("notice:", msg)
		s.Emit("reply", "have "+msg)
	})

	server.OnEvent("/chat", "msg", func(s socketio.Conn, msg string) string {
		s.SetContext(msg)
		return "recv " + msg
	})

	server.OnEvent("/", "bye", func(s socketio.Conn) string {
		last := s.Context().(string)
		s.Emit("bye", last)
		s.Close()
		return last
	})

	server.OnError("/", func(s socketio.Conn, e error) {
		fmt.Println("meet error:", e)
	})

	server.OnDisconnect("/", func(s socketio.Conn, reason string) {
		fmt.Println("closed", reason)
	})

	go func() {
		if err := server.Serve(); err != nil {
			fmt.Printf("socketio listen error: %s\n", err)
		}
	}()
	defer server.Close()

	r.Handle("/socket.io/", server)
}

func PingHandler(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{"results": "PONG"})
}
