// The terrain bitmap mirrored into an offscreen canvas. Only the rectangles the simulation
// marked dirty are converted to pixels and uploaded, so explosions and falling dirt stay cheap.
import { HEIGHT, WIDTH } from '../core/constants.js';
import { LOOSE, SCORCHED } from '../core/terrain.js';

// --- Arcade tile look -------------------------------------------------------------------------
// The terrain bitmap stays exactly as the simulation made it; only the pixels uploaded to the
// canvas get an arcade skin: a dark 1px outline wherever ground meets air (surface, cliffs and
// crater walls), a bright 3px grass cap with a dithered fringe, and 16x8 brick tiles below.
const OUTLINE = ((255 << 24) | (0x2e << 16) | (0x08 << 8) | 0x12) >>> 0; // #12082e
const MORTAR = 184; // x/256 brightness for brick seams
const BRICK_LIT = 288; // x/256 brightness for the lit top edge of each brick
const CAP = 330; // x/256 brightness for the grass cap
const FRINGE = 222;

function scale(pixel, f) {
  let r = ((pixel & 255) * f) >> 8;
  let g = (((pixel >> 8) & 255) * f) >> 8;
  let b = (((pixel >> 16) & 255) * f) >> 8;
  if (r > 255) r = 255;
  if (g > 255) g = 255;
  if (b > 255) b = 255;
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** Skin for one terrain pixel at (x, y); `i` is its index in the terrain data. */
function arcadePixel(data, i, x, y, material, base) {
  const above = y > 0 ? data[i - WIDTH] : 0;
  if (above === 0) return OUTLINE;
  if ((x > 0 && data[i - 1] === 0) || (x < WIDTH - 1 && data[i + 1] === 0)) return OUTLINE;
  if (material >= SCORCHED && material < SCORCHED + 8) return base; // burnt ground stays plain
  // Depth below the surface, up to 4.
  let depth = 1;
  while (depth < 4 && y - depth - 1 >= 0 && data[i - (depth + 1) * WIDTH] !== 0) depth++;
  if (depth < 3) return scale(base, CAP);
  if (depth === 3) return scale(base, (x + y) & 1 ? FRINGE : CAP);
  if (material >= LOOSE && material < LOOSE + 8) return base;
  const seam = (y & 7) === 0 || ((x + ((y >> 3) & 1) * 8) & 15) === 0;
  if (seam) return scale(base, MORTAR);
  return (y & 7) === 1 ? scale(base, BRICK_LIT) : base;
}

export function makeCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export class TerrainLayer {
  constructor() {
    this.canvas = makeCanvas(WIDTH, HEIGHT);
    this.ctx = this.canvas.getContext('2d');
    this.image = this.ctx.createImageData(WIDTH, HEIGHT);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.palette = null;
    this.paletteKey = null;
    this.terrain = null;
    this.uploads = 0; // rectangles uploaded (for the debug overlay)
  }

  /** Brings the canvas up to date with the terrain. */
  update(terrain, palette, paletteKey) {
    if (paletteKey !== this.paletteKey || terrain !== this.terrain) {
      this.palette = palette;
      this.paletteKey = paletteKey;
      this.terrain = terrain;
      terrain.fullDirty = true;
    }
    const { pixels, image, ctx } = this;
    const data = terrain.data;
    const colors = this.palette.rgba;
    terrain.consumeDirty((rx, ry, rw, rh) => {
      // The skin looks 1px sideways and 4px upward, so repaint a margin around the change.
      const x = Math.max(0, rx - 1);
      const y = ry;
      const w = Math.min(WIDTH, rx + rw + 1) - x;
      const h = Math.min(HEIGHT, ry + rh + 4) - y;
      for (let row = y; row < y + h; row++) {
        let i = row * WIDTH + x;
        const end = i + w;
        for (let px = x; i < end; i++, px++) {
          const material = data[i];
          pixels[i] = material === 0 ? 0 : arcadePixel(data, i, px, row, material, colors[material]);
        }
      }
      ctx.putImageData(image, 0, 0, x, y, w, h);
      this.uploads++;
    });
  }
}
