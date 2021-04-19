package main

import (
	"bytes"
	"encoding/json"
	"os/exec"
	"strings"
)

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

func fetchYoutubeSongs(query string) (songs []youtubeSongData, err error) {
	cmdData := exec.Command("youtube-dl", "--default-search", "ytsearch1:", "--skip-download", "--dump-json", "-4", query)
	var out bytes.Buffer
	cmdData.Stdout = &out
	err = cmdData.Run()
	if err != nil {
		return songs, err
	}

	stdout := out.String()
	results := strings.Split(stdout, "\n")
	if len(results) == 0 {
		return songs, err
	}

	results = results[0 : len(results)-1]

	for _, item := range results {
		var song youtubeSongData

		if err = json.Unmarshal([]byte(item), &song); err == nil {
			songs = append(songs, song)
		} else {
			return songs, err
		}
	}

	return songs, err
}
