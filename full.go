package main

import (
	"sync"
)

type fullSong struct {
	Youtube youtubeSongData `json:"youtube"`
	Lyrics  []string        `json:"lyrics"`

	spotifySongData
}

func fetchFull(playlistID string) (data []*fullSong, err error) {
	songs, err := fetchSpotifySongs(playlistID)
	if err != nil {
		return
	}

	var wg sync.WaitGroup
	wg.Add(len(songs) * 2)

	for _, s := range songs {
		song := fullSong{youtubeSongData{}, []string{}, s}
		query := song.Title + " - " + song.Artist

		go func() {
			defer wg.Done()

			lyrics, err := fetchLyrics(query)
			if err != nil {
				return
			}
			song.Lyrics = lyrics
		}()

		go func() {
			defer wg.Done()

			songs, err := fetchYoutubeSongs(query)
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
