import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getAudioContext, resumeAudio } from '../core/audio/audio'
import { NoteDetector } from '../core/audio/mic'
import { AudioScheduler } from '../core/audio/scheduler'
import { getSong } from '../core/data'
import { MAX_MULTIPLIER, octaveTolerant, PlaySession, type SessionResults } from '../core/engine'
import { midiToName, STRING_NAMES } from '../core/music'
import { useMic } from '../useMic'
import { addPractice, getProgress, recordScore, updateSettings } from '../core/progress'
import type { Settings, Song } from '../core/types'
import { useProgress } from '../useProgress'
import { Confetti } from '../components/Confetti'
import { FretboardRenderer } from './renderer'
import './play.css'

type Phase = 'ready' | 'playing' | 'paused' | 'finished'

export default function PlayScreen() {
  const { id } = useParams()
  const song = id ? getSong(id) : undefined
  if (!song) {
    return (
      <main className="page">
        <p>Song not found. <Link to="/songs">Back to songs</Link></p>
      </main>
    )
  }
  return <PlayAlong key={song.id} song={song} />
}

function useSession(session: PlaySession) {
  // Re-render HUD when the score/streak changes (not every frame).
  return useSyncExternalStore(
    useCallback((fn) => session.subscribe(fn), [session]),
    () => `${session.score}|${session.streak}|${session.finished}|${session.waiting}`,
  )
}

function PlayAlong({ song }: { song: Song }) {
  const navigate = useNavigate()
  const progress = useProgress()
  const settings = progress.settings
  const best = progress.bestScores[song.id] ?? 0

  const [session, setSession] = useState(() => new PlaySession(song, { speed: settings.speed, waitMode: settings.waitMode }))
  const [phase, setPhase] = useState<Phase>('ready')
  const [showSettings, setShowSettings] = useState(false)
  const [results, setResults] = useState<SessionResults | null>(null)
  const [newBest, setNewBest] = useState(false)
  const [rotateDismissed, setRotateDismissed] = useState(false)
  useSession(session)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const meterRef = useRef<HTMLDivElement>(null)
  const heardRef = useRef<HTMLSpanElement>(null)
  const scheduler = useRef(new AudioScheduler()).current
  const { mic, status: micStatus, error: micError, start: startMic, stop: stopMic } = useMic()
  const detector = useRef(new NoteDetector()).current

  // Live values the animation loop reads without re-subscribing.
  const live = useRef({ phase, session, settings, lastFrame: performance.now(), meter: 0 })
  live.current.phase = phase
  live.current.session = session
  live.current.settings = settings

  const finish = useCallback((s: PlaySession) => {
    scheduler.reset()
    const r = s.results()
    setResults(r)
    if (!s.isPractice) {
      const prevBest = getProgress().bestScores[song.id] ?? 0
      setNewBest(r.score > 0 && r.score > prevBest)
      recordScore(song.id, r.score, r.stars)
    }
    addPractice(s.elapsed)
    s.elapsed = 0 // counted
    setPhase('finished')
  }, [scheduler, song.id])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current!
    const renderer = new FretboardRenderer(canvas)
    const ro = new ResizeObserver(() => renderer.resize())
    ro.observe(canvas)
    let raf = 0
    const loop = (t: number) => {
      const L = live.current
      const dt = Math.min(0.1, (t - L.lastFrame) / 1000)
      L.lastFrame = t
      const s = L.session
      // Microphone: meter, "hearing" label, and note detection
      const f = mic.active ? mic.read() : null
      if (f) {
        L.meter = Math.max(L.meter, f.level)
        const name = f.midi !== null ? midiToName(f.midi) : ''
        if (heardRef.current && heardRef.current.textContent !== name) heardRef.current.textContent = name
        const onset = detector.push(f)
        if (onset && L.phase === 'playing') {
          const lag = getAudioContext().currentTime - onset.time + L.settings.latencyMs / 1000
          s.hit(onset.midi, lag, octaveTolerant)
        }
      }
      if (L.phase === 'playing') {
        s.update(dt)
        scheduler.tick(s, { metronome: L.settings.metronome, guideNotes: L.settings.guideNotes })
        if (s.finished) finish(s)
      }
      renderer.draw(s, {
        leftHanded: L.settings.leftHanded,
        bottomInset: barRef.current?.offsetHeight ?? 64,
        time: t / 1000,
      })
      if (fillRef.current) {
        const pct = Math.max(0, Math.min(1, s.beat / s.song.lengthBeats)) * 100
        fillRef.current.style.width = `${pct}%`
      }
      L.meter *= 0.9
      if (meterRef.current) meterRef.current.style.height = `${Math.round(L.meter * 100)}%`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      scheduler.reset()
    }
  }, [scheduler, finish])

  // Count unfinished practice time when leaving the screen.
  useEffect(() => () => {
    const s = live.current.session
    if (!s.finished && s.elapsed > 5) addPractice(s.elapsed)
  }, [])

  const start = useCallback(async () => {
    await resumeAudio()
    if (live.current.settings.micEnabled && !mic.active) await startMic()
    live.current.lastFrame = performance.now()
    setPhase('playing')
  }, [mic, startMic])

  const pause = useCallback(() => {
    if (live.current.phase !== 'playing') return
    scheduler.reset(live.current.session)
    setPhase('paused')
  }, [scheduler])

  const restart = useCallback((startBeat = 0) => {
    scheduler.reset()
    const old = live.current.session
    if (!old.finished && old.elapsed > 0) addPractice(old.elapsed)
    const s = new PlaySession(song, { speed: settings.speed, waitMode: settings.waitMode, startBeat })
    setSession(s)
    live.current.session = s
    setResults(null)
    setNewBest(false)
    setPhase('ready')
  }, [scheduler, song, settings.speed, settings.waitMode])

  const playNote = useCallback(() => {
    const L = live.current
    if (L.phase !== 'playing') return
    L.meter = 1
    const sinceFrame = (performance.now() - L.lastFrame) / 1000
    L.session.hit(undefined, -sinceFrame)
  }, [])

  const changeSettings = useCallback((patch: Partial<Settings>) => {
    updateSettings(patch)
    const s = live.current.session
    if (patch.speed !== undefined) {
      s.speed = patch.speed
      scheduler.reset(s)
    }
    if (patch.waitMode !== undefined) s.waitMode = patch.waitMode
    if (patch.metronome !== undefined || patch.guideNotes !== undefined) scheduler.reset(s)
    if (patch.micEnabled === true) startMic()
    if (patch.micEnabled === false) stopMic()
  }, [scheduler, startMic, stopMic])

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const phase = live.current.phase
      if (e.code === 'Space' || e.code === 'Enter') {
        if (e.target instanceof Element && e.target.closest('button, input')) return
        e.preventDefault()
        if (phase === 'playing') playNote()
        else if (phase === 'ready' || phase === 'paused') start()
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (phase === 'playing') pause()
        else if (phase === 'paused' && !showSettings) start()
        setShowSettings(false)
      }
    }
    const onHide = () => document.hidden && pause()
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [playNote, pause, start, showSettings])

  const openSettings = () => {
    pause()
    setShowSettings(true)
  }

  const micOn = micStatus === 'on'
  const pending = session.waiting ? session.pendingNote() : undefined
  const dots = Array.from({ length: MAX_MULTIPLIER }, (_, i) => i < session.multiplierProgress)

  return (
    <div className={`play ${settings.leftHanded ? 'left-handed' : ''}`}>
      <canvas ref={canvasRef} className="play-canvas" onPointerDown={playNote} />

      {/* HUD */}
      <div className="hud-left">
        <div className="hud-mult">{session.multiplier}×</div>
        <div className="hud-dots">{dots.map((on, i) => <span key={i} className={on ? 'on' : ''} />)}</div>
      </div>
      <div className="hud-right">
        <div className="hud-score">{session.score.toLocaleString()}</div>
        <div className="hud-best">Best {Math.max(best, 0).toLocaleString()}</div>
      </div>
      <div className="mic-meter" title={micOn ? 'Microphone level' : 'Microphone off: use Space or tap'}>
        <div className="mic-meter-fill" ref={meterRef} />
        <span className="mic-meter-icon">{micOn ? '🎙' : '⌨︎'}</span>
      </div>
      <span className="heard-note" ref={heardRef} aria-live="off" />

      {micOn && settings.guideNotes && phase !== 'finished' && (
        <div className="guide-warning">Guide notes are on: use headphones so the mic only hears your guitar</div>
      )}

      {session.waiting && phase === 'playing' && pending && (
        <div className="wait-hint">
          Play string {pending.string + 1} ({STRING_NAMES[pending.string]}), {pending.fret === 0 ? 'open' : `fret ${pending.fret}`}
          {micOn ? '' : ' · Space / tap'}
        </div>
      )}

      {/* Bottom bar */}
      <div className="play-bar" ref={barRef}>
        <button className="bar-btn" onClick={() => (phase === 'playing' ? pause() : start())}
          aria-label={phase === 'playing' ? 'Pause' : 'Play'}>
          {phase === 'playing' ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="song-progress">
          <div className="song-progress-fill" ref={fillRef} />
          {song.sections.map((sec) => (
            <button key={sec.name + sec.start} className="section-mark"
              style={{ left: `${(sec.start / song.lengthBeats) * 100}%` }}
              onClick={() => restart(sec.start)} title={`Practice from "${sec.name}"`}>
              <span>{sec.name}</span>
            </button>
          ))}
        </div>
        <button className="bar-btn" onClick={openSettings} aria-label="Settings"><GearIcon /></button>
      </div>

      {phase === 'ready' && !showSettings && (
        <div className="overlay">
          <div className="sheet">
            <p className="eyebrow">{song.kind === 'song' ? 'Song' : 'Exercise'}{session.isPractice ? ' · practice from section' : ''}</p>
            <h2>{song.title}</h2>
            <p className="muted">{song.description}</p>
            <ul className="how-to">
              <li>Notes slide toward the white line. Play each one as it touches the line.</li>
              <li>The number on a note is the fret to press; <b>0</b> means open string.</li>
              <li>{micOn || settings.micEnabled
                ? <>Fretwise listens through your microphone. No guitar handy? Press <kbd>Space</kbd> or tap.</>
                : <>Microphone is off: press <kbd>Space</kbd> or tap the board to "play" a note.</>}</li>
            </ul>
            {micError && <p className="error-text">{micError} You can still play with Space or tap.</p>}
            <label className="toggle-row">
              <span><b>Wait mode</b><br /><small className="muted">Pause until you play each note</small></span>
              <input type="checkbox" checked={settings.waitMode} onChange={(e) => changeSettings({ waitMode: e.target.checked })} />
            </label>
            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={() => navigate('/songs')}>Back</button>
              <button className="btn" onClick={start} autoFocus>Start</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'paused' && !showSettings && (
        <div className="overlay">
          <div className="sheet sheet-small">
            <h2>Paused</h2>
            <div className="sheet-stack">
              <button className="btn" onClick={start} autoFocus>Resume</button>
              <button className="btn btn-ghost" onClick={() => restart(session.startBeat)}>Restart</button>
              <button className="btn btn-ghost" onClick={() => navigate('/songs')}>Quit</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="overlay" onClick={() => setShowSettings(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Settings</h2>
            <div className="setting">
              <label htmlFor="speed"><b>Speed</b> <span className="muted">{Math.round(settings.speed * 100)}% · {Math.round(song.bpm * settings.speed)} BPM</span></label>
              <input id="speed" type="range" min={0.5} max={1.25} step={0.05} value={settings.speed}
                onChange={(e) => changeSettings({ speed: Number(e.target.value) })} />
            </div>
            <Toggle label="Use microphone" hint={micStatus === 'denied' ? 'Blocked by the browser' : 'Listen to your guitar'} checked={settings.micEnabled} onChange={(v) => changeSettings({ micEnabled: v })} />
            <div className="setting">
              <label htmlFor="latency"><b>Mic latency</b> <span className="muted">{settings.latencyMs} ms</span></label>
              <input id="latency" type="range" min={0} max={300} step={5} value={settings.latencyMs}
                onChange={(e) => changeSettings({ latencyMs: Number(e.target.value) })} />
              <small className="muted">On-time notes show as “Late”? Raise it. <Link to="/mic-setup">Calibrate automatically →</Link></small>
            </div>
            <Toggle label="Metronome" hint="Click on every beat" checked={settings.metronome} onChange={(v) => changeSettings({ metronome: v })} />
            <Toggle label="Guide notes" hint={micOn ? 'Use headphones, or the mic will hear them too' : 'Hear each note as it reaches the line'} checked={settings.guideNotes} onChange={(v) => changeSettings({ guideNotes: v })} />
            <Toggle label="Wait mode" hint="Pause until you play each note" checked={settings.waitMode} onChange={(v) => changeSettings({ waitMode: v })} />
            <Toggle label="Left-handed" hint="Mirror the fretboard" checked={settings.leftHanded} onChange={(v) => changeSettings({ leftHanded: v })} />
            <div className="sheet-actions">
              <button className="btn" onClick={() => setShowSettings(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'finished' && results && (
        <div className="overlay">
          {(results.stars === 3 || newBest) && <Confetti />}
          <div className="sheet">
            <p className="eyebrow">{session.isPractice ? 'Practice complete' : song.kind === 'song' ? 'Song complete' : 'Exercise complete'}</p>
            <div className="stars" aria-label={`${results.stars} of 3 stars`}>
              {[1, 2, 3].map((i) => <span key={i} className={i <= results.stars ? 'on' : ''}>★</span>)}
            </div>
            <div className="result-score">{results.score.toLocaleString()}</div>
            {newBest && <div className="pill new-best">New best score!</div>}
            <div className="result-grid">
              <div><b>{results.accuracy}%</b><span>accuracy</span></div>
              <div><b>{results.counts.perfect}</b><span>perfect</span></div>
              <div><b>{results.counts.good}</b><span>good</span></div>
              <div><b>{results.counts.early + results.counts.late}</b><span>early/late</span></div>
              <div><b>{results.counts.missed}</b><span>missed</span></div>
              <div><b>{results.bestStreak}</b><span>best streak</span></div>
            </div>
            {results.accuracy < 75 && (
              <p className="muted tip">Tip: slow the speed down or turn on Wait mode in Settings.</p>
            )}
            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={() => navigate('/songs')}>Songs</button>
              <button className="btn" onClick={() => restart(0)} autoFocus>Play again</button>
            </div>
          </div>
        </div>
      )}

      {!rotateDismissed && (
        <div className="rotate-hint">
          <div className="sheet sheet-small">
            <div className="rotate-icon">📱↻</div>
            <h2>Turn your phone sideways</h2>
            <p className="muted">The fretboard fits best in landscape.</p>
            <button className="btn" onClick={() => setRotateDismissed(true)}>Continue anyway</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span><b>{label}</b><br /><small className="muted">{hint}</small></span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

const PauseIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor" /><rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor" /></svg>
)
const PlayIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor" /></svg>
)
const GearIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4L10.7 6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)" /></svg>
)
