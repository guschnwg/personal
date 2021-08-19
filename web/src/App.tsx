import React, { useEffect, useState } from 'react';
import './App.css';

const socket = new WebSocket(window.location.origin.replace("http", "ws") + "/socket");

function App() {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    socket.addEventListener('message', function (event) {
      setMessages(prev => [...prev, event.data]);
    });
  }, []);

  return (
    <div className="App">
      <button onClick={() => socket.send(Date.now().toString())}>
        EMIT
      </button>

      <button onClick={() => socket.send(JSON.stringify({type: "JOIN", room: "ROOM_1"}))}>
        JOIN ROOM
      </button>

      <button onClick={() => socket.send(JSON.stringify({type: "LEAVE", room: "ROOM_1"}))}>
        LEAVE ROOM
      </button>

      <button onClick={() => socket.send(JSON.stringify({type: "ROOM", room: "ROOM_1", data: "ncadjknv"}))}>
        EMIT ROOM
      </button>

      <h4>Messages</h4>
      <ul>
        {messages && messages.map((message, i) => <li key={i}>{message}</li>)}
      </ul>
    </div>
  );
}

export default App;
