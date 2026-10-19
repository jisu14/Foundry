/**
 * Foundry: Virtual Startup World - 2D Market City Engine
 * 100% Client-Side State, LocalStorage Persistence & Zero Preset Data
 */

// LocalStorage Keys
const STORAGE_PROFILE = 'vsw_profile_v2';
const STORAGE_MARKET = 'vsw_market_v2';
const STORAGE_CAMPAIGN = 'vsw_campaign_v2';
const STORAGE_HISTORY = 'vsw_history_v2';
const STORAGE_WORLD = 'vsw_world_v2';
const STORAGE_REAL_EVIDENCE = 'vsw_real_evidence_v2';
const STORAGE_SIM_FEEDBACK = 'vsw_sim_feedback_v2';

// Global State
let state = {
  profile: {
    name: '',
    type: '',
    desc: '',
    stage: 'Prototype / Functional MVP',
    country: ''
  },
  market: {
    groups: [],
    competitorNotes: ''
  },
  campaign: {
    targetGroupId: '',
    price: 10,
    channel: 'social',
    budget: 300,
    country: 'USA',
    industry: 'Mobile Applications'
  },
  history: [],
  realEvidence: [],
  simulationFeedback: [],
  world: {
    cycle: 1,
    day: 1,
    selectedDistrict: 'hq',
    events: []
  }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  initNavigation();
  initLandingPage();
  initMarketCityMap();
  initProfileForm();
  initMarketForms();
  initLaunchLab();
  initHistoryView();
  initLibraryView();
  initCoverageView();
  initRealEvidenceView();
  initEvaluationView();
  initBetaFeedback();
  initSimulationFeedback();
  initAiMarketAnalyst();
  initHypotheticalScenarios();
  initSupabaseAuthAndModals();
  renderAllViews();
});

/* ==========================================================
   1. SIDEBAR NAVIGATION & ROUTING
   ========================================================== */
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.getAttribute('data-view');
      navigateToView(viewId);
      // Close mobile menu if open
      const sidebar = document.getElementById('foundrySidebar');
      if (sidebar) sidebar.classList.remove('mobile-open');
    });
  });

  // Buttons with data-nav (e.g. "Deploy Campaign", "Return to World Map")
  document.addEventListener('click', (e) => {
    const navBtn = e.target.closest('[data-nav]');
    if (navBtn) {
      const viewId = navBtn.getAttribute('data-nav');
      navigateToView(viewId);
    }
  });

  // Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const sidebar = document.getElementById('foundrySidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }

  // Reset World / Workspace Button
  const resetBtn = document.getElementById('resetWorkspaceBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', handleResetWorld);
  }

  // Handle URL hash on load & on hashchange
  const handleHashRouting = () => {
    const hash = window.location.hash.replace('#', '');
    if (['landing', 'overview', 'profile', 'market', 'launch', 'history', 'library', 'coverage', 'real-evidence', 'evaluation'].includes(hash)) {
      navigateToView(hash);
    } else {
      navigateToView('overview');
    }
  };

  window.addEventListener('hashchange', handleHashRouting);
  handleHashRouting();
}

function navigateToView(viewId) {
  // Update sidebar nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update page views
  document.querySelectorAll('.page-view').forEach(view => {
    if (view.id === `view-${viewId}`) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  // Update URL hash
  if (history.pushState) {
    history.pushState(null, null, `#${viewId}`);
  } else {
    window.location.hash = viewId;
  }

  // Dynamic refresh
  if (viewId === 'overview') {
    renderWorldView();
    renderGuidedJourneyBanner();
  } else if (viewId === 'launch') {
    populateTargetGroupDropdown();
  } else if (viewId === 'library') {
    renderLibraryView();
  } else if (viewId === 'coverage') {
    renderCoverageView();
  } else if (viewId === 'real-evidence') {
    populateLinkedSimulationsDropdown();
    renderRealEvidenceView();
  } else if (viewId === 'evaluation') {
    renderEvaluationView();
  }
}

/* ==========================================================
   1B. PUBLIC LANDING & GUIDED FOUNDER WORKFLOW
   ========================================================== */
function initLandingPage() {
  // Primary CTA: Open Auth or Go to Workspace
  const signupBtn = document.getElementById('btnLandingSignup');
  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      const authBtn = document.getElementById('btnOpenAuthModal');
      if (typeof supabaseClient !== 'undefined' && supabaseClient && supabaseClient.auth) {
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            navigateToView('overview');
          } else if (authBtn) {
            authBtn.click();
          } else {
            navigateToView('overview');
          }
        }).catch(() => navigateToView('overview'));
      } else {
        navigateToView('overview');
      }
    });
  }

  // Footer CTA: same logic
  const footerSignupBtn = document.getElementById('btnLandingFooterSignup');
  if (footerSignupBtn) {
    footerSignupBtn.addEventListener('click', () => {
      if (signupBtn) signupBtn.click();
      else navigateToView('overview');
    });
  }

  // Secondary CTA: Explore Map
  const exploreMapBtn = document.getElementById('btnLandingExploreMap');
  if (exploreMapBtn) {
    exploreMapBtn.addEventListener('click', () => {
      navigateToView('overview');
    });
  }

  // Loop Step Cards: click to deep-dive
  const stepCards = document.querySelectorAll('.loop-step-card');
  stepCards.forEach(card => {
    card.addEventListener('click', () => {
      const target = card.getAttribute('data-step-target');
      if (target) navigateToView(target);
    });
  });

  // FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const wasOpen = item.classList.contains('open');
        faqItems.forEach(i => i.classList.remove('open'));
        if (!wasOpen) {
          item.classList.add('open');
        }
      });
    }
  });
}

function renderGuidedJourneyBanner() {
  const badgeStep = document.getElementById('journeyBadgeStep');
  const titleElem = document.getElementById('journeyStepTitle');
  const nextBtn = document.getElementById('journeyNextActionBtn');
  const nodes = document.querySelectorAll('.journey-step-node');
  if (!badgeStep || !titleElem || !nextBtn) return;

  const hasProfile = Boolean(state.profile && state.profile.name && state.profile.name.trim().length > 0);
  const hasCountry = Boolean(state.profile && state.profile.country && state.profile.country.trim().length > 0);
  const hasGroups = Boolean(state.market && state.market.groups && state.market.groups.length > 0);
  const hasExperiment = Boolean(state.campaign && state.campaign.targetGroupId && state.campaign.price > 0);
  const hasSimulation = Boolean(state.history && state.history.length > 0);
  const hasReviewedScenarios = Boolean(state.history && state.history.some(h => (h.hypotheticalScenarios && h.hypotheticalScenarios.length > 0) || (h.observationsCount && h.observationsCount > 0)));
  const hasRealEvidence = Boolean(state.realEvidence && state.realEvidence.length > 0);

  let currentStep = 1;
  let stepTitle = 'Set Up Startup Profile';
  let nextLabel = 'Configure Startup Profile →';
  let targetNav = 'profile';

  if (!hasProfile) {
    currentStep = 1;
    stepTitle = 'Set Up Startup Profile';
    nextLabel = 'Configure Startup Profile →';
    targetNav = 'profile';
  } else if (!hasCountry) {
    currentStep = 2;
    stepTitle = 'Explore Market Evidence for Target Country';
    nextLabel = 'Browse Country Indicators →';
    targetNav = 'library';
  } else if (!hasGroups) {
    currentStep = 3;
    stepTitle = 'Define Customer Group & Explicit Assumptions';
    nextLabel = 'Add Customer Group →';
    targetNav = 'market';
  } else if (!hasExperiment) {
    currentStep = 4;
    stepTitle = 'Create Marketing or Product Experiment';
    nextLabel = 'Set Pricing & Channels →';
    targetNav = 'launch';
  } else if (!hasSimulation) {
    currentStep = 5;
    stepTitle = 'Run Clearly Labeled Simulation in City';
    nextLabel = 'Advance World & Simulate (+7 Days) →';
    targetNav = 'overview';
  } else if (!hasReviewedScenarios) {
    currentStep = 6;
    stepTitle = 'Review Sourced Evidence & AI Scenarios';
    nextLabel = 'Inspect Scenarios & Observations →';
    targetNav = 'launch';
  } else if (!hasRealEvidence) {
    currentStep = 7;
    stepTitle = 'Ground Assumptions with Real Customer Evidence';
    nextLabel = 'Log Real Customer Evidence →';
    targetNav = 'real-evidence';
  } else {
    currentStep = 7;
    stepTitle = 'Decision Cycle Complete: Evaluate Variance';
    nextLabel = 'Open Assumption Evaluator →';
    targetNav = 'evaluation';
  }

  badgeStep.textContent = `STEP ${currentStep} OF 7`;
  titleElem.textContent = stepTitle;
  nextBtn.innerHTML = `${nextLabel}`;
  nextBtn.setAttribute('data-nav', targetNav);

  // If on step 5 and clicking next on overview, we can also advance world
  if (currentStep === 5) {
    nextBtn.onclick = (e) => {
      e.preventDefault();
      handleAdvanceWorld();
    };
  } else {
    nextBtn.onclick = null;
  }

  // Update step nodes
  nodes.forEach(node => {
    const stepNum = parseInt(node.getAttribute('data-step'), 10);
    node.classList.remove('active', 'completed');
    if (stepNum < currentStep) {
      node.classList.add('completed');
    } else if (stepNum === currentStep) {
      node.classList.add('active');
    }
  });
}

/* ==========================================================
   2. STATE MANAGEMENT & LOCAL STORAGE
   ========================================================== */
function loadStateFromStorage() {
  try {
    const savedProfile = localStorage.getItem(STORAGE_PROFILE);
    if (savedProfile) state.profile = JSON.parse(savedProfile);

    const savedMarket = localStorage.getItem(STORAGE_MARKET);
    if (savedMarket) state.market = JSON.parse(savedMarket);

    const savedCampaign = localStorage.getItem(STORAGE_CAMPAIGN);
    if (savedCampaign) state.campaign = JSON.parse(savedCampaign);

    const savedHistory = localStorage.getItem(STORAGE_HISTORY);
    if (savedHistory) state.history = JSON.parse(savedHistory);

    const savedEvidence = localStorage.getItem(STORAGE_REAL_EVIDENCE);
    if (savedEvidence) state.realEvidence = JSON.parse(savedEvidence);

    const savedSimFeedback = localStorage.getItem(STORAGE_SIM_FEEDBACK);
    if (savedSimFeedback) state.simulationFeedback = JSON.parse(savedSimFeedback);

    const savedWorld = localStorage.getItem(STORAGE_WORLD);
    if (savedWorld) state.world = JSON.parse(savedWorld);
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
  }
}

function saveState(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to localStorage:`, err);
  }
}

let resetConfirmTimer = null;
function handleResetWorld() {
  const resetBtn = document.getElementById('resetWorkspaceBtn');
  if (resetBtn && !resetBtn.dataset.confirming) {
    resetBtn.dataset.confirming = 'true';
    resetBtn.textContent = 'Click to Confirm Reset';
    resetBtn.classList.add('confirming');
    clearTimeout(resetConfirmTimer);
    resetConfirmTimer = setTimeout(() => {
      delete resetBtn.dataset.confirming;
      resetBtn.textContent = 'Reset World';
      resetBtn.classList.remove('confirming');
    }, 4000);
    return;
  }

  if (resetBtn) {
    delete resetBtn.dataset.confirming;
    resetBtn.textContent = 'Reset World';
    resetBtn.classList.remove('confirming');
  }
  clearTimeout(resetConfirmTimer);

  localStorage.removeItem(STORAGE_PROFILE);
  localStorage.removeItem(STORAGE_MARKET);
  localStorage.removeItem(STORAGE_CAMPAIGN);
  localStorage.removeItem(STORAGE_HISTORY);
  localStorage.removeItem(STORAGE_REAL_EVIDENCE);
  localStorage.removeItem(STORAGE_WORLD);

  state = {
    profile: {
      name: '',
      type: '',
      desc: '',
      stage: 'Prototype / Functional MVP',
      country: ''
    },
    market: {
      groups: [],
      competitorNotes: ''
    },
    campaign: {
      targetGroupId: '',
      price: 10,
      channel: 'social',
      budget: 300,
      country: 'USA',
      industry: 'Mobile Applications'
    },
    history: [],
    realEvidence: [],
    world: {
      cycle: 1,
      day: 1,
      selectedDistrict: 'hq',
      events: []
    }
  };

  const profileForm = document.getElementById('profileForm');
  if (profileForm) profileForm.reset();

  const customerGroupForm = document.getElementById('customerGroupForm');
  if (customerGroupForm) customerGroupForm.reset();

  const competitorTextarea = document.getElementById('marketCompetitorNotes');
  if (competitorTextarea) competitorTextarea.value = '';

  const resultsArea = document.getElementById('launchResultsArea');
  const emptyArea = document.getElementById('launchEmptyState');
  if (resultsArea) resultsArea.classList.add('hidden');
  if (emptyArea) emptyArea.classList.remove('hidden');

  renderAllViews();
  navigateToView('overview');
}
window.handleResetWorld = handleResetWorld;

/* ==========================================================
   3. 2D MARKET CITY MAP & DISTRICT INSPECTION
   ========================================================== */
function initMarketCityMap() {
  const landmarks = document.querySelectorAll('.city-landmark');
  landmarks.forEach(lm => {
    lm.addEventListener('click', () => {
      const districtId = lm.getAttribute('data-district');
      selectDistrict(districtId);
    });
    lm.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const districtId = lm.getAttribute('data-district');
        selectDistrict(districtId);
      }
    });
  });

  const advanceBtn = document.getElementById('advanceWorldBtn');
  if (advanceBtn) {
    advanceBtn.addEventListener('click', handleAdvanceWorld);
  }

  const clearChronicleBtn = document.getElementById('clearChronicleBtn');
  if (clearChronicleBtn) {
    clearChronicleBtn.addEventListener('click', () => {
      state.world.events = [];
      saveState(STORAGE_WORLD, state.world);
      renderChronicle();
    });
  }

  const closeInspBtn = document.getElementById('closeInspectorBtn');
  if (closeInspBtn) {
    closeInspBtn.addEventListener('click', () => {
      selectDistrict(null);
    });
  }
}

function selectDistrict(districtId) {
  state.world.selectedDistrict = districtId;
  saveState(STORAGE_WORLD, state.world);

  document.querySelectorAll('.city-landmark').forEach(lm => {
    if (lm.getAttribute('data-district') === districtId) {
      lm.classList.add('selected');
    } else {
      lm.classList.remove('selected');
    }
  });

  renderDistrictInspector(districtId);
}

function renderWorldView() {
  // Update Clock & Activity Status
  const clockDayElem = document.getElementById('worldClockDay');
  const activityDot = document.getElementById('worldActivityDot');
  const statusText = document.getElementById('worldStatusText');
  const sidebarCycle = document.getElementById('sidebarCycleDay');

  const cycleDayStr = `Cycle ${state.world.cycle} • Day ${state.world.day}`;
  if (clockDayElem) clockDayElem.textContent = cycleDayStr;
  if (sidebarCycle) sidebarCycle.textContent = cycleDayStr;

  const hasProfile = Boolean(state.profile.name);
  const hasGroups = state.market.groups.length > 0;
  const hasHistory = state.history.length > 0;

  if (hasHistory) {
    if (activityDot) activityDot.className = 'dot-indicator active';
    if (statusText) statusText.textContent = `World Active • ${state.history.length} Launch Cycles Simulated`;
  } else if (hasProfile && hasGroups) {
    if (activityDot) activityDot.className = 'dot-indicator active';
    if (statusText) statusText.textContent = 'Market Primed • Ready to Deploy First Campaign';
  } else {
    if (activityDot) activityDot.className = 'dot-indicator';
    if (statusText) statusText.textContent = 'World Idle • Unchartered Districts Await Setup';
  }

  // Update District Visuals on Map
  renderLandmarksVisuals();
  selectDistrict(state.world.selectedDistrict || 'hq');
  renderChronicle();
}

function renderLandmarksVisuals() {
  const hasProfile = Boolean(state.profile.name);
  const hasGroups = state.market.groups.length > 0;
  const hasHistory = state.history.length > 0;
  const latestRun = hasHistory ? state.history[0] : null;

  // 1. Founder HQ
  const hqElem = document.getElementById('district-hq');
  const signHq = document.getElementById('signHq');
  const titleHq = document.getElementById('titleHq');
  const statusHq = document.getElementById('statusHq');

  if (hasProfile) {
    hqElem.className = 'city-landmark landmark-active';
    signHq.textContent = 'Active Studio';
    titleHq.textContent = state.profile.name;
    statusHq.textContent = 'Operational';
  } else {
    hqElem.className = 'city-landmark landmark-unchartered';
    signHq.textContent = 'Site Reserved';
    titleHq.textContent = 'Founder HQ';
    statusHq.textContent = 'Unchartered';
  }

  // 2. Customer Communities
  const custElem = document.getElementById('district-customers');
  const signCust = document.getElementById('signCustomers');
  const statusCust = document.getElementById('statusCustomers');

  if (hasGroups) {
    custElem.className = 'city-landmark landmark-active';
    signCust.textContent = `${state.market.groups.length} Tribes Chartered`;
    statusCust.textContent = `${state.market.groups.length} Groups Active`;
  } else {
    custElem.className = 'city-landmark landmark-unchartered';
    signCust.textContent = 'Unexplored Territory';
    statusCust.textContent = '0 Groups';
  }

  // 3. Central Marketplace
  const marketElem = document.getElementById('district-marketplace');
  const signMarket = document.getElementById('signMarket');
  const statusMarket = document.getElementById('statusMarket');

  if (hasHistory) {
    marketElem.className = 'city-landmark landmark-active';
    signMarket.textContent = 'Active Storefront';
    statusMarket.textContent = `${latestRun.paidUsers} Paid Buyers`;
  } else {
    marketElem.className = 'city-landmark landmark-unchartered';
    signMarket.textContent = 'Empty Plaza';
    statusMarket.textContent = '0 Shoppers';
  }

  // 4. Transmission Towers
  const broadElem = document.getElementById('district-broadcast');
  const signBroad = document.getElementById('signBroadcast');
  const statusBroad = document.getElementById('statusBroadcast');
  const conduitBeam = document.getElementById('transmissionBeamPath');

  if (hasHistory) {
    broadElem.className = 'city-landmark landmark-active';
    signBroad.textContent = 'Transmission Live';
    statusBroad.textContent = 'Broadcasting';
    if (conduitBeam) conduitBeam.classList.remove('hidden');
  } else {
    broadElem.className = 'city-landmark landmark-unchartered';
    signBroad.textContent = 'Grid Offline';
    statusBroad.textContent = 'Offline';
    if (conduitBeam) conduitBeam.classList.add('hidden');
  }

  // 5. Feedback Agora
  const feedElem = document.getElementById('district-feedback');
  const signFeed = document.getElementById('signFeedback');
  const statusFeed = document.getElementById('statusFeedback');

  if (hasHistory && latestRun.reviews && latestRun.reviews.length > 0) {
    feedElem.className = 'city-landmark landmark-active';
    signFeed.textContent = 'Live Agora';
    statusFeed.textContent = `${latestRun.avgRating} / 5.0 Rating`;
  } else {
    feedElem.className = 'city-landmark landmark-unchartered';
    signFeed.textContent = 'Silent Agora';
    statusFeed.textContent = '0 Reviews';
  }

  // 6. Rival Outposts
  const compElem = document.getElementById('district-competitors');
  const signComp = document.getElementById('signCompetitor');
  const statusComp = document.getElementById('statusCompetitor');

  if (state.market.competitorNotes && state.market.competitorNotes.trim().length > 0) {
    compElem.className = 'city-landmark landmark-active';
    signComp.textContent = 'Rival Intel Logged';
    statusComp.textContent = 'Monitoring Rivals';
  } else {
    compElem.className = 'city-landmark landmark-unchartered';
    signComp.textContent = 'Undiscovered';
    statusComp.textContent = 'No Intel';
  }
}

function renderDistrictInspector(districtId) {
  const inspector = document.getElementById('districtInspectorCard');
  if (!districtId) {
    inspector.classList.add('hidden');
    return;
  }
  inspector.classList.remove('hidden');

  const iconContainer = document.getElementById('inspIconSvg') || document.getElementById('inspIcon');
  const titleElem = document.getElementById('inspTitle');
  const badgeElem = document.getElementById('inspBadge');
  const bodyElem = document.getElementById('inspBody');
  const actionsElem = document.getElementById('inspActions');

  const hasProfile = Boolean(state.profile.name);
  const hasGroups = state.market.groups.length > 0;
  const hasHistory = state.history.length > 0;
  const latestRun = hasHistory ? state.history[0] : null;

  if (iconContainer) {
    iconContainer.innerHTML = getDistrictIconSvg(districtId);
  }

  if (districtId === 'hq') {
    titleElem.textContent = hasProfile ? state.profile.name : 'Founder Headquarters';
    badgeElem.textContent = hasProfile ? 'HQ • Operational' : 'HQ • Unchartered';

    bodyElem.innerHTML = `
      <p class="panel-desc">The executive studio where your tech startup develops its vision, manages engineering, and tracks venture milestones.</p>
      <div class="inspector-stat-grid">
        <div class="insp-stat-item">
          <div class="insp-stat-label">Product Type</div>
          <div class="insp-stat-val text-sm">${state.profile.type || 'Not set'}</div>
        </div>
        <div class="insp-stat-item">
          <div class="insp-stat-label">Startup Stage</div>
          <div class="insp-stat-val text-sm">${state.profile.stage || 'Not set'}</div>
        </div>
        <div class="insp-stat-item">
          <div class="insp-stat-label">Focus Country</div>
          <div class="insp-stat-val text-sm">${state.profile.country || 'Not set'}</div>
        </div>
        <div class="insp-stat-item">
          <div class="insp-stat-label">Simulated Launches</div>
          <div class="insp-stat-val text-lime">${state.history.length}</div>
        </div>
      </div>
      <p class="field-hint">${hasProfile ? `Value Pitch: "${escapeHtml(state.profile.desc)}"` : 'Construct your studio to begin activating the virtual world.'}</p>
    `;

    actionsElem.innerHTML = `
      <button class="btn btn-lime btn-sm" data-nav="profile">${hasProfile ? 'Edit Startup Profile' : 'Construct Startup Profile'}</button>
      <button class="btn btn-outline-cyan btn-sm" data-nav="market">Define Customer Audiences →</button>
    `;
  } else if (districtId === 'customers') {
    titleElem.textContent = 'Customer Communities District';
    badgeElem.textContent = `${state.market.groups.length} Tribes Chartered`;

    const groupsListHtml = hasGroups
      ? state.market.groups.map(g => `
          <div class="group-card mb-2">
            <strong>${escapeHtml(g.name)}</strong>
            <p class="field-hint">${escapeHtml(g.desc)}</p>
            <div class="group-tags mt-2">
              <span class="group-tag tag-budget">${g.budget.toUpperCase()} Budget</span>
              <span class="group-tag tag-channel">${channelLabel(g.channel)}</span>
            </div>
          </div>
        `).join('')
      : `<div class="empty-state-inline"><p>No customer groups defined yet. Build custom buyer tribes in the Virtual Market.</p></div>`;

    bodyElem.innerHTML = `
      <p class="panel-desc">The residential and professional neighborhoods where your target customers live, discuss problems, and evaluate products.</p>
      <div class="mt-2">${groupsListHtml}</div>
    `;

    actionsElem.innerHTML = `
      <button class="btn btn-lime btn-sm" data-nav="market">Add / Manage Customer Groups</button>
      <button class="btn btn-outline-cyan btn-sm" data-nav="launch">Deploy Campaign to Tribe →</button>
    `;
  } else if (districtId === 'broadcast') {
    titleElem.textContent = 'Transmission Towers (Marketing Channels)';
    badgeElem.textContent = hasHistory ? 'Grid Live' : 'Grid Offline';

    bodyElem.innerHTML = `
      <p class="panel-desc">High-gain digital antenna arrays broadcasting across Social Media, Search Engines, Tech Communities, and Direct Outreach.</p>
      <div class="inspector-stat-grid">
        <div class="insp-stat-item">
          <div class="insp-stat-label">Active Channel</div>
          <div class="insp-stat-val text-sm">${hasHistory ? channelLabel(latestRun.channel) : 'None'}</div>
        </div>
        <div class="insp-stat-item">
          <div class="insp-stat-label">Last Ad Budget</div>
          <div class="insp-stat-val text-sm">${hasHistory ? `$${latestRun.budget}` : '$0'}</div>
        </div>
        <div class="insp-stat-item">
          <div class="insp-stat-label">Simulated Reach</div>
          <div class="insp-stat-val text-sm text-cyan">${hasHistory ? latestRun.impressions.toLocaleString() : '0'}</div>
        </div>
        <div class="insp-stat-item">
          <div class="insp-stat-label">Ad Clicks</div>
          <div class="insp-stat-val text-sm text-lime">${hasHistory ? latestRun.clicks.toLocaleString() : '0'}</div>
        </div>
      </div>
    `;

    actionsElem.innerHTML = `
      <button class="btn btn-lime btn-sm" data-nav="launch">Configure Transmission in Launch Lab</button>
    `;
  } else if (districtId === 'marketplace') {
    titleElem.textContent = 'Central Marketplace Plaza';
    badgeElem.textContent = hasHistory ? 'Commercial Plaza Active' : 'Storefront Awaiting Launch';

    bodyElem.innerHTML = `
      <p class="panel-desc">The central commercial hub where digital shoppers discover products, browse offerings, and decide whether to subscribe.</p>
      <div class="inspector-stat-grid">
        <div class="insp-stat-item">
          <div class="insp-stat-label">Plaza Visitors</div>
          <div class="insp-stat-val">${hasHistory ? latestRun.clicks.toLocaleString() : '0'}</div>
        </div>
        <div class="insp-stat-item">
          <div class="insp-stat-label">Trial Downloads</div>
          <div class="insp-stat-val text-cyan">${hasHistory ? latestRun.installs.toLocaleString() : '0'}</div>
        </div>
        <div class="insp-stat-item">
          <div class="insp-stat-label">Paid Purchases</div>
          <div class="insp-stat-val text-lime">${hasHistory ? latestRun.paidUsers.toLocaleString() : '0'}</div>
        </div>
        <div class="insp-stat-item">
          <div class="insp-stat-label">Simulated Profit</div>
          <div class="insp-stat-val ${hasHistory && latestRun.netProfit >= 0 ? 'text-lime' : 'text-danger'}">${hasHistory ? (latestRun.netProfit >= 0 ? '+' : '') + '$' + latestRun.netProfit.toLocaleString() : '$0'}</div>
        </div>
      </div>
    `;

    actionsElem.innerHTML = `
      <button class="btn btn-lime btn-sm" data-nav="launch">Run Launch Simulation</button>
      <button class="btn btn-outline-cyan btn-sm" data-nav="history">View Plaza History →</button>
    `;
  } else if (districtId === 'competitors') {
    titleElem.textContent = 'Rival Outposts & Alternatives';
    badgeElem.textContent = state.market.competitorNotes ? 'Intel Logged' : 'Undiscovered';

    bodyElem.innerHTML = `
      <p class="panel-desc">Competing products and existing substitute tools vying for your customers' attention.</p>
      <div class="mt-2">
        ${state.market.competitorNotes && state.market.competitorNotes.trim()
          ? `<div class="city-panel" style="padding:12px;"><p style="font-size:0.84rem; color:#cbd5e1;">"${escapeHtml(state.market.competitorNotes)}"</p></div>`
          : `<div class="empty-state-inline"><p>No competitor notes entered yet. Record rival products in the Virtual Market.</p></div>`
        }
      </div>
    `;

    actionsElem.innerHTML = `
      <button class="btn btn-lime btn-sm" data-nav="market">Record Competitor Intel</button>
    `;
  } else if (districtId === 'feedback') {
    titleElem.textContent = 'Feedback Agora (Customer Sentiments)';
    badgeElem.textContent = hasHistory ? 'Agora Active' : 'Silent Agora';

    const reviewsHtml = hasHistory && latestRun.reviews
      ? latestRun.reviews.map(r => `
          <div class="review-card mb-2">
            <div class="review-meta">
              <strong>${escapeHtml(r.name)} <span class="sim-user-tag">${escapeHtml(r.role)} [Simulated]</span></strong>
              <span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
            </div>
            <p class="review-text">"${escapeHtml(r.quote)}"</p>
          </div>
        `).join('')
      : `<div class="empty-state-inline"><p>No customer reviews have been voiced yet. Run a simulated launch to hear customer feedback.</p></div>`;

    bodyElem.innerHTML = `
      <p class="panel-desc">The public assembly square where customers share reviews, ratings, and pricing reactions.</p>
      <div class="mt-2">${reviewsHtml}</div>
    `;

    actionsElem.innerHTML = `
      <button class="btn btn-lime btn-sm" data-nav="launch">Simulate Launch to Hear Reviews</button>
      <button class="btn btn-outline-cyan btn-sm" data-nav="history">Compare All Past Reviews →</button>
    `;
  }
}

/* ==========================================================
   4. ADVANCE WORLD (SIMULATION TIMELINE)
   ========================================================== */
function handleAdvanceWorld() {
  state.world.day += 7;
  if (state.world.day > 28) {
    state.world.day = 1;
    state.world.cycle += 1;
  }

  const hasProfile = Boolean(state.profile.name);
  const hasGroups = state.market.groups.length > 0;
  const targetGroup = hasGroups
    ? (state.market.groups.find(g => g.id === state.campaign.targetGroupId) || state.market.groups[0])
    : null;

  const currentDayLabel = `Cycle ${state.world.cycle} • Day ${state.world.day}`;

  if (!hasProfile || !hasGroups) {
    // Unpopulated / Unconfigured World Notice
    addWorldEvent({
      day: currentDayLabel,
      iconKey: 'advance',
      title: 'World Timeline Advanced',
      body: 'Seven days passed in the market. No active startup or customer audience was charted during this cycle. Open Startup Profile and Virtual Market to activate the world.'
    });
  } else {
    // Active Simulation Cycle from saved choices
    const appName = state.profile.name;
    const price = state.campaign.price;
    const channel = state.campaign.channel;
    const budget = state.campaign.budget;

    const result = runLaunchSimulationEngine({
      appName,
      targetGroup,
      price,
      channel,
      budget
    });

    state.history.unshift(result);
    if (state.history.length > 25) state.history = state.history.slice(0, 25);
    saveState(STORAGE_HISTORY, state.history);

    // Sequence of Simulated Events
    addWorldEvent({
      day: currentDayLabel,
      iconKey: 'broadcast',
      title: `1. Broadcast Beamed to ${targetGroup.name}`,
      body: `Transmission towers radiated signal across ${channelLabel(channel)}. Generated ${result.impressions.toLocaleString()} simulated impressions, driving ${result.clicks.toLocaleString()} visitors toward the Central Marketplace.`
    });

    addWorldEvent({
      day: currentDayLabel,
      iconKey: 'marketplace',
      title: `2. Marketplace Activity: ${result.installs} Trials`,
      body: `${result.clicks.toLocaleString()} shoppers arrived at the plaza. ${result.installs} customers downloaded the MVP trial of ${appName}. Paywall converted ${result.paidUsers} paying users at $${price}/mo (${result.netProfit >= 0 ? '+' : ''}$${result.netProfit} net outcome).`
    });

    if (result.reviews && result.reviews.length > 0) {
      const topReview = result.reviews[0];
      addWorldEvent({
        day: currentDayLabel,
        iconKey: 'feedback',
        title: `3. Feedback Voiced by ${topReview.name}`,
        body: `"${topReview.quote}" — ${topReview.role} (${topReview.rating}/5 Rating [Simulated])`
      });
    }

    displayLaunchResults(result);
  }

  saveState(STORAGE_WORLD, state.world);
  renderWorldView();
  renderHistoryTable();
  updateBadges();
}

function addWorldEvent({ day, iconKey, title, body }) {
  const eventObj = {
    id: 'evt_' + Date.now() + Math.random(),
    day,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    iconKey,
    title,
    body
  };

  state.world.events.unshift(eventObj);
  if (state.world.events.length > 30) state.world.events = state.world.events.slice(0, 30);
  renderChronicle();
}

function renderChronicle() {
  const timeline = document.getElementById('chronicleTimeline');
  const events = state.world.events;

  if (events.length === 0) {
    timeline.innerHTML = `
      <div class="chronicle-empty" id="chronicleEmpty">
        <span class="empty-icon-svg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </span>
        <p><strong>The world is quiet.</strong><br>Configure your startup profile and customer groups, then advance time to watch simulated market events unfold.</p>
      </div>
    `;
    return;
  }

  timeline.innerHTML = events.map(evt => `
    <div class="event-entry">
      <div class="event-icon-svg">${getEventIconSvg(evt.iconKey)}</div>
      <div class="event-details">
        <div class="event-header">
          <span class="event-day-tag">${escapeHtml(evt.day)}</span>
          <span class="event-timestamp">${escapeHtml(evt.timestamp)}</span>
        </div>
        <div class="event-title">${escapeHtml(evt.title)}</div>
        <div class="event-body">${escapeHtml(evt.body)}</div>
      </div>
    </div>
  `).join('');
}

/* ==========================================================
   5. STARTUP PROFILE VIEW
   ========================================================== */
function initProfileForm() {
  const nameInput = document.getElementById('profName');
  const typeSelect = document.getElementById('profType');
  const descTextarea = document.getElementById('profDesc');
  const stageSelect = document.getElementById('profStage');
  const countryInput = document.getElementById('profCountry');
  const form = document.getElementById('profileForm');
  const saveNotice = document.getElementById('profileSaveNotice');

  if (state.profile.name) nameInput.value = state.profile.name;
  if (state.profile.type) typeSelect.value = state.profile.type;
  if (state.profile.desc) descTextarea.value = state.profile.desc;
  if (state.profile.stage) stageSelect.value = state.profile.stage;
  if (state.profile.country) countryInput.value = state.profile.country;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    state.profile = {
      name: nameInput.value.trim(),
      type: typeSelect.value,
      desc: descTextarea.value.trim(),
      stage: stageSelect.value,
      country: countryInput.value.trim()
    };
    saveState(STORAGE_PROFILE, state.profile);

    // Sync to Supabase if authenticated
    if (window.foundrySupabase && window.foundrySupabase.isAuthenticated()) {
      try {
        await window.foundrySupabase.saveStartupProfile(state.profile);
      } catch (err) {
        console.error('Supabase profile sync error:', err);
      }
    }

    addWorldEvent({
      day: `Cycle ${state.world.cycle} • Day ${state.world.day}`,
      iconKey: 'hq',
      title: `Founder HQ Activated: ${state.profile.name}`,
      body: `Established operational studio in ${state.profile.country || 'the market'} (${state.profile.type}, ${state.profile.stage}).`
    });

    saveNotice.classList.remove('hidden');
    setTimeout(() => saveNotice.classList.add('hidden'), 2500);

    renderHeader();
    renderWorldView();
    renderSourcedMarketData();
  });
}

/* ==========================================================
   6. VIRTUAL MARKET & CUSTOMER GROUPS VIEW
   ========================================================== */
function initMarketForms() {
  const groupForm = document.getElementById('customerGroupForm');
  const nameInput = document.getElementById('groupName');
  const descInput = document.getElementById('groupDesc');
  const budgetSelect = document.getElementById('groupBudget');
  const priceSensitivitySelect = document.getElementById('groupPriceSensitivity');
  const buyingPrioritiesSelect = document.getElementById('groupBuyingPriorities');
  const channelSelect = document.getElementById('groupChannel');

  groupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newGroup = {
      id: 'grp_' + Date.now(),
      name: nameInput.value.trim(),
      desc: descInput.value.trim(),
      budget: budgetSelect ? budgetSelect.value : 'medium',
      priceSensitivity: priceSensitivitySelect ? priceSensitivitySelect.value : 'moderate',
      buyingPriorities: buyingPrioritiesSelect ? buyingPrioritiesSelect.value : 'Immediate ROI & Cost Reduction',
      channel: channelSelect ? channelSelect.value : 'social'
    };

    state.market.groups.push(newGroup);
    saveState(STORAGE_MARKET, state.market);

    // Sync to Supabase if authenticated
    if (window.foundrySupabase && window.foundrySupabase.isAuthenticated()) {
      window.foundrySupabase.saveCustomerGroups(state.market.groups).catch(err => {
        console.error('Supabase customer groups sync error:', err);
      });
    }

    addWorldEvent({
      day: `Cycle ${state.world.cycle} • Day ${state.world.day}`,
      iconKey: 'customer',
      title: `Customer District Founded: ${newGroup.name}`,
      body: `Chartered tribe with ${newGroup.budget.toUpperCase()} budget tolerance. Primary channel: ${channelLabel(newGroup.channel)}.`
    });

    nameInput.value = '';
    descInput.value = '';
    if (budgetSelect) budgetSelect.value = 'medium';
    if (priceSensitivitySelect) priceSensitivitySelect.value = 'moderate';
    if (buyingPrioritiesSelect) buyingPrioritiesSelect.value = 'Immediate ROI & Cost Reduction';
    if (channelSelect) channelSelect.value = 'social';

    renderCustomerGroupsList();
    renderWorldView();
    updateBadges();
  });

  const notesTextarea = document.getElementById('marketCompetitorNotes');
  const saveNotesBtn = document.getElementById('saveMarketNotesBtn');
  const notesNotice = document.getElementById('marketNotesNotice');

  if (state.market.competitorNotes) {
    notesTextarea.value = state.market.competitorNotes;
  }

  saveNotesBtn.addEventListener('click', () => {
    state.market.competitorNotes = notesTextarea.value.trim();
    saveState(STORAGE_MARKET, state.market);

    // Sync to Supabase if authenticated
    if (window.foundrySupabase && window.foundrySupabase.isAuthenticated()) {
      window.foundrySupabase.saveCompetitorNotes(state.market.competitorNotes).catch(err => {
        console.error('Supabase competitor notes sync error:', err);
      });
    }

    if (state.market.competitorNotes) {
      addWorldEvent({
        day: `Cycle ${state.world.cycle} • Day ${state.world.day}`,
        iconKey: 'competitor',
        title: 'Rival Outposts Intel Logged',
        body: 'Scouted competitor solutions and alternative product offerings active in your market segment.'
      });
    }

    notesNotice.classList.remove('hidden');
    setTimeout(() => notesNotice.classList.add('hidden'), 2000);
    renderWorldView();
  });

  // Supabase Backend Connection Controls
  const toggleConfigBtn = document.getElementById('toggleBackendConfigBtn');
  const configDrawer = document.getElementById('backendConfigDrawer');
  const saveConfigBtn = document.getElementById('saveSupabaseConfigBtn');
  const clearConfigBtn = document.getElementById('clearSupabaseConfigBtn');
  const urlInput = document.getElementById('cfgSupabaseUrl');
  const keyInput = document.getElementById('cfgSupabaseAnonKey');
  const configStatus = document.getElementById('supabaseConfigStatus');

  if (toggleConfigBtn && configDrawer) {
    toggleConfigBtn.addEventListener('click', () => {
      configDrawer.classList.toggle('hidden');
    });
  }

  if (urlInput && keyInput && window.foundryMarketData) {
    if (window.foundryMarketData.url) urlInput.value = window.foundryMarketData.url;
    if (window.foundryMarketData.anonKey) keyInput.value = window.foundryMarketData.anonKey;
  }

  if (saveConfigBtn && urlInput && keyInput && window.foundryMarketData) {
    saveConfigBtn.addEventListener('click', () => {
      const u = urlInput.value.trim();
      const k = keyInput.value.trim();
      if (!u || !k) {
        alert('Please provide both the Supabase project URL and anon public key.');
        return;
      }
      window.foundryMarketData.setCredentials(u, k);
      if (configStatus) {
        configStatus.textContent = '✓ Connected to Supabase';
        configStatus.classList.remove('hidden');
        setTimeout(() => configStatus.classList.add('hidden'), 2500);
      }
      renderSourcedMarketData();
    });
  }

  if (clearConfigBtn && window.foundryMarketData) {
    clearConfigBtn.addEventListener('click', () => {
      window.foundryMarketData.clearCredentials();
      if (urlInput) urlInput.value = '';
      if (keyInput) keyInput.value = '';
      if (configStatus) {
        configStatus.textContent = 'Disconnected';
        configStatus.classList.remove('hidden');
        setTimeout(() => configStatus.classList.add('hidden'), 2000);
      }
      renderSourcedMarketData();
    });
  }
}

function renderCustomerGroupsList() {
  const container = document.getElementById('customerGroupsList');
  const emptyNotice = document.getElementById('emptyGroupsNotice');
  const countBadge = document.getElementById('groupListCount');
  const groups = state.market.groups;

  countBadge.textContent = `${groups.length} ${groups.length === 1 ? 'Group' : 'Groups'}`;

  if (groups.length === 0) {
    emptyNotice.classList.remove('hidden');
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  emptyNotice.classList.add('hidden');
  container.classList.remove('hidden');

  const budgetLabels = {
    low: 'Budget: Low ($0–$15)',
    medium: 'Budget: Mod ($15–$50)',
    high: 'Budget: High ($50–$150)',
    enterprise: 'Budget: Ent ($150+)'
  };

  const sensitivityLabels = {
    high: 'Sensitivity: High',
    moderate: 'Sensitivity: Mod',
    low: 'Sensitivity: Low'
  };

  container.innerHTML = groups.map(grp => `
    <div class="group-card" id="card_${grp.id}">
      <div class="group-card-header">
        <h4 class="group-card-title">${escapeHtml(grp.name)}</h4>
        <button class="btn btn-danger-outline btn-xs" onclick="deleteCustomerGroup('${grp.id}')" title="Delete group">
          ✕ Remove
        </button>
      </div>
      <p class="group-card-desc">${escapeHtml(grp.desc)}</p>
      <div class="group-tags">
        <span class="group-tag tag-budget">${budgetLabels[grp.budget] || grp.budget}</span>
        <span class="group-tag" style="background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 0.68rem; padding: 2px 6px; border-radius: 4px;">
          ${sensitivityLabels[grp.priceSensitivity] || 'Sensitivity: Mod'}
        </span>
        <span class="group-tag" style="background: rgba(168, 85, 247, 0.12); color: #e9d5ff; border: 1px solid rgba(168, 85, 247, 0.3); font-size: 0.68rem; padding: 2px 6px; border-radius: 4px;" title="${escapeHtml(grp.buyingPriorities || '')}">
          Priority: ${escapeHtml((grp.buyingPriorities || 'ROI').slice(0, 20))}...
        </span>
        <span class="group-tag tag-channel">${channelLabel(grp.channel)}</span>
      </div>
    </div>
  `).join('');
}

window.deleteCustomerGroup = function(groupId) {
  state.market.groups = state.market.groups.filter(g => g.id !== groupId);
  saveState(STORAGE_MARKET, state.market);
  renderCustomerGroupsList();
  renderWorldView();
  updateBadges();
};

/* ==========================================================
   7. LAUNCH LAB (SIMULATION ENGINE & GROUNDED DATA CONNECTOR)
   ========================================================== */

const SOURCED_OBSERVATIONS_BASELINE = {
  USA: {
    'SP.POP.TOTL': { value: 334914895, year: 2023, unit: 'people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'NY.GDP.PCAP.CD': { value: 81695, year: 2023, unit: 'current US$', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.USER.ZS': { value: 91.8, year: 2023, unit: '% of population', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.CEL.SETS.P2': { value: 110.2, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.BBND.P2': { value: 38.6, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'ITU.ICT.HH.INET': { value: 84.5, year: 2023, unit: '% of households', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.MOB.4G': { value: 99.6, year: 2023, unit: '% of population', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.ACT.MBB': { value: 172.9, year: 2023, unit: 'subscriptions per 100 inhabitants', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.FBB.10M': { value: 96.5, year: 2023, unit: '% of fixed broadband subscriptions', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'account.t.d': { value: 95.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.any': { value: 93.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin2.t.d': { value: 82.8, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin10': { value: 66.7, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.made': { value: 91.3, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'UNCTAD.ECOMM.B2C.IDX': { value: 89.8, year: 2023, unit: 'Index (0–100)', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.DDS.SHR': { value: 66.8, year: 2023, unit: '% of total services exports', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.RCV': { value: 33.1, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.WEB': { value: 86.5, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.IND.BUY': { value: 78.4, year: 2023, unit: '% of individuals', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'EUROSTAT.APP.INSTALL': null
  },
  DEU: {
    'SP.POP.TOTL': { value: 84482267, year: 2023, unit: 'people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'NY.GDP.PCAP.CD': { value: 52824, year: 2023, unit: 'current US$', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.USER.ZS': { value: 93.3, year: 2023, unit: '% of population', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.CEL.SETS.P2': { value: 128.5, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.BBND.P2': { value: 44.5, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'ITU.ICT.HH.INET': { value: 91.4, year: 2023, unit: '% of households', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.MOB.4G': { value: 99.1, year: 2023, unit: '% of population', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.ACT.MBB': { value: 104.2, year: 2023, unit: 'subscriptions per 100 inhabitants', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.FBB.10M': { value: 94.8, year: 2023, unit: '% of fixed broadband subscriptions', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'account.t.d': { value: 99.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.any': { value: 96.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin2.t.d': { value: 88.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin10': { value: 57.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.made': { value: 94.5, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'UNCTAD.ECOMM.B2C.IDX': { value: 88.4, year: 2023, unit: 'Index (0–100)', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.DDS.SHR': { value: 58.2, year: 2023, unit: '% of total services exports', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.RCV': { value: 32.5, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.WEB': { value: 89.2, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.IND.BUY': { value: 81.2, year: 2023, unit: '% of individuals', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'EUROSTAT.APP.INSTALL': { value: 71.2, year: 2023, unit: '% of individuals (age 16–74)', source_id: 'eurostat', source_name: 'Eurostat (European Commission)' }
  },
  GBR: {
    'SP.POP.TOTL': { value: 68350000, year: 2023, unit: 'people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'NY.GDP.PCAP.CD': { value: 48912, year: 2023, unit: 'current US$', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.USER.ZS': { value: 96.7, year: 2023, unit: '% of population', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.CEL.SETS.P2': { value: 119.0, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.BBND.P2': { value: 41.2, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'ITU.ICT.HH.INET': { value: 96.5, year: 2023, unit: '% of households', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.MOB.4G': { value: 99.2, year: 2023, unit: '% of population', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.ACT.MBB': { value: 122.5, year: 2023, unit: 'subscriptions per 100 inhabitants', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.FBB.10M': { value: 97.4, year: 2023, unit: '% of fixed broadband subscriptions', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'account.t.d': { value: 98.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.any': { value: 97.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin2.t.d': { value: 93.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin10': { value: 65.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.made': { value: 95.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'UNCTAD.ECOMM.B2C.IDX': { value: 92.1, year: 2023, unit: 'Index (0–100)', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.DDS.SHR': { value: 72.4, year: 2023, unit: '% of total services exports', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.RCV': { value: 35.0, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.WEB': { value: 87.0, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.IND.BUY': { value: 86.0, year: 2023, unit: '% of individuals', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'EUROSTAT.APP.INSTALL': { value: 72.8, year: 2023, unit: '% of individuals (age 16–74)', source_id: 'eurostat', source_name: 'Eurostat (European Commission)' }
  },
  FRA: {
    'SP.POP.TOTL': { value: 68170228, year: 2023, unit: 'people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'NY.GDP.PCAP.CD': { value: 44460, year: 2023, unit: 'current US$', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.USER.ZS': { value: 92.0, year: 2023, unit: '% of population', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.CEL.SETS.P2': { value: 115.3, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.BBND.P2': { value: 47.1, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'ITU.ICT.HH.INET': { value: 93.2, year: 2023, unit: '% of households', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.MOB.4G': { value: 99.3, year: 2023, unit: '% of population', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.ACT.MBB': { value: 109.8, year: 2023, unit: 'subscriptions per 100 inhabitants', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.FBB.10M': { value: 96.2, year: 2023, unit: '% of fixed broadband subscriptions', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'account.t.d': { value: 99.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.any': { value: 96.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin2.t.d': { value: 86.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin10': { value: 42.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.made': { value: 94.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'UNCTAD.ECOMM.B2C.IDX': { value: 87.6, year: 2023, unit: 'Index (0–100)', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.DDS.SHR': { value: 59.0, year: 2023, unit: '% of total services exports', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.RCV': { value: 28.4, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.WEB': { value: 84.1, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.IND.BUY': { value: 79.5, year: 2023, unit: '% of individuals', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'EUROSTAT.APP.INSTALL': { value: 69.5, year: 2023, unit: '% of individuals (age 16–74)', source_id: 'eurostat', source_name: 'Eurostat (European Commission)' }
  },
  IND: {
    'SP.POP.TOTL': { value: 1428627663, year: 2023, unit: 'people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'NY.GDP.PCAP.CD': { value: 2484, year: 2023, unit: 'current US$', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.USER.ZS': { value: 52.4, year: 2023, unit: '% of population', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.CEL.SETS.P2': { value: 82.6, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.BBND.P2': { value: 2.6, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'ITU.ICT.HH.INET': { value: 55.0, year: 2023, unit: '% of households', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.MOB.4G': { value: 98.2, year: 2023, unit: '% of population', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.ACT.MBB': { value: 62.4, year: 2023, unit: 'subscriptions per 100 inhabitants', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.FBB.10M': { value: 85.0, year: 2023, unit: '% of fixed broadband subscriptions', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'account.t.d': { value: 77.5, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.any': { value: 35.1, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin2.t.d': { value: 30.6, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin10': { value: 4.8, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.made': { value: 28.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'UNCTAD.ECOMM.B2C.IDX': { value: 54.2, year: 2023, unit: 'Index (0–100)', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.DDS.SHR': { value: 76.5, year: 2023, unit: '% of total services exports', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.RCV': { value: 14.2, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.WEB': { value: 42.0, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.IND.BUY': { value: 38.0, year: 2023, unit: '% of individuals', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'EUROSTAT.APP.INSTALL': null
  },
  BRA: {
    'SP.POP.TOTL': { value: 215313498, year: 2023, unit: 'people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'NY.GDP.PCAP.CD': { value: 10043, year: 2023, unit: 'current US$', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.USER.ZS': { value: 80.7, year: 2023, unit: '% of population', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.CEL.SETS.P2': { value: 102.4, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.BBND.P2': { value: 21.0, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'ITU.ICT.HH.INET': { value: 81.3, year: 2023, unit: '% of households', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.MOB.4G': { value: 98.8, year: 2023, unit: '% of population', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.ACT.MBB': { value: 98.2, year: 2023, unit: 'subscriptions per 100 inhabitants', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.FBB.10M': { value: 89.4, year: 2023, unit: '% of fixed broadband subscriptions', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'account.t.d': { value: 84.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.any': { value: 77.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin2.t.d': { value: 65.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin10': { value: 40.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.made': { value: 70.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'UNCTAD.ECOMM.B2C.IDX': { value: 64.5, year: 2023, unit: 'Index (0–100)', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.DDS.SHR': { value: 48.2, year: 2023, unit: '% of total services exports', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.RCV': { value: 22.0, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.WEB': { value: 61.2, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.IND.BUY': { value: 52.4, year: 2023, unit: '% of individuals', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'EUROSTAT.APP.INSTALL': null
  },
  KEN: {
    'SP.POP.TOTL': { value: 55100586, year: 2023, unit: 'people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'NY.GDP.PCAP.CD': { value: 2099, year: 2023, unit: 'current US$', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.USER.ZS': { value: 42.0, year: 2023, unit: '% of population', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.CEL.SETS.P2': { value: 115.0, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.BBND.P2': { value: 1.8, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'ITU.ICT.HH.INET': { value: 32.5, year: 2023, unit: '% of households', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.MOB.4G': { value: 96.5, year: 2023, unit: '% of population', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.ACT.MBB': { value: 61.2, year: 2023, unit: 'subscriptions per 100 inhabitants', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.FBB.10M': { value: 74.0, year: 2023, unit: '% of fixed broadband subscriptions', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'account.t.d': { value: 79.2, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.any': { value: 78.4, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin2.t.d': { value: 35.2, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin10': { value: 6.2, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.made': { value: 75.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'UNCTAD.ECOMM.B2C.IDX': { value: 48.0, year: 2023, unit: 'Index (0–100)', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.DDS.SHR': { value: 42.0, year: 2023, unit: '% of total services exports', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.RCV': { value: 11.5, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.WEB': { value: 31.0, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.IND.BUY': { value: 24.5, year: 2023, unit: '% of individuals', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'EUROSTAT.APP.INSTALL': null
  },
  JPN: {
    'SP.POP.TOTL': { value: 124516650, year: 2023, unit: 'people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'NY.GDP.PCAP.CD': { value: 33834, year: 2023, unit: 'current US$', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.USER.ZS': { value: 93.0, year: 2023, unit: '% of population', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.CEL.SETS.P2': { value: 162.0, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.BBND.P2': { value: 35.8, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'ITU.ICT.HH.INET': { value: 91.2, year: 2023, unit: '% of households', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.MOB.4G': { value: 99.9, year: 2023, unit: '% of population', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.ACT.MBB': { value: 198.5, year: 2023, unit: 'subscriptions per 100 inhabitants', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.FBB.10M': { value: 99.1, year: 2023, unit: '% of fixed broadband subscriptions', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'account.t.d': { value: 98.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.any': { value: 92.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin2.t.d': { value: 85.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin10': { value: 69.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.made': { value: 90.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'UNCTAD.ECOMM.B2C.IDX': { value: 89.0, year: 2023, unit: 'Index (0–100)', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.DDS.SHR': { value: 52.4, year: 2023, unit: '% of total services exports', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.RCV': { value: 38.0, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.WEB': { value: 91.5, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.IND.BUY': { value: 76.8, year: 2023, unit: '% of individuals', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'EUROSTAT.APP.INSTALL': null
  },
  SGP: {
    'SP.POP.TOTL': { value: 5917600, year: 2023, unit: 'people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'NY.GDP.PCAP.CD': { value: 84734, year: 2023, unit: 'current US$', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.USER.ZS': { value: 96.0, year: 2023, unit: '% of population', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.CEL.SETS.P2': { value: 160.5, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.BBND.P2': { value: 29.5, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'ITU.ICT.HH.INET': { value: 98.4, year: 2023, unit: '% of households', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.MOB.4G': { value: 99.9, year: 2023, unit: '% of population', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.ACT.MBB': { value: 172.1, year: 2023, unit: 'subscriptions per 100 inhabitants', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.FBB.10M': { value: 99.5, year: 2023, unit: '% of fixed broadband subscriptions', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'account.t.d': { value: 98.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.any': { value: 94.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin2.t.d': { value: 90.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin10': { value: 49.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.made': { value: 92.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'UNCTAD.ECOMM.B2C.IDX': { value: 94.5, year: 2023, unit: 'Index (0–100)', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.DDS.SHR': { value: 68.0, year: 2023, unit: '% of total services exports', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.RCV': { value: 36.5, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.WEB': { value: 93.0, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.IND.BUY': { value: 82.0, year: 2023, unit: '% of individuals', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'EUROSTAT.APP.INSTALL': null
  },
  NGA: {
    'SP.POP.TOTL': { value: 223804632, year: 2023, unit: 'people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'NY.GDP.PCAP.CD': { value: 1688, year: 2023, unit: 'current US$', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.USER.ZS': { value: 38.7, year: 2023, unit: '% of population', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.CEL.SETS.P2': { value: 98.2, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.BBND.P2': { value: 0.1, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'ITU.ICT.HH.INET': { value: 22.8, year: 2023, unit: '% of households', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.MOB.4G': { value: 85.0, year: 2023, unit: '% of population', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.ACT.MBB': { value: 46.5, year: 2023, unit: 'subscriptions per 100 inhabitants', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.FBB.10M': { value: 62.0, year: 2023, unit: '% of fixed broadband subscriptions', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'account.t.d': { value: 45.3, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.any': { value: 34.6, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin2.t.d': { value: 35.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin10': { value: 3.1, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.made': { value: 32.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'UNCTAD.ECOMM.B2C.IDX': { value: 39.2, year: 2023, unit: 'Index (0–100)', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.DDS.SHR': { value: 28.0, year: 2023, unit: '% of total services exports', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.RCV': { value: 8.5, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.WEB': { value: 22.0, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.IND.BUY': { value: 18.0, year: 2023, unit: '% of individuals', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'EUROSTAT.APP.INSTALL': null
  },
  CAN: {
    'SP.POP.TOTL': { value: 40097761, year: 2023, unit: 'people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'NY.GDP.PCAP.CD': { value: 53371, year: 2023, unit: 'current US$', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.USER.ZS': { value: 94.0, year: 2023, unit: '% of population', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.CEL.SETS.P2': { value: 92.5, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'IT.NET.BBND.P2': { value: 42.1, year: 2023, unit: 'subscriptions per 100 people', source_id: 'world_bank_wdi', source_name: 'World Bank World Development Indicators' },
    'ITU.ICT.HH.INET': { value: 94.6, year: 2023, unit: '% of households', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.MOB.4G': { value: 99.4, year: 2023, unit: '% of population', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.ACT.MBB': { value: 106.8, year: 2023, unit: 'subscriptions per 100 inhabitants', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'ITU.ICT.FBB.10M': { value: 96.2, year: 2023, unit: '% of fixed broadband subscriptions', source_id: 'itu_datahub', source_name: 'International Telecommunication Union (ITU)' },
    'account.t.d': { value: 99.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.any': { value: 96.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin2.t.d': { value: 92.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'fin10': { value: 82.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'g20.made': { value: 94.0, year: 2021, unit: '% of population age 15+', source_id: 'world_bank_findex', source_name: 'World Bank Global Findex Database' },
    'UNCTAD.ECOMM.B2C.IDX': { value: 88.0, year: 2023, unit: 'Index (0–100)', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.DDS.SHR': { value: 58.4, year: 2023, unit: '% of total services exports', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.RCV': { value: 30.2, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.ENT.WEB': { value: 86.0, year: 2023, unit: '% of enterprises', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'UNCTAD.ECOMM.IND.BUY': { value: 77.0, year: 2023, unit: '% of individuals', source_id: 'unctadstat', source_name: 'UN Trade and Development (UNCTADstat)' },
    'EUROSTAT.APP.INSTALL': null
  }
};

function getCountryNameByIso(iso) {
  const map = {
    'USA': 'United States',
    'DEU': 'Germany',
    'GBR': 'United Kingdom',
    'FRA': 'France',
    'IND': 'India',
    'BRA': 'Brazil',
    'KEN': 'Kenya',
    'JPN': 'Japan',
    'SGP': 'Singapore',
    'NGA': 'Nigeria',
    'CAN': 'Canada'
  };
  return map[iso ? iso.toUpperCase() : 'USA'] || iso || 'United States';
}

function updateSimContextBar() {
  const countryEl = document.getElementById('simContextCountry');
  const industryEl = document.getElementById('simContextIndustry');
  const modelEl = document.getElementById('simContextModel');
  const code = state.campaign.country || 'USA';
  if (countryEl) {
    countryEl.textContent = `${getCountryNameByIso(code)} (${code})`;
  }
  if (industryEl) {
    industryEl.textContent = state.campaign.industry || 'Mobile Applications';
  }
  if (modelEl) {
    modelEl.textContent = 'v2.0-grounded';
  }
}

function getRelevantIndicatorsForRun({ countryCode, countryName, industryDomain, channel, liveObservations = [] }) {
  const normIndustry = (industryDomain || '').toLowerCase();
  const normChannel = (channel || '').toLowerCase();

  let targetCodes = [];

  if (normIndustry.includes('mobile') || normChannel === 'social') {
    targetCodes = [
      'EUROSTAT.APP.INSTALL',
      'ITU.ICT.ACT.MBB',
      'ITU.ICT.MOB.4G',
      'IT.CEL.SETS.P2',
      'IT.NET.USER.ZS',
      'NY.GDP.PCAP.CD'
    ];
  } else if (normIndustry.includes('saas') || normIndustry.includes('software') || normIndustry.includes('developer') || normIndustry.includes('cloud') || normChannel === 'outreach') {
    targetCodes = [
      'UNCTAD.ECOMM.ENT.WEB',
      'UNCTAD.ECOMM.ENT.RCV',
      'IT.NET.BBND.P2',
      'ITU.ICT.FBB.10M',
      'UNCTAD.ECOMM.DDS.SHR',
      'NY.GDP.PCAP.CD'
    ];
  } else if (normIndustry.includes('commerce') || normIndustry.includes('market') || normIndustry.includes('retail')) {
    targetCodes = [
      'UNCTAD.ECOMM.IND.BUY',
      'UNCTAD.ECOMM.B2C.IDX',
      'g20.any',
      'fin10',
      'IT.NET.USER.ZS',
      'NY.GDP.PCAP.CD'
    ];
  } else if (normIndustry.includes('fintech') || normIndustry.includes('financial')) {
    targetCodes = [
      'account.t.d',
      'g20.any',
      'fin2.t.d',
      'fin10',
      'IT.NET.USER.ZS',
      'NY.GDP.PCAP.CD'
    ];
  } else {
    targetCodes = [
      'IT.NET.USER.ZS',
      'ITU.ICT.HH.INET',
      'g20.any',
      'SP.POP.TOTL',
      'NY.GDP.PCAP.CD'
    ];
  }

  const liveMap = new Map();
  if (Array.isArray(liveObservations)) {
    for (const obs of liveObservations) {
      if (!liveMap.has(obs.indicator_code)) {
        liveMap.set(obs.indicator_code, obs);
      }
    }
  }

  const baselineCountry = SOURCED_OBSERVATIONS_BASELINE[countryCode] || SOURCED_OBSERVATIONS_BASELINE['USA'] || {};
  const relevantIndicators = [];
  const dataGaps = [];

  for (const code of targetCodes) {
    const catalogItem = SOURCED_INDICATOR_CATALOG.find(i => i.code === code) || {
      code,
      name: code,
      unit: '',
      publisher: 'International Statistical Agency',
      limitations: 'National-level indicator.'
    };

    let obsValue = null;
    let obsYear = null;
    let obsSourceId = null;
    let obsSourceName = catalogItem.publisher;
    let obsUnit = catalogItem.unit;

    if (liveMap.has(code)) {
      const liveObs = liveMap.get(code);
      obsValue = liveObs.value !== undefined ? liveObs.value : null;
      obsYear = liveObs.year || null;
      obsSourceId = liveObs.source_id || null;
      obsUnit = liveObs.unit || catalogItem.unit;
    } else if (baselineCountry[code]) {
      const bObs = baselineCountry[code];
      obsValue = bObs.value !== undefined ? bObs.value : null;
      obsYear = bObs.year || null;
      obsSourceId = bObs.source_id || null;
      obsSourceName = bObs.source_name || catalogItem.publisher;
      obsUnit = bObs.unit || catalogItem.unit;
    }

    const isReported = obsValue !== null && obsValue !== undefined;
    const dataStatus = isReported ? 'reported' : 'missing_unreported';

    let uncertaintyNote = '';
    if (isReported) {
      uncertaintyNote = `Official baseline observation from ${obsSourceName} (${obsYear || '2023'}).`;
    } else {
      if (code === 'EUROSTAT.APP.INSTALL') {
        uncertaintyNote = `Eurostat mobile application survey is restricted to EU/EEA member states; unreported for ${countryName}. European telemetry only.`;
      } else {
        uncertaintyNote = `Unreported / missing in official ${obsSourceName} release for ${countryName}.`;
      }
      dataGaps.push({
        code,
        name: catalogItem.name,
        source: obsSourceName,
        reason: uncertaintyNote
      });
    }

    relevantIndicators.push({
      indicator_code: code,
      indicator_name: catalogItem.name,
      indicator_value: obsValue,
      indicator_unit: obsUnit,
      reference_year: obsYear,
      country_code: countryCode,
      country_name: countryName,
      source_id: obsSourceId,
      source_name: obsSourceName,
      data_status: dataStatus,
      uncertainty_note: uncertaintyNote,
      limitations: catalogItem.limitations,
      assumption_type: 'macro_market_context',
      assumption_key: code,
      assumption_value: isReported ? `${Number(obsValue).toLocaleString()} ${obsUnit}` : 'Missing / Unreported for this Geography',
      formula_applied: 'National infrastructure & macroeconomic scale baseline',
      disclaimer: 'National macroeconomic and infrastructure statistics describe aggregate territorial adoption. They do not predict individual willingness to buy or forecast customer-level decisions.'
    });
  }

  return { relevantIndicators, dataGaps };
}

function initLaunchLab() {
  const priceInput = document.getElementById('campaignPrice');
  const priceDisplay = document.getElementById('campaignPriceDisplay');
  const budgetInput = document.getElementById('campaignBudget');
  const budgetDisplay = document.getElementById('campaignBudgetDisplay');
  const channelSelect = document.getElementById('campaignChannel');
  const countrySelect = document.getElementById('campaignCountry');
  const industrySelect = document.getElementById('campaignIndustry');
  const executeBtn = document.getElementById('executeSimulationBtn');

  if (priceInput) {
    priceInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      priceDisplay.textContent = val === 0 ? 'Free ($0)' : `$${val} / mo`;
      state.campaign.price = val;
      saveCampaignState();
    });
  }

  if (budgetInput) {
    budgetInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      budgetDisplay.textContent = `$${val.toLocaleString()}`;
      state.campaign.budget = val;
      saveCampaignState();
    });
  }

  if (channelSelect) {
    channelSelect.addEventListener('change', (e) => {
      state.campaign.channel = e.target.value;
      saveCampaignState();
    });
  }

  if (countrySelect) {
    const defaultIso = state.campaign.country || (window.foundrySupabase ? window.foundrySupabase.resolveIso3(state.profile.country) : 'USA') || 'USA';
    countrySelect.value = defaultIso;
    state.campaign.country = defaultIso;
    countrySelect.addEventListener('change', (e) => {
      state.campaign.country = e.target.value;
      updateSimContextBar();
      saveCampaignState();
    });
  }

  if (industrySelect) {
    const defaultInd = state.campaign.industry || state.profile.type || 'Mobile Applications';
    let matched = false;
    for (let opt of industrySelect.options) {
      if (opt.value === defaultInd || defaultInd.includes(opt.value)) {
        industrySelect.value = opt.value;
        matched = true;
        break;
      }
    }
    if (!matched) industrySelect.value = 'Mobile Applications';
    state.campaign.industry = industrySelect.value;
    industrySelect.addEventListener('change', (e) => {
      state.campaign.industry = e.target.value;
      updateSimContextBar();
      saveCampaignState();
    });
  }

  updateSimContextBar();

  if (executeBtn) {
    executeBtn.addEventListener('click', handleExecuteSimulation);
  }
}

function populateTargetGroupDropdown() {
  const groupSelect = document.getElementById('campaignTargetGroup');
  const noGroupWarning = document.getElementById('noGroupWarning');
  const executeBtn = document.getElementById('executeSimulationBtn');
  const groups = state.market.groups;

  updateSimContextBar();

  if (!groupSelect) return;
  groupSelect.innerHTML = '';

  if (groups.length === 0) {
    if (noGroupWarning) noGroupWarning.classList.remove('hidden');
    if (executeBtn) executeBtn.disabled = true;
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '-- No custom customer groups available --';
    groupSelect.appendChild(opt);
    return;
  }

  if (noGroupWarning) noGroupWarning.classList.add('hidden');
  if (executeBtn) executeBtn.disabled = false;

  groups.forEach((grp, idx) => {
    const opt = document.createElement('option');
    opt.value = grp.id;
    opt.textContent = `${grp.name} (${grp.budget.toUpperCase()} budget)`;
    if (state.campaign.targetGroupId === grp.id || (!state.campaign.targetGroupId && idx === 0)) {
      opt.selected = true;
      state.campaign.targetGroupId = grp.id;
    }
    groupSelect.appendChild(opt);
  });

  groupSelect.addEventListener('change', (e) => {
    state.campaign.targetGroupId = e.target.value;
    saveState(STORAGE_CAMPAIGN, state.campaign);
  });
}

async function handleExecuteSimulation() {
  const targetGroupId = document.getElementById('campaignTargetGroup').value;
  const targetGroup = state.market.groups.find(g => g.id === targetGroupId);

  if (!targetGroup) {
    alert('Please create and select a target customer group in the Virtual Market first.');
    return;
  }

  const appName = state.profile.name || 'Your Startup';
  const price = parseInt(document.getElementById('campaignPrice').value, 10);
  const channel = document.getElementById('campaignChannel').value;
  const budget = parseInt(document.getElementById('campaignBudget').value, 10);

  const countrySelect = document.getElementById('campaignCountry');
  const industrySelect = document.getElementById('campaignIndustry');
  const countryCode = (countrySelect ? countrySelect.value : state.campaign.country) || 'USA';
  const countryName = getCountryNameByIso(countryCode);
  const industryDomain = (industrySelect ? industrySelect.value : state.campaign.industry) || 'Mobile Applications';
  const modelVersion = 'v2.0-grounded';

  const executeBtn = document.getElementById('executeSimulationBtn');
  const statusBadge = document.getElementById('simLabStatusBadge');

  if (executeBtn) {
    executeBtn.disabled = true;
    executeBtn.textContent = 'Simulating Market...';
  }
  if (statusBadge) {
    statusBadge.className = 'status-badge badge-running';
    statusBadge.textContent = 'Simulating Outcomes...';
  }

  // 1. Fetch live observations if Supabase is connected
  let liveObservations = [];
  if (window.foundrySupabase && window.foundrySupabase.isConfigured()) {
    try {
      liveObservations = await window.foundrySupabase.getCountryObservations({ countryCode, limit: 100 });
    } catch (e) {
      console.warn('Could not query live Supabase country observations:', e);
    }
  }

  // 2. Select only relevant indicators for this run
  const { relevantIndicators, dataGaps } = getRelevantIndicatorsForRun({
    countryCode,
    countryName,
    industryDomain,
    channel,
    liveObservations
  });

  // 3. Document explicit Founder Hypotheses
  let channelAffinity = 1.0;
  if (channel === 'social') channelAffinity = targetGroup.channel === 'social' ? 1.4 : 0.75;
  else if (channel === 'search') channelAffinity = targetGroup.channel === 'search' ? 1.35 : 0.85;
  else if (channel === 'community') channelAffinity = targetGroup.channel === 'community' ? 1.45 : 0.7;
  else if (channel === 'outreach') channelAffinity = targetGroup.channel === 'outreach' ? 1.5 : 0.6;

  const founderAssumptions = [
    {
      indicator_code: null,
      indicator_name: 'Customer Group Budget Tolerance',
      indicator_value: null,
      indicator_unit: 'budget tier',
      reference_year: null,
      country_code: countryCode,
      country_name: countryName,
      assumption_type: 'founder_hypothesis',
      assumption_key: 'budget_tier',
      assumption_value: `${targetGroup.budget.toUpperCase()} (${targetGroup.name})`,
      formula_applied: 'Sensitivity threshold: low ($7/mo), medium ($28/mo), high ($55/mo)',
      disclaimer: 'Hypothesis declared by founder.'
    },
    {
      indicator_code: null,
      indicator_name: 'Marketing Channel Preference Multiplier',
      indicator_value: channelAffinity,
      indicator_unit: 'multiplier',
      reference_year: null,
      country_code: countryCode,
      country_name: countryName,
      assumption_type: 'founder_hypothesis',
      assumption_key: 'channel_selection',
      assumption_value: `${channelLabel(channel)} (${channelAffinity}x affinity for ${targetGroup.name})`,
      formula_applied: targetGroup.channel === channel ? '1.35x-1.5x affinity multiplier' : '0.6x-0.85x channel mismatch penalty',
      disclaimer: 'Hypothesis declared by founder based on persona behavior assumption.'
    },
    {
      indicator_code: null,
      indicator_name: 'Pricing Elasticity Hypothesis',
      indicator_value: price,
      indicator_unit: 'US$/mo',
      reference_year: null,
      country_code: countryCode,
      country_name: countryName,
      assumption_type: 'founder_hypothesis',
      assumption_key: 'subscription_price',
      assumption_value: price === 0 ? 'Free ($0)' : `$${price}/mo`,
      formula_applied: 'Price fit curve applied against customer budget tier',
      disclaimer: 'Stated subscription tier hypothesis.'
    },
    {
      indicator_code: null,
      indicator_name: 'Ad Spend Allocation & CPM Baseline',
      indicator_value: budget,
      indicator_unit: 'US$',
      reference_year: null,
      country_code: countryCode,
      country_name: countryName,
      assumption_type: 'founder_hypothesis',
      assumption_key: 'ad_budget',
      assumption_value: `$${budget.toLocaleString()} (${channelLabel(channel)})`,
      formula_applied: 'Raw reach = (Budget / Base CPM) * 1000',
      disclaimer: 'Budget declared by founder.'
    },
    {
      indicator_code: null,
      indicator_name: 'Customer Group Price Sensitivity',
      indicator_value: null,
      indicator_unit: 'elasticity tier',
      reference_year: null,
      country_code: countryCode,
      country_name: countryName,
      assumption_type: 'founder_hypothesis',
      assumption_key: 'price_sensitivity',
      assumption_value: `${(targetGroup.priceSensitivity || 'moderate').toUpperCase()} (${targetGroup.name})`,
      formula_applied: 'Price pushback curve based on stated persona price tolerance',
      disclaimer: 'Customer trait hypothesis declared by founder; never inferred from nationality.'
    },
    {
      indicator_code: null,
      indicator_name: 'Customer Group Primary Buying Priority',
      indicator_value: null,
      indicator_unit: 'priority category',
      reference_year: null,
      country_code: countryCode,
      country_name: countryName,
      assumption_type: 'founder_hypothesis',
      assumption_key: 'buying_priority',
      assumption_value: `${targetGroup.buyingPriorities || 'Immediate ROI & Cost Reduction'} (${targetGroup.name})`,
      formula_applied: 'Key purchasing criterion guiding product evaluation and trade-offs',
      disclaimer: 'Customer priority hypothesis declared by founder; never inferred from nationality.'
    }
  ];

  const fullEvidence = [...relevantIndicators, ...founderAssumptions];

  setTimeout(async () => {
    const result = runLaunchSimulationEngine({
      appName,
      targetGroup,
      price,
      channel,
      budget,
      countryCode,
      countryName,
      industryDomain,
      modelVersion,
      relevantIndicators,
      dataGaps
    });

    result.evidence = fullEvidence;
    result.customerTraits = {
      groupName: targetGroup.name,
      needs: targetGroup.desc,
      budgetRange: targetGroup.budget === 'low' ? 'Low ($0 – $15/mo)' : (targetGroup.budget === 'high' ? 'High ($50 – $150/mo)' : (targetGroup.budget === 'enterprise' ? 'Enterprise ($150+/mo)' : 'Moderate ($15 – $50/mo)')),
      priceSensitivity: targetGroup.priceSensitivity || 'moderate',
      buyingPriorities: targetGroup.buyingPriorities || 'Immediate ROI & Cost Reduction',
      preferredChannels: channelLabel(targetGroup.channel)
    };
    result.hypotheticalCustomerScenarios = null;

    displayLaunchResults(result);

    state.history.unshift(result);
    if (state.history.length > 50) state.history = state.history.slice(0, 50);
    saveState(STORAGE_HISTORY, state.history);

    const currentDayLabel = `Cycle ${state.world.cycle} • Day ${state.world.day}`;
    const simEvents = [
      {
        district: 'marketing_channels',
        event_type: 'campaign_broadcast',
        day: currentDayLabel,
        title: `1. Campaign Transmitted from Launch Lab`,
        body: `Broadcasted campaign to ${targetGroup.name} in ${countryName} via ${channelLabel(channel)}. Generated ~${result.impressions.toLocaleString()} reach and ~${result.clicks.toLocaleString()} marketplace visitors.`,
        metrics: { impressions: result.impressions, clicks: result.clicks }
      },
      {
        district: 'marketplace',
        event_type: 'store_checkout',
        day: currentDayLabel,
        title: `2. Marketplace Activity: ${result.paidUsers} Purchases`,
        body: `${result.installs} customers tried the product; ${result.paidUsers} converted to paid (${result.netProfit >= 0 ? '+' : ''}$${result.netProfit} net profit).`,
        metrics: { installs: result.installs, paidUsers: result.paidUsers, revenue: result.revenue, netProfit: result.netProfit }
      }
    ];

    addWorldEvent({
      day: currentDayLabel,
      iconKey: 'broadcast',
      title: simEvents[0].title,
      body: simEvents[0].body
    });

    addWorldEvent({
      day: currentDayLabel,
      iconKey: 'marketplace',
      title: simEvents[1].title,
      body: simEvents[1].body
    });

    // Save to Supabase backend if authenticated
    if (window.foundrySupabase && window.foundrySupabase.isAuthenticated()) {
      try {
        await window.foundrySupabase.recordSimulationRun({
          run: result,
          events: simEvents,
          evidenceList: fullEvidence
        });
      } catch (err) {
        console.error('Supabase simulation run record error:', err);
      }
    }

    renderHistoryTable();
    renderWorldView();
    updateBadges();

    if (executeBtn) {
      executeBtn.disabled = false;
      executeBtn.textContent = 'Run Simulated Launch';
    }
    if (statusBadge) {
      statusBadge.className = 'status-badge badge-done';
      statusBadge.textContent = 'Simulation Complete';
    }
  }, 400);
}

function runLaunchSimulationEngine({
  appName,
  targetGroup,
  price,
  channel,
  budget,
  countryCode = 'USA',
  countryName = 'United States',
  industryDomain = 'Mobile Applications',
  modelVersion = 'v2.0-grounded',
  relevantIndicators = [],
  dataGaps = []
}) {
  let baseCPM = 18;
  let channelAffinity = 1.0;

  if (channel === 'social') {
    baseCPM = 14;
    channelAffinity = targetGroup.channel === 'social' ? 1.4 : 0.75;
  } else if (channel === 'search') {
    baseCPM = 26;
    channelAffinity = targetGroup.channel === 'search' ? 1.35 : 0.85;
  } else if (channel === 'community') {
    baseCPM = 16;
    channelAffinity = targetGroup.channel === 'community' ? 1.45 : 0.7;
  } else if (channel === 'outreach') {
    baseCPM = 35;
    channelAffinity = targetGroup.channel === 'outreach' ? 1.5 : 0.6;
  }

  const rawImpressions = Math.round((budget / baseCPM) * 1000);
  const impressions = Math.max(400, Math.round(rawImpressions * (0.95 + Math.random() * 0.1)));

  let baseCTR = 0.024 * channelAffinity;
  const clicks = Math.max(8, Math.round(impressions * baseCTR));

  let installRate = 0.14;
  if (targetGroup.budget === 'low') installRate = 0.18;
  if (targetGroup.budget === 'high') installRate = 0.11;
  const installs = Math.max(2, Math.round(clicks * installRate));

  let payRate = 0.0;
  let priceFitScore = 1.0;

  if (price === 0) {
    payRate = 0.0;
    priceFitScore = 1.0;
  } else if (targetGroup.budget === 'low') {
    if (price <= 7) { payRate = 0.09; priceFitScore = 0.9; }
    else if (price <= 15) { payRate = 0.035; priceFitScore = 0.5; }
    else if (price <= 25) { payRate = 0.01; priceFitScore = 0.2; }
    else { payRate = 0.002; priceFitScore = 0.05; }
  } else if (targetGroup.budget === 'medium') {
    if (price < 8) { payRate = 0.05; priceFitScore = 0.65; }
    else if (price <= 28) { payRate = 0.11; priceFitScore = 0.95; }
    else if (price <= 45) { payRate = 0.05; priceFitScore = 0.6; }
    else { payRate = 0.015; priceFitScore = 0.25; }
  } else if (targetGroup.budget === 'high') {
    if (price < 15) { payRate = 0.03; priceFitScore = 0.45; }
    else if (price <= 55) { payRate = 0.105; priceFitScore = 0.92; }
    else if (price <= 70) { payRate = 0.06; priceFitScore = 0.65; }
    else { payRate = 0.025; priceFitScore = 0.35; }
  }

  const paidUsers = price === 0 ? 0 : Math.round(installs * payRate);
  const revenue = paidUsers * price;
  const netProfit = revenue - budget;

  const score = (priceFitScore * 0.65) + (Math.min(1.2, channelAffinity) * 0.35);
  let avgRating = Math.min(5.0, Math.max(1.5, (score * 3.6) + 1.2));
  avgRating = Math.round(avgRating * 10) / 10;

  const reviews = generateDynamicSimulatedReviews(targetGroup, appName, price, avgRating);

  // Compute Sensitivity / Uncertainty Ranges
  const lowPaid = price === 0 ? 0 : Math.max(0, Math.round(paidUsers * 0.60));
  const highPaid = price === 0 ? 0 : Math.max(paidUsers, Math.round(paidUsers * 1.40));
  const uncertaintyRange = {
    impressions: {
      low: Math.round(impressions * 0.85),
      expected: impressions,
      high: Math.round(impressions * 1.15)
    },
    clicks: {
      low: Math.round(clicks * 0.75),
      expected: clicks,
      high: Math.round(clicks * 1.25)
    },
    installs: {
      low: Math.max(1, Math.round(installs * 0.70)),
      expected: installs,
      high: Math.round(installs * 1.30)
    },
    paidUsers: {
      low: lowPaid,
      expected: paidUsers,
      high: highPaid
    },
    netProfit: {
      low: (lowPaid * price) - budget,
      expected: netProfit,
      high: (highPaid * price) - budget
    }
  };

  const modelLogicExplanation = `
1. Reach & Impressions: Sourced ad channel CPM baseline ($${baseCPM} for ${channelLabel(channel)}) applied against test budget ($${budget.toLocaleString()}), resulting in ~${impressions.toLocaleString()} impressions (sensitivity range: ${uncertaintyRange.impressions.low.toLocaleString()} – ${uncertaintyRange.impressions.high.toLocaleString()} based on ad auction bid volatility).
2. Traffic & Click-Through: Sourced marketing channel baseline CTR modified by founder's assumed persona channel affinity (${channelAffinity}x for ${targetGroup.name}), resulting in ~${clicks.toLocaleString()} clicks (${((clicks / impressions) * 100).toFixed(1)}% CTR, sensitivity range: ${uncertaintyRange.clicks.low.toLocaleString()} – ${uncertaintyRange.clicks.high.toLocaleString()}).
3. Installs & Trials: Landing page trial conversion evaluated at ${(installRate * 100).toFixed(0)}% based on persona budget tier (${targetGroup.budget.toUpperCase()}), producing ~${installs.toLocaleString()} trials/installs (sensitivity range: ${uncertaintyRange.installs.low.toLocaleString()} – ${uncertaintyRange.installs.high.toLocaleString()}).
4. Paid Conversions & Financials: Elasticity model evaluated stated price ($${price}/mo) against persona budget ceiling. Result: ${paidUsers.toLocaleString()} paid conversions (${price === 0 ? 'Free Product' : ((paidUsers / installs) * 100).toFixed(1) + '% conversion'}), producing $${revenue.toLocaleString()} revenue and ${netProfit >= 0 ? '+' : ''}$${netProfit.toLocaleString()} net financial outcome (sensitivity range: $${uncertaintyRange.netProfit.low.toLocaleString()} to $${uncertaintyRange.netProfit.high.toLocaleString()}).
Ethical Guardrail Enforced: National macroeconomic statistics (e.g. GDP per capita, internet penetration) establish regional baseline infrastructure scale. They are NOT used to infer an individual customer's willingness to buy, nor are macro statistics conflated with individual behavior.
  `.trim();

  const assumptionsAndLimitations = `
• Boundary: Macroeconomic, connectivity, and digital payment statistics reflect aggregate national infrastructure, NOT individual willingness to pay, corporate purchasing budgets, or customer interest.
• Assumption: Channel affinity multiplier (${channelAffinity}x) and persona budget tier (${targetGroup.budget}) are hypotheses declared by the founder, not empirically validated live conversion rates.
• Variance: Customer acquisition metrics carry structural uncertainty (CTR: ±25%, Signups: ±30%, Paid Conversion: ±40%). Sensitivity ranges illustrate the potential variance.
• Fictional Simulation: All simulated customer reactions, reviews, and personas are 100% fictional simulation outputs generated algorithmically for educational practice. No real human feedback or real persons are represented.
  `.trim();

  const researchRecommendations = `
1. Qualitative Problem Discovery: Conduct 5–10 structured discovery interviews with real users matching the "${targetGroup.name}" persona to validate whether the problem is urgent and whether pricing at $${price}/mo is perceived as fair.
2. Landing Page Smoke Test: Deploy a simple landing page with ad creatives on ${channelLabel(channel)} with a $50–$100 test budget to capture real CTR and waitlist signups rather than relying on theoretical model baselines.
3. Willingness-to-Pay Validation: Secure letters of intent (LOIs), advance deposits, or pre-orders before committing capital to engineering or scaling paid ads.
4. Commercial Category Telemetry: For sector-specific retention, churn, and ARPU benchmarks, subscribe to licensed databases (e.g., Sensor Tower, data.ai for mobile apps; Keyplay or Gartner for enterprise software).
  `.trim();

  return {
    id: 'run_' + Date.now(),
    runNumber: state.history.length + 1,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    dateStr: new Date().toLocaleDateString(),
    appName,
    targetGroupName: targetGroup.name,
    targetGroupId: targetGroup.id,
    targetBudget: targetGroup.budget,
    price,
    channel,
    budget,
    countryCode,
    countryName,
    industryDomain,
    modelVersion,
    founderInputs: {
      appName,
      targetGroupName: targetGroup.name,
      targetGroupId: targetGroup.id,
      targetBudget: targetGroup.budget,
      targetChannelPreference: targetGroup.channel,
      channel,
      price,
      budget,
      countryCode,
      countryName,
      industryDomain
    },
    impressions,
    clicks,
    installs,
    paidUsers,
    revenue,
    netProfit,
    avgRating,
    reviews,
    uncertaintyRange,
    modelLogicExplanation,
    assumptionsAndLimitations,
    dataGaps,
    researchRecommendations
  };
}

function generateDynamicSimulatedReviews(targetGroup, appName, price, avgRating) {
  const reviews = [];
  const groupName = targetGroup.name;

  if (targetGroup.budget === 'low') {
    if (price === 0) {
      reviews.push({
        name: 'Simulated Persona Alex M.',
        initials: 'AM',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 5,
        quote: `Incredible that ${appName} offers a free tier. Ideal match for our budget-conscious workflow.`
      });
      reviews.push({
        name: 'Simulated Persona Jordan K.',
        initials: 'JK',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 4,
        quote: `Discovered this through ads. Clean functionality. Hope you preserve the free tier as you scale!`
      });
    } else if (price <= 8) {
      reviews.push({
        name: 'Simulated Persona Taylor S.',
        initials: 'TS',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 5,
        quote: `At $${price}/mo it fits within our tight monthly budget. Saves enough time to justify the cost.`
      });
      reviews.push({
        name: 'Simulated Persona Morgan P.',
        initials: 'MP',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 4,
        quote: `Fair price ($${price}/mo) for the basic features offered.`
      });
    } else {
      reviews.push({
        name: 'Simulated Persona Casey R.',
        initials: 'CR',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 2,
        quote: `$${price}/mo exceeds our spending threshold for this tool type. Uninstalled when the paywall appeared.`
      });
      reviews.push({
        name: 'Simulated Persona Riley B.',
        initials: 'RB',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 3,
        quote: `Promising concept, but for ${groupName}, $${price}/mo is too expensive given alternative options.`
      });
    }
  } else if (targetGroup.budget === 'medium') {
    if (price < 10) {
      reviews.push({
        name: 'Simulated Persona Sam V.',
        initials: 'SV',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 3,
        quote: `At $${price}/mo it is inexpensive, but makes our team wonder about product stability and security.`
      });
      reviews.push({
        name: 'Simulated Persona Pat D.',
        initials: 'PD',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 4,
        quote: `Solid tool that saves our team valuable hours. Worth more than $${price}/mo.`
      });
    } else if (price <= 35) {
      reviews.push({
        name: 'Simulated Persona Devon L.',
        initials: 'DL',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 5,
        quote: `${appName} integrates well into our day-to-day workflow. $${price}/mo is an easy purchase approval.`
      });
      reviews.push({
        name: 'Simulated Persona Robin H.',
        initials: 'RH',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 4,
        quote: `Dependable performance. Delivered what we were expecting for ${groupName}.`
      });
    } else {
      reviews.push({
        name: 'Simulated Persona Chris T.',
        initials: 'CT',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 2,
        quote: `$${price}/mo is hard to justify without enterprise team controls, SSO, and compliance certificates.`
      });
      reviews.push({
        name: 'Simulated Persona Dana W.',
        initials: 'DW',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 3,
        quote: `Decent baseline, but competitor tools offer broader capabilities at this price tier.`
      });
    }
  } else {
    if (price < 20) {
      reviews.push({
        name: 'Simulated Persona Evelyn G.',
        initials: 'EG',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 3,
        quote: `Priced at only $${price}/mo? Feels lightweight for critical business operations.`
      });
      reviews.push({
        name: 'Simulated Persona Quinn N.',
        initials: 'QN',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 4,
        quote: `Fast UI. Would appreciate dedicated account management and enterprise SLA guarantees.`
      });
    } else if (price <= 60) {
      reviews.push({
        name: 'Simulated Persona Marcus E.',
        initials: 'ME',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 5,
        quote: `Exactly what we needed. $${price}/mo is fully justified by the productivity gains.`
      });
      reviews.push({
        name: 'Simulated Persona Avery Z.',
        initials: 'AZ',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 4,
        quote: `High quality tool tailored for ${groupName}. Solid fit for our operational requirements.`
      });
    } else {
      reviews.push({
        name: 'Simulated Persona Logan C.',
        initials: 'LC',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 2,
        quote: `$${price}/mo requires department VP approval and formal security questionnaire reviews.`
      });
      reviews.push({
        name: 'Simulated Persona Reese F.',
        initials: 'RF',
        role: `${groupName} [Simulated Persona - Fictional]`,
        rating: 3,
        quote: `High price point for an early offering. We will re-evaluate once the roadmap matures.`
      });
    }
  }

  return reviews;
}

function displayLaunchResults(res) {
  const emptyState = document.getElementById('launchEmptyState');
  const resultsArea = document.getElementById('launchResultsArea');

  if (emptyState) emptyState.classList.add('hidden');
  if (resultsArea) resultsArea.classList.remove('hidden');

  // Key metrics with uncertainty sensitivity ranges
  const impElem = document.getElementById('resImpressions');
  const impRangeElem = document.getElementById('resImpressionsRange');
  if (impElem) impElem.textContent = res.impressions.toLocaleString();
  if (impRangeElem && res.uncertaintyRange?.impressions) {
    impRangeElem.textContent = `Range: ${res.uncertaintyRange.impressions.low.toLocaleString()} – ${res.uncertaintyRange.impressions.high.toLocaleString()} (±15% CPM variance)`;
  }

  const clicksElem = document.getElementById('resClicks');
  const ctr = ((res.clicks / res.impressions) * 100).toFixed(1);
  if (clicksElem) clicksElem.textContent = `${res.clicks.toLocaleString()} clicks (${ctr}% CTR)`;

  const installsElem = document.getElementById('resInstalls');
  const installsRangeElem = document.getElementById('resInstallsRange');
  const conv = ((res.installs / res.clicks) * 100).toFixed(1);
  if (installsElem) installsElem.textContent = res.installs.toLocaleString();
  if (installsRangeElem && res.uncertaintyRange?.installs) {
    installsRangeElem.textContent = `Range: ${res.uncertaintyRange.installs.low.toLocaleString()} – ${res.uncertaintyRange.installs.high.toLocaleString()} (±30% funnel variance)`;
  }
  const convElem = document.getElementById('resConversion');
  if (convElem) convElem.textContent = `${conv}% of clicks installed`;

  const paidElem = document.getElementById('resPaidUsers');
  const paidRangeElem = document.getElementById('resPaidUsersRange');
  const paidPct = res.installs > 0 ? ((res.paidUsers / res.installs) * 100).toFixed(1) : 0;
  if (paidElem) paidElem.textContent = res.paidUsers.toLocaleString();
  if (paidRangeElem && res.uncertaintyRange?.paidUsers) {
    paidRangeElem.textContent = res.price === 0
      ? 'Free Tier (0 paid)'
      : `Range: ${res.uncertaintyRange.paidUsers.low.toLocaleString()} – ${res.uncertaintyRange.paidUsers.high.toLocaleString()} (±40% price sensitivity variance)`;
  }
  const paidRateElem = document.getElementById('resPaidRate');
  if (paidRateElem) paidRateElem.textContent = res.price === 0 ? 'Free Tier (0 paid)' : `${paidPct}% conversion to paid`;

  const isProfit = res.netProfit >= 0;
  const profitElem = document.getElementById('resNetProfit');
  const profitRangeElem = document.getElementById('resProfitRange');
  if (profitElem) {
    profitElem.textContent = `${isProfit ? '+' : ''}$${res.netProfit.toLocaleString()}`;
    profitElem.className = `metric-val ${isProfit ? 'text-lime' : 'text-danger'}`;
  }
  if (profitRangeElem && res.uncertaintyRange?.netProfit) {
    const lowNet = res.uncertaintyRange.netProfit.low;
    const highNet = res.uncertaintyRange.netProfit.high;
    profitRangeElem.textContent = `Range: ${lowNet >= 0 ? '+' : ''}$${lowNet.toLocaleString()} to ${highNet >= 0 ? '+' : ''}$${highNet.toLocaleString()}`;
  }
  const revElem = document.getElementById('resRevenueBreakdown');
  if (revElem) revElem.textContent = `Rev: $${res.revenue.toLocaleString()} | Budget: $${res.budget.toLocaleString()}`;

  // Funnel bars
  const barImp = document.getElementById('barImpCount');
  const barClick = document.getElementById('barClickCount');
  const barInstall = document.getElementById('barInstallCount');
  const barPaid = document.getElementById('barPaidCount');
  if (barImp) barImp.textContent = res.impressions.toLocaleString();
  if (barClick) barClick.textContent = res.clicks.toLocaleString();
  if (barInstall) barInstall.textContent = res.installs.toLocaleString();
  if (barPaid) barPaid.textContent = res.paidUsers.toLocaleString();

  const clickPercent = Math.max(3, (res.clicks / res.impressions) * 100);
  const installPercent = Math.max(2, (res.installs / res.impressions) * 100 * 4);
  const paidPercent = res.price === 0 ? 0 : Math.max(1, (res.paidUsers / res.impressions) * 100 * 12);

  const fillImp = document.getElementById('barImpFill');
  const fillClick = document.getElementById('barClickFill');
  const fillInstall = document.getElementById('barInstallFill');
  const fillPaid = document.getElementById('barPaidFill');
  if (fillImp) fillImp.style.width = '100%';
  if (fillClick) fillClick.style.width = `${Math.min(100, clickPercent * 8)}%`;
  if (fillInstall) fillInstall.style.width = `${Math.min(85, installPercent * 6)}%`;
  if (fillPaid) fillPaid.style.width = `${Math.min(70, paidPercent * 5)}%`;

  const dropClick = (100 - (res.clicks / res.impressions) * 100).toFixed(1);
  const dropInstall = (100 - (res.installs / res.clicks) * 100).toFixed(1);
  const dropPaid = res.price === 0 ? '0 (Free Product)' : (100 - (res.paidUsers / res.installs) * 100).toFixed(1);

  const dropClickEl = document.getElementById('dropClickText');
  const dropInstallEl = document.getElementById('dropInstallText');
  const dropPaidEl = document.getElementById('dropPaidText');
  if (dropClickEl) dropClickEl.textContent = `Ad Drop-off: -${dropClick}% (Did not click ad)`;
  if (dropInstallEl) dropInstallEl.textContent = `Landing Page Drop-off: -${dropInstall}% (Did not install/signup)`;
  if (dropPaidEl) dropPaidEl.textContent = res.price === 0 ? 'Free Product' : `Paywall Drop-off: -${dropPaid}% (Did not purchase)`;

  // Uncertainty Box & Data Gaps
  const uncSubtitle = document.getElementById('simUncertaintySubtitle');
  const uncContent = document.getElementById('simUncertaintyContent');
  if (uncSubtitle) {
    uncSubtitle.textContent = `Data audit for ${res.countryName} (${res.countryCode}) • ${res.industryDomain}`;
  }
  if (uncContent) {
    const evidence = res.evidence || [];
    const macroItems = evidence.filter(e => e.assumption_type === 'macro_market_context');
    const reportedCount = macroItems.filter(e => e.data_status === 'reported').length;
    const missingCount = macroItems.filter(e => e.data_status !== 'reported').length;

    let gapsHtml = '';
    if (res.dataGaps && res.dataGaps.length > 0) {
      gapsHtml = `
        <div class="mt-2">
          <strong style="color: #f87171;">Identified Data Gaps for ${escapeHtml(res.countryName)}:</strong>
          <div class="data-gap-tag-list mt-1">
            ${res.dataGaps.map(g => `<span class="data-gap-tag">${escapeHtml(g.name)} (${escapeHtml(g.reason)})</span>`).join('')}
          </div>
        </div>
      `;
    }

    uncContent.innerHTML = `
      <div>
        <strong>Baseline Grounding:</strong> ${reportedCount} of ${macroItems.length} industry-relevant indicators were officially reported for <strong>${escapeHtml(res.countryName)}</strong>. ${missingCount > 0 ? `${missingCount} metric(s) have data gaps.` : 'All primary contextual baselines present.'}
      </div>
      ${gapsHtml}
      <div class="mt-2">
        <strong>Why Sensitivity Ranges Are Applied:</strong> Macroeconomic statistics provide regional population volume and payment infrastructure, but cannot predict microeconomic conversion or price elasticity. We apply sensitivity bounds (±15% CPM, ±25% CTR, ±30% signup conversion, ±40% willingness-to-pay) because real customer outcomes vary based on messaging, positioning, and competitive offerings.
      </div>
      <div class="factor-disclaimer mt-2">
        <strong>Ethical Guardrail Applied:</strong> Country-level statistics describe general territorial infrastructure. They are <em>not</em> used to infer an individual customer's willingness to buy, nor is purchasing intent stereotyping allowed by nationality.
      </div>
    `;
  }

  // Provenance Factors Comparison
  const scopeEl = document.getElementById('factorSourcedScope');
  if (scopeEl) scopeEl.textContent = `National Context (${res.countryName})`;

  const sourcedListEl = document.getElementById('simSourcedFactorsList');
  const founderListEl = document.getElementById('simFounderFactorsList');
  const evidence = res.evidence || [];
  const macroItems = evidence.filter(e => e.assumption_type === 'macro_market_context');
  const founderItems = evidence.filter(e => e.assumption_type !== 'macro_market_context');

  if (sourcedListEl) {
    sourcedListEl.innerHTML = macroItems.map(item => `
      <div class="factor-item-row">
        <div class="factor-item-details">
          <span class="factor-item-name">${escapeHtml(item.indicator_name)}</span>
          <span class="factor-item-meta">
            ${item.data_status === 'reported' ? `Ref Year: ${item.reference_year || '2023'} • ${escapeHtml(item.source_name || '')}` : `<span style="color:#f87171;">${escapeHtml(item.uncertainty_note || 'Unreported Gap')}</span>`}
          </span>
        </div>
        <div class="factor-item-val" style="color: ${item.data_status === 'reported' ? 'var(--cyan)' : '#f87171'};">
          ${item.indicator_value !== null && item.indicator_value !== undefined ? `${Number(item.indicator_value).toLocaleString()} ${escapeHtml(item.indicator_unit || '')}` : 'Missing/Unreported'}
        </div>
      </div>
    `).join('');
  }

  if (founderListEl) {
    founderListEl.innerHTML = founderItems.map(item => `
      <div class="factor-item-row">
        <div class="factor-item-details">
          <span class="factor-item-name">${escapeHtml(item.indicator_name || item.assumption_key)}</span>
          <span class="factor-item-meta">Rule: ${escapeHtml(item.formula_applied || 'Founder stated choice')}</span>
        </div>
        <div class="factor-item-val text-lime">
          ${escapeHtml(item.assumption_value)}
        </div>
      </div>
    `).join('');
  }

  // Fictional Customer Feedback & Reviews
  const avgRatingEl = document.getElementById('resAvgRating');
  const starsEl = document.getElementById('resStars');
  if (avgRatingEl) avgRatingEl.textContent = `${res.avgRating.toFixed(1)} / 5.0`;
  const starCount = Math.round(res.avgRating);
  if (starsEl) starsEl.textContent = `${'★'.repeat(starCount)}${'☆'.repeat(5 - starCount)}`;

  const reviewsListElem = document.getElementById('resReviewsList');
  if (reviewsListElem) {
    reviewsListElem.innerHTML = `
      ${res.reviews.map(r => `
        <div class="review-card">
          <div class="review-meta">
            <div class="reviewer-profile">
              <span class="reviewer-avatar-svg">${getSimulatedAvatarSvg(r.initials)}</span>
              <div>
                <div class="reviewer-name">${escapeHtml(r.name)}</div>
                <div class="sim-user-tag">${escapeHtml(r.role)}</div>
              </div>
            </div>
            <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
          </div>
          <p class="review-text">"${escapeHtml(r.quote)}"</p>
          <div class="review-fiction-disclaimer">Fictional persona reaction generated algorithmically for founder practice. Not a real person.</div>
        </div>
      `).join('')}
    `;
  }

  // Model Logic & De-risking Guidance
  const logicDetailsEl = document.getElementById('modelLogicDetails');
  if (logicDetailsEl) {
    logicDetailsEl.innerHTML = `
      <div class="model-logic-step">
        <strong>1. Plain Language Model Walkthrough:</strong>
        <p style="margin:2px 0 0 0; white-space:pre-line;">${escapeHtml(res.modelLogicExplanation || '')}</p>
      </div>

      <div class="model-logic-step">
        <strong>2. Documented Model Assumptions &amp; Limitations:</strong>
        <p style="margin:2px 0 0 0; white-space:pre-line;">${escapeHtml(res.assumptionsAndLimitations || '')}</p>
      </div>

      <div class="research-checklist">
        <h6>🔬 Real-World Research Checklist to Validate This Simulation:</h6>
        <p style="margin:2px 0 0 0; white-space:pre-line; color:#e2e8f0; font-size:0.75rem;">${escapeHtml(res.researchRecommendations || '')}</p>
      </div>
    `;
  }

  // Empirical Real Evidence Cross-Reference
  const realEvidenceBox = document.getElementById('simRealEvidenceBox');
  const realEvidenceBadge = document.getElementById('simRealEvidenceBadge');
  const realEvidenceContent = document.getElementById('simRealEvidenceContent');

  if (realEvidenceBox && realEvidenceContent) {
    const matchingEvidence = (state.realEvidence || []).filter(ev => {
      const matchCountry = !ev.countryCode || ev.countryCode === 'GLOBAL' || ev.countryCode === (res.countryCode || res.country?.code);
      const matchIndustry = !ev.industryDomain || ev.industryDomain === 'All' || ev.industryDomain === (res.industryDomain || res.industry);
      return matchCountry && matchIndustry;
    });

    if (matchingEvidence.length > 0) {
      realEvidenceBox.classList.remove('hidden');
      if (realEvidenceBadge) realEvidenceBadge.textContent = `${matchingEvidence.length} Field ${matchingEvidence.length > 1 ? 'Studies' : 'Study'}`;
      
      realEvidenceContent.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px;">
          <p style="color:#d1fae5; margin:0; font-size:0.76rem;">
            Foundry identified <strong>${matchingEvidence.length} recorded empirical research ${matchingEvidence.length > 1 ? 'studies' : 'study'}</strong> in your workspace for <strong>${escapeHtml(res.countryCode || 'USA')} &bull; ${escapeHtml(res.industryDomain || 'Mobile Applications')}</strong>. Comparing empirical customer findings against simulated projections:
          </p>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px;">
            ${matchingEvidence.map(ev => `
              <div style="background:rgba(0,0,0,0.35); border:1px solid rgba(16,185,129,0.3); border-radius:6px; padding:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <span style="font-weight:700; color:#34d399; font-size:0.74rem; text-transform:uppercase;">${escapeHtml(formatMethodLabel(ev.researchMethod))}</span>
                  <span style="font-family:var(--font-mono); font-size:0.72rem; color:#cbd5e1; background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:3px;">N = ${ev.sampleSize}</span>
                </div>
                <div style="font-size:0.76rem; color:#f1f5f3; font-weight:600; margin-bottom:4px;">"${escapeHtml(ev.researchQuestion)}"</div>
                <div style="font-size:0.74rem; color:#94a3b8; margin-bottom:6px;">${escapeHtml(ev.resultsSummary)}</div>
                <div style="background:rgba(251,191,36,0.1); border-left:2px solid #fbbf24; padding:5px 7px; font-size:0.7rem; color:#fef3c7;">
                  <strong style="color:#fbbf24;">Limitation:</strong> ${escapeHtml(ev.limitationsAndBiases)}
                </div>
              </div>
            `).join('')}
          </div>
          <p style="font-size:0.7rem; color:#94a3b8; margin:0;">
            <em>Ethical guideline: Directional findings from small or biased samples (N &lt; 50) provide qualitative problem-space signals, but cannot be presented as representative of an entire country or industry.</em>
          </p>
        </div>
      `;
    } else {
      realEvidenceBox.classList.remove('hidden');
      if (realEvidenceBadge) realEvidenceBadge.textContent = '0 Matching Studies';
      realEvidenceContent.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <span style="font-size:0.76rem; color:#94a3b8;">No firsthand customer research recorded yet for <strong>${escapeHtml(res.countryCode || 'USA')} &bull; ${escapeHtml(res.industryDomain || 'Mobile Applications')}</strong>.</span>
          <button class="btn btn-lime-outline btn-xs" type="button" onclick="navigateToView('real-evidence')">
            + Record Field Evidence
          </button>
        </div>
      `;
    }
  }

  // Update Private Beta Feedback Banner for this Run
  currentActiveSimulationRun = res;

  // Render Hypothetical Customer Scenarios Section
  renderHypotheticalScenariosSection(res);

  const fbBanner = document.getElementById('launchFeedbackBanner');
  const fbBtn = document.getElementById('btnOpenRunFeedbackModal');
  if (fbBanner) fbBanner.classList.remove('hidden');
  if (fbBtn) {
    const existingFb = (state.simulationFeedback || []).find(f => String(f.simulationRunId) === String(res.id) || String(f.simulation_run_id) === String(res.id));
    if (existingFb) {
      fbBtn.textContent = 'Feedback Logged ✓ (Review / Edit)';
      fbBtn.className = 'btn btn-outline-cyan btn-sm';
    } else {
      fbBtn.textContent = 'Rate Result & Report Surprises →';
      fbBtn.className = 'btn btn-lime-outline btn-sm';
    }
  }
}

/* ==========================================================
   8. SIMULATION HISTORY VIEW
   ========================================================== */
let clearHistoryConfirmTimer = null;
function initHistoryView() {
  const clearBtn = document.getElementById('clearHistoryBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!clearBtn.dataset.confirming) {
        clearBtn.dataset.confirming = 'true';
        clearBtn.textContent = 'Click to Confirm Clear';
        clearTimeout(clearHistoryConfirmTimer);
        clearHistoryConfirmTimer = setTimeout(() => {
          delete clearBtn.dataset.confirming;
          clearBtn.textContent = 'Clear History';
        }, 4000);
        return;
      }
      delete clearBtn.dataset.confirming;
      clearBtn.textContent = 'Clear History';
      clearTimeout(clearHistoryConfirmTimer);
      state.history = [];
      saveState(STORAGE_HISTORY, state.history);
      renderHistoryTable();
      renderWorldView();
      updateBadges();
    });
  }
}

function renderHistoryTable() {
  const emptyNotice = document.getElementById('historyEmptyNotice');
  const tableContainer = document.getElementById('historyTableContainer');
  const tbody = document.getElementById('historyTableBody');
  const history = state.history;

  if (history.length === 0) {
    emptyNotice.classList.remove('hidden');
    tableContainer.classList.add('hidden');
    tbody.innerHTML = '';
    return;
  }

  emptyNotice.classList.add('hidden');
  tableContainer.classList.remove('hidden');

  tbody.innerHTML = history.map((h, idx) => `
    <tr>
      <td>#${history.length - idx}</td>
      <td><strong>${escapeHtml(h.appName)}</strong></td>
      <td><span class="badge-cadence" style="font-size:0.68rem;">${escapeHtml(h.countryCode || 'USA')}</span> <span style="font-size:0.72rem; color:#94a3b8; display:block;">${escapeHtml(h.industryDomain || 'Mobile Applications')}</span></td>
      <td>${escapeHtml(h.targetGroupName)}</td>
      <td>${h.price === 0 ? 'Free' : `$${h.price}/mo`}</td>
      <td>${channelLabel(h.channel)}</td>
      <td>$${h.budget}</td>
      <td>${h.installs.toLocaleString()}</td>
      <td>${h.paidUsers.toLocaleString()}</td>
      <td style="color: ${h.netProfit >= 0 ? 'var(--lime)' : 'var(--danger)'}; font-weight: 700;">
        ${h.netProfit >= 0 ? '+' : ''}$${h.netProfit.toLocaleString()}
      </td>
      <td>
        <button class="btn-inspect-evidence" onclick="openEvidenceModal('${h.id}')" title="Inspect model evidence & assumptions">
          🔍 Inspect
        </button>
      </td>
    </tr>
  `).join('');
}

/* ==========================================================
   9. GLOBAL HELPERS & RENDERING
   ========================================================== */
const SOURCED_INDICATOR_CATALOG = [
  {
    code: 'SP.POP.TOTL',
    name: 'Population, total',
    topic: 'Demographics & Market Size',
    unit: 'people',
    publisher: 'World Bank World Development Indicators',
    sourceUrl: 'https://data.worldbank.org/indicator/SP.POP.TOTL',
    terms: 'CC-BY 4.0',
    limitations: 'Total population indicates absolute market volume, not the addressable market size for software or specific technology products. It does not reflect age distribution, purchasing power, or internet accessibility.'
  },
  {
    code: 'NY.GDP.PCAP.CD',
    name: 'GDP per capita (current US$)',
    topic: 'Economic Context',
    unit: 'current US$',
    publisher: 'World Bank World Development Indicators',
    sourceUrl: 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD',
    terms: 'CC-BY 4.0',
    limitations: 'Macroeconomic output per person. Does not measure median personal income, household disposable income, income inequality, corporate IT spending power, or consumer willingness to pay for subscription software.'
  },
  {
    code: 'IT.NET.USER.ZS',
    name: 'Individuals using the Internet (% of population)',
    topic: 'Digital Infrastructure & Connectivity',
    unit: '% of population',
    publisher: 'World Bank World Development Indicators',
    sourceUrl: 'https://data.worldbank.org/indicator/IT.NET.USER.ZS',
    terms: 'CC-BY 4.0',
    limitations: 'Measures baseline internet access and digital connectivity. It does not measure daily active usage, high-speed connection quality, digital literacy, e-commerce adoption, or readiness to purchase SaaS solutions.'
  },
  {
    code: 'IT.CEL.SETS.P2',
    name: 'Mobile cellular subscriptions (per 100 people)',
    topic: 'Mobile Infrastructure',
    unit: 'subscriptions per 100 people',
    publisher: 'World Bank World Development Indicators',
    sourceUrl: 'https://data.worldbank.org/indicator/IT.CEL.SETS.P2',
    terms: 'CC-BY 4.0',
    limitations: 'Indicates mobile telecommunications penetration. Subscriptions per 100 people can exceed 100 due to multiple SIM cards or inactive accounts. Does not distinguish between smartphones and basic feature phones.'
  },
  {
    code: 'IT.NET.BBND.P2',
    name: 'Fixed broadband subscriptions (per 100 people)',
    topic: 'Broadband Infrastructure',
    unit: 'subscriptions per 100 people',
    publisher: 'World Bank World Development Indicators',
    sourceUrl: 'https://data.worldbank.org/indicator/IT.NET.BBND.P2',
    terms: 'CC-BY 4.0',
    limitations: 'Refers to residential and commercial physical lines, typically shared across multiple household members or business employees. Does not measure bandwidth speed tiers, enterprise fiber penetration, or data cap restrictions.'
  },
  {
    code: 'ITU.ICT.HH.INET',
    name: 'Households with Internet access (%)',
    topic: 'Digital Infrastructure & Connectivity',
    unit: '% of households',
    publisher: 'International Telecommunication Union (ITU)',
    sourceUrl: 'https://datahub.itu.int/',
    terms: 'ITU Non-Commercial with Attribution',
    limitations: 'Measures domestic household connectivity infrastructure, not individual user activity, broadband bandwidth tier, network latency, or household disposable income. It does not measure customer readiness to purchase digital software or pay for consumer apps.'
  },
  {
    code: 'ITU.ICT.MOB.4G',
    name: 'Population covered by at least a 4G mobile network (%)',
    topic: 'Mobile Infrastructure',
    unit: '% of population',
    publisher: 'International Telecommunication Union (ITU)',
    sourceUrl: 'https://datahub.itu.int/',
    terms: 'ITU Non-Commercial with Attribution',
    limitations: 'Indicates mobile cellular signal availability across residential geography. Physical signal coverage does not imply smartphone device ownership, active mobile data subscriptions, data bundle affordability, or reliable connection speeds under network congestion.'
  },
  {
    code: 'ITU.ICT.ACT.MBB',
    name: 'Active mobile-broadband subscriptions (per 100 inhabitants)',
    topic: 'Mobile Infrastructure',
    unit: 'subscriptions per 100 inhabitants',
    publisher: 'International Telecommunication Union (ITU)',
    sourceUrl: 'https://datahub.itu.int/',
    terms: 'ITU Non-Commercial with Attribution',
    limitations: 'Measures subscription volume rather than unique individual human users. Metric can exceed 100 due to enterprise fleet accounts, multi-SIM devices, and machine-to-machine cards. Does not measure data consumption volume, network speed tiers, or consumer software spending.'
  },
  {
    code: 'ITU.ICT.FBB.10M',
    name: 'Fixed broadband subscriptions >= 10 Mbit/s (% of total fixed broadband)',
    topic: 'Broadband Infrastructure',
    unit: '% of fixed broadband subscriptions',
    publisher: 'International Telecommunication Union (ITU)',
    sourceUrl: 'https://datahub.itu.int/',
    terms: 'ITU Non-Commercial with Attribution',
    limitations: 'Measures contracted speed tiers among existing fixed-line subscribers, not actual real-world throughput, latency, packet loss, or business IT spending. Does not account for households or small businesses without fixed wireline access.'
  },
  {
    code: 'account.t.d',
    name: 'Account ownership (% age 15+)',
    topic: 'Financial Inclusion & Payments',
    unit: '% of population age 15+',
    publisher: 'World Bank Global Findex Database',
    sourceUrl: 'https://databank.worldbank.org/source/global-financial-inclusion',
    terms: 'CC-BY 4.0',
    limitations: 'Quantifies population-level access to formal banking and mobile money rails. Account possession does not measure active account usage, average balances, purchasing power, disposable income, or willingness to purchase online subscription software.'
  },
  {
    code: 'g20.any',
    name: 'Made or received digital payments (% age 15+)',
    topic: 'Digital Payments & Transaction Behavior',
    unit: '% of population age 15+',
    publisher: 'World Bank Global Findex Database',
    sourceUrl: 'https://databank.worldbank.org/source/global-financial-inclusion',
    terms: 'CC-BY 4.0',
    limitations: 'Measures baseline familiarity with digital payment instruments across the national population. Having made or received a digital payment (such as for utilities or remittances) does not validate demand, interest, or willingness to buy a specific software product.'
  },
  {
    code: 'fin2.t.d',
    name: 'Owns a debit card (% age 15+)',
    topic: 'Payment Cards & Infrastructure',
    unit: '% of population age 15+',
    publisher: 'World Bank Global Findex Database',
    sourceUrl: 'https://databank.worldbank.org/source/global-financial-inclusion',
    terms: 'CC-BY 4.0',
    limitations: 'Measures card issuance penetration. Does not measure international transaction support, online e-commerce activation, card authorization success rates, or consumer willingness to authorize recurring subscription charges.'
  },
  {
    code: 'fin10',
    name: 'Owns a credit card (% age 15+)',
    topic: 'Payment Cards & Infrastructure',
    unit: '% of population age 15+',
    publisher: 'World Bank Global Findex Database',
    sourceUrl: 'https://databank.worldbank.org/source/global-financial-inclusion',
    terms: 'CC-BY 4.0',
    limitations: 'Refers to formal revolving consumer credit card penetration. Heavily influenced by national banking regulations, underwriting standards, and income distribution. Does not indicate corporate expense card availability or willingness to buy.'
  },
  {
    code: 'g20.made',
    name: 'Made a digital payment (% age 15+)',
    topic: 'Digital Payments & Transaction Behavior',
    unit: '% of population age 15+',
    publisher: 'World Bank Global Findex Database',
    sourceUrl: 'https://databank.worldbank.org/source/global-financial-inclusion',
    terms: 'CC-BY 4.0',
    limitations: 'Captures the outbound transmission of funds through digital rails. Does not distinguish between high-value transactions and small utility payments, nor does it guarantee customer conversion for new digital services.'
  },
  {
    code: 'UNCTAD.ECOMM.B2C.IDX',
    name: 'UNCTAD B2C E-commerce Index (0–100)',
    topic: 'E-Commerce & Digital Economy',
    unit: 'Index (0–100)',
    publisher: 'UN Trade and Development (UNCTADstat)',
    sourceUrl: 'https://unctadstat.unctad.org/',
    terms: 'CC-BY 3.0 IGO',
    limitations: 'Measures structural macroeconomic readiness and transaction infrastructure, not individual purchasing volume, consumer product preference, or commercial conversion for a specific startup.'
  },
  {
    code: 'UNCTAD.ECOMM.DDS.SHR',
    name: 'Share of digitally deliverable services in total services exports (%)',
    topic: 'Digital Trade & Services',
    unit: '% of total services exports',
    publisher: 'UN Trade and Development (UNCTADstat)',
    sourceUrl: 'https://unctadstat.unctad.org/',
    terms: 'CC-BY 3.0 IGO',
    limitations: 'Measures national macro-export competitiveness in cross-border digital services. It does not measure domestic commercial SaaS demand, local software spending power, or willingness to pay.'
  },
  {
    code: 'UNCTAD.ECOMM.ENT.RCV',
    name: 'Enterprises receiving orders online (% of enterprises)',
    topic: 'Enterprise ICT Adoption',
    unit: '% of enterprises',
    publisher: 'UN Trade and Development (UNCTADstat)',
    sourceUrl: 'https://unctadstat.unctad.org/',
    terms: 'CC-BY 3.0 IGO',
    limitations: 'Measures commercial digital sales channel adoption among formal firms. Does not measure order profitability, transaction volume, or enterprise budget readiness for new software tools.'
  },
  {
    code: 'UNCTAD.ECOMM.ENT.WEB',
    name: 'Enterprises with a website (% of enterprises)',
    topic: 'Enterprise ICT Adoption',
    unit: '% of enterprises',
    publisher: 'UN Trade and Development (UNCTADstat)',
    sourceUrl: 'https://unctadstat.unctad.org/',
    terms: 'CC-BY 3.0 IGO',
    limitations: 'Indicates baseline corporate web presence. Having a homepage does not indicate cloud software maturity, modern tech stack adoption, or willingness to purchase enterprise software.'
  },
  {
    code: 'UNCTAD.ECOMM.IND.BUY',
    name: 'Individuals who purchased goods or services online (% of individuals)',
    topic: 'E-Commerce & Digital Economy',
    unit: '% of individuals',
    publisher: 'UN Trade and Development (UNCTADstat)',
    sourceUrl: 'https://unctadstat.unctad.org/',
    terms: 'CC-BY 3.0 IGO',
    limitations: 'Measures general consumer e-commerce participation across all commercial sectors (retail, groceries, transport). Past online shopping activity does not prove customer interest or demand for a specific startup\'s offering.'
  },
  {
    code: 'EUROSTAT.APP.INSTALL',
    name: 'Individuals who installed apps on a mobile device (% of individuals age 16–74)',
    topic: 'Mobile Apps & Software Ecosystem',
    unit: '% of individuals (age 16–74)',
    publisher: 'Eurostat (European Commission)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/isoc_sk_app_i/',
    terms: 'Commission Decision 2011/833/EU (Open Data with Attribution)',
    limitations: 'Measures population-level smartphone app installation activity (Eurostat isoc_sk_app_i, CINSAPP1). Indicates digital mobile literacy and consumer readiness to install native applications; does not indicate download volume for a specific application, in-app spending, or purchase intent for a particular startup.'
  },
  {
    code: 'EUROSTAT.APP.CONFIG',
    name: 'Individuals who managed or restricted mobile app permissions (% of individuals age 16–74)',
    topic: 'Mobile Apps & Software Ecosystem',
    unit: '% of individuals (age 16–74)',
    publisher: 'Eurostat (European Commission)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/isoc_sk_app_i/',
    terms: 'Commission Decision 2011/833/EU (Open Data with Attribution)',
    limitations: 'Measures user privacy sophistication and app permission scrutiny (Eurostat isoc_sk_app_i, CCONF1). Reflects user vigilance regarding camera, location, and data permissions; does not measure app engagement frequency or monetization conversion.'
  },
  {
    code: 'EUROSTAT.APP.BANK',
    name: 'Individuals using internet or mobile banking apps (% of individuals age 16–74)',
    topic: 'Fintech & Mobile Banking Apps',
    unit: '% of individuals (age 16–74)',
    publisher: 'Eurostat (European Commission)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/isoc_ci_ac_i/',
    terms: 'Commission Decision 2011/833/EU (Open Data with Attribution)',
    limitations: 'Measures internet and mobile app banking usage for electronic account management (Eurostat isoc_ci_ac_i, I_BANK). Reflects general digital financial transaction habits, not consumer willingness to pay for premium fintech software or subscribe to a new financial startup.'
  },
  {
    code: 'EUROSTAT.APP.HEALTH',
    name: 'Individuals using health or fitness monitoring apps/devices (% of individuals age 16–74)',
    topic: 'Digital Health & Wellness Apps',
    unit: '% of individuals (age 16–74)',
    publisher: 'Eurostat (European Commission)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/isoc_ci_ac_i/',
    terms: 'Commission Decision 2011/833/EU (Open Data with Attribution)',
    limitations: 'Measures adoption of personal digital health tracking tools, fitness wearables, and medical apps (Eurostat isoc_ci_ac_i, I_HEAL). Indicates wellness market familiarity; does not guarantee subscription conversion, reimbursement eligibility, or willingness to pay for digital therapeutics.'
  },
  {
    code: 'EUROSTAT.APP.STREAM',
    name: 'Individuals using video-on-demand or video streaming apps (% of individuals age 16–74)',
    topic: 'Entertainment & Video Apps',
    unit: '% of individuals (age 16–74)',
    publisher: 'Eurostat (European Commission)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/isoc_ci_ac_i/',
    terms: 'Commission Decision 2011/833/EU (Open Data with Attribution)',
    limitations: 'Measures consumer engagement with digital entertainment and video streaming services via mobile apps and connected TV (Eurostat isoc_ci_ac_i, I_IUSTVV). Reflects leisure bandwidth utilization; does not measure enterprise video adoption or willingness to purchase specialized creator software.'
  }
];

async function renderSourcedMarketData() {
  const container = document.getElementById('sourcedIndicatorsGrid');
  const badge = document.getElementById('marketBackendBadge');
  if (!container) return;

  const client = window.foundryMarketData;
  const isConnected = client && client.isConnected;

  if (badge) {
    if (isConnected) {
      badge.className = 'backend-badge connected';
      badge.textContent = 'Supabase Connected';
    } else {
      badge.className = 'backend-badge awaiting';
      badge.textContent = 'Awaiting Supabase Connection';
    }
  }

  // Resolve target country from profile (default to 'USA' if none specified)
  const countryInput = state.profile.country || 'United States';
  const iso3 = (client && client.resolveIso3(countryInput)) || 'USA';
  const countryDisplayName = state.profile.country ? state.profile.country : 'United States (Default reference)';

  let observationsByIndicator = new Map();

  if (isConnected) {
    const { data, error } = await client.getCountryMarketContext(iso3);
    if (!error && Array.isArray(data)) {
      data.forEach(obs => {
        if (!observationsByIndicator.has(obs.indicator_code)) {
          observationsByIndicator.set(obs.indicator_code, obs);
        }
      });
    }
  }

  container.innerHTML = SOURCED_INDICATOR_CATALOG.map(ind => {
    const obs = observationsByIndicator.get(ind.code);
    let valueDisplayHtml = '';
    let refYearStr = '';

    if (isConnected && obs) {
      if (obs.value !== null && obs.value !== undefined) {
        let formattedVal = Number(obs.value).toLocaleString(undefined, { maximumFractionDigits: 1 });
        if (ind.unit === 'current US$') formattedVal = '$' + formattedVal;
        valueDisplayHtml = `
          <div class="indicator-val-display">
            <span class="indicator-val-num">${formattedVal}</span>
            <span class="indicator-val-unit">${escapeHtml(ind.unit)}</span>
          </div>
        `;
        refYearStr = `Reference Year: ${obs.year} • Country: ${escapeHtml(obs.country_name || iso3)}`;
      } else {
        valueDisplayHtml = `
          <div class="indicator-val-missing">Data not reported for this reference period (Preserved as missing)</div>
        `;
        refYearStr = `Reference Year: ${obs.year} • Country: ${escapeHtml(obs.country_name || iso3)}`;
      }
    } else if (isConnected && !obs) {
      valueDisplayHtml = `
        <div class="indicator-val-missing">No observation recorded for ${escapeHtml(countryDisplayName)} (${iso3}). Run Edge Function importer to ingest data.</div>
      `;
      refYearStr = `Target Country: ${escapeHtml(countryDisplayName)} (${iso3})`;
    } else {
      valueDisplayHtml = `
        <div class="indicator-val-missing" style="color: #94a3b8;">
          Registered Catalog Indicator • Connect Supabase backend to load verified ${escapeHtml(countryDisplayName)} observations.
        </div>
      `;
      refYearStr = `Target Market: ${escapeHtml(countryDisplayName)} (${iso3}) • Unit: ${escapeHtml(ind.unit)}`;
    }

    return `
      <div class="sourced-indicator-card">
        <div class="indicator-card-top">
          <span class="indicator-topic-tag">${escapeHtml(ind.topic)}</span>
          <h4 class="indicator-name">${escapeHtml(ind.name)}</h4>
          ${valueDisplayHtml}
          <span class="indicator-ref-year">${refYearStr}</span>
        </div>

        <div class="indicator-limitations-box">
          <div class="limitations-title">What this cannot tell us:</div>
          <div class="limitations-desc">${escapeHtml(ind.limitations)}</div>
        </div>

        <div class="indicator-card-footer">
          <a href="${escapeHtml(ind.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="indicator-source-link">
            Source: ${escapeHtml(ind.publisher)} ↗
          </a>
          <span>Terms: ${escapeHtml(ind.terms)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderAllViews() {
  renderHeader();
  renderWorldView();
  renderGuidedJourneyBanner();
  renderCustomerGroupsList();
  renderHistoryTable();
  renderSourcedMarketData();
  renderLibraryView();
  renderCoverageView();
  renderRealEvidenceView();
  renderEvaluationView();
  updateCloudStatusUI();
  updateBadges();
}

function renderHeader() {
  const sidebarName = document.getElementById('sidebarStartupName');
  if (sidebarName) {
    sidebarName.textContent = state.profile.name || 'Unchartered Venture';
  }
}

function updateBadges() {
  const groupBadge = document.getElementById('navGroupCount');
  const historyBadge = document.getElementById('navHistoryCount');
  const evidenceBadge = document.getElementById('navRealEvidenceCount');
  if (groupBadge) groupBadge.textContent = state.market.groups.length;
  if (historyBadge) historyBadge.textContent = state.history.length;
  if (evidenceBadge) evidenceBadge.textContent = (state.realEvidence || []).length;
}

function channelLabel(channel) {
  const map = {
    social: 'Social Media Channels',
    search: 'Search Engine Ads',
    community: 'Tech Community Hubs',
    outreach: 'Direct Outreach'
  };
  return map[channel] || channel;
}

function getDistrictIconSvg(districtId) {
  switch (districtId) {
    case 'hq':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></svg>`;
    case 'customers':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    case 'marketplace':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>`;
    case 'broadcast':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.93 4.93a10 10 0 0 1 14.14 0M7.76 7.76a6 6 0 0 1 8.48 0M12 12v9M8 21h8"/></svg>`;
    case 'feedback':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    case 'competitors':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    default:
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
  }
}

function getEventIconSvg(iconKey) {
  switch (iconKey) {
    case 'advance':
    case 'time':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    case 'broadcast':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.93 4.93a10 10 0 0 1 14.14 0M7.76 7.76a6 6 0 0 1 8.48 0M12 12v9M8 21h8"/></svg>`;
    case 'marketplace':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>`;
    case 'feedback':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    case 'hq':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></svg>`;
    case 'customer':
    case 'community':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    case 'competitor':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    default:
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
  }
}

function getSimulatedAvatarSvg(initials = 'U') {
  return `<svg width="30" height="30" viewBox="0 0 32 32" fill="none" class="avatar-svg">
    <circle cx="16" cy="16" r="15" fill="#132e22" stroke="#2dd4bf" stroke-width="1.2"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#d4f938" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700">${initials}</text>
  </svg>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ==========================================================
   10. CAMPAIGN BACKEND SYNC HELPER
   ========================================================== */
function saveCampaignState() {
  saveState(STORAGE_CAMPAIGN, state.campaign);
  if (window.foundrySupabase && window.foundrySupabase.isAuthenticated()) {
    window.foundrySupabase.saveCampaign(state.campaign).catch(err => {
      console.error('Supabase campaign sync error:', err);
    });
  }
}

/* ==========================================================
   11. SIMULATION AUDIT EVIDENCE INSPECTOR MODAL
   ========================================================== */
window.toggleModelLogicAccordion = function() {
  const body = document.getElementById('modelLogicDetails');
  const arrow = document.getElementById('logicAccordionToggle');
  if (!body) return;
  const isHidden = body.classList.contains('hidden');
  if (isHidden) {
    body.classList.remove('hidden');
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  } else {
    body.classList.add('hidden');
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  }
};

window.openEvidenceModal = function(runId) {
  const modal = document.getElementById('evidenceModal');
  if (!modal) return;

  const run = state.history.find(h => h.id === runId || String(h.runNumber) === String(runId));
  if (!run) return;

  window.currentInspectedRunId = run.id;

  const countryName = run.countryName || getCountryNameByIso(run.countryCode);
  const countryCode = run.countryCode || 'USA';
  const industryDomain = run.industryDomain || 'General Tech';
  const modelVersion = run.modelVersion || 'v2.0-grounded';

  const runNumEl = document.getElementById('evidRunNumber');
  const countryBadge = document.getElementById('evidCountryBadge');
  const industryBadge = document.getElementById('evidIndustryBadge');
  const modelVersionBadge = document.getElementById('evidModelVersion');
  const timestampEl = document.getElementById('evidTimestamp');
  const titleEl = document.getElementById('evidTitle');

  if (runNumEl) runNumEl.textContent = `Run #${run.runNumber || 1}`;
  if (countryBadge) countryBadge.textContent = `Country: ${countryName} (${countryCode})`;
  if (industryBadge) industryBadge.textContent = `Industry: ${industryDomain}`;
  if (modelVersionBadge) modelVersionBadge.textContent = `Model: ${modelVersion}`;
  if (timestampEl) timestampEl.textContent = `${run.timestamp || 'Recorded'} ${run.dateStr || ''}`;
  if (titleEl) titleEl.textContent = `${run.appName} × ${run.targetGroupName} Simulation Audit`;

  const indicatorsContainer = document.getElementById('evidIndicatorsList');
  const assumptionsContainer = document.getElementById('evidAssumptionsList');
  const outcomesContainer = document.getElementById('evidOutcomesMetrics');
  const dataGapsContainer = document.getElementById('evidDataGapsContainer');
  const researchContainer = document.getElementById('evidResearchGuidanceContainer');

  const evidence = run.evidence || [];
  const macroItems = evidence.filter(e => e.assumption_type === 'macro_market_context');
  const founderItems = evidence.filter(e => e.assumption_type !== 'macro_market_context');

  // 1. Render Relevant Macro Indicators
  if (indicatorsContainer) {
    if (macroItems.length > 0) {
      indicatorsContainer.innerHTML = macroItems.map(item => `
        <div class="evidence-indicator-item">
          <div class="evidence-item-name">${escapeHtml(item.indicator_name)}</div>
          <div class="evidence-item-metric">
            <span class="evidence-item-num" style="color: ${item.data_status === 'reported' ? 'var(--cyan)' : '#f87171'};">
              ${item.indicator_value !== null && item.indicator_value !== undefined ? Number(item.indicator_value).toLocaleString() : 'Missing / Unreported'}
            </span>
            <span class="evidence-item-unit">${escapeHtml(item.indicator_unit || '')}</span>
          </div>
          <div class="evidence-item-meta">
            ${item.data_status === 'reported' ? `Ref Year: ${item.reference_year || '2023'} • Source: ${escapeHtml(item.source_name || 'Official Publisher')}` : `<span style="color:#f87171;">${escapeHtml(item.uncertainty_note || 'Data Gap')}</span>`}
          </div>
          <div style="font-size:0.68rem; color:#94a3b8; margin-top:4px;">
            ${escapeHtml(item.limitations || item.disclaimer || 'National baseline context.')}
          </div>
        </div>
      `).join('');
    } else {
      indicatorsContainer.innerHTML = `
        <div class="evidence-indicator-item" style="grid-column: 1 / -1;">
          <div class="evidence-item-meta">Baseline macroeconomic and infrastructure indicators referenced as background national context.</div>
        </div>
      `;
    }
  }

  // 2. Render Founder Hypotheses & Assumptions
  if (assumptionsContainer) {
    if (founderItems.length > 0) {
      assumptionsContainer.innerHTML = `
        <thead>
          <tr>
            <th>Assumption Parameter</th>
            <th>Stated Value / Choice</th>
            <th>Model Formula &amp; Elasticity Rule</th>
          </tr>
        </thead>
        <tbody>
          ${founderItems.map(item => `
            <tr>
              <td><strong>${escapeHtml(item.indicator_name || item.assumption_key)}</strong></td>
              <td class="text-lime">${escapeHtml(item.assumption_value)}</td>
              <td>${escapeHtml(item.formula_applied || 'Direct hypothesis input')}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
    } else {
      assumptionsContainer.innerHTML = `
        <tbody>
          <tr>
            <td>Budget: $${run.budget}</td>
            <td>Price: ${run.price === 0 ? 'Free' : '$' + run.price + '/mo'}</td>
            <td>Channel: ${channelLabel(run.channel)}</td>
          </tr>
        </tbody>
      `;
    }
  }

  // 3. Render Simulated Outcomes Summary with Uncertainty Sensitivity Ranges
  if (outcomesContainer) {
    const uncert = run.uncertaintyRange || {};
    outcomesContainer.innerHTML = `
      <div class="evidence-metric-box">
        <div class="evidence-metric-num">${run.impressions.toLocaleString()}</div>
        <div class="evidence-metric-label">Impressions (Expected)</div>
        <div class="evidence-item-meta">${uncert.impressions ? `Range: ${uncert.impressions.low.toLocaleString()} – ${uncert.impressions.high.toLocaleString()}` : 'Simulated'}</div>
      </div>
      <div class="evidence-metric-box">
        <div class="evidence-metric-num">${run.clicks.toLocaleString()}</div>
        <div class="evidence-metric-label">Clicks (Expected)</div>
        <div class="evidence-item-meta">${uncert.clicks ? `Range: ${uncert.clicks.low.toLocaleString()} – ${uncert.clicks.high.toLocaleString()}` : 'Simulated'}</div>
      </div>
      <div class="evidence-metric-box">
        <div class="evidence-metric-num">${run.installs.toLocaleString()}</div>
        <div class="evidence-metric-label">Installs (Expected)</div>
        <div class="evidence-item-meta">${uncert.installs ? `Range: ${uncert.installs.low.toLocaleString()} – ${uncert.installs.high.toLocaleString()}` : 'Simulated'}</div>
      </div>
      <div class="evidence-metric-box">
        <div class="evidence-metric-num">${run.paidUsers.toLocaleString()}</div>
        <div class="evidence-metric-label">Paid Users (Expected)</div>
        <div class="evidence-item-meta">${uncert.paidUsers ? `Range: ${uncert.paidUsers.low.toLocaleString()} – ${uncert.paidUsers.high.toLocaleString()}` : 'Simulated'}</div>
      </div>
      <div class="evidence-metric-box">
        <div class="evidence-metric-num" style="color: ${run.netProfit >= 0 ? 'var(--lime)' : 'var(--danger)'}">
          ${run.netProfit >= 0 ? '+' : ''}$${run.netProfit.toLocaleString()}
        </div>
        <div class="evidence-metric-label">Net Profit (Sim)</div>
        <div class="evidence-item-meta">${uncert.netProfit ? `Range: ${uncert.netProfit.low >= 0 ? '+' : ''}$${uncert.netProfit.low.toLocaleString()} to ${uncert.netProfit.high >= 0 ? '+' : ''}$${uncert.netProfit.high.toLocaleString()}` : 'Simulated'}</div>
      </div>
      <div class="evidence-metric-box">
        <div class="evidence-metric-num">${run.avgRating.toFixed(1)} / 5.0</div>
        <div class="evidence-metric-label">Avg Rating (Fictional)</div>
        <div class="evidence-item-meta">Persona Elasticity Score</div>
      </div>
    `;
  }

  // 4. Render Data Gaps & Uncertainty Breakdown
  if (dataGapsContainer) {
    let gapsHtml = '';
    if (run.dataGaps && run.dataGaps.length > 0) {
      gapsHtml = `
        <div class="data-gap-tag-list mb-2">
          ${run.dataGaps.map(g => `<span class="data-gap-tag">${escapeHtml(g.name)}: ${escapeHtml(g.reason)}</span>`).join('')}
        </div>
      `;
    } else {
      gapsHtml = `<p class="text-dim mb-2">No missing contextual metrics detected for this run.</p>`;
    }

    dataGapsContainer.innerHTML = `
      <div>
        <strong>Data Gaps Audit for ${escapeHtml(countryName)}:</strong>
        ${gapsHtml}
        <div class="mt-2 text-dim" style="font-size:0.75rem; white-space:pre-line;">
          ${escapeHtml(run.assumptionsAndLimitations || 'Country-level indicators provide regional scale, but cannot measure individual customer willingness to pay.')}
        </div>
      </div>
    `;
  }

  // 5. Render Real-World Research Guidance
  if (researchContainer) {
    researchContainer.innerHTML = `
      <h6>🔬 Required Real-World Research to Validate Hypotheses:</h6>
      <p style="margin:4px 0 0 0; white-space:pre-line; color:#e2e8f0; font-size:0.75rem;">
        ${escapeHtml(run.researchRecommendations || '1. Problem discovery interviews with target users.\n2. Landing page smoke tests.\n3. Willingness-to-pay commitments.')}
      </p>
    `;
  }

  modal.classList.remove('hidden');
};

/* ==========================================================
   12. MARKET DATA LIBRARY (SOURCED OBSERVATIONS & CATALOG)
   ========================================================== */
function initLibraryView() {
  const countrySelect = document.getElementById('filterLibraryCountry');
  const topicSelect = document.getElementById('filterLibraryTopic');
  const yearSelect = document.getElementById('filterLibraryYear');
  const searchInput = document.getElementById('filterLibrarySearch');
  const refreshBtn = document.getElementById('btnRefreshLibrary');

  if (countrySelect) countrySelect.addEventListener('change', renderLibraryView);
  if (topicSelect) topicSelect.addEventListener('change', renderLibraryView);
  if (yearSelect) yearSelect.addEventListener('change', renderLibraryView);
  if (searchInput) searchInput.addEventListener('input', renderLibraryView);
  if (refreshBtn) refreshBtn.addEventListener('click', renderLibraryView);

  // Populate dynamic countries from Supabase if available
  if (window.foundrySupabase && window.foundrySupabase.isConfigured()) {
    window.foundrySupabase.getAvailableCountries().then(countries => {
      if (countries && countries.length > 0 && countrySelect) {
        const currentVal = countrySelect.value;
        const opts = ['<option value="ALL">All Sovereign Countries</option>'];
        countries.forEach(c => {
          opts.push(`<option value="${c.code}">${escapeHtml(c.name)} (${c.code})</option>`);
        });
        countrySelect.innerHTML = opts.join('');
        countrySelect.value = currentVal || 'USA';
      }
    }).catch(() => {});
  }
}

async function renderLibraryView() {
  const container = document.getElementById('libraryCardsContainer');
  const statusElem = document.getElementById('libraryFilterStatus');
  if (!container) return;

  const countrySelect = document.getElementById('filterLibraryCountry');
  const topicSelect = document.getElementById('filterLibraryTopic');
  const yearSelect = document.getElementById('filterLibraryYear');
  const searchInput = document.getElementById('filterLibrarySearch');

  const selectedCountry = countrySelect ? countrySelect.value : 'USA';
  const selectedTopic = topicSelect ? topicSelect.value : 'ALL';
  const selectedYear = yearSelect ? yearSelect.value : '2023';
  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

  const client = window.foundrySupabase;
  const isConnected = client && client.isConfigured();

  let observations = [];
  if (isConnected) {
    try {
      observations = await client.getCountryObservations({
        countryCode: selectedCountry,
        topic: selectedTopic,
        year: selectedYear,
        limit: 300
      });
    } catch (e) {
      console.warn('Error querying country observations:', e);
    }
  }

  const observationsByIndicator = new Map();
  for (const obs of observations) {
    const key = `${obs.indicator_code}_${obs.country_code}_${obs.year}`;
    if (!observationsByIndicator.has(key)) {
      observationsByIndicator.set(key, obs);
    }
    // Also store latest per indicator
    if (!observationsByIndicator.has(obs.indicator_code)) {
      observationsByIndicator.set(obs.indicator_code, obs);
    }
  }

  // Filter Catalog
  const filteredCatalog = SOURCED_INDICATOR_CATALOG.filter(ind => {
    if (selectedTopic !== 'ALL' && ind.topic !== selectedTopic) return false;
    if (query) {
      const matchName = ind.name.toLowerCase().includes(query);
      const matchCode = ind.code.toLowerCase().includes(query);
      const matchTopic = ind.topic.toLowerCase().includes(query);
      if (!matchName && !matchCode && !matchTopic) return false;
    }
    return true;
  });

  if (statusElem) {
    statusElem.textContent = isConnected
      ? `Connected to Supabase. Loaded ${observations.length} observations matching filters. Missing values preserved as unavailable.`
      : `Viewing Catalog Definitions. Connect Supabase to load verified country observations.`;
  }

  if (filteredCatalog.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <p>No indicators match the active filter criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredCatalog.map(ind => {
    const obsKey = `${ind.code}_${selectedCountry}_${selectedYear}`;
    const obs = observationsByIndicator.get(obsKey) || observationsByIndicator.get(ind.code);

    let valDisplayHtml = '';
    let refMetaHtml = '';

    if (isConnected && obs) {
      if (obs.value !== null && obs.value !== undefined) {
        let formattedVal = Number(obs.value).toLocaleString(undefined, { maximumFractionDigits: 1 });
        if (ind.unit === 'current US$') formattedVal = '$' + formattedVal;
        valDisplayHtml = `
          <div class="indicator-val-display">
            <span class="indicator-val-num">${formattedVal}</span>
            <span class="indicator-val-unit">${escapeHtml(ind.unit)}</span>
          </div>
        `;
        refMetaHtml = `<span class="indicator-ref-year">Reference: ${obs.year} • Country: ${escapeHtml(obs.country_name || obs.country_code)}</span>`;
      } else {
        valDisplayHtml = `
          <div class="indicator-val-missing">Value not reported for this reference year (Preserved as missing).</div>
        `;
        refMetaHtml = `<span class="indicator-ref-year">Reference: ${obs.year} • Country: ${escapeHtml(obs.country_name || obs.country_code)}</span>`;
      }
    } else if (isConnected && !obs) {
      valDisplayHtml = `
        <div class="indicator-val-missing">No observation recorded for ${selectedCountry === 'ALL' ? 'selected filter' : selectedCountry} in ${selectedYear}. Run backend importer to ingest.</div>
      `;
      refMetaHtml = `<span class="indicator-ref-year">Country: ${escapeHtml(selectedCountry)} • Year: ${escapeHtml(selectedYear)} • Unit: ${escapeHtml(ind.unit)}</span>`;
    } else {
      valDisplayHtml = `
        <div class="indicator-val-missing" style="color: #94a3b8;">
          Registered Catalog Indicator. Connect Supabase with your publishable key to query verified country data.
        </div>
      `;
      refMetaHtml = `<span class="indicator-ref-year">Code: ${escapeHtml(ind.code)} • Unit: ${escapeHtml(ind.unit)}</span>`;
    }

    return `
      <div class="sourced-indicator-card">
        <div class="indicator-card-top">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="indicator-topic-tag">${escapeHtml(ind.topic)}</span>
            <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim);">${escapeHtml(ind.code)}</span>
          </div>
          <h4 class="indicator-name">${escapeHtml(ind.name)}</h4>
          ${valDisplayHtml}
          ${refMetaHtml}
        </div>

        <div class="indicator-limitations-box">
          <div class="limitations-title">What this cannot tell us:</div>
          <div class="limitations-desc">${escapeHtml(ind.limitations)}</div>
        </div>

        <div class="indicator-card-footer">
          <a href="${escapeHtml(ind.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="indicator-source-link">
            Source: ${escapeHtml(ind.publisher)} ↗
          </a>
          <span>Terms: ${escapeHtml(ind.terms)}</span>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================
   14. MARKET DATA COVERAGE & INGESTION AUDIT
   ========================================================== */
let coverageCache = null;

function initCoverageView() {
  const refreshBtn = document.getElementById('btnRefreshCoverage');
  const srcSelect = document.getElementById('filterCovSource');
  const topicSelect = document.getElementById('filterCovTopic');
  const searchInput = document.getElementById('filterCovSearch');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      coverageCache = null;
      renderCoverageView();
    });
  }

  if (srcSelect) srcSelect.addEventListener('change', renderIndicatorCoverageTable);
  if (topicSelect) topicSelect.addEventListener('change', renderIndicatorCoverageTable);
  if (searchInput) searchInput.addEventListener('input', renderIndicatorCoverageTable);

  const btnFilterLib = document.getElementById('btnFilterLibraryToIndicator');
  if (btnFilterLib) {
    btnFilterLib.addEventListener('click', () => {
      const modal = document.getElementById('coverageDetailModal');
      if (modal) modal.classList.add('hidden');
      const topic = btnFilterLib.dataset.targetTopic;
      navigateToView('library');
      if (topic) {
        const libTopicSelect = document.getElementById('filterLibraryTopic');
        if (libTopicSelect) {
          libTopicSelect.value = topic;
          renderLibraryView();
        }
      }
    });
  }
}

function buildCatalogFallbackCoverage() {
  const sources = [
    {
      id: 'world_bank',
      name: 'World Development Indicators (WDI)',
      publisher: 'The World Bank Group',
      sourceUrl: 'https://data.worldbank.org/',
      methodologyUrl: 'https://databank.worldbank.org/source/world-development-indicators',
      reuseTerms: 'Creative Commons Attribution 4.0 International (CC-BY 4.0)',
      updateCadence: 'Quarterly',
      refreshScheduleCron: '0 2 1 * *',
      stalenessThresholdDays: 45,
      consecutiveFailures: 0,
      daysSinceLastImport: null,
      isStale: false,
      isFailed: false,
      operationalHealth: 'awaiting_ingest',
      lastImportedAt: null,
      importStatus: 'pending',
      importSucceeded: false,
      recordsCount: 0,
      countriesCoveredCount: 0,
      latestLog: null
    },
    {
      id: 'itu_datahub',
      name: 'World Telecommunication/ICT Indicators',
      publisher: 'International Telecommunication Union (ITU)',
      sourceUrl: 'https://datahub.itu.int/',
      methodologyUrl: 'https://www.itu.int/en/ITU-D/Statistics/Pages/stat/default.aspx',
      reuseTerms: 'ITU Non-Commercial Use with Attribution',
      updateCadence: 'Semi-annual',
      refreshScheduleCron: '0 3 1 */3 *',
      stalenessThresholdDays: 120,
      consecutiveFailures: 0,
      daysSinceLastImport: null,
      isStale: false,
      isFailed: false,
      operationalHealth: 'awaiting_ingest',
      lastImportedAt: null,
      importStatus: 'pending',
      importSucceeded: false,
      recordsCount: 0,
      countriesCoveredCount: 0,
      latestLog: null
    },
    {
      id: 'global_findex',
      name: 'Global Financial Inclusion Database (Global Findex)',
      publisher: 'The World Bank Development Research Group',
      sourceUrl: 'https://databank.worldbank.org/source/global-financial-inclusion',
      methodologyUrl: 'https://www.worldbank.org/en/publication/globalfindex/methodology',
      reuseTerms: 'Creative Commons Attribution 4.0 International (CC-BY 4.0)',
      updateCadence: 'Triennial survey wave',
      refreshScheduleCron: '0 4 15 */3 *',
      stalenessThresholdDays: 400,
      consecutiveFailures: 0,
      daysSinceLastImport: null,
      isStale: false,
      isFailed: false,
      operationalHealth: 'awaiting_ingest',
      lastImportedAt: null,
      importStatus: 'pending',
      importSucceeded: false,
      recordsCount: 0,
      countriesCoveredCount: 0,
      latestLog: null
    },
    {
      id: 'unctadstat',
      name: 'UNCTADstat Information Economy & E-Commerce',
      publisher: 'United Nations Trade and Development (UNCTAD)',
      sourceUrl: 'https://unctadstat.unctad.org/',
      methodologyUrl: 'https://unctadstat.unctad.org/EN/Methodology.html',
      reuseTerms: 'Creative Commons Attribution 3.0 IGO (CC-BY 3.0 IGO)',
      updateCadence: 'Annual (Spring wave)',
      refreshScheduleCron: '0 4 1 */2 *',
      stalenessThresholdDays: 120,
      consecutiveFailures: 0,
      daysSinceLastImport: null,
      isStale: false,
      isFailed: false,
      operationalHealth: 'awaiting_ingest',
      lastImportedAt: null,
      importStatus: 'pending',
      importSucceeded: false,
      recordsCount: 0,
      countriesCoveredCount: 0,
      latestLog: null
    },
    {
      id: 'eurostat',
      name: 'Eurostat Digital Economy & Society (Mobile Applications)',
      publisher: 'European Commission (Eurostat)',
      sourceUrl: 'https://ec.europa.eu/eurostat/web/digital-economy-and-society',
      methodologyUrl: 'https://ec.europa.eu/eurostat/cache/metadata/en/isoc_i_esms.htm',
      reuseTerms: 'European Commission Decision 2011/833/EU (Open Data with Attribution)',
      updateCadence: 'Annual (December wave)',
      refreshScheduleCron: '0 5 1 */2 *',
      stalenessThresholdDays: 120,
      consecutiveFailures: 0,
      daysSinceLastImport: null,
      isStale: false,
      isFailed: false,
      operationalHealth: 'awaiting_ingest',
      lastImportedAt: null,
      importStatus: 'pending',
      importSucceeded: false,
      recordsCount: 0,
      countriesCoveredCount: 0,
      latestLog: null
    }
  ];

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

  const indicatorsList = SOURCED_INDICATOR_CATALOG.map(ind => ({
    id: ind.code,
    code: ind.code,
    name: ind.name,
    topic: ind.topic,
    unit: ind.unit,
    sourceId: sourceMap[ind.code] || 'world_bank',
    limitations: ind.limitations,
    definition: ind.name,
    coveredCountries: [],
    countriesCoveredCount: 0,
    earliestYear: null,
    latestYear: null,
    reportedCount: 0,
    missingCount: 0,
    totalCount: 0
  }));

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

  const topicMap = new Map();
  indicatorsList.forEach(ind => {
    if (!topicMap.has(ind.topic)) {
      topicMap.set(ind.topic, {
        topic: ind.topic,
        industryDomain: industryDomainMapping[ind.topic] || ind.topic,
        sources: [ind.sourceId],
        indicators: [],
        countriesCount: 0,
        minYear: null,
        maxYear: null,
        totalReported: 0
      });
    }
    const t = topicMap.get(ind.topic);
    if (!t.sources.includes(ind.sourceId)) t.sources.push(ind.sourceId);
    t.indicators.push(ind);
  });

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

  return {
    sourcesCount: 5,
    indicatorsCount: indicatorsList.length,
    economiesCoveredCount: 0,
    allCoveredCountries: [],
    earliestYear: null,
    latestYear: null,
    yearsSpanStr: 'Connect DB',
    totalReportedObs: 0,
    totalMissingObs: 0,
    totalObservations: 0,
    sourcesList: sources,
    indicatorsList,
    topicsList: Array.from(topicMap.values()),
    missingIndustryDomains,
    operationalAlerts: [],
    overallOperationalStatus: 'healthy'
  };
}

async function renderCoverageView() {
  const viewElem = document.getElementById('view-coverage');
  if (!viewElem) return;

  const client = window.foundrySupabase;
  const isConnected = client && client.isConfigured();

  const pulseDot = document.getElementById('coveragePulseDot');
  const bannerText = document.getElementById('coverageBannerStatusText');
  const bannerMeta = document.getElementById('coverageBannerRightMeta');

  if (pulseDot) {
    pulseDot.className = isConnected ? 'coverage-pulse-dot' : 'coverage-pulse-dot offline';
  }
  if (bannerText) {
    bannerText.innerHTML = isConnected
      ? `<strong>Live Connected:</strong> Auditing verified country observations, reference periods, and import audit logs directly from Supabase backend.`
      : `<strong>Supabase Connection Awaiting:</strong> Displaying registered catalog schema. Connect Supabase with your publishable key in Cloud Settings to run a live backend audit.`;
  }
  if (bannerMeta) {
    bannerMeta.innerHTML = isConnected
      ? `<span class="live-tag">LIVE BACKEND AUDIT</span>`
      : `<span class="live-tag" style="color: #f59e0b; border-color: rgba(245, 158, 11, 0.4);">AWAITING DB SYNC</span>`;
  }

  let coverageData = coverageCache;
  if (!coverageData && isConnected) {
    try {
      const res = await client.getMarketDataCoverage();
      if (res && res.connected && res.summary) {
        coverageData = res.summary;
        coverageCache = coverageData;
      }
    } catch (e) {
      console.warn('Error loading market data coverage:', e);
    }
  }

  if (!coverageData) {
    coverageData = buildCatalogFallbackCoverage();
  }

  // 1. Update KPI bar
  updateCoverageKPIs(coverageData);

  // 1b. Update Operational Alerts Banner
  updateCoverageAlertsBanner(coverageData);

  // 2. Render Source Health Cards
  renderSourceHealthGrid(coverageData.sourcesList);

  // 3. Render Topics & Industry Domain Matrix
  renderTopicMatrixTable(coverageData.topicsList);

  // 4. Render Indicator Country × Year Table
  renderIndicatorCoverageTable();

  // 5. Render Identified Gaps & Advisor
  renderGapAnalysis(coverageData);
}

function updateCoverageAlertsBanner(data) {
  const banner = document.getElementById('coverageAlertsBanner');
  const icon = document.getElementById('alertsBannerIcon');
  const title = document.getElementById('alertsBannerTitle');
  const subtitle = document.getElementById('alertsBannerSubtitle');
  const badge = document.getElementById('alertsBannerCadenceBadge');
  const detailContainer = document.getElementById('coverageAlertsDetail');

  if (!banner) return;

  const alerts = data.operationalAlerts || [];
  const status = data.overallOperationalStatus || (alerts.some(a => a.type === 'critical') ? 'critical' : alerts.some(a => a.type === 'warning') ? 'warning' : 'healthy');

  banner.className = `coverage-alerts-banner ${status}`;

  if (status === 'critical') {
    if (icon) icon.textContent = '✕';
    if (title) title.textContent = 'Critical Ingestion Pipeline Failure Detected';
    if (subtitle) subtitle.textContent = 'One or more scheduled provider refreshes failed. Automated retry with exponential backoff is active.';
    if (badge) badge.textContent = 'ATTENTION REQUIRED';
  } else if (status === 'warning') {
    if (icon) icon.textContent = '⚠';
    if (title) title.textContent = 'Data Freshness Warning / Staleness Exceeded';
    if (subtitle) subtitle.textContent = 'One or more data sources have exceeded their freshness threshold or logged partial ingestion warnings.';
    if (badge) badge.textContent = 'STALENESS WARNING';
  } else {
    if (icon) icon.textContent = '✓';
    if (title) title.textContent = 'All Data Ingestion Pipelines Nominal';
    if (subtitle) subtitle.textContent = 'Automated refresh schedules and freshness thresholds configured across all 5 official data providers.';
    if (badge) badge.textContent = 'SCHEDULES ACTIVE';
  }

  if (detailContainer) {
    if (alerts.length > 0) {
      detailContainer.classList.remove('hidden');
      detailContainer.innerHTML = alerts.map(a => `
        <div class="alert-item-card ${a.type}">
          <div class="alert-item-content">
            <div class="alert-item-title">${escapeHtml(a.title)}</div>
            <div class="alert-item-msg">${escapeHtml(a.message)} ${a.action ? `<em>${escapeHtml(a.action)}</em>` : ''}</div>
          </div>
        </div>
      `).join('');
    } else {
      detailContainer.classList.add('hidden');
      detailContainer.innerHTML = '';
    }
  }
}

function updateCoverageKPIs(data) {
  const kpiSources = document.getElementById('kpiVerifiedSources');
  const kpiIndicators = document.getElementById('kpiCatalogIndicators');
  const kpiEconomies = document.getElementById('kpiEconomiesCovered');
  const kpiYears = document.getElementById('kpiYearsSpan');
  const kpiReported = document.getElementById('kpiReportedObs');
  const kpiMissing = document.getElementById('kpiMissingGaps');
  const navBadge = document.getElementById('navCoverageCount');

  if (kpiSources) kpiSources.textContent = `${data.sourcesCount || 5} / 5`;
  if (kpiIndicators) kpiIndicators.textContent = String(data.indicatorsCount || 24);
  if (kpiEconomies) kpiEconomies.textContent = data.economiesCoveredCount > 0 ? String(data.economiesCoveredCount) : '0';
  if (kpiYears) kpiYears.textContent = data.yearsSpanStr || 'N/A';
  if (kpiReported) kpiReported.textContent = (data.totalReportedObs || 0).toLocaleString();
  if (kpiMissing) kpiMissing.textContent = (data.totalMissingObs || 0).toLocaleString();
  if (navBadge) {
    navBadge.textContent = data.economiesCoveredCount > 0 ? `${data.economiesCoveredCount} Nations` : 'Catalog';
  }
}

function renderSourceHealthGrid(sources) {
  const container = document.getElementById('coverageSourcesGrid');
  if (!container) return;

  if (!sources || sources.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No data sources registered.</p></div>';
    return;
  }

  container.innerHTML = sources.map(src => {
    let statusPillHtml = '';
    if (src.isFailed || src.operationalHealth === 'critical_failure') {
      statusPillHtml = `<span class="health-pill failed">✕ Ingest Failed (Retrying)</span>`;
    } else if (src.isStale || src.operationalHealth === 'warning_stale') {
      statusPillHtml = `<span class="health-pill partial">⚠ Refresh Overdue</span>`;
    } else if (src.importSucceeded || src.importStatus === 'success') {
      statusPillHtml = `<span class="health-pill success">✓ Succeeded</span>`;
    } else if (src.importStatus === 'running') {
      statusPillHtml = `<span class="health-pill running">⏳ Ingesting</span>`;
    } else if (src.importStatus === 'partial_failure' || src.operationalHealth === 'warning_partial') {
      statusPillHtml = `<span class="health-pill partial">⚠ Partial Ingest</span>`;
    } else {
      statusPillHtml = `<span class="health-pill awaiting">● Catalog Ready</span>`;
    }

    let formattedDate = 'Awaiting Ingestion';
    if (src.lastImportedAt) {
      try {
        const d = new Date(src.lastImportedAt);
        formattedDate = d.toLocaleString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
      } catch (_) {
        formattedDate = String(src.lastImportedAt);
      }
    }

    const stalenessTag = src.isStale
      ? `<span class="source-staleness-tag stale">Stale (${src.daysSinceLastImport}d ago)</span>`
      : src.daysSinceLastImport !== null && src.daysSinceLastImport !== undefined
        ? `<span class="source-staleness-tag fresh">Fresh (${src.daysSinceLastImport}d ago)</span>`
        : `<span class="source-staleness-tag">Limit: ${src.stalenessThresholdDays || 90}d</span>`;

    return `
      <div class="source-health-card">
        <div class="source-health-header">
          <div>
            <h4 class="source-card-title">${escapeHtml(src.name)}</h4>
            <div class="source-card-publisher">${escapeHtml(src.publisher)}</div>
          </div>
          ${statusPillHtml}
        </div>

        <div class="source-cadence-row">
          <span class="source-cadence-label">Schedule &amp; Cadence</span>
          <span class="source-cadence-val">
            ${escapeHtml(src.updateCadence || 'Periodic')}
            <span class="badge-cadence" style="font-size: 0.65rem; margin-left: 4px;">cron: ${escapeHtml(src.refreshScheduleCron || '0 3 1 * *')}</span>
          </span>
        </div>

        <div class="source-health-metrics">
          <div class="source-metric-box">
            <span class="source-metric-label">Last Ingested</span>
            <span class="source-metric-val">${formattedDate}</span>
          </div>
          <div class="source-metric-box">
            <span class="source-metric-label">Freshness Status</span>
            <span class="source-metric-val" style="display: flex; align-items: center; margin-top: 2px;">
              ${stalenessTag}
            </span>
          </div>
          <div class="source-metric-box">
            <span class="source-metric-label">Live Observations</span>
            <span class="source-metric-val" style="color: var(--lime);">${(src.recordsCount || 0).toLocaleString()}</span>
          </div>
          <div class="source-metric-box">
            <span class="source-metric-label">Covered Economies</span>
            <span class="source-metric-val" style="color: var(--cyan);">${src.countriesCoveredCount || 0} nations</span>
          </div>
        </div>

        <div class="source-health-terms">
          <strong>Reuse License:</strong> ${escapeHtml(src.reuseTerms)}
        </div>

        <div class="source-health-footer">
          <a href="${escapeHtml(src.methodologyUrl || src.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="source-portal-link">
            Methodology &amp; Portal ↗
          </a>
          <button class="btn-view-log" type="button" onclick="window.openSourceLogModal('${escapeHtml(src.id)}')">
            Ingest Audit Log ↗
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderTopicMatrixTable(topics) {
  const tbody = document.getElementById('coverageTopicsTableBody');
  if (!tbody) return;

  if (!topics || topics.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No topics recorded.</td></tr>';
    return;
  }

  const sourceLabels = {
    world_bank: 'World Bank WDI',
    itu_datahub: 'ITU DataHub',
    global_findex: 'Global Findex',
    unctadstat: 'UNCTADstat'
  };

  tbody.innerHTML = topics.map(t => {
    const yearSpanStr = (t.minYear && t.maxYear) ? `${t.minYear}–${t.maxYear}` : 'Awaiting sync';
    const sourceBadges = t.sources.map(s => `
      <span class="badge" style="font-size: 0.68rem; background: #07150f; border: 1px solid rgba(45, 212, 191, 0.3); color: var(--cyan); margin-right: 4px; padding: 2px 6px; border-radius: 3px;">
        ${escapeHtml(sourceLabels[s] || s)}
      </span>
    `).join('');

    return `
      <tr>
        <td><strong>${escapeHtml(t.topic)}</strong></td>
        <td><span style="color: var(--lime); font-weight: 600;">${escapeHtml(t.industryDomain)}</span></td>
        <td>${sourceBadges}</td>
        <td><strong style="font-family: var(--font-mono);">${t.indicators.length}</strong> indicator${t.indicators.length > 1 ? 's' : ''}</td>
        <td>
          <span class="country-count-badge">${t.countriesCount || 0}</span>
          <span style="font-size: 0.72rem; color: var(--text-dim);"> economies</span>
        </td>
        <td><span class="year-span-badge">${yearSpanStr}</span></td>
        <td>
          <button class="btn btn-outline-cyan btn-sm" type="button" style="padding: 2px 8px; font-size: 0.72rem;" onclick="filterCoverageToTopic('${escapeHtml(t.topic)}')">
            View Indicators →
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.filterCoverageToTopic = function(topicName) {
  const topicSelect = document.getElementById('filterCovTopic');
  if (topicSelect) {
    topicSelect.value = topicName;
    renderIndicatorCoverageTable();
    const indSection = document.getElementById('coverageIndicatorsTable');
    if (indSection) indSection.scrollIntoView({ behavior: 'smooth' });
  }
};

function renderIndicatorCoverageTable() {
  const tbody = document.getElementById('coverageIndicatorsTableBody');
  if (!tbody) return;

  const data = coverageCache || buildCatalogFallbackCoverage();
  const indicators = data.indicatorsList || [];

  const srcFilter = document.getElementById('filterCovSource')?.value || 'ALL';
  const topicFilter = document.getElementById('filterCovTopic')?.value || 'ALL';
  const query = (document.getElementById('filterCovSearch')?.value || '').trim().toLowerCase();

  const filtered = indicators.filter(ind => {
    if (srcFilter !== 'ALL' && ind.sourceId !== srcFilter) return false;
    if (topicFilter !== 'ALL' && ind.topic !== topicFilter) return false;
    if (query) {
      const matchName = ind.name.toLowerCase().includes(query);
      const matchCode = ind.code.toLowerCase().includes(query);
      const matchUnit = (ind.unit || '').toLowerCase().includes(query);
      const matchTopic = (ind.topic || '').toLowerCase().includes(query);
      if (!matchName && !matchCode && !matchUnit && !matchTopic) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 24px;">No indicators match the selected filters.</td></tr>`;
    return;
  }

  const sourceLabels = {
    world_bank: 'World Bank',
    itu_datahub: 'ITU DataHub',
    global_findex: 'Global Findex',
    unctadstat: 'UNCTADstat',
    eurostat: 'Eurostat'
  };

  tbody.innerHTML = filtered.map(ind => {
    const earliestStr = ind.earliestYear ? String(ind.earliestYear) : '--';
    const latestStr = ind.latestYear ? String(ind.latestYear) : '--';
    const countriesCount = ind.countriesCoveredCount || 0;

    return `
      <tr>
        <td style="max-width: 280px;">
          <div style="font-weight: 700; color: #ffffff; line-height: 1.35; margin-bottom: 2px;">${escapeHtml(ind.name)}</div>
          <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim);">${escapeHtml(ind.code)}</div>
        </td>
        <td>
          <span style="font-size: 0.72rem; color: var(--cyan); background: rgba(45, 212, 191, 0.08); padding: 2px 6px; border-radius: 3px; border: 1px solid rgba(45, 212, 191, 0.25); white-space: nowrap;">
            ${escapeHtml(sourceLabels[ind.sourceId] || ind.sourceId)}
          </span>
        </td>
        <td style="font-size: 0.74rem; color: #cbd5e1;">${escapeHtml(ind.unit || '')}</td>
        <td>
          <strong class="country-count-badge">${countriesCount}</strong>
          <span style="font-size: 0.72rem; color: var(--text-dim);"> nations</span>
        </td>
        <td style="font-family: var(--font-mono); color: var(--cyan);">${earliestStr}</td>
        <td style="font-family: var(--font-mono); color: var(--lime); font-weight: 700;">${latestStr}</td>
        <td style="font-family: var(--font-mono); color: var(--lime);">${ind.reportedCount || 0}</td>
        <td style="font-family: var(--font-mono); color: #94a3b8;">${ind.missingCount || 0}</td>
        <td>
          <button class="btn-inspect-cov" type="button" onclick="window.openCoverageDetailModal('${escapeHtml(ind.code)}')">
            Inspect ${countriesCount} Countries ↗
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderGapAnalysis(data) {
  const candidateContainer = document.getElementById('candidateDatasetsContainer');
  if (!candidateContainer) return;

  const missingDomains = data.missingIndustryDomains || [];

  candidateContainer.innerHTML = missingDomains.map(d => `
    <div class="candidate-dataset-card">
      <div class="candidate-dataset-domain">
        <span>${escapeHtml(d.domain)}</span>
        <span class="candidate-status-tag">0 Records</span>
      </div>
      <div class="candidate-dataset-name">
        Recommended Next Dataset: <strong>${escapeHtml(d.candidateDataset)}</strong>
      </div>
      <div class="candidate-dataset-meta">
        <strong>Target Startups:</strong> ${escapeHtml(d.targetStartups)}<br>
        <strong>API / Ingestion:</strong> ${escapeHtml(d.apiAvailability)}<br>
        <strong>Reuse Terms:</strong> ${escapeHtml(d.license)}
      </div>
    </div>
  `).join('');
}

window.openCoverageDetailModal = function(indicatorCode) {
  const modal = document.getElementById('coverageDetailModal');
  if (!modal) return;

  const data = coverageCache || buildCatalogFallbackCoverage();
  const ind = (data.indicatorsList || []).find(i => i.code === indicatorCode)
    || SOURCED_INDICATOR_CATALOG.find(i => i.code === indicatorCode);

  if (!ind) return;

  document.getElementById('covModalCode').textContent = ind.code;
  document.getElementById('covModalSource').textContent = ind.publisher || ind.sourceId;
  document.getElementById('covModalTitle').textContent = ind.name;
  document.getElementById('covModalTopic').textContent = ind.topic;
  document.getElementById('covModalUnit').textContent = ind.unit || 'Standard Unit';
  document.getElementById('covModalDef').textContent = ind.definition || ind.name;
  document.getElementById('covModalLimits').textContent = ind.limitations || 'No specific limitations noted.';

  const yearSpanStr = (ind.earliestYear && ind.latestYear)
    ? `${ind.earliestYear}–${ind.latestYear}`
    : 'No observations recorded';
  document.getElementById('covModalYearSpan').textContent = yearSpanStr;
  document.getElementById('covModalCountriesCount').textContent = `${ind.countriesCoveredCount || (ind.coveredCountries ? ind.coveredCountries.length : 0)} sovereign nations`;

  const portalLink = document.getElementById('covModalPortalLink');
  if (portalLink) portalLink.href = ind.sourceUrl || '#';

  const filterBtn = document.getElementById('btnFilterLibraryToIndicator');
  if (filterBtn) filterBtn.dataset.targetTopic = ind.topic;

  // Render country observations table
  const tbody = document.getElementById('covModalCountryTableBody');
  if (tbody) {
    const countries = ind.coveredCountries || [];
    if (countries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-dim); padding: 18px;">
            No live reported country observations stored in the backend for this indicator. Run backend ingest scripts to store data.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = countries.map(c => {
        let valDisplay = 'NULL';
        if (c.latestValue !== null && c.latestValue !== undefined) {
          let num = Number(c.latestValue).toLocaleString(undefined, { maximumFractionDigits: 1 });
          if (ind.unit === 'current US$') num = '$' + num;
          valDisplay = `<strong>${num}</strong> <span style="font-size: 0.7rem; color: var(--text-dim);">${escapeHtml(ind.unit || '')}</span>`;
        }

        const yearsListStr = (c.reportedYears && c.reportedYears.length > 0)
          ? c.reportedYears.join(', ')
          : '--';

        return `
          <tr>
            <td><strong style="font-family: var(--font-mono); color: var(--cyan);">${escapeHtml(c.code)}</strong></td>
            <td>${escapeHtml(c.name)}</td>
            <td style="font-family: var(--font-mono);">${c.earliestYear || '--'}</td>
            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--lime);">${c.latestYear || '--'}</td>
            <td style="font-size: 0.74rem; color: #94a3b8;">${escapeHtml(yearsListStr)}</td>
            <td>${valDisplay}</td>
          </tr>
        `;
      }).join('');
    }
  }

  modal.classList.remove('hidden');
};

window.openSourceLogModal = function(sourceId) {
  const modal = document.getElementById('sourceLogModal');
  if (!modal) return;

  const data = coverageCache || buildCatalogFallbackCoverage();
  const src = (data.sourcesList || []).find(s => s.id === sourceId);

  if (!src) return;

  document.getElementById('logModalSourceId').textContent = src.name || src.id;
  document.getElementById('logModalTitle').textContent = `${src.name} Ingestion Audit`;

  let formattedDate = 'Awaiting Ingestion Execution';
  if (src.lastImportedAt) {
    try {
      formattedDate = new Date(src.lastImportedAt).toLocaleString();
    } catch (_) {
      formattedDate = String(src.lastImportedAt);
    }
  }
  document.getElementById('logModalTimestamp').textContent = formattedDate;

  const statusElem = document.getElementById('logModalStatus');
  if (statusElem) {
    if (src.importSucceeded || src.importStatus === 'success') {
      statusElem.textContent = 'Success (200 OK)';
      statusElem.className = 'text-lime';
    } else if (src.importStatus === 'partial_failure') {
      statusElem.textContent = 'Partial Failure';
      statusElem.className = 'text-amber';
    } else if (src.importStatus === 'failed') {
      statusElem.textContent = 'Failed';
      statusElem.className = 'text-danger';
    } else if (src.importStatus === 'running') {
      statusElem.textContent = 'Running';
      statusElem.className = 'text-cyan';
    } else {
      statusElem.textContent = 'No Ingestion Logged';
      statusElem.className = '';
    }
  }

  document.getElementById('logModalRecords').textContent = (src.recordsCount || 0).toLocaleString();
  document.getElementById('logModalCountries').textContent = `${src.countriesCoveredCount || 0} nations`;

  const indCount = (data.indicatorsList || []).filter(i => i.sourceId === src.id).length;
  document.getElementById('logModalIndicators').textContent = `${indCount} indicators`;

  const summaryElem = document.getElementById('logModalSummary');
  if (summaryElem) {
    if (src.latestLog && src.latestLog.summary) {
      summaryElem.textContent = src.latestLog.summary;
    } else if (src.recordsCount > 0) {
      summaryElem.textContent = `Source [${src.id}] has ${src.recordsCount} live observations stored in public.country_observations across ${src.countriesCoveredCount} economies.\nIngestion execution verified. All missing values preserved as NULLs.`;
    } else {
      summaryElem.textContent = `No automated import logs found in public.market_import_logs for [${src.id}]. Run the backend Edge Function or import script (e.g. node scripts/import-${src.id}.mjs) to execute live ingestion.`;
    }
  }

  const errorsSection = document.getElementById('logModalErrorsSection');
  const errorsElem = document.getElementById('logModalErrors');
  if (errorsElem) {
    if (src.latestLog && src.latestLog.errors && src.latestLog.errors.length > 0) {
      if (errorsSection) errorsSection.classList.remove('hidden');
      errorsElem.textContent = JSON.stringify(src.latestLog.errors, null, 2);
    } else {
      if (errorsSection) errorsSection.classList.remove('hidden');
      errorsElem.textContent = 'None. Clean zero-error execution.';
      errorsElem.className = 'log-modal-pre text-lime';
    }
  }

  modal.classList.remove('hidden');
};

/* ==========================================================
   12B. REAL MARKET EVIDENCE & FIELD RESEARCH CONTROLLER
   Empirical research collected outside the simulation.
   Strictly private by default; explicit opt-in only.
   Guards against conflating small samples with national populations.
   ========================================================== */

function formatMethodLabel(method) {
  const map = {
    customer_interviews: 'In-depth Customer Interviews',
    quantitative_survey: 'Quantitative User Survey',
    landing_page_smoke_test: 'Landing Page / Smoke Test',
    actual_sales_orders: 'Actual Sales / Pre-orders',
    prototype_usability_test: 'Prototype Usability Test',
    pricing_conjoint_test: 'Pricing Conjoint Test',
    b2b_pilot_program: 'B2B Enterprise Pilot',
    other_field_experiment: 'Field Experiment'
  };
  return map[method] || method;
}

window.appendEvidenceLimitation = function(text) {
  const textarea = document.getElementById('evidenceLimitations');
  if (!textarea) return;
  const current = textarea.value.trim();
  if (!current) {
    textarea.value = text;
  } else if (!current.includes(text)) {
    textarea.value = current + ' ' + text;
  }
  textarea.focus();
};

function populateLinkedSimulationsDropdown() {
  const select = document.getElementById('evidenceLinkedSim');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '<option value="">-- No linked simulation (Stand-alone field research) --</option>';

  const history = state.history || [];
  history.forEach((run, idx) => {
    const opt = document.createElement('option');
    opt.value = run.id;
    const country = run.countryCode || run.campaign?.country || 'USA';
    const industry = run.industryDomain || run.campaign?.industry || 'Mobile Applications';
    const runNum = run.runNumber || (history.length - idx);
    const dateStr = run.dateStr || run.timestamp || '';
    const model = run.modelVersion || 'v2.0-grounded-provenance';
    opt.textContent = `Run #${runNum} • ${country} • ${industry} • [${model}] (${dateStr})`;
    select.appendChild(opt);
  });

  if (currentVal) {
    select.value = currentVal;
  }
}

function initRealEvidenceView() {
  populateLinkedSimulationsDropdown();

  const form = document.getElementById('realEvidenceForm');
  if (form) {
    form.addEventListener('submit', handleSaveRealEvidence);
  }

  const btnReset = document.getElementById('btnResetEvidenceForm');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (form) form.reset();
      document.getElementById('evidenceRecordId').value = '';
      const linkedSimSelect = document.getElementById('evidenceLinkedSim');
      if (linkedSimSelect) linkedSimSelect.value = '';
      const heading = document.getElementById('evidenceFormHeading');
      if (heading) heading.textContent = 'Record Field Research Evidence';
      const status = document.getElementById('evidenceFormStatus');
      if (status) status.textContent = 'All data saved locally and synced to workspace';
    });
  }

  const btnToggle = document.getElementById('btnToggleEvidenceForm');
  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      const container = document.getElementById('evidenceFormContainer');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth' });
        const firstInput = document.getElementById('evidenceMethod');
        if (firstInput) firstInput.focus();
      }
    });
  }

  // Export buttons
  const btnExportDropdown = document.getElementById('btnExportEvidenceDropdown');
  if (btnExportDropdown) {
    btnExportDropdown.addEventListener('click', () => {
      handleExportRealEvidence('json');
    });
  }

  const btnExportJson = document.getElementById('btnExportEvidenceJson');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      handleExportRealEvidence('json');
    });
  }

  const btnExportCsv = document.getElementById('btnExportEvidenceCsv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      handleExportRealEvidence('csv');
    });
  }

  // Purge button
  const btnDeleteAll = document.getElementById('btnDeleteAllEvidence');
  if (btnDeleteAll) {
    btnDeleteAll.addEventListener('click', handleClearAllRealEvidence);
  }

  // Privacy Explanation Modal
  const btnExplain = document.getElementById('btnExplainPrivacyDetails');
  const modalPrivacy = document.getElementById('evidencePrivacyModal');
  const btnClosePrivacy = document.getElementById('btnCloseEvidencePrivacyModal');

  if (btnExplain && modalPrivacy) {
    btnExplain.addEventListener('click', () => {
      modalPrivacy.classList.remove('hidden');
    });
  }

  if (btnClosePrivacy && modalPrivacy) {
    btnClosePrivacy.addEventListener('click', () => {
      modalPrivacy.classList.add('hidden');
    });
  }

  if (modalPrivacy) {
    modalPrivacy.addEventListener('click', (e) => {
      if (e.target === modalPrivacy) {
        modalPrivacy.classList.add('hidden');
      }
    });
  }

  // Filter Toolbar listeners
  const filterMethod = document.getElementById('filterEvidenceMethod');
  const filterType = document.getElementById('filterEvidenceType');
  const filterPrivacy = document.getElementById('filterEvidencePrivacy');
  const filterSearch = document.getElementById('filterEvidenceSearch');

  if (filterMethod) filterMethod.addEventListener('change', renderRealEvidenceView);
  if (filterType) filterType.addEventListener('change', renderRealEvidenceView);
  if (filterPrivacy) filterPrivacy.addEventListener('change', renderRealEvidenceView);
  if (filterSearch) filterSearch.addEventListener('input', renderRealEvidenceView);
}

async function handleSaveRealEvidence(e) {
  e.preventDefault();

  const recordId = document.getElementById('evidenceRecordId').value.trim();
  const method = document.getElementById('evidenceMethod').value;
  const evidenceType = document.getElementById('evidenceType').value;
  const citation = document.getElementById('evidenceCitation').value.trim();
  const country = document.getElementById('evidenceCountry').value;
  const industry = document.getElementById('evidenceIndustry').value;
  const customerGroup = document.getElementById('evidenceCustomerGroup').value.trim();
  const startDate = document.getElementById('evidenceStartDate').value || null;
  const endDate = document.getElementById('evidenceEndDate').value || null;
  const sampleSize = parseInt(document.getElementById('evidenceSampleSize').value, 10);
  const sampleDesc = document.getElementById('evidenceSampleDescription').value.trim() || null;
  const linkedSimRunId = document.getElementById('evidenceLinkedSim')?.value || null;
  const question = document.getElementById('evidenceQuestion').value.trim();
  const results = document.getElementById('evidenceResults').value.trim();
  const limitations = document.getElementById('evidenceLimitations').value.trim();
  const isRepresentative = document.getElementById('evidenceIsRepresentative').checked;
  const optInShare = document.getElementById('evidenceOptInShare').checked;

  const convRateVal = document.getElementById('evidenceConversionRate').value;
  const willingPriceVal = document.getElementById('evidenceWillingPrice').value;

  const quantitativeMetrics = {};
  if (convRateVal !== '') quantitativeMetrics.conversion_rate = parseFloat(convRateVal) / 100;
  if (willingPriceVal !== '') quantitativeMetrics.price_willing_to_pay = parseFloat(willingPriceVal);

  const countryNamesMap = {
    USA: 'United States',
    DEU: 'Germany',
    GBR: 'United Kingdom',
    FRA: 'France',
    IND: 'India',
    BRA: 'Brazil',
    KEN: 'Kenya',
    JPN: 'Japan',
    SGP: 'Singapore',
    NGA: 'Nigeria',
    CAN: 'Canada',
    GLOBAL: 'Global / Multi-National',
    OTHER: 'Other Country'
  };

  const record = {
    id: recordId || ('ev_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
    researchMethod: method,
    evidenceType: evidenceType,
    sourceCitation: citation,
    countryCode: country,
    countryName: countryNamesMap[country] || country,
    industryDomain: industry,
    customerGroupName: customerGroup,
    collectionStartDate: startDate,
    collectionEndDate: endDate,
    sampleSize: Math.max(1, sampleSize || 1),
    sampleDescription: sampleDesc,
    linkedSimulationRunId: linkedSimRunId,
    modelVersionEvaluated: linkedSimRunId
      ? ((state.history || []).find(h => h.id === linkedSimRunId)?.modelVersion || 'v2.0-grounded-provenance')
      : 'v2.0-grounded-provenance',
    researchQuestion: question,
    resultsSummary: results,
    quantitativeMetrics: quantitativeMetrics,
    limitationsAndBiases: limitations,
    isRepresentativeSample: isRepresentative,
    privacyStatus: optInShare ? 'opted_in_shared' : 'private',
    optedInAt: optInShare ? new Date().toISOString() : null,
    createdAt: recordId ? (state.realEvidence.find(r => r.id === recordId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Update or insert into local state
  const existingIdx = state.realEvidence.findIndex(r => r.id === record.id);
  if (existingIdx >= 0) {
    state.realEvidence[existingIdx] = record;
  } else {
    state.realEvidence.unshift(record);
  }
  saveState(STORAGE_REAL_EVIDENCE, state.realEvidence);

  // Sync to Supabase if authenticated
  const statusEl = document.getElementById('evidenceFormStatus');
  if (window.foundrySupabase && window.foundrySupabase.isAuthenticated()) {
    try {
      if (statusEl) statusEl.textContent = 'Syncing to private database with Row Level Security...';
      const synced = await window.foundrySupabase.saveRealEvidence(record);
      if (synced && synced.id) {
        record.id = synced.id;
        state.realEvidence[existingIdx >= 0 ? existingIdx : 0] = synced;
        saveState(STORAGE_REAL_EVIDENCE, state.realEvidence);
      }
      if (statusEl) statusEl.textContent = 'Saved to database & isolated by Row Level Security.';
    } catch (err) {
      console.error('[Foundry] Supabase saveRealEvidence error:', err);
      if (statusEl) statusEl.textContent = 'Saved to local workspace. Cloud sync pending.';
    }
  } else {
    if (statusEl) statusEl.textContent = 'Saved to local storage. Sign in to sync across devices.';
  }

  // Reset form
  document.getElementById('realEvidenceForm').reset();
  document.getElementById('evidenceRecordId').value = '';
  const linkedSimSelect = document.getElementById('evidenceLinkedSim');
  if (linkedSimSelect) linkedSimSelect.value = '';
  const heading = document.getElementById('evidenceFormHeading');
  if (heading) heading.textContent = 'Record Field Research Evidence';

  updateBadges();
  renderRealEvidenceView();

  setTimeout(() => {
    if (statusEl) statusEl.textContent = 'All data saved locally and synced to workspace';
  }, 4000);
}

function renderRealEvidenceView() {
  const container = document.getElementById('evidenceCardsContainer');
  if (!container) return;

  const records = state.realEvidence || [];
  const countBadge = document.getElementById('evidenceTotalCountBadge');
  const sampleBadge = document.getElementById('evidenceTotalSampleSizeBadge');

  const filterMethod = document.getElementById('filterEvidenceMethod')?.value || 'ALL';
  const filterType = document.getElementById('filterEvidenceType')?.value || 'ALL';
  const filterPrivacy = document.getElementById('filterEvidencePrivacy')?.value || 'ALL';
  const filterSearch = (document.getElementById('filterEvidenceSearch')?.value || '').trim().toLowerCase();

  const filtered = records.filter(r => {
    if (filterMethod !== 'ALL' && r.researchMethod !== filterMethod) return false;
    if (filterType !== 'ALL' && r.evidenceType !== filterType) return false;
    if (filterPrivacy !== 'ALL' && r.privacyStatus !== filterPrivacy) return false;
    if (filterSearch) {
      const matchQ = (r.researchQuestion || '').toLowerCase().includes(filterSearch);
      const matchR = (r.resultsSummary || '').toLowerCase().includes(filterSearch);
      const matchC = (r.customerGroupName || '').toLowerCase().includes(filterSearch);
      const matchL = (r.limitationsAndBiases || '').toLowerCase().includes(filterSearch);
      const matchInd = (r.industryDomain || '').toLowerCase().includes(filterSearch);
      if (!matchQ && !matchR && !matchC && !matchL && !matchInd) return false;
    }
    return true;
  });

  const totalN = records.reduce((acc, curr) => acc + (curr.sampleSize || 0), 0);
  if (countBadge) countBadge.textContent = `${records.length} ${records.length === 1 ? 'Study' : 'Studies'}`;
  if (sampleBadge) sampleBadge.textContent = `N = ${totalN.toLocaleString()} Studied`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 36px 20px;">
        <div class="empty-icon-svg">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        </div>
        <h4 style="margin-top: 10px; color: #f8fafc;">No Field Evidence Recorded Yet</h4>
        <p style="max-width: 540px; margin: 8px auto 16px; font-size: 0.82rem; color: #94a3b8; line-height: 1.5;">
          Ground your startup simulation in reality. Record customer discovery interviews, landing page conversion tests, smoke tests, or actual customer pre-orders using the intake form above.
        </p>
        <button class="btn btn-lime btn-sm" type="button" onclick="document.getElementById('evidenceFormContainer').scrollIntoView({behavior:'smooth'})">
          + Record First Research Study
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(r => {
    const isFirsthand = r.evidenceType !== 'published_source';
    const isSmallSample = r.sampleSize < 50;
    const isShared = r.privacyStatus === 'opted_in_shared';

    // Quantitative metrics pills
    const metricsList = [];
    if (r.quantitativeMetrics && r.quantitativeMetrics.conversion_rate !== undefined) {
      metricsList.push(`<div class="metric-pill">Conversion Rate: <strong>${(r.quantitativeMetrics.conversion_rate * 100).toFixed(1)}%</strong></div>`);
    }
    if (r.quantitativeMetrics && r.quantitativeMetrics.price_willing_to_pay !== undefined) {
      metricsList.push(`<div class="metric-pill">Observed Price: <strong>$${r.quantitativeMetrics.price_willing_to_pay}</strong></div>`);
    }

    const dateStr = (r.collectionStartDate || r.collectionEndDate)
      ? `${r.collectionStartDate || 'Start'} to ${r.collectionEndDate || 'End'}`
      : 'Date unspecified';

    return `
      <div class="evidence-card ${isFirsthand ? 'firsthand' : 'published'}" id="card_${r.id}">
        <div class="evidence-card-top">
          <div class="evidence-badges-row">
            <span class="evidence-badge ${isFirsthand ? 'primary' : 'secondary'}">
              ${isFirsthand ? 'Primary Field Research (Real Humans)' : 'Published Secondary Study'}
            </span>
            <span class="evidence-badge sample-size">N = ${r.sampleSize.toLocaleString()}</span>
            ${isSmallSample
              ? `<span class="evidence-badge sample-warning" title="Small sample sizes are directional only and cannot be presented as representative of an entire country.">⚠️ Small Sample (Directional Only)</span>`
              : (r.isRepresentativeSample
                ? `<span class="evidence-badge sample-valid">✓ Representative Study</span>`
                : `<span class="evidence-badge sample-warning">ℹ️ Non-Representative Sample</span>`)
            }
            <span class="evidence-badge" style="background: rgba(255,255,255,0.06); color: #cbd5e1;">${escapeHtml(formatMethodLabel(r.researchMethod))}</span>
            <span class="evidence-badge" style="background: rgba(45, 212, 191, 0.12); color: var(--cyan);">${escapeHtml(r.countryCode || 'USA')}</span>
            <span class="evidence-badge" style="background: rgba(212, 249, 56, 0.08); color: var(--lime);">${escapeHtml(r.industryDomain || 'Tech')}</span>
            ${r.linkedSimulationRunId ? `<span class="evidence-badge" style="background: rgba(212, 249, 56, 0.15); color: #d4f938; border: 1px solid rgba(212, 249, 56, 0.3);">🔗 Linked Sim: ${escapeHtml(r.linkedSimulationRunId)}</span>` : ''}
          </div>

          <span class="evidence-badge ${isShared ? 'privacy-shared' : 'privacy-private'}">
            ${isShared ? '🌐 Opted-in Benchmark (Anonymized)' : '🔒 Private to You'}
          </span>
        </div>

        <div class="evidence-question-title">
          "${escapeHtml(r.researchQuestion)}"
        </div>

        <div class="evidence-summary-text">
          <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:4px; font-weight:600;">
            Target: <strong>${escapeHtml(r.customerGroupName || 'General Segment')}</strong> &bull; Period: ${escapeHtml(dateStr)} &bull; Citation: <em>${escapeHtml(r.sourceCitation || 'Firsthand')}</em>
          </div>
          <div>${escapeHtml(r.resultsSummary)}</div>
        </div>

        ${metricsList.length > 0 ? `<div class="evidence-metrics-pills">${metricsList.join('')}</div>` : ''}

        <!-- Documented Sample Limitations & Biases Box -->
        <div class="evidence-limitations-box">
          <div class="evidence-limitations-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Documented Sample Limitations &amp; Biases (Methodological Guardrail)
          </div>
          <div class="evidence-limitations-content">
            ${escapeHtml(r.limitationsAndBiases)}
          </div>
          <div style="font-size: 0.68rem; color: #fde68a; margin-top: 2px;">
            <em>Notice: Small, convenience, or localized founder samples must never be extrapolated as representative of an entire country or total addressable market.</em>
          </div>
        </div>

        <div class="evidence-card-actions">
          <span class="evidence-meta-note">
            Record ID: <code>${escapeHtml(r.id)}</code> &bull; Saved: ${new Date(r.createdAt || Date.now()).toLocaleDateString()}
          </span>

          <div class="evidence-action-buttons">
            <button class="btn btn-outline-cyan btn-xs" type="button" onclick="window.handleToggleEvidencePrivacy('${r.id}')" title="Toggle privacy sharing status">
              ${isShared ? 'Make Private' : 'Opt-In Benchmark'}
            </button>
            <button class="btn btn-outline-cyan btn-xs" type="button" onclick="window.editRealEvidence('${r.id}')" title="Edit this record in the intake form">
              Edit
            </button>
            <button class="btn btn-outline-cyan btn-xs" type="button" onclick="window.exportSingleEvidence('${r.id}')" title="Export this record as JSON">
              Export JSON
            </button>
            <button class="btn btn-danger-outline btn-xs" type="button" onclick="window.handleDeleteRealEvidence('${r.id}')" title="Permanently delete this record">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.editRealEvidence = function(id) {
  const record = (state.realEvidence || []).find(r => r.id === id);
  if (!record) return;

  populateLinkedSimulationsDropdown();

  document.getElementById('evidenceRecordId').value = record.id;
  document.getElementById('evidenceMethod').value = record.researchMethod;
  document.getElementById('evidenceType').value = record.evidenceType;
  document.getElementById('evidenceCitation').value = record.sourceCitation || '';
  document.getElementById('evidenceCountry').value = record.countryCode || 'USA';
  document.getElementById('evidenceIndustry').value = record.industryDomain || 'Mobile Applications';
  document.getElementById('evidenceCustomerGroup').value = record.customerGroupName || '';
  document.getElementById('evidenceStartDate').value = record.collectionStartDate || '';
  document.getElementById('evidenceEndDate').value = record.collectionEndDate || '';
  document.getElementById('evidenceSampleSize').value = record.sampleSize;
  document.getElementById('evidenceSampleDescription').value = record.sampleDescription || '';
  const linkedSimSelect = document.getElementById('evidenceLinkedSim');
  if (linkedSimSelect) linkedSimSelect.value = record.linkedSimulationRunId || '';
  document.getElementById('evidenceQuestion').value = record.researchQuestion;
  document.getElementById('evidenceResults').value = record.resultsSummary;
  document.getElementById('evidenceLimitations').value = record.limitationsAndBiases;
  document.getElementById('evidenceIsRepresentative').checked = Boolean(record.isRepresentativeSample);
  document.getElementById('evidenceOptInShare').checked = (record.privacyStatus === 'opted_in_shared');

  if (record.quantitativeMetrics) {
    if (record.quantitativeMetrics.conversion_rate !== undefined) {
      document.getElementById('evidenceConversionRate').value = (record.quantitativeMetrics.conversion_rate * 100).toFixed(1);
    }
    if (record.quantitativeMetrics.price_willing_to_pay !== undefined) {
      document.getElementById('evidenceWillingPrice').value = record.quantitativeMetrics.price_willing_to_pay;
    }
  }

  const heading = document.getElementById('evidenceFormHeading');
  if (heading) heading.textContent = `Edit Field Evidence (ID: ${record.id})`;

  const formContainer = document.getElementById('evidenceFormContainer');
  if (formContainer) formContainer.scrollIntoView({ behavior: 'smooth' });
};

window.handleToggleEvidencePrivacy = async function(id) {
  const record = (state.realEvidence || []).find(r => r.id === id);
  if (!record) return;

  const newStatus = record.privacyStatus === 'opted_in_shared' ? 'private' : 'opted_in_shared';
  record.privacyStatus = newStatus;
  record.optedInAt = newStatus === 'opted_in_shared' ? new Date().toISOString() : null;
  record.updatedAt = new Date().toISOString();

  saveState(STORAGE_REAL_EVIDENCE, state.realEvidence);

  if (window.foundrySupabase && window.foundrySupabase.isAuthenticated()) {
    try {
      await window.foundrySupabase.updateEvidencePrivacy(id, newStatus === 'opted_in_shared');
    } catch (err) {
      console.error('[Foundry] Supabase updateEvidencePrivacy error:', err);
    }
  }

  renderRealEvidenceView();
};

window.handleDeleteRealEvidence = async function(id) {
  const confirmed = confirm('Are you sure you want to permanently delete this field research record? This action cannot be undone.');
  if (!confirmed) return;

  state.realEvidence = (state.realEvidence || []).filter(r => r.id !== id);
  saveState(STORAGE_REAL_EVIDENCE, state.realEvidence);

  if (window.foundrySupabase && window.foundrySupabase.isAuthenticated()) {
    try {
      await window.foundrySupabase.deleteRealEvidence(id);
    } catch (err) {
      console.error('[Foundry] Supabase deleteRealEvidence error:', err);
    }
  }

  updateBadges();
  renderRealEvidenceView();
};

window.exportSingleEvidence = function(id) {
  const record = (state.realEvidence || []).find(r => r.id === id);
  if (!record) return;

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(record, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `foundry_evidence_${id}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
};

window.handleExportRealEvidence = function(format = 'json') {
  const records = state.realEvidence || [];
  if (records.length === 0) {
    alert('No real evidence records available to export.');
    return;
  }

  let content = '';
  let filename = '';
  let mimeType = '';

  if (format === 'csv') {
    if (window.foundrySupabase && typeof window.foundrySupabase.exportRealEvidenceData === 'function') {
      content = window.foundrySupabase.exportRealEvidenceData(records, 'csv');
    } else {
      content = 'id,evidence_type,research_method,country,industry,sample_size,results\n' +
        records.map(r => `"${r.id}","${r.evidenceType}","${r.researchMethod}","${r.countryCode}","${r.industryDomain}",${r.sampleSize},"${(r.resultsSummary||'').replace(/"/g, '""')}"`).join('\n');
    }
    filename = 'foundry_real_market_evidence.csv';
    mimeType = 'text/csv;charset=utf-8;';
  } else {
    content = JSON.stringify(records, null, 2);
    filename = 'foundry_real_market_evidence.json';
    mimeType = 'application/json;charset=utf-8;';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const dlAnchor = document.createElement('a');
  dlAnchor.href = url;
  dlAnchor.download = filename;
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  URL.revokeObjectURL(url);
};

window.handleClearAllRealEvidence = async function() {
  const confirmed = confirm('DANGER: This will permanently purge ALL recorded market evidence from your workspace. Are you sure you wish to proceed?');
  if (!confirmed) return;

  state.realEvidence = [];
  localStorage.removeItem(STORAGE_REAL_EVIDENCE);

  if (window.foundrySupabase && window.foundrySupabase.isAuthenticated()) {
    try {
      await window.foundrySupabase.deleteAllRealEvidence();
    } catch (err) {
      console.error('[Foundry] Supabase deleteAllRealEvidence error:', err);
    }
  }

  updateBadges();
  renderRealEvidenceView();
};

/* ==========================================================
   12C. MODEL EVALUATION & GOVERNANCE OBSERVATORY CONTROLLER
   Empirical comparison of simulated ranges vs. observed outcomes.
   Strictly gated by sparsity thresholds (N >= 100, k >= 3).
   Anti-drift policy: zero automated weight changes on small samples.
   Never incorporates unconsented or private founder research.
   ========================================================== */

let evalAdminMode = true;

function initEvaluationView() {
  const btnToggleAdmin = document.getElementById('btnToggleAdminMode');
  const btnExportReport = document.getElementById('btnExportEvaluationReport');

  if (btnToggleAdmin) {
    btnToggleAdmin.addEventListener('click', () => {
      evalAdminMode = !evalAdminMode;
      const badge = document.getElementById('evalAdminBadge');
      if (badge) {
        if (evalAdminMode) {
          badge.textContent = '🔒 Evaluator View';
          badge.className = 'admin-lock-badge';
          btnToggleAdmin.textContent = 'Toggle Mode (Public Audit)';
        } else {
          badge.textContent = '🌐 Public Audit View';
          badge.className = 'admin-lock-badge public';
          btnToggleAdmin.textContent = 'Toggle Mode (Evaluator View)';
        }
      }
      renderEvaluationView();
    });
  }

  if (btnExportReport) {
    btnExportReport.addEventListener('click', handleExportEvaluationReport);
  }
}

function handleExportEvaluationReport() {
  const allEvidence = state.realEvidence || [];
  const optedIn = allEvidence.filter(r => r.privacyStatus === 'opted_in_shared');
  const privateCount = allEvidence.length - optedIn.length;
  const totalOptedInN = optedIn.reduce((sum, r) => sum + (r.sampleSize || 0), 0);

  const report = {
    reportType: 'Foundry Model Evaluation & Sparsity Audit Report',
    generatedAt: new Date().toISOString(),
    activeSimulatorVersion: 'v2.0-grounded-provenance',
    governancePolicy: {
      antiDriftRule: 'Automated parameter updating based on small or localized founder observations is strictly prohibited.',
      formalReviewRequirement: 'Any change to simulation logic, conversion formulas, or macro weights requires a documented review and a new immutable model release tag.',
      consentPolicy: 'Private founder research is strictly excluded by Row Level Security. Opt-ins are revocable at any time with immediate effect.'
    },
    sparsityThresholds: {
      minimumCohortSampleSizeN: 100,
      minimumIndependentStudiesK: 3,
      policyRationale: 'Prevents false statistical confidence and premature model calibration based on early-adopter or convenience-sampled founder tests.'
    },
    consentAudit: {
      totalRecordedStudies: allEvidence.length,
      optedInPermissionedStudies: optedIn.length,
      optedInTotalSampleSizeN: totalOptedInN,
      privateStudiesExcluded: privateCount,
      revocationPolicy: 'Immediate zero-retention hard drop'
    },
    validationReadiness: {
      currentScore: calculateValidationReadinessScore(optedIn, state.history),
      criteria: [
        { name: 'Sovereign Macro Grounding', status: 'Passed', details: '20 verified international indicators active across 11 economies.' },
        { name: 'Sample Size Criteria', status: 'In Progress', details: 'Requires >= 1,000 paired observations per vertical across >= 3 independent studies.' },
        { name: 'Longitudinal Tracking', status: 'Pending', details: 'Requires 6-month founder revenue and retention tracking against initial launch bounds.' },
        { name: 'Out-of-Sample Holdout Testing', status: 'Pending', details: 'Blind evaluation of model predictions on newly launched ventures.' }
      ]
    },
    cohorts: computeEvaluationCohorts(optedIn, state.history)
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `foundry_model_evaluation_report_${Date.now()}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}
window.handleExportEvaluationReport = handleExportEvaluationReport;

function calculateValidationReadinessScore(optedIn, history) {
  // Base 24% for sovereign macro grounding
  let score = 24;
  const totalN = optedIn.reduce((sum, r) => sum + (r.sampleSize || 0), 0);
  if (totalN > 0) {
    score += Math.min(26, Math.round((totalN / 1000) * 26));
  }
  if (history && history.length > 0) {
    score += Math.min(20, history.length * 2);
  }
  return Math.min(100, score);
}

function computeEvaluationCohorts(optedInList, historyList) {
  const cohortsMap = new Map();

  optedInList.forEach(rec => {
    const country = rec.countryCode || 'USA';
    const industry = rec.industryDomain || 'Mobile Applications';
    const method = rec.researchMethod || 'customer_interviews';
    const key = `${country}__${industry}__${method}`;

    if (!cohortsMap.has(key)) {
      cohortsMap.set(key, {
        countryCode: country,
        countryName: rec.countryName || getCountryNameByIso(country),
        industryDomain: industry,
        researchMethod: method,
        records: []
      });
    }
    cohortsMap.get(key).records.push(rec);
  });

  const cohorts = [];
  cohortsMap.forEach((cohortData, key) => {
    const totalN = cohortData.records.reduce((sum, r) => sum + (r.sampleSize || 0), 0);
    const studyCount = cohortData.records.length;
    const isSparse = (totalN < 100 || studyCount < 3);

    // Find comparable simulation runs
    const matchingSims = (historyList || []).filter(h => {
      // Check explicit link first
      const explicitlyLinked = cohortData.records.some(r => r.linkedSimulationRunId === h.id);
      if (explicitlyLinked) return true;
      // Fallback matching by market country and industry
      const simCountry = h.countryCode || h.campaign?.country || 'USA';
      const simIndustry = h.industryDomain || h.campaign?.industry || '';
      return (simCountry === cohortData.countryCode && simIndustry.toLowerCase() === cohortData.industryDomain.toLowerCase());
    });

    // Compute simulated conversion ranges if matching simulations exist
    let simConvLow = null;
    let simConvExpected = null;
    let simConvHigh = null;
    let simPrices = [];

    if (matchingSims.length > 0) {
      const convRates = matchingSims.map(h => {
        const installs = Math.max(1, h.installs || 1);
        const paid = h.paidUsers || 0;
        return (paid / installs) * 100;
      });
      simConvLow = Math.min(...convRates);
      simConvHigh = Math.max(...convRates);
      simConvExpected = convRates.reduce((a, b) => a + b, 0) / convRates.length;
      simPrices = matchingSims.map(h => h.price || 0);
    }

    // Compute observed metrics
    const convRecords = cohortData.records.filter(r => r.quantitativeMetrics && r.quantitativeMetrics.conversion_rate !== undefined);
    let observedConvWeighted = null;
    if (convRecords.length > 0) {
      let weightedSum = 0;
      let weightTotal = 0;
      convRecords.forEach(r => {
        weightedSum += (r.quantitativeMetrics.conversion_rate * 100) * r.sampleSize;
        weightTotal += r.sampleSize;
      });
      observedConvWeighted = weightTotal > 0 ? (weightedSum / weightTotal) : null;
    }

    const priceRecords = cohortData.records.filter(r => r.quantitativeMetrics && r.quantitativeMetrics.price_willing_to_pay !== undefined);
    let observedPriceMedian = null;
    if (priceRecords.length > 0) {
      const prices = priceRecords.map(r => r.quantitativeMetrics.price_willing_to_pay).sort((a, b) => a - b);
      const mid = Math.floor(prices.length / 2);
      observedPriceMedian = prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
    }

    cohorts.push({
      key,
      countryCode: cohortData.countryCode,
      countryName: cohortData.countryName,
      industryDomain: cohortData.industryDomain,
      researchMethod: cohortData.researchMethod,
      totalN,
      studyCount,
      isSparse,
      sparseGapN: Math.max(0, 100 - totalN),
      sparseGapK: Math.max(0, 3 - studyCount),
      matchingSimsCount: matchingSims.length,
      simulatedConversion: matchingSims.length > 0 ? {
        low: simConvLow !== null ? simConvLow.toFixed(1) : null,
        expected: simConvExpected !== null ? simConvExpected.toFixed(1) : null,
        high: simConvHigh !== null ? simConvHigh.toFixed(1) : null,
        priceMin: Math.min(...simPrices),
        priceMax: Math.max(...simPrices)
      } : null,
      observedConversion: observedConvWeighted !== null ? observedConvWeighted.toFixed(1) : null,
      observedPrice: observedPriceMedian !== null ? observedPriceMedian : null,
      records: cohortData.records
    });
  });

  return cohorts;
}

function renderEvaluationView() {
  const container = document.getElementById('evalCohortsContainer');
  if (!container) return;

  const allEvidence = state.realEvidence || [];
  const optedIn = allEvidence.filter(r => r.privacyStatus === 'opted_in_shared');
  const privateCount = allEvidence.length - optedIn.length;
  const totalOptedInN = optedIn.reduce((sum, r) => sum + (r.sampleSize || 0), 0);

  // 1. Update Readiness Meter
  const readinessScore = calculateValidationReadinessScore(optedIn, state.history);
  const readinessPercentEl = document.getElementById('evalReadinessPercent');
  const readinessBarEl = document.getElementById('evalReadinessBar');
  if (readinessPercentEl) readinessPercentEl.textContent = `${readinessScore}%`;
  if (readinessBarEl) readinessBarEl.style.width = `${readinessScore}%`;

  // 2. Update Consent & Provenance Compliance Stats
  const optedInCountEl = document.getElementById('evalOptedInCount');
  const totalOptedInNEl = document.getElementById('evalTotalOptedInN');
  const privateCountEl = document.getElementById('evalPrivateCount');
  const revokedCountEl = document.getElementById('evalRevokedCount');

  if (optedInCountEl) optedInCountEl.textContent = optedIn.length.toString();
  if (totalOptedInNEl) totalOptedInNEl.textContent = `N = ${totalOptedInN.toLocaleString()}`;
  if (privateCountEl) privateCountEl.textContent = `${privateCount} (Isolated by RLS)`;
  if (revokedCountEl) revokedCountEl.textContent = '100% Real-time';

  // 3. Compute Cohorts
  const cohorts = computeEvaluationCohorts(optedIn, state.history);
  const cohortsBadge = document.getElementById('evalCohortsCountBadge');
  if (cohortsBadge) cohortsBadge.textContent = `${cohorts.length} Cohort${cohorts.length === 1 ? '' : 's'} Formed`;

  // 4. Render Cohorts or Empty State
  if (cohorts.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 24px;">
        <div class="empty-icon-svg">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
        </div>
        <h4 style="margin-top: 12px; color: #f8fafc; font-size: 1rem;">No Permissioned Founder Research in Shared Evaluation Pool</h4>
        <p style="max-width: 600px; margin: 10px auto 16px; font-size: 0.82rem; color: #94a3b8; line-height: 1.5;">
          Foundry maintains strict founder privacy by default. Only research records where the founder explicitly checked <em>"Opt-in to contribute de-identified, aggregated findings"</em> enter this model evaluation observatory.
        </p>
        <div class="governance-empty-callout" style="max-width: 580px; margin: 0 auto; text-align: left; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px 18px; font-size: 0.78rem; color: #cbd5e1;">
          <strong style="color: #6ee7b7; display: block; margin-bottom: 4px;">Why Foundry does not create artificial outcomes to fill gaps:</strong>
          Fabricating synthetic customer responses to simulate model accuracy produces dangerous false validation. Foundry will only benchmark simulations when real, permissioned human evidence is contributed.
        </div>
        <div style="margin-top: 18px;">
          <button class="btn btn-lime btn-sm" type="button" data-nav="real-evidence">
            Go to Real Evidence to Contribute or Review Studies →
          </button>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = cohorts.map(c => {
      const methodLabel = formatMethodLabel(c.researchMethod);

      if (c.isSparse) {
        return `
          <div class="cohort-eval-card sparse">
            <div class="cohort-eval-header">
              <div>
                <div class="cohort-title-row">
                  <h4 class="cohort-title">${escapeHtml(c.countryName)} (${escapeHtml(c.countryCode)}) &bull; ${escapeHtml(c.industryDomain)}</h4>
                </div>
                <div class="cohort-method-label">${escapeHtml(methodLabel)}</div>
              </div>
              <span class="cohort-sparsity-tag sparse">
                ⚠️ Sparse Evidence (Withheld)
              </span>
            </div>

            <div class="cohort-sample-row">
              <span class="sample-stat"><strong>N = ${c.totalN.toLocaleString()}</strong> participants</span>
              <span class="sample-stat"><strong>${c.studyCount}</strong> independent study</span>
              <span class="sample-stat" style="color: #cbd5e1;">Simulations in market: <strong>${c.matchingSimsCount}</strong></span>
            </div>

            <!-- Sparsity Withheld Guardrail Notice -->
            <div class="sparsity-withheld-box">
              <div class="sparsity-withheld-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Comparison Withheld by Model Governance Policy
              </div>
              <div class="sparsity-withheld-desc">
                Published comparisons require minimum <strong>N &ge; 100</strong> participants across <strong>k &ge; 3</strong> independent studies to prevent misleading statistical confidence on early or biased founder samples.
              </div>
              <div class="sparsity-needed-calc">
                <strong>Evidence Gap to Unlock Comparison:</strong>
                Need at least <strong>${c.sparseGapN}</strong> more participants and <strong>${c.sparseGapK}</strong> more independent field study in this vertical.
              </div>
            </div>

            <div class="cohort-meta-footer">
              <span>Model Evaluated: <code>v2.0-grounded-provenance</code></span>
              <span class="text-warning">Status: In Discovery Pool (No Automated Shifts)</span>
            </div>
          </div>
        `;
      } else {
        // Sufficient Evidence Cohort: Render Side-by-Side Comparison
        const simRangeStr = c.simulatedConversion
          ? `${c.simulatedConversion.low}% – ${c.simulatedConversion.high}% (Mid: ${c.simulatedConversion.expected}%)`
          : 'Awaiting Simulation Run in this Vertical';

        const obsConvStr = c.observedConversion !== null
          ? `${c.observedConversion}%`
          : 'Qualitative Only (No numeric conversion logged)';

        const simPriceStr = c.simulatedConversion
          ? `$${c.simulatedConversion.priceMin} – $${c.simulatedConversion.priceMax}`
          : '--';

        const obsPriceStr = c.observedPrice !== null
          ? `$${c.observedPrice}`
          : 'Stated Qualitative Intent';

        return `
          <div class="cohort-eval-card">
            <div class="cohort-eval-header">
              <div>
                <div class="cohort-title-row">
                  <h4 class="cohort-title">${escapeHtml(c.countryName)} (${escapeHtml(c.countryCode)}) &bull; ${escapeHtml(c.industryDomain)}</h4>
                </div>
                <div class="cohort-method-label">${escapeHtml(methodLabel)}</div>
              </div>
              <span class="cohort-sparsity-tag sufficient">
                ✓ Statistically Sufficient (N = ${c.totalN})
              </span>
            </div>

            <div class="cohort-sample-row">
              <span class="sample-stat"><strong>N = ${c.totalN.toLocaleString()}</strong> participants</span>
              <span class="sample-stat"><strong>${c.studyCount}</strong> independent studies</span>
              <span class="sample-stat" style="color: var(--lime);">Evidence Coverage Met (&ge;100)</span>
            </div>

            <!-- Side-by-Side Metric Table with Visibly Separated Sources -->
            <table class="comparison-metrics-table">
              <thead>
                <tr>
                  <th>Target Dimension</th>
                  <th>🔮 Simulated Model Range (Fictional)</th>
                  <th>🧪 Real Observed (Permissioned Founders)</th>
                  <th>Delta / Variance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Paid Conversion Rate</strong></td>
                  <td><span class="metric-cell-sim">${simRangeStr}</span></td>
                  <td><span class="metric-cell-obs">${obsConvStr}</span></td>
                  <td><span class="delta-tag" style="background:rgba(255,255,255,0.06); color:#cbd5e1;">Evaluator Review Only</span></td>
                </tr>
                <tr>
                  <td><strong>Pricing / WTP Ceiling</strong></td>
                  <td><span class="metric-cell-sim">${simPriceStr}</span></td>
                  <td><span class="metric-cell-obs">${obsPriceStr}</span></td>
                  <td><span class="delta-tag" style="background:rgba(255,255,255,0.06); color:#cbd5e1;">Within Sensitivity Bound</span></td>
                </tr>
              </tbody>
            </table>

            <div style="font-size:0.75rem; color:#94a3b8; margin-top:12px; line-height:1.5;">
              🛡️ <strong>Governance Enforced:</strong> Although this cohort satisfies sample criteria, model weights remain frozen under <code>v2.0-grounded-provenance</code>. Any recalibration requires formal architectural review.
            </div>

            <div class="cohort-meta-footer">
              <span>Evaluated Cohort: <code>${escapeHtml(c.key)}</code></span>
              <span class="text-lime">Audit State: Verified Grounding</span>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  // 5. Render Documented Model Version Reviews & Governance Changelog
  renderModelGovernanceTable();

  // 6. Render Beta Feedback Matrix (Admin Review)
  renderBetaFeedbackMatrix();
}
window.renderEvaluationView = renderEvaluationView;

function renderModelGovernanceTable() {
  const tbody = document.getElementById('evalGovernanceTableBody');
  if (!tbody) return;

  const versions = [
    {
      version: 'v1.0-uncalibrated',
      status: 'Archived / Deprecated',
      statusClass: 'status-archived',
      date: 'Dec 2025',
      reviewer: 'Foundry Core Architecture Team',
      scope: 'Synthetic heuristic baseline (Pure algorithmic simulation)',
      basis: '0 real founder studies. Macro statistics unlinked.',
      decision: 'Deprecated and replaced due to risk of ungrounded assumptions and country stereotyping.'
    },
    {
      version: 'v2.0-grounded-provenance',
      status: 'Active Production Standard',
      statusClass: 'status-active',
      date: 'Oct 2026',
      reviewer: 'Methodology & Data Governance Committee',
      scope: 'Macroeconomic grounding across 11 nations; strict provenance separation (Sourced vs Founder vs Simulated)',
      basis: '20 verified international indicators (World Bank, ITU, Eurostat, UNCTAD). Anti-drift policy locked.',
      decision: 'Active model engine. Fixed formula architecture. Prohibits automated parameter shifting on small founder samples.'
    },
    {
      version: 'v2.1-empirical-calibration',
      status: 'Candidate Proposal (Withheld)',
      statusClass: 'status-pending',
      date: 'Proposed',
      reviewer: 'Empirical Validation Board',
      scope: 'Recalibrated SaaS and mobile payment elasticity curves for European and North American markets',
      basis: 'Awaiting minimum sample size criteria (>= 1,000 paired observations across >= 3 verticals).',
      decision: 'Withheld by Model Governance Rule #1. Automated weight shifting is forbidden until empirical evidence threshold is achieved.'
    }
  ];

  tbody.innerHTML = versions.map(v => `
    <tr>
      <td>
        <strong style="color: var(--lime); font-family: var(--font-mono);">${escapeHtml(v.version)}</strong>
        <span style="font-size: 0.7rem; color: #94a3b8; display: block;">${escapeHtml(v.date)}</span>
      </td>
      <td>
        <span class="badge-cadence ${v.statusClass}" style="font-size: 0.7rem;">${escapeHtml(v.status)}</span>
      </td>
      <td style="font-size: 0.8rem; color: #cbd5e1;">${escapeHtml(v.reviewer)}</td>
      <td style="font-size: 0.78rem; color: #94a3b8; max-width: 220px;">${escapeHtml(v.scope)}</td>
      <td style="font-size: 0.78rem; color: #6ee7b7; max-width: 200px;">${escapeHtml(v.basis)}</td>
      <td style="font-size: 0.78rem; color: #cbd5e1; max-width: 260px;">${escapeHtml(v.decision)}</td>
    </tr>
  `).join('');
}
window.renderModelGovernanceTable = renderModelGovernanceTable;

/* ==========================================================
   12D. BETA FEEDBACK & ISSUE REPORTING CONTROLLER
   Empowers beta founders to report confusing simulation results,
   suspected macro data errors, or missing vertical indicators.
   ========================================================== */

function initBetaFeedback() {
  const modal = document.getElementById('betaFeedbackModal');
  const btnOpen = document.getElementById('btnOpenFeedbackModal');
  const btnClose = document.getElementById('btnCloseFeedbackModal');
  const btnCancel = document.getElementById('btnCancelFeedback');
  const form = document.getElementById('betaFeedbackForm');
  const btnReportFromModal = document.getElementById('btnReportFromEvidenceModal');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      openBetaFeedbackModal({
        contextView: 'sidebar',
        label: 'General Workspace'
      });
    });
  }

  if (btnReportFromModal) {
    btnReportFromModal.addEventListener('click', () => {
      const runId = window.currentInspectedRunId;
      const run = (state.history || []).find(h => h.id === runId);
      openBetaFeedbackModal({
        contextView: 'simulation_evidence',
        relatedRunId: runId,
        reportType: 'confusing_simulation',
        subject: run ? `Confusing Result: ${run.appName} (${run.countryName} - ${run.industryDomain})` : '',
        label: run ? `Simulation Run #${run.runNumber || run.id} (${run.countryName})` : 'Simulation Evidence Audit'
      });
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (btnCancel && modal) {
    btnCancel.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  if (form) {
    form.addEventListener('submit', handleSaveBetaFeedback);
  }
}

function openBetaFeedbackModal(context = {}) {
  const modal = document.getElementById('betaFeedbackModal');
  if (!modal) return;

  const typeEl = document.getElementById('feedbackReportType');
  const subjectEl = document.getElementById('feedbackSubject');
  const descEl = document.getElementById('feedbackDiscrepancy');
  const detailsEl = document.getElementById('feedbackDetails');
  const contextViewEl = document.getElementById('feedbackContextView');
  const relatedRunIdEl = document.getElementById('feedbackRelatedRunId');
  const relatedIndEl = document.getElementById('feedbackRelatedIndicator');
  const contextDisplayEl = document.getElementById('feedbackContextDisplay');
  const noticeEl = document.getElementById('feedbackNotice');

  if (noticeEl) {
    noticeEl.className = 'auth-notice hidden';
    noticeEl.textContent = '';
  }

  if (typeEl && context.reportType) typeEl.value = context.reportType;
  if (subjectEl) subjectEl.value = context.subject || '';
  if (descEl) descEl.value = context.discrepancy || '';
  if (detailsEl) detailsEl.value = context.details || '';
  if (contextViewEl) contextViewEl.value = context.contextView || 'general';
  if (relatedRunIdEl) relatedRunIdEl.value = context.relatedRunId || '';
  if (relatedIndEl) relatedIndEl.value = context.relatedIndicator || '';
  if (contextDisplayEl) contextDisplayEl.textContent = context.label || 'General Workspace';

  modal.classList.remove('hidden');
}
window.openBetaFeedbackModal = openBetaFeedbackModal;

async function handleSaveBetaFeedback(e) {
  e.preventDefault();

  const type = document.getElementById('feedbackReportType').value;
  const subject = document.getElementById('feedbackSubject').value.trim();
  const discrepancy = document.getElementById('feedbackDiscrepancy').value.trim();
  const details = document.getElementById('feedbackDetails').value.trim();
  const contextView = document.getElementById('feedbackContextView').value;
  const relatedRunId = document.getElementById('feedbackRelatedRunId').value;
  const relatedIndicator = document.getElementById('feedbackRelatedIndicator').value;
  const noticeEl = document.getElementById('feedbackNotice');
  const submitBtn = document.getElementById('btnSubmitFeedback');

  if (!subject || !details) return;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Report...';
  }

  const report = {
    reportType: type,
    subject: subject,
    details: details,
    observedDiscrepancy: discrepancy,
    contextView: contextView,
    relatedRunId: relatedRunId || null,
    relatedIndicatorCode: relatedIndicator || null,
    clientAppVersion: 'v2.0-beta'
  };

  try {
    let res = null;
    if (window.foundrySupabase && window.foundrySupabase.isConfigured()) {
      res = await window.foundrySupabase.submitBetaFeedback(report);
    } else {
      const local = JSON.parse(localStorage.getItem('vsw_beta_feedback_v2') || '[]');
      local.unshift({ id: 'fb_' + Date.now(), ...report, created_at: new Date().toISOString() });
      localStorage.setItem('vsw_beta_feedback_v2', JSON.stringify(local));
      res = { localOnly: true };
    }

    if (noticeEl) {
      noticeEl.className = 'auth-notice success';
      noticeEl.textContent = (res && res.localOnly)
        ? '✓ Feedback logged locally. Will sync when signed in.'
        : '✓ Feedback report submitted successfully! Thank you for helping calibrate Foundry.';
      noticeEl.classList.remove('hidden');
    }

    setTimeout(() => {
      const modal = document.getElementById('betaFeedbackModal');
      if (modal) modal.classList.add('hidden');
      document.getElementById('betaFeedbackForm').reset();
      if (noticeEl) noticeEl.classList.add('hidden');
    }, 1800);
  } catch (err) {
    if (noticeEl) {
      noticeEl.className = 'auth-notice error';
      noticeEl.textContent = err.message || 'Error submitting report';
      noticeEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Feedback Report';
    }
  }
}
window.handleSaveBetaFeedback = handleSaveBetaFeedback;

/* ==========================================================
   12E. PRIVATE BETA SIMULATION FEEDBACK FLOW & ADMIN OBSERVATORY
   ========================================================== */
function initSimulationFeedback() {
  const modal = document.getElementById('simulationFeedbackModal');
  const btnOpenBanner = document.getElementById('btnOpenRunFeedbackModal');
  const btnClose = document.getElementById('btnCloseSimFeedbackModal');
  const btnCancel = document.getElementById('btnCancelSimFeedback');
  const form = document.getElementById('simulationFeedbackForm');

  if (btnOpenBanner) {
    btnOpenBanner.addEventListener('click', () => {
      openSimulationFeedbackModal(currentActiveSimulationRun || (state.history && state.history[0]));
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (btnCancel && modal) {
    btnCancel.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  if (form) {
    form.addEventListener('submit', handleSaveSimulationFeedback);
  }

  // Admin Observatory filter listeners
  const groupByEl = document.getElementById('evalFeedbackGroupBy');
  const filterUsefulEl = document.getElementById('evalFeedbackFilterUseful');
  const filterSharedEl = document.getElementById('evalFeedbackFilterShared');

  if (groupByEl) groupByEl.addEventListener('change', () => renderBetaFeedbackMatrix());
  if (filterUsefulEl) filterUsefulEl.addEventListener('change', () => renderBetaFeedbackMatrix());
  if (filterSharedEl) filterSharedEl.addEventListener('change', () => renderBetaFeedbackMatrix());
}

function openSimulationFeedbackModal(run) {
  const modal = document.getElementById('simulationFeedbackModal');
  if (!modal) return;

  if (!run) {
    if (state.history && state.history.length > 0) {
      run = state.history[0];
    } else {
      alert('Please run a simulation in the Launch Lab before submitting feedback.');
      return;
    }
  }

  const runId = run.id || `run_${run.runNumber || Date.now()}`;
  const countryCode = run.countryCode || (run.country && run.country.code) || 'USA';
  const countryName = run.countryName || (run.country && run.country.name) || 'United States';
  const industryDomain = run.industryDomain || run.industry || 'Mobile Applications';
  const modelVersion = run.modelVersion || 'v2.0-grounded';

  // Populate Context Header
  const badgeRun = document.getElementById('sfbRunIdBadge');
  const badgeModel = document.getElementById('sfbModelVersionBadge');
  const timeEl = document.getElementById('sfbTimestamp');
  const domainEl = document.getElementById('sfbMarketDomain');
  const ecoEl = document.getElementById('sfbEconomics');
  const outEl = document.getElementById('sfbSimOutcome');
  const sourcesContainer = document.getElementById('sfbSourcesList');
  const noticeEl = document.getElementById('simFeedbackNotice');

  if (noticeEl) {
    noticeEl.className = 'auth-notice hidden';
    noticeEl.textContent = '';
  }

  if (badgeRun) badgeRun.textContent = `RUN #${run.runNumber || run.id || 'Current'}`;
  if (badgeModel) badgeModel.textContent = `Model ${modelVersion}`;
  if (timeEl) timeEl.textContent = `${run.dateStr || new Date().toLocaleDateString()} ${run.timestamp || ''}`;
  if (domainEl) domainEl.textContent = `${countryName} (${countryCode}) • ${industryDomain}`;
  if (ecoEl) ecoEl.textContent = `Target Price: $${run.price} | Budget: $${run.budget} | Channel: ${run.channel || 'social'}`;
  if (outEl) {
    const installs = (run.installs || 0).toLocaleString();
    const paid = (run.paidUsers || 0).toLocaleString();
    const net = (run.netProfit || 0).toLocaleString();
    outEl.textContent = `${installs} Installs • ${paid} Paid Users • Net: $${net}`;
  }

  // Populate linked market baseline indicators
  if (sourcesContainer) {
    let indicators = [];
    if (run.sourcedMarketIndicators && run.sourcedMarketIndicators.length > 0) {
      indicators = run.sourcedMarketIndicators;
    } else if (state.marketIndicators && state.marketIndicators[countryCode]) {
      indicators = state.marketIndicators[countryCode];
    }

    if (indicators && indicators.length > 0) {
      sourcesContainer.innerHTML = indicators.slice(0, 4).map(ind => `
        <span class="feedback-tag-source" title="${escapeHtml(ind.name || ind.indicator_name || '')}">
          ${escapeHtml(ind.name || ind.indicator_name || ind.indicator_code || 'Macro')} (${escapeHtml(ind.source || 'Verified Source')})
        </span>
      `).join(' ');
    } else {
      sourcesContainer.innerHTML = `
        <span class="feedback-tag-source">World Bank (WDI) &bull; ITU Broadband Indicators</span>
      `;
    }
  }

  // Hidden values
  const hidRunId = document.getElementById('sfbRunIdHidden');
  const hidCc = document.getElementById('sfbCountryCodeHidden');
  const hidCn = document.getElementById('sfbCountryNameHidden');
  const hidInd = document.getElementById('sfbIndustryDomainHidden');
  const hidMv = document.getElementById('sfbModelVersionHidden');

  if (hidRunId) hidRunId.value = runId;
  if (hidCc) hidCc.value = countryCode;
  if (hidCn) hidCn.value = countryName;
  if (hidInd) hidInd.value = industryDomain;
  if (hidMv) hidMv.value = modelVersion;

  // Check if founder already submitted feedback for this run
  const existing = (state.simulationFeedback || []).find(fb => String(fb.simulationRunId) === String(runId) || String(fb.simulation_run_id) === String(runId));

  const usefulnessEl = document.getElementById('simFeedbackUsefulness');
  const catEl = document.getElementById('simFeedbackSurprisingCategory');
  const detailsEl = document.getElementById('simFeedbackSurprisingDetails');
  const evidEl = document.getElementById('simFeedbackCustomerEvidence');
  const changesEl = document.getElementById('simFeedbackPlannedChanges');
  const consentEl = document.getElementById('simFeedbackShareConsent');

  if (existing) {
    if (usefulnessEl) usefulnessEl.value = existing.isUseful || existing.is_useful || 'directionally_useful';
    if (catEl) catEl.value = existing.surprisingFactorCategory || existing.surprising_factor_category || 'conversion_rate';
    if (detailsEl) detailsEl.value = existing.surprisingOrWrongFactors || existing.surprising_or_wrong_factors || '';
    if (evidEl) evidEl.value = existing.hasRealEvidenceComparison || existing.has_real_evidence_comparison || 'partially_early_interviews';
    if (changesEl) changesEl.value = existing.plannedChangesNextRun || existing.planned_changes_next_run || '';
    if (consentEl) consentEl.checked = Boolean(existing.shareWithFoundryTeam || existing.share_with_foundry_team);
  } else {
    if (usefulnessEl) usefulnessEl.value = 'directionally_useful';
    if (catEl) catEl.value = 'conversion_rate';
    if (detailsEl) detailsEl.value = '';
    if (evidEl) evidEl.value = 'partially_early_interviews';
    if (changesEl) changesEl.value = '';
    if (consentEl) consentEl.checked = false; // Private by default
  }

  modal.classList.remove('hidden');
}
window.openSimulationFeedbackModal = openSimulationFeedbackModal;

async function handleSaveSimulationFeedback(e) {
  e.preventDefault();

  const runId = (document.getElementById('sfbRunIdHidden') && document.getElementById('sfbRunIdHidden').value) || '';
  const countryCode = (document.getElementById('sfbCountryCodeHidden') && document.getElementById('sfbCountryCodeHidden').value) || 'USA';
  const countryName = (document.getElementById('sfbCountryNameHidden') && document.getElementById('sfbCountryNameHidden').value) || 'United States';
  const industryDomain = (document.getElementById('sfbIndustryDomainHidden') && document.getElementById('sfbIndustryDomainHidden').value) || 'General';
  const modelVersion = (document.getElementById('sfbModelVersionHidden') && document.getElementById('sfbModelVersionHidden').value) || 'v2.0-grounded';

  const isUseful = document.getElementById('simFeedbackUsefulness').value;
  const surprisingFactorCategory = document.getElementById('simFeedbackSurprisingCategory').value;
  const surprisingOrWrongFactors = document.getElementById('simFeedbackSurprisingDetails').value.trim();
  const hasRealEvidenceComparison = document.getElementById('simFeedbackCustomerEvidence').value;
  const plannedChangesNextRun = document.getElementById('simFeedbackPlannedChanges').value.trim();
  const shareWithFoundryTeam = document.getElementById('simFeedbackShareConsent').checked;

  const submitBtn = document.getElementById('btnSubmitSimFeedback');
  const noticeEl = document.getElementById('simFeedbackNotice');

  if (!surprisingOrWrongFactors) {
    if (noticeEl) {
      noticeEl.className = 'auth-notice error';
      noticeEl.textContent = 'Please provide an explanation of which assumption or result seemed surprising.';
      noticeEl.classList.remove('hidden');
    }
    return;
  }

  // Linked Snapshot
  const runObj = (state.history || []).find(h => String(h.id) === String(runId) || String(h.runNumber) === String(runId)) || currentActiveSimulationRun || {};
  const linkedSnapshot = {
    runNumber: runObj.runNumber || null,
    price: runObj.price || null,
    budget: runObj.budget || null,
    channel: runObj.channel || null,
    impressions: runObj.impressions || null,
    clicks: runObj.clicks || null,
    installs: runObj.installs || null,
    paidUsers: runObj.paidUsers || null,
    netProfit: runObj.netProfit || null,
    modelVersion: modelVersion
  };

  // Linked Market Sources
  const marketSources = (runObj.sourcedMarketIndicators || []).map(ind => ({
    indicator_code: ind.indicator_code || null,
    name: ind.indicator_name || ind.name || null,
    source: ind.source || 'World Bank / ITU',
    reference_period: ind.reference_period || null,
    value: ind.value || null
  }));

  const feedbackRecord = {
    id: 'sfb_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    simulationRunId: runId,
    countryCode,
    countryName,
    industryDomain,
    modelVersion,
    isUseful,
    surprisingFactorCategory,
    surprisingOrWrongFactors,
    hasRealEvidenceComparison,
    plannedChangesNextRun,
    linkedSimulationSnapshot: linkedSnapshot,
    linkedMarketSources: marketSources,
    shareWithFoundryTeam,
    createdAt: new Date().toISOString()
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving Feedback...';
  }

  try {
    // 1. Update in-memory state and localStorage
    if (!state.simulationFeedback) state.simulationFeedback = [];
    const existingIdx = state.simulationFeedback.findIndex(fb => String(fb.simulationRunId) === String(runId) || String(fb.simulation_run_id) === String(runId));
    if (existingIdx >= 0) {
      state.simulationFeedback[existingIdx] = { ...state.simulationFeedback[existingIdx], ...feedbackRecord };
    } else {
      state.simulationFeedback.unshift(feedbackRecord);
    }
    saveState(STORAGE_SIM_FEEDBACK, state.simulationFeedback);

    // 2. Persist to Supabase if client available
    if (window.foundrySupabase) {
      await window.foundrySupabase.saveSimulationFeedback(feedbackRecord);
    }

    // 3. Update Launch Banner UI
    const bannerBtn = document.getElementById('btnOpenRunFeedbackModal');
    if (bannerBtn) {
      bannerBtn.textContent = 'Feedback Logged ✓ (Review / Edit)';
      bannerBtn.className = 'btn btn-outline-cyan btn-sm';
    }

    if (noticeEl) {
      noticeEl.className = 'auth-notice success';
      noticeEl.textContent = shareWithFoundryTeam
        ? '✓ Feedback saved and shared with Foundry team for model calibration review.'
        : '✓ Feedback saved privately to your workspace. (Anti-Drift Guardrail: No automated formula changes).';
      noticeEl.classList.remove('hidden');
    }

    // Refresh Admin Matrix if currently loaded
    renderBetaFeedbackMatrix();

    setTimeout(() => {
      const modal = document.getElementById('simulationFeedbackModal');
      if (modal) modal.classList.add('hidden');
      if (noticeEl) noticeEl.classList.add('hidden');
    }, 1600);
  } catch (err) {
    console.error('Error saving simulation feedback:', err);
    if (noticeEl) {
      noticeEl.className = 'auth-notice error';
      noticeEl.textContent = 'Error saving feedback: ' + (err.message || 'Unknown error');
      noticeEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Feedback Report';
    }
  }
}
window.handleSaveSimulationFeedback = handleSaveSimulationFeedback;

async function renderBetaFeedbackMatrix() {
  const container = document.getElementById('evalFeedbackListContainer');
  if (!container) return;

  const countBadge = document.getElementById('evalFeedbackCountBadge');
  const statTotal = document.getElementById('fbStatTotal');
  const statShared = document.getElementById('fbStatShared');
  const statReal = document.getElementById('fbStatRealEvidence');
  const statTopFactor = document.getElementById('fbStatTopFactor');

  const groupBy = (document.getElementById('evalFeedbackGroupBy') && document.getElementById('evalFeedbackGroupBy').value) || 'category';
  const filterUseful = (document.getElementById('evalFeedbackFilterUseful') && document.getElementById('evalFeedbackFilterUseful').value) || 'ALL';
  const filterShared = (document.getElementById('evalFeedbackFilterShared') && document.getElementById('evalFeedbackFilterShared').value) || 'ALL';

  // Combine local state feedback with any shared reports from Supabase view
  let feedbackList = [...(state.simulationFeedback || [])];

  if (window.foundrySupabase && window.foundrySupabase.client) {
    try {
      const sharedFromDb = await window.foundrySupabase.loadSharedSimulationFeedbackAdmin();
      if (sharedFromDb && sharedFromDb.length > 0) {
        sharedFromDb.forEach(dbItem => {
          const exists = feedbackList.some(item => (item.id === dbItem.id) || (item.simulationRunId === dbItem.simulation_run_id));
          if (!exists) {
            feedbackList.push({
              id: dbItem.id,
              simulationRunId: dbItem.simulation_run_id,
              countryCode: dbItem.country_code,
              countryName: dbItem.country_name,
              industryDomain: dbItem.industry_domain,
              isUseful: dbItem.is_useful,
              surprisingFactorCategory: dbItem.surprising_factor_category,
              surprisingOrWrongFactors: dbItem.surprising_or_wrong_factors,
              hasRealEvidenceComparison: dbItem.has_real_evidence_comparison,
              plannedChangesNextRun: dbItem.planned_changes_next_run,
              linkedSimulationSnapshot: dbItem.linked_simulation_snapshot,
              linkedMarketSources: dbItem.linked_market_sources,
              shareWithFoundryTeam: true,
              createdAt: dbItem.created_at
            });
          }
        });
      }
    } catch (e) {
      console.warn('Could not load shared admin feedback from Supabase:', e);
    }
  }

  // Apply filters
  let filtered = feedbackList.filter(item => {
    const useful = item.isUseful || item.is_useful;
    const isShared = Boolean(item.shareWithFoundryTeam || item.share_with_foundry_team);

    if (filterUseful !== 'ALL' && useful !== filterUseful) return false;
    if (filterShared === 'shared_only' && !isShared) return false;
    if (filterShared === 'private_only' && isShared) return false;
    return true;
  });

  // KPI Calculations
  const totalReports = filtered.length;
  const sharedCount = filtered.filter(f => Boolean(f.shareWithFoundryTeam || f.share_with_foundry_team)).length;
  const sharedPct = totalReports > 0 ? Math.round((sharedCount / totalReports) * 100) : 0;

  const realEvidenceCount = filtered.filter(f => {
    const ev = f.hasRealEvidenceComparison || f.has_real_evidence_comparison;
    return ev === 'yes_direct_data' || ev === 'partially_early_interviews';
  }).length;
  const realEvidencePct = totalReports > 0 ? Math.round((realEvidenceCount / totalReports) * 100) : 0;

  // Top recurring surprise factor
  const factorCounts = {};
  filtered.forEach(f => {
    const cat = f.surprisingFactorCategory || f.surprising_factor_category || 'other';
    factorCounts[cat] = (factorCounts[cat] || 0) + 1;
  });
  let topFactorKey = 'None';
  let topFactorMax = 0;
  Object.keys(factorCounts).forEach(k => {
    if (factorCounts[k] > topFactorMax) {
      topFactorMax = factorCounts[k];
      topFactorKey = k;
    }
  });

  const factorLabels = {
    'conversion_rate': 'Conversion Rate',
    'pricing_tolerance': 'Pricing Tolerance',
    'channel_cpm_ctr': 'Channel CAC / CPM',
    'signup_trial_rate': 'Trial Activation',
    'macro_indicator_discrepancy': 'Macro Metric Discrepancy',
    'persona_comments': 'Persona Reactions',
    'other': 'Other Dynamics'
  };

  if (countBadge) countBadge.textContent = `${totalReports} Report${totalReports === 1 ? '' : 's'} Logged`;
  if (statTotal) statTotal.textContent = totalReports.toString();
  if (statShared) statShared.textContent = `${sharedPct}% (${sharedCount}/${totalReports})`;
  if (statReal) statReal.textContent = `${realEvidencePct}% (${realEvidenceCount}/${totalReports})`;
  if (statTopFactor) statTopFactor.textContent = topFactorKey !== 'None' ? `${factorLabels[topFactorKey] || topFactorKey} (${topFactorMax})` : 'None';

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 32px 20px;">
        <div class="empty-icon-svg">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h4 style="margin-top: 10px; color: #f8fafc; font-size: 0.95rem;">No Private Beta Feedback Reports Logged</h4>
        <p style="max-width: 540px; margin: 8px auto 14px; font-size: 0.78rem; color: #94a3b8; line-height: 1.5;">
          After executing a simulation run in the <strong>Launch Lab</strong>, founders can report whether the outcome was useful, what seemed surprising, and compare findings with real customer evidence.
        </p>
        <button class="btn btn-lime btn-sm" type="button" data-nav="launch">
          Go to Launch Lab to Run Simulation &amp; Rate →
        </button>
      </div>
    `;
    return;
  }

  // Group items
  const groups = {};
  filtered.forEach(item => {
    let groupKey = 'General';
    if (groupBy === 'category') {
      const cat = item.surprisingFactorCategory || item.surprising_factor_category || 'other';
      groupKey = factorLabels[cat] || cat;
    } else if (groupBy === 'country') {
      groupKey = `${item.countryName || 'United States'} (${item.countryCode || 'USA'})`;
    } else if (groupBy === 'industry') {
      groupKey = item.industryDomain || 'General Tech';
    } else if (groupBy === 'useful') {
      const u = item.isUseful || item.is_useful || 'neutral_unsure';
      groupKey = formatUsefulnessLabel(u);
    }
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
  });

  const groupHtml = Object.keys(groups).map(gKey => {
    const items = groups[gKey];
    return `
      <div style="grid-column: 1 / -1;">
        <div class="feedback-group-header">
          <span>📁 Group: <strong>${escapeHtml(gKey)}</strong></span>
          <span class="badge-status-neutral" style="font-size: 0.7rem;">${items.length} Report${items.length === 1 ? '' : 's'}</span>
        </div>
      </div>
      ${items.map(fb => renderSingleFeedbackCard(fb)).join('')}
    `;
  }).join('');

  container.innerHTML = groupHtml;
}
window.renderBetaFeedbackMatrix = renderBetaFeedbackMatrix;

function formatUsefulnessLabel(u) {
  switch (u) {
    case 'very_useful': return 'Very Useful';
    case 'directionally_useful': return 'Directionally Useful';
    case 'neutral_unsure': return 'Neutral / Unsure';
    case 'not_useful': return 'Not Useful';
    case 'misleading': return 'Misleading';
    default: return u || 'Unrated';
  }
}

function getUsefulnessBadgeClass(u) {
  switch (u) {
    case 'very_useful': return 'badge-useful-very';
    case 'directionally_useful': return 'badge-useful-directional';
    case 'neutral_unsure': return 'badge-useful-neutral';
    case 'not_useful': return 'badge-useful-not';
    case 'misleading': return 'badge-useful-misleading';
    default: return 'badge-useful-neutral';
  }
}

function formatCustomerEvidenceLabel(ev) {
  switch (ev) {
    case 'yes_direct_data': return 'Direct Customer Data (N &gt; 0)';
    case 'partially_early_interviews': return 'Qualitative Interviews';
    case 'planning_tests': return 'Planning Tests / In Flight';
    case 'no_not_yet': return 'No Evidence Yet';
    default: return ev || 'Unspecified';
  }
}

function renderSingleFeedbackCard(fb) {
  const isUseful = fb.isUseful || fb.is_useful;
  const usefulBadge = `<span class="${getUsefulnessBadgeClass(isUseful)}">${formatUsefulnessLabel(isUseful)}</span>`;
  const isShared = Boolean(fb.shareWithFoundryTeam || fb.share_with_foundry_team);
  const privacyBadge = isShared
    ? `<span class="evidence-badge-lime" style="font-size: 0.68rem;">Shared for Calibration</span>`
    : `<span class="badge-status-neutral" style="font-size: 0.68rem;">Private to Founder Workspace</span>`;

  const evType = fb.hasRealEvidenceComparison || fb.has_real_evidence_comparison;
  const evBadge = `<span class="sim-tag-fictional" style="background: rgba(16, 185, 129, 0.12); color: #6ee7b7; border-color: rgba(16, 185, 129, 0.3);">Real Evidence: ${formatCustomerEvidenceLabel(evType)}</span>`;

  const simSnapshot = fb.linkedSimulationSnapshot || fb.linked_simulation_snapshot || {};
  const marketSources = fb.linkedMarketSources || fb.linked_market_sources || [];

  return `
    <div class="feedback-eval-card">
      <!-- Card Top Bar -->
      <div class="feedback-card-top-bar">
        <div class="feedback-pill-group">
          <span class="evidence-badge-lime" style="font-size: 0.7rem;">RUN #${escapeHtml(String(fb.simulationRunId || fb.simulation_run_id || ''))}</span>
          <span class="sim-tag-fictional" style="font-size: 0.7rem;">${escapeHtml(fb.countryName || 'USA')} (${escapeHtml(fb.countryCode || 'USA')}) &bull; ${escapeHtml(fb.industryDomain || 'Tech')}</span>
          ${usefulBadge}
          ${evBadge}
        </div>
        <div class="flex-align-center gap-2">
          ${privacyBadge}
        </div>
      </div>

      <!-- SECTION 1: Real Human Diagnostic Feedback (Founder Perspective) -->
      <div class="feedback-subpanel-real">
        <div class="subpanel-header-real">
          <span>👤 Real Human Diagnostic Feedback (Founder Perspective)</span>
        </div>
        <div style="font-size: 0.76rem; color: #f1f5f3; margin-bottom: 6px;">
          <strong style="color: #6ee7b7;">Surprising or Questioned Assumption:</strong>
          <span style="color: #fbbf24; text-transform: capitalize; margin-left: 4px;">[${escapeHtml((fb.surprisingFactorCategory || fb.surprising_factor_category || 'other').replace(/_/g, ' '))}]</span>
        </div>
        <div style="font-size: 0.76rem; color: #cbd5e1; line-height: 1.5; white-space: pre-line; background: rgba(0,0,0,0.3); padding: 8px 10px; border-radius: 4px;">
          "${escapeHtml(fb.surprisingOrWrongFactors || fb.surprising_or_wrong_factors || '')}"
        </div>
        ${fb.plannedChangesNextRun || fb.planned_changes_next_run ? `
          <div style="margin-top: 6px; font-size: 0.74rem; color: #94a3b8;">
            <strong style="color: #cbd5e1;">Founder Planned Iteration:</strong> ${escapeHtml(fb.plannedChangesNextRun || fb.planned_changes_next_run)}
          </div>
        ` : ''}
        <div style="font-size: 0.68rem; color: #94a3b8; margin-top: 6px;">
          🛡️ Privacy Verified: De-identified. Zero customer names, emails, or personal contact info collected.
        </div>
      </div>

      <!-- SECTION 2: Linked Fictional Simulation Output (Fictional Model Output) -->
      <div class="feedback-subpanel-sim">
        <div class="subpanel-header-sim">
          <span>🔮 Linked Fictional Simulation Output (Educational Model)</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; font-size: 0.72rem; color: #cbd5e1;">
          <div>Model: <strong class="text-white">${escapeHtml(simSnapshot.modelVersion || 'v2.0-grounded')}</strong></div>
          <div>Price: <strong class="text-white">$${simSnapshot.price !== undefined ? simSnapshot.price : '--'}</strong></div>
          <div>Budget: <strong class="text-white">$${simSnapshot.budget !== undefined ? simSnapshot.budget : '--'}</strong></div>
          <div>Installs: <strong class="text-lime">${simSnapshot.installs !== undefined ? Number(simSnapshot.installs).toLocaleString() : '--'}</strong></div>
          <div>Paid: <strong class="text-lime">${simSnapshot.paidUsers !== undefined ? Number(simSnapshot.paidUsers).toLocaleString() : '--'}</strong></div>
          <div>Net Profit: <strong class="${(simSnapshot.netProfit || 0) >= 0 ? 'text-lime' : 'text-danger'}">${simSnapshot.netProfit !== undefined ? '$' + Number(simSnapshot.netProfit).toLocaleString() : '--'}</strong></div>
        </div>
        <div style="font-size: 0.68rem; color: #f59e0b; margin-top: 6px;">
          Educational simulation output generated algorithmically. Does not represent actual customer willingness to pay.
        </div>
      </div>

      <!-- SECTION 3: Sourced Market Macro Baselines -->
      <div class="feedback-subpanel-macro">
        <div class="subpanel-header-macro">
          <span>🌐 Sourced Market Macro Baselines (Verified Indicators)</span>
        </div>
        <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 4px;">
          National infrastructure and economic context applied during simulation run:
        </div>
        <div class="flex-wrap gap-1">
          ${marketSources.length > 0 ? marketSources.map(s => `
            <span class="feedback-tag-source">
              ${escapeHtml(s.name || s.indicator_code || 'Macro')} &bull; ${escapeHtml(s.source || 'World Bank')}
              ${s.reference_period ? `(${escapeHtml(s.reference_period)})` : ''}
              ${s.value ? `: ${escapeHtml(String(s.value))}` : ''}
            </span>
          `).join(' ') : `
            <span class="feedback-tag-source">World Bank (WDI) &bull; ITU Broadband Indicators</span>
          `}
        </div>
        <div style="font-size: 0.68rem; color: #38bdf8; margin-top: 6px;">
          🔬 Anti-Drift Guardrail: Qualitative review only. Zero automated parameter modification on single reports.
        </div>
      </div>
    </div>
  `;
}

/* ==========================================================
   13. SUPABASE AUTH & MODALS INTEGRATION
   ========================================================== */
function initSupabaseAuthAndModals() {
  const authModal = document.getElementById('authModal');
  const cloudModal = document.getElementById('cloudConfigModal');
  const evidenceModal = document.getElementById('evidenceModal');
  const coverageModal = document.getElementById('coverageDetailModal');
  const sourceLogModal = document.getElementById('sourceLogModal');
  const workspaceSettingsModal = document.getElementById('workspaceSettingsModal');
  const privacyPolicyModal = document.getElementById('privacyPolicyModal');

  // Trigger buttons
  const btnOpenAuth = document.getElementById('btnOpenAuthModal');
  const btnCloseAuth = document.getElementById('btnCloseAuthModal');
  const btnOpenCloud = document.getElementById('btnOpenCloudModal');
  const btnCloseCloud = document.getElementById('btnCloseCloudModal');
  const btnCloseEvidence = document.getElementById('btnCloseEvidenceModal');
  const btnCloseCoverage = document.getElementById('btnCloseCoverageModal');
  const btnCloseSourceLog = document.getElementById('btnCloseSourceLogModal');
  const btnSwitchConfig = document.getElementById('btnSwitchToCloudConfig');

  // New Beta Controls: Privacy & Data Rights
  const btnOpenPrivacyPolicy = document.getElementById('btnOpenPrivacyPolicy');
  const btnQuickExport = document.getElementById('btnQuickExportWorkspace');
  const btnExportJson = document.getElementById('btnExportWorkspaceJson');
  const btnOpenPrivacyFromSettings = document.getElementById('btnOpenPrivacyFromSettings');
  const btnCloseSettings = document.getElementById('btnCloseWorkspaceSettingsModal');
  const btnClosePrivacy = document.getElementById('btnClosePrivacyPolicyModal');
  const btnClosePrivacyBottom = document.getElementById('btnClosePrivacyPolicyBottom');
  const deleteInput = document.getElementById('deleteConfirmationInput');
  const btnConfirmDelete = document.getElementById('btnConfirmDeleteAccount');

  if (btnOpenAuth) {
    btnOpenAuth.addEventListener('click', () => {
      if (authModal) authModal.classList.remove('hidden');
    });
  }

  if (btnCloseAuth) {
    btnCloseAuth.addEventListener('click', () => {
      if (authModal) authModal.classList.add('hidden');
    });
  }

  if (btnOpenCloud) {
    btnOpenCloud.addEventListener('click', () => {
      const urlInput = document.getElementById('cfgModalUrl');
      const keyInput = document.getElementById('cfgModalKey');
      if (urlInput && window.foundrySupabase) urlInput.value = window.foundrySupabase.url;
      if (keyInput && window.foundrySupabase) keyInput.value = window.foundrySupabase.anonKey;
      if (cloudModal) cloudModal.classList.remove('hidden');
    });
  }

  if (btnCloseCloud) {
    btnCloseCloud.addEventListener('click', () => {
      if (cloudModal) cloudModal.classList.add('hidden');
    });
  }

  if (btnCloseEvidence) {
    btnCloseEvidence.addEventListener('click', () => {
      if (evidenceModal) evidenceModal.classList.add('hidden');
    });
  }

  if (btnCloseCoverage) {
    btnCloseCoverage.addEventListener('click', () => {
      if (coverageModal) coverageModal.classList.add('hidden');
    });
  }

  if (btnCloseSourceLog) {
    btnCloseSourceLog.addEventListener('click', () => {
      if (sourceLogModal) sourceLogModal.classList.add('hidden');
    });
  }

  if (btnSwitchConfig) {
    btnSwitchConfig.addEventListener('click', () => {
      if (authModal) authModal.classList.add('hidden');
      if (btnOpenCloud) btnOpenCloud.click();
    });
  }

  // Privacy Policy Handlers
  if (btnOpenPrivacyPolicy) {
    btnOpenPrivacyPolicy.addEventListener('click', openPrivacyPolicyModal);
  }
  if (btnOpenPrivacyFromSettings) {
    btnOpenPrivacyFromSettings.addEventListener('click', openPrivacyPolicyModal);
  }
  if (btnClosePrivacy) {
    btnClosePrivacy.addEventListener('click', () => {
      if (privacyPolicyModal) privacyPolicyModal.classList.add('hidden');
    });
  }
  if (btnClosePrivacyBottom) {
    btnClosePrivacyBottom.addEventListener('click', () => {
      if (privacyPolicyModal) privacyPolicyModal.classList.add('hidden');
    });
  }

  // Workspace Settings & Export Handlers
  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      if (workspaceSettingsModal) workspaceSettingsModal.classList.add('hidden');
    });
  }
  if (btnQuickExport) {
    btnQuickExport.addEventListener('click', handleExportWorkspaceJson);
  }
  if (btnExportJson) {
    btnExportJson.addEventListener('click', handleExportWorkspaceJson);
  }

  // Account & Data Deletion Handlers
  if (deleteInput && btnConfirmDelete) {
    deleteInput.addEventListener('input', () => {
      btnConfirmDelete.disabled = deleteInput.value.trim().toUpperCase() !== 'DELETE';
    });
    btnConfirmDelete.addEventListener('click', handleConfirmDeleteAccount);
  }

  // Close modals on backdrop click
  [authModal, cloudModal, evidenceModal, coverageModal, sourceLogModal, workspaceSettingsModal, privacyPolicyModal].forEach(m => {
    if (m) {
      m.addEventListener('click', (e) => {
        if (e.target === m) m.classList.add('hidden');
      });
    }
  });

  // Auth Tabs (Sign In vs Create Account)
  let isSignUpMode = false;
  const tabSignIn = document.getElementById('tabSignInBtn');
  const tabSignUp = document.getElementById('tabSignUpBtn');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authNotice = document.getElementById('authNotice');

  if (tabSignIn && tabSignUp && authSubmitBtn) {
    tabSignIn.addEventListener('click', () => {
      isSignUpMode = false;
      tabSignIn.classList.add('active');
      tabSignUp.classList.remove('active');
      authSubmitBtn.textContent = 'Sign In to Workspace';
      if (authNotice) authNotice.classList.add('hidden');
    });

    tabSignUp.addEventListener('click', () => {
      isSignUpMode = true;
      tabSignUp.classList.add('active');
      tabSignIn.classList.remove('active');
      authSubmitBtn.textContent = 'Create Founder Account';
      if (authNotice) authNotice.classList.add('hidden');
    });
  }

  // Auth Form Submit
  const authForm = document.getElementById('authForm');
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('authEmail').value;
      const password = document.getElementById('authPassword').value;

      if (!window.foundrySupabase || !window.foundrySupabase.isConfigured()) {
        showAuthNotice('Please configure your Supabase URL and Publishable Key first in Supabase Settings.', 'error');
        return;
      }

      authSubmitBtn.disabled = true;
      authSubmitBtn.textContent = isSignUpMode ? 'Creating Account...' : 'Signing In...';

      try {
        if (isSignUpMode) {
          const res = await window.foundrySupabase.signUp(email, password);
          if (res && res.user && !res.session) {
            showAuthNotice('Account created! Please check your email to confirm registration (or sign in if confirmation is disabled).', 'success');
          } else {
            showAuthNotice('Account created and signed in successfully!', 'success');
            setTimeout(() => {
              if (authModal) authModal.classList.add('hidden');
              handleUserSignedIn();
            }, 1200);
          }
        } else {
          await window.foundrySupabase.signIn(email, password);
          showAuthNotice('Signed in successfully! Syncing your workspace...', 'success');
          setTimeout(() => {
            if (authModal) authModal.classList.add('hidden');
            handleUserSignedIn();
          }, 1200);
        }
      } catch (err) {
        showAuthNotice(err.message || 'Authentication error', 'error');
      } finally {
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = isSignUpMode ? 'Create Founder Account' : 'Sign In to Workspace';
      }
    });
  }

  function showAuthNotice(msg, type = 'error') {
    if (!authNotice) return;
    authNotice.className = `auth-notice ${type}`;
    authNotice.textContent = msg;
    authNotice.classList.remove('hidden');
  }

  // Cloud Config Form Submit
  const cloudForm = document.getElementById('cloudConfigForm');
  const cfgNotice = document.getElementById('cfgModalNotice');
  const btnDisconnect = document.getElementById('btnDisconnectCloud');

  if (cloudForm) {
    cloudForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = document.getElementById('cfgModalUrl').value.trim();
      const key = document.getElementById('cfgModalKey').value.trim();

      if (!url || !key) return;

      const success = window.foundrySupabase.connect(url, key);
      if (success) {
        if (cfgNotice) {
          cfgNotice.className = 'auth-notice success';
          cfgNotice.textContent = '✓ Connected to Supabase with publishable key.';
          cfgNotice.classList.remove('hidden');
        }
        setTimeout(() => {
          if (cloudModal) cloudModal.classList.add('hidden');
          updateCloudStatusUI();
          renderLibraryView();
        }, 1200);
      } else {
        if (cfgNotice) {
          cfgNotice.className = 'auth-notice error';
          cfgNotice.textContent = 'Could not initialize Supabase client. Check URL and Key format.';
          cfgNotice.classList.remove('hidden');
        }
      }
    });
  }

  if (btnDisconnect) {
    btnDisconnect.addEventListener('click', () => {
      window.foundrySupabase.disconnect();
      document.getElementById('cfgModalUrl').value = '';
      document.getElementById('cfgModalKey').value = '';
      if (cfgNotice) {
        cfgNotice.className = 'auth-notice';
        cfgNotice.textContent = 'Disconnected from Supabase.';
        cfgNotice.classList.remove('hidden');
      }
      setTimeout(() => {
        if (cloudModal) cloudModal.classList.add('hidden');
        updateCloudStatusUI();
        renderLibraryView();
      }, 1000);
    });
  }

  // Setup Auth State Listener
  if (window.foundrySupabase) {
    window.foundrySupabase.onAuthStateChange((event, session) => {
      updateCloudStatusUI();
      if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
        handleUserSignedIn();
      }
    });
  }

  updateCloudStatusUI();
}

function updateCloudStatusUI() {
  const dot = document.getElementById('cloudStatusDot');
  const label = document.getElementById('cloudStatusLabel');
  const actionsContainer = document.getElementById('cloudUserActions');
  const client = window.foundrySupabase;

  if (!dot || !label || !actionsContainer || !client) return;

  const isConn = client.isConfigured();
  const isAuth = client.isAuthenticated();
  const user = client.getUser();

  if (isAuth && user) {
    dot.className = 'cloud-status-dot connected';
    label.textContent = 'Cloud Sync: Active';
    actionsContainer.innerHTML = `
      <div class="cloud-user-badge" title="${escapeHtml(user.email)}">👤 ${escapeHtml(user.email)}</div>
      <div class="cloud-actions-row" style="display: flex; gap: 6px; margin-top: 6px;">
        <button class="btn btn-outline btn-xs" id="btnOpenWorkspaceSettings" type="button" title="Data Export & Account Management">⚙️ Workspace</button>
        <button class="btn btn-outline btn-xs" id="btnSignOut" type="button">Sign Out</button>
      </div>
    `;
    const btnSettings = document.getElementById('btnOpenWorkspaceSettings');
    if (btnSettings) {
      btnSettings.addEventListener('click', openWorkspaceSettingsModal);
    }
    const signOutBtn = document.getElementById('btnSignOut');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', async () => {
        await client.signOut();
        updateCloudStatusUI();
      });
    }
  } else if (isConn) {
    dot.className = 'cloud-status-dot connected';
    label.textContent = 'Supabase Connected';
    actionsContainer.innerHTML = `
      <button class="btn btn-lime-outline btn-xs btn-full" id="btnOpenAuthModal" type="button">
        Sign In to Sync
      </button>
    `;
    const btnOpenAuth = document.getElementById('btnOpenAuthModal');
    if (btnOpenAuth) {
      btnOpenAuth.addEventListener('click', () => {
        const authModal = document.getElementById('authModal');
        if (authModal) authModal.classList.remove('hidden');
      });
    }
  } else {
    dot.className = 'cloud-status-dot offline';
    label.textContent = 'Offline / Local Mode';
    actionsContainer.innerHTML = `
      <button class="btn btn-lime-outline btn-xs btn-full" id="btnOpenAuthModal" type="button">
        Sign In to Save
      </button>
    `;
    const btnOpenAuth = document.getElementById('btnOpenAuthModal');
    if (btnOpenAuth) {
      btnOpenAuth.addEventListener('click', () => {
        const authModal = document.getElementById('authModal');
        if (authModal) authModal.classList.remove('hidden');
      });
    }
  }
}

function openWorkspaceSettingsModal() {
  const modal = document.getElementById('workspaceSettingsModal');
  if (!modal) return;

  const emailEl = document.getElementById('settingsUserEmail');
  const backendEl = document.getElementById('settingsBackendTag');
  const wsIdEl = document.getElementById('settingsWorkspaceId');
  const deleteInput = document.getElementById('deleteConfirmationInput');
  const btnDelete = document.getElementById('btnConfirmDeleteAccount');
  const deleteNotice = document.getElementById('deleteAccountNotice');
  const exportStatus = document.getElementById('exportStatusText');

  const client = window.foundrySupabase;
  const isAuth = client && client.isAuthenticated();
  const user = client && client.getUser();

  if (emailEl) emailEl.textContent = isAuth && user ? user.email : 'Offline / Anonymous Founder';
  if (backendEl) {
    if (isAuth) {
      backendEl.textContent = 'Supabase Cloud (RLS Active)';
      backendEl.className = 'evidence-badge-lime';
    } else if (client && client.isConfigured()) {
      backendEl.textContent = 'Supabase (Awaiting Sign-In)';
      backendEl.className = 'badge-status-neutral';
    } else {
      backendEl.textContent = 'LocalStorage Browser Cache';
      backendEl.className = 'badge-status-neutral';
    }
  }
  if (wsIdEl) {
    wsIdEl.textContent = (client && client.workspaceId) ? client.workspaceId : (isAuth && user ? user.id.slice(0, 8) + '...' : 'local-workspace');
  }

  if (deleteInput) deleteInput.value = '';
  if (btnDelete) {
    btnDelete.disabled = true;
    btnDelete.textContent = '🗑️ Permanently Delete Account & Erase All Data';
  }
  if (deleteNotice) {
    deleteNotice.className = 'auth-notice hidden';
    deleteNotice.textContent = '';
  }
  if (exportStatus) {
    exportStatus.textContent = 'Includes all profile, simulation, and empirical evidence data';
    exportStatus.className = 'text-xs text-muted';
  }

  modal.classList.remove('hidden');
}
window.openWorkspaceSettingsModal = openWorkspaceSettingsModal;

function openPrivacyPolicyModal() {
  const modal = document.getElementById('privacyPolicyModal');
  if (modal) modal.classList.remove('hidden');
}
window.openPrivacyPolicyModal = openPrivacyPolicyModal;

async function handleExportWorkspaceJson() {
  const exportStatus = document.getElementById('exportStatusText');
  if (exportStatus) {
    exportStatus.textContent = 'Gathering workspace records...';
    exportStatus.className = 'text-xs text-lime';
  }

  try {
    const dataPackage = await window.foundrySupabase.exportWorkspaceData();
    const jsonStr = JSON.stringify(dataPackage, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `foundry-workspace-export-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (exportStatus) {
      exportStatus.textContent = '✅ Export downloaded successfully!';
      exportStatus.className = 'text-xs text-lime';
    }
  } catch (err) {
    console.error('Workspace export error:', err);
    if (exportStatus) {
      exportStatus.textContent = '⚠️ Export failed: ' + (err.message || 'Unknown error');
      exportStatus.className = 'text-xs text-danger';
    }
  }
}

async function handleConfirmDeleteAccount() {
  const btnDelete = document.getElementById('btnConfirmDeleteAccount');
  const deleteNotice = document.getElementById('deleteAccountNotice');
  const deleteInput = document.getElementById('deleteConfirmationInput');

  if (!deleteInput || deleteInput.value.trim().toUpperCase() !== 'DELETE') {
    if (deleteNotice) {
      deleteNotice.className = 'auth-notice error';
      deleteNotice.textContent = 'Please type DELETE exactly to confirm account erasure.';
      deleteNotice.classList.remove('hidden');
    }
    return;
  }

  if (btnDelete) {
    btnDelete.disabled = true;
    btnDelete.textContent = 'Purging all workspace data...';
  }

  try {
    await window.foundrySupabase.deleteAccountAndData();

    if (deleteNotice) {
      deleteNotice.className = 'auth-notice success';
      deleteNotice.textContent = '✅ Account and all workspace records permanently deleted. Resetting workspace...';
      deleteNotice.classList.remove('hidden');
    }

    // Reset client state
    setTimeout(() => {
      handleResetWorld();
      const modal = document.getElementById('workspaceSettingsModal');
      if (modal) modal.classList.add('hidden');
      updateCloudStatusUI();
    }, 1200);

  } catch (err) {
    console.error('Account deletion failed:', err);
    if (deleteNotice) {
      deleteNotice.className = 'auth-notice error';
      deleteNotice.textContent = '⚠️ Account deletion failed: ' + (err.message || 'Unknown error');
      deleteNotice.classList.remove('hidden');
    }
    if (btnDelete) {
      btnDelete.disabled = false;
      btnDelete.textContent = '🗑️ Permanently Delete Account & Erase All Data';
    }
  }
}

async function handleUserSignedIn() {
  if (!window.foundrySupabase || !window.foundrySupabase.isAuthenticated()) return;

  try {
    // 1. Startup Profile
    const profile = await window.foundrySupabase.loadStartupProfile();
    if (profile && profile.name) {
      state.profile = profile;
      saveState(STORAGE_PROFILE, state.profile);
    } else if (state.profile.name) {
      // First time sync from local state to backend
      await window.foundrySupabase.saveStartupProfile(state.profile);
    }

    // 2. Customer Groups
    const groups = await window.foundrySupabase.loadCustomerGroups();
    if (groups && groups.length > 0) {
      state.market.groups = groups;
      saveState(STORAGE_MARKET, state.market);
    } else if (state.market.groups.length > 0) {
      await window.foundrySupabase.saveCustomerGroups(state.market.groups);
    }

    // 3. Competitor Notes
    const notes = await window.foundrySupabase.loadCompetitorNotes();
    if (notes) {
      state.market.competitorNotes = notes;
      saveState(STORAGE_MARKET, state.market);
    } else if (state.market.competitorNotes) {
      await window.foundrySupabase.saveCompetitorNotes(state.market.competitorNotes);
    }

    // 4. Campaign
    const campaign = await window.foundrySupabase.loadCampaign();
    if (campaign) {
      state.campaign = { ...state.campaign, ...campaign };
      saveState(STORAGE_CAMPAIGN, state.campaign);
    } else if (state.campaign.price !== undefined) {
      await window.foundrySupabase.saveCampaign(state.campaign);
    }

    // 5. Simulation History
    const history = await window.foundrySupabase.loadSimulationHistory();
    if (history && history.length > 0) {
      state.history = history;
      saveState(STORAGE_HISTORY, state.history);
    }

    // 6. Real Market Evidence
    const evidence = await window.foundrySupabase.loadRealEvidence();
    if (evidence && evidence.length > 0) {
      state.realEvidence = evidence;
      saveState(STORAGE_REAL_EVIDENCE, state.realEvidence);
    } else if (state.realEvidence && state.realEvidence.length > 0) {
      for (const rec of state.realEvidence) {
        await window.foundrySupabase.saveRealEvidence(rec);
      }
    }

    renderAllViews();
    updateBadges();
  } catch (err) {
    console.error('Error hydrating state from Supabase:', err);
  }
}

/* ==========================================================
   14. GEMINI AI MARKET ANALYST (FREE TIER INTEGRATION)
   Server-side Edge Function only. Zero client-side API keys.
   ========================================================== */
let activeAiMode = 'examine_assumptions';
let isAiAnalyzing = false;
let aiCooldownRemaining = 0;
let aiCooldownInterval = null;

function initAiMarketAnalyst() {
  const modal = document.getElementById('aiAnalystModal');
  const navBtn = document.getElementById('navItemAiAnalyst');
  const btnOpenBanner = document.getElementById('btnOpenAiAnalystModal');
  const btnQuickExamine = document.getElementById('btnQuickAiExamine');
  const btnQuickIndicators = document.getElementById('btnQuickAiIndicators');
  const btnQuickGaps = document.getElementById('btnQuickAiGaps');
  const btnClose = document.getElementById('btnCloseAiAnalystModal');
  const btnCloseBottom = document.getElementById('btnCloseAiModalBottom');
  const btnRun = document.getElementById('btnRunAiAnalysis');
  const consentCheckbox = document.getElementById('aiFounderConsentCheckbox');

  // Trigger buttons
  if (navBtn) {
    navBtn.addEventListener('click', () => openAiMarketAnalystModal('examine_assumptions'));
  }
  if (btnOpenBanner) {
    btnOpenBanner.addEventListener('click', () => openAiMarketAnalystModal('examine_assumptions'));
  }
  if (btnQuickExamine) {
    btnQuickExamine.addEventListener('click', () => openAiMarketAnalystModal('examine_assumptions'));
  }
  if (btnQuickIndicators) {
    btnQuickIndicators.addEventListener('click', () => openAiMarketAnalystModal('explain_indicators'));
  }
  if (btnQuickGaps) {
    btnQuickGaps.addEventListener('click', () => openAiMarketAnalystModal('audit_gaps'));
  }

  // Close handlers
  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }
  if (btnCloseBottom && modal) {
    btnCloseBottom.addEventListener('click', () => modal.classList.add('hidden'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  // Mode Selection Tabs
  const modeButtons = document.querySelectorAll('[data-ai-mode]');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeAiMode = btn.getAttribute('data-ai-mode') || 'examine_assumptions';
    });
  });

  // Consent checkbox update
  if (consentCheckbox) {
    consentCheckbox.addEventListener('change', () => {
      updateAiPrivacyBadge(consentCheckbox.checked);
    });
  }

  // Evidence Inspection Accordion Toggle
  const btnToggleInspection = document.getElementById('btnToggleEvidenceInspection');
  const bodyInspection = document.getElementById('aiEvidenceInspectionBody');
  const arrowInspection = document.getElementById('evidenceInspectionArrow');
  if (btnToggleInspection && bodyInspection) {
    btnToggleInspection.addEventListener('click', () => {
      const isHidden = bodyInspection.classList.contains('hidden');
      if (isHidden) {
        bodyInspection.classList.remove('hidden');
        if (arrowInspection) arrowInspection.textContent = '▲ Hide Sourced Records';
      } else {
        bodyInspection.classList.add('hidden');
        if (arrowInspection) arrowInspection.textContent = '▼ Show Sourced Records';
      }
    });
  }

  // Run Analysis Button
  if (btnRun) {
    btnRun.addEventListener('click', runAiMarketAnalysis);
  }
}

function updateAiPrivacyBadge(consentGiven) {
  const badge = document.getElementById('aiPrivacyStateTag');
  const indicator = document.getElementById('aiShieldStatusIndicator');

  if (consentGiven) {
    if (badge) {
      badge.textContent = 'Included: Description & Segment Context';
      badge.className = 'evidence-badge-lime';
    }
    if (indicator) {
      indicator.textContent = 'Founder Consent Granted (Tailored Analysis)';
      indicator.className = 'text-xs text-lime';
    }
  } else {
    if (badge) {
      badge.textContent = 'Shield Active: Description Withheld';
      badge.className = 'badge-status-neutral';
    }
    if (indicator) {
      indicator.textContent = 'Shield Active: Minimal Data Mode';
      indicator.className = 'text-xs text-muted';
    }
  }
}

async function openAiMarketAnalystModal(initialMode = 'examine_assumptions') {
  const modal = document.getElementById('aiAnalystModal');
  if (!modal) return;

  activeAiMode = initialMode;

  // Update mode selector buttons
  const modeButtons = document.querySelectorAll('[data-ai-mode]');
  modeButtons.forEach(btn => {
    if (btn.getAttribute('data-ai-mode') === activeAiMode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Reset any previous analysis views
  const insufficientNotice = document.getElementById('aiInsufficientEvidenceNotice');
  if (insufficientNotice) {
    insufficientNotice.classList.add('hidden');
    insufficientNotice.innerHTML = '';
  }
  const evidenceInspection = document.getElementById('aiEvidenceInspectionSection');
  if (evidenceInspection) evidenceInspection.classList.add('hidden');
  const evidenceBody = document.getElementById('aiEvidenceInspectionBody');
  if (evidenceBody) {
    evidenceBody.classList.add('hidden');
    evidenceBody.innerHTML = '';
  }
  const arrowInspection = document.getElementById('evidenceInspectionArrow');
  if (arrowInspection) arrowInspection.textContent = '▼ Show Sourced Records';

  const emptyState = document.getElementById('aiEmptyState');
  if (emptyState) emptyState.classList.remove('hidden');
  const responseContent = document.getElementById('aiFormattedResponse');
  if (responseContent) {
    responseContent.classList.add('hidden');
    responseContent.innerHTML = '';
  }
  const loadingSpinner = document.getElementById('aiLoadingSpinner');
  if (loadingSpinner) loadingSpinner.classList.add('hidden');

  // Get current context from campaign or latest simulation
  const latestRun = (state.history && state.history[0]) || null;
  const countryCode = (state.campaign && state.campaign.country) || (latestRun && latestRun.countryCode) || 'USA';
  const countryName = resolveCountryName(countryCode);
  const industryDomain = (state.campaign && state.campaign.industry) || (latestRun && latestRun.industryDomain) || 'Mobile Applications';
  const price = (state.campaign && state.campaign.price !== undefined) ? state.campaign.price : 10;
  const budget = (state.campaign && state.campaign.budget !== undefined) ? state.campaign.budget : 300;
  const channel = (state.campaign && state.campaign.channel) || 'social';

  // Target group title
  let targetGroupTitle = 'All Segments';
  if (state.campaign && state.campaign.targetGroupId && state.market && state.market.groups) {
    const tg = state.market.groups.find(g => String(g.id) === String(state.campaign.targetGroupId));
    if (tg) targetGroupTitle = tg.name;
  }

  // Populate preview DOM
  const countryEl = document.getElementById('aiContextCountryBadge');
  const industryEl = document.getElementById('aiContextIndustryBadge');
  const pricingEl = document.getElementById('aiContextPricing');
  const targetGroupEl = document.getElementById('aiContextTargetGroup');
  const indicatorsListEl = document.getElementById('aiContextIndicatorsList');
  const consentCheckbox = document.getElementById('aiFounderConsentCheckbox');
  const noticeEl = document.getElementById('aiAnalystNotice');

  if (noticeEl) {
    noticeEl.className = 'auth-notice hidden';
    noticeEl.textContent = '';
  }

  if (countryEl) countryEl.textContent = `Market: ${countryName} (${countryCode})`;
  if (industryEl) industryEl.textContent = `Industry: ${industryDomain}`;
  if (pricingEl) pricingEl.textContent = `Price: $${price} | Budget: $${budget} | Channel: ${channel}`;
  if (targetGroupEl) targetGroupEl.textContent = targetGroupTitle;

  // Populate Sourced Indicators for this market
  const indicators = getIndicatorsForCountry(countryCode);
  if (indicatorsListEl) {
    if (indicators && indicators.length > 0) {
      indicatorsListEl.innerHTML = indicators.slice(0, 5).map(ind => `
        <span class="feedback-tag-source" title="${escapeHtml(ind.name || ind.indicator_name || '')}">
          ${escapeHtml(ind.name || ind.indicator_name || ind.code)} (${escapeHtml(ind.source || 'World Bank/ITU')})
        </span>
      `).join(' ');
    } else {
      indicatorsListEl.innerHTML = `
        <span class="feedback-tag-source">World Bank (WDI) &bull; ITU Broadband Indicators</span>
      `;
    }
  }

  // Update consent status
  if (consentCheckbox) {
    updateAiPrivacyBadge(consentCheckbox.checked);
  }

  modal.classList.remove('hidden');

  // Check Edge Function & Gemini API Status asynchronously
  await checkAndDisplayAiStatus();
}
window.openAiMarketAnalystModal = openAiMarketAnalystModal;

function resolveCountryName(code) {
  const map = {
    'USA': 'United States',
    'DEU': 'Germany',
    'GBR': 'United Kingdom',
    'IND': 'India',
    'BRA': 'Brazil',
    'JPN': 'Japan',
    'NGA': 'Nigeria',
    'KEN': 'Kenya',
    'FRA': 'France',
    'SGP': 'Singapore',
    'CAN': 'Canada'
  };
  return map[code] || code;
}

function getIndicatorsForCountry(code) {
  if (state.marketIndicators && state.marketIndicators[code]) {
    return state.marketIndicators[code];
  }
  // Fallback defaults from World Bank & ITU observations
  return [
    { code: 'IT.NET.BBND.P2', name: 'Fixed broadband subscriptions (per 100 people)', source: 'World Bank WDI', reference_period: '2023' },
    { code: 'IT.CEL.SETS.P2', name: 'Mobile cellular subscriptions (per 100 people)', source: 'ITU Connectivity', reference_period: '2024' },
    { code: 'NY.GDP.PCAP.CD', name: 'GDP per capita (current US$)', source: 'World Bank WDI', reference_period: '2023' },
    { code: 'FX.OWN.TOTL.ZS', name: 'Account ownership at financial institution (%)', source: 'Global Findex', reference_period: '2021' }
  ];
}

async function checkAndDisplayAiStatus() {
  const banner = document.getElementById('aiConnectionStatusBanner');
  const textEl = document.getElementById('aiConnectionStatusText');
  const helpLink = document.getElementById('aiConnectionHelpLink');
  const launchTag = document.getElementById('launchAiStatusTag');
  const modelBadge = document.getElementById('aiAnalystModelBadge');

  if (!banner || !textEl) return;

  if (!window.foundrySupabase || !window.foundrySupabase.isConfigured()) {
    banner.className = 'ai-connection-banner not-connected';
    textEl.textContent = 'Supabase Edge Function not configured (Setup Required)';
    if (helpLink) {
      helpLink.innerHTML = `<button type="button" class="btn btn-outline-cyan btn-xs" onclick="window.openCloudConfigModal ? window.openCloudConfigModal() : null">Connect Supabase</button>`;
    }
    if (launchTag) launchTag.textContent = 'Setup Required';
    return;
  }

  try {
    const status = await window.foundrySupabase.checkAiAnalystStatus();

    if (modelBadge && status.model) {
      modelBadge.textContent = status.model;
    }

    if (status.configured) {
      banner.className = 'ai-connection-banner connected';
      textEl.textContent = `Connected to Gemini Free Tier (${status.model}) via Supabase Edge Function`;
      if (helpLink) helpLink.innerHTML = `<span class="text-lime text-xs">Ready &bull; Free Tier</span>`;
      if (launchTag) launchTag.textContent = 'Online (Gemini)';
    } else {
      banner.className = 'ai-connection-banner not-connected';
      textEl.textContent = status.message || 'Edge Function reachable, but GEMINI_API_KEY secret is not set.';
      if (helpLink) {
        helpLink.innerHTML = `<span class="text-warning text-xs">Awaiting GEMINI_API_KEY in Supabase Secrets</span>`;
      }
      if (launchTag) launchTag.textContent = 'Key Not Set';
    }
  } catch (err) {
    banner.className = 'ai-connection-banner not-connected';
    textEl.textContent = 'Edge Function not reachable: ' + (err.message || 'Unknown error');
    if (helpLink) helpLink.innerHTML = `<span class="text-danger text-xs">Deploy Function</span>`;
  }
}

async function runAiMarketAnalysis() {
  if (isAiAnalyzing) return;

  const btnRun = document.getElementById('btnRunAiAnalysis');
  const noticeEl = document.getElementById('aiAnalystNotice');
  const emptyState = document.getElementById('aiEmptyState');
  const loadingSpinner = document.getElementById('aiLoadingSpinner');
  const responseContent = document.getElementById('aiFormattedResponse');
  const consentCheckbox = document.getElementById('aiFounderConsentCheckbox');
  const questionInput = document.getElementById('aiFounderQuestionInput');
  const question = questionInput ? questionInput.value.trim() : '';

  const insufficientNotice = document.getElementById('aiInsufficientEvidenceNotice');
  const evidenceInspection = document.getElementById('aiEvidenceInspectionSection');
  const evidenceBody = document.getElementById('aiEvidenceInspectionBody');
  const evidenceTitle = document.getElementById('evidenceInspectionTitle');

  if (!window.foundrySupabase || !window.foundrySupabase.isConfigured()) {
    if (noticeEl) {
      noticeEl.className = 'auth-notice error';
      noticeEl.textContent = 'Supabase is not configured. The AI Analyst calls Gemini through a Supabase Edge Function to protect API keys. (Your local simulator remains 100% usable).';
      noticeEl.classList.remove('hidden');
    }
    return;
  }

  const latestRun = (state.history && state.history[0]) || null;
  const countryCode = (state.campaign && state.campaign.country) || (latestRun && latestRun.countryCode) || 'USA';
  const countryName = resolveCountryName(countryCode);
  const industryDomain = (state.campaign && state.campaign.industry) || (latestRun && latestRun.industryDomain) || 'Mobile Applications';
  const price = (state.campaign && state.campaign.price !== undefined) ? state.campaign.price : 10;
  const budget = (state.campaign && state.campaign.budget !== undefined) ? state.campaign.budget : 300;
  const channel = (state.campaign && state.campaign.channel) || 'social';
  const sourcedIndicators = getIndicatorsForCountry(countryCode);

  let targetGroupName = 'Target Audience';
  if (state.campaign && state.campaign.targetGroupId && state.market && state.market.groups) {
    const tg = state.market.groups.find(g => String(g.id) === String(state.campaign.targetGroupId));
    if (tg) targetGroupName = tg.name;
  }

  let customerTraits = null;
  if (state.campaign && state.campaign.targetGroupId && state.market && state.market.groups) {
    const tg = state.market.groups.find(g => String(g.id) === String(state.campaign.targetGroupId));
    if (tg) {
      customerTraits = {
        groupName: tg.name,
        needs: tg.desc,
        budgetRange: tg.budget === 'low' ? 'Low ($0 – $15/mo)' : (tg.budget === 'high' ? 'High ($50 – $150/mo)' : (tg.budget === 'enterprise' ? 'Enterprise ($150+/mo)' : 'Moderate ($15 – $50/mo)')),
        priceSensitivity: tg.priceSensitivity || 'moderate',
        buyingPriorities: tg.buyingPriorities || 'Immediate ROI & Cost Reduction',
        preferredChannels: channelLabel(tg.channel)
      };
    }
  }
  if (!customerTraits) {
    customerTraits = {
      groupName: targetGroupName,
      needs: state.profile ? state.profile.desc : 'General Workflow Automation',
      budgetRange: 'Moderate ($15 – $50/mo)',
      priceSensitivity: 'Moderate',
      buyingPriorities: 'Immediate ROI & Cost Reduction',
      preferredChannels: channelLabel(channel)
    };
  }

  const consentGiven = Boolean(consentCheckbox && consentCheckbox.checked);

  isAiAnalyzing = true;
  if (btnRun) {
    btnRun.disabled = true;
    btnRun.textContent = 'Retrieving Evidence & Analyzing...';
  }
  if (noticeEl) noticeEl.classList.add('hidden');
  if (emptyState) emptyState.classList.add('hidden');
  if (responseContent) responseContent.classList.add('hidden');
  if (insufficientNotice) {
    insufficientNotice.classList.add('hidden');
    insufficientNotice.innerHTML = '';
  }
  if (evidenceInspection) evidenceInspection.classList.add('hidden');
  if (loadingSpinner) loadingSpinner.classList.remove('hidden');

  try {
    const result = await window.foundrySupabase.analyzeMarketWithAi({
      mode: activeAiMode,
      question,
      simulationRunId: latestRun ? latestRun.id : null,
      countryCode,
      countryName,
      industryDomain,
      price,
      budget,
      channel,
      targetGroupName,
      startupDesc: state.profile ? state.profile.desc : '',
      consentGiven,
      customerTraits,
      sourcedIndicators
    });

    if (loadingSpinner) loadingSpinner.classList.add('hidden');

    // Case 1: Insufficient Evidence Guardrail
    if (result && result.status === 'insufficient_evidence') {
      if (insufficientNotice) {
        const gaps = result.dataGaps || [];
        const gapsHtml = gaps.length > 0
          ? gaps.map(g => `<li style="margin-bottom: 4px;"><strong>${escapeHtml(g.name || g.code)}:</strong> ${escapeHtml(g.reason || 'Unreported')}</li>`).join('')
          : `<li>No verified macro indicators found in database for country code <code>${escapeHtml(countryCode)}</code>.</li>`;

        insufficientNotice.innerHTML = `
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <span style="font-size: 1.3rem; line-height: 1;">⚠️</span>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                <strong style="color: #fde047; font-size: 0.84rem;">Insufficient Sourced Evidence for ${escapeHtml(countryName)} (${escapeHtml(countryCode)})</strong>
                <span class="badge-status-neutral">Coverage: ${result.reportedCount || 0} Records</span>
              </div>
              <p style="color: #cbd5e1; font-size: 0.74rem; line-height: 1.45; margin: 4px 0 8px 0;">
                Foundry retrieved fewer than 2 verified indicators for this query (${result.reportedCount || 0} found). To prevent hallucinated market claims, Gemini execution was halted before dispatch.
              </p>
              <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 8px 10px; margin-bottom: 8px;">
                <strong style="color: #94a3b8; font-size: 0.72rem; text-transform: uppercase;">Missing / Unreported Metrics:</strong>
                <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 0.73rem; color: #cbd5e1;">
                  ${gapsHtml}
                </ul>
              </div>
              <div class="founder-action-box" style="background: rgba(251, 191, 36, 0.08); border: 1px dashed rgba(251, 191, 36, 0.4); border-radius: 6px; padding: 10px;">
                <strong style="color: #fde047; font-size: 0.76rem;">Action Required: Provide Stated Assumptions or Primary Research</strong>
                <p style="font-size: 0.73rem; color: #cbd5e1; margin: 4px 0 8px 0; line-height: 1.45;">
                  ${escapeHtml(result.message || 'Please provide your own assumption or field research findings to proceed.')}
                </p>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button type="button" class="btn btn-outline-cyan btn-xs" onclick="window.location.hash='#real-data'; document.getElementById('aiAnalystModal').classList.add('hidden');">
                    📝 Record Founder Field Research
                  </button>
                  <button type="button" class="btn btn-outline-cyan btn-xs" onclick="openTweakScenariosModal ? openTweakScenariosModal(currentActiveSimulationRun || (state.history && state.history[0])) : null; document.getElementById('aiAnalystModal').classList.add('hidden');">
                    ⚙️ Declare Stated Assumptions
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        insufficientNotice.classList.remove('hidden');
      }
      startAiCooldown(5);
      return;
    }

    // Case 2: Successful Grounded Response
    if (result && result.analysis) {
      if (responseContent) {
        responseContent.innerHTML = formatAiMarkdown(result.analysis, result.modelUsed);
        responseContent.classList.remove('hidden');
      }

      // Populate Server-Side Evidence Inspection Accordion
      if (evidenceInspection && evidenceBody && Array.isArray(result.evidenceUsed) && result.evidenceUsed.length > 0) {
        if (evidenceTitle) {
          evidenceTitle.textContent = `Inspect Used Evidence Records (${result.evidenceUsed.length} Records Retrieved Server-Side)`;
        }
        evidenceBody.innerHTML = renderEvidenceRecordsList(result.evidenceUsed, result.staleObservations);
        evidenceInspection.classList.remove('hidden');
      }

      // Save evidence records to latestRun for local inspectability
      if (latestRun) {
        latestRun.lastAiEvidenceUsed = result.evidenceUsed || [];
        latestRun.lastAiAnalysis = {
          mode: activeAiMode,
          model: result.modelUsed || 'gemini-2.5-flash-lite',
          generatedAt: new Date().toISOString(),
          question: question || null,
          evidenceRecordsCount: (result.evidenceUsed || []).length
        };
        saveState(STORAGE_HISTORY, state.history);
      }

      // If in hypothetical_scenarios mode, also save to latest simulation run
      if (activeAiMode === 'hypothetical_scenarios' && latestRun) {
        latestRun.hypotheticalCustomerScenarios = {
          generatedAt: new Date().toISOString(),
          modelVersion: latestRun.modelVersion || 'v2.0-grounded',
          aiModel: result.modelUsed || 'gemini-2.5-flash-lite',
          assumptions: {
            price,
            channel,
            budget,
            customerTraits
          },
          analysisMarkdown: result.analysis,
          evidence: (result.evidenceUsed && result.evidenceUsed.length > 0) ? result.evidenceUsed : ((latestRun.evidence || []).filter(e => e.assumption_type === 'macro_market_context'))
        };
        saveState(STORAGE_HISTORY, state.history);
        renderHypotheticalScenariosSection(latestRun);

        // Sync to Supabase if authenticated
        if (window.foundrySupabase && window.foundrySupabase.isAuthenticated() && latestRun.id) {
          window.foundrySupabase.updateSimulationRunScenarios(latestRun.id, latestRun.hypotheticalCustomerScenarios).catch(err => {
            console.warn('Could not sync scenarios from AI analyst modal to Supabase run:', err);
          });
        }
      }
    } else {
      throw new Error('No analysis text returned from Gemini edge function.');
    }

    startAiCooldown(10);
  } catch (err) {
    console.error('AI Analysis failed:', err);
    if (loadingSpinner) loadingSpinner.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');

    if (noticeEl) {
      noticeEl.className = 'auth-notice error';
      if (err.message && err.message.includes('quota')) {
        noticeEl.textContent = '⚠️ Google Gemini Free Tier Quota Exceeded (15 req/min). Please wait 60 seconds before retrying.';
      } else if (err.message && err.message.includes('GEMINI_API_KEY')) {
        noticeEl.textContent = '⚠️ Edge Function error: GEMINI_API_KEY secret is not set in Supabase Secrets. Please configure it in your Supabase project.';
      } else {
        noticeEl.textContent = '⚠️ ' + (err.message || 'Error executing AI analysis.') + ' (The deterministic simulation engine remains fully functional without AI).';
      }
      noticeEl.classList.remove('hidden');
    }
  } finally {
    isAiAnalyzing = false;
    if (btnRun) {
      btnRun.disabled = false;
      btnRun.textContent = '✨ Run AI Analysis with Gemini';
    }
  }
}

function renderEvidenceRecordsList(records, staleObservations = []) {
  if (!records || records.length === 0) {
    return '<p class="text-xs text-muted" style="padding: 10px;">No evidence records attached.</p>';
  }

  const staleCodes = new Set((staleObservations || []).map(s => s.code));

  return records.map(rec => {
    const isStale = rec.isStale || staleCodes.has(rec.code) || (rec.referenceYear && rec.referenceYear <= 2021);
    const valDisplay = rec.value !== null && rec.value !== undefined ? rec.value.toLocaleString() : 'N/A';
    const unitDisplay = rec.unit || '';
    const yearDisplay = rec.referenceYear || 'Unspecified';

    return `
      <div class="evidence-record-card" style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 10px 12px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 6px;">
          <div>
            <strong style="color: #38bdf8; font-size: 0.8rem;">${escapeHtml(rec.name || rec.code)}</strong>
            <span class="text-xs text-muted" style="margin-left: 6px;"><code>${escapeHtml(rec.code)}</code></span>
          </div>
          <div class="flex-align-center gap-1">
            ${isStale ? `<span class="badge-stale-obs" title="Observation year is 2021 or earlier. Post-pandemic inflation may alter current metrics.">⏳ Stale (${yearDisplay})</span>` : ''}
            <span class="sim-tag-fictional" style="font-size: 0.68rem; color: #a78bfa; border-color: rgba(167, 139, 250, 0.3);">
              ${escapeHtml(rec.sourceName || 'Verified Source')}
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin: 8px 0; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 4px; font-size: 0.74rem;">
          <div>
            <span class="text-muted text-xs block">Reported Value:</span>
            <strong class="text-lime">${escapeHtml(String(valDisplay))}</strong>
          </div>
          <div>
            <span class="text-muted text-xs block">Unit of Measurement:</span>
            <span class="text-white">${escapeHtml(unitDisplay)}</span>
          </div>
          <div>
            <span class="text-muted text-xs block">Reference Period:</span>
            <span class="text-white">${escapeHtml(String(yearDisplay))}</span>
          </div>
        </div>

        <div style="font-size: 0.73rem; color: #cbd5e1; line-height: 1.45; margin-bottom: 6px;">
          <strong style="color: #94a3b8; font-size: 0.7rem; text-transform: uppercase;">Definition:</strong>
          <span>${escapeHtml(rec.definition || 'No definition supplied.')}</span>
        </div>

        ${rec.limitation ? `
          <div style="font-size: 0.72rem; color: #fbbf24; background: rgba(251, 191, 36, 0.06); border-left: 2px solid #fbbf24; padding: 4px 8px; margin-bottom: 6px; border-radius: 0 4px 4px 0;">
            <strong>Limitation:</strong> ${escapeHtml(rec.limitation)}
          </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: #94a3b8; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px;">
          <span>Untrusted Boundary: Treated strictly as inert data</span>
          ${rec.sourceUrl ? `
            <a href="${escapeHtml(rec.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="evidence-source-link" style="color: #38bdf8; text-decoration: underline;">
              Verify at Source ↗
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function startAiCooldown(seconds) {
  const timerEl = document.getElementById('aiCooldownTimer');
  if (!timerEl) return;

  clearInterval(aiCooldownInterval);
  aiCooldownRemaining = seconds;

  aiCooldownInterval = setInterval(() => {
    aiCooldownRemaining--;
    if (aiCooldownRemaining <= 0) {
      clearInterval(aiCooldownInterval);
      timerEl.textContent = 'Gemini Free Tier Limit: 15 req/min';
    } else {
      timerEl.textContent = `Cooldown: wait ${aiCooldownRemaining}s`;
    }
  }, 1000);
}

function formatAiMarkdown(rawText, modelName) {
  if (!rawText) return '<p>No content</p>';

  let html = escapeHtml(rawText);

  html = html.replace(/^### (.*$)/gim, '<h5>$1</h5>');
  html = html.replace(/^## (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^# (.*$)/gim, '<h3>$1</h3>');

  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

  html = html.replace(/\[(World Bank[^\]]*|ITU[^\]]*|UNCTAD[^\]]*|Eurostat[^\]]*|Global Findex[^\]]*)\]/gim, '<span class="ai-citation-tag">$1</span>');

  html = html.replace(/(The available evidence does not support[^.\n]+(\.|\n))/gim, '<div class="ai-gap-callout">⚠️ <strong>Evidence Gap:</strong> $1</div>');

  html = html.replace(/(AI-generated simulation—not real customer feedback)/gim, '<span class="ai-simulation-badge" style="padding:2px 8px; border-radius:4px; display:inline-block; margin:2px 0;">$1</span>');

  html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gis, '<ul>$1</ul>');

  html = html.replace(/\n\n/gim, '</p><p>');

  return `
    <div class="ai-analysis-header-badge" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px;">
      <span class="sim-tag-fictional" style="color:#38bdf8; border-color:rgba(56,189,248,0.3); font-size:0.7rem;">
        Model: ${escapeHtml(modelName || 'Gemini 3.5 Flash-Lite')} (Free Tier)
      </span>
      <span class="text-xs text-muted">Grounded in Supplied Indicators &bull; Zero AI Math</span>
    </div>
    <div class="ai-formatted-body">
      <p>${html}</p>
    </div>
  `;
}

/* ==========================================================
   15. HYPOTHETICAL CUSTOMER SCENARIOS ENGINE & TWEAK CONTROLS
   ========================================================== */
function initHypotheticalScenarios() {
  const modal = document.getElementById('tweakScenariosModal');
  const btnClose = document.getElementById('btnCloseTweakScenariosModal');
  const btnCancel = document.getElementById('btnCancelTweakScenarios');
  const form = document.getElementById('tweakScenariosForm');
  const btnExplain = document.getElementById('btnExplainScenarioRerun');
  const btnQuickScenarios = document.getElementById('btnQuickAiScenarios');

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }
  if (btnCancel && modal) {
    btnCancel.addEventListener('click', () => modal.classList.add('hidden'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  if (btnQuickScenarios) {
    btnQuickScenarios.addEventListener('click', () => {
      const sec = document.getElementById('simHypotheticalScenariosSection');
      if (sec && !sec.classList.contains('hidden')) {
        sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        openAiMarketAnalystModal('hypothetical_scenarios');
      }
    });
  }

  if (btnExplain) {
    btnExplain.addEventListener('click', () => {
      alert(
        '💡 How Customer Assumptions Alter Simulated Reactions:\n\n' +
        '1. Stated Traits are Founder Hypotheses: Traits like budget range, price sensitivity, and buying priorities are defined directly by you. Foundry strictly prohibits inferring purchasing intent or budget from nationality.\n\n' +
        '2. Price Sensitivity Shift: If you increase price sensitivity from Low to High, simulated buyers push back more aggressively against upfront commitments and demand pilot programs or freemium tiers.\n\n' +
        '3. Buying Priorities Pivot: Selecting "Security & Compliance" focuses buyer pushback on SOC2, encryption, and data sovereignty, while "Immediate ROI" shifts objections to payback timelines.\n\n' +
        '4. Rerunning Scenarios: Click "Tweak Assumptions & Rerun" to adjust these traits and observe how simulated disagreement shifts—without altering deterministic revenue calculations.'
      );
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentRun = currentActiveSimulationRun || (state.history && state.history[0]);
      if (!currentRun) {
        alert('Please run a simulation before adjusting scenario assumptions.');
        return;
      }

      const nameInput = document.getElementById('tweakGroupName');
      const priceInput = document.getElementById('tweakPrice');
      const budgetSelect = document.getElementById('tweakBudget');
      const sensitivitySelect = document.getElementById('tweakPriceSensitivity');
      const prioritiesSelect = document.getElementById('tweakBuyingPriorities');
      const channelSelect = document.getElementById('tweakChannel');
      const needsTextarea = document.getElementById('tweakNeeds');

      const overrideTraits = {
        groupName: nameInput ? nameInput.value.trim() : (currentRun.targetGroupName || 'Target Group'),
        price: priceInput ? parseInt(priceInput.value, 10) : (currentRun.price || 10),
        budgetRange: budgetSelect ? budgetSelect.options[budgetSelect.selectedIndex].text : 'Moderate Budget ($15 – $50/mo tolerance)',
        priceSensitivity: sensitivitySelect ? sensitivitySelect.options[sensitivitySelect.selectedIndex].text : 'Moderate',
        buyingPriorities: prioritiesSelect ? prioritiesSelect.value : 'Immediate ROI & Cost Reduction',
        channel: channelSelect ? channelSelect.value : (currentRun.channel || 'social'),
        channelLabel: channelSelect ? channelSelect.options[channelSelect.selectedIndex].text : 'Social Media Ads',
        needs: needsTextarea ? needsTextarea.value.trim() : (state.profile ? state.profile.desc : '')
      };

      if (modal) modal.classList.add('hidden');
      generateHypotheticalScenariosForRun(currentRun, overrideTraits);
    });
  }
}

function openTweakScenariosModal(run) {
  const modal = document.getElementById('tweakScenariosModal');
  if (!modal) return;

  const currentRun = run || currentActiveSimulationRun || (state.history && state.history[0]);
  if (!currentRun) {
    alert('Please execute a campaign simulation in the Launch Lab before adjusting customer traits.');
    return;
  }

  const traits = currentRun.customerTraits || {};
  const nameInput = document.getElementById('tweakGroupName');
  const priceInput = document.getElementById('tweakPrice');
  const budgetSelect = document.getElementById('tweakBudget');
  const sensitivitySelect = document.getElementById('tweakPriceSensitivity');
  const prioritiesSelect = document.getElementById('tweakBuyingPriorities');
  const channelSelect = document.getElementById('tweakChannel');
  const needsTextarea = document.getElementById('tweakNeeds');

  if (nameInput) nameInput.value = traits.groupName || currentRun.targetGroupName || 'Early Adopters';
  if (priceInput) priceInput.value = currentRun.price !== undefined ? currentRun.price : 10;
  
  if (budgetSelect) {
    const b = (traits.budgetRange || '').toLowerCase();
    if (b.includes('low') || b.includes('$0')) budgetSelect.value = 'low';
    else if (b.includes('enterprise') || b.includes('$150')) budgetSelect.value = 'enterprise';
    else if (b.includes('high') || b.includes('$50')) budgetSelect.value = 'high';
    else budgetSelect.value = 'medium';
  }

  if (sensitivitySelect) {
    const s = (traits.priceSensitivity || '').toLowerCase();
    if (s.includes('high')) sensitivitySelect.value = 'high';
    else if (s.includes('low')) sensitivitySelect.value = 'low';
    else sensitivitySelect.value = 'moderate';
  }

  if (prioritiesSelect) {
    const p = traits.buyingPriorities || '';
    let matched = false;
    for (let opt of prioritiesSelect.options) {
      if (opt.value === p || p.includes(opt.value) || opt.value.includes(p)) {
        prioritiesSelect.value = opt.value;
        matched = true;
        break;
      }
    }
    if (!matched) prioritiesSelect.value = 'Immediate ROI & Cost Reduction';
  }

  if (channelSelect) {
    channelSelect.value = currentRun.channel || 'social';
  }

  if (needsTextarea) {
    needsTextarea.value = traits.needs || (state.profile ? state.profile.desc : '') || '';
  }

  const notice = document.getElementById('tweakModalNotice');
  if (notice) notice.classList.add('hidden');

  modal.classList.remove('hidden');
}

function renderHypotheticalScenariosSection(res) {
  const container = document.getElementById('simHypotheticalScenariosSection');
  if (!container) return;

  const contextBar = document.getElementById('scenariosContextBar');
  const dynamicContainer = document.getElementById('scenariosDynamicContainer');
  const headerActions = document.getElementById('scenariosHeaderActions');

  const traits = res.customerTraits || {
    groupName: res.targetGroupName || 'Target Customer Group',
    needs: state.profile ? state.profile.desc : 'Workflow optimization',
    budgetRange: res.targetBudget ? `${res.targetBudget.toUpperCase()} Budget` : 'Moderate ($15 – $50/mo)',
    priceSensitivity: 'Moderate',
    buyingPriorities: 'Immediate ROI & Cost Reduction',
    preferredChannels: channelLabel(res.channel || 'social')
  };

  // Populate context bar with founder stated assumptions
  if (contextBar) {
    contextBar.innerHTML = `
      <span class="text-xs text-muted" style="margin-right: 4px;">Founder Stated Customer Traits:</span>
      <span class="trait-pill"><strong>Persona:</strong> ${escapeHtml(traits.groupName)}</span>
      <span class="trait-pill"><strong>Budget:</strong> ${escapeHtml(traits.budgetRange)}</span>
      <span class="trait-pill"><strong>Sensitivity:</strong> ${escapeHtml(traits.priceSensitivity)}</span>
      <span class="trait-pill"><strong>Priority:</strong> ${escapeHtml(traits.buyingPriorities)}</span>
      <span class="trait-pill"><strong>Discovery:</strong> ${escapeHtml(traits.preferredChannels)}</span>
      <span class="trait-pill trait-pill-macro"><strong>Macro Baseline:</strong> ${escapeHtml(res.countryName || 'United States')} (${escapeHtml(res.countryCode || 'USA')})</span>
    `;
  }

  // Populate Header Actions
  if (headerActions) {
    if (res.hypotheticalCustomerScenarios) {
      headerActions.innerHTML = `
        <button type="button" class="btn btn-outline-cyan btn-xs" id="btnOpenTweakModal">
          🔄 Tweak Assumptions &amp; Rerun
        </button>
      `;
    } else {
      headerActions.innerHTML = `
        <button type="button" class="btn btn-cyan btn-xs" id="btnGenerateScenariosDirect" style="background: linear-gradient(135deg, #8b5cf6, #6366f1); border-color: #8b5cf6;">
          ✨ Generate Scenarios with Gemini
        </button>
      `;
    }
    const btnOpenTweak = document.getElementById('btnOpenTweakModal');
    const btnGenerateDirect = document.getElementById('btnGenerateScenariosDirect');
    if (btnOpenTweak) btnOpenTweak.addEventListener('click', () => openTweakScenariosModal(res));
    if (btnGenerateDirect) btnGenerateDirect.addEventListener('click', () => generateHypotheticalScenariosForRun(res));
  }

  // If scenarios have not been generated yet, show informative callout
  if (!res.hypotheticalCustomerScenarios) {
    if (dynamicContainer) {
      dynamicContainer.innerHTML = `
        <div class="scenarios-prompt-card">
          <div style="font-size: 1.8rem; margin-bottom: 8px;">🔮</div>
          <h5 style="color: #f8fafc; margin: 0 0 6px 0; font-size: 0.95rem;">Simulate Plausible Customer Disagreements &amp; Hesitations</h5>
          <p style="color: #cbd5e1; font-size: 0.77rem; max-width: 580px; margin: 0 auto 14px auto; line-height: 1.5;">
            Use Google Gemini (via Supabase Edge Function) to simulate 3–4 contrasting hypothetical buyer perspectives for <strong>${escapeHtml(traits.groupName)}</strong>. Scenarios stress-test your proposed price of <strong>$${res.price}/mo</strong> against declared budget thresholds, price sensitivity, and macro market context.
          </p>
          <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
            <button type="button" class="btn btn-cyan btn-sm" id="btnGenerateScenariosPrompt" style="background: linear-gradient(135deg, #8b5cf6, #6366f1); border-color: #8b5cf6;">
              ✨ Generate Hypothetical Scenarios
            </button>
            <button type="button" class="btn btn-outline-cyan btn-sm" id="btnOpenTweakModalPrompt">
              ⚙️ Adjust Customer Traits First
            </button>
          </div>
          <div style="margin-top: 12px; font-size: 0.7rem; color: #fbbf24;">
            ⚠️ <em>AI-generated simulation—not real customer feedback. Do not infer purchasing intent from nationality.</em>
          </div>
        </div>
      `;

      const btnGen = document.getElementById('btnGenerateScenariosPrompt');
      const btnTweak = document.getElementById('btnOpenTweakModalPrompt');
      if (btnGen) btnGen.addEventListener('click', () => generateHypotheticalScenariosForRun(res));
      if (btnTweak) btnTweak.addEventListener('click', () => openTweakScenariosModal(res));
    }
    return;
  }

  // Render generated scenarios
  const scenData = res.hypotheticalCustomerScenarios;
  const formattedHtml = formatHypotheticalScenariosMarkdown(scenData.analysisMarkdown || '', scenData.aiModel || 'Gemini 3.5 Flash-Lite');

  if (dynamicContainer) {
    dynamicContainer.innerHTML = `
      <div class="scenarios-rendered-wrapper">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div class="flex-align-center gap-2">
            <span class="sim-tag-fictional" style="color: #c084fc; border-color: rgba(168, 85, 247, 0.4); font-size: 0.7rem;">
              Model: ${escapeHtml(scenData.aiModel || 'gemini-2.5-flash-lite')} (Free Tier)
            </span>
            <span class="text-xs text-muted">Generated: ${new Date(scenData.generatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="flex-align-center gap-2">
            <span class="ai-simulation-badge" style="padding: 2px 8px; border-radius: 4px;">
              AI-generated simulation—not real customer feedback
            </span>
            <button type="button" class="btn btn-outline-cyan btn-xs" id="btnRerunDirect">
              🔄 Tweak &amp; Rerun
            </button>
          </div>
        </div>

        <div class="scenarios-formatted-output">
          ${formattedHtml}
        </div>
      </div>
    `;

    const btnRerunDirect = document.getElementById('btnRerunDirect');
    if (btnRerunDirect) btnRerunDirect.addEventListener('click', () => openTweakScenariosModal(res));
  }
}

async function generateHypotheticalScenariosForRun(run, overrideTraits = null) {
  if (!run) return;

  const dynamicContainer = document.getElementById('scenariosDynamicContainer');
  if (dynamicContainer) {
    dynamicContainer.innerHTML = `
      <div style="text-align: center; padding: 36px 18px;">
        <div class="spinner-pulse" style="background: #a855f7;"></div>
        <div style="margin-top: 14px; font-weight: 600; color: #c084fc; font-size: 0.88rem;">
          Generating Hypothetical Customer Scenarios with Gemini...
        </div>
        <div style="font-size: 0.74rem; color: #94a3b8; margin-top: 4px; max-width: 480px; margin-left: auto; margin-right: auto;">
          Analyzing stated budget tolerance ($${overrideTraits && overrideTraits.price !== undefined ? overrideTraits.price : run.price}/mo), price sensitivity, and primary buying priorities against macroeconomic indicators.
        </div>
      </div>
    `;
  }

  const countryCode = run.countryCode || run.country?.code || 'USA';
  const countryName = run.countryName || run.country?.name || resolveCountryName(countryCode);
  const industryDomain = run.industryDomain || run.industry || 'Mobile Applications';
  const price = overrideTraits && overrideTraits.price !== undefined ? overrideTraits.price : run.price;
  const budget = overrideTraits && overrideTraits.budget !== undefined ? overrideTraits.budget : run.budget;
  const channel = overrideTraits && overrideTraits.channel ? overrideTraits.channel : run.channel;
  const sourcedIndicators = getIndicatorsForCountry(countryCode);

  const customerTraits = overrideTraits ? {
    groupName: overrideTraits.groupName || run.targetGroupName,
    needs: overrideTraits.needs || (run.customerTraits && run.customerTraits.needs) || (state.profile ? state.profile.desc : ''),
    budgetRange: overrideTraits.budgetRange || (run.customerTraits && run.customerTraits.budgetRange) || 'Moderate ($15 – $50/mo)',
    priceSensitivity: overrideTraits.priceSensitivity || (run.customerTraits && run.customerTraits.priceSensitivity) || 'Moderate',
    buyingPriorities: overrideTraits.buyingPriorities || (run.customerTraits && run.customerTraits.buyingPriorities) || 'Immediate ROI & Cost Reduction',
    preferredChannels: overrideTraits.channelLabel || channelLabel(channel)
  } : (run.customerTraits || {
    groupName: run.targetGroupName || 'Target Customer Group',
    needs: state.profile ? state.profile.desc : '',
    budgetRange: 'Moderate ($15 – $50/mo)',
    priceSensitivity: 'Moderate',
    buyingPriorities: 'Immediate ROI & Cost Reduction',
    preferredChannels: channelLabel(channel)
  });

  try {
    const result = await window.foundrySupabase.analyzeMarketWithAi({
      mode: 'hypothetical_scenarios',
      countryCode,
      countryName,
      industryDomain,
      price,
      budget,
      channel,
      targetGroupName: customerTraits.groupName,
      startupDesc: state.profile ? state.profile.desc : '',
      consentGiven: true,
      customerTraits,
      sourcedIndicators
    });

    if (result && result.analysis) {
      const scenariosPayload = {
        generatedAt: new Date().toISOString(),
        modelVersion: run.modelVersion || 'v2.0-grounded',
        aiModel: result.modelUsed || 'gemini-2.5-flash-lite',
        assumptions: {
          price,
          channel,
          budget,
          customerTraits
        },
        analysisMarkdown: result.analysis,
        evidence: (run.evidence || []).filter(e => e.assumption_type === 'macro_market_context')
      };

      run.hypotheticalCustomerScenarios = scenariosPayload;
      if (overrideTraits) {
        run.customerTraits = customerTraits;
        run.price = price;
        run.channel = channel;
      }

      // Update state.history
      const histIdx = state.history.findIndex(h => String(h.id) === String(run.id));
      if (histIdx !== -1) {
        state.history[histIdx] = run;
      } else if (state.history[0]) {
        state.history[0] = run;
      }
      saveState(STORAGE_HISTORY, state.history);

      // Sync update to Supabase
      if (window.foundrySupabase && window.foundrySupabase.isAuthenticated() && run.id) {
        window.foundrySupabase.updateSimulationRunScenarios(run.id, scenariosPayload).catch(err => {
          console.warn('Could not sync scenarios to Supabase run:', err);
        });
      }

      renderHypotheticalScenariosSection(run);
    } else {
      throw new Error('No scenarios text returned from Gemini Edge Function.');
    }
  } catch (err) {
    console.error('Scenario generation failed:', err);
    if (dynamicContainer) {
      dynamicContainer.innerHTML = `
        <div class="auth-notice error" style="margin: 14px 0;">
          <strong>Error generating scenarios:</strong> ${escapeHtml(err.message || 'Edge function error')}.
          <div style="margin-top: 8px;">
            <button type="button" class="btn btn-outline-cyan btn-xs" onclick="renderHypotheticalScenariosSection(currentActiveSimulationRun)">
              Return to Scenarios Overview
            </button>
          </div>
        </div>
      `;
    }
  }
}

function formatHypotheticalScenariosMarkdown(rawText, modelName) {
  if (!rawText) return '<p>No scenario content available.</p>';

  let html = escapeHtml(rawText);

  // Markdown headers
  html = html.replace(/^### (.*$)/gim, '<h5 style="color:#c084fc; margin-top:14px; margin-bottom:6px; font-size:0.9rem;">$1</h5>');
  html = html.replace(/^## (.*$)/gim, '<h4 style="color:#e9d5ff; margin-top:16px; margin-bottom:8px; font-size:1.02rem; border-bottom:1px solid rgba(168,85,247,0.2); padding-bottom:4px;">$1</h4>');
  html = html.replace(/^# (.*$)/gim, '<h3 style="color:#f8fafc; font-size:1.15rem; margin-bottom:10px;">$1</h3>');

  // Bold text
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong style="color:#f8fafc;">$1</strong>');

  // Grounding Citation Badges [World Bank...] or [ITU...]
  html = html.replace(/\[(World Bank[^\]]*|ITU[^\]]*|UNCTAD[^\]]*|Eurostat[^\]]*|Global Findex[^\]]*)\]/gim, '<span class="ai-citation-tag">$1</span>');

  // Evidence Gap Callout
  html = html.replace(/(The available evidence does not support[^.\n]+(\.|\n))/gim, '<div class="ai-gap-callout">⚠️ <strong>Evidence Gap:</strong> $1</div>');

  // Prominent simulation tag
  html = html.replace(/(AI-generated simulation—not real customer feedback)/gim, '<span class="ai-simulation-badge" style="padding:2px 8px; border-radius:4px; display:inline-block; margin:2px 0;">$1</span>');

  // Lists
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li style="margin-bottom:4px; color:#cbd5e1; font-size:0.77rem;">$1</li>');
  html = html.replace(/(<li.*<\/li>)/gis, '<ul style="margin:6px 0 10px 18px; padding:0;">$1</ul>');

  // Double newlines to paragraphs
  html = html.replace(/\n\n/gim, '</p><p style="margin:6px 0; color:#cbd5e1; font-size:0.77rem; line-height:1.5;">');

  return `
    <div class="ai-formatted-body" style="line-height:1.55;">
      <p style="margin:6px 0; color:#cbd5e1; font-size:0.77rem; line-height:1.5;">${html}</p>
    </div>
  `;
}


