import { useEffect, useMemo, useState } from 'react'
import { createAvatar } from '@dicebear/core'
import { bottts } from '@dicebear/collection'

// DiceBear "Bottts" (remix of Bottts by Pablo Stanley — free for personal and
// commercial use). Generated locally, so it works offline (e.g. on a TV).
//
// To make them feel alive, each state is a little flip-book: the eyes and
// mouth parts are swapped frame by frame (blinks, laughing, heart-eyes),
// and the DOM around the bot adds glow, shadow and floating effects.

export const DICEBEAR_BOTS = [
  {
    id: 'blue', name: 'Byte', baseColor: '4285f4', face: 'round02', top: 'antenna', sides: 'round',
    texture: 'circuits', eyes: 'eva', mouth: 'smile01',
  },
  {
    id: 'red', name: 'Bolt', baseColor: 'ea4335', face: 'square02', top: 'glowingBulb01', sides: 'antenna01',
    texture: 'dots', eyes: 'bulging', mouth: 'grill03',
  },
  {
    id: 'yellow', name: 'Chip', baseColor: 'fbbc05', face: 'square04', top: 'radar', sides: 'cables01',
    texture: null, eyes: 'roundFrame02', mouth: 'smile01',
  },
  {
    id: 'green', name: 'Gizmo', baseColor: '34a853', face: 'round01', top: 'lights', sides: 'square',
    texture: 'circuits', eyes: 'glow', mouth: 'diagram',
  },
]

// Frame sequences: [eyes, mouth, ms]. `null` = the bot's own idle part.
const SEQUENCES = {
  idle: [
    [null, null, 2600], ['happy', null, 140], [null, null, 1800],
    ['happy', null, 110], [null, null, 110], ['happy', null, 110],
  ],
  mocking: [
    ['shade01', 'bite', 900],
    ['happy', 'smile02', 170], ['happy', 'bite', 170],
    ['happy', 'smile02', 170], ['happy', 'bite', 170],
    ['happy', 'smile02', 170], ['happy', 'bite', 170],
  ],
  celebration: [
    ['hearts', 'smile02', 260], ['happy', 'grill03', 220],
    ['hearts', 'smile02', 260], ['bulging', 'smile02', 220],
  ],
}

function render(bot, eyes, mouth) {
  return createAvatar(bottts, {
    seed: bot.id,
    baseColor: [bot.baseColor],
    face: [bot.face],
    top: [bot.top],
    sides: [bot.sides],
    eyes: [eyes ?? bot.eyes],
    mouth: [mouth ?? bot.mouth],
    topProbability: 100,
    sidesProbability: 100,
    texture: bot.texture ? [bot.texture] : [],
    textureProbability: bot.texture ? 100 : 0,
  }).toDataUri()
}

// Idle thumbnail for pickers.
export const botSvg = (bot) => render(bot)

const FLOATERS = {
  mocking: ['HA!', 'HA!', 'HA!'],
  celebration: ['♥', '★', '♥', '★', '♥'],
}

export default function DiceBearMascot({ state = 'idle', bot = DICEBEAR_BOTS[0] }) {
  const frames = useMemo(
    () => (SEQUENCES[state] ?? SEQUENCES.idle).map(([e, m, ms]) => ({ src: render(bot, e, m), ms })),
    [bot, state],
  )
  const [i, setI] = useState(0)

  useEffect(() => {
    setI(0)
    let idx = 0
    let id
    const next = () => {
      id = setTimeout(() => {
        idx = (idx + 1) % frames.length
        setI(idx)
        next()
      }, frames[idx].ms)
    }
    next()
    return () => clearTimeout(id)
  }, [frames])

  const frame = frames[Math.min(i, frames.length - 1)]

  return (
    <div className={`dicebear dicebear-${state}`} style={{ '--bot': `#${bot.baseColor}` }}>
      <div className="db-glow" />
      <div className="db-shadow" />
      <div className="db-body">
        <img src={frame.src} alt={`${bot.name} robot, ${state}`} draggable={false} />
      </div>
      {(FLOATERS[state] ?? []).map((txt, k) => (
        <span key={`${state}-${k}`} className="db-float" style={{ '--k': k }}>{txt}</span>
      ))}
    </div>
  )
}
