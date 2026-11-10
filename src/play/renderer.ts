// Canvas renderer for the play-along fretboard: perspective board, strings,
// scrolling note pills, bouncing ball and hit feedback.
import { RATING_LABEL, type PlayNote, type PlaySession, type Rating } from '../core/engine'

/** Note colors per string (0 = high E). Green is reserved for "hit". */
export const STRING_COLORS = ['#ff6b8b', '#ff9f43', '#ffc93c', '#4dd4ff', '#5b8cff', '#b07cff']
const HIT_COLOR = '#22d58a'
const MISS_COLOR = '#77748a'
const FEEDBACK_COLOR: Record<Rating, string> = {
  perfect: '#ffffff', good: '#d9fff0', early: '#ffe08a', late: '#ffe08a', missed: '#c9c6d6',
}

interface Layout {
  W: number
  H: number
  boardTop: number
  boardBottom: number
  hitX: number
  cx: number
  ppb: number
  stringY: number[]
  spacing: number
  pillH: number
}

interface BallPoint { start: number; string: number }

interface Particle { x: number; y: number; r: number; speed: number; phase: number }

export interface DrawOptions {
  leftHanded: boolean
  /** Height of the DOM bottom bar that covers the canvas, in CSS px. */
  bottomInset: number
  /** Seconds, for ambient animation. */
  time: number
}

export class FretboardRenderer {
  private ctx: CanvasRenderingContext2D
  private dpr = 1
  private width = 0
  private height = 0
  private ballSession: PlaySession | null = null
  private ballPoints: BallPoint[] = []
  private particles: Particle[] = Array.from({ length: 70 }, () => ({
    x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 2.2,
    speed: 0.004 + Math.random() * 0.012, phase: Math.random() * Math.PI * 2,
  }))
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.resize()
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = rect.width
    this.height = rect.height
    this.canvas.width = Math.round(rect.width * this.dpr)
    this.canvas.height = Math.round(rect.height * this.dpr)
  }

  private layout(opts: DrawOptions): Layout {
    const W = this.width
    const H = this.height
    // Short (phone landscape) screens give the board more of the height.
    const boardTop = Math.round(H * (H < 500 ? 0.32 : 0.44))
    const boardBottom = H - opts.bottomInset - 4
    const boardH = boardBottom - boardTop
    const pad = boardH * 0.1
    const k = 0.4 // perspective: strings get further apart toward the bottom
    const stringY = [0, 1, 2, 3, 4, 5].map((i) => {
      const t = i / 5
      return boardTop + pad + ((boardH - 2 * pad) * (t * (1 + k * t))) / (1 + k)
    })
    const spacing = (stringY[5] - stringY[0]) / 5
    return {
      W, H, boardTop, boardBottom,
      hitX: Math.max(90, W * 0.2),
      cx: W / 2,
      ppb: Math.min(200, Math.max(90, W / 7.5)),
      stringY,
      spacing,
      pillH: Math.min(40, spacing * 0.78),
    }
  }

  /** Perspective projection: vertical lines lean toward a vanishing point above the board. */
  private project(L: Layout, xb: number, y: number, left: boolean): number {
    const u = (y - L.boardTop) / (L.boardBottom - L.boardTop)
    const s = 0.86 + 0.14 * u
    const x = L.cx + (xb - L.cx) * s
    return left ? L.W - x : x
  }

  private ensureBallPoints(session: PlaySession) {
    if (this.ballSession === session) return
    this.ballSession = session
    const groups = new Map<number, number[]>()
    for (const n of session.notes) {
      if (n.skipped) continue
      const g = groups.get(n.start) ?? []
      g.push(n.string)
      groups.set(n.start, g)
    }
    const real: BallPoint[] = [...groups.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([start, strings]) => ({ start, string: strings.reduce((a, b) => a + b, 0) / strings.length }))
    const first = real[0]
    const countIn: BallPoint[] = []
    if (first) {
      for (let b = session.startBeat - session.countIn; b < first.start; b++) countIn.push({ start: b, string: first.string })
    }
    this.ballPoints = [...countIn, ...real]
  }

  draw(session: PlaySession, opts: DrawOptions) {
    const { ctx } = this
    const L = this.layout(opts)
    const left = opts.leftHanded
    const P = (xb: number, y: number) => this.project(L, xb, y, left)
    const boardX = (beat: number) => L.hitX + (beat - session.beat) * L.ppb

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, L.W, L.H)

    this.drawSky(L, opts.time)
    this.drawSections(session, L, P, boardX)

    // Board
    const wood = ctx.createLinearGradient(0, L.boardTop, 0, L.boardBottom)
    wood.addColorStop(0, '#262338')
    wood.addColorStop(1, '#353148')
    ctx.fillStyle = wood
    ctx.fillRect(0, L.boardTop, L.W, L.H - L.boardTop)
    ctx.fillStyle = 'rgba(255,255,255,.08)'
    ctx.fillRect(0, L.boardTop, L.W, 3)

    // Beat & bar lines
    const firstBeat = Math.floor(session.beat - (L.hitX + 200) / L.ppb)
    const lastBeat = Math.ceil(session.beat + (L.W - L.hitX + 200) / L.ppb)
    const bar = session.song.beatsPerBar
    for (let b = firstBeat; b <= lastBeat; b++) {
      const xb = boardX(b)
      const isBar = ((b % bar) + bar) % bar === 0
      ctx.strokeStyle = isBar ? 'rgba(170,150,255,.55)' : 'rgba(255,255,255,.08)'
      ctx.lineWidth = isBar ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(P(xb, L.boardTop), L.boardTop)
      ctx.lineTo(P(xb, L.boardBottom), L.boardBottom)
      ctx.stroke()
    }

    // Shade the "already played" side of the hit line
    ctx.fillStyle = 'rgba(10,8,20,.28)'
    ctx.beginPath()
    const edge = left ? L.W : 0
    ctx.moveTo(edge, L.boardTop)
    ctx.lineTo(P(L.hitX, L.boardTop), L.boardTop)
    ctx.lineTo(P(L.hitX, L.boardBottom), L.boardBottom)
    ctx.lineTo(edge, L.boardBottom)
    ctx.closePath()
    ctx.fill()

    this.drawStrings(L)
    this.drawHitLine(L, P, session)
    this.drawNotes(session, L, P, boardX, opts.time)
    this.drawBall(session, L, P, boardX)
    this.drawFeedback(session, L, P)
  }

  private drawSky(L: Layout, t: number) {
    const { ctx } = this
    const sky = ctx.createLinearGradient(0, 0, 0, L.boardTop)
    sky.addColorStop(0, '#3a1fa8')
    sky.addColorStop(0.6, '#6c4cf5')
    sky.addColorStop(1, '#9a6bff')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, L.W, L.boardTop)
    // soft rolling hills of light
    ctx.fillStyle = 'rgba(255,255,255,.06)'
    for (let layer = 0; layer < 2; layer++) {
      ctx.beginPath()
      ctx.moveTo(0, L.boardTop)
      for (let x = 0; x <= L.W; x += 20) {
        const y = L.boardTop * (0.55 + layer * 0.15) + Math.sin(x / (180 + layer * 90) + t * (0.15 + layer * 0.1)) * 18
        ctx.lineTo(x, y)
      }
      ctx.lineTo(L.W, L.boardTop)
      ctx.closePath()
      ctx.fill()
    }
    for (const p of this.particles) {
      const x = (((p.x - t * p.speed) % 1) + 1) % 1
      const y = p.y * L.boardTop * 0.95
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.5 + p.phase)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(x * L.W, y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  private drawSections(session: PlaySession, L: Layout, P: (x: number, y: number) => number, boardX: (b: number) => number) {
    const { ctx } = this
    ctx.font = `800 ${Math.round(Math.min(26, L.H * 0.035))}px Nunito, system-ui, sans-serif`
    ctx.textBaseline = 'bottom'
    for (const s of session.song.sections) {
      const x = P(boardX(s.start), L.boardTop)
      if (x < -300 || x > L.W + 300) continue
      ctx.strokeStyle = 'rgba(255,255,255,.25)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, L.boardTop * 0.62)
      ctx.lineTo(x, L.boardTop)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,.85)'
      ctx.textAlign = 'left'
      ctx.fillText(s.name, x + 10, L.boardTop * 0.62 + 30)
    }
  }

  private drawStrings(L: Layout) {
    const { ctx } = this
    L.stringY.forEach((y, i) => {
      const wound = i >= 3
      const w = 1.4 + i * 0.6
      ctx.lineWidth = w
      ctx.strokeStyle = wound ? '#c7a56a' : '#dfe2ea'
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(L.W, y)
      ctx.stroke()
      if (wound) {
        ctx.setLineDash([1.5, 2])
        ctx.strokeStyle = 'rgba(80,55,20,.6)'
        ctx.lineWidth = w * 0.8
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(L.W, y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    })
  }

  private drawHitLine(L: Layout, P: (x: number, y: number) => number, session: PlaySession) {
    const { ctx } = this
    ctx.save()
    ctx.shadowColor = session.waiting ? '#ffd166' : '#ffffff'
    ctx.shadowBlur = 14
    ctx.strokeStyle = session.waiting ? '#ffd166' : 'rgba(255,255,255,.9)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(P(L.hitX, L.boardTop), L.boardTop)
    ctx.lineTo(P(L.hitX, L.boardBottom), L.boardBottom)
    ctx.stroke()
    ctx.restore()
  }

  private drawNotes(session: PlaySession, L: Layout, P: (x: number, y: number) => number, boardX: (b: number) => number, t: number) {
    const { ctx } = this
    const minBeat = session.beat - (L.hitX + 100) / L.ppb
    const maxBeat = session.beat + (L.W - L.hitX + 100) / L.ppb
    const pending = session.waiting ? session.pendingNote() : undefined
    const h = L.pillH
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.font = `900 ${Math.round(h * 0.62)}px Nunito, system-ui, sans-serif`

    // Draw back-to-front: notes further right first
    const visible: PlayNote[] = []
    for (const n of session.notes) {
      if (n.start > maxBeat) break
      if (n.start + n.duration < minBeat || n.skipped) continue
      visible.push(n)
    }
    for (let i = visible.length - 1; i >= 0; i--) {
      const n = visible[i]
      const y = L.stringY[n.string]
      const xa = P(boardX(n.start), y)
      const xbEnd = P(boardX(n.start + n.duration), y)
      const gap = Math.min(6, Math.abs(xbEnd - xa) * 0.08)
      const len = Math.max(h * 1.15, Math.abs(xbEnd - xa) - gap)
      // Pill starts at the note-on edge (left for right-handed, right when mirrored)
      const x0 = xa < xbEnd ? xa - h / 2 : xa - len + h / 2
      const x1 = x0 + len
      const color = n.rating === null ? STRING_COLORS[n.string] : n.rating === 'missed' ? MISS_COLOR : HIT_COLOR

      ctx.save()
      if (n.rating && n.rating !== 'missed') {
        ctx.shadowColor = HIT_COLOR
        ctx.shadowBlur = 18
      }
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(x0, y - h / 2, x1 - x0, h, h / 2)
      ctx.fill()
      ctx.restore()
      // subtle top highlight
      ctx.fillStyle = 'rgba(255,255,255,.18)'
      ctx.beginPath()
      ctx.roundRect(x0 + 3, y - h / 2 + 2, x1 - x0 - 6, h * 0.36, h / 4)
      ctx.fill()

      if (pending && n.start === pending.start) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 8)
        ctx.strokeStyle = `rgba(255,209,102,${0.5 + pulse * 0.5})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(x0 - 5 - pulse * 3, y - h / 2 - 5 - pulse * 3, x1 - x0 + 10 + pulse * 6, h + 10 + pulse * 6, h / 2 + 5)
        ctx.stroke()
      }

      ctx.fillStyle = n.rating === null ? '#1f1a33' : '#ffffff'
      const labelX = xa < xbEnd ? x0 + h * 0.55 : x1 - h * 0.55
      ctx.fillText(String(n.fret), labelX, y + 1)
    }
  }

  private ballY(L: Layout, string: number): number {
    const i = Math.floor(string)
    const f = string - i
    const a = L.stringY[Math.min(5, i)]
    const b = L.stringY[Math.min(5, i + 1)]
    return a + (b - a) * f - L.pillH * 0.55
  }

  private drawBall(session: PlaySession, L: Layout, P: (x: number, y: number) => number, boardX: (b: number) => number) {
    this.ensureBallPoints(session)
    const pts = this.ballPoints
    if (!pts.length) return
    const { ctx } = this
    const beat = session.beat
    let i = -1
    for (let j = 0; j < pts.length; j++) {
      if (pts[j].start <= beat) i = j
      else break
    }

    const arcPoint = (a: BallPoint, b: BallPoint, u: number) => {
      const gap = b.start - a.start
      const height = Math.min((L.boardBottom - L.boardTop) * 0.55, Math.max(30, gap * L.ppb * 0.32))
      const base = this.ballY(L, a.string) + (this.ballY(L, b.string) - this.ballY(L, a.string)) * u
      return base - height * 4 * u * (1 - u)
    }

    // Dotted trail for upcoming hops
    const maxBeat = beat + (L.W - L.hitX) / L.ppb
    ctx.fillStyle = 'rgba(255,255,255,.55)'
    for (let j = Math.max(0, i - 1); j < pts.length - 1; j++) {
      const a = pts[j]
      const b = pts[j + 1]
      if (a.start > maxBeat) break
      const steps = Math.max(4, Math.round(((b.start - a.start) * L.ppb) / 13))
      for (let s = 1; s < steps; s++) {
        const u = s / steps
        const bt = a.start + (b.start - a.start) * u
        const y = arcPoint(a, b, u)
        const ahead = bt >= beat
        ctx.globalAlpha = ahead ? 0.6 : Math.max(0, 0.35 - (beat - bt) * 0.25)
        if (ctx.globalAlpha <= 0) continue
        ctx.beginPath()
        ctx.arc(P(boardX(bt), y), y, ahead ? 2.6 : 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    // The ball itself, always on the hit line
    let y: number
    if (i < 0) y = this.ballY(L, pts[0].string)
    else if (i >= pts.length - 1) y = this.ballY(L, pts[pts.length - 1].string)
    else {
      const a = pts[i]
      const b = pts[i + 1]
      y = arcPoint(a, b, (beat - a.start) / (b.start - a.start))
    }
    const r = Math.max(9, L.pillH * 0.42)
    const x = P(L.hitX, y)
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,.35)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 4
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y - r * 0.2, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private drawFeedback(session: PlaySession, L: Layout, P: (x: number, y: number) => number) {
    const { ctx } = this
    const size = Math.round(Math.min(30, Math.max(18, L.H * 0.04)))
    ctx.font = `900 ${size}px Nunito, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.lineJoin = 'round'
    for (const f of session.feedback) {
      const age = session.elapsed - f.at
      if (age > 0.9 || age < 0) continue
      const y = L.stringY[f.note.string] - L.pillH * 0.6 - age * 40
      const x = P(L.hitX, y) + (f.rating === 'missed' ? 0 : 40) * (P(1, y) > P(0, y) ? 1 : -1)
      ctx.globalAlpha = Math.min(1, (0.9 - age) * 3)
      ctx.lineWidth = 5
      ctx.strokeStyle = 'rgba(20,16,40,.75)'
      ctx.strokeText(RATING_LABEL[f.rating], x, y)
      ctx.fillStyle = FEEDBACK_COLOR[f.rating]
      ctx.fillText(RATING_LABEL[f.rating], x, y)
    }
    ctx.globalAlpha = 1
  }
}
