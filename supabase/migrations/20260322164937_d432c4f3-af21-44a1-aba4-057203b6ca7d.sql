-- Deny all direct access to rate_limits
CREATE POLICY "Deny direct select on rate_limits" ON public.rate_limits FOR SELECT TO public USING (false);
CREATE POLICY "Deny direct insert on rate_limits" ON public.rate_limits FOR INSERT TO public WITH CHECK (false);
CREATE POLICY "Deny direct update on rate_limits" ON public.rate_limits FOR UPDATE TO public USING (false) WITH CHECK (false);
CREATE POLICY "Deny direct delete on rate_limits" ON public.rate_limits FOR DELETE TO public USING (false);

-- Deny all direct access to password_reset_otps
CREATE POLICY "Deny direct select on password_reset_otps" ON public.password_reset_otps FOR SELECT TO public USING (false);
CREATE POLICY "Deny direct insert on password_reset_otps" ON public.password_reset_otps FOR INSERT TO public WITH CHECK (false);
CREATE POLICY "Deny direct update on password_reset_otps" ON public.password_reset_otps FOR UPDATE TO public USING (false) WITH CHECK (false);
CREATE POLICY "Deny direct delete on password_reset_otps" ON public.password_reset_otps FOR DELETE TO public USING (false);