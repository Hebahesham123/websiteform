'use client'

import { useState, useEffect, useRef } from 'react'
import { useLocale } from './LocaleContext'

const PREVIEW_LEN = 25

export default function CommentCell({
  id,
  comment,
  onBlur,
}: {
  id: string
  comment: string | null
  onBlur: (id: string, comment: string | null) => void
}) {
  const { t, dir } = useLocale()
  const [value, setValue] = useState(comment ?? '')
  const [expanded, setExpanded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setValue(comment ?? '')
  }, [id, comment])

  useEffect(() => {
    if (!expanded) return
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setExpanded(false)
        onBlur(id, value.trim() || null)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [expanded, id, value, onBlur])

  const preview = value.trim()
    ? value.length <= PREVIEW_LEN
      ? value
      : value.slice(0, PREVIEW_LEN) + '…'
    : ''

  const handleSave = () => {
    onBlur(id, value.trim() || null)
    setExpanded(false)
  }

  return (
    <div className="relative min-w-[80px] max-w-[200px]" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full text-left px-2 py-1 rounded bg-[#0d1117] border border-gray-700 text-gray-200 text-xs placeholder-gray-500 hover:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[28px]"
      >
        {preview || <span className="text-gray-500">{t('comment_add')}</span>}
      </button>
      {expanded && (
        <div className={`absolute top-full mt-1 z-[100] w-[320px] max-w-[90vw] rounded-lg bg-[#21262d] border border-gray-600 shadow-xl p-3 ${dir === 'rtl' ? 'left-0' : 'right-0'}`}>
          <label className="block text-xs text-gray-400 mb-1">{t('comment')}</label>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('comment')}
            rows={6}
            className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y min-h-[100px]"
            autoFocus
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="px-3 py-1.5 rounded-md text-sm text-gray-300 hover:bg-gray-700 border border-gray-600"
            >
              {t('close')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-500"
            >
              {t('save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
