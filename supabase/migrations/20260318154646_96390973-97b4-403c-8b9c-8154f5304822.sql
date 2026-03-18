
CREATE TABLE public.password_reset_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  otp_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used boolean NOT NULL DEFAULT false
);

ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- No public access - only accessed via service role in edge function
