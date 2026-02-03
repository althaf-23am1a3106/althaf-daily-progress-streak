import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, password, newPassword, entry, track, date } = await req.json();

    // Verify owner password
    const verifyPassword = async (pwd: string): Promise<boolean> => {
      const { data: settings } = await supabase
        .from('owner_settings')
        .select('password_hash')
        .single();

      if (!settings) return false;
      
      // Simple hash comparison (in production, use bcrypt)
      const inputHash = btoa(pwd);
      return settings.password_hash === inputHash;
    };

    // Check if first-time setup
    if (action === 'check-setup') {
      const { data: settings } = await supabase
        .from('owner_settings')
        .select('id')
        .single();

      return new Response(
        JSON.stringify({ isFirstTime: !settings }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First-time password setup
    if (action === 'setup-password') {
      if (!newPassword || newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 6 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already set up
      const { data: existing } = await supabase
        .from('owner_settings')
        .select('id')
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ error: 'Password already set up' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const hash = btoa(newPassword);
      const { error } = await supabase
        .from('owner_settings')
        .insert({ password_hash: hash });

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to set up password' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password (login)
    if (action === 'verify-password') {
      const isValid = await verifyPassword(password);
      return new Response(
        JSON.stringify({ valid: isValid }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save entry (requires password)
    if (action === 'save-entry') {
      const isValid = await verifyPassword(password);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: existingEntry } = await supabase
        .from('daily_entries')
        .select('id')
        .eq('track', track)
        .eq('entry_date', date)
        .single();

      let result;
      if (existingEntry) {
        // Update
        result = await supabase
          .from('daily_entries')
          .update({
            description: entry.description,
            learnings: entry.learnings,
            links: entry.links,
            is_completed: entry.isCompleted,
          })
          .eq('id', existingEntry.id)
          .select()
          .single();
      } else {
        // Insert
        result = await supabase
          .from('daily_entries')
          .insert({
            track,
            entry_date: date,
            description: entry.description,
            learnings: entry.learnings,
            links: entry.links,
            is_completed: entry.isCompleted,
          })
          .select()
          .single();
      }

      if (result.error) {
        return new Response(
          JSON.stringify({ error: 'Failed to save entry' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, entry: result.data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});