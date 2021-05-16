import { h } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import htm from 'htm';

const html = htm.bind(h);

window.USE_PROXY = true;
window.USE_CACHE = true;
window.EMOJIS = [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸',
    '🐵', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴',
    '🦄', '🐝', '🐛', '🦋', '🐌', '🐞'
];

function fetchAll(id = '') {
    return fetch('/api/full?playlist=' + id + (window.USE_CACHE ? '' : '&no_cache=1')).then(res => res.json())
}

function fetchSpotifyPlaylist(id = '') {
    return fetch('/api/spotify?playlist=' + id + (window.USE_CACHE ? '' : '&no_cache=1')).then(res => res.json())
}

function fetchYoutubeSong(artist = '', title = '') {
    return fetch('/api/youtube?artist=' + artist + '&title=' + title + (window.USE_CACHE ? '' : '&no_cache=1')).then(res => res.json())
}

function fetchLyrics(artist = '', title = '') {
    return fetch('/api/lyrics?artist=' + artist + '&title=' + title + (window.USE_CACHE ? '' : '&no_cache=1')).then(res => res.json())
}

function Video({ url, thumbnail, isPlaying, isPaused, onStart, onPause, onEnd }) {
    const video = useRef();

    useEffect(() => {
        if (!video.current) return;

        video.current.onended = onEnd;
        video.current.onplay = onStart;
        video.current.onpaused = onPause;

        if (isPaused) {
            video.current.pause();
        } else {
            if (isPlaying) {
                video.current.play();
            } else {
                video.current.pause();
                video.current.currentTime = 0;
            }
        }
    }, [isPaused, isPlaying, video.current]);

    return html`
        <video
            ref=${video}
            width="320"
            height="240"
            controls
            poster="${thumbnail}"
        >
            ${url && html`
                <source
                    src="${url}"
                    type="video/mp4"
                />
            `}
        </video>
    `
}

function Song({ song, isPlaying, isPaused, onStart, onPause, onEnd }) {
    const [viewLyrics, setViewLyrics] = useState(false);

    let url = "";
    if (song.youtube && song.youtube.formats) {
        url = new URL(song.youtube.formats[song.youtube.formats.length - 1].url);

        if (window.USE_PROXY) {
            url.search += "&host=" + url.host;
            url.host = window.location.host;
            url.protocol = window.location.protocol;
        }
    }

    return html`
        <div class="song">
            <div class="video-container">
                <${Video}
                    url="${url}"
                    thumbnail="${song.youtube ? song.youtube.thumbnail : ""}"
                    isPlaying="${isPlaying}"
                    isPaused="${isPaused}"
                    onStart="${onStart}"
                    onPause="${onPause}"
                    onEnd="${onEnd}"
                />
            </div>


            <div class="song-details">
                <h3>${song.artist} - ${song.title}</h3>

                ${song.lyrics && html`
                    <div class="song-lyrics" >
                        ${viewLyrics && song.lyrics.map(phrase => html`<span>${phrase}</span>`)}

                        <button
                            class="view-lyrics outline small"
                            onClick="${() => setViewLyrics(v => !v)}"
                        >
                            ${viewLyrics ? "Hide" : "Show"} Lyrics
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
}

function Current({ song, isPaused, onPlay, onPause, onPrev, onNext }) {
    return html`
        <div class="current">
            <button class="outline" onClick="${onPrev}">⏮</button>
            <div class="song-playing">
                <button onClick="${isPaused ? onPlay : onPause}">⏯</button>

                <div class="info">
                    <span class="title">${song.title}</span>
                    <span class="artist">${song.artist}</span>
                </div>
            </div>
            <button class="outline" onClick="${onNext}">⏭</button>
        </div>
    `;
}

function Loading() {
    const [emojis, setEmojis] = useState([window.EMOJIS[0], window.EMOJIS[13]]);

    useEffect(() => {
        let indexOne = 0;
        let indexTwo = 13;

        const interval = setInterval(() => {
            indexOne = (indexOne + 1) % window.EMOJIS.length;
            indexTwo = (indexTwo + 1) % window.EMOJIS.length;

            setEmojis([window.EMOJIS[indexOne], window.EMOJIS[indexTwo]]);
        }, 100);

        return () => {
            clearInterval(interval);
        }
    }, [])

    return html`
        <div class="loading">
            <span class="emoji">${emojis[0]}</span> Loading the most amazing stuff ever... <span class="emoji">${emojis[1]}</span>
        </div>
    `
}

function App() {
    const [loading, setLoading] = useState(false);
    const [playlistURL, setPlaylistURL] = useState('https://open.spotify.com/playlist/5sUXSWQyDifhDrXJ65vVMA');
    const [songs, setSongs] = useState([]);
    const [playing, setPlaying] = useState();
    const [paused, setPaused] = useState(false);
    const [autoplay, setAutoplay] = useState(false);

    const fetchPlaylist = () => {
        let playlistID = '';

        try {
            const url = new URL(playlistURL);
            playlistID = url.pathname.split('/').reverse()[0];
        } catch { }

        setLoading(true);
        fetchAll(playlistID).then(data => {
            const newSongs = data.results;
            setSongs(newSongs);
            if (autoplay) {
                setPlaying(newSongs.length > 0 ? newSongs[0].id : undefined);
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    const handlePrev = (currentIndex) => {
        const nextIndex = currentIndex === 0 ? songs.length - 1 : currentIndex - 1;
        setPlaying(songs[nextIndex].id);
    }

    const handleNext = (currentIndex) => {
        const nextIndex = currentIndex + 1 >= songs.length ? 0 : currentIndex + 1;
        setPlaying(songs[nextIndex].id);
    }

    return html`
        <div class="container">
            <div class="filter">
                <input
                    placeholder="https://open.spotify.com/playlist/5sUXSWQyDifhDrXJ65vVMA"
                    value="${playlistURL}"
                    onInput="${event => setPlaylistURL(event.target.value)}"
                />

                <div class="checkbox-container">
                    <input
                        type="checkbox"
                        id="autoplay"
                        name="autoplay"
                        checked="${autoplay}"
                        onChange="${() => setAutoplay(v => !v)}"
                    />
                    <label for="autoplay">Autoplay?</label>
                </div>

                <button onClick="${fetchPlaylist}">SEARCH</button>
            </div>

            ${loading && html`<${Loading} />`}

            <div class="songs">
                ${songs.map((song, index) => {
                    const isPlaying = playing === song.id;

                    return html`
                        <${Song}
                            key="${song.id}"
                            song="${song}"
                            isPlaying="${isPlaying}"
                            isPaused="${paused}"
                            onPause="${() => setPaused(true)}"
                            onStart="${() => {
                                setPlaying(song.id);
                                setPaused(false);
                            }}"
                            onEnd="${() => handleNext(index)}"
                        />
                    `;
                })}
            </div>

            ${playing && (
                html`
                    <${Current}
                        song="${songs.find(s => s.id === playing)}"
                        isPaused="${paused}"
                        onPlay="${() => setPaused(false)}"
                        onPause="${() => setPaused(true)}"
                        onPrev="${() => handlePrev(songs.findIndex(s => s.id === playing))}"
                        onNext="${() => handleNext(songs.findIndex(s => s.id === playing))}"
                    />
                `
            )}
            </div>
        `;
}

export default App;

function titlePlay() {
    let index = 0;
    const originalTitle = document.title;

    return () => {
        index = (index + 1) % EMOJIS.length;
        document.title = `${originalTitle} ${EMOJIS[index]}`;
    }
}
setInterval(titlePlay(), 500);