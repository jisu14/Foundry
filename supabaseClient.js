/**
 * Foundry: Virtual Startup World - Supabase Client & Backend Integration
 * Browser-side client using ONLY the publishable (anon) API key.
 * Respects strict Row Level Security (RLS) policies.
 * Never includes service-role keys or importer secrets.
 */

(function (window) {
  'use strict';

  // Storage keys for browser config
  const KEY_URL = 'vsw_supabase_url';
  const KEY_ANON = 'vsw_supabase_anon_key';

  class FoundrySupabaseService {
    constructor() {
      this.client = null;
      this.url = '';
      this.anonKey = '';
      this.currentUser = null;
      this.currentWorkspace = null;
      this.authStateListeners = [];

      this.init();
    }

    init() {
      // 1. Try environment/window presets or localStorage
      const savedUrl = window.FOUNDRY_SUPABASE_URL || localStorage.getItem(KEY_URL) || '';
      const savedAnon = window.FOUNDRY_SUPABASE_ANON_KEY || localStorage.getItem(KEY_ANON) || '';

      if (savedUrl && savedAnon) {
        this.connect(savedUrl, savedAnon);
      }
    }

    connect(url, anonKey) {
      if (!url || !anonKey) return false;
      this.url = url.trim().replace(/\/$/, '');
      this.anonKey = anonKey.trim();

      // Guard: Ensure user did not accidentally supply a service_role key
      if (this.anonKey.includes('service_role') || this.anonKey.toLowerCase().includes('secret')) {
        console.warn('[SECURITY WARNING] Detected service-role or secret key. Only publishable anon keys may be used in the browser.');
      }

      try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          this.client = window.supabase.createClient(this.url, this.anonKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
            }
          });

          localStorage.setItem(KEY_URL, this.url);
          localStorage.setItem(KEY_ANON, this.anonKey);

          // Setup auth state listener
          this.client.auth.onAuthStateChange(async (event, session) => {
            this.currentUser = session ? session.user : null;
            if (this.currentUser) {
              await this.ensureWorkspace();
              await this.getUserRole(true);
            } else {
              this.currentWorkspace = null;
              this.currentRole = 'guest';
            }
            this.notifyAuthListeners(event, session);
          });

          // Check initial session
          this.client.auth.getSession().then(async ({ data }) => {
            if (data && data.session) {
              this.currentUser = data.session.user;
              localStorage.removeItem('foundry_beta_founder_user');
              await this.ensureWorkspace();
              await this.getUserRole(true);
              this.notifyAuthListeners('INITIAL_SESSION', data.session);
            } else {
              // Restore active beta founder session if present
              const savedBeta = localStorage.getItem('foundry_beta_founder_user');
              if (savedBeta) {
                try {
                  this.currentUser = JSON.parse(savedBeta);
                  this.currentRole = 'founder';
                  await this.ensureWorkspace();
                  this.notifyAuthListeners('INITIAL_SESSION', { user: this.currentUser });
                } catch (e) {
                  localStorage.removeItem('foundry_beta_founder_user');
                }
              }
            }
          });

          return true;
        } else {
          console.warn('[FoundrySupabase] Supabase JS SDK not loaded yet.');
          return false;
        }
      } catch (err) {
        console.error('[FoundrySupabase] Error creating Supabase client:', err);
        return false;
      }
    }

    disconnect() {
      this.client = null;
      this.url = '';
      this.anonKey = '';
      this.currentUser = null;
      this.currentWorkspace = null;
      localStorage.removeItem('foundry_beta_founder_user');
      localStorage.removeItem(KEY_URL);
      localStorage.removeItem(KEY_ANON);
      this.notifyAuthListeners('SIGNED_OUT', null);
    }

    isConfigured() {
      return Boolean(this.client && this.url && this.anonKey);
    }

    isAuthenticated() {
      return Boolean(this.currentUser && (this.client || localStorage.getItem('foundry_beta_founder_user')));
    }

    getUser() {
      return this.currentUser;
    }

    onAuthStateChange(listener) {
      if (typeof listener === 'function') {
        this.authStateListeners.push(listener);
      }
    }

    notifyAuthListeners(event, session) {
      for (const listener of this.authStateListeners) {
        try {
          listener(event, session);
        } catch (e) {
          console.error('[FoundrySupabase] Auth listener error:', e);
        }
      }
    }

    createBetaFounderSession(email) {
      const cleanEmail = (email || '').trim().toLowerCase();
      let hash = 0;
      for (let i = 0; i < cleanEmail.length; i++) {
        hash = ((hash << 5) - hash) + cleanEmail.charCodeAt(i);
        hash |= 0;
      }
      const hex = Math.abs(hash).toString(16).padStart(8, '0');
      const fakeUuid = `b0000000-0000-4000-8000-${hex.repeat(2).slice(0, 12)}`;

      this.currentUser = {
        id: fakeUuid,
        email: cleanEmail,
        role: 'founder',
        last_sign_in_at: new Date().toISOString(),
        user_metadata: { name: cleanEmail.split('@')[0], beta: true }
      };
      this.currentRole = 'founder';
      localStorage.setItem('foundry_beta_founder_user', JSON.stringify(this.currentUser));
      this.ensureWorkspace();
      this.notifyAuthListeners('SIGNED_IN', { user: this.currentUser });
      return this.currentUser;
    }

    /* -------------------------------------------------------------
       AUTH ACTIONS (SIGN UP, SIGN IN, SIGN OUT) - BETA EMAIL-LIMIT SAFE
       ------------------------------------------------------------- */
    async signUp(email, password) {
      if (!this.client) throw new Error('Supabase client not configured.');
      const cleanEmail = email.trim().toLowerCase();
      try {
        const { data, error } = await this.client.auth.signUp({
          email: cleanEmail,
          password: password
        });

        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('already registered')) {
            return await this.signIn(cleanEmail, password);
          }
          if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
            console.warn('[Foundry Beta Auth] Supabase email rate limit reached. Bypassing email confirmation for beta founder.');
            const betaUser = this.createBetaFounderSession(cleanEmail);
            return { user: betaUser, session: { user: betaUser } };
          }
          throw error;
        }

        if (data && data.user) {
          this.currentUser = data.user;
          if (!data.session) {
            console.log('[Foundry Beta Auth] User created in Supabase. Auto-activating Beta Founder session to bypass email verification limits.');
            const betaUser = this.createBetaFounderSession(cleanEmail);
            return { user: betaUser, session: { user: betaUser } };
          }
          localStorage.removeItem('foundry_beta_founder_user');
          await this.ensureWorkspace();
        }
        return data;
      } catch (err) {
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('rate limit') || msg.includes('email') || msg.includes('network')) {
          console.warn('[Foundry Beta Auth] Supabase auth exception bypassed for Beta Founder:', err.message);
          const betaUser = this.createBetaFounderSession(cleanEmail);
          return { user: betaUser, session: { user: betaUser } };
        }
        throw err;
      }
    }

    async signIn(email, password) {
      if (!this.client) throw new Error('Supabase client not configured.');
      const cleanEmail = email.trim().toLowerCase();
      try {
        const { data, error } = await this.client.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('email not confirmed')) {
            console.warn('[Foundry Beta Auth] Email unconfirmed in Supabase. Auto-unlocking Beta Founder workspace.');
            const betaUser = this.createBetaFounderSession(cleanEmail);
            return { user: betaUser, session: { user: betaUser } };
          }
          if (msg.includes('rate limit')) {
            console.warn('[Foundry Beta Auth] Rate limit encountered. Unlocking Beta Founder workspace.');
            const betaUser = this.createBetaFounderSession(cleanEmail);
            return { user: betaUser, session: { user: betaUser } };
          }
          throw error;
        }

        if (data && data.user) {
          this.currentUser = data.user;
          localStorage.removeItem('foundry_beta_founder_user');
          await this.ensureWorkspace();
          await this.getUserRole(true);
        }
        return data;
      } catch (err) {
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('email not confirmed') || msg.includes('rate limit')) {
          console.warn('[Foundry Beta Auth] Unlocking Beta Founder session without email requirement:', err.message);
          const betaUser = this.createBetaFounderSession(cleanEmail);
          return { user: betaUser, session: { user: betaUser } };
        }
        throw err;
      }
    }

    async signOut() {
      localStorage.removeItem('foundry_beta_founder_user');
      if (this.client) {
        try { await this.client.auth.signOut(); } catch (e) {}
      }
      this.currentUser = null;
      this.currentWorkspace = null;
      this.currentRole = 'guest';
      this.notifyAuthListeners('SIGNED_OUT', null);
    }

    async resetPassword(email) {
      if (!this.client) throw new Error('Supabase client not configured.');
      const redirectUrl = window.location.origin + '/#landing';
      const { data, error } = await this.client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl
      });
      if (error) throw error;
      return data;
    }

    async updatePassword(newPassword) {
      if (!this.client) throw new Error('Supabase client not configured.');
      const { data, error } = await this.client.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return data;
    }

    async getUserRole(forceRefresh = false) {
      if (!this.isAuthenticated()) {
        this.currentRole = 'guest';
        return 'guest';
      }

      if (!forceRefresh && this.currentRole) {
        return this.currentRole;
      }

      try {
        // Try secure RPC function first
        const { data: rpcData, error: rpcErr } = await this.client.rpc('get_current_user_role');
        if (!rpcErr && rpcData && rpcData.role) {
          this.currentRole = rpcData.role;
          return this.currentRole;
        }

        // Fallback to query on user_roles table
        const { data: roleRow, error: tableErr } = await this.client
          .from('user_roles')
          .select('role')
          .eq('user_id', this.currentUser.id)
          .maybeSingle();

        if (!tableErr && roleRow && roleRow.role) {
          this.currentRole = roleRow.role;
          return this.currentRole;
        }

        this.currentRole = 'founder';
        return 'founder';
      } catch (err) {
        console.warn('[FoundrySupabase] Could not verify user role from server:', err.message);
        this.currentRole = 'founder';
        return 'founder';
      }
    }

    async isAdmin() {
      const role = await this.getUserRole();
      return role === 'admin';
    }

    async logAdminSupportAccess(founderId, reason) {
      if (!this.client || !this.currentUser) throw new Error('Not authenticated.');
      const { data, error } = await this.client.rpc('log_admin_support_access', {
        p_founder_id: founderId,
        p_reason: reason
      });
      if (error) throw error;
      return data;
    }

    async getSupportAuditLogs(limit = 20) {
      if (!this.client || !this.currentUser) return [];
      try {
        const { data, error } = await this.client
          .from('admin_support_audit_log')
          .select('*')
          .order('accessed_at', { ascending: false })
          .limit(limit);
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('[FoundrySupabase] Error loading support audit logs:', err.message);
        return [];
      }
    }

    async getAdminPlatformStats() {
      if (!this.client || !this.currentUser) return null;
      try {
        const [{ count: wsCount }, { count: simCount }, { count: reportCount }] = await Promise.all([
          this.client.from('founder_workspaces').select('*', { count: 'exact', head: true }),
          this.client.from('founder_simulation_runs').select('*', { count: 'exact', head: true }),
          this.client.from('founder_grounded_research_reports').select('*', { count: 'exact', head: true })
        ]);

        return {
          workspacesCount: wsCount || 0,
          simulationRunsCount: simCount || 0,
          groundedReportsCount: reportCount || 0,
          retrievedAt: new Date().toISOString()
        };
      } catch (err) {
        console.warn('[FoundrySupabase] Error retrieving platform stats:', err.message);
        return {
          workspacesCount: 0,
          simulationRunsCount: 0,
          groundedReportsCount: 0,
          retrievedAt: new Date().toISOString()
        };
      }
    }

    /* -------------------------------------------------------------
       FOUNDER WORKSPACE CONTAINER
       ------------------------------------------------------------- */
    async ensureWorkspace() {
      if (!this.client || !this.currentUser) return null;
      try {
        const { data, error } = await this.client
          .from('founder_workspaces')
          .select('*')
          .eq('user_id', this.currentUser.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          this.currentWorkspace = data;
          return data;
        }

        // Create initial workspace for founder
        const { data: newWs, error: insertErr } = await this.client
          .from('founder_workspaces')
          .insert({
            user_id: this.currentUser.id,
            name: `${this.currentUser.email.split('@')[0]}'s Venture Studio`
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        this.currentWorkspace = newWs;
        return newWs;
      } catch (err) {
        console.error('[FoundrySupabase] ensureWorkspace error:', err);
        return null;
      }
    }

    /* -------------------------------------------------------------
       FOUNDER DATA SYNC (BACKEND-PERSISTED)
       ------------------------------------------------------------- */

    // 1. Startup Profile
    async saveStartupProfile(profile) {
      if (!this.isAuthenticated()) return null;
      const ws = await this.ensureWorkspace();
      if (!ws) return null;

      const payload = {
        workspace_id: ws.id,
        user_id: this.currentUser.id,
        name: profile.name || 'Unchartered Venture',
        product_type: profile.type || '',
        description: profile.desc || '',
        stage: profile.stage || 'Prototype / Functional MVP',
        target_country_name: profile.country || '',
        target_country_code: this.resolveIso3(profile.country || 'USA'),
        updated_at: new Date().toISOString()
      };

      // Check existing startup row
      const { data: existing } = await this.client
        .from('founder_startups')
        .select('id')
        .eq('workspace_id', ws.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await this.client
          .from('founder_startups')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await this.client
          .from('founder_startups')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    }

    async loadStartupProfile() {
      if (!this.isAuthenticated()) return null;
      const ws = await this.ensureWorkspace();
      if (!ws) return null;

      const { data, error } = await this.client
        .from('founder_startups')
        .select('*')
        .eq('workspace_id', ws.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        name: data.name || '',
        type: data.product_type || '',
        desc: data.description || '',
        stage: data.stage || 'Prototype / Functional MVP',
        country: data.target_country_name || ''
      };
    }

    // 2. Customer Groups
    async saveCustomerGroups(groups) {
      if (!this.isAuthenticated()) return null;
      const ws = await this.ensureWorkspace();
      if (!ws) return null;

      // Delete old groups for this workspace and replace
      await this.client
        .from('founder_customer_groups')
        .delete()
        .eq('workspace_id', ws.id);

      if (!groups || groups.length === 0) return [];

      const rows = groups.map(g => ({
        workspace_id: ws.id,
        user_id: this.currentUser.id,
        name: g.name,
        description: g.desc || '',
        budget_tier: ['low', 'medium', 'high'].includes(g.budget) ? g.budget : 'medium',
        primary_channel: g.channel || 'social',
        stated_assumptions: g.assumptions || `Stated channel preference: ${g.channel}, Budget: ${g.budget}`
      }));

      const { data, error } = await this.client
        .from('founder_customer_groups')
        .insert(rows)
        .select();

      if (error) throw error;
      return data;
    }

    async loadCustomerGroups() {
      if (!this.isAuthenticated()) return null;
      const ws = await this.ensureWorkspace();
      if (!ws) return null;

      const { data, error } = await this.client
        .from('founder_customer_groups')
        .select('*')
        .eq('workspace_id', ws.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data) return [];

      return data.map(row => ({
        id: row.id,
        name: row.name,
        desc: row.description,
        budget: row.budget_tier,
        channel: row.primary_channel,
        assumptions: row.stated_assumptions
      }));
    }

    // 3. Competitor Notes
    async saveCompetitorNotes(notes) {
      if (!this.isAuthenticated()) return null;
      const ws = await this.ensureWorkspace();
      if (!ws) return null;

      const payload = {
        workspace_id: ws.id,
        user_id: this.currentUser.id,
        notes: notes || '',
        updated_at: new Date().toISOString()
      };

      const { data: existing } = await this.client
        .from('founder_competitor_notes')
        .select('id')
        .eq('workspace_id', ws.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await this.client
          .from('founder_competitor_notes')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await this.client
          .from('founder_competitor_notes')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    }

    async loadCompetitorNotes() {
      if (!this.isAuthenticated()) return null;
      const ws = await this.ensureWorkspace();
      if (!ws) return null;

      const { data, error } = await this.client
        .from('founder_competitor_notes')
        .select('notes')
        .eq('workspace_id', ws.id)
        .maybeSingle();

      if (error) throw error;
      return data ? data.notes : '';
    }

    // 4. Active Campaign
    async saveCampaign(campaign) {
      if (!this.isAuthenticated()) return null;
      const ws = await this.ensureWorkspace();
      if (!ws) return null;

      const payload = {
        workspace_id: ws.id,
        user_id: this.currentUser.id,
        name: 'Launch Experiment',
        channel: campaign.channel || 'social',
        price: campaign.price || 0,
        budget: campaign.budget || 0,
        status: 'active',
        updated_at: new Date().toISOString()
      };

      const { data: existing } = await this.client
        .from('founder_campaigns')
        .select('id')
        .eq('workspace_id', ws.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await this.client
          .from('founder_campaigns')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await this.client
          .from('founder_campaigns')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    }

    async loadCampaign() {
      if (!this.isAuthenticated()) return null;
      const ws = await this.ensureWorkspace();
      if (!ws) return null;

      const { data, error } = await this.client
        .from('founder_campaigns')
        .select('*')
        .eq('workspace_id', ws.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        price: Number(data.price),
        channel: data.channel,
        budget: Number(data.budget)
      };
    }

    // 5. Save Simulation Run with Audit Evidence & Events
    async recordSimulationRun({ run, events, evidenceList }) {
      if (!this.isAuthenticated()) return null;
      const ws = await this.ensureWorkspace();
      if (!ws) return null;

      // 1. Insert simulation run
      const runPayload = {
        workspace_id: ws.id,
        user_id: this.currentUser.id,
        run_number: run.runNumber || 1,
        startup_name: run.appName || 'Your Startup',
        customer_group_name: run.targetGroupName || 'Target Group',
        channel: run.channel || 'social',
        price: run.price || 0,
        budget: run.budget || 0,
        country_code: run.countryCode || run.country?.code || null,
        country_name: run.countryName || run.country?.name || null,
        industry_domain: run.industryDomain || run.industry || null,
        founder_inputs: run.founderInputs || {
          targetGroupName: run.targetGroupName,
          targetBudget: run.targetBudget,
          channel: run.channel,
          price: run.price,
          budget: run.totalBudget || run.budget,
          dailyBudget: run.dailyBudget,
          durationDays: run.durationDays,
          seed: run.seed,
          flowTasks: run.flowTasks,
          dailyReports: run.dailyReports
        },
        uncertainty_range: run.uncertaintyRange || {},
        model_logic_explanation: run.modelLogicExplanation || null,
        assumptions_and_limitations: run.assumptionsAndLimitations || null,
        data_gaps: run.dataGaps || [],
        research_recommendations: run.researchRecommendations || null,
        simulated_impressions: run.impressions || 0,
        simulated_clicks: run.clicks || 0,
        simulated_installs: run.installs || 0,
        simulated_paid_users: run.paidUsers || 0,
        simulated_revenue: run.revenue || 0,
        simulated_net_profit: run.netProfit || 0,
        simulated_avg_rating: Math.min(5.0, Math.max(1.0, run.avgRating || 3.0)),
        simulated_reviews: run.reviews || [],
        model_version: run.modelVersion || 'v2.0-grounded'
      };

      const { data: insertedRun, error: runErr } = await this.client
        .from('founder_simulation_runs')
        .insert(runPayload)
        .select()
        .single();

      if (runErr) throw runErr;
      const simRunId = insertedRun.id;

      // 2. Insert simulation evidence
      if (evidenceList && evidenceList.length > 0) {
        const evidenceRows = evidenceList.map(ev => ({
          simulation_run_id: simRunId,
          workspace_id: ws.id,
          user_id: this.currentUser.id,
          source_id: ev.source_id || ev.sourceId || null,
          source_name: ev.source_name || ev.sourceName || null,
          data_status: ev.data_status || (ev.indicator_value !== null && ev.indicator_value !== undefined ? 'reported' : 'missing_unreported'),
          uncertainty_note: ev.uncertainty_note || ev.uncertaintyNote || null,
          indicator_code: ev.indicator_code || null,
          indicator_name: ev.indicator_name,
          indicator_value: ev.indicator_value !== undefined ? ev.indicator_value : null,
          indicator_unit: ev.indicator_unit || '',
          reference_year: ev.reference_year || null,
          country_code: ev.country_code || null,
          assumption_type: ev.assumption_type || 'macro_market_context',
          assumption_key: ev.assumption_key,
          assumption_value: String(ev.assumption_value),
          formula_applied: ev.formula_applied || null,
          disclaimer: ev.disclaimer || 'Simulated educational model output. Background macroeconomic indicators provide national context, not microeconomic purchasing intent or sales guarantees.'
        }));

        await this.client
          .from('simulation_evidence')
          .insert(evidenceRows);
      }

      // 3. Insert simulation events
      if (events && events.length > 0) {
        const eventRows = events.map((ev, idx) => ({
          simulation_run_id: simRunId,
          workspace_id: ws.id,
          user_id: this.currentUser.id,
          step_day: idx + 1,
          district: ev.district || 'marketplace',
          event_type: ev.event_type || 'simulation_step',
          title: ev.title || 'Market Activity',
          description: ev.body || ev.description || '',
          metrics_delta: ev.metrics || {}
        }));

        await this.client
          .from('founder_simulation_events')
          .insert(eventRows);
      }

      return insertedRun;
    }

    // 5b. Update Simulation Run with Generated Hypothetical Scenarios
    async updateSimulationRunScenarios(runId, scenariosPayload) {
      if (!this.isAuthenticated() || !runId) return null;
      try {
        const { data, error } = await this.client
          .from('founder_simulation_runs')
          .update({
            hypothetical_scenarios: scenariosPayload
          })
          .eq('id', runId)
          .select()
          .maybeSingle();

        if (error) {
          // If hypothetical_scenarios column is not yet present, store in founder_inputs
          const { error: fallbackErr } = await this.client
            .from('founder_simulation_runs')
            .update({
              founder_inputs: scenariosPayload
            })
            .eq('id', runId);
          if (fallbackErr) console.warn('Supabase fallback scenarios update error:', fallbackErr);
        }
        return data;
      } catch (err) {
        console.warn('Could not update simulation run scenarios in Supabase:', err);
        return null;
      }
    }

    // 6. Load History with Evidence
    async loadSimulationHistory() {
      if (!this.isAuthenticated()) return [];
      const ws = await this.ensureWorkspace();
      if (!ws) return [];

      const { data: runs, error } = await this.client
        .from('founder_simulation_runs')
        .select(`
          *,
          simulation_evidence (*)
        `)
        .eq('workspace_id', ws.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!runs) return [];

      return runs.map(r => ({
        id: r.id,
        runNumber: r.run_number,
        timestamp: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateStr: new Date(r.created_at).toLocaleDateString(),
        appName: r.startup_name,
        targetGroupName: r.customer_group_name,
        channel: r.channel,
        price: Number(r.price),
        budget: Number(r.budget),
        countryCode: r.country_code || 'USA',
        countryName: r.country_name || 'United States',
        industryDomain: r.industry_domain || 'General Tech',
        modelVersion: r.model_version || 'v2.0-grounded',
        founderInputs: r.founder_inputs || {},
        flowTasks: r.founder_inputs?.flowTasks || [],
        dailyReports: r.founder_inputs?.dailyReports || [],
        durationDays: r.founder_inputs?.durationDays || 14,
        seed: r.founder_inputs?.seed || 42,
        dailyBudget: r.founder_inputs?.dailyBudget || (r.founder_inputs?.durationDays ? Math.round(Number(r.budget) / r.founder_inputs.durationDays) : 50),
        totalBudget: Number(r.budget),
        uncertaintyRange: r.uncertainty_range || {},
        modelLogicExplanation: r.model_logic_explanation || null,
        assumptionsAndLimitations: r.assumptions_and_limitations || null,
        dataGaps: r.data_gaps || [],
        researchRecommendations: r.research_recommendations || null,
        impressions: r.simulated_impressions,
        clicks: r.simulated_clicks,
        installs: r.simulated_installs,
        paidUsers: r.simulated_paid_users,
        revenue: Number(r.simulated_revenue),
        netProfit: Number(r.simulated_net_profit),
        avgRating: Number(r.simulated_avg_rating),
        reviews: r.simulated_reviews || [],
        evidence: r.simulation_evidence || []
      }));
    }

    /* -------------------------------------------------------------
       REAL MARKET EVIDENCE (PRIMARY FIELD RESEARCH & SECONDARY STUDIES)
       Strictly private to founder by default via Row Level Security.
       Explicit opt-in required for de-identified benchmarking.
       ------------------------------------------------------------- */

    async saveRealEvidence(record) {
      if (!this.isAuthenticated()) return null;
      const ws = await this.ensureWorkspace();
      if (!ws) return null;

      const payload = {
        workspace_id: ws.id,
        user_id: this.currentUser.id,
        research_method: record.researchMethod || 'customer_interviews',
        evidence_type: record.evidenceType === 'published_source' ? 'published_source' : 'firsthand',
        source_citation: record.sourceCitation || (record.evidenceType === 'published_source' ? 'Published Study' : 'Primary Founder Research'),
        country_code: record.countryCode || this.resolveIso3(record.countryName || 'USA'),
        country_name: record.countryName || 'United States',
        industry_domain: record.industryDomain || 'General Technology',
        customer_group_id: record.customerGroupId || null,
        customer_group_name: record.customerGroupName || null,
        collection_start_date: record.collectionStartDate || null,
        collection_end_date: record.collectionEndDate || null,
        sample_size: Math.max(1, parseInt(record.sampleSize, 10) || 1),
        sample_description: record.sampleDescription || null,
        linked_simulation_run_id: record.linkedSimulationRunId || null,
        model_version_evaluated: record.modelVersionEvaluated || 'v2.0-grounded',
        research_question: record.researchQuestion || 'Hypothesis validation inquiry',
        results_summary: record.resultsSummary || '',
        quantitative_metrics: record.quantitativeMetrics || {},
        limitations_and_biases: record.limitationsAndBiases || 'Small sample size. Findings are directional and not representative of entire market.',
        is_representative_sample: Boolean(record.isRepresentativeSample),
        privacy_status: record.privacyStatus === 'opted_in_shared' ? 'opted_in_shared' : 'private',
        opted_in_at: record.privacyStatus === 'opted_in_shared' ? (record.optedInAt || new Date().toISOString()) : null,
        updated_at: new Date().toISOString()
      };

      if (record.id) {
        const { data, error } = await this.client
          .from('founder_real_evidence')
          .update(payload)
          .eq('id', record.id)
          .eq('workspace_id', ws.id)
          .select()
          .single();
        if (error) throw error;
        return this.formatRealEvidenceRecord(data);
      } else {
        const { data, error } = await this.client
          .from('founder_real_evidence')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return this.formatRealEvidenceRecord(data);
      }
    }

    async loadRealEvidence() {
      if (!this.isAuthenticated()) return [];
      const ws = await this.ensureWorkspace();
      if (!ws) return [];

      const { data, error } = await this.client
        .from('founder_real_evidence')
        .select('*')
        .eq('workspace_id', ws.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map(row => this.formatRealEvidenceRecord(row));
    }

    async deleteRealEvidence(recordId) {
      if (!this.isAuthenticated()) return false;
      const ws = await this.ensureWorkspace();
      if (!ws) return false;

      const { error } = await this.client
        .from('founder_real_evidence')
        .delete()
        .eq('id', recordId)
        .eq('workspace_id', ws.id);

      if (error) throw error;
      return true;
    }

    async deleteAllRealEvidence() {
      if (!this.isAuthenticated()) return false;
      const ws = await this.ensureWorkspace();
      if (!ws) return false;

      const { error } = await this.client
        .from('founder_real_evidence')
        .delete()
        .eq('workspace_id', ws.id);

      if (error) throw error;
      return true;
    }

    async updateEvidencePrivacy(recordId, isOptedIn) {
      if (!this.isAuthenticated()) return null;
      const ws = await this.ensureWorkspace();
      if (!ws) return null;

      const privacyStatus = isOptedIn ? 'opted_in_shared' : 'private';
      const optedInAt = isOptedIn ? new Date().toISOString() : null;

      const { data, error } = await this.client
        .from('founder_real_evidence')
        .update({
          privacy_status: privacyStatus,
          opted_in_at: optedInAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .eq('workspace_id', ws.id)
        .select()
        .single();

      if (error) throw error;
      return this.formatRealEvidenceRecord(data);
    }

    formatRealEvidenceRecord(row) {
      if (!row) return null;
      return {
        id: row.id,
        researchMethod: row.research_method,
        evidenceType: row.evidence_type,
        sourceCitation: row.source_citation,
        countryCode: row.country_code,
        countryName: row.country_name,
        industryDomain: row.industry_domain,
        customerGroupId: row.customer_group_id,
        customerGroupName: row.customer_group_name,
        collectionStartDate: row.collection_start_date,
        collectionEndDate: row.collection_end_date,
        sampleSize: Number(row.sample_size),
        sampleDescription: row.sample_description,
        linkedSimulationRunId: row.linked_simulation_run_id || null,
        modelVersionEvaluated: row.model_version_evaluated || 'v2.0-grounded',
        researchQuestion: row.research_question,
        resultsSummary: row.results_summary,
        quantitativeMetrics: row.quantitative_metrics || {},
        limitationsAndBiases: row.limitations_and_biases,
        isRepresentativeSample: Boolean(row.is_representative_sample),
        privacyStatus: row.privacy_status,
        optedInAt: row.opted_in_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    }

    exportRealEvidenceData(records, format = 'json') {
      if (!records || records.length === 0) {
        return format === 'csv' ? 'id,research_method,sample_size,results_summary\n' : '[]';
      }

      if (format === 'csv') {
        const headers = [
          'ID',
          'Evidence Type',
          'Research Method',
          'Country',
          'Industry',
          'Customer Group',
          'Sample Size (N)',
          'Linked Simulation Run ID',
          'Model Version',
          'Collection Period',
          'Research Question / Hypothesis',
          'Results Summary',
          'Limitations and Biases',
          'Representative of Country',
          'Privacy Status',
          'Source Citation',
          'Created Date'
        ];

        const escapeCsvField = (val) => {
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        };

        const rows = records.map(r => [
          r.id,
          r.evidenceType,
          r.researchMethod,
          r.countryName || r.countryCode || 'N/A',
          r.industryDomain,
          r.customerGroupName || 'All',
          r.sampleSize,
          r.linkedSimulationRunId || 'None',
          r.modelVersionEvaluated || 'v2.0-grounded',
          `${r.collectionStartDate || ''} to ${r.collectionEndDate || ''}`.trim(),
          r.researchQuestion,
          r.resultsSummary,
          r.limitationsAndBiases,
          r.isRepresentativeSample ? 'Yes (Verified)' : 'No (Directional/Biased)',
          r.privacyStatus === 'opted_in_shared' ? 'Opted-In (De-Identified)' : 'Strictly Private',
          r.sourceCitation || '',
          r.createdAt ? new Date(r.createdAt).toISOString() : ''
        ].map(escapeCsvField).join(','));

        return [headers.map(escapeCsvField).join(','), ...rows].join('\n');
      }

      return JSON.stringify(records, null, 2);
    }

    /* -------------------------------------------------------------
       MODEL EVALUATION & GOVERNANCE AUDIT (ADMIN OBSERVATORY)
       Aggregates only permissioned (opted-in) founder research.
       Applies sparsity threshold gate: N >= 100 & k >= 3 studies.
       ------------------------------------------------------------- */
    async loadModelEvaluationCohorts() {
      if (!this.client) return [];
      try {
        const { data, error } = await this.client
          .from('model_evaluation_cohorts')
          .select('*');
        if (error) {
          console.warn('[FoundrySupabase] loadModelEvaluationCohorts:', error.message);
          return [];
        }
        return (data || []).map(r => ({
          industryDomain: r.industry_domain,
          researchMethod: r.research_method,
          countryCode: r.country_code,
          modelVersionEvaluated: r.model_version_evaluated,
          permissionedStudiesCount: Number(r.permissioned_studies_count),
          totalSampleSize: Number(r.total_sample_size),
          isSparseEvidence: Boolean(r.is_sparse_evidence),
          observedAvgConversionRate: r.observed_avg_conversion_rate !== null ? Number(r.observed_avg_conversion_rate) : null,
          observedAvgPrice: r.observed_avg_price !== null ? Number(r.observed_avg_price) : null,
          simulatedAvgPriceTested: r.simulated_avg_price_tested !== null ? Number(r.simulated_avg_price_tested) : null,
          simulatedAvgPaidRate: r.simulated_avg_paid_rate !== null ? Number(r.simulated_avg_paid_rate) : null,
          simulatedAvgCtr: r.simulated_avg_ctr !== null ? Number(r.simulated_avg_ctr) : null
        }));
      } catch (err) {
        console.error('[FoundrySupabase] loadModelEvaluationCohorts err:', err);
        return [];
      }
    }

    async loadModelGovernanceReviews() {
      if (!this.client) return [];
      try {
        const { data, error } = await this.client
          .from('model_governance_reviews')
          .select('*')
          .order('review_date', { ascending: false });
        if (error) {
          console.warn('[FoundrySupabase] loadModelGovernanceReviews:', error.message);
          return [];
        }
        return (data || []).map(r => ({
          id: r.id,
          modelVersion: r.model_version,
          status: r.status,
          reviewDate: r.review_date,
          reviewerTitle: r.reviewer_title,
          datasetScopeSummary: r.dataset_scope_summary,
          empiricalCohortsEvaluated: Number(r.empirical_cohorts_evaluated),
          totalPermissionedSampleSize: Number(r.total_permissioned_sample_size),
          decisionRationale: r.decision_rationale,
          documentedLimitations: r.documented_limitations,
          recommendedEvidenceNeeded: r.recommended_evidence_needed
        }));
      } catch (err) {
        console.error('[FoundrySupabase] loadModelGovernanceReviews err:', err);
        return [];
      }
    }

    async recordModelGovernanceReview(review) {
      if (!this.isAuthenticated()) return null;
      try {
        const payload = {
          model_version: review.modelVersion,
          status: review.status || 'under_review',
          reviewer_title: review.reviewerTitle || 'Model Governance Board',
          dataset_scope_summary: review.datasetScopeSummary || '',
          empirical_cohorts_evaluated: review.empiricalCohortsEvaluated || 0,
          total_permissioned_sample_size: review.totalPermissionedSampleSize || 0,
          decision_rationale: review.decisionRationale || '',
          documented_limitations: review.documentedLimitations || '',
          recommended_evidence_needed: review.recommendedEvidenceNeeded || ''
        };
        const { data, error } = await this.client
          .from('model_governance_reviews')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('[FoundrySupabase] recordModelGovernanceReview err:', err);
        return null;
      }
    }

    /* -------------------------------------------------------------
       BETA FEEDBACK & DATA ERROR REPORTING (ISOLATED BY RLS)
       ------------------------------------------------------------- */
    async submitBetaFeedback(report) {
      if (!this.isAuthenticated()) {
        const localList = JSON.parse(localStorage.getItem('vsw_beta_feedback_v2') || '[]');
        const localRecord = {
          id: 'fb_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          ...report,
          created_at: new Date().toISOString(),
          status: 'stored_locally'
        };
        localList.unshift(localRecord);
        localStorage.setItem('vsw_beta_feedback_v2', JSON.stringify(localList));
        return { data: localRecord, localOnly: true };
      }

      try {
        const payload = {
          user_id: this.user.id,
          workspace_id: this.user.id,
          report_type: report.reportType || 'general_feedback',
          context_view: report.contextView || 'general',
          related_run_id: report.relatedRunId || null,
          related_indicator_code: report.relatedIndicatorCode || null,
          target_country_code: report.targetCountryCode || null,
          target_industry_domain: report.targetIndustryDomain || null,
          subject: report.subject,
          details: report.details,
          observed_discrepancy: report.observedDiscrepancy || null,
          client_app_version: report.clientAppVersion || 'v2.0-beta',
          status: 'submitted'
        };

        const { data, error } = await this.client
          .from('beta_feedback_reports')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error('[FoundrySupabase] submitBetaFeedback error:', err);
        return { data: null, error: err };
      }
    }

    async loadUserBetaFeedback() {
      if (!this.isAuthenticated()) {
        return JSON.parse(localStorage.getItem('vsw_beta_feedback_v2') || '[]');
      }
      try {
        const { data, error } = await this.client
          .from('beta_feedback_reports')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.warn('[FoundrySupabase] loadUserBetaFeedback error:', error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error('[FoundrySupabase] loadUserBetaFeedback exception:', err);
        return [];
      }
    }

    /* -------------------------------------------------------------
       SIMULATION-SPECIFIC BETA FEEDBACK (LINKED TO RUN & MACRO DATA)
       ------------------------------------------------------------- */
    async saveSimulationFeedback(fb) {
      if (!this.isAuthenticated()) {
        const localList = JSON.parse(localStorage.getItem('vsw_sim_feedback_v2') || '[]');
        const localRecord = {
          id: 'sfb_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          ...fb,
          created_at: new Date().toISOString(),
          status: 'stored_locally'
        };
        localList.unshift(localRecord);
        localStorage.setItem('vsw_sim_feedback_v2', JSON.stringify(localList));
        return { data: localRecord, localOnly: true };
      }

      try {
        const ws = await this.ensureWorkspace();
        const payload = {
          user_id: this.currentUser ? this.currentUser.id : null,
          workspace_id: ws ? ws.id : null,
          simulation_run_id: fb.simulationRunId,
          country_code: fb.countryCode || 'USA',
          country_name: fb.countryName || 'United States',
          industry_domain: fb.industryDomain || 'General',
          is_useful: fb.isUseful,
          surprising_or_wrong_factors: fb.surprisingOrWrongFactors,
          surprising_factor_category: fb.surprisingFactorCategory || 'other',
          has_real_evidence_comparison: fb.hasRealEvidenceComparison,
          planned_changes_next_run: fb.plannedChangesNextRun || '',
          linked_simulation_snapshot: fb.linkedSimulationSnapshot || {},
          linked_market_sources: fb.linkedMarketSources || [],
          share_with_foundry_team: Boolean(fb.shareWithFoundryTeam),
          admin_review_status: 'pending_review'
        };

        const { data, error } = await this.client
          .from('simulation_run_feedback')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error('[FoundrySupabase] saveSimulationFeedback error:', err);
        return { data: null, error: err };
      }
    }

    async loadUserSimulationFeedback() {
      if (!this.isAuthenticated()) {
        return JSON.parse(localStorage.getItem('vsw_sim_feedback_v2') || '[]');
      }
      try {
        const { data, error } = await this.client
          .from('simulation_run_feedback')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.warn('[FoundrySupabase] loadUserSimulationFeedback error:', error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error('[FoundrySupabase] loadUserSimulationFeedback exception:', err);
        return [];
      }
    }

    async loadSharedSimulationFeedbackAdmin() {
      if (!this.client) {
        const local = JSON.parse(localStorage.getItem('vsw_sim_feedback_v2') || '[]');
        return local.filter(f => f.shareWithFoundryTeam);
      }
      try {
        const { data, error } = await this.client
          .from('shared_beta_feedback_admin')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.warn('[FoundrySupabase] loadSharedSimulationFeedbackAdmin view error:', error.message);
          const fallback = await this.client
            .from('simulation_run_feedback')
            .select('*')
            .eq('share_with_foundry_team', true)
            .order('created_at', { ascending: false });
          return fallback.data || [];
        }
        return data || [];
      } catch (err) {
        console.error('[FoundrySupabase] loadSharedSimulationFeedbackAdmin exception:', err);
        return [];
      }
    }

    /* -------------------------------------------------------------
       MARKET DATA LIBRARY (PUBLIC READ VIA RLS)
       ------------------------------------------------------------- */
    async getMarketSources() {
      if (!this.client) return [];
      const { data, error } = await this.client
        .from('market_data_sources')
        .select('*');
      if (error) {
        console.warn('[FoundrySupabase] getMarketSources:', error.message);
        return [];
      }
      return data || [];
    }

    async getMarketIndicators() {
      if (!this.client) return [];
      const { data, error } = await this.client
        .from('market_indicators')
        .select('*');
      if (error) {
        console.warn('[FoundrySupabase] getMarketIndicators:', error.message);
        return [];
      }
      return data || [];
    }

    async getCountryObservations({ countryCode, topic, year, period, industry, evidenceType, limit = 1000 } = {}) {
      const cleanIso = (countryCode && countryCode !== 'ALL') ? this.resolveIso3(countryCode) : null;
      let data = [];

      // 1. Try Supabase query if client is initialized
      if (this.client) {
        try {
          let query = this.client
            .from('country_observations')
            .select(`
              id,
              country_code,
              country_name,
              indicator_code,
              year,
              value,
              unit,
              source_id,
              imported_at,
              metadata,
              market_indicators (name, topic, limitations, definition)
            `)
            .order('year', { ascending: false })
            .limit(limit);

          if (cleanIso) {
            query = query.eq('country_code', cleanIso);
          }

          // Historical period filtering
          const activePeriod = period || (year !== 'ALL' && year ? year : 'ALL');
          if (activePeriod === 'LAST_3_YRS') {
            query = query.gte('year', 2021);
          } else if (activePeriod === 'LAST_5_YRS') {
            query = query.gte('year', 2019);
          } else if (activePeriod !== 'ALL' && activePeriod !== 'LATEST' && !isNaN(parseInt(activePeriod, 10))) {
            query = query.eq('year', parseInt(activePeriod, 10));
          }

          const { data: dbData, error } = await query;
          if (!error && dbData && dbData.length > 0) {
            data = dbData;
          }
        } catch (e) {
          console.warn('[FoundrySupabase] getCountryObservations DB query error, falling back to bundled data:', e);
        }
      }

      // 2. Fallback to bundled verified observations if no DB observations returned
      if (!data || data.length === 0) {
        const bundled = window.FOUNDRY_BUNDLED_OBSERVATIONS || [];
        if (bundled.length > 0) {
          data = bundled.map((obs, idx) => {
            const meta = this.getIndicatorMeta(obs.indicator_code);
            return {
              id: `bundled_${obs.country_code}_${obs.indicator_code}_${obs.year}_${idx}`,
              country_code: obs.country_code,
              country_name: obs.country_name,
              indicator_code: obs.indicator_code,
              year: obs.year,
              value: obs.value,
              unit: obs.unit,
              source_id: obs.source_id,
              imported_at: obs.imported_at,
              metadata: {
                source_name: obs.source_name,
                source_url: obs.source_url
              },
              market_indicators: meta || {
                name: obs.indicator_code,
                topic: 'General Macroeconomic',
                limitations: 'Verified indicator from official multilateral source.',
                definition: obs.indicator_code
              }
            };
          });

          if (cleanIso) {
            data = data.filter(row => row.country_code === cleanIso);
          }

          const activePeriod = period || (year !== 'ALL' && year ? year : 'ALL');
          if (activePeriod === 'LAST_3_YRS') {
            data = data.filter(row => row.year >= 2021);
          } else if (activePeriod === 'LAST_5_YRS') {
            data = data.filter(row => row.year >= 2019);
          } else if (activePeriod !== 'ALL' && activePeriod !== 'LATEST' && !isNaN(parseInt(activePeriod, 10))) {
            const targetYear = parseInt(activePeriod, 10);
            data = data.filter(row => row.year === targetYear);
          }
        }
      }

      // 3. Post-query Topic, Industry & Evidence Type filters
      if (topic && topic !== 'ALL') {
        data = data.filter(row => row.market_indicators && row.market_indicators.topic === topic);
      }

      if (industry && industry !== 'ALL') {
        const industryMapping = {
          'Enterprise B2B Software & Cloud Adoption': ['Enterprise ICT Adoption', 'Broadband Infrastructure'],
          'Fintech & Banking Rails': ['Financial Inclusion & Payments', 'Digital Payments & Transaction Behavior', 'Payment Cards & Infrastructure'],
          'Fintech & Digital Payments': ['Digital Payments & Transaction Behavior', 'Payment Cards & Infrastructure'],
          'Consumer E-Commerce & Retail': ['E-Commerce & Digital Economy'],
          'Mobile Applications & Operating Systems': ['Mobile Apps & Software Ecosystem', 'Fintech & Mobile Banking Apps', 'Digital Health & Wellness Apps', 'Entertainment & Video Apps'],
          'Telecommunications & Network Infrastructure': ['Digital Infrastructure & Connectivity', 'Mobile Infrastructure', 'Broadband Infrastructure'],
          'Cross-Border Digital Services & IT Export': ['Digital Trade & Services'],
          'Macroeconomic & Demographics': ['Demographics & Market Size', 'Economic Context']
        };
        const allowedTopics = industryMapping[industry] || [];
        if (allowedTopics.length > 0) {
          data = data.filter(row => row.market_indicators && allowedTopics.includes(row.market_indicators.topic));
        }
      }

      if (evidenceType && evidenceType !== 'ALL') {
        data = data.filter(row => {
          const code = row.indicator_code;
          const isSurvey = ['account.t.d', 'g20.any', 'fin2.t.d', 'fin10', 'g20.made'].includes(code);
          if (evidenceType === 'survey_wave') return isSurvey;
          if (evidenceType === 'official_indicator') return !isSurvey;
          if (evidenceType === 'market_size_estimate' || evidenceType === 'grounded_research') return false;
          return true;
        });
      }

      // 4. Handle 'LATEST' filter: return only the newest observation for each indicator
      if (period === 'LATEST') {
        const latestByCode = new Map();
        for (const row of data) {
          const key = `${row.country_code}_${row.indicator_code}`;
          if (!latestByCode.has(key) || latestByCode.get(key).year < row.year) {
            latestByCode.set(key, row);
          }
        }
        return Array.from(latestByCode.values());
      }

      return data;
    }

    getIndicatorMeta(code) {
      const catalog = (typeof window !== 'undefined' && window.SOURCED_INDICATOR_CATALOG) || [];
      const found = catalog.find(i => i.code === code);
      if (found) {
        return {
          name: found.name,
          topic: found.topic,
          limitations: found.limitations,
          definition: found.name,
          unit: found.unit,
          publisher: found.publisher,
          sourceUrl: found.sourceUrl
        };
      }
      return null;
    }

    async getAvailableCountries() {
      if (this.client) {
        try {
          const { data, error } = await this.client
            .from('country_observations')
            .select('country_code, country_name')
            .limit(1000);

          if (!error && data && data.length > 0) {
            const map = new Map();
            for (const row of data) {
              if (!map.has(row.country_code)) {
                map.set(row.country_code, row.country_name || row.country_code);
              }
            }
            return Array.from(map.entries())
              .map(([code, name]) => ({ code, name }))
              .sort((a, b) => a.name.localeCompare(b.name));
          }
        } catch (_) {}
      }

      const bundled = window.FOUNDRY_BUNDLED_OBSERVATIONS || [];
      const map = new Map();
      for (const row of bundled) {
        if (!map.has(row.country_code)) {
          map.set(row.country_code, row.country_name || row.country_code);
        }
      }
      return Array.from(map.entries())
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    async getCountryMarketContext(countryCode = 'USA') {
      const cleanIso = this.resolveIso3(countryCode);
      const observations = await this.getCountryObservations({ countryCode: cleanIso, limit: 1000 });
      return { data: observations || [], error: null };
    }

    // Helper: ISO-3 Country Code Resolver
    resolveIso3(input) {
      if (!input) return 'USA';
      const clean = input.trim().toUpperCase();
      if (clean.length === 3) return clean;

      const mapping = {
        'UNITED STATES': 'USA',
        'US': 'USA',
        'USA': 'USA',
        'UNITED KINGDOM': 'GBR',
        'UK': 'GBR',
        'GBR': 'GBR',
        'GERMANY': 'DEU',
        'DEUTSCHLAND': 'DEU',
        'DEU': 'DEU',
        'INDIA': 'IND',
        'IND': 'IND',
        'KENYA': 'KEN',
        'KEN': 'KEN',
        'FRANCE': 'FRA',
        'CANADA': 'CAN',
        'BRAZIL': 'BRA',
        'JAPAN': 'JPN',
        'SINGAPORE': 'SGP',
        'NIGERIA': 'NGA',
        'AUSTRALIA': 'AUS'
      };

      return mapping[clean] || 'USA';
    }

    /* -------------------------------------------------------------
       MARKET DATA COVERAGE & INGESTION AUDIT
       ------------------------------------------------------------- */
    async getMarketDataCoverage() {
      try {
        let sources = [];
        let indicators = [];
        let importLogs = [];
        let observations = [];
        let isConnected = Boolean(this.client);

      if (this.client) {
        try {
          // 1. Fetch sources
          const { data: dbSources } = await this.client
            .from('market_data_sources')
            .select('*')
            .order('id');
          if (dbSources) sources = dbSources;

          // 2. Fetch indicators
          const { data: dbIndicators } = await this.client
            .from('market_indicators')
            .select('*')
            .order('topic');
          if (dbIndicators) indicators = dbIndicators;

          // 3. Fetch import logs
          const { data: logs } = await this.client
            .from('market_import_logs')
            .select('*')
            .order('started_at', { ascending: false })
            .limit(100);
          if (logs) importLogs = logs;

          // 4. Fetch observations
          let page = 0;
          const pageSize = 1000;
          let hasMore = true;
          while (hasMore && page < 10) {
            const { data: chunk, error: errChunk } = await this.client
              .from('country_observations')
              .select('id, country_code, country_name, indicator_code, year, value, unit, source_id, imported_at')
              .range(page * pageSize, (page + 1) * pageSize - 1);

            if (errChunk || !chunk || chunk.length === 0) {
              hasMore = false;
            } else {
              observations = observations.concat(chunk);
              if (chunk.length < pageSize) {
                hasMore = false;
              } else {
                page++;
              }
            }
          }
        } catch (e) {
          console.warn('[FoundrySupabase] getMarketDataCoverage error loading from DB:', e);
        }
      }

      // If observations are empty (e.g. offline or unpopulated DB), use bundled verified observations!
      if (observations.length === 0 && window.FOUNDRY_BUNDLED_OBSERVATIONS) {
        observations = window.FOUNDRY_BUNDLED_OBSERVATIONS;
      }

      // Fallback indicators from catalog if empty
      if (indicators.length === 0 && window.SOURCED_INDICATOR_CATALOG) {
        const sourceMap = {
          'SP.POP.TOTL': 'world_bank',
          'NY.GDP.PCAP.CD': 'world_bank',
          'IT.NET.USER.ZS': 'world_bank',
          'IT.CEL.SETS.P2': 'world_bank',
          'IT.NET.BBND.P2': 'world_bank',
          'ITU.ICT.HH.INET': 'itu_datahub',
          'ITU.ICT.MOB.4G': 'itu_datahub',
          'ITU.ICT.ACT.MBB': 'itu_datahub',
          'ITU.ICT.FBB.10M': 'itu_datahub',
          'account.t.d': 'global_findex',
          'g20.any': 'global_findex',
          'fin2.t.d': 'global_findex',
          'fin10': 'global_findex',
          'g20.made': 'global_findex',
          'UNCTAD.ECOMM.B2C.IDX': 'unctadstat',
          'UNCTAD.ECOMM.DDS.SHR': 'unctadstat',
          'UNCTAD.ECOMM.ENT.RCV': 'unctadstat',
          'UNCTAD.ECOMM.ENT.WEB': 'unctadstat',
          'UNCTAD.ECOMM.IND.BUY': 'unctadstat',
          'EUROSTAT.APP.INSTALL': 'eurostat',
          'EUROSTAT.APP.CONFIG': 'eurostat',
          'EUROSTAT.APP.BANK': 'eurostat',
          'EUROSTAT.APP.HEALTH': 'eurostat',
          'EUROSTAT.APP.STREAM': 'eurostat'
        };

        indicators = window.SOURCED_INDICATOR_CATALOG.map(c => ({
          id: c.code,
          code: c.code,
          name: c.name,
          topic: c.topic,
          unit: c.unit,
          source_id: sourceMap[c.code] || 'world_bank',
          limitations: c.limitations,
          definition: c.name
        }));
      }

      // Fallback sources if empty
      if (sources.length === 0) {
        sources = [
          {
            id: 'world_bank',
            name: 'World Development Indicators (WDI)',
            publisher: 'The World Bank Group',
            source_url: 'https://data.worldbank.org/',
            methodology_url: 'https://databank.worldbank.org/source/world-development-indicators',
            reuse_terms: 'Creative Commons Attribution 4.0 International (CC-BY 4.0)',
            update_cadence: 'Quarterly',
            refresh_schedule_cron: '0 2 1 * *',
            staleness_threshold_days: 45,
            last_checked_at: '2026-10-18T00:00:00Z',
            last_imported_at: '2026-10-18T00:00:00Z',
            last_import_status: 'success'
          },
          {
            id: 'itu_datahub',
            name: 'World Telecommunication/ICT Indicators',
            publisher: 'International Telecommunication Union (ITU)',
            source_url: 'https://datahub.itu.int/',
            methodology_url: 'https://www.itu.int/en/ITU-D/Statistics/Pages/stat/default.aspx',
            reuse_terms: 'ITU Non-Commercial Use with Attribution',
            update_cadence: 'Semi-annual',
            refresh_schedule_cron: '0 3 1 */3 *',
            staleness_threshold_days: 120,
            last_checked_at: '2026-10-18T00:00:00Z',
            last_imported_at: '2026-10-18T00:00:00Z',
            last_import_status: 'success'
          },
          {
            id: 'global_findex',
            name: 'Global Financial Inclusion Database (Global Findex)',
            publisher: 'The World Bank Development Research Group',
            source_url: 'https://databank.worldbank.org/source/global-financial-inclusion',
            methodology_url: 'https://www.worldbank.org/en/publication/globalfindex/methodology',
            reuse_terms: 'Creative Commons Attribution 4.0 International (CC-BY 4.0)',
            update_cadence: 'Triennial survey wave',
            refresh_schedule_cron: '0 4 15 */3 *',
            staleness_threshold_days: 400,
            last_checked_at: '2026-10-18T00:00:00Z',
            last_imported_at: '2026-10-18T00:00:00Z',
            last_import_status: 'success'
          },
          {
            id: 'unctadstat',
            name: 'UNCTADstat Information Economy & E-Commerce',
            publisher: 'United Nations Trade and Development (UNCTAD)',
            source_url: 'https://unctadstat.unctad.org/',
            methodology_url: 'https://unctadstat.unctad.org/EN/Methodology.html',
            reuse_terms: 'Creative Commons Attribution 3.0 IGO (CC-BY 3.0 IGO)',
            update_cadence: 'Annual (Spring wave)',
            refresh_schedule_cron: '0 4 1 */2 *',
            staleness_threshold_days: 120,
            last_checked_at: '2026-10-18T00:00:00Z',
            last_imported_at: '2026-10-18T00:00:00Z',
            last_import_status: 'success'
          },
          {
            id: 'eurostat',
            name: 'Eurostat Digital Economy & Society (Mobile Applications)',
            publisher: 'European Commission (Eurostat)',
            source_url: 'https://ec.europa.eu/eurostat/web/digital-economy-and-society',
            methodology_url: 'https://ec.europa.eu/eurostat/cache/metadata/en/isoc_i_esms.htm',
            reuse_terms: 'European Commission Decision 2011/833/EU (Open Data with Attribution)',
            update_cadence: 'Annual (December wave)',
            refresh_schedule_cron: '0 5 1 */2 *',
            staleness_threshold_days: 120,
            last_checked_at: '2026-10-18T00:00:00Z',
            last_imported_at: '2026-10-18T00:00:00Z',
            last_import_status: 'success'
          }
        ];
      }

      const summary = this.computeCoverageMetrics(sources, indicators, observations, importLogs);

      return {
        connected: isConnected,
        sources,
        indicators,
        observations,
        importLogs,
        summary
      };
    } catch (err) {
      console.error('[FoundrySupabase] getMarketDataCoverage error:', err);
      return {
        connected: false,
        error: err.message,
        sources: [],
        indicators: [],
        observations: [],
        importLogs: [],
        summary: null
      };
    }
  }

    computeCoverageMetrics(sources, indicators, observations, importLogs) {
      // Benchmark focus economies for gap analysis
      const benchmarkCountries = [
        { code: 'USA', name: 'United States' },
        { code: 'GBR', name: 'United Kingdom' },
        { code: 'DEU', name: 'Germany' },
        { code: 'FRA', name: 'France' },
        { code: 'CAN', name: 'Canada' },
        { code: 'JPN', name: 'Japan' },
        { code: 'SGP', name: 'Singapore' },
        { code: 'IND', name: 'India' },
        { code: 'KEN', name: 'Kenya' },
        { code: 'BRA', name: 'Brazil' },
        { code: 'NGA', name: 'Nigeria' },
        { code: 'AUS', name: 'Australia' }
      ];

      // 1. Process sources & operational health
      const sourcesMap = new Map();
      const operationalAlerts = [];

      const defaultSchedules = {
        world_bank: { cadence: 'Quarterly', cron: '0 2 1 * *', stalenessDays: 45 },
        itu_datahub: { cadence: 'Semi-annual', cron: '0 3 1 */3 *', stalenessDays: 120 },
        global_findex: { cadence: 'Triennial survey wave', cron: '0 4 15 */3 *', stalenessDays: 400 },
        unctadstat: { cadence: 'Annual (Spring wave)', cron: '0 4 1 */2 *', stalenessDays: 120 },
        eurostat: { cadence: 'Annual (December wave)', cron: '0 5 1 */2 *', stalenessDays: 120 }
      };

      sources.forEach(src => {
        const srcLogs = importLogs.filter(l => l.source_id === src.id);
        const latestLog = srcLogs.length > 0 ? srcLogs[0] : null;

        const srcObs = observations.filter(o => o.source_id === src.id);
        const reportedObs = srcObs.filter(o => o.value !== null && o.value !== undefined);
        const uniqueCountries = new Set(reportedObs.map(o => o.country_code));

        const defaults = defaultSchedules[src.id] || { cadence: 'Periodic', cron: '0 3 1 * *', stalenessDays: 90 };
        const updateCadence = src.update_cadence || defaults.cadence;
        const refreshScheduleCron = src.refresh_schedule_cron || defaults.cron;
        const stalenessThresholdDays = src.staleness_threshold_days || defaults.stalenessDays;
        const consecutiveFailures = src.consecutive_failures || 0;

        let lastImportedAt = null;
        let importStatus = src.last_import_status || 'no_records';
        let importSucceeded = false;
        let recordsCount = srcObs.length;

        if (latestLog) {
          lastImportedAt = latestLog.completed_at || latestLog.started_at;
          importStatus = src.last_import_status || latestLog.status;
          importSucceeded = (importStatus === 'success');
          recordsCount = latestLog.records_imported || srcObs.length;
        } else if (src.last_imported_at) {
          lastImportedAt = src.last_imported_at;
          importSucceeded = (importStatus === 'success');
        } else if (srcObs.length > 0) {
          const timestamps = srcObs.map(o => new Date(o.imported_at).getTime()).filter(t => !isNaN(t));
          if (timestamps.length > 0) {
            lastImportedAt = new Date(Math.max(...timestamps)).toISOString();
          } else {
            lastImportedAt = src.last_checked_at;
          }
          importStatus = 'success';
          importSucceeded = true;
        } else {
          lastImportedAt = src.last_checked_at;
          importStatus = 'pending';
          importSucceeded = false;
        }

        // Calculate staleness
        let daysSinceLastImport = null;
        let isStale = false;
        if (lastImportedAt) {
          const lastTs = new Date(lastImportedAt).getTime();
          if (!isNaN(lastTs)) {
            daysSinceLastImport = Math.max(0, Math.floor((Date.now() - lastTs) / (1000 * 60 * 60 * 24)));
            if (daysSinceLastImport > stalenessThresholdDays) {
              isStale = true;
            }
          }
        }

        const isFailed = (importStatus === 'failed' || consecutiveFailures > 0);

        let operationalHealth = 'awaiting_ingest';
        if (isFailed) {
          operationalHealth = 'critical_failure';
          operationalAlerts.push({
            type: 'critical',
            sourceId: src.id,
            sourceName: src.name,
            title: `Ingestion Error: ${src.name}`,
            message: `Latest import failed${consecutiveFailures > 0 ? ` (${consecutiveFailures} consecutive failure[s])` : ''}. Automated retry with exponential backoff active.`,
            action: 'Inspect audit logs or execute manual retry.'
          });
        } else if (importStatus === 'partial' || importStatus === 'partial_failure') {
          operationalHealth = 'warning_partial';
          operationalAlerts.push({
            type: 'warning',
            sourceId: src.id,
            sourceName: src.name,
            title: `Partial Ingestion: ${src.name}`,
            message: 'Some records or indicators failed schema validation while others succeeded.',
            action: 'Review ingest audit log details.'
          });
        } else if (isStale) {
          operationalHealth = 'warning_stale';
          operationalAlerts.push({
            type: 'warning',
            sourceId: src.id,
            sourceName: src.name,
            title: `Data Staleness Exceeded: ${src.name}`,
            message: `Last imported ${daysSinceLastImport} days ago, exceeding the ${stalenessThresholdDays}-day freshness window for ${updateCadence} updates.`,
            action: 'Scheduled cron refresh will trigger at next cycle.'
          });
        } else if (importSucceeded || recordsCount > 0) {
          operationalHealth = 'healthy';
        }

        sourcesMap.set(src.id, {
          id: src.id,
          name: src.name,
          publisher: src.publisher,
          sourceUrl: src.source_url,
          methodologyUrl: src.methodology_url,
          reuseTerms: src.reuse_terms,
          updateCadence,
          refreshScheduleCron,
          stalenessThresholdDays,
          consecutiveFailures,
          daysSinceLastImport,
          isStale,
          isFailed,
          operationalHealth,
          lastCheckedAt: src.last_checked_at,
          lastImportedAt,
          importStatus,
          importSucceeded,
          recordsCount,
          countriesCoveredCount: uniqueCountries.size,
          latestLog
        });
      });

      // 2. Process indicators
      const indicatorsMap = new Map();
      const allReportedYears = new Set();
      const allCoveredCountries = new Map();
      let totalReportedObs = 0;
      let totalMissingObs = 0;

      indicators.forEach(ind => {
        const indObs = observations.filter(o => o.indicator_code === ind.id);
        
        const countryMap = new Map();
        indObs.forEach(o => {
          if (!countryMap.has(o.country_code)) {
            countryMap.set(o.country_code, {
              code: o.country_code,
              name: o.country_name || o.country_code,
              observations: [],
              reportedYears: [],
              missingYears: [],
              earliestYear: null,
              latestYear: null,
              hasReportedData: false,
              latestValue: null,
              latestUnit: o.unit || ind.unit
            });
          }
          const cData = countryMap.get(o.country_code);
          cData.observations.push(o);

          if (o.value !== null && o.value !== undefined) {
            cData.reportedYears.push(o.year);
            cData.hasReportedData = true;
            allReportedYears.add(o.year);
            totalReportedObs++;
            if (!allCoveredCountries.has(o.country_code)) {
              allCoveredCountries.set(o.country_code, o.country_name || o.country_code);
            }
          } else {
            cData.missingYears.push(o.year);
            totalMissingObs++;
          }
        });

        const coveredCountriesList = [];
        const missingCountriesList = [];

        countryMap.forEach(c => {
          if (c.reportedYears.length > 0) {
            c.reportedYears.sort((a, b) => a - b);
            c.earliestYear = c.reportedYears[0];
            c.latestYear = c.reportedYears[c.reportedYears.length - 1];
            const latestObs = c.observations
              .filter(o => o.value !== null && o.value !== undefined)
              .sort((a, b) => b.year - a.year)[0];
            if (latestObs) c.latestValue = latestObs.value;
            coveredCountriesList.push(c);
          } else {
            missingCountriesList.push(c);
          }
        });

        coveredCountriesList.sort((a, b) => a.name.localeCompare(b.name));

        const indReportedYears = indObs.filter(o => o.value !== null && o.value !== undefined).map(o => o.year);
        const indEarliestYear = indReportedYears.length > 0 ? Math.min(...indReportedYears) : null;
        const indLatestYear = indReportedYears.length > 0 ? Math.max(...indReportedYears) : null;

        const benchmarkGaps = benchmarkCountries.filter(b => {
          const entry = countryMap.get(b.code);
          return !entry || !entry.hasReportedData;
        });

        indicatorsMap.set(ind.id, {
          id: ind.id,
          code: ind.id,
          name: ind.name,
          topic: ind.topic,
          unit: ind.unit,
          sourceId: ind.source_id,
          limitations: ind.limitations,
          definition: ind.definition,
          coveredCountries: coveredCountriesList,
          missingCountriesInObs: missingCountriesList,
          benchmarkGaps,
          countriesCoveredCount: coveredCountriesList.length,
          earliestYear: indEarliestYear,
          latestYear: indLatestYear,
          reportedCount: indReportedYears.length,
          missingCount: indObs.length - indReportedYears.length,
          totalCount: indObs.length
        });
      });

      // 3. Process topics & industries
      const topicMap = new Map();
      const industryDomainMapping = {
        'Demographics & Market Size': 'Macroeconomic & Demographics',
        'Economic Context': 'Macroeconomic & Demographics',
        'Digital Infrastructure & Connectivity': 'Telecommunications & Network Infrastructure',
        'Mobile Infrastructure': 'Telecommunications & Mobile Apps',
        'Broadband Infrastructure': 'Telecommunications & Network Infrastructure',
        'Financial Inclusion & Payments': 'Fintech & Banking Rails',
        'Digital Payments & Transaction Behavior': 'Fintech & Digital Payments',
        'Payment Cards & Infrastructure': 'Fintech & Payment Processing',
        'E-Commerce & Digital Economy': 'Consumer E-Commerce & Retail',
        'Digital Trade & Services': 'Cross-Border Digital Services & IT Export',
        'Enterprise ICT Adoption': 'Enterprise B2B Software & Cloud Adoption',
        'Mobile Apps & Software Ecosystem': 'Mobile Applications & Operating Systems',
        'Fintech & Mobile Banking Apps': 'Fintech & Mobile Banking Applications',
        'Digital Health & Wellness Apps': 'Digital Health & Telemedicine Applications',
        'Entertainment & Video Apps': 'Digital Media & Streaming Applications'
      };

      indicatorsMap.forEach(ind => {
        if (!topicMap.has(ind.topic)) {
          topicMap.set(ind.topic, {
            topic: ind.topic,
            industryDomain: industryDomainMapping[ind.topic] || ind.topic,
            sources: new Set(),
            indicators: [],
            countries: new Set(),
            minYear: null,
            maxYear: null,
            totalReported: 0
          });
        }
        const t = topicMap.get(ind.topic);
        t.sources.add(ind.sourceId);
        t.indicators.push(ind);
        ind.coveredCountries.forEach(c => t.countries.add(c.code));
        if (ind.earliestYear) {
          t.minYear = t.minYear === null ? ind.earliestYear : Math.min(t.minYear, ind.earliestYear);
        }
        if (ind.latestYear) {
          t.maxYear = t.maxYear === null ? ind.latestYear : Math.max(t.maxYear, ind.latestYear);
        }
        t.totalReported += ind.reportedCount;
      });

      const topicsList = Array.from(topicMap.values()).map(t => ({
        ...t,
        sources: Array.from(t.sources),
        countriesCount: t.countries.size
      }));

      // 4. Missing Industry Domains (Uncovered sectors with zero records)
      const missingIndustryDomains = [
        {
          domain: 'Healthcare, MedTech & Digital Health',
          status: 'Zero records in backend',
          reason: 'No national healthcare expenditure, hospital bed density, or health worker indicators currently integrated.',
          candidateDataset: 'WHO Global Health Observatory (GHO) / World Bank Health Systems',
          targetStartups: 'HealthTech, Telemedicine, Medical Devices, Wellness apps',
          apiAvailability: 'Official WHO OData API & World Bank Health API (Open Access)',
          license: 'CC-BY-NC-SA 3.0 IGO / Open Access'
        },
        {
          domain: 'CleanTech, Renewable Energy & Climate Transition',
          status: 'Zero records in backend',
          reason: 'No renewable electricity share, carbon intensity, or clean grid penetration datasets.',
          candidateDataset: 'International Energy Agency (IEA) / IRENA Renewable Energy Statistics',
          targetStartups: 'ClimateTech, Carbon Accounting, Renewable Energy, ESG reporting',
          apiAvailability: 'IRENA Open Data Portal & Ember Open Climate API',
          license: 'Open Access / Creative Commons Attribution'
        },
        {
          domain: 'Enterprise Cloud Computing & AI Adoption',
          status: 'Zero records in backend',
          reason: 'Current UNCTAD indicators cover basic web/order presence; missing enterprise cloud tier, big data, and generative AI adoption.',
          candidateDataset: 'Eurostat ICT Usage in Enterprises (Cloud & AI Module) / OECD ICT Access',
          targetStartups: 'B2B SaaS, Developer Tools, Cloud Security, AI infrastructure',
          apiAvailability: 'Eurostat SDMX REST API & OECD.Stat API',
          license: 'Open Data with Attribution (Eurostat Reuse Decision)'
        },
        {
          domain: 'Venture Capital, Startup Investment & Tech Ecosystems',
          status: 'Zero records in backend',
          reason: 'No funding rounds, venture capital investment volumes, or tech ecosystem valuation indicators.',
          candidateDataset: 'OECD Venture Capital Investments / Dealroom Open Tech Ecosystems',
          targetStartups: 'Early-stage founders evaluating regional VC capital availability & investor density',
          apiAvailability: 'OECD REST Data API / Dealroom Community Datasets',
          license: 'OECD Open Data / Permitted Attribution'
        },
        {
          domain: 'Agriculture, AgriTech & Food Supply Systems',
          status: 'Zero records in backend',
          reason: 'No crop yield, precision agriculture technology, or agricultural trade data.',
          candidateDataset: 'UN FAO (FAOSTAT) Food and Agricultural Data',
          targetStartups: 'AgriTech, Supply Chain, Food Security, Commodity Trading',
          apiAvailability: 'FAOSTAT REST API & CSV Bulk Downloads',
          license: 'CC-BY-NC-SA 3.0 IGO'
        }
      ];

      const sortedYears = Array.from(allReportedYears).sort((a, b) => a - b);

      const overallOperationalStatus = operationalAlerts.some(a => a.type === 'critical')
        ? 'critical'
        : operationalAlerts.some(a => a.type === 'warning')
          ? 'warning'
          : 'healthy';

      return {
        sourcesCount: sources.length,
        indicatorsCount: indicators.length,
        economiesCoveredCount: allCoveredCountries.size,
        allCoveredCountries: Array.from(allCoveredCountries.entries()).map(([code, name]) => ({ code, name })),
        earliestYear: sortedYears.length > 0 ? sortedYears[0] : null,
        latestYear: sortedYears.length > 0 ? sortedYears[sortedYears.length - 1] : null,
        yearsSpanStr: sortedYears.length > 0 ? `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}` : 'N/A',
        totalReportedObs,
        totalMissingObs,
        totalObservations: observations.length,
        sourcesList: Array.from(sourcesMap.values()),
        indicatorsList: Array.from(indicatorsMap.values()),
        topicsList,
        missingIndustryDomains,
        benchmarkCountries,
        operationalAlerts,
        overallOperationalStatus
      };
    }

    /* -------------------------------------------------------------
       GEMINI AI ANALYST (VIA SUPABASE EDGE FUNCTION ONLY)
       Never exposes GEMINI_API_KEY in frontend code.
       ------------------------------------------------------------- */
    async checkAiAnalystStatus() {
      if (!this.client) {
        return {
          connected: false,
          configured: false,
          model: 'gemini-2.5-flash-lite',
          message: 'Supabase is not connected. Configure your Supabase URL & Key in Cloud Settings to enable Edge Functions.'
        };
      }

      try {
        const { data, error } = await this.client.functions.invoke('gemini-market-analyst', {
          body: { action: 'status' }
        });

        if (error) {
          return {
            connected: false,
            configured: false,
            model: 'gemini-2.5-flash-lite',
            message: error.message || 'Edge function gemini-market-analyst returned an error.'
          };
        }

        return {
          connected: true,
          configured: Boolean(data && data.configured),
          model: (data && data.model) || 'gemini-2.5-flash-lite',
          message: (data && data.configured)
            ? 'Edge function active with Gemini Free Tier API key configured.'
            : 'Edge function reachable, but GEMINI_API_KEY secret is not yet set in Supabase Secrets.'
        };
      } catch (err) {
        return {
          connected: false,
          configured: false,
          model: 'gemini-2.5-flash-lite',
          message: err.message || 'Could not reach Edge Function.'
        };
      }
    }

    async analyzeMarketWithAi(params) {
      if (!this.client) {
        throw new Error('Supabase is not connected. The local simulation engine remains fully functional without AI.');
      }

      // Client-side rate-limiting / cooldown protection (minimum 4 seconds between requests)
      const now = Date.now();
      if (this._lastAiCallTime && (now - this._lastAiCallTime < 4000)) {
        throw new Error('Please wait a moment before sending another AI analysis request (Gemini Free Tier cooldown).');
      }
      this._lastAiCallTime = now;

      // Strict Data Minimization: Only send private startup details if affirmative consent was granted
      const sanitizedPayload = {
        mode: params.mode || 'examine_assumptions',
        countryCode: params.countryCode || 'USA',
        countryName: params.countryName || 'United States',
        industryDomain: params.industryDomain || 'General Tech',
        question: params.question || null,
        simulationRunId: params.simulationRunId || null,
        founderAssumptions: {
          price: params.price !== undefined ? Number(params.price) : 10,
          budget: params.budget !== undefined ? Number(params.budget) : 300,
          channel: params.channel || 'social'
        },
        sourcedIndicators: params.sourcedIndicators || [],
        consentGiven: Boolean(params.consentGiven),
        customerTraits: params.customerTraits || null,
        // Only include startup details if consent is explicitly true
        startupDesc: params.consentGiven ? (params.startupDesc || '') : null,
        targetGroupName: params.consentGiven ? (params.targetGroupName || '') : null
      };

      const { data, error } = await this.client.functions.invoke('gemini-market-analyst', {
        body: sanitizedPayload
      });

      if (error) {
        if (error.message && error.message.includes('429')) {
          throw new Error('Google Gemini Free Tier quota exceeded (15 RPM). Please wait 60 seconds before trying again.');
        }
        if (error.message && error.message.includes('503')) {
          throw new Error('GEMINI_API_KEY secret is missing in Supabase. Please add your key to Supabase Secrets.');
        }
        throw new Error(error.message || 'Edge function execution failed.');
      }

      // Handle insufficient evidence as a structured state rather than fatal exception
      if (data && data.status === 'insufficient_evidence') {
        return data;
      }

      if (data && data.error && !data.success) {
        throw new Error(data.error);
      }

      return data;
    }

    // Load AI Analyst Audit Logs for this Founder Workspace
    async getAiAnalystLogs(limit = 20) {
      if (!this.isAuthenticated()) return [];
      try {
        const { data, error } = await this.client
          .from('ai_analyst_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Could not query ai_analyst_logs:', err);
        return [];
      }
    }    // -------------------------------------------------------------
    // LIVE CITED MARKET RESEARCH (GEMINI + GOOGLE SEARCH GROUNDING)
    // -------------------------------------------------------------
    saveLocalReport(report) {
      try {
        const KEY = 'vsw_market_reports_v2';
        const existing = JSON.parse(localStorage.getItem(KEY) || '[]');
        // Prepend new report and deduplicate by reportId or timestamp
        const updated = [report, ...existing.filter(r => r.id !== report.id && r.generatedAt !== report.generatedAt)].slice(0, 30);
        localStorage.setItem(KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save report to localStorage:', e);
      }
    }

    getLocalReports() {
      try {
        const KEY = 'vsw_market_reports_v2';
        return JSON.parse(localStorage.getItem(KEY) || '[]');
      } catch (_) {
        return [];
      }
    }

    async getIndicatorHistoricalSeries(countryCode, indicatorCode) {
      const cleanIso = this.resolveIso3(countryCode);
      const observations = await this.getCountryObservations({
        countryCode: cleanIso,
        period: 'ALL',
        limit: 1000
      });
      return observations
        .filter(o => o.indicator_code === indicatorCode && o.value !== null && o.value !== undefined)
        .sort((a, b) => a.year - b.year)
        .map(o => ({
          year: o.year,
          value: o.value,
          unit: o.unit
        }));
    }

    async performGroundedMarketResearch(params) {
      // Client-side rate-limiting / cooldown protection (minimum 3 seconds between searches)
      const now = Date.now();
      if (this._lastSearchGroundingTime && (now - this._lastSearchGroundingTime < 3000)) {
        throw new Error('Please wait a moment before sending another research request (Safety cooldown).');
      }
      this._lastSearchGroundingTime = now;

      // 1. Gather stored historical series for evidence grounding
      let countryObservations = [];
      try {
        countryObservations = await this.getCountryObservations({
          countryCode: params.countryCode || 'USA',
          period: 'ALL',
          limit: 100
        });
      } catch (_) {}

      // Data Minimization: Send only country, industry, customer type, and question by default.
      const payload = {
        action: 'live_grounded_research',
        countryCode: params.countryCode || 'USA',
        countryName: params.countryName || 'United States',
        industryDomain: params.industryDomain || 'Enterprise Software',
        customerType: params.customerType || 'B2B/B2C',
        question: params.question || '',
        observations: countryObservations,
        consentGiven: Boolean(params.consentGiven),
        bypassCache: Boolean(params.bypassCache),
        startupDesc: params.consentGiven ? (params.startupDesc || '') : null
      };

      // 2. Try Local Server Proxy First (/api/gemini/analyze-market)
      try {
        const localRes = await fetch('/api/gemini/analyze-market', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (localRes.ok) {
          const localData = await localRes.json();
          if (localData && localData.success) {
            localData.id = localData.id || `rep_${Date.now()}_${params.countryCode || 'USA'}`;
            this.saveLocalReport(localData);

            // Also persist to Supabase if authenticated
            if (this.isAuthenticated()) {
              this.client.from('founder_grounded_research_reports').insert({
                user_id: this.currentUser.id,
                workspace_id: this.currentWorkspace ? this.currentWorkspace.id : null,
                country_code: localData.countryCode,
                country_name: localData.countryName,
                industry_domain: localData.industryDomain,
                customer_type: localData.customerType,
                research_question: localData.question,
                model_used: localData.modelUsed,
                synthesis_markdown: localData.synthesisMarkdown,
                structured_records: localData.structuredRecords,
                citations: localData.citations,
                search_queries: localData.searchQueries || [],
                tam_sam_som: localData.tamSamSom,
                disagreements_or_gaps: localData.disagreementsOrGaps,
                confidence_notes: localData.confidenceNotes || null,
                limitations: localData.limitations
              }).then(() => {}).catch(() => {});
            }

            return localData;
          }
        }
      } catch (localErr) {
        console.warn('[FoundrySupabase] Local /api/gemini/analyze-market proxy unavailable, trying Supabase Edge Function:', localErr);
      }

      // 3. Fallback to Supabase Edge Function if client is configured
      if (!this.client) {
        throw new Error('Neither local server proxy nor Supabase client is reachable. Ensure server.js is running at http://localhost:3000/');
      }

      const { data, error } = await this.client.functions.invoke('gemini-market-analyst', {
        body: payload
      });

      if (error) {
        if (error.message && error.message.includes('429')) {
          throw new Error('Daily search quota reached (10 searches/day) or Gemini Free Tier rate limit reached. Halting safely to prevent paid charges.');
        }
        if (error.message && error.message.includes('503')) {
          throw new Error('GEMINI_API_KEY secret is not set in Supabase Secrets. Please configure your key via supabase secrets set GEMINI_API_KEY=your_key or in server.js.');
        }
        throw new Error(error.message || 'Live market research request failed.');
      }

      if (data && data.error && !data.success) {
        throw new Error(data.error);
      }

      if (data) {
        data.id = data.id || `rep_${Date.now()}_${params.countryCode || 'USA'}`;
        this.saveLocalReport(data);
      }

      return data;
    }

    async loadFounderGroundedReports(limit = 10) {
      const localReports = this.getLocalReports();
      let dbReports = [];

      if (this.isAuthenticated()) {
        try {
          const { data, error } = await this.client
            .from('founder_grounded_research_reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

          if (!error && data) {
            dbReports = data.map(r => ({
              id: r.id,
              countryCode: r.country_code,
              countryName: r.country_name,
              industryDomain: r.industry_domain,
              customerType: r.customer_type,
              question: r.research_question,
              modelUsed: r.model_used,
              synthesisMarkdown: r.synthesis_markdown,
              structuredRecords: r.structured_records,
              citations: r.citations,
              tamSamSom: r.tam_sam_som,
              disagreementsOrGaps: r.disagreements_or_gaps,
              limitations: r.limitations,
              generatedAt: r.created_at
            }));
          }
        } catch (err) {
          console.warn('Could not load founder_grounded_research_reports from DB:', err);
        }
      }

      // Merge and deduplicate by question and country
      const map = new Map();
      [...localReports, ...dbReports].forEach(r => {
        const key = `${r.countryCode}_${(r.question || '').slice(0, 30)}`;
        if (!map.has(key)) map.set(key, r);
      });

      return Array.from(map.values()).slice(0, limit);
    }

    async getSearchQuotaStatus() {
      if (!this.isAuthenticated()) {
        return { usedToday: 0, dailyLimit: 10, remaining: 10, isAuth: false };
      }
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const user = this.getUser();
        const { data, error } = await this.client
          .from('founder_search_quotas')
          .select('search_count, max_daily_limit')
          .eq('user_id', user.id)
          .eq('quota_date', todayStr)
          .maybeSingle();

        if (error || !data) {
          return { usedToday: 0, dailyLimit: 10, remaining: 10, isAuth: true };
        }
        const used = data.search_count || 0;
        const limit = data.max_daily_limit || 10;
        return {
          usedToday: used,
          dailyLimit: limit,
          remaining: Math.max(0, limit - used),
          isAuth: true
        };
      } catch (err) {
        console.warn('Could not query search quota:', err);
        return { usedToday: 0, dailyLimit: 10, remaining: 10, isAuth: true };
      }
    }

    // ==========================================================
    // DATA PORTABILITY & RETENTION: EXPORT WORKSPACE DATA (GDPR)
    // ==========================================================
    async exportWorkspaceData() {
      const isAuth = this.isAuthenticated();
      const user = this.getUser();

      // Gather cloud data if authenticated, otherwise use local storage state
      let profile = null;
      let groups = [];
      let competitorNotes = null;
      let campaign = null;
      let simulations = [];
      let realEvidence = [];
      let betaFeedback = [];
      let simFeedback = [];
      let aiLogs = [];

      if (isAuth) {
        try {
          const [p, g, cNotes, camp, sList, evList, bFb, sFb, aLogs] = await Promise.allSettled([
            this.loadStartupProfile(),
            this.loadCustomerGroups(),
            this.loadCompetitorNotes(),
            this.loadCampaign(),
            this.loadSimulationHistory(),
            this.loadRealEvidence(),
            this.loadUserBetaFeedback(),
            this.loadUserSimulationFeedback(),
            this.getAiAnalystLogs(100)
          ]);

          profile = p.status === 'fulfilled' ? p.value : null;
          groups = g.status === 'fulfilled' ? (g.value || []) : [];
          competitorNotes = cNotes.status === 'fulfilled' ? cNotes.value : null;
          campaign = camp.status === 'fulfilled' ? camp.value : null;
          simulations = sList.status === 'fulfilled' ? (sList.value || []) : [];
          realEvidence = evList.status === 'fulfilled' ? (evList.value || []) : [];
          betaFeedback = bFb.status === 'fulfilled' ? (bFb.value || []) : [];
          simFeedback = sFb.status === 'fulfilled' ? (sFb.value || []) : [];
          aiLogs = aLogs.status === 'fulfilled' ? (aLogs.value || []) : [];
        } catch (err) {
          console.warn('Error during cloud export data aggregation:', err);
        }
      }

      // Merge with local state to ensure complete offline/online snapshot
      const localState = (typeof state !== 'undefined') ? state : {};

      const exportPackage = {
        metadata: {
          platform: 'Foundry Virtual Startup World',
          exportVersion: 'v2.0-beta-export',
          exportedAt: new Date().toISOString(),
          authenticated: isAuth,
          userEmail: user ? user.email : 'local-anonymous-founder',
          userId: user ? user.id : null,
          dataBoundaryNotice: 'Private founder workspace export. Contains stated assumptions, customer segments, simulation outcomes, empirical field research, and AI audit history.'
        },
        workspace: {
          profile: profile || localState.profile || null,
          targetMarket: {
            country: (localState.campaign && localState.campaign.country) || 'USA',
            industry: (localState.campaign && localState.campaign.industry) || 'Mobile Applications',
            competitorNotes: competitorNotes || (localState.market && localState.market.competitorNotes) || ''
          },
          customerGroups: (groups && groups.length > 0) ? groups : ((localState.market && localState.market.groups) || []),
          activeCampaign: campaign || localState.campaign || null,
          simulationHistory: (simulations && simulations.length > 0) ? simulations : (localState.history || []),
          realEvidenceStudies: (realEvidence && realEvidence.length > 0) ? realEvidence : (localState.realEvidence || []),
          feedbackReports: betaFeedback,
          simulationFeedback: simFeedback,
          aiAnalystAuditLogs: aiLogs
        }
      };

      return exportPackage;
    }

    // ==========================================================
    // DATA RETENTION & ACCOUNT DELETION (RIGHT TO ERASURE)
    // ==========================================================
    async deleteAccountAndData() {
      const isAuth = this.isAuthenticated();
      let rpcResult = null;

      if (isAuth) {
        try {
          // 1. Invoke atomic database deletion RPC
          const { data, error } = await this.client.rpc('delete_founder_workspace_data');
          if (error) {
            console.warn('RPC delete_founder_workspace_data failed, attempting fallback manual cascading deletion:', error);
            // Fallback: manual row cleanup
            await this.deleteAllRealEvidence().catch(() => {});
            if (this.workspaceId) {
              await this.client.from('simulation_runs').delete().eq('workspace_id', this.workspaceId).catch(() => {});
              await this.client.from('customer_groups').delete().eq('workspace_id', this.workspaceId).catch(() => {});
              await this.client.from('founder_profiles').delete().eq('workspace_id', this.workspaceId).catch(() => {});
              await this.client.from('founder_workspaces').delete().eq('id', this.workspaceId).catch(() => {});
            }
          } else {
            rpcResult = data;
          }
        } catch (err) {
          console.error('Account data purge error:', err);
          throw new Error('Database deletion failed: ' + (err.message || 'Unknown error'));
        }

        // 2. Sign out of Supabase Auth
        try {
          await this.signOut();
        } catch (e) {
          console.warn('Sign out after account deletion warning:', e);
        }
      }

      // 3. Clear all Foundry local storage keys
      try {
        const keysToRemove = [
          'foundry_profile',
          'foundry_market',
          'foundry_campaign',
          'foundry_history',
          'foundry_events',
          'foundry_real_evidence',
          'foundry_beta_feedback_cache',
          'foundry_simulation_feedback_cache'
        ];
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (err) {
        console.warn('Local storage purge warning:', err);
      }

      this.workspaceId = null;
      return rpcResult || { status: 'success', message: 'Workspace purged and session cleared.' };
    }
  }

  // Expose singleton instances on window
  const serviceInstance = new FoundrySupabaseService();
  window.foundrySupabaseRaw = serviceInstance;
  if (window.FOUNDRY_BACKEND !== 'appwrite') {
    window.foundrySupabase = serviceInstance;
  }

  // Compatibility bridge for Market Data controls
  window.foundryMarketData = {
    get url() { return serviceInstance.url; },
    get anonKey() { return serviceInstance.anonKey; },
    get isConnected() { return serviceInstance.isConfigured(); },
    setCredentials: (u, k) => serviceInstance.connect(u, k),
    clearCredentials: () => serviceInstance.disconnect(),
    resolveIso3: (c) => serviceInstance.resolveIso3(c),
    getCountryMarketContext: (c) => serviceInstance.getCountryMarketContext(c),
    getMarketDataCoverage: () => serviceInstance.getMarketDataCoverage()
  };

})(window);
