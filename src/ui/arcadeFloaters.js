// Floating arcade references for the title screen: pixel sprites and score popups that drift
// behind the menu. Pure decoration: built once from tiny character grids, no assets, no input.
const SPRITES = {
  invader: {
    colors: { '#': '#5dffb3' },
    rows: ['..#.....#..', '...#...#...', '..#######..', '.##.###.##.', '###########', '#.#######.#', '#.#.....#.#', '...##.##...'],
  },
  coin: {
    colors: { o: '#c46a00', y: '#ffe66d', h: '#ffffff' },
    rows: ['..oooo..', '.oyyhyo.', 'oyyhyyyo', 'oyyhyyyo', 'oyyhyyyo', 'oyyyyyyo', '.oyyyyo.', '..oooo..'],
  },
  heart: {
    colors: { r: '#ff3864', w: '#ffd0dc' },
    rows: ['.rrr.rrr.', 'rwrrrrrrr', 'rwrrrrrrr', 'rrrrrrrrr', '.rrrrrrr.', '..rrrrr..', '...rrr...', '....r....'],
  },
  star: {
    colors: { y: '#ffe66d' },
    rows: ['....y....', '....y....', '...yyy...', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..', '..yyyyy..', '.yyy.yyy.', '.yy...yy.'],
  },
  block: {
    colors: { o: '#12082e', y: '#ffb000', b: '#7a2b00' },
    rows: ['oooooooooo', 'oyyyyyyyyo', 'oyybbbbyyo', 'oybbyybbyo', 'oyyyyybbyo', 'oyyyybbyyo', 'oyyyybyyyo', 'oyyyyyyyyo', 'oyyyybyyyo', 'oooooooooo'],
  },
  piece: {
    colors: { p: '#a34dff', l: '#d9b3ff' },
    rows: ['llll........', 'pppp........', 'pppp........', 'pppp........', 'llllllllllll', 'pppppppppppp', 'pppppppppppp', 'pppppppppppp'],
  },
  joystick: {
    colors: { r: '#ff3864', g: '#c9c5ff', b: '#3a2a7a', w: '#ffffff' },
    rows: ['...rrr...', '..rwrrr..', '..rrrrr..', '...rrr...', '....g....', '....g....', '....g....', 'bbbbbbbbb', 'bbbwbbbbb', 'bbbbbbbbb'],
  },
  tank: {
    colors: { o: '#ff8a2b', k: '#12082e', g: '#c9c5ff', w: '#ffffff' },
    rows: ['......ggggg.', '....ooo.....', '...ooooo....', '.ooooooooo..', 'ooooooooooo.', 'kwkwkwkwkwk.', 'kkkkkkkkkkk.'],
  },
};

// name, left %, top %, pixel size, drift seconds, delay seconds, tilt degrees
const PLACEMENT = [
  ['invader', 6, 14, 5, 9, 0, -6],
  ['coin', 18, 62, 5, 7, -2, 8],
  ['heart', 30, 10, 5, 8, -4, -5],
  ['star', 88, 18, 5, 10, -1, 12],
  ['block', 80, 66, 6, 8, -3, -8],
  ['piece', 9, 74, 5, 11, -5, 10],
  ['joystick', 92, 44, 5, 9, -6, -10],
  ['tank', 70, 8, 5, 10, -2, 4],
  ['coin', 52, 82, 4, 6, -1, -12],
  ['star', 40, 88, 4, 9, -4, 6],
  ['invader', 94, 82, 4, 8, -7, 7],
];
const POPUPS = [
  ['1UP', 22, 36, 0], ['+1000', 76, 30, -2], ['HI-SCORE', 62, 90, -4], ['COMBO x2', 12, 48, -6], ['READY?', 84, 56, -3],
];

const NS = 'http://www.w3.org/2000/svg';

function spriteSvg({ rows, colors }, size) {
  const svg = document.createElementNS(NS, 'svg');
  const width = rows[0].length;
  svg.setAttribute('viewBox', `0 0 ${width} ${rows.length}`);
  svg.setAttribute('width', String(width * size));
  svg.setAttribute('height', String(rows.length * size));
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const key = row[x];
      if (key === '.') { x++; continue; }
      let end = x;
      while (end < row.length && row[end] === key) end++;
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(end - x));
      rect.setAttribute('height', '1');
      rect.setAttribute('fill', colors[key]);
      svg.appendChild(rect);
      x = end;
    }
  });
  return svg;
}

/** Adds the floating sprites to #arcade-decor. CSS shows them only behind the title screen. */
export function mountArcadeFloaters(root = document.getElementById('arcade-decor')) {
  if (!root || root.querySelector('.floaters')) return;
  const layer = document.createElement('div');
  layer.className = 'floaters';
  layer.setAttribute('aria-hidden', 'true');
  for (const [name, left, top, size, dur, delay, tilt] of PLACEMENT) {
    const item = document.createElement('div');
    item.className = 'floater';
    item.style.cssText = `left:${left}%;top:${top}%;--dur:${dur}s;--delay:${delay}s;--tilt:${tilt}deg`;
    item.appendChild(spriteSvg(SPRITES[name], size));
    layer.appendChild(item);
  }
  for (const [text, left, top, delay] of POPUPS) {
    const item = document.createElement('div');
    item.className = 'floater popup';
    item.style.cssText = `left:${left}%;top:${top}%;--dur:6s;--delay:${delay}s;--tilt:0deg`;
    item.textContent = text;
    layer.appendChild(item);
  }
  root.appendChild(layer);
}
