-- Create enum for track types
CREATE TYPE public.track_type AS ENUM ('aiml', 'dsa');

-- Owner settings table (stores password hash)
CREATE TABLE public.owner_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily entries table
CREATE TABLE public.daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track track_type NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  learnings TEXT,
  links TEXT[] DEFAULT '{}',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(track, entry_date)
);

-- Proof images table (references storage)
CREATE TABLE public.proof_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES public.daily_entries(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.owner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for owner_settings
-- Only allow reading (for password verification) - anyone can read to verify
CREATE POLICY "Anyone can read owner settings for verification"
ON public.owner_settings
FOR SELECT
USING (true);

-- Only allow insert if no settings exist (first-time setup)
CREATE POLICY "Allow first-time setup"
ON public.owner_settings
FOR INSERT
WITH CHECK ((SELECT COUNT(*) FROM public.owner_settings) = 0);

-- RLS Policies for daily_entries
-- Anyone can read entries (public dashboard)
CREATE POLICY "Anyone can view entries"
ON public.daily_entries
FOR SELECT
USING (true);

-- Insert/Update/Delete require owner verification (will be handled via edge function)
CREATE POLICY "Allow all operations for entries"
ON public.daily_entries
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for proof_images
-- Anyone can view images
CREATE POLICY "Anyone can view proof images"
ON public.proof_images
FOR SELECT
USING (true);

-- All operations allowed (will be verified via edge function)
CREATE POLICY "Allow all operations for images"
ON public.proof_images
FOR ALL
USING (true)
WITH CHECK (true);

-- Create storage bucket for proof images
INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-images', 'proof-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view proof images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'proof-images');

CREATE POLICY "Anyone can upload proof images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'proof-images');

CREATE POLICY "Anyone can update proof images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'proof-images');

CREATE POLICY "Anyone can delete proof images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'proof-images');

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for timestamp updates
CREATE TRIGGER update_owner_settings_updated_at
BEFORE UPDATE ON public.owner_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_entries_updated_at
BEFORE UPDATE ON public.daily_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for daily_entries so dashboard updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_entries;