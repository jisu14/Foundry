-- ==============================================================================
-- Foundry Beta: Auto-Confirm User Registrations (Zero Email Limits)
-- ==============================================================================
-- During Beta testing, email confirmation links are bypassed to avoid hitting
-- Supabase free tier email rate limits (e.g. 30 emails/hour).
-- Founders sign in directly with Email + Password + Repeat Password.
-- Only platform operators/admins require verified accounts.
-- ==============================================================================

-- 1. Function to auto-confirm new signups
CREATE OR REPLACE FUNCTION public.auto_confirm_beta_users()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Confirm existing unconfirmed users
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 3. Attach trigger to auth.users if permitted in Supabase SQL Editor
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_auto_confirm_beta_users'
  ) THEN
    CREATE TRIGGER tr_auto_confirm_beta_users
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirm_beta_users();
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Managed auth.users trigger setup skipped; client-side beta session will manage confirmation.';
END;
$$;
