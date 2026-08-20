// Génère une couleur déterministe à partir du code du set (même code =
// toujours la même couleur, sans avoir à maintenir une table manuelle).
function hashToHue(code: string): number {
  let hash = 0
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

type SetBadgeProps = {
  code: string
  name: string
  className?: string
}

export function SetBadge({ code, name, className = '' }: SetBadgeProps) {
  const hue = hashToHue(code)
  const background = `hsl(${hue}, 35%, 18%)`
  const accent = `hsl(${hue}, 55%, 78%)`

  return (
    <div
      className={`relative flex aspect-video flex-col justify-between overflow-hidden rounded-md p-3 ${className}`}
      style={{ background }}
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="absolute -right-3 -top-3 h-20 w-20 opacity-30"
      >
        <polygon
          points="50,5 90,35 75,90 25,90 10,35"
          fill="none"
          stroke={accent}
          strokeWidth={3}
        />
        <polygon points="50,25 72,42 63,78 37,78 28,42" fill={accent} opacity={0.4} />
      </svg>
      <span
        className="text-[11px] font-semibold tracking-wide"
        style={{ color: accent }}
      >
        {code}
      </span>
      <span className="text-sm font-medium text-zinc-50">{name}</span>
    </div>
  )
}