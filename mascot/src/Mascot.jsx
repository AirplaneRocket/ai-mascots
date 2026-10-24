import { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const MODEL_URL = '/models/RobotExpressive.glb'

// Each mascot state is a short sequence of clips. One-shot clips play once,
// and the last step loops until the state changes.
const STATES = {
  idle: { steps: ['Wave', 'Idle'], face: {} },
  mocking: { steps: ['No'], face: { Angry: 0.7 } },
  celebration: { steps: ['Jump', 'ThumbsUp', 'Dance'], face: { Surprised: 0.5 } },
}

export default function Mascot({ state = 'idle', ...props }) {
  const group = useRef()
  const { scene, animations } = useGLTF(MODEL_URL)
  const { actions, mixer } = useAnimations(animations, group)
  const face = useRef(null)
  const faceTarget = useRef({})

  // Find the head mesh that holds the expression morph targets.
  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) o.castShadow = true
      if (o.morphTargetDictionary && 'Angry' in o.morphTargetDictionary) face.current = o
    })
  }, [scene])

  useEffect(() => {
    const { steps, face: expr } = STATES[state] ?? STATES.idle
    faceTarget.current = expr
    let current = null
    let index = 0

    const play = (i) => {
      const action = actions[steps[i]]
      if (!action) return
      const isLast = i === steps.length - 1
      action.reset()
      action.setLoop(isLast ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
      action.clampWhenFinished = !isLast
      if (current && current !== action) current.fadeOut(0.35)
      action.fadeIn(0.35).play()
      current = action
    }

    const onFinished = (e) => {
      if (e.action !== current || index >= steps.length - 1) return
      index += 1
      play(index)
    }

    // Fade out whatever was playing before this state.
    Object.values(actions).forEach((a) => a?.fadeOut(0.35))
    play(0)
    mixer.addEventListener('finished', onFinished)
    return () => mixer.removeEventListener('finished', onFinished)
  }, [state, actions, mixer])

  // Ease facial expressions toward the target each frame.
  useFrame((_, dt) => {
    const head = face.current
    if (!head) return
    for (const [name, idx] of Object.entries(head.morphTargetDictionary)) {
      const target = faceTarget.current[name] ?? 0
      const cur = head.morphTargetInfluences[idx]
      head.morphTargetInfluences[idx] = THREE.MathUtils.damp(cur, target, 8, dt)
    }
  })

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(MODEL_URL)
