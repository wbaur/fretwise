// Step-by-step content for the beginner lesson path.
import type { Visual } from '../quiz'

export interface LessonStep {
  title: string
  body: string[]
  visual?: Visual
  /** Optional button to go practise something, e.g. the tuner or an exercise. */
  action?: { label: string; to: string }
  tip?: string
}

const openMarks = [0, 1, 2, 3, 4, 5].map((s) => ({ string: s, fret: 0, label: ['e', 'B', 'G', 'D', 'A', 'E'][s] }))

export const LESSON_STEPS: Record<string, LessonStep[]> = {
  holding: [
    {
      title: 'Sit comfortably',
      body: [
        'Sit on a chair without armrests, back straight, shoulders relaxed.',
        'Rest the guitar’s waist on your right leg (left leg if you’re left-handed). The neck points slightly up.',
      ],
      visual: { kind: 'emoji', text: '🪑🎸' },
    },
    {
      title: 'Your fretting hand',
      body: [
        'This hand presses the strings. Place your thumb behind the neck, roughly behind your middle finger.',
        'Keep your wrist relaxed and fingers curved, like holding a small ball.',
      ],
      visual: { kind: 'emoji', text: '🤚' },
      tip: 'Don’t squeeze the neck: light pressure is enough.',
    },
    {
      title: 'Your picking hand',
      body: [
        'Rest your forearm on the top edge of the guitar body so your hand hangs over the sound hole or pickups.',
        'Hold the pick between the side of your index finger and your thumb, with just the tip showing.',
      ],
      visual: { kind: 'emoji', text: '👌' },
      tip: 'No pick? Brush the strings with your thumb or index finger. That works great too.',
    },
    {
      title: 'Try one strum',
      body: ['Without pressing anything, brush down across all six strings from the thickest to the thinnest.', 'Congratulations, you just played your first sound!'],
      visual: { kind: 'emoji', text: '✨' },
    },
  ],
  tuning: [
    {
      title: 'Why tune?',
      body: ['Guitars drift out of tune all the time. Tune at the start of every practice session so songs sound right, and so Fretwise can hear you correctly.'],
      visual: { kind: 'emoji', text: '🎯' },
    },
    {
      title: 'Tuning pegs',
      body: [
        'Each string winds around a tuning peg on the headstock.',
        'Tightening a string raises its pitch; loosening lowers it. Turn slowly, a little at a time.',
      ],
      tip: 'If a note is too high, go below it first, then tune up to it. Strings hold their tuning better that way.',
    },
    {
      title: 'Use the tuner',
      body: [
        'Open the tuner, pluck one string and let it ring.',
        'Turn the peg until the needle is in the green middle. Do this for all six strings, then come back here.',
      ],
      action: { label: 'Open the tuner', to: '/tuner' },
    },
  ],
  'open-strings': [
    {
      title: 'Meet the strings',
      body: ['From thickest to thinnest: E A D G B E.', 'Remember it with: Eddie Ate Dynamite, Good Bye Eddie.'],
      visual: { kind: 'fretboard', maxFret: 0, marks: openMarks },
    },
    {
      title: 'Pluck cleanly',
      body: ['Pluck one string at a time with a small, relaxed motion. Let it ring until the next note.'],
      tip: 'Rest your picking hand lightly on the guitar for control.',
    },
    {
      title: 'Play: Low E & A',
      body: ['Play the two thickest strings along with the metronome. Turn on Wait mode if it feels too fast.'],
      action: { label: 'Play exercise', to: '/play/ex-low-strings' },
    },
    {
      title: 'Play: All six',
      body: ['Now walk across all six strings and back.'],
      action: { label: 'Play exercise', to: '/play/ex-all-open' },
    },
  ],
  'first-notes': [
    {
      title: 'Pressing a fret',
      body: [
        'Press the string with your fingertip just behind the metal fret wire, not on top of it.',
        'Press only as hard as you need for a clean sound.',
      ],
      visual: { kind: 'fretboard', maxFret: 3, marks: [{ string: 0, fret: 1, label: '1' }, { string: 0, fret: 3, label: '3' }] },
      tip: 'Buzzing? Move your finger closer to the fret wire.',
    },
    {
      title: 'First frets on the high e',
      body: ['Play open, 1st fret (index finger) and 3rd fret (ring finger) on the thinnest string.'],
      action: { label: 'Play exercise', to: '/play/ex-first-frets' },
    },
    {
      title: 'Your first song',
      body: ['"Mary Had a Little Lamb" uses only four notes on the top two strings.', 'Try it with Wait mode on first, then without.'],
      action: { label: 'Play the song', to: '/play/song-mary-lamb' },
    },
    {
      title: 'Build finger strength',
      body: ['The spider walk uses one finger per fret. Do it slowly every day and your fingers will thank you.'],
      action: { label: 'Play spider walk', to: '/play/ex-spider' },
    },
  ],
  'first-chords': [
    {
      title: 'What is a chord?',
      body: ['A chord is several notes played together. You hold a shape with your fretting hand and strum.', 'Start with E minor: only two fingers!'],
      visual: { kind: 'chord', name: 'Em' },
    },
    {
      title: 'A minor',
      body: ['Same shape as E minor plus one finger, moved across one string. Don’t strum the thickest string.'],
      visual: { kind: 'chord', name: 'Am' },
    },
    {
      title: 'C major',
      body: ['A staircase: ring finger on A string fret 3, middle on D string fret 2, index on B string fret 1.'],
      visual: { kind: 'chord', name: 'C' },
      tip: 'Arch your fingers so the open G string can ring.',
    },
    {
      title: 'G and D',
      body: ['G uses all six strings with a stretch. D is a small triangle; strum only the top four strings.'],
      visual: { kind: 'chord', name: 'G' },
    },
    {
      title: 'Practice changing',
      body: ['The hardest part is switching between chords. Practice Em ↔ Am with the metronome.'],
      action: { label: 'Start follow-along', to: '/follow/em-am' },
    },
  ],
  strumming: [
    {
      title: 'Down-strums',
      body: ['Strum down across the strings on every beat: "1, 2, 3, 4".', 'Move from the elbow and wrist, and keep it relaxed.'],
      visual: { kind: 'rhythm', notes: ['quarter', 'quarter', 'quarter', 'quarter'] },
      action: { label: 'Practise down-strums', to: '/follow/down-strums' },
    },
    {
      title: 'Down and up',
      body: ['Now add an up-strum between each beat: "1 & 2 & 3 & 4 &". Down on numbers, up on "&".', 'Keep your hand moving like a pendulum, even when you don’t hit the strings.'],
      visual: { kind: 'rhythm', notes: ['eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth'] },
      action: { label: 'Practise down-up', to: '/follow/down-up' },
    },
    {
      title: 'Put it together',
      body: ['Strum G and C, four beats each. When it feels easy, raise the tempo a little.'],
      action: { label: 'G ↔ C follow-along', to: '/follow/g-c' },
    },
  ],
}
