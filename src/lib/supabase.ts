import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nmxyezrzrjvwfpbycifx.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5teHllenJ6cmp2d2ZwYnljaWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDgyMTQsImV4cCI6MjA5MDM4NDIxNH0.oGr4bbqRgb3gRnLIE_Dct-hcI1wZxsNzcySL1Av8r94'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export interface Session {
  id: string
  name: string
  created_by: string
  is_active: boolean
  created_at: string
}

export interface AttendanceRecord {
  id: string
  session_id: string
  student_name: string
  ip_address: string
  device_fingerprint: string
  submitted_at: string
}
