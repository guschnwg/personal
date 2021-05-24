import './style';

import { Router } from 'preact-router';

import Spotify from './components/spotify';
import Audio from './components/audio'

export default () => {
    return (
        <Router>
            <Spotify path="/" />

            <Spotify path="/spotify" />

            <Audio path="/audio" />
        </Router>
    )
};
