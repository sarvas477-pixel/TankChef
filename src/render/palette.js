// Colors for terrain materials. Each ground theme defines a topsoil color and seven strata
// colors; every one gets eight shades. The sky theme tints the whole palette (night is dark
// and blue, sunset warm, storms grey), so the same ground reads right under any sky.
import { LAYERS, LOOSE, MATERIALS, SCORCHED, SHADES, STRATA } from '../core/terrain.js';

export const GROUND_THEMES = [
  { name: 'pixel-plains', layers: ['#39ff14', '#7a2cff', '#5420a8', '#35156e', '#ff4fd8', '#24205b', '#00f5ff', '#38276f'], loose: '#7a2cff' },
  { name: 'neon-desert', layers: ['#ffe66d', '#ff7a18', '#e83e8c', '#b3267b', '#ff4fd8', '#7c246c', '#00f5ff', '#d84a8b'], loose: '#ff7a18' },
  { name: 'ice-world', layers: ['#d9ffff', '#00f5ff', '#247ba0', '#13547a', '#7df9ff', '#1b3f70', '#5d6dff', '#243b80'], loose: '#00b8d9' },
  { name: 'ghost-zone', layers: ['#b8ff5c', '#39ff14', '#237a44', '#185b52', '#00f5ff', '#286f8f', '#a34dff', '#47318c'], loose: '#39ff14' },
  { name: 'volcano-stage', layers: ['#ff3864', '#4b123d', '#ff7a18', '#61203f', '#ffe66d', '#29152e', '#ff4fd8', '#4b174c'], loose: '#ff7a18' },
  { name: 'retro-autumn', layers: ['#ff9e00', '#b83b5e', '#f08a5d', '#6a2c70', '#ff4fd8', '#42204a', '#ffe66d', '#7a2cff'], loose: '#f08a5d' },
];

export const SKY_TINTS = {
  day: { mul: [1, 1, 1], add: [0, 0, 0] },
  sunset: { mul: [1.02, 0.84, 0.74], add: [18, 4, 10] },
  night: { mul: [0.42, 0.46, 0.62], add: [0, 2, 14] },
  storm: { mul: [0.62, 0.66, 0.72], add: [4, 6, 10] },
};

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const clampByte = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/** Builds an RGBA palette (as little-endian Uint32 pixels for ImageData) for a ground and sky. */
export function buildPalette(groundIndex, sky) {
  const theme = GROUND_THEMES[groundIndex % GROUND_THEMES.length];
  const tint = SKY_TINTS[sky] ?? SKY_TINTS.day;
  const rgba = new Uint32Array(256);
  const css = new Array(256).fill('rgba(0,0,0,0)');
  const set = (index, [r, g, b]) => {
    const rr = clampByte(r * tint.mul[0] + tint.add[0]);
    const gg = clampByte(g * tint.mul[1] + tint.add[1]);
    const bb = clampByte(b * tint.mul[2] + tint.add[2]);
    rgba[index] = (255 << 24) | (bb << 16) | (gg << 8) | rr;
    css[index] = `rgb(${rr},${gg},${bb})`;
  };
  const shadeFactor = (shade) => 0.8 + shade * 0.05; // 0.8 … 1.15
  for (let layer = 0; layer < LAYERS; layer++) {
    const base = hexToRgb(theme.layers[layer]);
    for (let shade = 0; shade < SHADES; shade++) {
      const f = shadeFactor(shade);
      set(STRATA + layer * SHADES + shade, base.map((c) => c * f));
    }
  }
  for (let shade = 0; shade < SHADES; shade++) {
    const f = shadeFactor(shade);
    set(SCORCHED + shade, [38 * f, 30 * f, 26 * f]);
    set(LOOSE + shade, hexToRgb(theme.loose).map((c) => c * f));
  }
  for (let i = MATERIALS; i < 256; i++) set(i, [80, 70, 60]);
  rgba[0] = 0;
  return { rgba, css };
}
