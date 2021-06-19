import { h } from 'preact';
import { useEffect, useRef, useState } from "preact/hooks"
import * as PIXI from "pixi.js"

let app = new PIXI.Application();

function Game() {
  const ref = useRef()

  useEffect(() => {
    if (ref && ref.current) {
      ref.current.appendChild(app.view);
    } 
  }, [ref])

  return (
    <div ref={ref} />
  )
}

export default Game