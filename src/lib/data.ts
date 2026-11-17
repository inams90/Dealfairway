import { supabase } from './supabase'
import type { ActivityRow, ContactRow, InquiryRow, TaskRow } from '../types/database'
import type { ContactDraft } from './import/csvImport'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export async function listContacts(): Promise<ContactRow[]> {
  return unwrap(await supabase.from('contacts').select('*').order('last_name').order('first_name'))
}

export async function getContact(id: string): Promise<ContactRow | null> {
  return unwrap(await supabase.from('contacts').select('*').eq('id', id).maybeSingle())
}

export async function createContact(draft: ContactDraft): Promise<ContactRow> {
  return unwrap(await supabase.from('contacts').insert(draft).select().single())
}

export async function updateContact(id: string, patch: Partial<ContactDraft>): Promise<ContactRow> {
  return unwrap(await supabase.from('contacts').update(patch).eq('id', id).select().single())
}

export async function deleteContact(id: string): Promise<void> {
  unwrap(await supabase.from('contacts').delete().eq('id', id))
}

/** Inserts contacts in batches; calls onProgress with the number saved so far. */
export async function importContacts(drafts: ContactDraft[], onProgress?: (done: number) => void): Promise<number> {
  let done = 0
  for (let i = 0; i < drafts.length; i += 100) {
    const batch = drafts.slice(i, i + 100)
    unwrap(await supabase.from('contacts').insert(batch))
    done += batch.length
    onProgress?.(done)
  }
  return done
}

export async function listTasksForContact(contactId: string): Promise<TaskRow[]> {
  return unwrap(
    await supabase.from('tasks').select('*').eq('contact_id', contactId).order('due_at', { ascending: true }),
  )
}

export async function listInquiriesForContact(contactId: string): Promise<InquiryRow[]> {
  return unwrap(
    await supabase.from('inquiries').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }),
  )
}

export async function listActivityForContact(contactId: string): Promise<ActivityRow[]> {
  return unwrap(
    await supabase
      .from('activity_log')
      .select('*')
      .eq('contact_id', contactId)
      .order('occurred_at', { ascending: false }),
  )
}
