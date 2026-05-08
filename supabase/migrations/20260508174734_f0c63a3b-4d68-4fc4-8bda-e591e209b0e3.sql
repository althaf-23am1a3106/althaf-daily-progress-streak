
CREATE POLICY "Deny direct select on owner_settings"
  ON public.owner_settings FOR SELECT TO public USING (false);

CREATE POLICY "Deny direct insert on owner_settings"
  ON public.owner_settings FOR INSERT TO public WITH CHECK (false);

CREATE POLICY "Deny direct update on owner_settings"
  ON public.owner_settings FOR UPDATE TO public USING (false) WITH CHECK (false);

CREATE POLICY "Deny direct delete on owner_settings"
  ON public.owner_settings FOR DELETE TO public USING (false);
