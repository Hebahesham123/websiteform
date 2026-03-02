'use client'

import { useEffect, useState } from 'react'
import { supabase, ACTIVITY_TABLE, type SampleInquiry, type SubmissionActivity, type SubmissionStatus } from '@/lib/supabase'
import { useLocale } from './LocaleContext'
import StatusSelect from './StatusSelect'

const LABEL_KEYS: Record<string, string> = {
  name: 'name',
  phone: 'phone',
  address: 'address',
  message: 'message',
  requested_samples: 'requested_samples',
  attachment_name: 'attachment',
  attachment_url: 'attachment_link',
  created_at: 'submitted',
}

function formatDate(val: string | null, locale: 'en' | 'ar') {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return d.toLocaleString(locale === 'ar' ? 'ar-EG' : undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function SubmissionDetail({
  submission,
  onClose,
  onStatusChange,
  onCommentChange,
}: {
  submission: SampleInquiry | null
  onClose: () => void
  onStatusChange: (id: string, status: import('@/lib/supabase').SubmissionStatus) => void
  onCommentChange: (id: string, comment: string | null) => void
}) {
  const { t, dir, locale } = useLocale()
  const [comment, setComment] = useState(submission?.comment ?? '')
  const [draftStatus, setDraftStatus] = useState<SubmissionStatus | null>(null)
  const [activity, setActivity] = useState<SubmissionActivity[]>([])
  const [activityError, setActivityError] = useState<string | null>(null)
  const [logsOpen, setLogsOpen] = useState(false)

  useEffect(() => {
    if (!submission) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [submission, onClose])

  useEffect(() => {
    if (!submission?.id) return
    setActivityError(null)
    supabase
      .from(ACTIVITY_TABLE)
      .select('*')
      .eq('sample_inquiry_id', submission.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setActivityError(error.message)
          setActivity([])
          return
        }
        setActivity((data as SubmissionActivity[]) ?? [])
      })
  }, [submission?.id, submission?.status, submission?.comment])

  if (!submission) return null

  useEffect(() => {
    setComment(submission?.comment ?? '')
  }, [submission?.id, submission?.comment])
  useEffect(() => {
    setDraftStatus(null)
  }, [submission?.id, submission?.status])

  const formatStatusLabel = (value: string) => {
    const key = `status_${value}` as keyof typeof t
    return typeof t(key) === 'string' ? t(key) : value
  }
  const formatActivityDetails = (act: SubmissionActivity) => {
    if (act.action === 'status_update' && act.details) {
      const [from, to] = act.details.split(' → ')
      return `${formatStatusLabel(from?.trim() || '')} → ${formatStatusLabel(to?.trim() || '')}`
    }
    return act.details || ''
  }

  const entries = Object.entries(submission).filter(
    ([k]) => k !== 'id' && k !== 'status' && k !== 'comment' && k !== 'not_reached_count' && k !== 'not_reached_last_at'
  )

  const isRtl = dir === 'rtl'

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className={`fixed top-0 bottom-0 z-50 w-full max-w-md bg-[#161b22] border-gray-800 shadow-xl overflow-y-auto detail-panel ${
          isRtl ? 'left-0 border-r' : 'right-0 border-l'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <div className="sticky top-0 bg-[#161b22] border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <h2 id="detail-title" className="text-base font-semibold">
            {t('submission')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-gray-500 hover:text-white hover:bg-gray-800"
            aria-label={t('close')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <span className="text-xs text-gray-500 block mb-1">{t('status')}</span>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusSelect
                submission={{ ...submission, status: draftStatus ?? submission.status ?? 'new' }}
                onStatusChange={(_, status) => setDraftStatus(status)}
                size="md"
              />
              {draftStatus != null && draftStatus !== (submission.status ?? 'new') && (
                <button
                  type="button"
                  onClick={() => {
                    onStatusChange(submission.id, draftStatus)
                    setDraftStatus(null)
                  }}
                  className="px-2.5 py-1.5 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-500"
                >
                  {t('save')}
                </button>
              )}
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-1">{t('comment')}</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onBlur={() => onCommentChange(submission.id, comment.trim() || null)}
              placeholder={t('comment')}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y min-h-[80px]"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={() => setLogsOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-[#0d1117] border border-gray-700 text-left hover:bg-[#161b22] hover:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              aria-expanded={logsOpen}
            >
              <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-gray-500">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                {t('activity_title')}
                {activity.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-gray-700 text-gray-300 text-xs font-medium">
                    {activity.length}
                  </span>
                )}
              </span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`shrink-0 text-gray-500 transition-transform ${logsOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {logsOpen && (
              <div className="mt-2 space-y-4 pl-1">
                {activityError ? (
                  <p className="text-sm text-amber-400 py-2" role="alert">
                    {t('activity_load_error')}
                  </p>
                ) : activity.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">{t('activity_empty')}</p>
                ) : (
                  <>
                    {(() => {
                      const statusLogs = activity.filter((a) => a.action === 'status_update')
                      const commentLogs = activity.filter((a) => a.action === 'comment_update')
                      return (
                        <>
                          {statusLogs.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                {t('logs_status_title')} ({statusLogs.length})
                              </h4>
                              <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {statusLogs.map((act) => (
                                  <li
                                    key={act.id}
                                    className="text-sm border-l-2 rtl:border-l-0 rtl:border-r-2 border-emerald-600/50 pl-3 rtl:pl-0 rtl:pr-3 py-1.5 bg-[#0d1117]/50 rounded-r rtl:rounded-r-none rtl:rounded-l"
                                  >
                                    <span className="text-gray-400 block text-xs">
                                      {formatDate(act.created_at, locale)}
                                    </span>
                                    <span className="text-gray-300 font-medium">{act.user_email}</span>
                                    <span className="text-gray-500 mx-1">·</span>
                                    <span className="text-gray-400">
                                      {formatActivityDetails(act) || t('activity_status')}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {commentLogs.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                {t('logs_comment_title')} ({commentLogs.length})
                              </h4>
                              <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {commentLogs.map((act) => (
                                  <li
                                    key={act.id}
                                    className="text-sm border-l-2 rtl:border-l-0 rtl:border-r-2 border-blue-600/50 pl-3 rtl:pl-0 rtl:pr-3 py-1.5 bg-[#0d1117]/50 rounded-r rtl:rounded-r-none rtl:rounded-l"
                                  >
                                    <span className="text-gray-400 block text-xs">
                                      {formatDate(act.created_at, locale)}
                                    </span>
                                    <span className="text-gray-300 font-medium">{act.user_email}</span>
                                    <span className="text-gray-500 mx-1">·</span>
                                    <span className="text-gray-400 whitespace-pre-wrap break-words">
                                      {formatActivityDetails(act) || t('activity_comment')}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {statusLogs.length === 0 && commentLogs.length === 0 && (
                            <p className="text-sm text-gray-500 py-2">{t('activity_empty')}</p>
                          )}
                        </>
                      )
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
          {entries.map(([key, value]) => {
            const labelKey = LABEL_KEYS[key] ?? key
            const label = t(labelKey)
            const isUrl = key === 'attachment_url' && value && typeof value === 'string'
            const isDate = key === 'created_at'
            return (
              <div key={key}>
                <span className="text-xs text-gray-500 block mb-0.5">{label}</span>
                <div className="text-sm text-gray-200">
                  {isUrl ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {t('open_attachment')}
                    </a>
                  ) : isDate ? (
                    formatDate(value as string, locale)
                  ) : value != null && value !== '' ? (
                    <span className="whitespace-pre-wrap break-words">{String(value)}</span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
