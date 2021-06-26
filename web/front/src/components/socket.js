import { useEffect, useState } from 'preact/hooks'

function newSocket(userId) {
  const protocol = window.location.protocol.replace('http', 'ws');
  const host = window.location.host;
  return new WebSocket(`${protocol}//${host}/websocket?user_id=${userId}`)
}

function useSocket(user) {
  const [socket] = useState(newSocket(user.id));
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (socket) {
      socket.onopen = () => {
        setLoading(false);
        setConnected(true);
      };
  
      socket.onerror = (err) => {
        setLoading(false);
        setConnected(false);
      }
    }

    return () => {
      if (socket) {
        socket.close();
      }
    }
  }, [socket])

  return { socket, connected, loading }
}

export function useVideoSyncerSocket(socket, user) {
  const [video, setVideo] = useState()

  useEffect(() => {
    if (socket && video) {
      socket.addEventListener("message", message => {
        const msg = JSON.parse(message.data);

        if (msg.from && msg.from.id !== user.id) {
          if (msg.type === "video") {
            if (msg.data.action === "play") {
              video.externalEvent = true
              video.currentTime = msg.data.currentTime
              video.play()
            } else if (msg.data.action === "pause") {
              video.externalEvent = true
              video.currentTime = msg.data.currentTime
              video.pause()
            }
          }
        }
      });

      video.onplay = () => {
        if (video.externalEvent) {
          video.externalEvent = false
          return
        }

        socket.send(
          JSON.stringify({
            type: "video",
            data: {
              action: "play",
              currentTime: video.currentTime
            }
          })
        )
      }

      video.onpause = () => {
        if (video.externalEvent) {
          video.externalEvent = false
          return
        }

        socket.send(
          JSON.stringify({
            type: "video",
            data: {
              action: "pause",
              currentTime: video.currentTime
            }
          })
        )
      }
    }
  }, [socket, video])

  const bindVideo = (video) => setVideo(video);

  return bindVideo
}

export default useSocket