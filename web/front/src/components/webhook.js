import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks'
import useSocket from './socket';
import UserGuard from './user-guard';

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

function WebhookPage() {
  const [chatInstances, setChatInstances] = useState([{}]);
  const [videoInstances, setVideoInstances] = useState([{}]);

  return (
    <div style={{ display: "flex" }}>
      <div>
        <div style={{ display: "flex" }}>
          {chatInstances.map(i => <UserGuard>{user => <Chat user={user} />}</UserGuard>)}
        </div>

        <button onClick={() => setChatInstances(prev => [...prev, {}])}>Add instance</button>
      </div>

      <div>
        <div style={{ display: "flex" }}>
          {videoInstances.map(i => <UserGuard>{user => <Video user={user} />}</UserGuard>)}
        </div>

        <button onClick={() => setVideoInstances(prev => [...prev, {}])}>Add instance</button>
      </div>
    </div>
  )
}

export default WebhookPage;