import { useEffect } from 'preact/hooks'

const client = new WebSocket('ws://localhost:8000/websocket');

function Webhook() {
    useEffect(() => {
        client.onopen = () => {
            console.log('WebSocket Client Connected');
            client.send("HI");
        };
        client.onmessage = (message) => {
            console.log(message);
        };
        client.onerror = console.error
    }, [])

    return (
        <span>
            HI!

            <a
                href="https://github.com/mdn/webaudio-examples/blob/master/audio-analyser/index.html"
                target="_blank"
            >
                Check this link
            </a>
        </span>
    );
}

export default Webhook;