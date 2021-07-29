import { h } from 'preact';
import Perspective from 'perspectivejs';
import { useEffect, useRef, useState } from 'preact/hooks'
import * as PIXI from "pixi.js"
import { Viewport } from 'pixi-viewport'
import Keyboard from "pixi.js-keyboard"
import EventEmitter from 'events';
import UserGuard from './user-guard';
import Bump from '../utils/bump'
import useSocket, { useVideoSyncerSocket, usePlayerSyncerSocket, useOtherPlayersSyncerSocket } from './socket';

const bump = new Bump(PIXI);

const FRAMES = {
  up: {
    stand: [
      new PIXI.Rectangle(0, 20, 16, 20),
    ],
    walk: [
      new PIXI.Rectangle(16, 20, 16, 20),
      new PIXI.Rectangle(16, 20, 16, 20),
      new PIXI.Rectangle(16, 20, 16, 20),
      new PIXI.Rectangle(32, 20, 16, 20),
      new PIXI.Rectangle(48, 20, 16, 20),
      new PIXI.Rectangle(48, 20, 16, 20),
      new PIXI.Rectangle(48, 20, 16, 20),
      new PIXI.Rectangle(32, 20, 16, 20),
    ]
  },

  down: {
    stand: [
      new PIXI.Rectangle(0, 0, 16, 20),
    ],
    walk: [
      new PIXI.Rectangle(16, 0, 16, 20),
      new PIXI.Rectangle(16, 0, 16, 20),
      new PIXI.Rectangle(16, 0, 16, 20),
      new PIXI.Rectangle(32, 0, 16, 20),
      new PIXI.Rectangle(48, 0, 16, 20),
      new PIXI.Rectangle(48, 0, 16, 20),
      new PIXI.Rectangle(48, 0, 16, 20),
      new PIXI.Rectangle(32, 0, 16, 20),
    ]
  },

  left: {
    stand: [
      new PIXI.Rectangle(0, 40, 16, 20),
    ],
    walk: [
      new PIXI.Rectangle(16, 40, 16, 20),
      new PIXI.Rectangle(16, 40, 16, 20),
      new PIXI.Rectangle(16, 40, 16, 20),
      new PIXI.Rectangle(32, 40, 16, 20),
      new PIXI.Rectangle(48, 40, 16, 20),
      new PIXI.Rectangle(48, 40, 16, 20),
      new PIXI.Rectangle(48, 40, 16, 20),
      new PIXI.Rectangle(32, 40, 16, 20),
    ]
  },

  right: {
    stand: [
      new PIXI.Rectangle(0, 60, 16, 20),
    ],
    walk: [
      new PIXI.Rectangle(16, 60, 16, 20),
      new PIXI.Rectangle(16, 60, 16, 20),
      new PIXI.Rectangle(16, 60, 16, 20),
      new PIXI.Rectangle(32, 60, 16, 20),
      new PIXI.Rectangle(48, 60, 16, 20),
      new PIXI.Rectangle(48, 60, 16, 20),
      new PIXI.Rectangle(48, 60, 16, 20),
      new PIXI.Rectangle(32, 60, 16, 20),
    ]
  }
}
const ASSETS = [
  {
    texture: PIXI.Texture.from("front/assets/game/version_2.0_isaiah658s_pixel_pack_2/Characters/Character 1.png"),
    frames: FRAMES,
  },

  {
    texture: PIXI.Texture.from("front/assets/game/version_2.0_isaiah658s_pixel_pack_2/Characters/Character 2.png"),
    frames: FRAMES,
  },
  {
    texture: PIXI.Texture.from("front/assets/game/version_2.0_isaiah658s_pixel_pack_2/Characters/Character 3.png"),
    frames: FRAMES,
  },
  {
    texture: PIXI.Texture.from("front/assets/game/version_2.0_isaiah658s_pixel_pack_2/Characters/Character 4.png"),
    frames: FRAMES,
  },
  {
    texture: PIXI.Texture.from("front/assets/game/version_2.0_isaiah658s_pixel_pack_2/Characters/Character 5.png"),
    frames: FRAMES,
  },
  {
    texture: PIXI.Texture.from("front/assets/game/version_2.0_isaiah658s_pixel_pack_2/Characters/Character 6.png"),
    frames: FRAMES,
  },
]

const PLAYER_ASSET = ASSETS[0];
const BOT_ASSETS = [ASSETS[1], ASSETS[2], ASSETS[3], ASSETS[4], ASSETS[5]];

function doesRectangleCollideWithRectangles(rectangle, collidables = []) {
  if (collidables.length === 0) {
    return false;
  }

  for (const collidable of collidables) {
    if (bump.hitTestRectangle(rectangle, collidable)) {
      return true
    }
  }

  return false;
}

class Sprite extends PIXI.Sprite {
  gameLoop(delta) { }
}

class Player extends Sprite {
  constructor(id, asset) {
    super(asset.texture);

    this.id = id;
    this.asset = asset;

    this.movements = {
      ArrowLeft: {
        position: () => ({ x: this.position.x - 1, y: this.position.y }),
        frameGroup: this.asset.frames.left,
      },
      ArrowRight: {
        position: () => ({ x: this.position.x + 1, y: this.position.y }),
        frameGroup: this.asset.frames.right,
      },
      ArrowUp: {
        position: () => ({ x: this.position.x, y: this.position.y - 1 }),
        frameGroup: this.asset.frames.up,
      },
      ArrowDown: {
        position: () => ({ x: this.position.x, y: this.position.y + 1 }),
        frameGroup: this.asset.frames.down,
      },
    };
    this.possibleMovements = Object.keys(this.movements);
    this.movementStack = [];
    this.frameGroup = this.asset.frames.down;
    this.events = new EventEmitter();

    this.texture.frame = this.frameGroup.stand[0];

    this.zIndex = 99999999;

    this.isCollidable = true;
  }

  gameLoop(delta, collidables = []) {
    const wasMoving = this.movementStack.length > 0;

    this.possibleMovements.forEach(key => {
      if (Keyboard.isKeyPressed(key)) {
        this.movementStack.push(key);
      }
      if (Keyboard.isKeyReleased(key)) {
        this.movementStack = this.movementStack.filter(m => m !== key);
      }
    })

    if (this.movementStack.length > 0) {
      const action = this.movements[this.movementStack[this.movementStack.length - 1]];

      this.frameGroup = action.frameGroup;

      this.texture.frame = this.frameGroup.walk[Math.floor(Date.now() / 75) % this.frameGroup.walk.length];

      const newPosition = action.position();
      const bounds = new PIXI.Rectangle(newPosition.x, newPosition.y, this.width, this.height);
      if (!doesRectangleCollideWithRectangles(bounds, collidables)) {
        this.position = newPosition;
      }

      this.events.emit('move');
    } else {
      this.texture.frame = this.frameGroup.stand[Math.floor(Date.now() / 75) % this.frameGroup.stand.length];

      if (wasMoving) {
        this.events.emit('stop');
      }
    }
  }
}

class OtherPlayer extends Sprite {
  constructor(id, asset) {
    super(asset.texture.clone());
  
    this.asset = asset;

    this.id = id;
    this.isCollidable = true;
  }

  gameLoop(delta) {
    this.texture.frame = this.textureFrame;
  }
}

class Bot extends Sprite {
  constructor(asset) {
    super(asset.texture.clone());

    this.asset = asset;

    this.frameGroup = asset.frames.down;

    this.vx = 0;
    this.vy = 0;

    this.lastNumber = 0;

    this.texture.frame = this.frameGroup.stand[0];

    this.isCollidable = true;
  }

  gameLoop(delta, collidables = []) {
    const number = Math.floor(Date.now() / 1000);
    if (number !== this.lastNumber) {
      this.lastNumber = number;
      this.vx = this.vy = 0;

      const random = Math.floor(Math.random() * 4);
      if (random === 3) {
        this.vx = 1;
        this.frameGroup = this.asset.frames.right;
      } else if (random === 2) {
        this.vx = -1;
        this.frameGroup = this.asset.frames.left;
      } else if (random === 1) {
        this.vy = -1;
        this.frameGroup = this.asset.frames.up;
      } else if (random === 0) {
        this.vy = 1;
        this.frameGroup = this.asset.frames.down;
      }
    }

    if (this.vx !== 0 || this.vy !== 0) {
      this.texture.frame = this.frameGroup.walk[Math.floor(Date.now() / 75) % this.frameGroup.walk.length];

      const newPosition = {
        x: this.position.x + this.vx,
        y: this.position.y + this.vy,
      }

      const bounds = new PIXI.Rectangle(newPosition.x, newPosition.y, this.width, this.height);
      if (!doesRectangleCollideWithRectangles(bounds, collidables)) {
        this.position = newPosition;
      }
    } else {
      this.texture.frame = this.frameGroup.stand[Math.floor(Date.now() / 75) % this.frameGroup.stand.length];
    }
  }
}

class Video {
  constructor(videoEl, x = 0, y = 0) {
    this.videoEl = videoEl;

    this.canvas = document.createElement("canvas");
    this.img = document.createElement("img");
    this.imageResource = new PIXI.ImageResource(this.img);
    this.sprite = PIXI.Sprite.from(this.imageResource);

    this.sprite.position.x = x;
    this.sprite.position.y = y;

    this.latestRun = 0;

    this.sprite.gameLoop = this.gameLoop.bind(this);
  }

  gameLoop(delta) {
    const now = Date.now()

    if (this.latestRun + 300 < now) {
      this.latestRun = now;

      if (!this.videoEl.paused) {
        const scaleWidth = this.videoEl.videoWidth / this.videoEl.width;
        const scaleHeight = this.videoEl.videoHeight / this.videoEl.height;

        const height = this.videoEl.videoHeight / (scaleWidth > scaleHeight ? scaleWidth : scaleHeight);
        const width = this.videoEl.videoWidth / (scaleWidth > scaleHeight ? scaleWidth : scaleHeight);

        // Pixelize first
        this.canvas.width = width;
        this.canvas.height = height;

        const canvasCtx = this.canvas.getContext('2d');
        canvasCtx.mozImageSmoothingEnabled = false;
        canvasCtx.webkitImageSmoothingEnabled = false;
        canvasCtx.imageSmoothingEnabled = false;

        canvasCtx.drawImage(
          this.videoEl, 0, 0, this.canvas.width * .2, this.canvas.height * .2
        );
        canvasCtx.drawImage(
          this.canvas,
          0, 0, this.canvas.width * .2, this.canvas.height * .2,
          0, 0, width, height
        );

        const image = new Image(this.canvas.width, this.canvas.height);
        image.src = this.canvas.toDataURL();

        image.onload = () => {
          const pers = new Perspective(canvasCtx, image);
          pers.draw([
            [0, 0],
            [image.width, 0],
            [image.width - 50, image.height - 50],
            [50, image.height - 50],
          ]);

          this.img.src = this.canvas.toDataURL();
          this.imageResource.update();
        }
      }
    }
  }
}

class MyGame {
  constructor(view) {
    this.app = new PIXI.Application({ height: 500, width: 500, view });

    this.viewport = new Viewport({
      screenWidth: this.app.screen.width,
      screenHeight: this.app.screen.height,

      interaction: this.app.renderer.plugins.interaction
    });
    this.viewport.scaled = 1.2;
    this.viewport.sortableChildren = true;

    this.app.stage.addChild(this.viewport);

    this.all = [];
    this.player = undefined;

    this.app.ticker.add(delta => {
      this.all.forEach(c => {
        c.gameLoop(delta, this.all.filter(a => a != c && a.isCollidable));
      });

      Keyboard.update();
    })
  }

  addToStage(item) {
    this.viewport.addChild(item);
    this.all.push(item);
  }
  removeFromStage(item) {
    this.viewport.removeChild(item);
    this.all = this.all.filter(c => c !== item);
  }

  addPlayer(id) {
    const player = new Player(id, PLAYER_ASSET);

    this.player = window.player = player;

    const position = this.freePosition(this.player.width, this.player.height);
    this.player.position = position;

    this.addToStage(this.player);
    this.viewport.follow(this.player);

    return player;
  }

  handleOtherPlayer(id, data) {
    let otherPlayer = this.all.find(a => a.id === id);

    if (!otherPlayer) {
      otherPlayer = new OtherPlayer(id, PLAYER_ASSET);

      this.addToStage(otherPlayer);
    }

    for (const key in data) {
      if (key === "texture") {
        continue
      }

      otherPlayer[key] = data[key];
    }

    return otherPlayer;
  }

  removeOtherPlayer(id) {
    this.removeFromStage(this.all.find(a => a.id === id));
  }

  freePosition(width, height) {
    const x = Math.floor(Math.random() * this.app.screen.width);
    const y = Math.floor(Math.random() * this.app.screen.height);

    const possible = new PIXI.Rectangle(x, y, width, height);
    if (doesRectangleCollideWithRectangles(possible, this.all.map(a => new PIXI.Rectangle(a.position.x, a.position.y, a.width, a.height)))) {
      return this.freePosition(width, height);
    }

    return { x: possible.x, y: possible.y };
  }

  addBot() {
    const bot = new Bot(BOT_ASSETS[this.all.length % BOT_ASSETS.length]);

    bot.isBot = true;
    bot.id = Math.random();

    bot.position = this.freePosition(bot.width, bot.height);

    this.addToStage(bot);

    return bot;
  }

  removeBot() {
    const bots = this.all.filter(a => a.isBot);
    if (!bots) {
      return
    }

    this.removeFromStage(bots[Math.floor(Math.random() % bots.length)])
  }

  addVideo(videoEl) {
    const video = new Video(videoEl, 0, 0);

    this.addToStage(video.sprite);
  }
}

function Pixi({ user }) {
  const ref = useRef();
  const videoRef = useRef();
  const [youtubeURL, setYoutubeURL] = useState("https://www.youtube.com/watch?v=pyGKsys_q4U");
  const [videoURL, setVideoURL] = useState("front/assets/videos/mov_bbb.mp4");

  const [game, setGame] = useState();

  const { socket } = useSocket(user);
  const { joinPlayer, movePlayer } = usePlayerSyncerSocket(socket, user);
  const { otherPlayers } = useOtherPlayersSyncerSocket(socket, user);
  const { bindVideo, changeVideo, videoEmitter } = useVideoSyncerSocket(socket, user);

  useEffect(() => {
    if (ref.current && !game && user && videoRef.current) {
      const game = new MyGame(ref.current);

      const player = game.addPlayer(user.id);
      player.events.on("move", () => movePlayer(player));
      player.events.on("stop", () => movePlayer(player));
      joinPlayer(player);

      otherPlayers.on("join", (d) => {
        game.handleOtherPlayer(d.from.id, d.data.player);
        movePlayer(player);
      });
      otherPlayers.on("move", (d) => game.handleOtherPlayer(d.from.id, d.data.player));
      otherPlayers.on("left", (d) => game.removeOtherPlayer(d.from.id));

      const video = game.addVideo(videoRef.current);
      bindVideo(videoRef.current);
      videoEmitter.on("change", setVideoURL)

      for (let i = 0; i < 15; i++) {
        game.addBot();
      }

      setGame(game);
    }
  }, [game, ref.current, videoRef.current]);

  const fetchVideoURL = () => {
    const id = youtubeURL.replace("https://www.youtube.com/watch?v=", "");

    fetch("api/youtube?id=" + id).then(res => res.json()).then(data => {
      if (data && data.results && data.results.formats) {
        const url = new URL(data.results.formats[data.results.formats.length - 1].url);

        if (window.USE_PROXY) {
          url.search += "&host=" + url.host;
          url.host = window.location.host;
          url.protocol = window.location.protocol;
        }

        setVideoURL(url);
        changeVideo(url);
      }
    })
  }

  return (
    <div>
      <div class="canvas-container">
        <canvas ref={ref} />
      </div>

      <div>
        <input value={youtubeURL} onInput={e => setYoutubeURL(e.target.value)} />
        <button onClick={fetchVideoURL}></button>
      </div>

      <video
        ref={videoRef}
        src={videoURL}
        height={240}
        width={320}
        controls
      />
    </div>
  );
}

function Game() {
  return (
    <UserGuard>
      {user => <Pixi user={user} />}
    </UserGuard>
  )
}

export default Game