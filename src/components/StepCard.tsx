import { Link } from 'react-router-dom'
import type { Visual } from '../core/quiz'
import { VisualView } from './visuals'

export interface StepContent {
  title: string
  body: string[]
  visual?: Visual
  tip?: string
  action?: { label: string; to: string }
}

/** One page of a lesson or theory mini-lesson. */
export function StepCard({ step, index, total }: { step: StepContent; index: number; total: number }) {
  return (
    <article className="step-card">
      <div className="step-count">{index + 1} / {total}</div>
      <h2>{step.title}</h2>
      {step.visual && <div className="step-visual"><VisualView visual={step.visual} /></div>}
      {step.body.map((p, i) => <p key={i}>{p}</p>)}
      {step.tip && <p className="step-tip">💡 {step.tip}</p>}
      {step.action && <Link className="btn btn-ghost step-action" to={step.action.to}>{step.action.label} →</Link>}
    </article>
  )
}

export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="step-dots" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => <span key={i} className={i === current ? 'now' : i < current ? 'past' : ''} />)}
    </div>
  )
}
