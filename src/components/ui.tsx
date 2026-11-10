import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 4C17 4 7 12 7 24c0 15 14 30 25 36 11-6 25-21 25-36C57 12 47 4 32 4z" fill="var(--brand)" />
      <path d="M22 22h20M22 31h20M22 40h20" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".55" />
      <circle cx="37" cy="31" r="6" fill="#fff" />
    </svg>
  )
}

export function PageHeader({ title, subtitle, back = '/' }: { title: string; subtitle?: string; back?: string }) {
  const navigate = useNavigate()
  return (
    <header className="page-header">
      <button className="icon-btn" onClick={() => navigate(back)} aria-label="Back">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
    </header>
  )
}

export function Difficulty({ level }: { level: number }) {
  return (
    <span className="difficulty" aria-label={`Difficulty ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= level ? 'on' : ''} />
      ))}
    </span>
  )
}

export function ListItem({ to, title, meta, right, onClick }: {
  to?: string; title: string; meta?: ReactNode; right?: ReactNode; onClick?: () => void
}) {
  const body = (
    <>
      <div className="list-item-text">
        <strong>{title}</strong>
        {meta && <span className="muted">{meta}</span>}
      </div>
      {right}
      <svg className="chev" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  )
  return to ? (
    <Link className="list-item" to={to}>{body}</Link>
  ) : (
    <button className="list-item" onClick={onClick}>{body}</button>
  )
}
