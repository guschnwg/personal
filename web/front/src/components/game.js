import { h } from 'preact';
import fx from 'glfx';
import { useEffect, useRef, useState } from 'preact/hooks'
import * as PIXI from "pixi.js"
import { Viewport } from 'pixi-viewport'
import Keyboard from "pixi.js-keyboard"
import EventEmitter from 'events';
import UserGuard from './user-guard';
import useSocket, { useVideoSyncerSocket, usePlayerSyncerSocket, useOtherPlayersSyncerSocket } from './socket';

const CAT_TEXTURE = PIXI.Texture.from("front/assets/game/PIPOYA FREE RPG Character Sprites 32x32/Animal/Cat 01-1.png");
const BOT_TEXTURES = [
  PIXI.Texture.from("front/assets/game/PIPOYA FREE RPG Character Sprites 32x32/Animal/Cat 01-2.png"),
  PIXI.Texture.from("front/assets/game/PIPOYA FREE RPG Character Sprites 32x32/Animal/Cat 01-3.png"),
  PIXI.Texture.from("front/assets/game/PIPOYA FREE RPG Character Sprites 32x32/Animal/Dog 01-1.png"),
  PIXI.Texture.from("front/assets/game/PIPOYA FREE RPG Character Sprites 32x32/Animal/Dog 01-2.png"),
  PIXI.Texture.from("front/assets/game/PIPOYA FREE RPG Character Sprites 32x32/Animal/Dog 01-3.png"),
];
const POSITIONS = {
  up: {
    stand: new PIXI.Rectangle(32, 96, 32, 32),
    walk: [
      new PIXI.Rectangle(64, 96, 32, 32),
      new PIXI.Rectangle(0, 96, 32, 32),
    ]
  },

  down: {
    stand: new PIXI.Rectangle(32, 0, 32, 32),
    walk: [
      new PIXI.Rectangle(64, 0, 32, 32),
      new PIXI.Rectangle(0, 0, 32, 32),
    ]
  },

  left: {
    stand: new PIXI.Rectangle(32, 32, 32, 32),
    walk: [
      new PIXI.Rectangle(64, 32, 32, 32),
      new PIXI.Rectangle(0, 32, 32, 32),
    ]
  },

  right: {
    stand: new PIXI.Rectangle(32, 64, 32, 32),
    walk: [
      new PIXI.Rectangle(64, 64, 32, 32),
      new PIXI.Rectangle(0, 64, 32, 32),
    ]
  }
}

class Sprite extends PIXI.Sprite {
  gameLoop(delta) { }
}

class Player extends Sprite {
  constructor(id, texture) {
    super(texture);

    this.id = id;

    this.movements = {
      ArrowLeft: () => {
        this.position.x -= 1;
        this.frameGroup = POSITIONS.left;
      },
      ArrowRight: () => {
        this.position.x += 1;
        this.frameGroup = POSITIONS.right;
      },
      ArrowUp: () => {
        this.position.y -= 1;
        this.frameGroup = POSITIONS.up;
      },
      ArrowDown: () => {
        this.position.y += 1;
        this.frameGroup = POSITIONS.down;
      },
    };
    this.possibleMovements = Object.keys(this.movements);
    this.movementStack = [];
    this.frameGroup = POSITIONS.down;
    this.events = new EventEmitter();

    this.texture.frame = this.frameGroup.stand;

    this.pivot.set(this.width / 2, this.height / 2);

    this.zIndex = 99999999;
    window.player = this;
  }

  gameLoop(delta) {
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
      this.movements[this.movementStack[this.movementStack.length - 1]]();

      this.texture.frame = this.frameGroup.walk[Math.floor(Date.now() / 250) % 2];

      this.events.emit('move');
    } else {
      this.texture.frame = this.frameGroup.stand;

      if (wasMoving) {
        this.events.emit('stop');
      }
    }
  }
}

class OtherPlayer extends Sprite {
  constructor(id, texture) {
    super(texture);
    this.id = id;
  }

  gameLoop(delta) {
    this.texture.frame = this.textureFrame;
  }
}

class Bot extends Sprite {
  constructor(texture) {
    super(texture);

    this.frameGroup = POSITIONS.down;

    this.vx = 0;
    this.vy = 0;

    this.lastNumber = 0;
  }

  gameLoop(delta) {
    const number = Math.floor(Date.now() / 1000);
    if (number !== this.lastNumber) {
      this.lastNumber = number;
      this.vx = this.vy = 0;

      const random = Math.floor(Math.random() * 4);
      if (random === 3) {
        this.vx = 1;
        this.frameGroup = POSITIONS.right;
      } else if (random === 2) {
        this.vx = -1;
        this.frameGroup = POSITIONS.left;
      } else if (random === 1) {
        this.vy = -1;
        this.frameGroup = POSITIONS.up;
      } else if (random === 0) {
        this.vy = 1;
        this.frameGroup = POSITIONS.down;
      }
    }

    if (this.vx !== 0 || this.vy !== 0) {
      this.x += this.vx;
      this.y += this.vy;
      this.texture.frame = this.frameGroup.walk[Math.floor(Date.now() / 250) % 2];
    } else {
      this.texture.frame = this.frameGroup.stand;
    }
  }
}

class Video {
  constructor(videoEl, x = 0, y = 0) {
    this.videoEl = videoEl;

    this.canvas = fx.canvas();
    this.img = document.createElement("img");
    this.imageResource = new PIXI.ImageResource(this.img);
    this.sprite = PIXI.Sprite.from(this.imageResource);

    window.canvas = this.canvas;

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
        this.canvas.width = this.videoEl.videoWidth;
        this.canvas.height = this.videoEl.videoHeight;

        // const canvasCtx = this.canvas.getContext('2d');
        // canvasCtx.mozImageSmoothingEnabled = false;
        // canvasCtx.webkitImageSmoothingEnabled = false;
        // canvasCtx.imageSmoothingEnabled = false;

        // canvasCtx.drawImage(
        //   this.videoEl, 0, 0, this.canvas.width * .2, this.canvas.height * .2
        // );
        // canvasCtx.drawImage(
        //   this.canvas,
        //   0, 0, this.canvas.width * .2, this.canvas.height * .2,
        //   0, 0, this.canvas.width, this.canvas.height
        // );

        const texture = this.canvas.texture(this.videoEl);
        this.canvas.draw(texture).perspective(
          [0, 0, 0, this.videoEl.videoHeight, this.videoEl.videoWidth, this.videoEl.videoHeight, this.videoEl.videoWidth, 0],
          [0, 0, 50, this.videoEl.videoHeight - 50, this.videoEl.videoWidth - 50, this.videoEl.videoHeight - 50, this.videoEl.videoWidth, 0]
        ).update();

        this.img.src = canvas.toDataURL();
        this.imageResource.update();
      }
    }
  }
}

class MyGame {
  constructor(view) {
    this.app = new PIXI.Application({ height: 500, width: 500, view });
    window.app = this.app;

    this.viewport = new Viewport({
      screenWidth: this.app.screen.width,
      screenHeight: this.app.screen.height,

      worldWidth: 1000,
      worldHeight: 1000,

      interaction: this.app.renderer.plugins.interaction
    });
    this.viewport.fit();
    this.viewport.scaled = 1;
    this.viewport.pivot.set(
      this.viewport.screenWidth / 2 * -1,
      this.viewport.screenHeight / 2 * -1
    );
    this.viewport.sortableChildren = true;

    window.viewport = this.viewport;

    this.app.stage.addChild(this.viewport);

    this.all = [];
    this.player = undefined;

    this.app.ticker.add(delta => {
      if (this.player) {
        this.player.gameLoop(delta);
        this.viewport.moveCenter(
          this.player.position.x + this.viewport.worldWidth / 4,
          this.player.position.y + this.viewport.worldHeight / 4,
        );
      }

      this.all.forEach(c => c.gameLoop(delta));

      Keyboard.update();
    })
  }

  addCharacter(char) {
    this.viewport.addChild(char);
    this.all.push(char);
  }
  removeCharacter(char) {
    this.viewport.removeChild(char);
    this.all = this.all.filter(c => c !== char);
  }

  addPlayer(id) {
    const player = new Player(id, CAT_TEXTURE);

    this.player = player;
    this.viewport.addChild(this.player);

    return player;
  }

  handleOtherPlayer(id, data) {
    let otherPlayer = this.all.find(a => a.id === id);

    if (!otherPlayer) {
      otherPlayer = new OtherPlayer(id, CAT_TEXTURE.clone());

      this.addCharacter(otherPlayer);
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
    this.removeCharacter(this.all.find(a => a.id === id));
  }

  addBot(
    id,
    x = Math.floor(Math.random() * this.app.screen.width),
    y = Math.floor(Math.random() * this.app.screen.height)
  ) {
    const bot = new Bot(BOT_TEXTURES[this.all.length % BOT_TEXTURES.length].clone());

    bot.isBot = true;
    bot.id = id;
    bot.position.x = x;
    bot.position.y = y;

    this.addCharacter(bot);

    return bot;
  }

  removeBot() {
    const bots = this.all.filter(a => a.isBot);
    if (!bots) {
      return
    }

    this.removeCharacter(bots[Math.floor(Math.random() % bots.length)])
  }

  addVideo(videoEl) {
    const video = new Video(videoEl, 0, 0);

    this.addCharacter(video.sprite);
  }
}

function Pixi({ user }) {
  const ref = useRef();
  const videoRef = useRef();
  const [youtubeURL, setYoutubeURL] = useState("https://www.youtube.com/watch?v=pyGKsys_q4U");
  const [videoURL, setVideoURL] = useState("front/assets/videos/mov_bbb.mp4");

  const [game, setGame] = useState();

  const { socket } = useSocket(user);
  const { bindPlayer, emitPlayer } = usePlayerSyncerSocket(socket, user);
  const { otherPlayers } = useOtherPlayersSyncerSocket(socket, user);
  const { bindVideo } = useVideoSyncerSocket(socket, user);

  useEffect(() => {
    if (ref.current && !game && user && videoRef.current) {
      const game = new MyGame(ref.current);

      const player = game.addPlayer(user.id);
      player.events.on("move", () => emitPlayer(player));
      player.events.on("stop", () => emitPlayer(player));
      bindPlayer(player);

      otherPlayers.on("join", (d) => game.handleOtherPlayer(d.from.id, d.data.player));
      otherPlayers.on("move", (d) => game.handleOtherPlayer(d.from.id, d.data.player));
      otherPlayers.on("left", (d) => game.removeOtherPlayer(d.from.id));

      const video = game.addVideo(videoRef.current);
      bindVideo(videoRef.current);

      for (let i = 0; i < 100; i++) {
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
        setTimeout(() => videoRef.current.load(), 100);
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
        height={240}
        width={320}
        controls
      >
        <source
          src={videoURL}
          type="video/mp4"
        />
      </video>
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