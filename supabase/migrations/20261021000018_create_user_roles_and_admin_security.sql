-- ==============================================================================
-- Migration: 20261021000018_create_user_roles_and_admin_security.sql
-- Description: Server-Enforced User Roles, Admin Authorization, and Support Access Audit
-- Engine: Supabase / PostgreSQL with Strict Row Level Security (RLS)
-- ==============================================================================

-- 1. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('founder', 'admin')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_user_roles_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

COMMENT ON TABLE public.user_roles IS 'Secure role assignments. Users cannot modify this table directly.';

-- 2. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own role
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Only existing admins can insert or update roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles r
        WHERE r.user_id = auth.uid() AND r.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles r
        WHERE r.user_id = auth.uid() AND r.role = 'admin'
    )
);

-- 3. Security Definer Function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF check_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = check_user_id AND role = 'admin'
    );
END;
$$;

-- 4. RPC Function: get_current_user_role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    curr_user_id UUID := auth.uid();
    found_role TEXT;
BEGIN
    IF curr_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'authenticated', false,
            'role', 'guest',
            'is_admin', false
        );
    END IF;

    SELECT role INTO found_role
    FROM public.user_roles
    WHERE user_id = curr_user_id;

    IF found_role IS NULL THEN
        found_role := 'founder';
        -- Automatically register as founder by default if not set
        INSERT INTO public.user_roles (user_id, role)
        VALUES (curr_user_id, 'founder')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'authenticated', true,
        'user_id', curr_user_id,
        'role', found_role,
        'is_admin', (found_role = 'admin')
    );
END;
$$;

-- 5. Admin Support Audit Log
-- When an admin accesses a founder's workspace for technical support, an audit entry is mandatory
CREATE TABLE IF NOT EXISTS public.admin_support_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    target_founder_id UUID NOT NULL REFERENCES auth.users(id),
    reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 10),
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_support_audit_admin ON public.admin_support_audit_log(admin_user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_audit_founder ON public.admin_support_audit_log(target_founder_id, accessed_at DESC);

ALTER TABLE public.admin_support_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can insert audit logs
DROP POLICY IF EXISTS "Admins can insert support audit log" ON public.admin_support_audit_log;
CREATE POLICY "Admins can insert support audit log"
ON public.admin_support_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Admins and affected founders can read audit logs relevant to them
DROP POLICY IF EXISTS "Admins and founders can read audit logs" ON public.admin_support_audit_log;
CREATE POLICY "Admins and founders can read audit logs"
ON public.admin_support_audit_log
FOR SELECT
TO authenticated
USING (
    public.is_admin(auth.uid()) OR auth.uid() = target_founder_id
);

-- 6. Helper RPC for Logging Support Access
CREATE OR REPLACE FUNCTION public.log_admin_support_access(
    p_founder_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    curr_admin_id UUID := auth.uid();
BEGIN
    IF NOT public.is_admin(curr_admin_id) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required.';
    END IF;

    IF p_reason IS NULL OR char_length(trim(p_reason)) < 10 THEN
        RAISE EXCEPTION 'A documented support reason of at least 10 characters is required.';
    END IF;

    INSERT INTO public.admin_support_audit_log (
        admin_user_id,
        target_founder_id,
        reason
    ) VALUES (
        curr_admin_id,
        p_founder_id,
        trim(p_reason)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Support access logged to audit trail.',
        'admin_id', curr_admin_id,
        'founder_id', p_founder_id,
        'timestamp', now()
    );
END;
$$;
