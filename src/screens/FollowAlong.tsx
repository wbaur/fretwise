import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { ChordDiagram } from '../components/visuals'
import { Metronome } from '../core/audio/metronome'
import { followAlongs } from '../core/data'
import { CHORDS } from '../core/data/chords'
import { addPractice } from '../core/progress'
import './learn.css'
import './follow.css'

const MIN_BPM = 40
const MAX_BPM = 160

export default function FollowAlong() {
  const { id } = useParams()
  const fa = followAlongs.find((f) => f.id === id)
  const metro = useRef(new Metronome(fa?.bpm ?? 60)).current
  const [bpm, setBpm] = useState(fa?.bpm ?? 60)
  const [running, setRunning] = useState(false)
  const [pos, setPos] = useState(-4) // beats; negative = count-in
  const startedAt = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    metro.subdivide = fa?.strum === 'down-up'
  }, [metro, fa])

  // Animation: read the metronome position every frame
  useEffect(() => {
    if (!running) return
    let raf = 0
    const loop = () => {
      setPos(metro.position())
      if (startedAt.current) setElapsed((Date.now() - startedAt.current) / 1000)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running, metro])

  // Stop + count practice time when leaving
  useEffect(() => () => {
    metro.stop()
    if (startedAt.current) addPractice((Date.now() - startedAt.current) / 1000)
  }, [metro])

  if (!fa) return <main className="page"><PageHeader title="Not found" back="/follow" /><Link to="/follow">Back</Link></main>

  const toggle = async () => {
    if (running) {
      metro.stop()
      setRunning(false)
      if (startedAt.current) addPractice((Date.now() - startedAt.current) / 1000)
      startedAt.current = null
      setPos(-4)
    } else {
      await metro.start()
      startedAt.current = Date.now()
      setElapsed(0)
      setRunning(true)
    }
  }

  const changeBpm = (delta: number) => {
    const v = Math.max(MIN_BPM, Math.min(MAX_BPM, bpm + delta))
    setBpm(v)
    metro.setBpm(v)
  }

  const counting = running && pos < 0
  const beat = Math.max(0, pos)
  const chordIdx = Math.floor(beat / fa.beatsPerChord) % fa.chords.length
  const current = fa.chords[chordIdx]
  const nextChord = fa.chords[(chordIdx + 1) % fa.chords.length]
  const beatInBar = running ? Math.floor(((pos % 4) + 4) % 4) : -1
  const beatsLeft = fa.beatsPerChord - Math.floor(beat % fa.beatsPerChord)
  const eighth = running && !counting ? Math.floor((((pos * 2) % 8) + 8) % 8) : -1
  const changes = running && !counting ? Math.floor(beat / fa.beatsPerChord) : 0
  const strokes = fa.strum === 'down-up' ? ['↓', '↑', '↓', '↑', '↓', '↑', '↓', '↑'] : ['↓', '↓', '↓', '↓']
  const counts = fa.strum === 'down-up' ? ['1', '&', '2', '&', '3', '&', '4', '&'] : ['1', '2', '3', '4']
  const activeStroke = fa.strum === 'down-up' ? eighth : (running && !counting ? beatInBar : -1)

  return (
    <main className="page learn-page">
      <PageHeader title={fa.title} subtitle={fa.summary} back="/follow" />

      <section className="step-card follow-card">
        <div className="follow-chords">
          <div className="follow-current">
            <ChordDiagram name={current} size={160} showName={false} />
            <div className="follow-name">{CHORDS[current]?.name}</div>
          </div>
          {fa.chords.length > 1 && (
            <div className="follow-next">
              <span className="muted">Next</span>
              <ChordDiagram name={nextChord} size={80} showName={false} />
              <b>{nextChord}</b>
              {running && !counting && beatsLeft <= 2 && <span className="get-ready">Get ready!</span>}
            </div>
          )}
        </div>

        <div className={`follow-status ${counting ? 'counting' : ''}`}>
          {!running ? 'Press Start, then strum along with the clicks' : counting ? `Get ready… ${Math.ceil(-pos)}` : `Strum ${current}`}
        </div>

        <div className="beat-lights" aria-hidden="true">
          {[0, 1, 2, 3].map((b) => <span key={b} className={b === beatInBar ? (counting ? 'on count' : 'on') : ''}>{b + 1}</span>)}
        </div>

        <div className={`strum-row ${fa.strum}`} aria-label="Strum pattern">
          {strokes.map((s, i) => (
            <div key={i} className={`stroke ${i === activeStroke ? 'on' : ''}`}>
              <span className="arrow">{s}</span>
              <span className="count">{counts[i]}</span>
            </div>
          ))}
        </div>

        <div className="follow-controls">
          <button className="icon-btn" onClick={() => changeBpm(-5)} aria-label="Slower">−</button>
          <div className="bpm"><b>{bpm}</b><span className="muted">BPM</span></div>
          <button className="icon-btn" onClick={() => changeBpm(5)} aria-label="Faster">+</button>
        </div>

        <button className={`btn follow-start ${running ? 'btn-ghost' : ''}`} onClick={toggle}>{running ? 'Stop' : 'Start'}</button>

        {running && (
          <p className="muted follow-stats">
            {Math.floor(elapsed / 60)}:{String(Math.floor(elapsed % 60)).padStart(2, '0')}
            {fa.chords.length > 1 && ` · ${changes} chord change${changes === 1 ? '' : 's'}`}
          </p>
        )}
        <p className="step-tip">💡 {fa.tip}</p>
      </section>
    </main>
  )
}
