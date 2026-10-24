import { useEffect, useState } from 'react'

// Original 8-bit alien family. Each species is a 13-column sprite template:
//   X = body   e = eye area   m = mouth area   . = empty
// Eyes and mouth are filled in per expression, so every species gets
// idle / mocking / celebration for free.
// `sy` is the shoulder row where arms attach (null = no arms).
export const SPECIES = [
  {
    id: 'blip', name: 'Blip', color: '#4285F4', sy: 6,
    body: [
      '...X.....X...',
      '....X...X....',
      '..XXXXXXXXX..',
      '.XXXXXXXXXXX.',
      'XXeeeXXXeeeXX',
      'XXeeeXXXeeeXX',
      'XXXXXXXXXXXXX',
      'XXXmmmmmmmXXX',
      '.XXXmmmmmXXX.',
      '..XXXXXXXXX..',
    ],
    legs: {
      a: ['..X.X...X.X..', '.X..X...X..X.'],
      b: ['...X.X.X.X...', '..XX.....XX..'],
      tuck: ['...XX...XX...', '.............'],
    },
  },
  {
    id: 'pinch', name: 'Pinch', color: '#34A853', sy: null,
    body: [
      '..X.......X..',
      '...X.....X...',
      '..XXXXXXXXX..',
      '.XXeeXXXeeXX.',
      'XXXeeXXXeeXXX',
      'XXXXXXXXXXXXX',
      'X.XXmmmmmXX.X',
      'X.XXXmmmXXX.X',
      'X.XXXXXXXXX.X',
    ],
    legs: {
      a: ['..X.......X..', '.X.........X.'],
      b: ['...X.....X...', '...XX...XX...'],
      tuck: ['...X.....X...', '.............'],
    },
  },
  {
    id: 'squiddo', name: 'Squiddo', color: '#c2185b', sy: null,
    body: [
      '.....XXX.....',
      '....XXXXX....',
      '...XXXXXXX...',
      '..XXXXXXXXX..',
      '.XXeeXXXeeXX.',
      '.XXeeXXXeeXX.',
      '.XXXXXXXXXXX.',
      '.XXXmmmmmXXX.',
      '..XXXmmmXXX..',
    ],
    legs: {
      a: ['..X.X.X.X.X..', '.X...X.X...X.'],
      b: ['..X.X.X.X.X..', '..X.X...X.X..'],
      tuck: ['...X.X.X.X...', '.............'],
    },
  },
  {
    id: 'boo', name: 'Boo', color: '#FBBC05', sy: 5,
    body: [
      '....XXXXX....',
      '..XXXXXXXXX..',
      '.XXXXXXXXXXX.',
      '.XeeeXXXeeeX.',
      'XXeeeXXXeeeXX',
      'XXXXXXXXXXXXX',
      'XXXXmmmmmXXXX',
      'XXXXXmmmXXXXX',
      'XXXXXXXXXXXXX',
    ],
    legs: {
      a: ['XX.XXX.XXX.XX', 'X...X...X...X'],
      b: ['X.XXX.XXX.XXX', '..X...X...X..'],
      tuck: ['.XXXXXXXXXXX.', '.............'],
    },
  },
  {
    id: 'dome', name: 'Dome', color: '#EA4335', sy: 4,
    body: [
      '....XXXXX....',
      '..XXXXXXXXX..',
      '.XXeeXXXeeXX.',
      'XXXeeXXXeeXXX',
      'XXXXXXXXXXXXX',
      'XXXXmmmmmXXXX',
      '.XXXXmmmXXXX.',
    ],
    legs: {
      a: ['..XX.X.X.XX..', '.X..X...X..X.'],
      b: ['...XX.X.XX...', '..X..X.X..X..'],
      tuck: ['...XXXXXXX...', '.............'],
    },
  },
  {
    id: 'horns', name: 'Horns', color: '#00acc1', sy: 6,
    body: [
      'X...........X',
      '.X...XXX...X.',
      '..XXXXXXXXX..',
      '.XXXXXXXXXXX.',
      'XXeeXXXXXeeXX',
      'XXeeXXXXXeeXX',
      'XXXXXXXXXXXXX',
      '.XXXmmmmmXXX.',
      '..XXXmmmXXX..',
    ],
    legs: {
      a: ['.XX.......XX.', 'X...........X'],
      b: ['..XX.....XX..', '..X.......X..'],
      tuck: ['...XX...XX...', '.............'],
    },
  },
]

// Expression fills. Each gets the cell's position inside its eye/mouth run:
// r = row within region, h = region height, c = column within run, w = run width.
const EYE = {
  open: ({ r, h, c, w }) => (r === h - 1 && c >= w - (w >= 3 ? 2 : 1) ? 'K' : 'W'),
  blink: ({ r, h }) => (r === h - 1 ? 'K' : 'X'),
  smug: ({ r, c, w }) => (r === 0 || c >= w - (w >= 3 ? 2 : 1) ? 'K' : 'W'),
  happy: ({ r, c, w }) => {
    if (w < 3) return r === 0 ? 'K' : 'X'
    if (r === 0) return c > 0 && c < w - 1 ? 'K' : 'X'
    if (r === 1) return c === 0 || c === w - 1 ? 'K' : 'X'
    return 'X'
  },
}
const MOUTH = {
  smile: ({ r, h, c, w }) => {
    const mid = c > 0 && c < w - 1
    if (h === 1 || r === h - 1) return mid ? 'M' : 'X'
    return c === 0 || c === w - 1 ? 'M' : 'X'
  },
  laugh: ({ r, c, w }) => (r > 0 && c > 0 && c < w - 1 ? 'R' : 'M'),
  grin: () => 'M',
}

// Arm pixel offsets (x in the 17-wide grid, y relative to the shoulder row).
// Left arm only; the right arm is mirrored.
const ARMS = {
  down: [[1, 0], [0, 1], [0, 2]],
  rest: [[1, 0], [0, 0], [0, 1]],
  up: [[1, -1], [0, -2], [0, -3]],
  wave: [[1, 0], [0, -1], [0, -2]],
  belly: [[1, 0], [1, 1], [2, 2]],
}

const SPEED = { idle: 550, mocking: 160, celebration: 180 }
const JUMP = [0, -1, -2, -1]
const SPARKLE_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853']
const FIXED = { W: '#ffffff', K: '#202124', M: '#202124', R: '#ff6d8a' }
const TOTAL_ROWS = 12

function frame(state, tick) {
  if (state === 'mocking') {
    return { eyes: 'smug', mouth: 'laugh', legs: 'a', arms: 'belly', dy: tick % 2 }
  }
  if (state === 'celebration') {
    const dy = JUMP[tick % 4]
    return {
      eyes: 'happy', mouth: 'grin', legs: dy < 0 ? 'tuck' : 'a',
      arms: tick % 2 ? 'up' : 'wave', dy, sparkle: true,
    }
  }
  return {
    eyes: tick % 8 === 7 ? 'blink' : 'open', mouth: 'smile',
    legs: tick % 2 ? 'b' : 'a', arms: tick % 2 ? 'rest' : 'down', dy: 0,
  }
}

// Map each cell of a given char to its position within its region/run.
function regions(rows, ch) {
  const ys = rows.flatMap((row, y) => (row.includes(ch) ? [y] : []))
  const out = new Map()
  if (!ys.length) return out
  const y0 = ys[0]
  const h = ys[ys.length - 1] - y0 + 1
  for (const y of ys) {
    const row = rows[y]
    for (let x = 0; x < row.length; ) {
      if (row[x] !== ch) { x++; continue }
      const start = x
      while (x < row.length && row[x] === ch) x++
      for (let i = start; i < x; i++) out.set(`${i},${y}`, { r: y - y0, h, c: i - start, w: x - start })
    }
  }
  return out
}

function sparkles(tick) {
  return Array.from({ length: 6 }, (_, i) => {
    const n = Math.sin((tick + 1) * 12.9898 + i * 78.233) * 43758.5453
    const r = n - Math.floor(n)
    return {
      x: Math.floor(r * 23) - 3,
      y: Math.floor(((r * 7.31) % 1) * 9),
      c: SPARKLE_COLORS[(tick + i) % 4],
    }
  })
}

export default function PixelMascot({ state = 'idle', species = SPECIES[0], color, className = 'pixel-mascot' }) {
  const [tick, setTick] = useState(0)
  const fill = color ?? species.color

  useEffect(() => {
    setTick(0)
    const id = setInterval(() => setTick((t) => t + 1), SPEED[state] ?? 500)
    return () => clearInterval(id)
  }, [state])

  const f = frame(state, tick)
  const rows = [...species.body, ...species.legs[f.legs]]
  const eyes = regions(rows, 'e')
  const mouth = regions(rows, 'm')
  const top = 3 + (TOTAL_ROWS - rows.length) + f.dy
  const pixels = []

  rows.forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      if (ch === '.') return
      let out = ch
      if (ch === 'e') out = EYE[f.eyes](eyes.get(`${x},${y}`))
      if (ch === 'm') out = MOUTH[f.mouth](mouth.get(`${x},${y}`))
      pixels.push({ x: x + 2, y: y + top, c: out === 'X' ? fill : FIXED[out] })
    })
  })

  if (species.sy != null) {
    for (const [x, y] of ARMS[f.arms]) {
      pixels.push({ x, y: species.sy + y + top, c: fill })
      pixels.push({ x: 16 - x, y: species.sy + y + top, c: fill })
    }
  }

  const shadowW = 11 + f.dy * 2

  return (
    <svg className={className} viewBox="-4 0 25 18" shapeRendering="crispEdges"
      role="img" aria-label={`${species.name}, 8-bit alien mascot, ${state}`}>
      <rect x={8.5 - shadowW / 2} y={16.4} width={shadowW} height={0.8} fill="currentColor" opacity="0.15" />
      {f.sparkle && sparkles(tick).map((s, i) => (
        <rect key={`s${i}`} x={s.x} y={s.y} width={1} height={1} fill={s.c} />
      ))}
      {pixels.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={1.02} height={1.02} fill={p.c} />
      ))}
    </svg>
  )
}
