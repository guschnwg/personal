import React, { useEffect, useState } from 'react';
import io from "socket.io-client";
import './App.css';

const socket = io();

function App() {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    socket.on('reply', console.log);
  }, []);

  return (
    <div className="App">
      <button
        onClick={() => socket.emit('notice', Date.now().toString())}
      >
        EMIT
      </button>
    </div>
  );
}

export default App;
