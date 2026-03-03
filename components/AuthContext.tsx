'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, PROFILES_TABLE, type Profile, type UserRole } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  loading: boolean
  profileChecked: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  hasAccess: boolean
  retryProfileFetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const ALLOWED_ROLES: UserRole[] = ['admin', 'call_center']

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileChecked, setProfileChecked] = useState(false)

  const fetchOrCreateProfile = useCallback(async (uid: string, email: string): Promise<Profile | null> => {
    const { data: existing, error: selectError } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()

    if (selectError) {
      console.error('Profile select failed:', selectError.message)
      return null
    }
    if (existing) return existing as Profile

    const { data: inserted, error: insertError } = await supabase
      .from(PROFILES_TABLE)
      .insert({ user_id: uid, email: email || '', role: 'call_center' })
      .select()
      .single()

    if (insertError) {
      console.error('Profile insert failed:', insertError.message)
      return null
    }
    return inserted as Profile
  }, [])

  useEffect(() => {
    let cancelled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      if (!session?.user) {
        setProfile(null)
        setProfileChecked(true)
        setLoading(false)
        return
      }
      setProfileChecked(false)
      const p = await fetchOrCreateProfile(session.user.id, session.user.email ?? '')
      if (!cancelled) {
        setProfile(p)
        setProfileChecked(true)
      }
    })

    // When we have a session, wait for profile fetch before showing UI (so we don't sign out on refresh before profile loads)
    Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: { session: null } }>((resolve) => setTimeout(() => resolve({ data: { session: null } }), 5000)),
    ]).then(({ data: { session } }) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      if (!session?.user) {
        setProfileChecked(true)
        setLoading(false)
        return
      }
      setProfileChecked(false)
      let profileTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        profileTimeout = null
        if (!cancelled) {
          setProfileChecked(true)
          setLoading(false)
        }
      }, 4000)
      fetchOrCreateProfile(session.user.id, session.user.email ?? '').then((p) => {
        if (cancelled) return
        if (profileTimeout) clearTimeout(profileTimeout)
        setProfile(p)
        setProfileChecked(true)
        setLoading(false)
      })
    })

    // Hard cap: after 6 seconds always show UI (login or next step), never stuck on loading
    const safetyTimeout = setTimeout(() => {
      if (cancelled) return
      setProfileChecked(true)
      setLoading(false)
    }, 6000)

    return () => {
      cancelled = true
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [fetchOrCreateProfile])

  useEffect(() => {
    if (loading || !user || profile) return
    const t = setTimeout(() => {
      fetchOrCreateProfile(user.id, user.email ?? '').then((p) => {
        if (p) setProfile(p)
      })
    }, 2000)
    return () => clearTimeout(t)
  }, [loading, user, profile, fetchOrCreateProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    setUser(null)
    setProfile(null)
    setProfileChecked(false)
    supabase.auth.signOut().catch(() => {})
  }, [])

  const hasAccess = !!profile && ALLOWED_ROLES.includes(profile.role)

  const retryProfileFetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const p = await fetchOrCreateProfile(user.id, user.email ?? '')
    setProfile(p)
    setProfileChecked(true)
    setLoading(false)
  }, [user, fetchOrCreateProfile])

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileChecked, signIn, signOut, hasAccess, retryProfileFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
