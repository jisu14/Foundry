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
    budget: 300
  },
  history: [],
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
  initMarketCityMap();
  initProfileForm();
  initMarketForms();
  initLaunchLab();
  initHistoryView();
  initLibraryView();
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

  // Handle URL hash on load
  const hash = window.location.hash.replace('#', '');
  if (['overview', 'profile', 'market', 'launch', 'history', 'library'].includes(hash)) {
    navigateToView(hash);
  } else {
    navigateToView('overview');
  }
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
  } else if (viewId === 'launch') {
    populateTargetGroupDropdown();
  } else if (viewId === 'library') {
    renderLibraryView();
  }
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
      budget: 300
    },
    history: [],
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
  const channelSelect = document.getElementById('groupChannel');

  groupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newGroup = {
      id: 'grp_' + Date.now(),
      name: nameInput.value.trim(),
      desc: descInput.value.trim(),
      budget: budgetSelect.value,
      channel: channelSelect.value
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
    budgetSelect.value = 'medium';
    channelSelect.value = 'social';

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
    low: 'Low Budget ($0–$10)',
    medium: 'Moderate Budget ($10–$35)',
    high: 'Enterprise Budget ($35–$90)'
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
   7. LAUNCH LAB (SIMULATION ENGINE)
   ========================================================== */
function initLaunchLab() {
  const priceInput = document.getElementById('campaignPrice');
  const priceDisplay = document.getElementById('campaignPriceDisplay');
  const budgetInput = document.getElementById('campaignBudget');
  const budgetDisplay = document.getElementById('campaignBudgetDisplay');
  const channelSelect = document.getElementById('campaignChannel');
  const executeBtn = document.getElementById('executeSimulationBtn');

  priceInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    priceDisplay.textContent = val === 0 ? 'Free ($0)' : `$${val} / mo`;
    state.campaign.price = val;
    saveCampaignState();
  });

  budgetInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    budgetDisplay.textContent = `$${val.toLocaleString()}`;
    state.campaign.budget = val;
    saveCampaignState();
  });

  channelSelect.addEventListener('change', (e) => {
    state.campaign.channel = e.target.value;
    saveCampaignState();
  });

  executeBtn.addEventListener('click', handleExecuteSimulation);
}

function populateTargetGroupDropdown() {
  const groupSelect = document.getElementById('campaignTargetGroup');
  const noGroupWarning = document.getElementById('noGroupWarning');
  const executeBtn = document.getElementById('executeSimulationBtn');
  const groups = state.market.groups;

  groupSelect.innerHTML = '';

  if (groups.length === 0) {
    noGroupWarning.classList.remove('hidden');
    executeBtn.disabled = true;
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '-- No custom customer groups available --';
    groupSelect.appendChild(opt);
    return;
  }

  noGroupWarning.classList.add('hidden');
  executeBtn.disabled = false;

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

  const executeBtn = document.getElementById('executeSimulationBtn');
  const statusBadge = document.getElementById('simLabStatusBadge');

  executeBtn.disabled = true;
  executeBtn.textContent = 'Simulating Market...';
  statusBadge.className = 'status-badge badge-running';
  statusBadge.textContent = 'Simulating Outcomes...';

  // Gather macro indicators context
  const targetCountry = state.profile.country || 'United States';
  const iso3 = (window.foundrySupabase && window.foundrySupabase.resolveIso3(targetCountry)) || 'USA';

  let macroEvidence = [];
  if (window.foundrySupabase && window.foundrySupabase.isConfigured()) {
    try {
      const observations = await window.foundrySupabase.getCountryObservations({ countryCode: iso3, limit: 10 });
      if (observations && observations.length > 0) {
        macroEvidence = observations.map(obs => ({
          indicator_code: obs.indicator_code,
          indicator_name: obs.market_indicators?.name || obs.indicator_code,
          indicator_value: obs.value,
          indicator_unit: obs.unit,
          reference_year: obs.year,
          country_code: obs.country_code,
          assumption_type: 'macro_market_context',
          assumption_key: obs.indicator_code,
          assumption_value: obs.value !== null ? `${Number(obs.value).toLocaleString()} ${obs.unit}` : 'Missing/Not Reported',
          formula_applied: 'National macro scale & infrastructure context',
          disclaimer: 'Country-level macroeconomic context. Does not forecast individual willingness to pay.'
        }));
      }
    } catch (e) {
      console.warn('Could not fetch live country observations for evidence:', e);
    }
  }

  if (macroEvidence.length === 0) {
    macroEvidence = SOURCED_INDICATOR_CATALOG.map(ind => ({
      indicator_code: ind.code,
      indicator_name: ind.name,
      indicator_value: null,
      indicator_unit: ind.unit,
      reference_year: 2023,
      country_code: iso3,
      assumption_type: 'macro_market_context',
      assumption_key: ind.code,
      assumption_value: `Catalog Benchmark (${ind.unit})`,
      formula_applied: 'Standard WDI baseline reference',
      disclaimer: 'Country-level macroeconomic context. Does not forecast individual willingness to pay.'
    }));
  }

  const founderAssumptions = [
    {
      indicator_code: null,
      indicator_name: 'Customer Group Budget Tolerance',
      indicator_value: null,
      indicator_unit: 'budget tier',
      reference_year: null,
      country_code: iso3,
      assumption_type: 'founder_hypothesis',
      assumption_key: 'budget_tier',
      assumption_value: `${targetGroup.budget.toUpperCase()} (${targetGroup.name})`,
      formula_applied: 'Sensitivity threshold: low ($7), medium ($28), high ($55)',
      disclaimer: 'Hypothesis declared by founder.'
    },
    {
      indicator_code: null,
      indicator_name: 'Marketing Channel Affinity',
      indicator_value: null,
      indicator_unit: 'channel',
      reference_year: null,
      country_code: iso3,
      assumption_type: 'founder_hypothesis',
      assumption_key: 'channel_selection',
      assumption_value: `${channelLabel(channel)} (Group preference: ${channelLabel(targetGroup.channel)})`,
      formula_applied: targetGroup.channel === channel ? '1.35x-1.5x affinity multiplier' : '0.6x-0.85x penalty multiplier',
      disclaimer: 'Channel fit assumption.'
    },
    {
      indicator_code: null,
      indicator_name: 'Pricing Elasticity Hypothesis',
      indicator_value: price,
      indicator_unit: 'US$/mo',
      reference_year: null,
      country_code: iso3,
      assumption_type: 'founder_hypothesis',
      assumption_key: 'subscription_price',
      assumption_value: price === 0 ? 'Free ($0)' : `$${price}/mo`,
      formula_applied: 'Price fit curve applied against customer budget tier',
      disclaimer: 'Stated subscription tier.'
    }
  ];

  const fullEvidence = [...macroEvidence, ...founderAssumptions];

  setTimeout(async () => {
    const result = runLaunchSimulationEngine({
      appName,
      targetGroup,
      price,
      channel,
      budget
    });

    result.evidence = fullEvidence;

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
        body: `Broadcasted campaign to ${targetGroup.name} via ${channelLabel(channel)}. Generated ${result.impressions.toLocaleString()} reach and ${result.clicks.toLocaleString()} marketplace visitors.`,
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

    executeBtn.disabled = false;
    executeBtn.textContent = 'Run Simulated Launch';
    statusBadge.className = 'status-badge badge-done';
    statusBadge.textContent = 'Simulation Complete';
  }, 400);
}

function runLaunchSimulationEngine({ appName, targetGroup, price, channel, budget }) {
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

  return {
    id: 'run_' + Date.now(),
    runNumber: state.history.length + 1,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    appName,
    targetGroupName: targetGroup.name,
    targetGroupId: targetGroup.id,
    targetBudget: targetGroup.budget,
    price,
    channel,
    budget,
    impressions,
    clicks,
    installs,
    paidUsers,
    revenue,
    netProfit,
    avgRating,
    reviews
  };
}

function generateDynamicSimulatedReviews(targetGroup, appName, price, avgRating) {
  const reviews = [];
  const groupName = targetGroup.name;

  if (targetGroup.budget === 'low') {
    if (price === 0) {
      reviews.push({
        name: 'Alex M.',
        initials: 'AM',
        role: groupName,
        rating: 5,
        quote: `Incredible that ${appName} is free. Perfect fit for our workflow without burning any budget.`
      });
      reviews.push({
        name: 'Jordan K.',
        initials: 'JK',
        role: groupName,
        rating: 4,
        quote: `Found this through an ad. Clean utility. Hope you keep a generous free plan!`
      });
    } else if (price <= 8) {
      reviews.push({
        name: 'Taylor S.',
        initials: 'TS',
        role: groupName,
        rating: 5,
        quote: `At $${price}/mo it is well within our budget. ${appName} pays for itself by saving us hours.`
      });
      reviews.push({
        name: 'Morgan P.',
        initials: 'MP',
        role: groupName,
        rating: 4,
        quote: `Fair price ($${price}) for what it offers. Good core features.`
      });
    } else {
      reviews.push({
        name: 'Casey R.',
        initials: 'CR',
        role: groupName,
        rating: 2,
        quote: `$${price} a month is way beyond our spending limit. Uninstalled as soon as the paywall appeared.`
      });
      reviews.push({
        name: 'Riley B.',
        initials: 'RB',
        role: groupName,
        rating: 3,
        quote: `Interesting tool, but for ${groupName}, $${price} is too steep for our margins.`
      });
    }
  } else if (targetGroup.budget === 'medium') {
    if (price < 10) {
      reviews.push({
        name: 'Sam V.',
        initials: 'SV',
        role: groupName,
        rating: 3,
        quote: `It's cheap ($${price}), but makes me wonder about reliability and long-term roadmap.`
      });
      reviews.push({
        name: 'Pat D.',
        initials: 'PD',
        role: groupName,
        rating: 4,
        quote: `Good value. Saves our team time every day. Worth more than $${price}.`
      });
    } else if (price <= 35) {
      reviews.push({
        name: 'Devon L.',
        initials: 'DL',
        role: groupName,
        rating: 5,
        quote: `${appName} fits directly into our operations. $${price}/mo is an easy purchase decision.`
      });
      reviews.push({
        name: 'Robin H.',
        initials: 'RH',
        role: groupName,
        rating: 4,
        quote: `Smooth experience. Delivered the core functionality we needed as ${groupName}.`
      });
    } else {
      reviews.push({
        name: 'Chris T.',
        initials: 'CT',
        role: groupName,
        rating: 2,
        quote: `$${price}/mo is too expensive unless you include enterprise compliance and team sharing.`
      });
      reviews.push({
        name: 'Dana W.',
        initials: 'DW',
        role: groupName,
        rating: 3,
        quote: `Good baseline, but competitor tools offer more for this price tier.`
      });
    }
  } else {
    if (price < 20) {
      reviews.push({
        name: 'Evelyn G.',
        initials: 'EG',
        role: groupName,
        rating: 3,
        quote: `Priced at $${price}? Feels too lightweight for serious business workloads.`
      });
      reviews.push({
        name: 'Quinn N.',
        initials: 'QN',
        role: groupName,
        rating: 4,
        quote: `Snappy UI in ${appName}. Expand the API endpoints and team administration tools.`
      });
    } else if (price <= 60) {
      reviews.push({
        name: 'Marcus E.',
        initials: 'ME',
        role: groupName,
        rating: 5,
        quote: `Exactly what we were looking for. $${price}/mo is justified by the operational speedup.`
      });
      reviews.push({
        name: 'Avery Z.',
        initials: 'AZ',
        role: groupName,
        rating: 4,
        quote: `High quality tool for ${groupName}. Good fit for our workflows.`
      });
    } else {
      reviews.push({
        name: 'Logan C.',
        initials: 'LC',
        role: groupName,
        rating: 2,
        quote: `$${price}/mo requires executive committee sign-off and custom security audits.`
      });
      reviews.push({
        name: 'Reese F.',
        initials: 'RF',
        role: groupName,
        rating: 3,
        quote: `Overpriced for an early product. Wait until v2 or when integrations improve.`
      });
    }
  }

  return reviews;
}

function displayLaunchResults(res) {
  const emptyState = document.getElementById('launchEmptyState');
  const resultsArea = document.getElementById('launchResultsArea');

  emptyState.classList.add('hidden');
  resultsArea.classList.remove('hidden');

  document.getElementById('resImpressions').textContent = res.impressions.toLocaleString();
  const ctr = ((res.clicks / res.impressions) * 100).toFixed(1);
  document.getElementById('resClicks').textContent = `${res.clicks.toLocaleString()} clicks (${ctr}% CTR)`;

  document.getElementById('resInstalls').textContent = res.installs.toLocaleString();
  const conv = ((res.installs / res.clicks) * 100).toFixed(1);
  document.getElementById('resConversion').textContent = `${conv}% of clicks installed`;

  document.getElementById('resPaidUsers').textContent = res.paidUsers.toLocaleString();
  const paidPct = res.installs > 0 ? ((res.paidUsers / res.installs) * 100).toFixed(1) : 0;
  document.getElementById('resPaidRate').textContent = res.price === 0 ? 'Free Tier (0 paid)' : `${paidPct}% conversion to paid`;

  const isProfit = res.netProfit >= 0;
  const profitElem = document.getElementById('resNetProfit');
  profitElem.textContent = `${isProfit ? '+' : ''}$${res.netProfit.toLocaleString()}`;
  profitElem.className = `metric-val ${isProfit ? 'text-lime' : 'text-danger'}`;
  document.getElementById('resRevenueBreakdown').textContent = `Rev: $${res.revenue.toLocaleString()} | Budget: $${res.budget.toLocaleString()}`;

  document.getElementById('barImpCount').textContent = res.impressions.toLocaleString();
  document.getElementById('barClickCount').textContent = res.clicks.toLocaleString();
  document.getElementById('barInstallCount').textContent = res.installs.toLocaleString();
  document.getElementById('barPaidCount').textContent = res.paidUsers.toLocaleString();

  const clickPercent = Math.max(3, (res.clicks / res.impressions) * 100);
  const installPercent = Math.max(2, (res.installs / res.impressions) * 100 * 4);
  const paidPercent = res.price === 0 ? 0 : Math.max(1, (res.paidUsers / res.impressions) * 100 * 12);

  document.getElementById('barImpFill').style.width = '100%';
  document.getElementById('barClickFill').style.width = `${Math.min(100, clickPercent * 8)}%`;
  document.getElementById('barInstallFill').style.width = `${Math.min(85, installPercent * 6)}%`;
  document.getElementById('barPaidFill').style.width = `${Math.min(70, paidPercent * 5)}%`;

  const dropClick = (100 - (res.clicks / res.impressions) * 100).toFixed(1);
  const dropInstall = (100 - (res.installs / res.clicks) * 100).toFixed(1);
  const dropPaid = res.price === 0 ? '0 (Free Product)' : (100 - (res.paidUsers / res.installs) * 100).toFixed(1);

  document.getElementById('dropClickText').textContent = `Ad Drop-off: -${dropClick}% (Did not click ad)`;
  document.getElementById('dropInstallText').textContent = `Landing Page Drop-off: -${dropInstall}% (Did not install/signup)`;
  document.getElementById('dropPaidText').textContent = res.price === 0 ? 'Free Product' : `Paywall Drop-off: -${dropPaid}% (Did not purchase)`;

  document.getElementById('resAvgRating').textContent = `${res.avgRating.toFixed(1)} / 5.0`;
  const starCount = Math.round(res.avgRating);
  document.getElementById('resStars').textContent = `${'★'.repeat(starCount)}${'☆'.repeat(5 - starCount)}`;

  const reviewsListElem = document.getElementById('resReviewsList');
  reviewsListElem.innerHTML = res.reviews.map(r => `
    <div class="review-card">
      <div class="review-meta">
        <div class="reviewer-profile">
          <span class="reviewer-avatar-svg">${getSimulatedAvatarSvg(r.initials)}</span>
          <div>
            <div class="reviewer-name">${escapeHtml(r.name)}</div>
            <div class="sim-user-tag">${escapeHtml(r.role)} [Simulated]</div>
          </div>
        </div>
        <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
      </div>
      <p class="review-text">"${escapeHtml(r.quote)}"</p>
    </div>
  `).join('');
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
  renderCustomerGroupsList();
  renderHistoryTable();
  renderSourcedMarketData();
  renderLibraryView();
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
  if (groupBadge) groupBadge.textContent = state.market.groups.length;
  if (historyBadge) historyBadge.textContent = state.history.length;
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
window.openEvidenceModal = function(runId) {
  const modal = document.getElementById('evidenceModal');
  if (!modal) return;

  const run = state.history.find(h => h.id === runId || String(h.runNumber) === String(runId));
  if (!run) return;

  document.getElementById('evidRunNumber').textContent = `Run #${run.runNumber || 1}`;
  document.getElementById('evidTimestamp').textContent = `${run.timestamp || 'Recorded'} ${run.dateStr || ''}`;
  document.getElementById('evidTitle').textContent = `${run.appName} × ${run.targetGroupName} Simulation Audit`;

  const indicatorsContainer = document.getElementById('evidIndicatorsList');
  const assumptionsContainer = document.getElementById('evidAssumptionsList');
  const outcomesContainer = document.getElementById('evidOutcomesMetrics');

  const evidence = run.evidence || [];
  const macroItems = evidence.filter(e => e.assumption_type === 'macro_market_context');
  const founderItems = evidence.filter(e => e.assumption_type !== 'macro_market_context');

  // 1. Render Macro Indicators
  if (macroItems.length > 0) {
    indicatorsContainer.innerHTML = macroItems.map(item => `
      <div class="evidence-indicator-item">
        <div class="evidence-item-name">${escapeHtml(item.indicator_name)}</div>
        <div class="evidence-item-metric">
          <span class="evidence-item-num">${item.indicator_value !== null && item.indicator_value !== undefined ? Number(item.indicator_value).toLocaleString() : 'Unavailable'}</span>
          <span class="evidence-item-unit">${escapeHtml(item.indicator_unit || '')}</span>
        </div>
        <div class="evidence-item-meta">
          Ref Year: ${item.reference_year || '2023'} • Country: ${escapeHtml(item.country_code || 'USA')}
        </div>
      </div>
    `).join('');
  } else {
    indicatorsContainer.innerHTML = `
      <div class="evidence-indicator-item" style="grid-column: 1 / -1;">
        <div class="evidence-item-meta">Baseline WDI demographic and connectivity indicators referenced as background national context.</div>
      </div>
    `;
  }

  // 2. Render Founder Hypotheses & Assumptions
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
            <td>${escapeHtml(item.assumption_value)}</td>
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

  // 3. Render Simulated Outcomes Summary
  outcomesContainer.innerHTML = `
    <div class="evidence-metric-box">
      <div class="evidence-metric-num">${run.impressions.toLocaleString()}</div>
      <div class="evidence-metric-label">Impressions</div>
    </div>
    <div class="evidence-metric-box">
      <div class="evidence-metric-num">${run.clicks.toLocaleString()}</div>
      <div class="evidence-metric-label">Clicks</div>
    </div>
    <div class="evidence-metric-box">
      <div class="evidence-metric-num">${run.installs.toLocaleString()}</div>
      <div class="evidence-metric-label">Installs</div>
    </div>
    <div class="evidence-metric-box">
      <div class="evidence-metric-num">${run.paidUsers.toLocaleString()}</div>
      <div class="evidence-metric-label">Paid Users</div>
    </div>
    <div class="evidence-metric-box">
      <div class="evidence-metric-num" style="color: ${run.netProfit >= 0 ? 'var(--lime)' : 'var(--danger)'}">
        ${run.netProfit >= 0 ? '+' : ''}$${run.netProfit.toLocaleString()}
      </div>
      <div class="evidence-metric-label">Net Profit (Sim)</div>
    </div>
    <div class="evidence-metric-box">
      <div class="evidence-metric-num">${run.avgRating.toFixed(1)} / 5.0</div>
      <div class="evidence-metric-label">Avg Rating</div>
    </div>
  `;

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
   13. SUPABASE AUTH & MODALS INTEGRATION
   ========================================================== */
function initSupabaseAuthAndModals() {
  const authModal = document.getElementById('authModal');
  const cloudModal = document.getElementById('cloudConfigModal');
  const evidenceModal = document.getElementById('evidenceModal');

  // Trigger buttons
  const btnOpenAuth = document.getElementById('btnOpenAuthModal');
  const btnCloseAuth = document.getElementById('btnCloseAuthModal');
  const btnOpenCloud = document.getElementById('btnOpenCloudModal');
  const btnCloseCloud = document.getElementById('btnCloseCloudModal');
  const btnCloseEvidence = document.getElementById('btnCloseEvidenceModal');
  const btnSwitchConfig = document.getElementById('btnSwitchToCloudConfig');

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

  if (btnSwitchConfig) {
    btnSwitchConfig.addEventListener('click', () => {
      if (authModal) authModal.classList.add('hidden');
      if (btnOpenCloud) btnOpenCloud.click();
    });
  }

  // Close modals on backdrop click
  [authModal, cloudModal, evidenceModal].forEach(m => {
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
      <div class="cloud-actions-row">
        <button class="btn btn-outline btn-xs" id="btnSignOut" type="button">Sign Out</button>
      </div>
    `;
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

    renderAllViews();
    updateBadges();
  } catch (err) {
    console.error('Error hydrating state from Supabase:', err);
  }
}
