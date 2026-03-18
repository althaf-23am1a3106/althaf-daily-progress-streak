import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

// Allowed origins for CORS
const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && (
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovableproject.com') ||
    origin.startsWith('http://localhost:')
  );
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://althaf-daily-progress-streak.lovable.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Credentials': 'true',
  };
};

// JWT configuration - validated at runtime
// Cache the secret to avoid repeated env lookups
let cachedJwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (cachedJwtSecret) return cachedJwtSecret;
  
  const secret = Deno.env.get('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  cachedJwtSecret = new TextEncoder().encode(secret);
  return cachedJwtSecret;
}

// Password hashing using PBKDF2 (Web Crypto API - Deno compatible)
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    KEY_LENGTH * 8
  );
  
  // Combine salt and hash, encode as base64
  const combined = new Uint8Array(SALT_LENGTH + KEY_LENGTH);
  combined.set(salt);
  combined.set(new Uint8Array(hash), SALT_LENGTH);
  
  return btoa(String.fromCharCode(...combined));
}

async function verifyPasswordHash(password: string, storedHash: string): Promise<boolean> {
  try {
    const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
    const salt = combined.slice(0, SALT_LENGTH);
    const originalHash = combined.slice(SALT_LENGTH);
    
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const newHash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      passwordKey,
      KEY_LENGTH * 8
    );
    
    // Constant-time comparison
    const newHashArray = new Uint8Array(newHash);
    if (originalHash.length !== newHashArray.length) return false;
    
    let result = 0;
    for (let i = 0; i < originalHash.length; i++) {
      result |= originalHash[i] ^ newHashArray[i];
    }
    return result === 0;
  } catch {
    return false;
  }
}

const generateToken = async (): Promise<string> => {
  return await new jose.SignJWT({ role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(getJwtSecret());
};

const verifyToken = async (token: string): Promise<boolean> => {
  try {
    const { payload } = await jose.jwtVerify(token, getJwtSecret());
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
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, password, newPassword, entry, track, date, token } = await req.json();

    // Get client IP for rate limiting - use rightmost X-Forwarded-For value (set by trusted proxy)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIP = forwardedFor
      ? forwardedFor.split(',').at(-1)!.trim()
      : req.headers.get('x-real-ip') ?? 'unknown';

    // Verify owner password using PBKDF2
    const verifyStoredPassword = async (pwd: string): Promise<boolean> => {
      const { data: settings } = await supabase
        .from('owner_settings')
        .select('password_hash')
        .single();

      if (!settings) return false;

      return await verifyPasswordHash(pwd, settings.password_hash);
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

      // Hash password with PBKDF2
      const hash = await hashPassword(newPassword);
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

      const isValid = await verifyStoredPassword(password);

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

    // Upload image (requires valid token)
    if (action === 'upload-image') {
      const isValidToken = await verifyToken(token);
      if (!isValidToken) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session. Please log in again.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { entryId, fileName, fileData, contentType } = await req.json().catch(() => ({}));
      
      if (!entryId || !fileName || !fileData || !contentType) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: entryId, fileName, fileData, contentType' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate content type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(contentType)) {
        return new Response(
          JSON.stringify({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Decode base64 file data
      const fileBytes = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
      
      // Max 5MB
      if (fileBytes.length > 5 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: 'File too large. Maximum 5MB allowed.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${entryId}/${timestamp}_${sanitizedFileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('proof-images')
        .upload(storagePath, fileBytes, {
          contentType,
          upsert: false
        });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: 'Failed to upload file' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('proof-images')
        .getPublicUrl(storagePath);

      // Save to proof_images table
      const { data: imageRecord, error: dbError } = await supabase
        .from('proof_images')
        .insert({
          entry_id: entryId,
          storage_path: storagePath,
          file_name: sanitizedFileName
        })
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file
        await supabase.storage.from('proof-images').remove([storagePath]);
        return new Response(
          JSON.stringify({ error: 'Failed to save image record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          image: {
            id: imageRecord.id,
            url: urlData.publicUrl,
            fileName: sanitizedFileName
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete image (requires valid token)
    if (action === 'delete-image') {
      const isValidToken = await verifyToken(token);
      if (!isValidToken) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session. Please log in again.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { imageId } = await req.json().catch(() => ({}));
      
      if (!imageId) {
        return new Response(
          JSON.stringify({ error: 'Missing imageId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get image record
      const { data: imageRecord } = await supabase
        .from('proof_images')
        .select('storage_path')
        .eq('id', imageId)
        .single();

      if (!imageRecord) {
        return new Response(
          JSON.stringify({ error: 'Image not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete from storage
      await supabase.storage.from('proof-images').remove([imageRecord.storage_path]);

      // Delete from database
      await supabase.from('proof_images').delete().eq('id', imageId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Request OTP for password reset
    if (action === 'request-otp') {
      // Rate limit OTP requests (3 per 15 minutes)
      const otpRateKey = `otp_${clientIP}`;
      const { data: otpRateData } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('identifier', otpRateKey)
        .single();

      const now = new Date();
      const OTP_WINDOW_MS = 900000; // 15 minutes
      const OTP_MAX_ATTEMPTS = 3;

      if (otpRateData) {
        const windowStart = new Date(otpRateData.window_start);
        const timeSince = now.getTime() - windowStart.getTime();

        if (timeSince < OTP_WINDOW_MS && otpRateData.attempts >= OTP_MAX_ATTEMPTS) {
          const retryAfter = Math.ceil((OTP_WINDOW_MS - timeSince) / 1000);
          return new Response(
            JSON.stringify({ error: 'Too many requests. Try again later.', retryAfter }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (timeSince < OTP_WINDOW_MS) {
          await supabase
            .from('rate_limits')
            .update({ attempts: otpRateData.attempts + 1 })
            .eq('identifier', otpRateKey);
        } else {
          await supabase
            .from('rate_limits')
            .update({ attempts: 1, window_start: now.toISOString(), blocked_until: null })
            .eq('identifier', otpRateKey);
        }
      } else {
        await supabase
          .from('rate_limits')
          .insert({ identifier: otpRateKey, attempts: 1, window_start: now.toISOString() });
      }

      // Check that owner is set up
      const { data: ownerCheck } = await supabase
        .from('owner_settings')
        .select('id')
        .single();

      if (!ownerCheck) {
        // Don't reveal whether owner exists
        return new Response(
          JSON.stringify({ success: true, message: 'If an account exists, a code has been sent.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Invalidate old unused OTPs
      await supabase
        .from('password_reset_otps')
        .delete()
        .eq('used', false);

      // Generate 6-digit OTP
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));

      // Hash OTP before storing
      const otpHash = await hashPassword(otpCode);
      await supabase
        .from('password_reset_otps')
        .insert({ otp_hash: otpHash });

      // Send via Resend
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (!resendKey) {
        console.error('RESEND_API_KEY not configured');
        return new Response(
          JSON.stringify({ error: 'Email service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const OWNER_EMAIL = 'althafkhanpathan06@gmail.com';

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: [OWNER_EMAIL],
          subject: 'Password Reset Code',
          html: `<div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;">
            <h2 style="text-align:center;color:#333;">Password Reset</h2>
            <p style="color:#555;">Your verification code is:</p>
            <div style="text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;padding:20px;background:#f5f5f5;border-radius:8px;margin:16px 0;">${otpCode}</div>
            <p style="color:#888;font-size:12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
          </div>`,
        }),
      });

      if (!emailRes.ok) {
        console.error('Resend error:', await emailRes.text());
        return new Response(
          JSON.stringify({ error: 'Failed to send email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'If an account exists, a code has been sent.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset password with OTP
    if (action === 'reset-password') {
      const { otp, newPassword: resetNewPassword } = await req.json().catch(() => ({}));

      // Rate limit reset attempts
      const resetRateKey = `reset_${clientIP}`;
      const resetRateLimit = await checkRateLimit(supabase, resetRateKey);
      if (!resetRateLimit.allowed) {
        return new Response(
          JSON.stringify({ error: 'Too many attempts. Try again later.', retryAfter: resetRateLimit.retryAfter }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
        return new Response(
          JSON.stringify({ error: 'Invalid code format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!resetNewPassword || typeof resetNewPassword !== 'string') {
        return new Response(
          JSON.stringify({ error: 'New password is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate password strength
      const pwdValidation = isStrongPassword(resetNewPassword);
      if (!pwdValidation.valid) {
        return new Response(
          JSON.stringify({ error: pwdValidation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get unused OTPs from the last 10 minutes
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: otpRecords } = await supabase
        .from('password_reset_otps')
        .select('*')
        .eq('used', false)
        .gte('created_at', tenMinAgo)
        .order('created_at', { ascending: false });

      if (!otpRecords || otpRecords.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify OTP against stored hashes
      let matchedOtpId: string | null = null;
      for (const record of otpRecords) {
        const isMatch = await verifyPasswordHash(otp, record.otp_hash);
        if (isMatch) {
          matchedOtpId = record.id;
          break;
        }
      }

      if (!matchedOtpId) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark OTP as used
      await supabase
        .from('password_reset_otps')
        .update({ used: true })
        .eq('id', matchedOtpId);

      // Update owner password
      const newHash = await hashPassword(resetNewPassword);
      const { error: updateError } = await supabase
        .from('owner_settings')
        .update({ password_hash: newHash })
        .not('id', 'is', null); // update all rows (should be only 1)

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update password' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate token for immediate login
      const authToken = await generateToken();

      return new Response(
        JSON.stringify({ success: true, token: authToken }),
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
