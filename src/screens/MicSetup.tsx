import { useEffect, useRef, useState } from 'react'
import { playClick, resumeAudio } from '../core/audio/audio'
import { listMicrophones, NoteDetector } from '../core/audio/mic'
import { midiToName } from '../core/music'
import { updateSettings } from '../core/progress'
import { PageHeader } from '../components/ui'
import { useMic } from '../useMic'
import { useProgress } from '../useProgress'
import './tuner.css'

const CAL_BPM = 90
const COUNT_IN = 4
const CAL_BEATS = 8
/** Ignore detected notes above this (metronome clicks picked up by the mic). */
const MAX_CAL_MIDI = 70

type CalState =
  | { kind: 'idle' }
  | { kind: 'running'; beat: number; hits: number }
  | { kind: 'done'; latencyMs: number; hits: number }
  | { kind: 'failed'; hits: number }

export default function MicSetup() {
  const { settings } = useProgress()
  const { mic, status, error, start } = useMic()
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [level, setLevel] = useState(0)
  const [note, setNote] = useState<string | null>(null)
  const [cal, setCal] = useState<CalState>({ kind: 'idle' })
  const calRef = useRef<{ t0: number; spb: number; offsets: Map<number, number>; detector: NoteDetector } | null>(null)

  useEffect(() => {
    if (status === 'on') listMicrophones().then(setDevices)
  }, [status])

  // Live meter + calibration listener
  useEffect(() => {
    if (status !== 'on') return
    let raf = 0
    let lastNote = 0
    const loop = (t: number) => {
      const f = mic.read()
      if (f) {
        setLevel(f.level)
        if (f.midi !== null) {
          setNote(midiToName(f.midi, true))
          lastNote = t
        } else if (t - lastNote > 600) setNote(null)

        const c = calRef.current
        if (c) {
          const onset = c.detector.push(f)
          const beat = (f.time - c.t0) / c.spb
          if (onset && onset.midi <= MAX_CAL_MIDI) {
            const k = Math.round((onset.time - c.t0) / c.spb)
            const off = onset.time - (c.t0 + k * c.spb)
            if (k >= COUNT_IN && k < COUNT_IN + CAL_BEATS && Math.abs(off) < 0.35 && !c.offsets.has(k)) c.offsets.set(k, off)
          }
          if (beat > COUNT_IN + CAL_BEATS) {
            const offs = [...c.offsets.values()].sort((a, b) => a - b)
            calRef.current = null
            if (offs.length >= 4) {
              const ms = Math.round(Math.max(0, Math.min(400, offs[Math.floor(offs.length / 2)] * 1000)))
              updateSettings({ latencyMs: ms })
              setCal({ kind: 'done', latencyMs: ms, hits: offs.length })
            } else setCal({ kind: 'failed', hits: offs.length })
          } else {
            setCal({ kind: 'running', beat: Math.floor(beat), hits: c.offsets.size })
          }
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      calRef.current = null
    }
  }, [status, mic])

  const chooseDevice = async (id: string) => {
    updateSettings({ micDeviceId: id || null })
    await start()
  }

  const runCalibration = async () => {
    if (status !== 'on' && !(await start())) return
    const ctx = await resumeAudio()
    const spb = 60 / CAL_BPM
    const t0 = ctx.currentTime + 0.8
    for (let i = 0; i < COUNT_IN + CAL_BEATS; i++) playClick(t0 + i * spb, i % 4 === 0, i < COUNT_IN ? 0.6 : 0.45)
    calRef.current = { t0, spb, offsets: new Map(), detector: new NoteDetector() }
    setCal({ kind: 'running', beat: -1, hits: 0 })
  }

  return (
    <main className="page tuner-page">
      <PageHeader title="Mic Setup" subtitle="Make sure Fretwise hears you, and on time" back="/tuner" />

      <section className="tuner-card setup-card">
        <h2>1. Microphone</h2>
        {status !== 'on' ? (
          <>
            <p className="muted">Sound is analysed only on this device. Nothing is recorded or uploaded.</p>
            {error && <p className="error-text">{error}</p>}
            <button className="btn" onClick={start} disabled={status === 'starting'}>
              {status === 'starting' ? 'Starting…' : 'Turn on microphone'}
            </button>
          </>
        ) : (
          <>
            {devices.length > 1 && (
              <label className="device-select">
                <span>Input</span>
                <select value={settings.micDeviceId ?? ''} onChange={(e) => chooseDevice(e.target.value)}>
                  <option value="">System default</option>
                  {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}
                </select>
              </label>
            )}
            <div className="level-bar" aria-label="Input level"><div style={{ width: `${Math.round(level * 100)}%` }} /></div>
            <p className="hearing">{note ? <>Hearing <b>{note}</b></> : 'Play a string. The bar should jump.'}</p>
          </>
        )}
      </section>

      <section className="tuner-card setup-card">
        <h2>2. Timing (latency)</h2>
        <p className="muted">
          Phones and laptops hear sound a little late. Pluck any <b>open string</b> right on each click
          (8 times, after 4 count-in clicks), and Fretwise will measure the delay. Keep the volume moderate.
        </p>
        {cal.kind === 'running' && (
          <div className="cal-beats" aria-live="polite">
            {Array.from({ length: COUNT_IN + CAL_BEATS }, (_, i) => (
              <span key={i} className={`${i < COUNT_IN ? 'count' : ''} ${i === cal.beat ? 'now' : ''} ${i < cal.beat ? 'past' : ''}`}>
                {i < COUNT_IN ? COUNT_IN - i : ''}
              </span>
            ))}
          </div>
        )}
        {cal.kind === 'done' && <p className="cal-result ok">Measured {cal.latencyMs} ms from {cal.hits} plucks. Saved ✓</p>}
        {cal.kind === 'failed' && <p className="cal-result bad">Only heard {cal.hits} plucks in time. Try again a bit louder, right on the clicks.</p>}
        <button className="btn" onClick={runCalibration} disabled={cal.kind === 'running'}>
          {cal.kind === 'running' ? 'Listening…' : cal.kind === 'idle' ? 'Start calibration' : 'Calibrate again'}
        </button>

        <div className="setting latency-setting">
          <label htmlFor="latency"><b>Latency</b> <span className="muted">{settings.latencyMs} ms</span></label>
          <input id="latency" type="range" min={0} max={300} step={5} value={settings.latencyMs}
            onChange={(e) => updateSettings({ latencyMs: Number(e.target.value) })} />
          <small className="muted">If notes you play on time show as “Late”, raise this. If they show as “Early”, lower it.</small>
        </div>
      </section>
    </main>
  )
}
