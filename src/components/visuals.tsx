// Small music visuals used by lessons and quizzes: chord diagrams, a mini
// fretboard (optionally tappable), tab, and rhythm notation.
import { CHORDS } from '../core/data/chords'
import type { NoteValue, Spot, Visual } from '../core/quiz'
import './visuals.css'

const INK = 'var(--text)'

export function ChordDiagram({ name, size = 150, showName = true }: { name: string; size?: number; showName?: boolean }) {
  const chord = CHORDS[name]
  if (!chord) return null
  const frets = 4
  const x = (i: number) => 22 + i * 17
  const y = (f: number) => 34 + f * 26
  return (
    <svg className="chord-diagram" width={size} height={size * 1.3} viewBox="0 0 129 168" role="img" aria-label={`${chord.fullName} chord diagram`}>
      {/* frets */}
      {Array.from({ length: frets + 1 }, (_, f) => (
        <line key={f} x1={x(0)} x2={x(5)} y1={y(f)} y2={y(f)} stroke={INK} strokeWidth={f === 0 ? 5 : 1.5} strokeLinecap="round" opacity={f === 0 ? 1 : 0.5} />
      ))}
      {/* strings */}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1={x(i)} x2={x(i)} y1={y(0)} y2={y(frets)} stroke={INK} strokeWidth={1 + (5 - i) * 0.25} opacity={0.7} />
      ))}
      {chord.frets.map((f, i) =>
        f < 0 ? (
          <text key={i} x={x(i)} y={24} textAnchor="middle" fontSize="13" fontWeight="900" fill="#c92a4b">✕</text>
        ) : f === 0 ? (
          <circle key={i} cx={x(i)} cy={20} r={5} fill="none" stroke={INK} strokeWidth={2} />
        ) : (
          <g key={i}>
            <circle cx={x(i)} cy={y(f - 0.5)} r={8} fill="var(--brand)" />
            <text x={x(i)} y={y(f - 0.5) + 4.5} textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">{chord.fingers[i]}</text>
          </g>
        ),
      )}
      {showName && <text x={64.5} y={162} textAnchor="middle" fontSize="16" fontWeight="900" fill={INK}>{chord.name}</text>}
    </svg>
  )
}

const STRING_LETTERS = ['e', 'B', 'G', 'D', 'A', 'E']

export interface FretboardProps {
  maxFret: number
  marks?: Spot[]
  labelStrings?: boolean
  onTap?: (s: Spot) => void
  /** Highlight a tapped spot as right/wrong. */
  result?: { spot: Spot; correct: boolean } | null
  /** Reveal the right answer(s). */
  reveal?: Spot[]
}

export function MiniFretboard({ maxFret, marks = [], labelStrings = true, onTap, result, reveal = [] }: FretboardProps) {
  const labelW = labelStrings ? 24 : 4
  const openW = 44
  const fretW = 58
  const gap = 26
  const top = 16
  const nutX = labelW + openW
  const width = nutX + maxFret * fretW + 12
  const height = top + gap * 5 + 34
  const sy = (s: number) => top + s * gap
  const cx = (f: number) => (f === 0 ? labelW + openW / 2 : nutX + (f - 0.5) * fretW)
  const Dot = ({ s, color, label, ring }: { s: Spot; color: string; label?: string; ring?: boolean }) => (
    <g pointerEvents="none">
      <circle cx={cx(s.fret)} cy={sy(s.string)} r={11} fill={ring ? 'none' : color} stroke={color} strokeWidth={ring ? 3 : 0} />
      {label && <text x={cx(s.fret)} y={sy(s.string) + 4.5} textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">{label}</text>}
    </g>
  )
  return (
    <svg className={`mini-fretboard ${onTap ? 'tappable' : ''}`} viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: width * 1.6 }}
      role="img" aria-label="Fretboard">
      <rect x={nutX} y={top - 10} width={maxFret * fretW + 4} height={gap * 5 + 20} rx={6} fill="#3a3550" />
      {Array.from({ length: maxFret }, (_, i) => i + 1).map((f) => (
        <g key={f}>
          <line x1={nutX + f * fretW} x2={nutX + f * fretW} y1={top - 10} y2={top + gap * 5 + 10} stroke="#b9b4c9" strokeWidth={2} />
          {[3, 5, 7, 9].includes(f) && <circle cx={nutX + (f - 0.5) * fretW} cy={top + gap * 2.5} r={5} fill="#5a5470" />}
          <text x={nutX + (f - 0.5) * fretW} y={height - 6} textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--muted)">{f}</text>
        </g>
      ))}
      <text x={labelW + openW / 2} y={height - 6} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--muted)">open</text>
      <rect x={nutX - 3} y={top - 10} width={6} height={gap * 5 + 20} rx={2} fill="#efe9dc" />
      {STRING_LETTERS.map((l, s) => (
        <g key={s}>
          <line x1={labelW + 4} x2={width - 8} y1={sy(s)} y2={sy(s)} stroke={s >= 3 ? '#c7a56a' : '#a8acb8'} strokeWidth={1.2 + s * 0.5} />
          {labelStrings && <text x={labelW - 8} y={sy(s) + 4.5} textAnchor="end" fontSize="13" fontWeight="900" fill={INK}>{l}</text>}
        </g>
      ))}
      {onTap &&
        Array.from({ length: 6 }, (_, s) =>
          Array.from({ length: maxFret + 1 }, (_, f) => (
            <rect key={`${s}-${f}`} className="tap-cell" x={f === 0 ? labelW : nutX + (f - 1) * fretW} y={sy(s) - gap / 2}
              width={f === 0 ? openW - 3 : fretW} height={gap} onClick={() => onTap({ string: s, fret: f })}>
              <title>{`String ${s + 1}, ${f === 0 ? 'open' : `fret ${f}`}`}</title>
            </rect>
          )),
        )}
      {marks.map((m, i) => <Dot key={i} s={m} color="var(--brand)" label={m.label} />)}
      {reveal.map((m, i) => <Dot key={`r${i}`} s={m} color="var(--good)" ring />)}
      {result && <Dot s={result.spot} color={result.correct ? 'var(--good)' : '#e5484d'} label={result.correct ? '✓' : '✕'} />}
    </svg>
  )
}

export function TabView({ columns }: { columns: Spot[][] }) {
  const gap = 18
  const top = 14
  const colW = 40
  const width = Math.max(220, 40 + columns.length * colW + 30)
  return (
    <svg className="tab-view" viewBox={`0 0 ${width} ${top + gap * 5 + 14}`} style={{ maxWidth: width * 1.5 }} role="img" aria-label="Guitar tab">
      <text x={4} y={top + gap * 2.5 - 6} fontSize="13" fontWeight="900" fill="var(--muted)">T</text>
      <text x={4} y={top + gap * 2.5 + 8} fontSize="13" fontWeight="900" fill="var(--muted)">A</text>
      <text x={4} y={top + gap * 2.5 + 22} fontSize="13" fontWeight="900" fill="var(--muted)">B</text>
      {STRING_LETTERS.map((l, s) => (
        <g key={s}>
          <text x={26} y={top + s * gap + 4.5} textAnchor="end" fontSize="12" fontWeight="800" fill={INK}>{l}</text>
          <line x1={32} x2={width - 6} y1={top + s * gap} y2={top + s * gap} stroke={INK} strokeWidth={1.3} opacity={0.55} />
        </g>
      ))}
      <line x1={32} x2={32} y1={top} y2={top + gap * 5} stroke={INK} strokeWidth={2} opacity={0.55} />
      {columns.map((col, c) =>
        col.map((spot, i) => {
          const x = 32 + 28 + c * colW
          const y = top + spot.string * gap
          return (
            <g key={`${c}-${i}`}>
              <rect x={x - 9} y={y - 9} width={18} height={18} fill="var(--surface)" />
              <text x={x} y={y + 5} textAnchor="middle" fontSize="15" fontWeight="900" fill="var(--brand)">{spot.fret}</text>
            </g>
          )
        }),
      )}
    </svg>
  )
}

function NoteGlyph({ value, x }: { value: NoteValue; x: number }) {
  const filled = value === 'quarter' || value === 'eighth'
  const headY = 52
  return (
    <g>
      <ellipse cx={x} cy={headY} rx={9} ry={6.5} transform={`rotate(-20 ${x} ${headY})`}
        fill={filled ? INK : 'none'} stroke={INK} strokeWidth={value === 'whole' ? 3 : 2.4} />
      {value !== 'whole' && <line x1={x + 8} x2={x + 8} y1={headY - 2} y2={headY - 40} stroke={INK} strokeWidth={2.4} />}
      {value === 'eighth' && <path d={`M ${x + 8} ${headY - 40} q 4 12 14 16 q -6 -2 -14 -6`} fill={INK} stroke={INK} strokeWidth={2} />}
    </g>
  )
}

export function RhythmRow({ notes }: { notes: NoteValue[] }) {
  const step = 44
  const width = Math.max(80, 30 + notes.length * step)
  return (
    <svg className="rhythm-row" viewBox={`0 0 ${width} 70`} style={{ maxWidth: width * 1.5 }} role="img" aria-label={`Rhythm: ${notes.join(', ')} notes`}>
      <line x1={4} x2={width - 4} y1={52} y2={52} stroke={INK} strokeWidth={1.2} opacity={0.3} />
      {notes.map((n, i) => <NoteGlyph key={i} value={n} x={26 + i * step} />)}
    </svg>
  )
}

export function VisualView({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case 'chord':
      return <ChordDiagram name={visual.name} />
    case 'fretboard':
      return <MiniFretboard maxFret={visual.maxFret ?? 5} marks={visual.marks} labelStrings={visual.labelStrings ?? true} />
    case 'tab':
      return <TabView columns={visual.columns} />
    case 'rhythm':
      return <RhythmRow notes={visual.notes} />
    case 'emoji':
      return <div className="visual-emoji" aria-hidden="true">{visual.text}</div>
  }
}
