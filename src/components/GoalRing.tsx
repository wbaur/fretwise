/** Circular progress ring for the daily practice goal. */
export function GoalRing({ fraction, size = 64, stroke = 8, children }: {
  fraction: number; size?: number; stroke?: number; children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const f = Math.max(0, Math.min(1, fraction))
  return (
    <div className="goal-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={f >= 1 ? 'var(--good)' : 'currentColor'} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - f)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .5s' }} />
      </svg>
      <div className="goal-ring-label">{children}</div>
    </div>
  )
}
