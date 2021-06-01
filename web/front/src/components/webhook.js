import { useEffect, useState } from 'preact/hooks'

function Webhook() {
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState();
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const client = new WebSocket('ws://localhost:8000/websocket');

        client.onopen = () => {
            setLoading(false);
            setConnected(true);
        };

        client.onmessage = (message) => {
            setMessages(prev => [...prev, message.data]);
        };

        client.onerror = (err) => {
            setLoading(false);
            setConnected(false);

            console.error(err);
        }

        setClient(client);

        return () => {
            client.close();
        }
    }, [])

    return (
        <span>
            {loading && <span>Loading...</span>}

            {!loading && (
                connected ? (
                    <div>
                        <span>Connected!</span>
                        <button onClick={() => client.send("lalala")}>Send</button>
                    </div>
                ) : (
                    <span>Not connected!</span>
                )
            )}

            {!loading && messages && (
                <ul>
                    {messages.map(m => <li>{m}</li>)}
                </ul>
            )}
        </span>
    );
}

export default Webhook;