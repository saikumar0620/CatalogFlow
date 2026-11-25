import { useCallback, useEffect, useRef, useState } from 'react'

export function useToasts(durationMs = 3500) {
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)
  const toastTimersRef = useRef(new Map())

  const dismissToast = useCallback((id) => {
    const timer = toastTimersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev.slice(-3), { id, message, type }])
    const timer = setTimeout(() => {
      toastTimersRef.current.delete(id)
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, durationMs)
    toastTimersRef.current.set(id, timer)
  }, [durationMs])

  useEffect(() => () => {
    toastTimersRef.current.forEach((timer) => clearTimeout(timer))
    toastTimersRef.current.clear()
  }, [])

  return { toasts, addToast, dismissToast }
}
