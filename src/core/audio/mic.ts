// Microphone input: level metering, pitch per frame, and note-onset detection.
import { freqToMidi } from '../music'
import { getAudioContext, resumeAudio } from './audio'
import { detectPitch, rms, toDb } from './pitch'

export interface MicFrame {
  /** AudioContext time when this frame was read. */
  time: number
  /** Raw RMS amplitude. */
  rms: number
  /** 0..1 level for meters (−60 dB … −10 dB). */
  level: number
  freq: number | null
  /** Nearest MIDI note, or null if no clear pitch. */
  midi: number | null
  /** Exact (fractional) MIDI value, for tuning. */
  midiExact: number | null
  clarity: number
}

export interface NoteOnset {
  time: number
  midi: number
}

const SILENCE_DB = -52
const MIN_CLARITY = 0.85

export class MicInput {
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private buf: Float32Array<ArrayBuffer> = new Float32Array(2048)

  get active(): boolean {
    return !!this.stream
  }

  async start(deviceId?: string | null): Promise<void> {
    this.stop()
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser cannot use the microphone here (it needs HTTPS or localhost).')
    }
    const ctx = await resumeAudio()
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        // Processing meant for voice calls ruins instrument pitch; turn it off.
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    this.source = ctx.createMediaStreamSource(this.stream)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0
    this.buf = new Float32Array(this.analyser.fftSize)
    this.source.connect(this.analyser)
  }

  stop() {
    this.source?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.source = null
    this.analyser = null
  }

  /** Analyse the most recent audio. Call once per animation frame. */
  read(): MicFrame | null {
    if (!this.analyser) return null
    const ctx = getAudioContext()
    this.analyser.getFloatTimeDomainData(this.buf)
    const r = rms(this.buf)
    const db = toDb(r)
    const level = Math.max(0, Math.min(1, (db + 60) / 50))
    let freq: number | null = null
    let midi: number | null = null
    let midiExact: number | null = null
    let clarity = 0
    if (db > SILENCE_DB) {
      const p = detectPitch(this.buf, ctx.sampleRate)
      if (p && p.clarity >= MIN_CLARITY) {
        freq = p.freq
        clarity = p.clarity
        midiExact = freqToMidi(p.freq)
        midi = Math.round(midiExact)
      }
    }
    return { time: ctx.currentTime, rms: r, level, freq, midi, midiExact, clarity }
  }
}

export async function listMicrophones(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  const all = await navigator.mediaDevices.enumerateDevices()
  return all.filter((d) => d.kind === 'audioinput')
}

/**
 * Turns a stream of mic frames into discrete "note played" events.
 * A new note is reported when the volume jumps (a fresh pluck) or the pitch
 * changes, once the pitch has been stable for two frames.
 */
export class NoteDetector {
  private env = 0
  private armed = true
  private lastMidi: number | null = null
  private candidate: number | null = null
  private candidateCount = 0
  private candidateTime = 0

  push(f: MicFrame): NoteOnset | null {
    if (toDb(f.rms) < SILENCE_DB) {
      this.armed = true
      this.lastMidi = null
      this.candidate = null
      this.env *= 0.8
      return null
    }
    // Sudden jump in volume = new pluck, even if it's the same note again
    if (f.rms > this.env * 1.8 && f.rms > 0.004) this.armed = true
    this.env = this.env * 0.8 + f.rms * 0.2

    if (f.midi === null) return null
    // A pitch change means a new note, but ignore octave flips (a common detector glitch)
    if (f.midi !== this.lastMidi && (this.lastMidi === null || Math.abs(f.midi - this.lastMidi) !== 12)) this.armed = true
    if (!this.armed) return null

    if (this.candidate === f.midi) this.candidateCount += 1
    else {
      this.candidate = f.midi
      this.candidateCount = 1
      this.candidateTime = f.time
    }
    if (this.candidateCount >= 2) {
      this.armed = false
      this.lastMidi = f.midi
      this.candidate = null
      return { time: this.candidateTime, midi: f.midi }
    }
    return null
  }
}
