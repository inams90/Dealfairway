// Database types for the Supabase client.
// Hand-written to match supabase/migrations for now. Once the Supabase CLI is linked,
// regenerate with `npm run db:types` (the output has the same shape).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ContactType = 'buyer' | 'seller' | 'landlord' | 'tenant' | 'investor' | 'other'
export type PropertyInterest = 'residential' | 'commercial' | 'industrial'
export type ContactSource = 'miltonlease' | 'referral' | 'walk_in' | 'phone' | 'other'
export type InquiryChannel = 'web_form' | 'phone' | 'text' | 'email' | 'walk_in'
export type InquiryStatus = 'new' | 'in_progress' | 'converted' | 'closed'
export type TaskPriority = 'low' | 'normal' | 'high'
export type TaskStatus = 'open' | 'done' | 'snoozed'
export type ActivityKind = 'note' | 'call' | 'email' | 'text' | 'meeting' | 'status_change'

type Timestamps = { created_at: string; updated_at: string }

type Table<Row, Required extends keyof Row> = {
  Row: Row
  Insert: Partial<Row> & Pick<Row, Required>
  Update: Partial<Row>
  Relationships: []
}

export type ProfileRow = {
  user_id: string
  full_name: string
  brokerage: string
  phone: string
  reco_number: string | null
} & Timestamps

export type ContactRow = {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  type: ContactType
  property_interest: PropertyInterest | null
  source: ContactSource
  notes: string
  tags: string[]
  /** Maintained by a trigger on activity_log. */
  last_activity_at: string | null
} & Timestamps

export type InquiryRow = {
  id: string
  user_id: string
  contact_id: string | null
  channel: InquiryChannel
  message: string
  status: InquiryStatus
  raw_payload: Json | null
} & Timestamps

export type TaskRow = {
  id: string
  user_id: string
  title: string
  notes: string
  due_at: string | null
  priority: TaskPriority
  status: TaskStatus
  snoozed_until: string | null
  contact_id: string | null
  inquiry_id: string | null
  sort_order: number
  completed_at: string | null
} & Timestamps

export type ActivityRow = {
  id: string
  user_id: string
  contact_id: string
  kind: ActivityKind
  body: string
  occurred_at: string
} & Timestamps

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, 'user_id'>
      contacts: Table<ContactRow, never>
      inquiries: Table<InquiryRow, never>
      tasks: Table<TaskRow, 'title'>
      activity_log: Table<ActivityRow, 'contact_id' | 'kind'>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
