import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { playPluck, resumeAudio } from '../core/audio/audio'
import { midiToFreq, midiToName, OPEN_STRING_MIDI } from '../core/music'
import { PageHeader } from '../components/ui'
import { useMic } from '../useMic'
import './tuner.css'

/** Strings shown left→right as on a tuner: low E … high E. */
const TUNER_STRINGS = [5, 4, 3, 2, 1, 0].map((s) => ({
  string: s,
  midi: OPEN_STRING_MIDI[s],
  label: midiToName(OPEN_STRING_MIDI[s]),
  number: s + 1,
}))

const IN_TUNE_CENTS = 5
const HOLD_TO_CONFIRM_SEC = 0.8

interface Reading {
  freq: number
  midiExact: number
  target: number
  cents: number
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

export default function Tuner() {
  const { mic, status, error, start } = useMic()
  const [selected, setSelected] = useState<number | 'auto'>('auto')
  const [reading, setReading] = useState<Reading | null>(null)
  const [tuned, setTuned] = useState<Set<number>>(new Set())
  const [inTuneFor, setInTuneFor] = useState(0)
  const selRef = useRef(selected)
  selRef.current = selected

  useEffect(() => {
    if (status !== 'on') return
    let raf = 0
    const history: number[] = []
    let lastHeard = 0
    let goodSince: number | null = null
    let last = performance.now()
    const loop = (t: number) => {
      const dt = (t - last) / 1000
      last = t
      const f = mic.read()
      if (f && f.midiExact !== null && f.freq) {
        history.push(f.midiExact)
        if (history.length > 5) history.shift()
        lastHeard = t
        const m = median(history)
        const sel = selRef.current
        const target =
          sel === 'auto'
            ? TUNER_STRINGS.reduce((best, s) => (Math.abs(s.midi - m) < Math.abs(best.midi - m) ? s : best)).midi
            : OPEN_STRING_MIDI[sel]
        const cents = (m - target) * 100
        setReading({ freq: midiToFreq(m), midiExact: m, target, cents })
        if (Math.abs(cents) <= IN_TUNE_CENTS) {
          goodSince = goodSince ?? t
          const held = (t - goodSince) / 1000
          setInTuneFor(held)
          if (held >= HOLD_TO_CONFIRM_SEC) {
            const s = TUNER_STRINGS.find((x) => x.midi === target)
            if (s) setTuned((prev) => (prev.has(s.string) ? prev : new Set(prev).add(s.string)))
          }
        } else {
          goodSince = null
          setInTuneFor(0)
        }
      } else if (t - lastHeard > 700) {
        history.length = 0
        goodSince = null
        setReading(null)
        setInTuneFor(0)
      }
      void dt
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [status, mic])

  const playReference = async (midi: number) => {
    const ctx = await resumeAudio()
    playPluck(midi, ctx.currentTime + 0.02, 1.5, 0.5)
  }

  const cents = reading ? Math.max(-50, Math.min(50, reading.cents)) : 0
  const inTune = reading !== null && Math.abs(reading.cents) <= IN_TUNE_CENTS
  const targetString = reading ? TUNER_STRINGS.find((s) => s.midi === reading.target) : undefined
  let advice = 'Pluck one string and let it ring'
  if (reading) {
    if (inTune) advice = inTuneFor >= HOLD_TO_CONFIRM_SEC ? 'In tune! ✓' : 'Almost… hold it'
    else if (reading.cents < -50) advice = 'Much too low: tighten the string'
    else if (reading.cents > 50) advice = 'Much too high: loosen the string'
    else if (reading.cents < 0) advice = 'A bit low: tighten slowly ↑'
    else advice = 'A bit high: loosen slowly ↓'
  }

  return (
    <main className="page tuner-page">
      <PageHeader title="Tuner" subtitle="Standard tuning: E A D G B E" />

      {status !== 'on' ? (
        <section className="tuner-card tuner-start">
          <div className="tuner-big-icon">🎙️</div>
          <h2>Let Fretwise hear your guitar</h2>
          <p className="muted">Your browser will ask to use the microphone. Sound is only analysed on this device. Nothing is recorded or uploaded.</p>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" onClick={start} disabled={status === 'starting'}>
            {status === 'starting' ? 'Starting…' : 'Turn on microphone'}
          </button>
        </section>
      ) : (
        <section className={`tuner-card ${inTune ? 'in-tune' : ''} ${reading ? '' : 'idle'}`}>
          <div className="tuner-note">
            {reading ? midiToName(Math.round(reading.midiExact)) : '–'}
            {reading && <span className="tuner-octave">{Math.floor(Math.round(reading.midiExact) / 12) - 1}</span>}
          </div>
          <Gauge cents={cents} active={!!reading} inTune={inTune} />
          <div className="tuner-advice">{advice}</div>
          <div className="tuner-detail muted">
            {reading
              ? <>Target: string {targetString?.number} ({targetString?.label}) · {reading.freq.toFixed(1)} Hz · {reading.cents > 0 ? '+' : ''}{Math.round(reading.cents)} cents</>
              : <>Listening…</>}
          </div>
        </section>
      )}

      <section className="tuner-strings" aria-label="Choose a string">
        <button className={`string-chip auto ${selected === 'auto' ? 'selected' : ''}`} onClick={() => setSelected('auto')}>
          Auto
        </button>
        {TUNER_STRINGS.map((s) => (
          <button key={s.string}
            className={`string-chip ${selected === s.string ? 'selected' : ''} ${tuned.has(s.string) ? 'done' : ''} ${targetString?.string === s.string ? 'hearing' : ''}`}
            onClick={() => { setSelected(s.string); playReference(s.midi) }}
            title={`String ${s.number} (${s.label}). Tap to hear it`}>
            <span className="chip-note">{s.label}</span>
            <span className="chip-num">{tuned.has(s.string) ? '✓' : s.number}</span>
          </button>
        ))}
      </section>
      <p className="muted tuner-help">
        Tap a string to lock the tuner to it and hear what it should sound like. Tuned strings get a ✓.
        Thickest string (6) is low E. <Link to="/mic-setup">Mic setup &amp; latency →</Link>
      </p>
    </main>
  )
}

function Gauge({ cents, active, inTune }: { cents: number; active: boolean; inTune: boolean }) {
  const angle = (cents / 50) * 60 // ±50 cents → ±60°
  const ticks = []
  for (let c = -50; c <= 50; c += 10) {
    const a = ((c / 50) * 60 - 90) * (Math.PI / 180)
    const r1 = c === 0 ? 70 : 76
    ticks.push(
      <line key={c} x1={100 + Math.cos(a) * r1} y1={100 + Math.sin(a) * r1} x2={100 + Math.cos(a) * 86} y2={100 + Math.sin(a) * 86}
        stroke="currentColor" strokeWidth={c === 0 ? 4 : 2} strokeLinecap="round" opacity={c === 0 ? 0.9 : 0.35} />,
    )
  }
  return (
    <svg className="tuner-gauge" viewBox="0 10 200 110" aria-hidden="true">
      <path d="M 25.4 57 A 86 86 0 0 1 174.6 57" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="18" strokeLinecap="round" />
      <path d="M 91 14.5 A 86 86 0 0 1 109 14.5" fill="none" stroke="var(--good)" strokeOpacity={inTune ? 1 : 0.45} strokeWidth="18" />
      {ticks}
      <text x="22" y="112" fontSize="11" fill="currentColor" opacity=".6">♭ low</text>
      <text x="178" y="112" fontSize="11" fill="currentColor" opacity=".6" textAnchor="end">high ♯</text>
      <g transform={`rotate(${active ? angle : 0} 100 100)`}>
        <line x1="100" y1="100" x2="100" y2="22" stroke={inTune ? 'var(--good)' : 'var(--brand)'} strokeWidth="5" strokeLinecap="round" opacity={active ? 1 : 0.3} />
      </g>
      <circle cx="100" cy="100" r="9" fill={inTune ? 'var(--good)' : 'var(--brand)'} />
    </svg>
  )
}
