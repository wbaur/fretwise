// Monophonic pitch detection using the YIN algorithm, tuned for guitar (~70–1400 Hz).
// Pure functions on sample buffers, with no Web Audio dependency, so it is unit-testable.

export interface PitchResult {
  freq: number
  /** 0..1, how confident the detector is (1 = clean periodic signal). */
  clarity: number
}

let work: Float32Array = new Float32Array(0)
let diff: Float32Array = new Float32Array(0)

/** Root-mean-square amplitude of a buffer. */
export function rms(buf: Float32Array): number {
  let s = 0
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
  return Math.sqrt(s / buf.length)
}

export function toDb(amplitude: number): number {
  return 20 * Math.log10(Math.max(amplitude, 1e-8))
}

export function detectPitch(
  input: Float32Array,
  sampleRate: number,
  minFreq = 70,
  maxFreq = 1400,
  threshold = 0.15,
): PitchResult | null {
  // Halve the sample rate for speed; guitar fundamentals are far below the new Nyquist.
  let buf = input
  let sr = sampleRate
  if (sr > 32000) {
    const n = input.length >> 1
    if (work.length !== n) work = new Float32Array(n)
    for (let i = 0; i < n; i++) work[i] = (input[2 * i] + input[2 * i + 1]) * 0.5
    buf = work
    sr /= 2
  }

  const W = buf.length >> 1
  const tauMin = Math.max(2, Math.floor(sr / maxFreq))
  const tauMax = Math.min(W - 1, Math.ceil(sr / minFreq))
  if (tauMax <= tauMin) return null
  if (diff.length < tauMax + 2) diff = new Float32Array(tauMax + 2)

  // Difference function
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    let sum = 0
    for (let j = 0; j < W; j++) {
      const d = buf[j] - buf[j + tau]
      sum += d * d
    }
    diff[tau] = sum
  }
  // Cumulative mean normalized difference
  diff[0] = 1
  let running = 0
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    running += diff[tau]
    diff[tau] = running === 0 ? 1 : (diff[tau] * tau) / running
  }

  // First dip below the threshold, then walk down to its local minimum
  let tau = -1
  for (let t = tauMin; t <= tauMax; t++) {
    if (diff[t] < threshold) {
      while (t + 1 <= tauMax && diff[t + 1] < diff[t]) t++
      tau = t
      break
    }
  }
  if (tau === -1) {
    // No clear period: report the best guess with low clarity
    let best = tauMin
    for (let t = tauMin + 1; t <= tauMax; t++) if (diff[t] < diff[best]) best = t
    tau = best
  }

  // Parabolic interpolation for sub-sample accuracy
  const a = diff[tau - 1] ?? diff[tau]
  const b = diff[tau]
  const c = diff[tau + 1] ?? diff[tau]
  const denom = a + c - 2 * b
  const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0
  const period = tau + Math.max(-1, Math.min(1, shift))

  return { freq: sr / period, clarity: Math.max(0, Math.min(1, 1 - b)) }
}
