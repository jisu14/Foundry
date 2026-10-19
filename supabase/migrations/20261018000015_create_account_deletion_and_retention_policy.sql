-- ==============================================================================
-- Foundry Migration: Account Deletion, Data Portability & Retention Policy
-- Version: 20261018000015
-- Description: Provides an atomic RPC function for founders to permanently delete
--              their entire private workspace, simulation runs, real evidence,
--              feedback reports, and AI logs in compliance with GDPR/CCPA.
-- ==============================================================================

-- 1. Create atomic workspace data deletion RPC function
CREATE OR REPLACE FUNCTION public.delete_founder_workspace_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
  v_deleted_sims integer := 0;
  v_deleted_evidence integer := 0;
  v_deleted_groups integer := 0;
  v_deleted_campaigns integer := 0;
  v_deleted_feedback integer := 0;
  v_deleted_ai_logs integer := 0;
BEGIN
  -- Authenticate caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required. No active session identified.';
  END IF;

  -- Locate founder workspace
  SELECT id INTO v_workspace_id
  FROM public.founder_workspaces
  WHERE user_id = v_user_id;

  -- 1. Delete AI Analyst logs for this user
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_analyst_logs') THEN
    DELETE FROM public.ai_analyst_logs WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_ai_logs = ROW_COUNT;
  END IF;

  -- 2. Delete Simulation Feedback & Beta Feedback reports
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'simulation_feedback') THEN
    DELETE FROM public.simulation_feedback WHERE user_id = v_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'beta_feedback_reports') THEN
    DELETE FROM public.beta_feedback_reports WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_feedback = ROW_COUNT;
  END IF;

  -- 3. Delete Founder Real Evidence records
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'founder_real_evidence') THEN
    DELETE FROM public.founder_real_evidence WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_evidence = ROW_COUNT;
  END IF;

  -- 4. Delete Simulation Runs & Macro Provenance records
  IF v_workspace_id IS NOT NULL THEN
    -- Delete simulation provenance items first if table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'simulation_provenance_factors') THEN
      DELETE FROM public.simulation_provenance_factors
      WHERE simulation_run_id IN (SELECT id FROM public.simulation_runs WHERE user_id = v_user_id);
    END IF;

    DELETE FROM public.simulation_runs WHERE user_id = v_user_id OR workspace_id = v_workspace_id;
    GET DIAGNOSTICS v_deleted_sims = ROW_COUNT;

    -- 5. Delete Marketing Campaigns
    DELETE FROM public.marketing_campaigns WHERE workspace_id = v_workspace_id;
    GET DIAGNOSTICS v_deleted_campaigns = ROW_COUNT;

    -- 6. Delete Competitor Notes
    DELETE FROM public.competitor_notes WHERE workspace_id = v_workspace_id;

    -- 7. Delete Customer Groups
    DELETE FROM public.customer_groups WHERE workspace_id = v_workspace_id;
    GET DIAGNOSTICS v_deleted_groups = ROW_COUNT;

    -- 8. Delete Startup Profile
    DELETE FROM public.founder_profiles WHERE workspace_id = v_workspace_id;

    -- 9. Delete Workspace Record
    DELETE FROM public.founder_workspaces WHERE id = v_workspace_id;
  ELSE
    -- If no workspace row, clean up by user_id directly
    DELETE FROM public.simulation_runs WHERE user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'All founder workspace data permanently wiped with zero retention.',
    'deleted_simulations', v_deleted_sims,
    'deleted_evidence_studies', v_deleted_evidence,
    'deleted_customer_groups', v_deleted_groups,
    'deleted_campaigns', v_deleted_campaigns,
    'deleted_feedback_reports', v_deleted_feedback,
    'deleted_ai_logs', v_deleted_ai_logs,
    'deleted_at', timezone('utc'::text, now())
  );
END;
$$;

-- Grant execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.delete_founder_workspace_data() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_founder_workspace_data() TO authenticated;

COMMENT ON FUNCTION public.delete_founder_workspace_data() IS 'Permanently purges all private workspace data and historical records for the invoking authenticated founder.';
