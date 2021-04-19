package main

import (
	"strconv"

	"github.com/gocolly/colly"
	"github.com/gosimple/slug"
)

type spotifySongData struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Artist string `json:"artist"`
}

func fetchSpotifySongs(playlistID string) ([]spotifySongData, error) {
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

	return songs, err
}
