// Shared AudioContext plus simple synthesized sounds (metronome click, plucked string).
import { midiToFreq } from '../music'

let ctx: AudioContext | null = null
let master: GainNode | null = null

export function getAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' })
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
  }
  return ctx
}

function out(): GainNode {
  getAudioContext()
  return master!
}

/** Must be called from a user gesture (tap/click/key) the first time. */
export async function resumeAudio(): Promise<AudioContext> {
  const c = getAudioContext()
  if (c.state !== 'running') await c.resume()
  return c
}

/** A short metronome click at the given AudioContext time. */
export function playClick(time: number, accent: boolean, volume = 0.5): AudioScheduledSourceNode {
  const c = getAudioContext()
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = accent ? 1600 : 1050
  g.gain.setValueAtTime(0, time)
  g.gain.linearRampToValueAtTime(volume * (accent ? 1 : 0.7), time + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.06)
  osc.connect(g).connect(out())
  osc.start(time)
  osc.stop(time + 0.08)
  return osc
}

// Karplus–Strong plucked-string samples, cached per MIDI note.
const pluckCache = new Map<number, AudioBuffer>()

function pluckBuffer(midi: number): AudioBuffer {
  const cached = pluckCache.get(midi)
  if (cached) return cached
  const c = getAudioContext()
  const sr = c.sampleRate
  const length = Math.floor(sr * 2.2)
  const buf = c.createBuffer(1, length, sr)
  const data = buf.getChannelData(0)
  const period = Math.max(2, Math.round(sr / midiToFreq(midi)))
  const ring = new Float32Array(period)
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1
  // Slightly faster decay for higher notes so they don't ring forever.
  const decay = 0.996 - Math.max(0, midi - 60) * 0.0002
  let idx = 0
  for (let i = 0; i < length; i++) {
    const next = (idx + 1) % period
    const v = decay * 0.5 * (ring[idx] + ring[next])
    data[i] = ring[idx]
    ring[idx] = v
    idx = next
  }
  pluckCache.set(midi, buf)
  return buf
}

/** A plucked guitar-like note. */
export function playPluck(midi: number, time: number, durationSec: number, volume = 0.35): AudioScheduledSourceNode {
  const c = getAudioContext()
  const src = c.createBufferSource()
  src.buffer = pluckBuffer(midi)
  const g = c.createGain()
  const end = time + Math.max(0.25, durationSec) + 0.15
  g.gain.setValueAtTime(volume, time)
  g.gain.setValueAtTime(volume, end - 0.15)
  g.gain.linearRampToValueAtTime(0, end)
  src.connect(g).connect(out())
  src.start(time)
  src.stop(end + 0.02)
  return src
}
