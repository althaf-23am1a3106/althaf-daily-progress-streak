-- Fix security issues: Remove public SELECT on owner_settings, remove permissive storage/table policies

-- 1. Remove public SELECT on owner_settings (password hash should not be publicly readable)
DROP POLICY IF EXISTS "Anyone can read owner settings for verification" ON public.owner_settings;

-- 2. Remove overly permissive ALL policies on daily_entries (keep only public SELECT)
DROP POLICY IF EXISTS "Allow all operations for entries" ON public.daily_entries;
-- The "Anyone can view entries" SELECT policy already exists and is fine

-- 3. Remove overly permissive ALL policies on proof_images (keep only public SELECT)
DROP POLICY IF EXISTS "Allow all operations for images" ON public.proof_images;
-- The "Anyone can view proof images" SELECT policy already exists and is fine

-- 4. Remove dangerous storage policies that allow public write/update/delete
DROP POLICY IF EXISTS "Anyone can upload proof images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update proof images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete proof images" ON storage.objects;

-- 5. Create rate_limits table for database-based rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  identifier TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ
);

-- Enable RLS on rate_limits (no public access - only edge function via service role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;