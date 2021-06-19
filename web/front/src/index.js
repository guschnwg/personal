import './style';

import { render, h } from 'preact';
import { Router } from 'preact-router';

import Home from './components/home';
import Spotify from './components/spotify';
import Audio from './components/audio'
import Webhook from './components/webhook'
import Game from './components/game'

function App() {
    return (
        <Router>
            <Home path="/" />

            <Spotify path="/spotify" />

            <Audio path="/audio" />

            <Webhook path="/webhook" />

            <Game path="/game" />
        </Router>
    )
};

console.log("hey")

render(<App />, document.getElementById('app'));