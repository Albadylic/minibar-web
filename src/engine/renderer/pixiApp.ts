// MBW-11: PixiJS Application setup — fixed logical resolution, mounted to React canvas ref
import { Application } from 'pixi.js'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/barLayout'

class PixiAppManager {
  app: Application | null = null

  async init(canvas: HTMLCanvasElement): Promise<void> {
    if (this.app) this.destroy()

    const app = new Application()
    await app.init({
      canvas,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 0x1a0c00,
      antialias: false,
      // Disable auto-ticker — our game loop drives rendering manually
      autoStart: false,
    })
    this.app = app
  }

  // Called by the game loop render step
  render(): void {
    if (!this.app) return
    this.app.renderer.render(this.app.stage)
  }

  destroy(): void {
    this.app?.destroy(false) // false = don't destroy the canvas element
    this.app = null
  }

  get isReady(): boolean {
    return this.app !== null
  }
}

export const pixiApp = new PixiAppManager()
