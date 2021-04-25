package app

import (
	"sync"

	"github.com/guschnwg/personal/pkg/crawlers"
)

type fullSong struct {
	Youtube crawlers.YoutubeSongData `json:"youtube"`
	Lyrics  []string                 `json:"lyrics"`

	crawlers.SpotifySongData
}

func fetchFull(playlistID string) (data []*fullSong, err error) {
	songs, err := crawlers.FetchSpotifySongs(playlistID)
	if err != nil {
		return
	}

	var wg sync.WaitGroup
	wg.Add(len(songs) * 2)

	for _, s := range songs {
		song := fullSong{crawlers.YoutubeSongData{}, []string{}, s}
		query := song.Title + " - " + song.Artist

		go func() {
			defer wg.Done()

			lyrics, err := crawlers.FetchLyrics(query)
			if err != nil {
				return
			}
			song.Lyrics = lyrics
		}()

		go func() {
			defer wg.Done()

			songs, err := crawlers.FetchYoutubeSongs(query)
			if len(songs) == 0 || err != nil {
				return
			}

			song.Youtube = songs[0]
		}()

		data = append(data, &song)
	}

	wg.Wait()

	return
}
