import { useEffect, useState } from 'react'

// Kenney "Robot Pack" (CC0) — https://kenney.nl/assets/robot-pack
// The pack has poses, not expressions, so the states come from motion:
//   idle        → treads driving in place, gentle bob
//   mocking     → taunting side-to-side wiggle, flipping direction
//   celebration → jump pose, bouncing and spinning
export const KENNEY_COLORS = ['blue', 'green', 'yellow', 'red']

const sprite = (color, pose) => `/kenney/robot_${color}${pose}.png`

export default function KenneyMascot({ state = 'idle', color = 'blue' }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), state === 'idle' ? 220 : 160)
    return () => clearInterval(id)
  }, [state])

  useEffect(() => {
    for (const p of ['Drive1', 'Drive2', 'Jump', 'Hurt']) new Image().src = sprite(color, p)
  }, [color])

  const pose = state === 'celebration' ? 'Jump' : tick % 2 ? 'Drive2' : 'Drive1'

  return (
    <div className={`kenney kenney-${state}`}>
      <img src={sprite(color, pose)} alt={`Kenney robot, ${state}`} draggable={false} />
    </div>
  )
}
