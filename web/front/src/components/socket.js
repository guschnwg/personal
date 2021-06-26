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

      socket._close = socket.close;
      socket.close = () => {
        socket.dispatchEvent(new Event("shutdown"));
        socket._close();
      }

      window.addEventListener("beforeunload", () => {
        socket.close();
      });

      return () => {
        if (socket) {
          socket.close();
        }
      }
    }
  }, [socket])

  return { socket, connected, loading }
}

export function useVideoSyncerSocket(socket, user) {
  const [video, setVideo] = useState()

  useEffect(() => {
    if (socket && video && user) {
      socket.addEventListener("message", message => {
        const msg = JSON.parse(message.data);

        if (msg.type === "video" && msg.from && msg.from.id !== user.id) {
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
  }, [socket, video, user])

  const bindVideo = (video) => setVideo(video);

  return { bindVideo };
}

export function usePlayerSyncerSocket(socket, user) {
  const [player, setPlayer] = useState();

  const _emit = (action, player) => {
    console.log("Emitting... " + action)
    socket.send(
      JSON.stringify({
        type: "game",
        data: {
          action,
          player: player ? {
            movementStack: player.movementStack,
            x: player.x,
            y: player.y,
            frameGroup: player.frameGroup,
            texture: player.texture.textureCacheIds,
          } : null,
        }
      })
    );
  }

  useEffect(() => {
    if (socket) {
      socket.addEventListener("shutdown", () => _emit("left"));
    }
  }, [socket])

  const bindPlayer = (player) => {
    setPlayer(player);
    _emit("joined", player);
  };
  const emitPlayer = (player) => {
    _emit("move", player);
  };

  return { bindPlayer, emitPlayer };
}

export function useAppSyncerSocket(socket, user) {
  const [app, setApp] = useState();

  useEffect(() => {
    if (socket && app && user) {
      socket.addEventListener("message", message => {
        const msg = JSON.parse(message.data);

        if (msg.type === "game" && msg.from && msg.from.id !== user.id) {
          if (msg.data.action === "move") {
            console.log("Player moved");
          } else if (msg.data.action === "joined") {
            console.log("Player joined");
          } else if (msg.data.action === "left") {
            console.log("Player left");
          }
        }
      });
    }
  }, [socket, app, user])

  const bindApp = (app) => setApp(app);

  return { bindApp };
}

export default useSocket