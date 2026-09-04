import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kptuyksmdomgqntsdzsu.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdHV5a3NtZG9tZ3FudHNkenN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTg4ODQsImV4cCI6MjEwMzM3NDg4NH0.hGMnZHjG_IHJyCvgE67vPUGRV6WU7Nh2jfsTUcgkUcU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
