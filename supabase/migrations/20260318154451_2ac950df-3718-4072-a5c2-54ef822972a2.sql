
-- Deny direct INSERT on daily_entries (service role bypasses RLS)
CREATE POLICY "Deny direct inserts on entries"
ON public.daily_entries
FOR INSERT
TO public
WITH CHECK (false);

-- Deny direct UPDATE on daily_entries
CREATE POLICY "Deny direct updates on entries"
ON public.daily_entries
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);

-- Deny direct DELETE on daily_entries
CREATE POLICY "Deny direct deletes on entries"
ON public.daily_entries
FOR DELETE
TO public
USING (false);

-- Deny direct INSERT on proof_images
CREATE POLICY "Deny direct inserts on proof_images"
ON public.proof_images
FOR INSERT
TO public
WITH CHECK (false);

-- Deny direct UPDATE on proof_images
CREATE POLICY "Deny direct updates on proof_images"
ON public.proof_images
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);

-- Deny direct DELETE on proof_images
CREATE POLICY "Deny direct deletes on proof_images"
ON public.proof_images
FOR DELETE
TO public
USING (false);
