const COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853']

// Lightweight CSS confetti in Google colors.
const PIECES = Array.from({ length: 60 }, (_, i) => ({
  left: Math.random() * 100,
  delay: Math.random() * 1.2,
  duration: 2.2 + Math.random() * 1.6,
  color: COLORS[i % COLORS.length],
  size: 6 + Math.random() * 6,
  round: Math.random() > 0.5,
}))

export default function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.8,
            background: p.color,
            borderRadius: p.round ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
