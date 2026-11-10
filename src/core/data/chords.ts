// Open chord shapes. Arrays run low E (string 6) → high e (string 1), as chord charts are drawn.

export interface ChordShape {
  name: string
  fullName: string
  /** Fret per string, low E → high e. -1 = don't play, 0 = open. */
  frets: number[]
  /** Finger per string (1 = index … 4 = pinky), 0 = none. */
  fingers: number[]
  tip: string
}

export const CHORDS: Record<string, ChordShape> = {
  Em: { name: 'Em', fullName: 'E minor', frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0],
    tip: 'Only two fingers, and all six strings ring. The easiest chord to start with.' },
  Am: { name: 'Am', fullName: 'A minor', frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0],
    tip: 'Same shape as E, moved over one string. Skip the low E string.' },
  E: { name: 'E', fullName: 'E major', frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0],
    tip: 'Like Em, plus your index finger on the G string, 1st fret.' },
  A: { name: 'A', fullName: 'A major', frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0],
    tip: 'Three fingers squeezed in a row on the 2nd fret. Skip the low E.' },
  C: { name: 'C', fullName: 'C major', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0],
    tip: 'A staircase shape. Keep the G string (open) ringing by arching your fingers.' },
  G: { name: 'G', fullName: 'G major', frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3],
    tip: 'Stretch from the low E to the high e. Strum all six strings.' },
  D: { name: 'D', fullName: 'D major', frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2],
    tip: 'A small triangle on the top three strings. Strum only four strings.' },
}

export const CHORD_NAMES = Object.keys(CHORDS)

/** Number of strings strummed (from the lowest played string up). */
export function strummedStrings(shape: ChordShape): number {
  return shape.frets.filter((f) => f >= 0).length
}
