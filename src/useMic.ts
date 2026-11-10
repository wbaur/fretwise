import { useCallback, useEffect, useRef, useState } from 'react'
import { MicInput } from './core/audio/mic'
import { getProgress } from './core/progress'

export type MicStatus = 'off' | 'starting' | 'on' | 'denied' | 'error'

/** Owns one MicInput for the lifetime of a screen. */
export function useMic() {
  const mic = useRef(new MicInput()).current
  const [status, setStatus] = useState<MicStatus>('off')
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    setStatus('starting')
    setError(null)
    try {
      await mic.start(getProgress().settings.micDeviceId)
      setStatus('on')
      return true
    } catch (e) {
      const err = e as DOMException
      if (err?.name === 'NotAllowedError') {
        setStatus('denied')
        setError('Microphone access was blocked. Allow it in your browser’s site settings, then try again.')
      } else {
        setStatus('error')
        setError(err?.message || 'Could not start the microphone.')
      }
      return false
    }
  }, [mic])

  const stop = useCallback(() => {
    mic.stop()
    setStatus('off')
  }, [mic])

  useEffect(() => () => mic.stop(), [mic])

  return { mic, status, error, start, stop }
}
