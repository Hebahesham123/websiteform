import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, anonKey)

export const TABLE_NAME = 'sample_inquiries'
export const CREATED_AT_COLUMN = 'created_at'
export const PROFILES_TABLE = 'profiles'
export const ACTIVITY_TABLE = 'submission_activity'

export type SubmissionActivity = {
  id: string
  sample_inquiry_id: string
  user_id: string
  user_email: string
  action: string
  details: string | null
  created_at: string
}

export type UserRole = 'admin' | 'call_center'

export type Profile = {
  id: string
  user_id: string
  email: string
  role: UserRole
  created_at?: string
}

export type SubmissionStatus =
  | 'new'
  | 'reached'
  | 'done'
  | 'cancelled'
  | 'not_reached'

export const STATUS_OPTIONS: { value: SubmissionStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reached', label: 'Reached' },
  { value: 'done', label: 'Lead created' },
  { value: 'cancelled', label: 'Lost' },
  { value: 'not_reached', label: 'Not reached' },
]

export const NOT_REACHED_COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes

export type SampleInquiry = {
  id: string
  name: string
  phone: string
  address: string | null
  message: string | null
  requested_samples: string | null
  attachment_name: string | null
  attachment_url: string | null
  status?: SubmissionStatus | null
  comment?: string | null
  not_reached_count?: number | null
  not_reached_last_at?: string | null
  created_at: string
}
