// Music theory mini-lessons (cards) and quiz generators.
// Strings: index 0 = high e (string 1) … 5 = low E (string 6).
import { midiToName, OPEN_STRING_MIDI } from '../music'
import { choice, distinct, pick, shuffle, NOTE_BEATS, type Card, type NoteValue, type Question, type Spot } from '../quiz'
import { CHORD_NAMES, CHORDS, strummedStrings } from './chords'

export const STRING_LABEL = ['high e', 'B', 'G', 'D', 'A', 'low E']
const NATURALS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export function stringName(i: number): string {
  return `${STRING_LABEL[i]} (string ${i + 1})`
}

export function noteAt(string: number, fret: number): string {
  return midiToName(OPEN_STRING_MIDI[string] + fret)
}

function naturalSpots(maxFret: number): Spot[] {
  const out: Spot[] = []
  for (let s = 0; s < 6; s++) for (let f = 0; f <= maxFret; f++) if (NATURALS.includes(noteAt(s, f))) out.push({ string: s, fret: f })
  return out
}

/** "G → G# → A → A# → B": the notes from the open string up to a fret. */
function countUp(string: number, fret: number): string {
  return Array.from({ length: fret + 1 }, (_, f) => noteAt(string, f)).join(' → ')
}

function spotText(s: Spot): string {
  return `${stringName(s.string)}, ${s.fret === 0 ? 'open' : `fret ${s.fret}`}`
}

function chordColumn(name: string): Spot[] {
  return CHORDS[name].frets
    .map((fret, k) => ({ string: 5 - k, fret }))
    .filter((s) => s.fret >= 0)
}

export interface TheoryContent {
  cards: Card[]
  /** Fresh randomized quiz each time. */
  makeQuiz: () => Question[]
}

const QUIZ_LENGTH = 8

/** Run each generator once, then fill up with random extra generated questions. */
function build(gens: (() => Question)[], repeatable: (() => Question)[]): Question[] {
  const qs = shuffle(gens).slice(0, QUIZ_LENGTH).map((g) => g())
  while (qs.length < QUIZ_LENGTH) qs.push(pick(repeatable)())
  return shuffle(qs)
}

// ---------------------------------------------------------------- open strings
const openStrings: TheoryContent = {
  cards: [
    {
      title: 'Six strings, six names',
      body: [
        'From the thickest string to the thinnest, the open strings are E, A, D, G, B, E.',
        'The thickest is called "low E" and the thinnest "high e". They are the same note, two octaves apart.',
      ],
      visual: { kind: 'fretboard', maxFret: 0, labelStrings: true, marks: [0, 1, 2, 3, 4, 5].map((s) => ({ string: s, fret: 0, label: noteAt(s, 0) })) },
    },
    {
      title: 'String numbers',
      body: [
        'Strings are also numbered: string 1 is the thinnest (high e), string 6 is the thickest (low E).',
        'In Fretwise, the thin strings are drawn at the top, just like when you look down at your guitar.',
      ],
    },
    {
      title: 'A trick to remember',
      body: ['Eddie Ate Dynamite, Good Bye Eddie', 'E – A – D – G – B – E, thickest to thinnest.'],
      visual: { kind: 'emoji', text: '🧨' },
    },
  ],
  makeQuiz: () => {
    const highlight = () => {
      const s = Math.floor(Math.random() * 6)
      const wrong = distinct([0, 1, 2, 3, 4, 5], 3, [s]).map(stringName)
      return choice('Which string is highlighted?', stringName(s), wrong,
        `That's the ${STRING_LABEL[s]} string, string number ${s + 1}.`,
        { kind: 'fretboard', maxFret: 0, marks: [{ string: s, fret: 0 }] })
    }
    const tapOpen = (): Question => {
      const s = Math.floor(Math.random() * 6)
      return { kind: 'fret-tap', prompt: `Tap the open ${STRING_LABEL[s]} string.`, answers: [{ string: s, fret: 0 }], maxFret: 0,
        explain: `The ${STRING_LABEL[s]} string is string ${s + 1}. Open strings are tapped left of the nut.` }
    }
    return build([
      () => choice('What is the name of the thickest string?', 'E', ['A', 'G', 'D'], 'The thickest string is low E (string 6).'),
      () => choice('Which order is correct, from thickest to thinnest?', 'E A D G B E', ['E B G D A E', 'E A G D B E', 'A E D G B E'],
        'Thickest to thinnest: E A D G B E. "Eddie Ate Dynamite, Good Bye Eddie".'),
      () => choice('What is string number 1?', 'The thinnest string (high e)', ['The thickest string (low E)', 'The A string', 'The G string'],
        'String 1 is the thinnest, high e. String 6 is the thickest.'),
      () => choice('What is the name of string 5?', 'A', ['D', 'E', 'B'], 'String 5 is the A string, right next to the thickest string.'),
      () => choice('Which string sits between the D and B strings?', 'G', ['A', 'E', 'C'], 'The order is E A D G B E, so G is between D and B.'),
      highlight, highlight, tapOpen, tapOpen,
    ], [highlight, tapOpen])
  },
}

// ---------------------------------------------------------------- fretboard notes
const fretboardNotes: TheoryContent = {
  cards: [
    {
      title: 'Each fret is a half step',
      body: [
        'Pressing a string at a fret makes it shorter, so the note goes higher.',
        'Moving up one fret raises the note by one half step (a semitone).',
      ],
      visual: { kind: 'fretboard', maxFret: 5, marks: [0, 1, 2, 3, 4, 5].map((f) => ({ string: 0, fret: f, label: noteAt(0, f) })) },
    },
    {
      title: 'The musical alphabet',
      body: [
        'Notes use the letters A B C D E F G, then start again at A.',
        'Between most letters there is an in-between note called a sharp (#), like A#.',
        'But there is no sharp between B and C, or between E and F. They are only one fret apart.',
      ],
    },
    {
      title: 'Find notes from the open string',
      body: [
        'Start with the open string name and count up the alphabet one fret at a time.',
        'Example: A string. Open = A, fret 1 = A#, fret 2 = B, fret 3 = C.',
        'At the 12th fret, the note name repeats the open string, one octave higher.',
      ],
      visual: { kind: 'fretboard', maxFret: 5, marks: [0, 1, 2, 3, 4, 5].map((f) => ({ string: 4, fret: f, label: noteAt(4, f) })) },
    },
  ],
  makeQuiz: () => {
    const spots = naturalSpots(5)
    const nameIt = () => {
      const s = pick(spots)
      const n = noteAt(s.string, s.fret)
      return choice('What note is marked?', n, distinct(NATURALS, 3, [n]),
        s.fret === 0 ? `The open ${STRING_LABEL[s.string]} string is ${n}.` : `Count up one fret at a time: ${countUp(s.string, s.fret)} (fret ${s.fret}).`,
        { kind: 'fretboard', maxFret: 5, marks: [{ string: s.string, fret: s.fret }] })
    }
    const findIt = (): Question => {
      const s = pick(spots.filter((x) => x.fret > 0))
      const n = noteAt(s.string, s.fret)
      return { kind: 'fret-tap', prompt: `Find the note ${n} on the ${STRING_LABEL[s.string]} string.`, maxFret: 5,
        answers: [{ string: s.string, fret: s.fret }],
        explain: `Count up one fret at a time: ${countUp(s.string, s.fret)}, so ${n} is at fret ${s.fret}.` }
    }
    return build([
      () => choice('Moving up one fret raises a note by…', 'A half step', ['A whole step', 'An octave', 'Nothing, it stays the same'],
        'Each fret is one half step (semitone).'),
      () => choice('Which pair of notes has NO sharp between them?', 'B and C', ['C and D', 'F and G', 'A and B'],
        'B–C and E–F are only a half step apart, so there is no sharp between them.'),
      () => choice('What note is at the 12th fret of the A string?', 'A', ['E', 'G', 'C'],
        'The 12th fret is one octave above the open string, so it has the same name.'),
      () => choice('What is the note between A and B called?', 'A# (A sharp)', ['A♮', 'B#', 'C'],
        'The in-between note is A sharp, also called B flat.'),
      nameIt, nameIt, nameIt, findIt, findIt,
    ], [nameIt, findIt])
  },
}

// ---------------------------------------------------------------- reading tab
const readingTab: TheoryContent = {
  cards: [
    {
      title: 'Six lines = six strings',
      body: [
        'Tab (tablature) draws the six strings as lines.',
        'The TOP line is the thinnest string (high e), and the bottom line is the thickest (low E).',
      ],
      visual: { kind: 'tab', columns: [] },
    },
    {
      title: 'Numbers are frets',
      body: [
        'A number on a line tells you which fret to press on that string. 0 means play it open.',
        'Read from left to right, like a sentence.',
      ],
      visual: { kind: 'tab', columns: [[{ string: 0, fret: 0 }], [{ string: 0, fret: 1 }], [{ string: 0, fret: 3 }], [{ string: 1, fret: 3 }]] },
    },
    {
      title: 'Stacked numbers = chords',
      body: ['When numbers are stacked on top of each other, play them at the same time. This is an E minor chord:'],
      visual: { kind: 'tab', columns: [chordColumn('Em')] },
    },
  ],
  makeQuiz: () => {
    const readIt = () => {
      const s = { string: Math.floor(Math.random() * 6), fret: pick([0, 1, 2, 3, 5]) }
      const flipped = { string: 5 - s.string, fret: s.fret } // reading tab upside down
      const wrong = [
        ...(flipped.string !== s.string ? [flipped] : []),
        { string: s.string, fret: s.fret === 0 ? 2 : 0 },
        { string: (s.string + 1) % 6, fret: s.fret },
        { string: (s.string + 2) % 6, fret: s.fret + 1 },
      ]
      const wrongText = [...new Set(wrong.map(spotText))].filter((t) => t !== spotText(s)).slice(0, 3)
      return choice('What does this tab tell you to play?', spotText(s), wrongText,
        `The number is on line ${s.string + 1} from the top, which is the ${STRING_LABEL[s.string]} string. Top line = thinnest string.`,
        { kind: 'tab', columns: [[s]] })
    }
    const tapIt = (): Question => {
      const s = { string: Math.floor(Math.random() * 6), fret: pick([1, 2, 3]) }
      return { kind: 'fret-tap', prompt: 'Tap the spot this tab is asking for.', visual: { kind: 'tab', columns: [[s]] }, maxFret: 5,
        answers: [s], explain: `Line ${s.string + 1} from the top is the ${STRING_LABEL[s.string]} string; the number ${s.fret} is the fret.` }
    }
    const whichChord = () => {
      const name = pick(['Em', 'Am', 'C', 'G', 'D'])
      return choice('Which chord does this tab show?', name, distinct(['Em', 'Am', 'C', 'G', 'D', 'E', 'A'], 3, [name]),
        `Those stacked numbers make the ${CHORDS[name].fullName} shape.`, { kind: 'tab', columns: [chordColumn(name)] })
    }
    return build([
      () => choice('In tab, the TOP line is…', 'The thinnest string (high e)', ['The thickest string (low E)', 'The 1st fret', 'The A string'],
        'Top line = high e. It looks upside down compared to holding the guitar, but you get used to it fast.'),
      () => choice('A 0 on a tab line means…', 'Play that string open', ["Don't play that string", 'Press the 10th fret', 'Rest for one beat'],
        '0 means open: pluck the string without pressing any fret.'),
      () => choice('Numbers stacked on top of each other mean…', 'Play them at the same time', ['Play top to bottom slowly', 'Play only the top one', 'Skip them'],
        'Stacked numbers form a chord: strum or pluck them together.'),
      () => choice('Which way do you read tab?', 'Left to right', ['Right to left', 'Top to bottom', 'Bottom to top'], 'Tab reads left to right, like text.'),
      readIt, readIt, readIt, tapIt, whichChord,
    ], [readIt, tapIt])
  },
}

// ---------------------------------------------------------------- chord shapes
const chordShapes: TheoryContent = {
  cards: [
    {
      title: 'How to read a chord diagram',
      body: [
        'A chord diagram is the neck standing up, facing you. Vertical lines are strings: low E on the left, high e on the right.',
        'Dots show where to press; the number is the finger (1 = index, 2 = middle, 3 = ring, 4 = pinky).',
        'O above a string = play it open. ✕ = don’t play it.',
      ],
      visual: { kind: 'chord', name: 'C' },
    },
    { title: 'E minor and A minor', body: [CHORDS.Em.tip, CHORDS.Am.tip], visual: { kind: 'chord', name: 'Em' } },
    { title: 'E and A', body: [CHORDS.E.tip, CHORDS.A.tip], visual: { kind: 'chord', name: 'A' } },
    { title: 'G and D', body: [CHORDS.G.tip, CHORDS.D.tip], visual: { kind: 'chord', name: 'G' } },
  ],
  makeQuiz: () => {
    const nameIt = () => {
      const n = pick(CHORD_NAMES)
      return choice('Which chord is this?', n, distinct(CHORD_NAMES, 3, [n]), `This is ${CHORDS[n].fullName}. ${CHORDS[n].tip}`, { kind: 'chord', name: n })
    }
    const findIt = () => {
      const n = pick(CHORD_NAMES)
      return choice(`Which diagram shows ${CHORDS[n].fullName} (${n})?`, { visual: { kind: 'chord', name: n } },
        distinct(CHORD_NAMES, 3, [n]).map((w) => ({ visual: { kind: 'chord' as const, name: w } })), CHORDS[n].tip)
    }
    return build([
      () => choice('An ✕ above a string means…', "Don't play that string", ['Play it open', 'Press very hard', 'Use your pinky'],
        '✕ = mute or skip that string. O = play it open.'),
      () => choice('An O above a string means…', 'Play that string open', ["Don't play it", 'Press the first fret', 'Use finger zero'],
        'O means the string rings open, with no finger on it.'),
      () => choice('How many strings do you strum for a D chord?', String(strummedStrings(CHORDS.D)), ['6', '5', '3'],
        'D starts on the open D string, so you strum the top four strings only.'),
      () => choice('The numbers on the dots tell you…', 'Which finger to use', ['Which fret to press', 'How hard to press', 'The order to strum'],
        '1 = index, 2 = middle, 3 = ring, 4 = pinky.'),
      () => choice('Which chord uses only two fingers?', 'Em', ['C', 'G', 'D'], 'E minor: fingers 2 and 3 on the 2nd fret of the A and D strings.'),
      nameIt, nameIt, findIt, findIt,
    ], [nameIt, findIt])
  },
}

// ---------------------------------------------------------------- rhythm
const NOTE_NAMES: Record<NoteValue, string> = { whole: 'whole note', half: 'half note', quarter: 'quarter note', eighth: 'eighth note' }
const beatsText = (b: number) => (b === 0.5 ? '½ beat' : `${b} beat${b === 1 ? '' : 's'}`)

const rhythm: TheoryContent = {
  cards: [
    {
      title: 'Beats and bars',
      body: [
        'Music has a steady pulse called the beat. Tap your foot: each tap is one beat.',
        'Beats are grouped into bars. Most songs are in 4/4 time: four beats per bar, counted "1 2 3 4".',
        'Tempo is measured in BPM, beats per minute.',
      ],
      visual: { kind: 'rhythm', notes: ['quarter', 'quarter', 'quarter', 'quarter'] },
    },
    {
      title: 'Note lengths',
      body: [
        'Whole note = 4 beats. Half note = 2 beats.',
        'Quarter note = 1 beat. Eighth note = ½ beat.',
        'In Fretwise, a longer pill on the fretboard means a longer note.',
      ],
      visual: { kind: 'rhythm', notes: ['whole', 'half', 'quarter', 'eighth'] },
    },
    {
      title: 'Counting eighth notes',
      body: ['Two eighth notes fit in one beat. Count them "1 & 2 & 3 & 4 &".', 'Strum down on the numbers and up on the "&".'],
      visual: { kind: 'rhythm', notes: ['eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth'] },
    },
  ],
  makeQuiz: () => {
    const values: NoteValue[] = ['whole', 'half', 'quarter', 'eighth']
    const howLong = () => {
      const v = pick(values)
      const wrong = distinct([4, 2, 1, 0.5, 3], 3, [NOTE_BEATS[v]]).map(beatsText)
      return choice('How many beats does this note last (in 4/4)?', beatsText(NOTE_BEATS[v]), wrong,
        `A ${NOTE_NAMES[v]} lasts ${beatsText(NOTE_BEATS[v])}.`, { kind: 'rhythm', notes: [v] })
    }
    const total = () => {
      const notes: NoteValue[] = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => pick(['half', 'quarter', 'quarter', 'eighth'] as NoteValue[]))
      const sum = notes.reduce((a, n) => a + NOTE_BEATS[n], 0)
      const fmt = (b: number) => (Number.isInteger(b) ? String(b) : `${Math.floor(b)}½`.replace(/^0/, ''))
      const wrong = distinct([sum - 1, sum + 1, sum + 0.5, sum - 0.5, sum + 2].filter((x) => x > 0), 3).map(fmt)
      return choice('How many beats is this rhythm in total?', fmt(sum), wrong,
        notes.map((n) => beatsText(NOTE_BEATS[n])).join(' + ') + ` = ${fmt(sum)}`, { kind: 'rhythm', notes })
    }
    return build([
      () => choice('How many quarter notes fit in one bar of 4/4?', '4', ['2', '3', '8'], '4/4 means four quarter-note beats per bar.'),
      () => choice('Which of these fills exactly one bar of 4/4?', { visual: { kind: 'rhythm', notes: ['half', 'quarter', 'quarter'] } },
        [
          { visual: { kind: 'rhythm', notes: ['half', 'half', 'quarter'] } },
          { visual: { kind: 'rhythm', notes: ['quarter', 'quarter', 'quarter'] } },
          { visual: { kind: 'rhythm', notes: ['whole', 'quarter'] } },
        ], 'Half (2) + quarter (1) + quarter (1) = 4 beats.'),
      () => choice('When you count "1 & 2 & 3 & 4 &", each number and "&" is…', 'An eighth note', ['A whole note', 'A half note', 'A bar'],
        'Two eighth notes per beat: the number and the "&".'),
      () => choice('What does BPM mean?', 'Beats per minute', ['Bars per measure', 'Bass pick mode', 'Beats per measure'],
        'BPM = beats per minute. Higher BPM = faster.'),
      howLong, howLong, howLong, total, total,
    ], [howLong, total])
  },
}

export const THEORY: Record<string, TheoryContent> = {
  'open-strings': openStrings,
  'fretboard-notes': fretboardNotes,
  'reading-tab': readingTab,
  'chord-shapes': chordShapes,
  rhythm,
}
