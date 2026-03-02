'use client'

import { useAuth } from './AuthContext'
import { useLocale } from './LocaleContext'
import LoginForm from './LoginForm'
import Dashboard from './Dashboard'

export default function AuthGuard() {
  const { user, profile, loading, signOut, hasAccess } = useAuth()
  const { t, locale, setLocale, dir } = useLocale()

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
    const sql = `INSERT INTO profiles (user_id, email, role)\nVALUES ('${user.id}', '${(user.email ?? '').replace(/'/g, "''")}', 'call_center')\nON CONFLICT (user_id) DO UPDATE SET role = 'call_center', email = EXCLUDED.email;`
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4" dir={dir}>
        <div className="text-center max-w-lg space-y-4">
          <p className="text-red-400 font-medium">{t('access_denied')}</p>
          <p className="text-gray-400 text-sm">
            {t('access_denied_your_email')}: <span className="text-gray-300">{user.email ?? user.id}</span>
          </p>
          <p className="text-gray-400 text-sm text-left">{t('access_denied_help')}</p>
          <pre className="text-left text-xs text-gray-300 bg-[#161b22] border border-gray-700 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
            {sql}
          </pre>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm"
            >
              {t('refresh_after_sql')}
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 text-sm"
            >
              {t('sign_out')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <Dashboard profile={profile!} />
}
