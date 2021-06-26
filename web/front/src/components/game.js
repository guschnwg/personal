import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks'
import * as PIXI from "pixi.js"
import Keyboard from "pixi.js-keyboard"
import UserGuard from './user-guard';
import useSocket, { useVideoSyncerSocket } from './socket';

const CAT_TEXTURE = PIXI.Texture.from("front/assets/game/PIPOYA FREE RPG Character Sprites 32x32/Animal/Cat 01-1.png");
const BOT_TEXTURE = CAT_TEXTURE.clone();
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

function Pixi({ user }) {
  const ref = useRef()
  const videoRef = useRef()
  const [app, setApp] = useState()
  const { socket } = useSocket(user)
  const bindVideo = useVideoSyncerSocket(socket, user);

  useEffect(() => {
    if (ref && ref.current && videoRef && videoRef.current) {
      bindVideo(videoRef.current);

      const app = new PIXI.Application({
        width: 500,
        height: 500,
        view: ref.current,
      });

      const cat = new PIXI.Sprite(CAT_TEXTURE);
      cat.movementStack = [];
      cat.frameGroup = POSITIONS.down;
      cat.movements = {
        ArrowLeft: () => { cat.x -= 1; cat.frameGroup = POSITIONS.left; },
        ArrowRight: () => { cat.x += 1; cat.frameGroup = POSITIONS.right; },
        ArrowUp: () => { cat.y -= 1; cat.frameGroup = POSITIONS.up; },
        ArrowDown: () => { cat.y += 1; cat.frameGroup = POSITIONS.down; },
      }
      cat.gameLoop = (delta) => {
        Object.keys(cat.movements).forEach(key => {
          if (Keyboard.isKeyPressed(key)) cat.movementStack.push(key);
          if (Keyboard.isKeyReleased(key)) cat.movementStack = cat.movementStack.filter(m => m !== key);
        })

        if (cat.movementStack.length > 0) {
          cat.movements[cat.movementStack[cat.movementStack.length - 1]]();
          cat.texture.frame = cat.frameGroup.walk[Math.floor(Date.now() / 250) % 2];
        } else {
          cat.texture.frame = cat.frameGroup.stand;
        }
      }

      const bot = new PIXI.Sprite(BOT_TEXTURE);
      bot.frameGroup = POSITIONS.down;
      bot.x = 62;
      bot.y = 62;
      bot.vx = 0;
      bot.vy = 0;
      bot.lastNumber = 0;
      bot.gameLoop = (delta) => {
        const number = Math.floor(Date.now() / 1000);
        if (number !== bot.lastNumber) {
          bot.lastNumber = number;
          bot.vx = bot.vy = 0;

          const random = Math.floor(Math.random() * 4);
          if (random === 3) {
            bot.vx = 1;
            bot.frameGroup = POSITIONS.right;
          } else if (random === 2) {
            bot.vx = -1;
            bot.frameGroup = POSITIONS.left;
          } else if (random === 1) {
            bot.vy = -1;
            bot.frameGroup = POSITIONS.up;
          } else if (random === 0) {
            bot.vy = 1;
            bot.frameGroup = POSITIONS.down;
          }
        }

        if (bot.vx !== 0 || bot.vy !== 0) {
          bot.x += bot.vx;
          bot.y += bot.vy;
          bot.texture.frame = bot.frameGroup.walk[Math.floor(Date.now() / 250) % 2];
        } else {
          bot.texture.frame = bot.frameGroup.stand;
        }
      }

      app.stage.addChild(cat, bot);

      const videoResource = new PIXI.VideoResource(videoRef.current, { autoPlay: false });
      const video = PIXI.Sprite.from(videoResource);
      video.x = 300;
      video.y = 300;
      videoRef.current.addEventListener('play', app.stage.addChild(video));

      //
      let latestRun = 0;
      const canvas = document.createElement("canvas");
      const img = document.createElement("img");
      const imageResource = new PIXI.ImageResource(img);
      const image = PIXI.Sprite.from(imageResource);
      image.x = 30;
      image.y = 200;
      videoRef.current.addEventListener('play', app.stage.addChild(image));
      const test = () => {
        const now = Date.now()

        if (latestRun + 300 < now && app.stage.children.includes(image)) {
          latestRun = now;

          if (!videoRef.current.paused) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;

            const canvasCtx = canvas.getContext('2d');
            canvasCtx.mozImageSmoothingEnabled = false;
            canvasCtx.webkitImageSmoothingEnabled = false;
            canvasCtx.imageSmoothingEnabled = false;

            canvasCtx.drawImage(
              videoRef.current, 0, 0, canvas.width * .2, canvas.height * .2
            );
            canvasCtx.drawImage(
              canvas, 0, 0, canvas.width * .2, canvas.height * .2, 0, 0, canvas.width, canvas.height
            );

            img.src = canvas.toDataURL();
            imageResource.update();
          }

        }
      }
      //

      app.ticker.add(delta => {
        cat.gameLoop(delta);
        bot.gameLoop(delta);

        test();

        Keyboard.update();
      });

      setApp(app);
    }
  }, [ref, videoRef])

  return (
    <div>
      <canvas
        ref={ref}
      />

      <video
        ref={videoRef}
        controls
      >
        <source
          src="front/assets/videos/mov_bbb.mp4"
          type="video/mp4"
        />
      </video>
    </div>
  )
}

function Game() {
  return (
    <UserGuard>
      {user => <Pixi user={user} />}
    </UserGuard>
  )
}

export default Game