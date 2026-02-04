import { supabase } from '@/integrations/supabase/client';

export interface DailyEntry {
  id?: string;
  track: 'aiml' | 'dsa';
  entry_date: string;
  description: string | null;
  learnings: string | null;
  links: string[];
  is_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EntryFormData {
  description: string;
  learnings: string;
  links: string[];
  images: string[];
  isCompleted: boolean;
}

export interface AuthResponse {
  valid: boolean;
  token?: string;
  error?: string;
}

export interface SetupResponse {
  success: boolean;
  token?: string;
  error?: string;
}

// Check if first-time setup
export async function checkOwnerSetup(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('owner-auth', {
    body: { action: 'check-setup' },
  });
  
  if (error) throw error;
  return data.isFirstTime;
}

// Set up owner password
export async function setupOwnerPassword(password: string): Promise<SetupResponse> {
  const { data, error } = await supabase.functions.invoke('owner-auth', {
    body: { action: 'setup-password', newPassword: password },
  });
  
  if (error) throw error;
  return data;
}

// Verify owner password - returns token on success
export async function verifyOwnerPassword(password: string): Promise<AuthResponse> {
  const { data, error } = await supabase.functions.invoke('owner-auth', {
    body: { action: 'verify-password', password },
  });
  
  if (error) throw error;
  return data;
}

// Save entry (owner only) - uses token for authentication
export async function saveEntry(
  token: string,
  track: 'aiml' | 'dsa',
  date: string,
  entry: EntryFormData
): Promise<DailyEntry> {
  const { data, error } = await supabase.functions.invoke('owner-auth', {
    body: { 
      action: 'save-entry', 
      token,
      track,
      date,
      entry: {
        description: entry.description,
        learnings: entry.learnings,
        links: entry.links,
        isCompleted: entry.isCompleted,
      }
    },
  });
  
  if (error) throw error;
  if (data.error) throw new Error(data.error);
  return data.entry;
}

// Fetch all entries (public)
export async function fetchAllEntries(): Promise<DailyEntry[]> {
  const { data, error } = await supabase
    .from('daily_entries')
    .select('*')
    .order('entry_date', { ascending: true });
  
  if (error) throw error;
  return (data || []) as DailyEntry[];
}

// Fetch entries by track (public)
export async function fetchEntriesByTrack(track: 'aiml' | 'dsa'): Promise<DailyEntry[]> {
  const { data, error } = await supabase
    .from('daily_entries')
    .select('*')
    .eq('track', track)
    .order('entry_date', { ascending: true });
  
  if (error) throw error;
  return (data || []) as DailyEntry[];
}

// Get single entry (public)
export async function fetchEntry(track: 'aiml' | 'dsa', date: string): Promise<DailyEntry | null> {
  const { data, error } = await supabase
    .from('daily_entries')
    .select('*')
    .eq('track', track)
    .eq('entry_date', date)
    .maybeSingle();
  
  if (error) throw error;
  return data as DailyEntry | null;
}

// Subscribe to realtime updates
export function subscribeToEntries(callback: (payload: any) => void) {
  return supabase
    .channel('daily_entries_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'daily_entries' },
      callback
    )
    .subscribe();
}
