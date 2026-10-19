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
            } else {
              this.currentWorkspace = null;
            }
            this.notifyAuthListeners(event, session);
          });

          // Check initial session
          this.client.auth.getSession().then(({ data }) => {
            if (data && data.session) {
              this.currentUser = data.session.user;
              this.ensureWorkspace();
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
      localStorage.removeItem(KEY_URL);
      localStorage.removeItem(KEY_ANON);
      this.notifyAuthListeners('SIGNED_OUT', null);
    }

    isConfigured() {
      return Boolean(this.client && this.url && this.anonKey);
    }

    isAuthenticated() {
      return Boolean(this.currentUser && this.client);
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

    /* -------------------------------------------------------------
       AUTH ACTIONS (SIGN UP, SIGN IN, SIGN OUT)
       ------------------------------------------------------------- */
    async signUp(email, password) {
      if (!this.client) throw new Error('Supabase client not configured.');
      const { data, error } = await this.client.auth.signUp({
        email: email.trim(),
        password: password
      });
      if (error) throw error;
      if (data && data.user) {
        this.currentUser = data.user;
        await this.ensureWorkspace();
      }
      return data;
    }

    async signIn(email, password) {
      if (!this.client) throw new Error('Supabase client not configured.');
      const { data, error } = await this.client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });
      if (error) throw error;
      if (data && data.user) {
        this.currentUser = data.user;
        await this.ensureWorkspace();
      }
      return data;
    }

    async signOut() {
      if (!this.client) return;
      const { error } = await this.client.auth.signOut();
      this.currentUser = null;
      this.currentWorkspace = null;
      if (error) throw error;
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
          budget: run.budget
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

    async getCountryObservations({ countryCode, topic, year, limit = 200 } = {}) {
      if (!this.client) return [];

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
          imported_at,
          metadata,
          market_indicators (name, topic, limitations, definition)
        `)
        .order('year', { ascending: false })
        .limit(limit);

      if (countryCode && countryCode !== 'ALL') {
        query = query.eq('country_code', countryCode.toUpperCase());
      }

      if (year && year !== 'ALL') {
        query = query.eq('year', parseInt(year, 10));
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[FoundrySupabase] getCountryObservations:', error.message);
        return [];
      }

      if (!data) return [];

      if (topic && topic !== 'ALL') {
        return data.filter(row => row.market_indicators && row.market_indicators.topic === topic);
      }

      return data;
    }

    async getAvailableCountries() {
      if (!this.client) return [];
      const { data, error } = await this.client
        .from('country_observations')
        .select('country_code, country_name')
        .limit(1000);

      if (error || !data) return [];

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

    async getCountryMarketContext(countryCode = 'USA') {
      if (!this.client) return { data: [], error: new Error('Supabase client not configured') };
      const cleanIso = this.resolveIso3(countryCode);
      const { data, error } = await this.client
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
        .eq('country_code', cleanIso)
        .order('year', { ascending: false });

      return { data: data || [], error };
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
      if (!this.client) {
        return {
          connected: false,
          sources: [],
          indicators: [],
          observations: [],
          importLogs: [],
          summary: null
        };
      }

      try {
        // 1. Fetch sources
        const { data: sources, error: errSources } = await this.client
          .from('market_data_sources')
          .select('*')
          .order('id');

        if (errSources) {
          console.warn('[FoundrySupabase] getMarketDataCoverage: errSources', errSources);
        }

        // 2. Fetch indicators
        const { data: indicators, error: errIndicators } = await this.client
          .from('market_indicators')
          .select('*')
          .order('topic');

        if (errIndicators) {
          console.warn('[FoundrySupabase] getMarketDataCoverage: errIndicators', errIndicators);
        }

        // 3. Fetch import logs (latest per source)
        let importLogs = [];
        try {
          const { data: logs, error: errLogs } = await this.client
            .from('market_import_logs')
            .select('*')
            .order('started_at', { ascending: false })
            .limit(100);
          if (!errLogs && logs) importLogs = logs;
        } catch (e) {
          console.warn('[FoundrySupabase] getMarketDataCoverage: errLogs', e);
        }

        // 4. Fetch all observations in chunks
        let observations = [];
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

        const summary = this.computeCoverageMetrics(sources || [], indicators || [], observations, importLogs);

        return {
          connected: true,
          sources: sources || [],
          indicators: indicators || [],
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
  }

  // Expose singleton instances on window
  const serviceInstance = new FoundrySupabaseService();
  window.foundrySupabase = serviceInstance;

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
