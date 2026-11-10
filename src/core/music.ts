// Basic music helpers (standard tuning).
import type { GuitarString } from './types'

/** MIDI note of each open string, index 0 = high E … 5 = low E. */
export const OPEN_STRING_MIDI = [64, 59, 55, 50, 45, 40] as const
export const STRING_NAMES = ['E', 'B', 'G', 'D', 'A', 'E'] as const

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function noteMidi(string: GuitarString | number, fret: number): number {
  return OPEN_STRING_MIDI[string] + fret
}

export function midiToName(midi: number, withOctave = false): string {
  const name = NAMES[((midi % 12) + 12) % 12]
  return withOctave ? `${name}${Math.floor(midi / 12) - 1}` : name
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440)
}
