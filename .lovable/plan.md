

# Password Recovery via Email OTP

## Overview
Add a "Forgot password?" option to the owner login flow. When clicked, a 6-digit OTP is sent to the hardcoded owner email (`althafkhanpathan06@gmail.com`), which the owner then enters along with a new password to reset their credentials.

## Prerequisites
- A **Resend API key** needs to be stored as a secret (`RESEND_API_KEY`). You will be prompted to enter it.

## Changes

### 1. Store Resend API Key
- Prompt you to securely save your `RESEND_API_KEY` as a backend secret.

### 2. Database Migration
Create a `password_reset_otps` table to store OTP codes:

| Column | Type | Details |
|--------|------|---------|
| id | uuid | Primary key |
| otp_hash | text | PBKDF2-hashed OTP (not stored in plain text) |
| created_at | timestamptz | For expiry check (10 min window) |
| used | boolean | Prevents reuse |

RLS will be disabled for public access since the table is only accessed via the edge function using the service role key.

### 3. Edge Function Updates (`owner-auth/index.ts`)
Add two new actions to the existing edge function:

**`request-otp`** action:
- Rate-limited (3 requests per 15 minutes per IP)
- Generates a random 6-digit code
- Hashes it with PBKDF2 before storing in `password_reset_otps`
- Sends the plain-text code to `althafkhanpathan06@gmail.com` via Resend
- Returns a generic success message (does not confirm the email exists, for security)

**`reset-password`** action:
- Rate-limited
- Accepts the OTP and new password
- Verifies the OTP against hashed values in the database (only codes created within the last 10 minutes and not yet used)
- Validates password strength using existing `isStrongPassword` function
- Updates the password hash in `owner_settings`
- Marks the OTP as used
- Returns a JWT token for immediate login

### 4. API Layer (`src/lib/api.ts`)
Add two new functions:
- `requestPasswordOtp()` -- calls `owner-auth` with `action: 'request-otp'`
- `resetOwnerPassword(otp, newPassword)` -- calls `owner-auth` with `action: 'reset-password'`

### 5. Frontend (`AccessModal.tsx`)
Add three new views to the existing modal state machine:

- **`forgot`** -- Shows a message that an OTP will be sent to the owner's email, with a "Send Code" button
- **`verify-otp`** -- 6-digit OTP input field with a countdown timer and resend option
- **`new-password`** -- New password + confirm password fields, then submits the reset

A "Forgot password?" link will be added below the password input on the login view.

## Technical Details

- The owner email (`althafkhanpathan06@gmail.com`) is hardcoded in the edge function only (not exposed to the frontend)
- OTPs are hashed before storage using the existing PBKDF2 functions
- OTPs expire after 10 minutes
- Old unused OTPs are cleaned up when a new one is requested
- The Resend `from` address will use `onboarding@resend.dev` (Resend's default sandbox sender) unless you have a verified domain

