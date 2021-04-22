package main

import (
	"strings"

	"github.com/gocolly/colly"
)

func fetchLyrics(query string) (lyrics []string, err error) {
	collector := colly.NewCollector(colly.MaxDepth(1))
	collector.OnHTML("#wrapper > div.wrapper-inner > div.coltwo-wide-2 > div:nth-child(5) > a", func(e *colly.HTMLElement) {
		collector.Visit(e.Attr("href"))
	})
	collector.OnHTML("#songLyricsDiv", func(e *colly.HTMLElement) {
		lyrics = strings.Split(e.DOM.Text(), "\n")
	})

	URL := "http://www.songlyrics.com/index.php?section=search&searchW=" + strings.ReplaceAll(query, " ", "+") + "&submit=Search&searchIn1=artist&searchIn2=album&searchIn3=song&searchIn4=lyrics"
	err = collector.Visit(URL)

	return
}
