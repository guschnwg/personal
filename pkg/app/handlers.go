package app

import (
	"encoding/json"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/gorilla/mux"
	"github.com/guschnwg/personal/pkg/crawlers"
	"github.com/patrickmn/go-cache"
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
	http.ServeFile(w, r, "web/index.html")
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
