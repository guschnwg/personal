import { useEffect, useRef, useState } from 'preact/hooks'

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const useSocket = (user) => {
    const [socket, setSocket] = useState()
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const client = new WebSocket(
            window.location.protocol.replace('http', 'ws') +
            '//' +
            window.location.host +
            '/websocket?user_id=' +
            user.id
        );

        client.onopen = () => {
            setLoading(false);
            setConnected(true);
        };

        client.onmessage = (message) => {
            // 
        };

        client.onerror = (err) => {
            setLoading(false);
            setConnected(false);
        }

        setSocket(client);

        return () => {
            client.close();
        }
    }, [])

    return { socket, connected, loading }
}

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
                <input id="username" name="username" value={makeid(10)} />
            </div>

            <button>Login or register</button>
        </form>
    )
}

function Chat({ user }) {
    const { socket, connected, loading } = useSocket(user);

    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");

    const [here, setHere] = useState([])
    const [to, setTo] = useState("")

    useEffect(() => {
        if (socket) {
            socket.onmessage = (message) => {
                const msg = JSON.parse(message.data);

                if (msg.type === "here") {
                    setHere(msg.data)
                } else if (msg.type === "message") {
                    setMessages(prev => [...prev, msg]);
                }
            };
        }
    }, [socket])

    return (
        <span>
            {loading && <span>Loading...</span>}

            {!loading && (
                connected ? (
                    <div>
                        <span>Connected!</span>

                        <div>
                            <div>
                                <input
                                    type="radio"
                                    id="all"
                                    name="all"
                                    checked={to === ""}
                                    value="all"
                                    onClick={() => setTo("")}
                                />

                                <label for="all">ALL</label>
                            </div>

                            {here && here.length > 0 && (
                                here.map(user => (
                                    <div>
                                        <input
                                            type="radio"
                                            id={user.id}
                                            name={user.id}
                                            checked={to === user.id}
                                            value={user.id}
                                            onClick={() => setTo(user.id)}
                                        />

                                        <label for={user.id}>{user.username}</label>
                                    </div>
                                ))
                            )}
                        </div>

                        <input value={message} onInput={event => setMessage(event.target.value)} />
                        <button
                            onClick={() => {
                                socket.send(
                                    JSON.stringify({
                                        type: "message",
                                        to,
                                        data: message
                                    }
                                ))
                                setMessage("")
                            }}
                        >
                            Send
                        </button>
                    </div>
                ) : (
                    <span>Not connected!</span>
                )
            )}

            {!loading && messages && (
                <ul>
                    {messages.map(m => (
                        <li>
                            {m.from && m.from.username ? `{${m.from.username}}` : "{SYSTEM}"}: {JSON.stringify(m.data, null, 2)}
                        </li>
                    ))}
                </ul>
            )}
        </span>
    );
}

function Video({ user }) {
    const { socket, connected, loading } = useSocket(user);
    const ref = useRef();

    useEffect(() => {
        if (socket && ref && ref.current) {
            socket.onmessage = (message) => {
                const msg = JSON.parse(message.data)

                if (msg.from && msg.from.id !== user.id) {
                    if (msg.type === "video") {
                        if (msg.data.action === "play") {
                            ref.current.externalEvent = true
                            ref.current.currentTime = msg.data.currentTime
                            ref.current.play()
                        } else if (msg.data.action === "pause") {
                            ref.current.externalEvent = true
                            ref.current.currentTime = msg.data.currentTime
                            ref.current.pause()
                        }
                    }
                }
            };

            ref.current.onplay = () => {
                if (ref.current.externalEvent) {
                    ref.current.externalEvent = false
                    return
                }

                socket.send(
                    JSON.stringify({
                        type: "video",
                        data: {
                            action: "play",
                            currentTime: ref.current.currentTime
                        }
                    })
                )
            }

            ref.current.onpause = () => {
                if (ref.current.externalEvent) {
                    ref.current.externalEvent = false
                    return
                }

                socket.send(
                    JSON.stringify({
                        type: "video",
                        data: {
                            action: "pause",
                            currentTime: ref.current.currentTime
                        }
                    })
                )
            }
        }
    }, [socket, ref])

    return (
        <video
            ref={ref}
            controls
        >
            <source
                src="https://www.w3schools.com/html/mov_bbb.mp4"
                type="video/mp4"
            />
        </video>
    )
}

function Webhook({ comp: Comp = Chat }) {
    const [user, setUser] = useState();

    if (!user) {
        return <LoginOrRegister onUser={setUser} />
    }

    return <Comp user={user} />
}

function WebhookPage() {
    const [chatInstances, setChatInstances] = useState([{}]);
    const [videoInstances, setVideoInstances] = useState([{}]);

    return (
        <div style={{ display: "flex" }}>
            <div>
                <div style={{ display: "flex" }}>
                    {chatInstances.map(i => <Webhook />)}
                </div>

                <button onClick={() => setChatInstances(prev => [...prev, {}])}>Add instance</button>
            </div>

            <div>
                <div style={{ display: "flex" }}>
                    {videoInstances.map(i => <Webhook comp={Video} />)}
                </div>

                <button onClick={() => setVideoInstances(prev => [...prev, {}])}>Add instance</button>
            </div>
        </div>
    )
}

export default WebhookPage;