// Schedules metronome clicks and guide notes slightly ahead of the song clock,
// so they play exactly on time even if a frame is late.
import type { PlaySession } from '../engine'
import { getAudioContext, playClick, playPluck } from './audio'

const LOOKAHEAD_SEC = 0.12

export interface ScheduleOptions {
  metronome: boolean
  guideNotes: boolean
}

export class AudioScheduler {
  private scheduledUntil = -Infinity
  private sources: AudioScheduledSourceNode[] = []

  /** Call once per animation frame while playing. */
  tick(session: PlaySession, opts: ScheduleOptions) {
    const c = getAudioContext()
    const now = c.currentTime
    const spb = session.secPerBeat
    const from = Math.max(this.scheduledUntil, session.beat)
    const until = Math.min(session.beat + LOOKAHEAD_SEC / spb, session.waitCap())
    if (until <= from && this.scheduledUntil !== -Infinity) return

    const timeOf = (beat: number) => now + Math.max(0, (beat - session.beat) * spb)
    const inRange = (b: number) => (this.scheduledUntil === -Infinity ? b >= from : b > from) && b <= until

    if (opts.metronome) {
      for (let b = Math.ceil(from); b <= until; b++) {
        if (!inRange(b)) continue
        const bar = session.song.beatsPerBar
        const accent = ((b % bar) + bar) % bar === 0
        // Count-in clicks are a bit louder so you can hear the start coming.
        this.track(playClick(timeOf(b), accent, b < session.startBeat ? 0.7 : 0.5))
      }
    }
    if (opts.guideNotes) {
      for (const n of session.notes) {
        if (n.start > until) break
        if (n.skipped || !inRange(n.start)) continue
        this.track(playPluck(n.midi, timeOf(n.start), n.duration * spb))
      }
    }
    this.scheduledUntil = Math.max(this.scheduledUntil, until)
  }

  private track(src: AudioScheduledSourceNode) {
    this.sources.push(src)
    src.onended = () => {
      const i = this.sources.indexOf(src)
      if (i >= 0) this.sources.splice(i, 1)
    }
  }

  /** Stop everything already scheduled (pause, speed change, restart). */
  reset(session?: PlaySession) {
    for (const s of this.sources) {
      try {
        s.stop()
      } catch {
        /* already stopped */
      }
    }
    this.sources = []
    this.scheduledUntil = session ? session.beat : -Infinity
  }
}
