import './style';

import { Router } from 'preact-router';

import Spotify from './components/spotify';

export default () => {
    return (
        <Router>
            <Spotify path="/" />

            <Spotify path="/spotify" />
        </Router>
    )
};
