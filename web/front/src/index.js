import './style';

import { Router } from 'preact-router';

import Home from './components/home';
import Spotify from './components/spotify';
import Audio from './components/audio'

export default () => {
    return (
        <Router>
            <Home path="/" />

            <Spotify path="/spotify" />

            <Audio path="/audio" />
        </Router>
    )
};
