import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const show = useCallback((message, { tone = 'info', duration = 3600 } = {}) => {
    setToast({ message, tone, key: Date.now() })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), duration)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" aria-live="polite" role="status">
        {toast && <div key={toast.key} className={`toast tone-${toast.tone}`}>{toast.message}</div>}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
