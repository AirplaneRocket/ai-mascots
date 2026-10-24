import { useEffect } from 'react'

// Google Noto Animated Emoji (CC BY 4.0), served from Google Fonts' CDN.
// https://googlefonts.github.io/noto-emoji-animation/
const url = (code) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.webp`

export const EMOJI_SETS = [
  { id: 'robot', name: 'Robot', idle: '1f916', mocking: '1f61c', celebration: '1f973' },
  { id: 'smirk', name: 'Smirk', idle: '1f642', mocking: '1f60f', celebration: '1f929' },
  { id: 'cool', name: 'Cool', idle: '1f60e', mocking: '1f92a', celebration: '1f389' },
  { id: 'alien', name: 'Alien', idle: '1f47e', mocking: '1f61d', celebration: '1f973' },
  // Treasure-hunt sets
  { id: 'hunter', name: 'Hunter', idle: '1f9d0', mocking: '1f92d', celebration: '1f911' },
  { id: 'chest', name: 'Chest', idle: '1fa8e', mocking: '1f92b', celebration: '1f48e' },
  { id: 'loot', name: 'Loot', idle: '1f50e', mocking: '1f644', celebration: '1fa99' },
]

export default function EmojiMascot({ state = 'idle', set = EMOJI_SETS[0] }) {
  // Preload all three states so switching is instant.
  useEffect(() => {
    for (const s of ['idle', 'mocking', 'celebration']) new Image().src = url(set[s])
  }, [set])

  return (
    <img
      key={`${set.id}-${state}`}
      className="emoji-mascot"
      src={url(set[state])}
      alt={`${set.name} emoji, ${state}`}
      width={512}
      height={512}
    />
  )
}

export { url as emojiUrl }
