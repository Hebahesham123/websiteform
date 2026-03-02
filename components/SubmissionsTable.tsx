'use client'

import type { SampleInquiry, SubmissionStatus } from '@/lib/supabase'
import { useLocale } from './LocaleContext'
import StatusSelect from './StatusSelect'
import RequestedSamplesCell from './RequestedSamplesCell'
import CommentCell from './CommentCell'

function formatDate(val: string | null, locale: string) {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return String(val)
  return d.toLocaleString(locale === 'ar' ? 'ar-EG' : undefined, { dateStyle: 'short', timeStyle: 'short' })
}

export default function SubmissionsTable({
  submissions,
  pendingStatus = {},
  statusFilter = '',
  onStatusFilterChange,
  onExport,
  onSelect,
  onStatusDraft,
  onStatusSave,
  onCommentChange,
  sortOrder,
  onSortChange,
  limit,
  onLimitChange,
  searchQuery,
  onSearchChange,
  isLoading,
  selectedId,
}: {
  submissions: SampleInquiry[]
  pendingStatus?: Record<string, SubmissionStatus>
  statusFilter?: string
  onStatusFilterChange?: (status: string) => void
  onExport?: (rows: SampleInquiry[]) => void
  onSelect: (row: SampleInquiry) => void
  onStatusDraft: (id: string, status: SubmissionStatus) => void
  onStatusSave: (id: string) => void
  onCommentChange: (id: string, comment: string | null) => void
  sortOrder: 'desc' | 'asc'
  onSortChange: (order: 'desc' | 'asc') => void
  limit: number
  onLimitChange: (n: number) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  isLoading: boolean
  selectedId: string | null
}) {
  const { t, locale } = useLocale()

  const bySearch = searchQuery.trim()
    ? submissions.filter((row) =>
        Object.values(row).some(
          (v) => v != null && String(v).toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
      )
    : submissions

  const filtered =
    statusFilter === ''
      ? bySearch
      : bySearch.filter((row) => (row.status ?? 'new') === statusFilter)

  const sorted = [...filtered].sort((a, b) => {
    const t1 = new Date(a.created_at).getTime()
    const t2 = new Date(b.created_at).getTime()
    return sortOrder === 'desc' ? t2 - t1 : t1 - t2
  })

  const displayed = sorted.slice(0, limit)

  return (
    <div className="rounded-lg border border-gray-800 bg-[#161b22] overflow-hidden">
      <div className="p-3 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-gray-300">{t('submissions')}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="search"
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-40 sm:w-48 pl-3 pr-3 py-1.5 rounded-md bg-[#0d1117] border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 whitespace-nowrap">{t('filter_status')}:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange?.(e.target.value)}
              className="py-1.5 px-2 rounded-md bg-[#0d1117] border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[120px]"
              title={t('filter_status')}
            >
              <option value="">{t('filter_all')}</option>
            <option value="new">{t('status_new')}</option>
            <option value="reached">{t('status_reached')}</option>
            <option value="done">{t('status_done')}</option>
            <option value="cancelled">{t('status_cancelled')}</option>
            <option value="not_reached">{t('status_not_reached')}</option>
            </select>
          </div>
          <select
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value as 'desc' | 'asc')}
            className="py-1.5 px-2 rounded-md bg-[#0d1117] border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="desc">{t('newest')}</option>
            <option value="asc">{t('oldest')}</option>
          </select>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="py-1.5 px-2 rounded-md bg-[#0d1117] border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          {onExport && (
            <button
              type="button"
              onClick={() => onExport(sorted)}
              disabled={sorted.length === 0}
              className="py-1.5 px-3 rounded-md bg-emerald-600/80 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t('export')}
            </button>
          )}
        </div>
      </div>
      <div className="min-h-[200px] overflow-x-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500 text-sm">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
            {t('loading')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-[#0d1117]/50">
                <th className="text-left py-2.5 px-2 text-xs font-medium text-gray-500 w-10">{t('serial_no')}</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">{t('date')}</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">{t('name')}</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 hidden sm:table-cell">{t('phone')}</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">{t('requested_samples')}</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">{t('status')}</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 min-w-[120px]">{t('comment')}</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 w-16" />
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-500 text-sm">
                    {submissions.length === 0 ? t('no_submissions') : t('no_matching')}
                  </td>
                </tr>
              ) : displayed.map((row, index) => {
                const serial = sorted.findIndex((r) => r.id === row.id) + 1
                return (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row)}
                  className={`border-b border-gray-800/80 cursor-pointer hover:bg-[#21262d]/60 transition-colors ${selectedId === row.id ? 'bg-[#21262d]' : ''}`}
                >
                  <td className="py-2.5 px-2 text-gray-500 text-center tabular-nums w-10">
                    {serial}
                  </td>
                  <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">
                    {formatDate(row.created_at, locale)}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-gray-200">{row.name ?? '—'}</td>
                  <td className="py-2.5 px-3 text-gray-400 hidden sm:table-cell">{row.phone ?? '—'}</td>
                  <td className="py-2.5 px-3 max-w-[160px]" onClick={(e) => e.stopPropagation()}>
                    <RequestedSamplesCell value={row.requested_samples} />
                  </td>
                  <td className="py-2.5 px-3 align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusSelect
                        submission={{ ...row, status: pendingStatus[row.id] ?? row.status ?? 'new' }}
                        onStatusChange={onStatusDraft}
                        size="sm"
                      />
                      {(pendingStatus[row.id] !== undefined && pendingStatus[row.id] !== (row.status ?? 'new')) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onStatusSave(row.id)
                          }}
                          className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 shrink-0"
                        >
                          {t('save')}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 align-top" onClick={(e) => e.stopPropagation()}>
                    <CommentCell
                      id={row.id}
                      comment={row.comment ?? null}
                      onBlur={onCommentChange}
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(row)
                      }}
                      className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                    >
                      {t('view')}
                    </button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="px-3 py-2 border-t border-gray-800 text-xs text-gray-500">
        {filtered.length === 0 ? (
          <span>{t('submissions')}</span>
        ) : (
          <>
            {displayed.length} {t('of')} {filtered.length}
          </>
        )}
      </div>
    </div>
  )
}
