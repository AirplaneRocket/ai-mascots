import { useEffect, useRef } from 'react'

// G-Face: a face-only G-Bot built for viewing from across a room (TV / 10-foot UI).
// Design rules applied (from TV UI guidelines, e.g. Android TV / tvOS / Fire TV):
//  - Keep everything inside a 5% safe area (TV overscan).
//  - Big, simple, high-contrast shapes on a dark background; no thin lines or tiny details.
//  - Softer, less saturated colours (Google dark-theme tones) — TVs oversaturate.
//  - Each state has a distinct silhouette AND colour, so it reads even if colour is lost.
//  - Slow, large motion; expressions hold rather than flicker.

const TONES = {
  idle: '#8ab4f8', // Google blue (dark theme)
  mocking: '#f28b82', // Google red (dark theme)
  celebration: '#81c995', // Google green (dark theme)
}
const CONFETTI = ['#8ab4f8', '#f28b82', '#fdd663', '#81c995']
const BG = '#0b0d12'

// Eyelid values are in eye-half-heights relative to eye centre.
const FACES = {
  idle: {
    eyes: [{ top: -1.5, rot: 0, bottom: 3 }, { top: -1.5, rot: 0, bottom: 3 }],
    smile: 1, open: 0, tongue: 0, cheeks: 0.35,
  },
  mocking: {
    eyes: [{ top: -0.05, rot: -0.2, bottom: 0.55 }, { top: -0.55, rot: 0.14, bottom: 0.55 }],
    smile: 0, open: 0.85, tongue: 1, cheeks: 0.55,
  },
  celebration: {
    eyes: [{ top: -1.5, rot: 0, bottom: -0.35 }, { top: -1.5, rot: 0, bottom: -0.35 }],
    smile: 0, open: 1.1, tongue: 0, cheeks: 1,
  },
}

// G-Bot head, drawn around (0, 0) = head centre.
const SHELL_LIGHT = '#ffffff'
const SHELL_DARK = '#c3c7cf'
const JOINT = '#3c4043'
const EAR = { left: '#4285F4', right: '#34A853' }
const ANTENNA = ['#4285F4', '#EA4335', '#FBBC05', '#34A853']

function drawHead(ctx, hw, hh, wobble, t, state) {
  const r = hh * 0.32

  // Antenna (pivots at the top of the head)
  ctx.save()
  ctx.translate(0, -hh / 2)
  ctx.rotate(wobble)
  ctx.fillStyle = JOINT
  ctx.beginPath()
  ctx.roundRect(-hh * 0.11, -hh * 0.05, hh * 0.22, hh * 0.08, hh * 0.03)
  ctx.fill()
  ctx.fillRect(-hh * 0.022, -hh * 0.33, hh * 0.044, hh * 0.3)
  const speed = state === 'celebration' ? 6 : 1
  const ball = ANTENNA[Math.floor(t * speed) % 4]
  ctx.shadowColor = ball
  ctx.shadowBlur = hh * 0.12
  ctx.fillStyle = ball
  ctx.beginPath()
  ctx.arc(0, -hh * 0.36, hh * 0.075, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Ears
  for (const [side, color] of [[-1, EAR.left], [1, EAR.right]]) {
    const x = side * hw / 2
    ctx.fillStyle = JOINT
    ctx.beginPath()
    ctx.roundRect(x - hw * 0.04 + side * hw * 0.005, -hh * 0.2, hw * 0.08, hh * 0.4, hw * 0.03)
    ctx.fill()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x + side * hw * 0.03 - hw * 0.03, -hh * 0.17, hw * 0.06, hh * 0.34, hw * 0.03)
    ctx.fill()
  }

  // Shell with soft top-left lighting
  const shell = ctx.createLinearGradient(-hw / 2, -hh / 2, hw * 0.3, hh / 2)
  shell.addColorStop(0, SHELL_LIGHT)
  shell.addColorStop(0.55, '#eceef1')
  shell.addColorStop(1, SHELL_DARK)
  ctx.fillStyle = shell
  ctx.beginPath()
  ctx.roundRect(-hw / 2, -hh / 2, hw, hh, r)
  ctx.fill()

  // Broad gloss highlight
  const gloss = ctx.createRadialGradient(-hw * 0.28, -hh * 0.38, 0, -hw * 0.28, -hh * 0.38, hw * 0.35)
  gloss.addColorStop(0, 'rgba(255,255,255,0.9)')
  gloss.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(-hw / 2, -hh / 2, hw, hh, r)
  ctx.clip()
  ctx.fillStyle = gloss
  ctx.fillRect(-hw / 2, -hh / 2, hw, hh)
  ctx.restore()

  // Bezel around the visor
  ctx.fillStyle = JOINT
  ctx.beginPath()
  ctx.roundRect(-hw * 0.44, hh * 0.02 - hh * 0.38, hw * 0.88, hh * 0.76, hh * 0.17)
  ctx.fill()
}

const ease = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt))

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))

export default function GFace({ state = 'idle' }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let W = 0
    let H = 0
    let raf = 0
    let last = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      W = rect.width
      H = rect.height
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    // Animated values
    const f = structuredClone(FACES.idle)
    Object.assign(f, { blink: 1, lookX: 0, lookY: 0, tilt: 0, y: 0, scale: 1 })
    let tone = hexToRgb(TONES.idle)
    const look = { x: 0, y: 0, next: 1 }
    const blink = { next: 2, start: -10 }
    let confetti = []
    const antenna = { a: 0, v: 0, py: 0, pt: 0 }

    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 1 / 20)
      last = now
      const t = now / 1000
      const s = stateRef.current
      const goal = FACES[s] ?? FACES.idle

      // Ease expression parameters
      for (const k of ['smile', 'open', 'tongue', 'cheeks']) f[k] = ease(f[k], goal[k], 9, dt)
      f.eyes.forEach((e, i) => {
        for (const k of ['top', 'rot', 'bottom']) e[k] = ease(e[k], goal.eyes[i][k], 10, dt)
      })
      tone = mix(tone, hexToRgb(TONES[s]), 1 - Math.exp(-6 * dt))
      const toneCss = `rgb(${tone.join(',')})`

      // Gaze: slow saccades when idle (no mouse on a TV), fixed looks otherwise.
      if (s === 'idle' && t > look.next) {
        look.x = (Math.random() * 2 - 1) * 0.9
        look.y = (Math.random() * 2 - 1) * 0.5
        if (Math.random() < 0.35) look.x = look.y = 0
        look.next = t + 1.8 + Math.random() * 2.2
      }
      const lx = s === 'idle' ? look.x : s === 'mocking' ? 0.5 : 0
      const ly = s === 'idle' ? look.y : s === 'mocking' ? 0.1 : -0.4
      f.lookX = ease(f.lookX, lx, 7, dt)
      f.lookY = ease(f.lookY, ly, 7, dt)

      // Blink
      if (s === 'idle' && t > blink.next) {
        blink.start = t
        blink.next = t + 2.5 + Math.random() * 3
      }
      const bt = (t - blink.start) / 0.2
      f.blink = bt >= 0 && bt < 1 ? 1 - Math.sin(bt * Math.PI) * 0.95 : 1

      // Whole-face motion
      const tiltGoal = s === 'mocking' ? 0.09 + Math.sin(t * 7) * 0.02 : 0
      f.tilt = ease(f.tilt, tiltGoal, 8, dt)
      const yGoal = s === 'celebration' ? -Math.abs(Math.sin(t * 4)) * 0.05
        : s === 'mocking' ? -Math.abs(Math.sin(t * 7)) * 0.015
        : Math.sin(t * 1.3) * 0.01
      f.y = ease(f.y, yGoal, 14, dt)
      f.scale = ease(f.scale, s === 'celebration' ? 1.04 : 1, 6, dt)

      // Antenna spring: wobbles in reaction to head bounce and tilt.
      const vy = (f.y - antenna.py) / dt
      const vt = (f.tilt - antenna.pt) / dt
      antenna.py = f.y
      antenna.pt = f.tilt
      antenna.v += (-120 * antenna.a - 6 * antenna.v + vy * 40 - vt * 4) * dt
      antenna.a = Math.max(-0.7, Math.min(0.7, antenna.a + antenna.v * dt))

      // ---- Draw ----
      ctx.fillStyle = BG
      ctx.fillRect(0, 0, W, H)

      // Whole head (incl. ears + antenna) sized to fit the 5% safe area.
      const headW = Math.min((W * 0.9) / 1.14, ((H * 0.9) / 1.47) * 1.39)
      const headH = headW / 1.39
      const F = headW * 0.95 // face scale: features fill the visor for distance viewing
      const cx = W / 2
      const cy = H / 2 + headH * 0.155

      // Ambient glow in the state colour
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, F * 0.7)
      glow.addColorStop(0, `rgba(${tone.join(',')},0.16)`)
      glow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)

      // Confetti (celebration) — big pieces so they read from afar
      if (s === 'celebration' && confetti.length < 60 && Math.random() < 0.6) {
        confetti.push({
          x: Math.random() * W, y: -20, vy: 80 + Math.random() * 120, vx: (Math.random() - 0.5) * 60,
          r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 6,
          size: F * (0.018 + Math.random() * 0.014), c: CONFETTI[Math.floor(Math.random() * 4)],
        })
      }
      confetti = confetti.filter((p) => p.y < H + 40)
      for (const p of confetti) {
        p.y += p.vy * dt
        p.x += p.vx * dt
        p.r += p.vr * dt
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.r)
        ctx.fillStyle = p.c
        ctx.fillRect(-p.size / 2, -p.size, p.size, p.size * 2)
        ctx.restore()
      }

      // Soft floor shadow (shrinks as the head bounces up)
      const lift = Math.max(0, -f.y) * 6
      ctx.fillStyle = `rgba(0,0,0,${0.45 - lift * 0.5})`
      ctx.beginPath()
      ctx.ellipse(cx, cy + headH * 0.62, headW * (0.42 - lift * 0.3), headH * 0.05, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.save()
      ctx.translate(cx, cy + f.y * F)
      ctx.rotate(f.tilt)
      ctx.scale(f.scale, f.scale)
      drawHead(ctx, headW, headH, antenna.a, t, s)

      // Visor screen: clip the face to it so glow and lids stay on the glass.
      const vw = headW * 0.82
      const vh = headH * 0.68
      const vy0 = headH * 0.02
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(-vw / 2, vy0 - vh / 2, vw, vh, headH * 0.14)
      ctx.clip()
      ctx.fillStyle = '#07080c'
      ctx.fillRect(-vw / 2, vy0 - vh / 2, vw, vh)
      ctx.translate(0, vy0 - F * 0.04)

      const ew = F * 0.16
      const eh = F * 0.24
      const halfH = eh / 2
      const lookX = f.lookX * F * 0.05
      const lookY = f.lookY * F * 0.035

      // Cheeks
      for (const side of [-1, 1]) {
        const x = side * F * 0.33 + lookX * 0.5
        const y = F * 0.12 + lookY * 0.5
        const g = ctx.createRadialGradient(x, y, 0, x, y, F * 0.08)
        g.addColorStop(0, `rgba(242,139,170,${0.6 * f.cheeks})`)
        g.addColorStop(1, 'rgba(242,139,170,0)')
        ctx.fillStyle = g
        ctx.fillRect(x - F * 0.08, y - F * 0.08, F * 0.16, F * 0.16)
      }

      // Eyes
      ;[-1, 1].forEach((side, i) => {
        const e = f.eyes[i]
        const ex = side * F * 0.2 + lookX
        const ey = -F * 0.06 + lookY
        const h = Math.max(F * 0.012, eh * f.blink)
        const R = ew * 0.75

        // Upper lid: path is built in a tilted frame, then clipped in face space.
        ctx.save()
        ctx.beginPath()
        ctx.translate(ex, ey + e.top * halfH)
        ctx.rotate(side * e.rot)
        ctx.rect(-F, 0, F * 2, F * 2)
        ctx.restore()
        ctx.save()
        ctx.clip()
        // Lower lid: keep the area outside a circle rising from below.
        ctx.beginPath()
        ctx.rect(-F, -F, F * 2, F * 2)
        ctx.moveTo(ex + R, ey + e.bottom * halfH + R)
        ctx.arc(ex, ey + e.bottom * halfH + R, R, 0, Math.PI * 2)
        ctx.clip('evenodd')

        ctx.shadowColor = toneCss
        ctx.shadowBlur = F * 0.05
        ctx.fillStyle = toneCss
        ctx.beginPath()
        ctx.roundRect(ex - ew / 2, ey - h / 2, ew, h, Math.min(ew * 0.48, h / 2))
        ctx.fill()

        // One large, simple highlight (small details vanish at distance)
        ctx.shadowBlur = 0
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.beginPath()
        ctx.ellipse(ex + ew * 0.18, ey - h * 0.2, ew * 0.13, ew * 0.16 * Math.min(1, f.blink * 1.4), 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // Mouth
      ctx.save()
      ctx.translate(lookX * 0.6, F * 0.2 + lookY * 0.6)
      ctx.shadowColor = toneCss
      ctx.shadowBlur = F * 0.035
      if (f.smile > 0.02) {
        ctx.globalAlpha = Math.min(1, f.smile)
        ctx.strokeStyle = toneCss
        ctx.lineWidth = F * 0.035
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(0, -F * 0.06, F * 0.075, 0.22 * Math.PI, 0.78 * Math.PI)
        ctx.stroke()
      }
      if (f.open > 0.02) {
        const r = F * 0.075 * f.open
        ctx.globalAlpha = Math.min(1, f.open * 1.5)
        ctx.fillStyle = toneCss
        ctx.beginPath()
        ctx.moveTo(-r, -F * 0.03)
        ctx.arc(0, -F * 0.03, r, 0, Math.PI)
        ctx.closePath()
        ctx.fill()
        if (f.tongue > 0.02) {
          ctx.save()
          ctx.clip()
          ctx.shadowBlur = 0
          ctx.globalAlpha = f.tongue
          ctx.fillStyle = '#f6aea9'
          ctx.beginPath()
          ctx.arc(r * 0.15, -F * 0.03 + r, r * 0.62, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }
      ctx.restore()
      ctx.restore() // visor clip

      // Glass reflection: one broad, soft band (fine detail is lost at distance)
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(-vw / 2, vy0 - vh / 2, vw, vh, headH * 0.14)
      ctx.clip()
      const glass = ctx.createLinearGradient(-vw / 2, vy0 - vh / 2, vw * 0.1, vy0 + vh / 2)
      glass.addColorStop(0, 'rgba(255,255,255,0.10)')
      glass.addColorStop(0.35, 'rgba(255,255,255,0.03)')
      glass.addColorStop(0.36, 'rgba(255,255,255,0)')
      ctx.fillStyle = glass
      ctx.fillRect(-vw / 2, vy0 - vh / 2, vw, vh)
      ctx.restore()
      ctx.restore() // head

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="gface" role="img" aria-label={`G-Face mascot, ${state}`} />
}
