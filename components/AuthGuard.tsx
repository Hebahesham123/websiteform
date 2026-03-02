'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { useLocale } from './LocaleContext'
import LoginForm from './LoginForm'
import Dashboard from './Dashboard'

export default function AuthGuard() {
  const { user, profile, loading, signOut, hasAccess } = useAuth()
  const { t, dir } = useLocale()
  const signOutDone = useRef(false)

  useEffect(() => {
    if (!user) {
      signOutDone.current = false
      return
    }
    if (!hasAccess && !signOutDone.current) {
      signOutDone.current = true
      signOut()
    }
  }, [user, hasAccess, signOut])

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

  if (!hasAccess) {
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
