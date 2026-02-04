import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// JWT configuration
const JWT_SECRET = new TextEncoder().encode(Deno.env.get('JWT_SECRET') || 'fallback-secret-for-dev');

const generateToken = async (): Promise<string> => {
  return await new jose.SignJWT({ role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(JWT_SECRET);
};

const verifyToken = async (token: string): Promise<boolean> => {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload.role === 'owner';
  } catch {
    return false;
  }
};

// Rate limiting configuration
const WINDOW_MS = 60000; // 1 minute
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 300000; // 5 minutes

interface RateLimitRecord {
  identifier: string;
  attempts: number;
  window_start: string;
  blocked_until: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkRateLimit(
  supabase: any,
  identifier: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date();

  // Get existing record
  const { data } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .single();

  const record = data as RateLimitRecord | null;

  // Check if blocked
  if (record?.blocked_until) {
    const blockedUntil = new Date(record.blocked_until);
    if (now < blockedUntil) {
      return {
        allowed: false,
        retryAfter: Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000)
      };
    }
  }

  // Check rate limit window
  if (record) {
    const windowStart = new Date(record.window_start);
    const timeSince = now.getTime() - windowStart.getTime();

    if (timeSince < WINDOW_MS) {
      // Within window
      if (record.attempts >= MAX_ATTEMPTS) {
        // Block for extended period
        await supabase
          .from('rate_limits')
          .update({
            blocked_until: new Date(now.getTime() + BLOCK_DURATION_MS).toISOString()
          })
          .eq('identifier', identifier);

        return { allowed: false, retryAfter: BLOCK_DURATION_MS / 1000 };
      }

      // Increment attempts
      await supabase
        .from('rate_limits')
        .update({ attempts: record.attempts + 1 })
        .eq('identifier', identifier);
    } else {
      // New window
      await supabase
        .from('rate_limits')
        .update({
          attempts: 1,
          window_start: now.toISOString(),
          blocked_until: null
        })
        .eq('identifier', identifier);
    }
  } else {
    // First attempt
    await supabase
      .from('rate_limits')
      .insert({ identifier, attempts: 1, window_start: now.toISOString() });
  }

  return { allowed: true };
}

// Input validation
interface ValidationError {
  field: string;
  message: string;
}

function validateEntry(
  track: unknown,
  date: unknown,
  entry: unknown
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate track
  if (!['aiml', 'dsa'].includes(track as string)) {
    errors.push({ field: 'track', message: 'Must be aiml or dsa' });
  }

  // Validate date format (YYYY-MM-DD)
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push({ field: 'date', message: 'Invalid date format' });
  } else {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      errors.push({ field: 'date', message: 'Invalid date value' });
    }
  }

  if (typeof entry !== 'object' || entry === null) {
    errors.push({ field: 'entry', message: 'Entry must be an object' });
    return errors;
  }

  const e = entry as Record<string, unknown>;

  // Validate description length
  if (e.description && typeof e.description === 'string') {
    if (e.description.length > 5000) {
      errors.push({
        field: 'description',
        message: 'Maximum 5000 characters allowed'
      });
    }
  } else if (e.description !== null && e.description !== undefined && e.description !== '') {
    errors.push({ field: 'description', message: 'Must be string or null' });
  }

  // Validate learnings length
  if (e.learnings && typeof e.learnings === 'string') {
    if (e.learnings.length > 5000) {
      errors.push({
        field: 'learnings',
        message: 'Maximum 5000 characters allowed'
      });
    }
  } else if (e.learnings !== null && e.learnings !== undefined && e.learnings !== '') {
    errors.push({ field: 'learnings', message: 'Must be string or null' });
  }

  // Validate links array
  if (e.links !== undefined && e.links !== null) {
    if (!Array.isArray(e.links)) {
      errors.push({ field: 'links', message: 'Must be an array' });
    } else if (e.links.length > 50) {
      errors.push({ field: 'links', message: 'Maximum 50 links allowed' });
    } else {
      (e.links as unknown[]).forEach((link: unknown, index: number) => {
        if (typeof link !== 'string') {
          errors.push({
            field: `links[${index}]`,
            message: 'Link must be string'
          });
          return;
        }

        if (link.length > 2000) {
          errors.push({
            field: `links[${index}]`,
            message: 'Link too long (max 2000 chars)'
          });
          return;
        }

        // Allow empty strings
        if (link === '') return;

        try {
          const url = new URL(link);
          if (!['http:', 'https:'].includes(url.protocol)) {
            errors.push({
              field: `links[${index}]`,
              message: 'Only http/https URLs allowed'
            });
          }
        } catch {
          errors.push({
            field: `links[${index}]`,
            message: 'Invalid URL format'
          });
        }
      });
    }
  }

  // Validate isCompleted
  if (typeof e.isCompleted !== 'boolean') {
    errors.push({ field: 'isCompleted', message: 'Must be boolean' });
  }

  return errors;
}

// Strong password validation
function isStrongPassword(pwd: string): { valid: boolean; error?: string } {
  if (pwd.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  // Check against common passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'admin123', '123456789',
    'letmein', 'welcome', 'monkey123', 'dragon123', 'master123'
  ];
  if (commonPasswords.some(common =>
    pwd.toLowerCase() === common.toLowerCase()
  )) {
    return { valid: false, error: 'Password is too common' };
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, password, newPassword, entry, track, date, token } = await req.json();

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    // Verify owner password using bcrypt
    const verifyPassword = async (pwd: string): Promise<boolean> => {
      const { data: settings } = await supabase
        .from('owner_settings')
        .select('password_hash')
        .single();

      if (!settings) return false;

      return await bcrypt.compare(pwd, settings.password_hash);
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
      // Rate limit setup attempts
      const rateLimit = await checkRateLimit(supabase, `setup_${clientIP}`);
      if (!rateLimit.allowed) {
        return new Response(
          JSON.stringify({
            error: 'Too many attempts. Try again later.',
            retryAfter: rateLimit.retryAfter
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate password strength
      const validation = isStrongPassword(newPassword);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
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

      // Hash password with bcrypt
      const hash = await bcrypt.hash(newPassword);
      const { error } = await supabase
        .from('owner_settings')
        .insert({ password_hash: hash });

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to set up password' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate JWT token for immediate login
      const authToken = await generateToken();

      return new Response(
        JSON.stringify({ success: true, token: authToken }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password (login)
    if (action === 'verify-password') {
      // Rate limit password verification
      const rateLimit = await checkRateLimit(supabase, `pwd_${clientIP}`);
      if (!rateLimit.allowed) {
        return new Response(
          JSON.stringify({
            error: 'Too many attempts. Try again later.',
            retryAfter: rateLimit.retryAfter
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValid = await verifyPassword(password);

      if (isValid) {
        // Generate JWT token
        const authToken = await generateToken();
        return new Response(
          JSON.stringify({ valid: true, token: authToken }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ valid: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save entry (requires valid token)
    if (action === 'save-entry') {
      // Verify JWT token instead of password
      const isValidToken = await verifyToken(token);
      if (!isValidToken) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session. Please log in again.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate input
      const validationErrors = validateEntry(track, date, entry);
      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: validationErrors
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
            description: entry.description || null,
            learnings: entry.learnings || null,
            links: entry.links?.filter((l: string) => l !== '') || [],
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
            description: entry.description || null,
            learnings: entry.learnings || null,
            links: entry.links?.filter((l: string) => l !== '') || [],
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
    console.error('Edge function error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
