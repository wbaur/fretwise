import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { exportProgress, importProgress, localDay, resetProgress, updateSettings } from '../core/progress'
import type { Settings } from '../core/types'
import { useProgress } from '../useProgress'
import './progress.css'

const GOALS = [5, 10, 15, 20, 30]

export default function SettingsScreen() {
  const { settings } = useProgress()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const set = (patch: Partial<Settings>) => updateSettings(patch)

  const download = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fretwise-backup-${localDay()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ ok: true, text: 'Backup downloaded.' })
  }

  const restore = async (file: File) => {
    try {
      importProgress(await file.text())
      setMessage({ ok: true, text: 'Progress restored from backup ✓' })
    } catch (e) {
      setMessage({ ok: false, text: e instanceof SyntaxError ? 'That file isn’t valid JSON.' : (e as Error).message })
    }
  }

  return (
    <main className="page progress-page">
      <PageHeader title="Settings" />

      <section className="panel">
        <h2>Daily goal</h2>
        <div className="segmented" role="radiogroup" aria-label="Daily practice goal">
          {GOALS.map((g) => (
            <button key={g} role="radio" aria-checked={settings.dailyGoalMinutes === g}
              className={settings.dailyGoalMinutes === g ? 'on' : ''} onClick={() => set({ dailyGoalMinutes: g })}>
              {g} min
            </button>
          ))}
        </div>
        <p className="muted small">Short, daily practice beats long, rare sessions. 10 minutes a day is a great start.</p>
      </section>

      <section className="panel">
        <h2>Playing</h2>
        <SettingToggle label="Left-handed" hint="Mirror the play-along fretboard" checked={settings.leftHanded} onChange={(v) => set({ leftHanded: v })} />
        <SettingToggle label="Use microphone" hint="Listen to your guitar during play-along" checked={settings.micEnabled} onChange={(v) => set({ micEnabled: v })} />
        <SettingToggle label="Wait mode" hint="Songs pause until you play each note" checked={settings.waitMode} onChange={(v) => set({ waitMode: v })} />
        <SettingToggle label="Metronome" hint="Click on every beat during songs" checked={settings.metronome} onChange={(v) => set({ metronome: v })} />
        <SettingToggle label="Guide notes" hint="Hear each note as it reaches the line (use headphones with the mic)" checked={settings.guideNotes} onChange={(v) => set({ guideNotes: v })} />
        <Link className="toggle-row settings-link" to="/mic-setup">
          <span><b>Mic setup & latency</b><br /><small className="muted">Input device, level check, timing calibration ({settings.latencyMs} ms)</small></span>
          <span aria-hidden="true">›</span>
        </Link>
      </section>

      <section className="panel">
        <h2>Your data</h2>
        <p className="muted small">Progress is stored only in this browser. Download a backup to move it to another device or browser.</p>
        <div className="button-row">
          <button className="btn btn-ghost" onClick={download}>Download backup</button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>Restore backup…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = '' }} />
        </div>
        {message && <p className={message.ok ? 'ok-text' : 'error-text'} role="status">{message.text}</p>}

        <div className="danger-zone">
          {!confirmReset ? (
            <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>Reset all progress…</button>
          ) : (
            <div className="confirm">
              <p><b>Erase all scores, lessons, streaks and practice time?</b> Your settings are kept. This can’t be undone unless you have a backup.</p>
              <div className="button-row">
                <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => { resetProgress(); setConfirmReset(false); setMessage({ ok: true, text: 'Progress reset.' }) }}>
                  Yes, erase it
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <p className="muted small about">Fretwise · made for learning guitar at your own pace.</p>
    </main>
  )
}

function SettingToggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span><b>{label}</b><br /><small className="muted">{hint}</small></span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}
