'use client'

import { X, CheckCircle, XCircle, Info } from 'lucide-react'
import { useToastStore } from '../../lib/toast'

export function Toaster() {
  const { toasts, remove } = useToastStore()
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none w-80">
      {toasts.map(t => {
        const isSuccess = t.type === 'success'
        const isError = t.type === 'error'
        const color = isSuccess ? '#34d399' : isError ? '#f87171' : '#06b6d4'
        const bg = isSuccess ? 'rgba(16,185,129,0.12)' : isError ? 'rgba(248,113,113,0.12)' : 'rgba(6,182,212,0.12)'
        const border = isSuccess ? 'rgba(16,185,129,0.3)' : isError ? 'rgba(248,113,113,0.3)' : 'rgba(6,182,212,0.3)'

        return (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl pointer-events-auto kv-anim"
            style={{ background: bg, border: `1px solid ${border}`, backdropFilter: 'blur(12px)' }}
          >
            {isSuccess
              ? <CheckCircle className="h-4 w-4 shrink-0" style={{ color }} />
              : isError
              ? <XCircle className="h-4 w-4 shrink-0" style={{ color }} />
              : <Info className="h-4 w-4 shrink-0" style={{ color }} />
            }
            <span className="flex-1 text-sm text-foreground">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
