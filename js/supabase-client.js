import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = 'https://nufcbdawzouitteojcqo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51ZmNiZGF3em91aXR0ZW9qY3FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NjA5MDEsImV4cCI6MjA2ODIzNjkwMX0.X79oQ-yrBJcQ6HhYtKxtsdQlvL7FqRAvhWHuWPnKyzY';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);