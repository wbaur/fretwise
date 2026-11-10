// A standalone metronome with sample-accurate clicks (look-ahead scheduling).
import { getAudioContext, playClick, resumeAudio } from './audio'

const LOOKAHEAD = 0.15
const INTERVAL_MS = 25

export class Metronome {
  bpm: number
  beatsPerBar: number
  /** Also click softly on the "&" between beats. */
  subdivide = false
  private t0 = 0
  private nextTick = 0 // in half-beats
  private timer: number | null = null
  private sources: AudioScheduledSourceNode[] = []

  constructor(bpm: number, beatsPerBar = 4) {
    this.bpm = bpm
    this.beatsPerBar = beatsPerBar
  }

  get running(): boolean {
    return this.timer !== null
  }

  private get spb(): number {
    return 60 / this.bpm
  }

  /** Current position in beats since start (negative during the 1-bar count-in). */
  position(): number {
    if (!this.running) return -this.beatsPerBar
    return (getAudioContext().currentTime - this.t0) / this.spb - this.beatsPerBar
  }

  async start() {
    const ctx = await resumeAudio()
    this.stop()
    this.t0 = ctx.currentTime + 0.1
    this.nextTick = 0
    this.timer = window.setInterval(() => this.schedule(), INTERVAL_MS)
    this.schedule()
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    this.sources.forEach((s) => { try { s.stop() } catch { /* already stopped */ } })
    this.sources = []
  }

  /** Change tempo without losing your place in the bar. */
  setBpm(bpm: number) {
    if (!this.running) {
      this.bpm = bpm
      return
    }
    const ctx = getAudioContext()
    const beatNow = (ctx.currentTime - this.t0) / this.spb
    this.sources.forEach((s) => { try { s.stop() } catch { /* ignore */ } })
    this.sources = []
    this.bpm = bpm
    this.t0 = ctx.currentTime - beatNow * this.spb
    this.nextTick = Math.ceil(beatNow * 2)
  }

  private track(src: AudioScheduledSourceNode) {
    this.sources.push(src)
    src.onended = () => {
      const i = this.sources.indexOf(src)
      if (i >= 0) this.sources.splice(i, 1)
    }
  }

  private schedule() {
    const ctx = getAudioContext()
    const until = ctx.currentTime + LOOKAHEAD
    for (;;) {
      const time = this.t0 + (this.nextTick / 2) * this.spb
      if (time > until) break
      const onBeat = this.nextTick % 2 === 0
      const beat = this.nextTick / 2
      if (onBeat) {
        const countIn = beat < this.beatsPerBar
        this.track(playClick(time, beat % this.beatsPerBar === 0, countIn ? 0.65 : 0.5))
      } else if (this.subdivide && beat > this.beatsPerBar) {
        this.track(playClick(time, false, 0.18))
      }
      this.nextTick += 1
    }
  }
}
