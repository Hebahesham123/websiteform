'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { useLocale } from './LocaleContext'
import LoginForm from './LoginForm'
import Dashboard from './Dashboard'

export default function AuthGuard() {
  const { user, profile, loading, profileChecked, signOut, hasAccess, retryProfileFetch } = useAuth()
  const { t, dir } = useLocale()
  const signOutDone = useRef(false)

  // Only sign out when we know the user has a profile but wrong role — not when profile failed to load
  useEffect(() => {
    if (!user) {
      signOutDone.current = false
      return
    }
    if (profileChecked && profile !== null && !hasAccess && !signOutDone.current) {
      signOutDone.current = true
      signOut()
    }
  }, [user, profile, profileChecked, hasAccess, signOut])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center" dir={dir}>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="w-10 h-10 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  if (!profileChecked) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center" dir={dir}>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="w-10 h-10 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    // Profile failed to load or timed out — show retry instead of signing out
    if (profile === null) {
      return (
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center" dir={dir}>
          <div className="flex flex-col items-center gap-4 text-gray-300">
            <p className="text-sm">{t('profile_load_failed')}</p>
            <button
              type="button"
              onClick={() => retryProfileFetch()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
            >
              {t('retry')}
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center" dir={dir}>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="w-10 h-10 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm">{t('redirecting_to_login')}</p>
        </div>
      </div>
    )
  }

  return <Dashboard profile={profile!} />
}
