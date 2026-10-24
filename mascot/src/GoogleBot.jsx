import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

const C = {
  blue: '#4285F4',
  red: '#EA4335',
  yellow: '#FBBC05',
  green: '#34A853',
  shell: '#f4f5f7',
  joint: '#3c4043',
  visor: '#07080c',
}
const RING = [C.blue, C.red, C.yellow, C.green]
const { damp } = THREE.MathUtils

// ---------------------------------------------------------------------------
// Face: drawn every frame onto a canvas that is mapped onto the visor, like
// the OLED faces on real desk robots. Eyelids are clip regions, so the eye
// glow is cut cleanly by the lids.
//   top    = lid edge offset from eye centre (px, negative = up), rot = lid tilt
//   bottom = top of the lower "cheek" circle (pushes up into a happy ^ arc)
// ---------------------------------------------------------------------------
const FACES = {
  idle: {
    eyes: [{ top: -90, rot: 0, bottom: 200 }, { top: -90, rot: 0, bottom: 200 }],
    smile: 1, open: 0, tongue: 0, tilt: 0, cheeks: 0.35,
  },
  mocking: {
    eyes: [{ top: -6, rot: -0.18, bottom: 34 }, { top: -30, rot: 0.12, bottom: 34 }],
    smile: 0, open: 0.85, tongue: 1, tilt: 0.22, cheeks: 0.6,
  },
  celebration: {
    eyes: [{ top: -90, rot: 0, bottom: -16 }, { top: -90, rot: 0, bottom: -16 }],
    smile: 0, open: 1.1, tongue: 0, tilt: 0, cheeks: 1,
  },
}

const FACE_W = 512
const FACE_H = 300
const GLOW = '#6ea8ff'

function drawFace(ctx, f) {
  const W = FACE_W
  const H = FACE_H
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.fillStyle = C.visor
  ctx.fillRect(0, 0, W, H)

  const lx = f.lookX * 22
  const ly = f.lookY * -14

  // Cheeks
  for (const side of [-1, 1]) {
    const x = W / 2 + side * W * 0.34 + lx * 0.5
    const y = H * 0.7 + ly * 0.5
    const g = ctx.createRadialGradient(x, y, 0, x, y, 46)
    g.addColorStop(0, `rgba(255,120,160,${0.55 * f.cheeks})`)
    g.addColorStop(1, 'rgba(255,120,160,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - 50, y - 50, 100, 100)
  }

  // Eyes
  ;[-1, 1].forEach((side, i) => {
    const e = f.eyes[i]
    const cx = W / 2 + side * W * 0.2 + lx
    const cy = H * 0.4 + ly
    const w = 82
    const h = Math.max(6, 116 * f.blink)

    ctx.save()
    // Upper lid: keep the area below a tilted line.
    ctx.beginPath()
    ctx.translate(cx, cy + e.top)
    ctx.rotate(side * e.rot)
    ctx.rect(-200, 0, 400, 400)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clip()
    // Lower lid: keep the area outside a circle rising from below.
    ctx.beginPath()
    ctx.rect(0, 0, W, H)
    ctx.moveTo(cx + 62, cy + e.bottom + 62)
    ctx.arc(cx, cy + e.bottom + 62, 62, 0, Math.PI * 2)
    ctx.clip('evenodd')

    ctx.shadowColor = GLOW
    ctx.shadowBlur = 34
    ctx.fillStyle = GLOW
    ctx.beginPath()
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, Math.min(38, h / 2))
    ctx.fill()

    // Specular highlight
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.ellipse(cx + w * 0.16, cy - h * 0.2, 10, 13 * Math.min(1, f.blink * 1.4), 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })

  // Mouth
  ctx.save()
  ctx.translate(W / 2 + lx * 0.6, H * 0.78 + ly * 0.6)
  ctx.rotate(f.tilt)
  ctx.shadowColor = GLOW
  ctx.shadowBlur = 22
  if (f.smile > 0.02) {
    ctx.globalAlpha = Math.min(1, f.smile)
    ctx.strokeStyle = GLOW
    ctx.lineWidth = 11
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, -26, 32, 0.22 * Math.PI, 0.78 * Math.PI)
    ctx.stroke()
  }
  if (f.open > 0.02) {
    const r = 34 * f.open
    ctx.globalAlpha = Math.min(1, f.open * 1.5)
    ctx.fillStyle = GLOW
    ctx.beginPath()
    ctx.moveTo(-r, -14)
    ctx.arc(0, -14, r, 0, Math.PI)
    ctx.closePath()
    ctx.fill()
    if (f.tongue > 0.02) {
      ctx.save()
      ctx.clip()
      ctx.shadowBlur = 0
      ctx.globalAlpha = f.tongue
      ctx.fillStyle = '#ff7aa2'
      ctx.beginPath()
      ctx.arc(r * 0.15, -14 + r, r * 0.62, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
  ctx.restore()

  // Scanlines for a subtle screen feel
  ctx.globalAlpha = 1
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1)
}

// ---------------------------------------------------------------------------
// Body poses
// ---------------------------------------------------------------------------
function pose(state, t, look) {
  if (state === 'mocking') {
    const laugh = Math.sin(t * 12)
    return {
      y: Math.abs(laugh) * 0.05, turn: -0.35, sway: laugh * 0.04,
      squash: 1 - Math.abs(laugh) * 0.035,
      head: { x: -0.18, y: 0.1, z: 0.22 + laugh * 0.03 },
      armL: { x: 0.2, z: -0.95 },
      armR: { x: -1.45 + laugh * 0.08, z: 0.15 },
    }
  }
  if (state === 'celebration') {
    const ph = (t * 4.5) % Math.PI
    const y = Math.sin(ph) * 0.6
    const ground = 1 - Math.min(1, y / 0.12)
    const wave = Math.sin(t * 9) * 0.3
    return {
      y, turn: Math.sin(t * 2.2) * 0.6, sway: 0,
      squash: 1 + 0.1 * Math.abs(Math.cos(ph)) * (1 - ground) - 0.16 * ground,
      head: { x: -0.18, y: 0, z: Math.sin(t * 4.5) * 0.15 },
      armL: { x: 0, z: -2.6 + wave },
      armR: { x: 0, z: 2.6 - wave },
    }
  }
  return {
    y: Math.sin(t * 2) * 0.03, turn: Math.sin(t * 0.5) * 0.15 + look.x * 0.25, sway: 0,
    squash: 1 + Math.sin(t * 2) * 0.012,
    head: { x: -look.y * 0.18, y: look.x * 0.3, z: Math.sin(t * 0.8) * 0.05 },
    armL: { x: 0, z: -0.15 + Math.sin(t * 2) * 0.05 },
    armR: { x: 0, z: 0.15 - Math.sin(t * 2) * 0.05 },
  }
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------
function Shell(props) {
  return <meshPhysicalMaterial color={C.shell} roughness={0.28} clearcoat={1} clearcoatRoughness={0.12} {...props} />
}
function Joint() {
  return <meshStandardMaterial color={C.joint} roughness={0.45} metalness={0.4} />
}
function Accent({ color }) {
  return <meshPhysicalMaterial color={color} roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
}

function Arm({ armRef, side, hand }) {
  return (
    <group ref={armRef} position={[side * 0.66, 1.32, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.14, 24, 24]} />
        <Joint />
      </mesh>
      <mesh position={[0, -0.34, 0]} castShadow>
        <capsuleGeometry args={[0.115, 0.38, 8, 16]} />
        <Shell />
      </mesh>
      <mesh position={[0, -0.62, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 20]} />
        <Joint />
      </mesh>
      <group position={[0, -0.78, 0]}>
        <mesh castShadow scale={[1, 1.1, 0.9]}>
          <sphereGeometry args={[0.17, 28, 28]} />
          <Accent color={hand} />
        </mesh>
        <mesh position={[-side * 0.13, 0.05, 0.06]} castShadow>
          <sphereGeometry args={[0.07, 16, 16]} />
          <Accent color={hand} />
        </mesh>
      </group>
    </group>
  )
}

function Leg({ x }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.25, 16]} />
        <Joint />
      </mesh>
      <RoundedBox args={[0.34, 0.2, 0.46]} radius={0.09} smoothness={4} position={[0, 0.11, 0.04]} castShadow>
        <Shell />
      </RoundedBox>
      <RoundedBox args={[0.35, 0.05, 0.47]} radius={0.02} position={[0, 0.02, 0.04]}>
        <Joint />
      </RoundedBox>
    </group>
  )
}

// ---------------------------------------------------------------------------
export default function GoogleBot({ state = 'idle', ...props }) {
  const r = {
    root: useRef(), squash: useRef(), body: useRef(), head: useRef(),
    armL: useRef(), armR: useRef(), ring: useRef(), antenna: useRef(), ball: useRef(),
  }
  const look = useRef({ x: 0, y: 0 })
  const blink = useRef({ next: 2, start: -10 })
  const spring = useRef({ ax: 0, vx: 0, az: 0, vz: 0, py: 0, pt: 0 })
  const ballColor = useRef(new THREE.Color())

  const face = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = FACE_W
    canvas.height = FACE_H
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    const cur = structuredClone(FACES.idle)
    Object.assign(cur, { blink: 1, lookX: 0, lookY: 0 })
    return { ctx: canvas.getContext('2d'), texture, cur }
  }, [])

  useFrame((s, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const t = s.clock.elapsedTime

    // Where to look: follow the pointer when idle, look up when celebrating.
    const target = state === 'idle' ? s.pointer
      : state === 'celebration' ? { x: 0, y: 0.5 } : { x: 0.4, y: 0.1 }
    look.current.x = damp(look.current.x, target.x, 5, dt)
    look.current.y = damp(look.current.y, target.y, 5, dt)

    // ---- Body ----
    const p = pose(state, t, look.current)
    const root = r.root.current
    root.position.y = damp(root.position.y, p.y, 18, dt)
    root.rotation.y = damp(root.rotation.y, p.turn, 6, dt)
    const sq = r.squash.current.scale
    sq.y = damp(sq.y, p.squash, 22, dt)
    sq.x = sq.z = 1 / Math.sqrt(sq.y)
    r.body.current.rotation.z = damp(r.body.current.rotation.z, p.sway, 14, dt)
    for (const k of ['x', 'y', 'z']) {
      r.head.current.rotation[k] = damp(r.head.current.rotation[k], p.head[k], 8, dt)
    }
    for (const [ref, a] of [[r.armL, p.armL], [r.armR, p.armR]]) {
      ref.current.rotation.x = damp(ref.current.rotation.x, a.x, 10, dt)
      ref.current.rotation.z = damp(ref.current.rotation.z, a.z, 10, dt)
    }

    // ---- Antenna: spring follow-through driven by body motion ----
    const sp = spring.current
    const vy = (root.position.y - sp.py) / dt
    const vt = (root.rotation.y - sp.pt) / dt
    sp.py = root.position.y
    sp.pt = root.rotation.y
    sp.vx += (-140 * sp.ax - 7 * sp.vx + vy * 7) * dt
    sp.vz += (-140 * sp.az - 7 * sp.vz - vt * 4) * dt
    sp.ax = THREE.MathUtils.clamp(sp.ax + sp.vx * dt, -0.6, 0.6)
    sp.az = THREE.MathUtils.clamp(sp.az + sp.vz * dt, -0.6, 0.6)
    r.antenna.current.rotation.set(sp.ax, 0, sp.az)

    const speed = state === 'celebration' ? 6 : 1
    ballColor.current.set(RING[Math.floor(t * speed) % RING.length])
    r.ball.current.material.color.lerp(ballColor.current, 0.15)
    r.ball.current.material.emissive.lerp(ballColor.current, 0.15)
    r.ring.current.rotation.z -= dt * (state === 'celebration' ? 6 : 0.5)

    // ---- Face ----
    const f = face.cur
    const goal = FACES[state] ?? FACES.idle
    for (const k of ['smile', 'open', 'tongue', 'tilt', 'cheeks']) f[k] = damp(f[k], goal[k], 12, dt)
    f.eyes.forEach((e, i) => {
      for (const k of ['top', 'rot', 'bottom']) e[k] = damp(e[k], goal.eyes[i][k], 14, dt)
    })
    const b = blink.current
    if (state === 'idle' && t > b.next) {
      b.start = t
      b.next = t + 2.2 + Math.random() * 3
    }
    const bt = (t - b.start) / 0.16
    f.blink = bt >= 0 && bt < 1 ? 1 - Math.sin(bt * Math.PI) * 0.95 : 1
    f.lookX = look.current.x
    f.lookY = look.current.y
    drawFace(face.ctx, f)
    face.texture.needsUpdate = true
  })

  return (
    <group {...props}>
      <group ref={r.root}>
        <group ref={r.squash}>
          <Leg x={-0.26} />
          <Leg x={0.26} />

          <group ref={r.body}>
            {/* Torso */}
            <mesh position={[0, 0.98, 0]} castShadow>
              <capsuleGeometry args={[0.6, 0.32, 16, 48]} />
              <Shell />
            </mesh>
            {/* Waist seam */}
            <mesh position={[0, 0.66, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.585, 0.022, 12, 64]} />
              <Joint />
            </mesh>

            {/* Chest badge: dark bezel + four-colour ring */}
            <mesh position={[0, 0.98, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 0.08, 40]} />
              <Joint />
            </mesh>
            <group ref={r.ring} position={[0, 0.98, 0.6]}>
              {RING.map((c, i) => (
                <mesh key={c} rotation={[0, 0, (i * Math.PI) / 2]}>
                  <torusGeometry args={[0.19, 0.055, 16, 32, Math.PI / 2 - 0.14]} />
                  <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.6} roughness={0.3} />
                </mesh>
              ))}
            </group>

            <Arm armRef={r.armL} side={-1} hand={C.red} />
            <Arm armRef={r.armR} side={1} hand={C.yellow} />

            {/* Neck */}
            <mesh position={[0, 1.66, 0]}>
              <cylinderGeometry args={[0.2, 0.24, 0.16, 24]} />
              <Joint />
            </mesh>

            {/* Head */}
            <group ref={r.head} position={[0, 1.74, 0]}>
              <RoundedBox args={[1.42, 1.02, 1.06]} radius={0.32} smoothness={8} position={[0, 0.5, 0]} castShadow>
                <Shell />
              </RoundedBox>
              {/* Visor bezel + screen + glass */}
              <RoundedBox args={[1.18, 0.72, 0.1]} radius={0.12} smoothness={6} position={[0, 0.5, 0.49]}>
                <Joint />
              </RoundedBox>
              <RoundedBox args={[1.1, 0.64, 0.1]} radius={0.1} smoothness={6} position={[0, 0.5, 0.505]}>
                <meshStandardMaterial color={C.visor} roughness={0.2} />
              </RoundedBox>
              <mesh position={[0, 0.5, 0.558]}>
                <planeGeometry args={[1.0, 0.586]} />
                <meshBasicMaterial map={face.texture} color={[2.2, 2.2, 2.2]} toneMapped={false} />
              </mesh>
              <mesh position={[0, 0.5, 0.562]}>
                <planeGeometry args={[1.06, 0.6]} />
                <meshPhysicalMaterial color="#ffffff" transparent opacity={0.08} roughness={0.02}
                  clearcoat={1} envMapIntensity={2.5} depthWrite={false} />
              </mesh>

              {/* Ears */}
              {[[-1, C.blue], [1, C.green]].map(([side, c]) => (
                <group key={side} position={[side * 0.72, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <mesh>
                    <cylinderGeometry args={[0.2, 0.2, 0.08, 32]} />
                    <Joint />
                  </mesh>
                  <mesh position={[0, side * -0.06, 0]}>
                    <cylinderGeometry args={[0.16, 0.18, 0.08, 32]} />
                    <Accent color={c} />
                  </mesh>
                </group>
              ))}

              {/* Antenna (springy) */}
              <group ref={r.antenna} position={[0, 1.0, 0]}>
                <mesh position={[0, 0.03, 0]}>
                  <cylinderGeometry args={[0.09, 0.11, 0.06, 20]} />
                  <Joint />
                </mesh>
                <mesh position={[0, 0.2, 0]}>
                  <cylinderGeometry args={[0.022, 0.022, 0.32, 8]} />
                  <Joint />
                </mesh>
                <mesh ref={r.ball} position={[0, 0.4, 0]}>
                  <sphereGeometry args={[0.09, 24, 24]} />
                  <meshStandardMaterial color={C.blue} emissive={C.blue} emissiveIntensity={3} toneMapped={false} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
