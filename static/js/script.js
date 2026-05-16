/* ==========================================================================
   AbilityBridge — script.js
   Full frontend logic: profile, jobs, simulation, accommodation letter
   ========================================================================== */

// ==========================================
// NAVIGATION
// ==========================================
function show(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
  const navLink = document.getElementById('nav-' + screenId);
  if (navLink) navLink.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// INPUT MODE TOGGLE
// ==========================================
function toggleMode(btn, mode) {
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  document.querySelectorAll('.mode-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('mode-' + mode);
  if (panel) panel.style.display = 'block';
}

// ==========================================
// FEATURE 1: ABILITY PROFILE
// ==========================================
async function generateProfile() {
  const btn = document.getElementById('btn-generate-profile');
  const originalText = btn.innerHTML;
  btn.innerHTML = 'Analysing <span class="loading-dots"><span></span><span></span><span></span></span>';
  btn.disabled = true;

  const resultEl = document.getElementById('profile-result');
  resultEl.classList.remove('show');

  // Detect active mode
  let activeMode = 'text';
  const selected = document.querySelector('.mode-btn.selected');
  if (selected) {
    if (selected.textContent.includes('Camera')) activeMode = 'camera';
    else if (selected.textContent.includes('Voice')) activeMode = 'voice';
    else activeMode = 'type';
  }

  try {
    const res = await fetch('/api/generate-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: activeMode, content: 'user_input' })
    });

    if (!res.ok) throw new Error('Server error: ' + res.status);
    const data = await res.json();

    // Populate chips
    const chips = document.getElementById('ability-chips');
    chips.innerHTML = '';
    data.strengths.forEach(s => {
      chips.innerHTML += `<span class="chip chip-green">${s}</span>`;
    });
    chips.innerHTML += `<span class="chip chip-violet">🦾 ${data.mobility}</span>`;
    chips.innerHTML += `<span class="chip chip-orange">👁️ ${data.sensory}</span>`;

    // Animate score bars
    const bars = document.getElementById('score-bars');
    bars.innerHTML = '';
    const scores = [
      { label: 'Mobility Adaptability', val: Math.round(data.confidence * 0.97), cls: 'fill-green' },
      { label: 'Sensory Processing',    val: Math.round(data.confidence * 0.91), cls: 'fill-violet' },
      { label: 'AI Confidence Score',   val: data.confidence,                    cls: 'fill-orange' }
    ];
    scores.forEach(({ label, val, cls }) => {
      bars.innerHTML += `
        <div class="score-bar-wrap">
          <div class="score-label"><span>${label}</span><span>${val}%</span></div>
          <div class="score-bar"><div class="score-fill ${cls}" data-val="${val}"></div></div>
        </div>`;
    });

    resultEl.classList.add('show');

    // Animate bars after render
    requestAnimationFrame(() => {
      document.querySelectorAll('.score-fill').forEach(fill => {
        fill.style.width = fill.dataset.val + '%';
      });
    });

  } catch (err) {
    console.error('Profile generation failed:', err);
    showToast('Could not reach the server. Make sure Flask is running!', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// ==========================================
// FEATURE 2: JOB MATCHING
// ==========================================
const COMPANY_ICONS = {
  'TechNova Malaysia': '🖥️',
  'Petronas Digital': '🔬',
  'Shopee': '🛍️'
};

async function fetchJobs() {
  const container = document.getElementById('job-list');
  container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-400);font-size:0.875rem;">
    Loading matched jobs<span class="loading-dots"><span></span><span></span><span></span></span>
  </div>`;

  try {
    const res = await fetch('/api/match-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: {} })
    });

    const data = await res.json();

    container.innerHTML = data.jobs.map(j => {
      const icon = COMPANY_ICONS[j.company] || '🏢';
      const scoreClass = j.match_score >= 88 ? 'score-high' : 'score-mid';
      const chips = j.perks.map(p => `<span class="chip chip-violet" style="font-size:0.72rem">${p}</span>`).join('');
      return `
        <div class="job-card" onclick="show('sim')" tabindex="0" role="button" aria-label="${j.title} at ${j.company}">
          <div class="company-logo">${icon}</div>
          <div class="job-info">
            <h3>${j.title}</h3>
            <div class="job-meta">${j.company} · 📍 ${j.location} · 💰 RM ${j.salary_rm.toLocaleString()}/mo</div>
            <div class="job-chips">${chips}</div>
          </div>
          <div class="pwd-score">
            <div class="score-num ${scoreClass}">${j.match_score}</div>
            <div class="score-lbl">PWD Score</div>
          </div>
        </div>`;
    }).join('');

    // DNA Grid for first job
    renderDNA();

  } catch (err) {
    container.innerHTML = `<div style="text-align:center;padding:2rem;color:#EF4444;font-size:0.875rem;">⚠️ Could not load jobs. Make sure Flask is running!</div>`;
    console.error('Job fetch error:', err);
  }
}

function renderDNA() {
  const grid = document.getElementById('dna-grid');
  if (!grid) return;
  const factors = [
    ['Keyboard Navigation', 'yes'], ['Screen Reader Compat', 'yes'], ['Captions Provided', 'yes'],
    ['Sign Language Interpreter', 'no'], ['Wheelchair Accessible', 'yes'], ['Ergonomic Equipment', 'yes'],
    ['Flexible Hours', 'yes'], ['Remote Option', 'yes'], ['Quiet Workspace', 'partial'],
    ['Neurodivergent ERG', 'partial'], ['Assistive Tech Budget', 'yes'], ['Buddy System', 'no'],
    ['Low-Sensory Office', 'partial'], ['Voice-First Tools', 'yes'], ['Alt Text on Assets', 'yes'],
    ['Recorded Meetings', 'yes'], ['Written Instructions', 'yes'], ['Mental Health Leave', 'yes'],
    ['Colour Blind Mode', 'partial'], ['Magnification Supported', 'yes']
  ];
  grid.innerHTML = factors.map(([label, status]) => `
    <div class="dna-factor">
      <span class="dot dot-${status}"></span>
      <span>${label}</span>
    </div>`).join('');
}

// ==========================================
// FEATURE 3: SIMULATION
// ==========================================
const SIM_DATA = {
  ux: [
    { time: '08:00', title: 'Morning Standup (Async)', desc: 'Team check-in via Loom video — no mandatory live call. Review Slack threads for blockers.', access: '✅ Async-first, screen reader friendly' },
    { time: '09:30', title: 'Design Review on Figma', desc: 'Lead feedback session on new dashboard component. Figma has full keyboard navigation.', access: '✅ Keyboard navigable, zoom enabled' },
    { time: '11:00', title: 'User Research Analysis', desc: 'Analyse accessibility audit results from last week\'s usability sessions.', access: '✅ Captioned video recordings' },
    { time: '13:00', title: 'Lunch & Rest Break', desc: 'Flexible 60-min break. Team often uses the quiet lounge on Floor 3.', access: '✅ Quiet sensory room available' },
    { time: '14:30', title: 'Sprint Planning', desc: 'Prioritise tickets in Jira. Written agenda shared 24h in advance.', access: '✅ Pre-shared agenda, live captions' },
    { time: '16:00', title: 'Deep Focus Block', desc: 'Protected time — no meetings. Work on component library updates.', access: '✅ Do Not Disturb hours respected' }
  ],
  data: [
    { time: '08:30', title: 'Data Pipeline Check', desc: 'Review overnight ETL job reports via email digest. All dashboards have alt text.', access: '✅ Screen reader accessible dashboards' },
    { time: '10:00', title: 'SQL Analysis Session', desc: 'Query exploration on PostgreSQL. Uses accessible query editor with high-contrast mode.', access: '✅ High contrast editor, keyboard-first' },
    { time: '12:00', title: 'Report Review', desc: 'Peer review cycle via shared Google Docs — full comment threading.', access: '✅ Voice typing supported' },
    { time: '14:00', title: 'Stakeholder Presentation', desc: 'Monthly metrics deck. All charts have accessible descriptions built in.', access: '✅ Captions + transcripts provided' },
    { time: '15:30', title: 'Model Validation', desc: 'Validate ML pipeline outputs. Scripts are fully documented.', access: '✅ Paired programming available' }
  ],
  cs: [
    { time: '09:00', title: 'Inbox Triage', desc: 'Work through support tickets using Zendesk — full keyboard navigation available.', access: '✅ Screen reader optimised Zendesk' },
    { time: '10:30', title: 'Live Chat Support', desc: 'Handle customer queries via text chat — voice calls are optional/opt-in.', access: '✅ Text-only option available' },
    { time: '12:30', title: 'Team Calibration', desc: 'Weekly quality review. Meeting notes always shared in writing after session.', access: '✅ Written notes, captioning on' },
    { time: '14:00', title: 'Training Module', desc: 'Self-paced onboarding content — all videos captioned, speed adjustable.', access: '✅ Self-paced, captioned content' },
    { time: '15:30', title: 'Ticket Escalation Review', desc: 'Async channel for complex case review — no live calls required.', access: '✅ Fully async communication' }
  ]
};

let currentSim = 'ux';
let simStep = 0;

function loadSim(job) {
  currentSim = job;
  simStep = 0;
  renderSimTimeline();
  updateSimProgress();
}


function renderSimTimeline() {
  const steps = SIM_DATA[currentSim];
  const container = document.getElementById('sim-timeline');

  container.innerHTML = steps
    .slice(0, simStep + 1)
    .map((step, i) => `
      <div class="sim-step active" id="sim-step-${i}">
        <div class="sim-dot">${step.time.split(':')[0]}</div>
        <div class="sim-body">
          <h4>${step.title}</h4>
          <p>${step.desc}</p>
          <span class="sim-access-badge">${step.access}</span>
        </div>
      </div>
    `)
    .join('');
}
/*function renderSimTimeline() {
  const steps = SIM_DATA[currentSim];
  const container = document.getElementById('sim-timeline');
  container.innerHTML = steps.map((step, i) => `
    <div class="sim-step ${i <= simStep ? 'active' : ''}" id="sim-step-${i}">
      <div class="sim-dot">${step.time.split(':')[0]}</div>
      <div class="sim-body">
        <h4>${step.title}</h4>
        <p>${step.desc}</p>
        <span class="sim-access-badge">${step.access}</span>
      </div>
    </div>`).join('');
}*/

function stepSim() {
  const steps = SIM_DATA[currentSim];
  if (simStep < steps.length - 1) {
    simStep++;
    renderSimTimeline();
    updateSimProgress();
    // Scroll the new step into view
    setTimeout(() => {
      document.getElementById('sim-step-' + simStep)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  } else {
    showToast('Simulation complete! You\'ve seen a full day at this company. 🎉', 'success');
  }
}

function resetSim() {
  simStep = 0;
  renderSimTimeline();
  updateSimProgress();
}

function updateSimProgress() {
  const steps = SIM_DATA[currentSim];
  const pct = ((simStep) / (steps.length - 1)) * 100;
  document.getElementById('sim-prog').style.width = pct + '%';
  // Update time label
  const timeEl = document.getElementById('sim-progress-label');
  if (timeEl) timeEl.textContent = steps[simStep].time;
}

// ==========================================
// FEATURE 4: ACCOMMODATION LETTER
// ==========================================
async function generateLetter() {
  const btn = document.getElementById('btn-generate-letter');
  const originalText = btn.innerHTML;
  btn.innerHTML = 'Drafting<span class="loading-dots"><span></span><span></span><span></span></span>';
  btn.disabled = true;

  const payload = {
    name:          document.getElementById('a-name').value.trim()    || 'Applicant',
    job_title:     document.getElementById('a-job').value.trim()     || 'the position',
    company:       document.getElementById('a-company').value.trim() || 'the company',
    accommodation: document.getElementById('a-accom').value,
    context:       document.getElementById('a-context').value.trim()
  };

  try {
    const res = await fetch('/api/generate-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    document.getElementById('letter-body').textContent = data.letter;
    const out = document.getElementById('accom-output');
    out.classList.remove('show');
    void out.offsetWidth; // reflow
    out.classList.add('show');
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (err) {
    console.error('Letter generation error:', err);
    showToast('Failed to generate letter. Is Flask running?', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function copyLetter() {
  const text = document.getElementById('letter-body').textContent;
  const btn = document.getElementById('btn-copy');
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = '✓ Copied!';
    btn.classList.add('success');
    setTimeout(() => {
      btn.textContent = '📋 Copy to Clipboard';
      btn.classList.remove('success');
    }, 2000);
  } catch {
    showToast('Copy failed — please select text manually.', 'error');
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(msg, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:1.5rem; right:1.5rem; z-index:9999;
      background:var(--surface); border:1.5px solid var(--border);
      padding:0.75rem 1.2rem; border-radius:10px;
      font-family:var(--font); font-size:0.85rem; font-weight:600;
      box-shadow:var(--shadow-lg); max-width:320px;
      transition:opacity 0.3s, transform 0.3s;
      color:var(--text-900);
    `;
    document.body.appendChild(toast);
  }
  const colors = { success: '#22C55E', error: '#EF4444', info: '#8B5CF6' };
  toast.style.borderColor = colors[type] || colors.info;
  toast.style.opacity = '1'; toast.style.transform = 'translateY(0)';
  toast.textContent = msg;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
  }, 3500);
}

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Kick off job loading when Jobs screen is opened
  // (loaded on nav click or on startup so jobs are ready)
  fetchJobs();

  // Load simulation defaults
  renderSimTimeline();
  updateSimProgress();
});