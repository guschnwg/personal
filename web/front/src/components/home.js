import { h } from 'preact';

function Home() {
    return (
        <span>
            HI!

            <ul>
                <li><a href="/spotify">Spotify</a></li>
                <li><a href="/audio">Audio</a></li>
                <li><a href="/webhook">WebHook</a></li>
                <li><a href="/game">Game</a></li>
            </ul>
        </span>
    );
}

export default Home;