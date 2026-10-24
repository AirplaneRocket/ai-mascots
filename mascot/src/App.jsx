import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import Mascot from './Mascot'
import GoogleBot from './GoogleBot'
import PixelMascot, { SPECIES } from './PixelMascot'
import Confetti from './Confetti'
import GFace from './GFace'
import EmojiMascot, { EMOJI_SETS, emojiUrl } from './EmojiMascot'
import KenneyMascot, { KENNEY_COLORS } from './KenneyMascot'
import DiceBearMascot, { DICEBEAR_BOTS, botSvg } from './DiceBearMascot'
import './App.css'

const STATES = [
  { id: 'idle', label: 'Idle', color: 'var(--g-blue)', line: 'Hey there! Ready when you are.' },
  { id: 'mocking', label: 'Mocking', color: 'var(--g-red)', line: 'Nope. Nope. Try again!' },
  { id: 'celebration', label: 'Celebrate', color: 'var(--g-green)', line: 'Yesss! You did it!' },
]

const MASCOTS = [
  { id: 'robo', label: 'Robo', credit: 'Robot model by Tomás Laulhé (CC0), via three.js examples' },
  { id: 'gbot', label: 'G-Bot', credit: 'G-Bot: custom-built in code, yours to use' },
  { id: 'faces', label: 'Robot Faces' },
  { id: 'pixel', label: '8-bit', credit: '8-bit alien: original pixel design, yours to use' },
  { id: 'emoji', label: 'Emoji', credit: 'Noto Animated Emoji by Google, CC BY 4.0' },
  { id: 'kenney', label: 'Kenney', credit: 'Robot Pack by Kenney (kenney.nl), CC0' },
]

const GFACE_CREDIT = 'G-Face: face-only G-Bot for TV viewing, yours to use'
const DICEBEAR_CREDIT = 'DiceBear Bottts, remix of Bottts by Pablo Stanley (free for personal & commercial use)'

const PIXEL_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#c2185b', '#00acc1']

// Soft studio reflections built from local light panels (no HDRI download).
function StudioLights() {
  return (
    <Environment resolution={256}>
      <Lightformer form="rect" intensity={3} position={[0, 5, -2]} scale={[10, 3, 1]} rotation-x={Math.PI / 2} />
      <Lightformer form="rect" intensity={2} position={[-5, 1, 2]} scale={[2, 6, 1]} rotation-y={Math.PI / 2} />
      <Lightformer form="rect" intensity={2} position={[5, 1, 2]} scale={[2, 6, 1]} rotation-y={-Math.PI / 2} />
      <Lightformer form="ring" color="#4285F4" intensity={1.5} position={[-3, 2, -5]} scale={3} />
      <Lightformer form="ring" color="#EA4335" intensity={1.5} position={[3, 2, -5]} scale={3} />
    </Environment>
  )
}

export default function App() {
  const [state, setState] = useState('idle')
  const [mascot, setMascot] = useState('robo')
  const [speciesId, setSpeciesId] = useState(SPECIES[0].id)
  const [pixelColor, setPixelColor] = useState(null)
  const [emojiSetId, setEmojiSetId] = useState(EMOJI_SETS[0].id)
  const emojiSet = EMOJI_SETS.find((s) => s.id === emojiSetId)
  const [kenneyColor, setKenneyColor] = useState(KENNEY_COLORS[0])
  const [botId, setBotId] = useState('gface') // 'gface' or a DiceBear bot id
  const bot = DICEBEAR_BOTS.find((b) => b.id === botId)
  const stageRef = useRef(null)

  // TV-remote friendly: number keys 1 / 2 / 3 switch states.
  useEffect(() => {
    const onKey = (e) => {
      const s = STATES[Number(e.key) - 1]
      if (s) setState(s.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleTv = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else stageRef.current?.requestFullscreen()
  }
  const species = SPECIES.find((s) => s.id === speciesId)
  const active = STATES.find((s) => s.id === state)

  return (
    <main className="app">
      <header>
        <h1>
          <span style={{ color: 'var(--g-blue)' }}>M</span>
          <span style={{ color: 'var(--g-red)' }}>a</span>
          <span style={{ color: 'var(--g-yellow)' }}>s</span>
          <span style={{ color: 'var(--g-blue)' }}>c</span>
          <span style={{ color: 'var(--g-green)' }}>o</span>
          <span style={{ color: 'var(--g-red)' }}>t</span>
        </h1>
        <div className="tabs" role="tablist">
          {MASCOTS.map((m) => (
            <button key={m.id} role="tab" aria-selected={m.id === mascot}
              className={m.id === mascot ? 'active' : ''} onClick={() => setMascot(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <p className="bubble" key={state}>{active.line}</p>
      </header>

      <div className="stage" ref={stageRef}>
        {mascot === 'faces' ? (
          <div className="pixel-stage">
            {botId === 'gface'
              ? <div className="face-area"><GFace state={state} /></div>
              : <DiceBearMascot state={state} bot={bot} />}
            <div className="species faces-picker" role="radiogroup" aria-label="Robot face">
              <button role="radio" aria-checked={botId === 'gface'}
                className={botId === 'gface' ? 'active' : ''} onClick={() => setBotId('gface')}>
                <div className="face-thumb"><GFace /></div>
                <span>G-Face</span>
              </button>
              {DICEBEAR_BOTS.map((b) => (
                <button key={b.id} role="radio" aria-checked={b.id === botId}
                  className={b.id === botId ? 'active' : ''} onClick={() => setBotId(b.id)}>
                  <img className="emoji-thumb" src={botSvg(b)} alt="" />
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : mascot === 'emoji' ? (
          <div className="pixel-stage">
            <EmojiMascot state={state} set={emojiSet} />
            <div className="species" role="radiogroup" aria-label="Emoji set">
              {EMOJI_SETS.map((s) => (
                <button key={s.id} role="radio" aria-checked={s.id === emojiSet.id}
                  className={s.id === emojiSet.id ? 'active' : ''} onClick={() => setEmojiSetId(s.id)}>
                  <img className="emoji-thumb" src={emojiUrl(s.idle)} alt="" width={56} height={56} />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : mascot === 'kenney' ? (
          <div className="pixel-stage">
            <KenneyMascot state={state} color={kenneyColor} />
            <div className="species" role="radiogroup" aria-label="Robot color">
              {KENNEY_COLORS.map((c) => (
                <button key={c} role="radio" aria-checked={c === kenneyColor}
                  className={c === kenneyColor ? 'active' : ''} onClick={() => setKenneyColor(c)}>
                  <img className="emoji-thumb" src={`/kenney/robot_${c}Body.png`} alt="" />
                  <span>{c}</span>
                </button>
              ))}
            </div>
          </div>
        ) : mascot === 'pixel' ? (
          <div className="pixel-stage">
            <PixelMascot state={state} species={species} color={pixelColor} />
            <div className="species" role="radiogroup" aria-label="Alien type">
              {SPECIES.map((s) => (
                <button key={s.id} role="radio" aria-checked={s.id === species.id} title={s.name}
                  className={s.id === species.id ? 'active' : ''}
                  onClick={() => { setSpeciesId(s.id); setPixelColor(null) }}>
                  <PixelMascot species={s} className="pixel-thumb" />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
            <div className="swatches" aria-label="Alien color">
              {PIXEL_COLORS.map((c) => (
                <button key={c} aria-label={`Color ${c}`} style={{ background: c }}
                  className={c === (pixelColor ?? species.color) ? 'active' : ''} onClick={() => setPixelColor(c)} />
              ))}
            </div>
          </div>
        ) : (
        <Canvas shadows camera={{ position: [0, 1.2, 5.5], fov: 40 }}>
          <hemisphereLight args={['#ffffff', '#8d8d8d', mascot === 'gbot' ? 0.8 : 2]} />
          <directionalLight position={[3, 6, 4]} intensity={mascot === 'gbot' ? 1.6 : 2.5} castShadow />
          {mascot === 'gbot' && <StudioLights />}
          <Suspense fallback={null}>
            {mascot === 'robo'
              ? <Mascot state={state} position={[0, -1.6, 0]} scale={0.65} />
              : <GoogleBot state={state} position={[0, -1.6, 0]} scale={0.95} />}
          </Suspense>
          <ContactShadows position={[0, -1.6, 0]} opacity={0.35} scale={8} blur={2.5} />
          <OrbitControls enablePan={false} enableZoom={false} target={[0, 0.4, 0]}
            minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 2} />
          <EffectComposer>
            <Bloom mipmapBlur luminanceThreshold={1} intensity={0.7} radius={0.6} />
          </EffectComposer>
        </Canvas>
        )}
        {state === 'celebration' && !(mascot === 'faces' && botId === 'gface') && <Confetti />}
        <button className="tv-btn" onClick={toggleTv} title="Fullscreen TV view (keys 1 / 2 / 3 switch states)">
          TV view
        </button>
      </div>

      <nav className="controls">
        {STATES.map((s) => (
          <button
            key={s.id}
            className={s.id === state ? 'active' : ''}
            style={{ '--c': s.color }}
            onClick={() => setState(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <footer>
        {mascot === 'faces'
          ? (botId === 'gface' ? GFACE_CREDIT : DICEBEAR_CREDIT)
          : MASCOTS.find((m) => m.id === mascot).credit}
      </footer>
    </main>
  )
}
