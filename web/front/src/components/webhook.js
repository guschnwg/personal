import { useEffect, useState } from 'preact/hooks'

function LoginOrRegister({ onUser }) {
    const handleSubmit = async (event) => {
        event.preventDefault();

        const res = await fetch("/api/users/login_or_register", {
            method: "POST",
            body: JSON.stringify(Object.fromEntries(new FormData(event.target)))
        })
        const data = await res.json()

        onUser(data.results);
    }

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label for="username">username</label>
                <input id="username" name="username" />
            </div>

            <button>Login or register</button>
        </form>
    )
}

function Chat({ user }) {
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState();
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState();

    useEffect(() => {
        const client = new WebSocket('ws://' + window.location.host + '/websocket?user_id=' + user.id);

        client.onopen = () => {
            setLoading(false);
            setConnected(true);

            client.send(JSON.stringify(user))
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
                        <input value={message} onInput={event => setMessage(event.target.value)} />
                        <button onClick={() => {
                            client.send(message)
                            setMessage("")
                        }}>Send</button>
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

function Webhook() {
    const [user, setUser] = useState();

    if (!user) {
        return <LoginOrRegister onUser={setUser} />
    }

    return <Chat user={user} />
}

export default Webhook;