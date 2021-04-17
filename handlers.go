package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/url"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/gocolly/colly"
	"github.com/gosimple/slug"
	"github.com/patrickmn/go-cache"
)

var c *cache.Cache

func init() {
	c = cache.New(5*time.Minute, 10*time.Minute)
}

type spotifySongData struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Artist string `json:"artist"`
}

type youtubeSongData struct {
	ID         string `json:"id"`
	Uploader   string `json:"uploader"`
	UploaderID string `json:"uploader_id"`

	Title string `json:"title"`

	Thumbnail string `json:"thumbnail"`

	Thumbnails []struct {
		ID     string `json:"id"`
		URL    string `json:"url"`
		Width  int    `json:"width"`
		Height int    `json:"height"`
	} `json:"thumbnails"`

	Description string   `json:"description"`
	Categories  []string `json:"categories"`
	Tags        []string `json:"tags"`

	Formats []struct {
		ID     string `json:"format_id"`
		URL    string `json:"url"`
		Ext    string `json:"ext"`
		ACodec string `json:"acodec"`
	} `json:"formats"`
}

func SpotifyHandler(w http.ResponseWriter, r *http.Request) {
	playlistID := r.URL.Query().Get("playlist")
	if playlistID == "" {
		playlistID = "1cwq7qqLZAyOb60rhzSiRb"
	}
	cacheKey := "spotify - " + playlistID

	if songs, found := c.Get(cacheKey); found {
		json.NewEncoder(w).Encode(map[string]interface{}{"results": songs})
		return
	}

	songs := []spotifySongData{}

	collector := colly.NewCollector()
	collector.OnHTML(".tracklist-row > .tracklist-col.name > .track-name-wrapper", func(e *colly.HTMLElement) {
		children := e.DOM.Children()

		songContainer := children.First()
		artistContainer := children.Last().Children().First()
		albumContainer := children.Last().Children().Last()

		songName := songContainer.Text()
		artistName := artistContainer.Text()
		albumLink, _ := albumContainer.Attr("href")

		songs = append(songs, spotifySongData{
			albumLink + "-" + slug.Make(songName) + "-" + strconv.Itoa(len(songs)),
			songName,
			artistName,
		})
	})
	err := collector.Visit("https://open.spotify.com/playlist/" + playlistID)
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
	cacheKey := "youtube - " + query

	if song, found := c.Get(cacheKey); found {
		json.NewEncoder(w).Encode(map[string]interface{}{"results": song})
		return
	}

	cmdData := exec.Command("youtube-dl", "--default-search", "ytsearch1:", "--skip-download", "--dump-json", "-4", query)
	var out bytes.Buffer
	cmdData.Stdout = &out
	err := cmdData.Run()
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	stdout := out.String()
	results := strings.Split(stdout, "\n")
	if len(results) == 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{"results": []string{}})
	}

	results = results[0 : len(results)-1]

	var songs []youtubeSongData
	for _, item := range results {
		var song youtubeSongData

		if err = json.Unmarshal([]byte(item), &song); err == nil {
			songs = append(songs, song)
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	song := youtubeSongData{}
	if len(songs) > 0 {
		song = songs[0]
	}

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
	cacheKey := "lyrics - " + query

	if lyrics, found := c.Get(cacheKey); found {
		json.NewEncoder(w).Encode(map[string]interface{}{"results": lyrics})
		return
	}

	lyrics := []string{}

	collector := colly.NewCollector(colly.MaxDepth(1))
	collector.OnHTML("#wrapper > div.wrapper-inner > div.coltwo-wide-2 > div:nth-child(5) > a", func(e *colly.HTMLElement) {
		collector.Visit(e.Attr("href"))
	})
	collector.OnHTML("#songLyricsDiv", func(e *colly.HTMLElement) {
		lyrics = strings.Split(e.DOM.Text(), "\n")
	})

	URL := "http://www.songlyrics.com/index.php?section=search&searchW=" + strings.ReplaceAll(query, " ", "+") + "&submit=Search&searchIn1=artist&searchIn2=album&searchIn3=song&searchIn4=lyrics"
	err := collector.Visit(URL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	c.Set(cacheKey, lyrics, cache.DefaultExpiration)
	json.NewEncoder(w).Encode(map[string]interface{}{"results": lyrics})
}

func IndexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "index.html")
}
