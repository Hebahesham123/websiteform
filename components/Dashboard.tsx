'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, TABLE_NAME, CREATED_AT_COLUMN, ACTIVITY_TABLE, NOT_REACHED_COOLDOWN_MS, type SampleInquiry, type SubmissionStatus, type Profile } from '@/lib/supabase'
import { useLocale } from './LocaleContext'
import { useAuth } from './AuthContext'
import StatsCards from './StatsCards'
import SubmissionsTable from './SubmissionsTable'
import SubmissionDetail from './SubmissionDetail'

function getTodayAndWeek(submissions: SampleInquiry[]) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  let today = 0
  let week = 0
  submissions.forEach((row) => {
    const t = row[CREATED_AT_COLUMN as keyof SampleInquiry]
    if (t == null) return
    const d = new Date(t as string)
    if (isNaN(d.getTime())) return
    if (d >= startOfToday) today++
    if (d >= startOfWeek) week++
  })
  return { today, week }
}

export default function Dashboard({ profile }: { profile: Profile }) {
  const { t, locale, setLocale, dir } = useLocale()
  const { signOut } = useAuth()
  const [submissions, setSubmissions] = useState<SampleInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SampleInquiry | null>(null)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [limit, setLimit] = useState(25)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [toast, setToast] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<Record<string, SubmissionStatus>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order(CREATED_AT_COLUMN, { ascending: false })
    setLoading(false)
    if (e) {
      setError(e.message)
      return
    }
    setSubmissions(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const logActivity = useCallback(
    async (inquiryId: string, action: string, details: string | null) => {
      const { error } = await supabase.from(ACTIVITY_TABLE).insert({
        sample_inquiry_id: inquiryId,
        user_id: profile.user_id,
        user_email: profile.email,
        action,
        details,
      })
      if (error) {
        console.error('Activity log insert failed:', error.message)
      }
    },
    [profile.user_id, profile.email]
  )

  const updateStatus = useCallback(
    async (id: string, status: SubmissionStatus) => {
      const sub = submissions.find((s) => s.id === id)
      const oldStatus = sub?.status ?? 'new'

      if (status === 'not_reached' && oldStatus === 'done') {
        setToast(t('not_reached_when_done'))
        setTimeout(() => setToast(null), 4000)
        return
      }
      if (status === 'not_reached') {
        const lastAt = sub?.not_reached_last_at ? new Date(sub.not_reached_last_at).getTime() : 0
        const now = Date.now()
        if (lastAt && now - lastAt < NOT_REACHED_COOLDOWN_MS) {
          setToast(t('not_reached_wait'))
          setTimeout(() => setToast(null), 4000)
          return
        }
      }

      const payload: Record<string, unknown> = { status }
      if (status === 'not_reached') {
        payload.not_reached_count = (sub?.not_reached_count ?? 0) + 1
        payload.not_reached_last_at = new Date().toISOString()
      }

      const { error: e } = await supabase.from(TABLE_NAME).update(payload).eq('id', id)
      if (e) {
        setToast(t('failed_to_update_status'))
        setTimeout(() => setToast(null), 3000)
        return
      }
      await logActivity(id, 'status_update', `${oldStatus} → ${status}`)
      const nextCount = status === 'not_reached' ? (sub?.not_reached_count ?? 0) + 1 : sub?.not_reached_count
      const nextLastAt = status === 'not_reached' ? new Date().toISOString() : sub?.not_reached_last_at
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status, not_reached_count: nextCount, not_reached_last_at: nextLastAt }
            : s
        )
      )
      if (selected?.id === id)
        setSelected((s) =>
          s ? { ...s, status, not_reached_count: nextCount, not_reached_last_at: nextLastAt } : null
        )
    },
    [selected?.id, t, submissions, logActivity]
  )

  const onStatusDraft = useCallback((id: string, status: SubmissionStatus) => {
    setPendingStatus((prev) => ({ ...prev, [id]: status }))
  }, [])

  const onStatusSave = useCallback(
    async (id: string) => {
      const sub = submissions.find((s) => s.id === id)
      const savedStatus = sub?.status ?? 'new'
      const statusToSave = pendingStatus[id] ?? savedStatus
      if (statusToSave === savedStatus) {
        setPendingStatus((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        return
      }
      await updateStatus(id, statusToSave)
      setPendingStatus((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    },
    [submissions, pendingStatus, updateStatus]
  )

  const updateComment = useCallback(
    async (id: string, comment: string | null) => {
      const { error: e } = await supabase.from(TABLE_NAME).update({ comment: comment || null }).eq('id', id)
      if (e) {
        setToast(t('failed_to_update_status'))
        setTimeout(() => setToast(null), 3000)
        return
      }
      await logActivity(id, 'comment_update', comment ? comment.slice(0, 200) : null)
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, comment: comment || null } : s))
      )
      if (selected?.id === id) setSelected((s) => (s ? { ...s, comment: comment || null } : null))
    },
    [selected?.id, t, logActivity]
  )

  useEffect(() => {
    const channel = supabase
      .channel('sample_inquiries_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: TABLE_NAME },
        (payload) => {
          const row = payload.new as SampleInquiry
          if (row) {
            setSubmissions((prev) => [row, ...prev])
            setToast(t('new_submission'))
            setTimeout(() => setToast(null), 4000)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: TABLE_NAME },
        (payload) => {
          const row = payload.new as SampleInquiry
          if (row) {
            setSubmissions((prev) => prev.map((s) => (s.id === row.id ? row : s)))
            setSelected((prev) => (prev?.id === row.id ? row : prev))
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [t])

  const { today, week } = getTodayAndWeek(submissions)

  const handleExport = useCallback((rows: SampleInquiry[]) => {
    const escape = (v: unknown): string => {
      const s = v == null ? '' : String(v)
      if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"'
      }
      return s
    }
    const statusLabel = (s: string | null | undefined) =>
      t(`status_${s ?? 'new'}` as 'status_new') || String(s ?? 'new')
    const headers = ['No.', 'Date', 'Name', 'Phone', 'Address', 'Message', 'Requested samples', 'Status', 'Comment', 'Created at']
    const csvRows = [
      headers.join(','),
      ...rows.map((row, i) =>
        [
          i + 1,
          escape(row.created_at ?? ''),
          escape(row.name),
          escape(row.phone),
          escape(row.address),
          escape(row.message),
          escape(row.requested_samples),
          escape(statusLabel(row.status)),
          escape(row.comment),
          escape(row.created_at ?? ''),
        ].join(',')
      ),
    ]
    const csv = csvRows.join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sample-inquiries-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [t])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir={dir}>
        <div className="text-center max-w-md">
          <p className="text-red-400 font-medium">{t('failed_to_load')}</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 font-medium"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100" dir={dir} lang={locale === 'ar' ? 'ar' : 'en'}>
      <header className="border-b border-gray-800 bg-[#161b22]/80 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">{t('title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 hidden sm:inline">
              {profile.email}
              <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 text-xs font-medium">
                {profile.role === 'admin' ? t('role_admin') : t('role_call_center')}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700"
            >
              {locale === 'ar' ? t('lang_en') : t('lang_ar')}
            </button>
            <button
              type="button"
              onClick={() => fetchData()}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              {t('refresh')}
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="text-sm text-gray-400 hover:text-white"
            >
              {t('sign_out')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <StatsCards total={submissions.length} today={today} week={week} />
        <SubmissionsTable
          submissions={submissions}
          pendingStatus={pendingStatus}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onExport={handleExport}
          onSelect={setSelected}
          onStatusDraft={onStatusDraft}
          onStatusSave={onStatusSave}
          onCommentChange={updateComment}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          limit={limit}
          onLimitChange={setLimit}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isLoading={loading}
          selectedId={selected?.id ?? null}
        />
      </main>

      {selected && (
        <SubmissionDetail
          submission={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(id, status) => {
            updateStatus(id, status)
            setPendingStatus((prev) => {
              const next = { ...prev }
              delete next[id]
              return next
            })
          }}
          onCommentChange={updateComment}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#21262d] border border-gray-700 text-green-400 text-sm toast-enter" style={dir === 'rtl' ? { right: 'auto', left: '1.5rem' } : undefined}>
          {toast}
        </div>
      )}
    </div>
  )
}
