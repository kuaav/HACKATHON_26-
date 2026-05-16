/* AbilityBridge — script.js v3.0 */

// ==========================================
// STATE
// ==========================================
const AppState = {
  isLoggedIn: false,
  currentPage: 'home',
  fontSize: 18,
  userProfile: {
    name: '', email: '', education: '', skills: '', interests: '',
    experience: '', accessibilityPrefs: [], communicationStyle: '',
    workplaceEnv: '', abilityProfile: null,
  },
  assessmentState: {
    type: null, questions: [], currentIndex: 0, answers: [],
    timerInterval: null, timeLeft: 0, startTime: null,
    studyTimerInterval: null,
  },
  currentJob: null,
  allJobs: [],
  voiceScan: { active: false, recognition: null, transcript: '', startTime: null, interval: null },
  assessmentScores: {},
  ttsActive: false,
  showAllJobs: false,
};

// ==========================================
// TEXT-TO-SPEECH (Read Aloud)
// ==========================================
let ttsUtterance = null;

function readPageAloud() {
  if (!window.speechSynthesis) {
    alert('Text-to-speech is not supported in your browser.');
    return;
  }

  if (AppState.ttsActive) {
    window.speechSynthesis.cancel();
    AppState.ttsActive = false;
    updateTTSButtons(false);
    return;
  }

  const pageEl = document.querySelector('.page.active');
  if (!pageEl) return;

  // Collect readable text: headings, paragraphs, buttons, labels
  const readable = [];
  pageEl.querySelectorAll('h1,h2,h3,p,label,button,.pref-item,.tag-pill,.perk-chip,.insight-item,.reco-item p,.job-card h3,.job-card .job-card-meta').forEach(el => {
    const text = el.textContent.trim();
    if (text && text.length > 2 && !el.closest('[aria-hidden="true"]')) {
      readable.push(text);
    }
  });

  const fullText = readable.join('. ');
  if (!fullText) return;

  ttsUtterance = new SpeechSynthesisUtterance(fullText);
  ttsUtterance.lang = 'en-MY';
  ttsUtterance.rate = 0.9;
  ttsUtterance.onend = () => { AppState.ttsActive = false; updateTTSButtons(false); };
  ttsUtterance.onerror = () => { AppState.ttsActive = false; updateTTSButtons(false); };

  AppState.ttsActive = true;
  updateTTSButtons(true);
  window.speechSynthesis.speak(ttsUtterance);
}

function updateTTSButtons(active) {
  document.querySelectorAll('.tts-btn').forEach(btn => {
    btn.textContent = active ? '⏹ Stop Reading' : '🔊 Read Aloud';
    btn.setAttribute('aria-pressed', active.toString());
  });
}

function speakText(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-MY';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

// ==========================================
// KEYBOARD NAVIGATION (blind users)
// ==========================================
document.addEventListener('keydown', (e) => {
  // Alt+R = Read aloud
  if (e.altKey && e.key === 'r') { e.preventDefault(); readPageAloud(); return; }
  // Alt+H = Home
  if (e.altKey && e.key === 'h') { e.preventDefault(); navigate('home'); return; }
  // Alt+J = Jobs
  if (e.altKey && e.key === 'j') { e.preventDefault(); navigate('jobs'); return; }
  // Escape: close modal or go back
  if (e.key === 'Escape') {
    const modal = document.getElementById('profiling-modal');
    if (modal && !modal.classList.contains('hidden')) { closeProfilingModal(); return; }
    if (AppState.currentPage === 'jobs' && AppState.currentJob) { closeJobPortal(); }
  }
});

// ==========================================
// NAVIGATION
// ==========================================
function navigate(page, event) {
  if (event) event.preventDefault();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  AppState.ttsActive = false;
  updateTTSButtons(false);

  const protected_ = ['profile', 'assessments', 'accessibility'];
  if (protected_.includes(page) && !AppState.isLoggedIn) { navigate('login'); return; }

  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  const target = document.getElementById(`page-${page}`);
  if (target) { target.classList.remove('hidden'); target.classList.add('active'); AppState.currentPage = page; }

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`[data-page="${page}"]`).forEach(n => n.classList.add('active'));

  if (page === 'jobs') {
    document.getElementById('job-portal').classList.add('hidden');
    document.getElementById('jobs-list').classList.remove('hidden');
    document.querySelector('.jobs-filter-bar')?.classList.remove('hidden');
    if (AppState.allJobs.length === 0) loadJobs();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// AUTH
// ==========================================
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.classList.add('hidden');
  if (!email || !password) { showError(errorEl, 'Please fill in all fields.'); return; }

  const btn = document.getElementById('login-btn');
  btn.textContent = 'Signing in…'; btn.disabled = true;

  try {
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) { showError(errorEl, data.error || 'Login failed.'); return; }
    AppState.isLoggedIn = true;
    AppState.userProfile.name = data.name;
    AppState.userProfile.email = email;
    showPostLoginNav();
    navigate('home');
  } catch {
    // Demo fallback
    AppState.isLoggedIn = true;
    AppState.userProfile.name = email.split('@')[0];
    AppState.userProfile.email = email;
    showPostLoginNav();
    navigate('home');
  } finally { btn.textContent = 'Sign In'; btn.disabled = false; }
}

function showSignup(event) {
  if (event) event.preventDefault();
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  const s = document.getElementById('page-signup');
  s.classList.remove('hidden'); s.classList.add('active');
}

async function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;
  const errorEl = document.getElementById('signup-error');
  errorEl.classList.add('hidden');

  if (!name || !email || !password || !confirm) { showError(errorEl, 'Please fill in all fields.'); return; }
  if (password.length < 8) { showError(errorEl, 'Password must be at least 8 characters.'); return; }
  if (password !== confirm) { showError(errorEl, 'Passwords do not match.'); return; }

  const btn = document.getElementById('signup-btn');
  btn.textContent = 'Creating account…'; btn.disabled = true;

  try {
    const res = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
    const data = await res.json();
    if (!res.ok) { showError(errorEl, data.error || 'Signup failed.'); return; }
  } catch { /* demo fallback */ }

  AppState.userProfile.name = name;
  AppState.userProfile.email = email;
  AppState.isLoggedIn = true;
  showPostLoginNav();
  showOnboarding();
  btn.textContent = 'Create Account'; btn.disabled = false;
}

function handleLogout(event) {
  event.preventDefault();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  AppState.isLoggedIn = false;
  AppState.userProfile = { name: '', email: '', education: '', skills: '', interests: '', experience: '', accessibilityPrefs: [], communicationStyle: '', workplaceEnv: '', abilityProfile: null };
  AppState.allJobs = [];
  AppState.assessmentScores = {};
  showPreLoginNav();
  navigate('home');
  fetch('/api/logout', { method: 'POST' }).catch(() => {});
}

function showPostLoginNav() {
  document.getElementById('nav-pre-login').classList.add('hidden');
  document.getElementById('nav-post-login').classList.remove('hidden');
  const g = document.getElementById('profile-greeting');
  if (g && AppState.userProfile.name) g.textContent = `Welcome, ${capitalise(AppState.userProfile.name)}`;
}
function showPreLoginNav() {
  document.getElementById('nav-post-login').classList.add('hidden');
  document.getElementById('nav-pre-login').classList.remove('hidden');
}
function showOnboarding() {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  const ob = document.getElementById('page-onboarding');
  ob.classList.remove('hidden'); ob.classList.add('active');
}
function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }

// ==========================================
// ONBOARDING
// ==========================================
function nextOnboardingStep() {
  AppState.userProfile.education = document.getElementById('ob-education').value;
  AppState.userProfile.skills = document.getElementById('ob-skills').value;
  AppState.userProfile.interests = document.getElementById('ob-interests').value;
  AppState.userProfile.experience = document.getElementById('ob-experience').value;
  document.getElementById('onboarding-step-1').classList.add('hidden');
  document.getElementById('onboarding-step-2').classList.remove('hidden');
  document.querySelectorAll('.step')[1].classList.add('active');
}
function prevOnboardingStep() {
  document.getElementById('onboarding-step-2').classList.add('hidden');
  document.getElementById('onboarding-step-1').classList.remove('hidden');
  document.querySelectorAll('.step')[1].classList.remove('active');
}
function completeOnboarding() {
  const checked = document.querySelectorAll('.checkbox-item input:checked');
  AppState.userProfile.accessibilityPrefs = Array.from(checked).map(c => c.value);
  AppState.userProfile.communicationStyle = document.getElementById('ob-comm').value;
  AppState.userProfile.workplaceEnv = document.getElementById('ob-workplace').value;
  populateProfileDashboard();
  navigate('profile');
}

function populateProfileDashboard() {
  const g = document.getElementById('profile-greeting');
  if (g && AppState.userProfile.name) g.textContent = `Welcome, ${capitalise(AppState.userProfile.name)}`;

  if (AppState.userProfile.skills) {
    const tags = document.getElementById('profile-strengths-tags');
    tags.innerHTML = '';
    AppState.userProfile.skills.split(',').map(s => s.trim()).filter(Boolean).forEach(skill => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill'; pill.textContent = skill;
      tags.appendChild(pill);
    });
  }

  if (AppState.userProfile.accessibilityPrefs.length) {
    const el = document.getElementById('profile-access-display');
    el.innerHTML = '';
    const labelMap = {
      'screen-reader': 'Screen reader compatible', 'keyboard-nav': 'Keyboard-only navigation',
      'high-contrast': 'High contrast mode', 'large-text': 'Larger text preference',
      'reduced-motion': 'Reduced motion', 'captions': 'Captions / transcripts',
      'voice-input': 'Voice input preferred', 'flexible-timing': 'Flexible task timing',
    };
    AppState.userProfile.accessibilityPrefs.forEach(pref => {
      const div = document.createElement('div');
      div.className = 'pref-item';
      div.innerHTML = `<span class="pref-dot accent"></span> ${labelMap[pref] || pref}`;
      el.appendChild(div);
    });
  }
}

// ==========================================
// AI ABILITY SCAN
// ==========================================
function openProfilingModal() {
  document.getElementById('profiling-modal').classList.remove('hidden');
  document.getElementById('scan-results').classList.add('hidden');
  switchModalTab('text', document.querySelector('.modal-tab.active'));
}
function closeProfilingModal() {
  stopVoiceScan();
  document.getElementById('profiling-modal').classList.add('hidden');
}
function switchModalTab(tab, btn) {
  document.querySelectorAll('.modal-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-selected', 'true'); }
  document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById(`modal-${tab}`).classList.remove('hidden');
  document.getElementById('scan-results').classList.add('hidden');
  if (tab !== 'voice') stopVoiceScan();
}

// Text quality meter
(function setupTextScan() {
  setTimeout(() => {
    const ta = document.getElementById('text-scan-input');
    if (!ta) return;
    ta.addEventListener('input', () => {
      const len = ta.value.trim().length;
      const words = ta.value.trim().split(/\s+/).filter(Boolean).length;
      const charCount = document.getElementById('text-char-count');
      const qualityLabel = document.getElementById('text-quality-label');
      const qualityFill = document.getElementById('text-quality-fill');
      if (charCount) charCount.textContent = `${len} characters · ${words} words`;
      const pct = Math.min(100, Math.round((len / 300) * 100));
      let label, color;
      if (len < 80) { label = 'Too short — add more detail'; color = 'var(--error)'; }
      else if (len < 160) { label = 'Getting there…'; color = 'var(--warning)'; }
      else if (len < 250) { label = 'Good — keep going'; color = '#c47c2e'; }
      else { label = '✓ Excellent detail'; color = 'var(--success)'; }
      if (qualityLabel) { qualityLabel.textContent = label; qualityLabel.style.color = color; }
      if (qualityFill) { qualityFill.style.width = `${pct}%`; qualityFill.style.background = color; }
    });
  }, 300);
})();

async function startScan(type) {
  if (type === 'text') {
    const content = document.getElementById('text-scan-input').value.trim();
    if (content.length < 80) {
      const ql = document.getElementById('text-quality-label');
      if (ql) { ql.textContent = '⚠ Please write more before analysing'; ql.style.color = 'var(--error)'; }
      return;
    }
    await runScanRequest('text', content, 0);
  }
}

async function runScanRequest(type, content, durationSeconds) {
  const btnId = type === 'text' ? 'btn-scan-text' : 'btn-scan-voice';
  const btn = document.getElementById(btnId);
  if (btn) { btn.textContent = 'Analysing…'; btn.disabled = true; }

  try {
    const res = await fetch('/api/generate-profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, content, duration_seconds: durationSeconds }),
    });
    const data = await res.json();
    if (!res.ok || data.error === 'insufficient_input') {
      renderScanError(data.message || 'Insufficient input. Please provide more detail.');
      return;
    }
    renderScanResults(data);
    AppState.userProfile.abilityProfile = data;
  } catch {
    if (type === 'text' && content.length > 80) {
      renderScanResults({ confidence: 62, strengths: ['Written communication', 'Reflective thinking', 'Detail orientation'], mobility: 'Keyboard-primary navigation preferred', sensory: 'Text-based processing preference', communication: 'Written communication preference' });
    } else {
      renderScanError('Scan failed. Check your connection and try again.');
    }
  } finally {
    if (btn) { btn.textContent = type === 'text' ? 'Analyse My Text' : '🎙 Start Voice Recording'; btn.disabled = false; }
  }
}

function renderScanError(message) {
  const container = document.getElementById('scan-results');
  document.getElementById('result-confidence').textContent = '0% confidence';
  document.getElementById('result-title').textContent = 'Insufficient data';
  document.getElementById('scan-tags').innerHTML = '';
  const errMsg = document.getElementById('scan-error-msg');
  errMsg.textContent = message; errMsg.classList.remove('hidden');
  document.getElementById('scan-insights').classList.add('hidden');
  container.classList.remove('hidden');
}

function renderScanResults(data) {
  const conf = data.confidence || 0;
  document.getElementById('result-confidence').textContent = `${conf}% confidence`;
  document.getElementById('result-title').textContent = conf > 0 ? 'Scan complete' : 'Insufficient data';
  document.getElementById('scan-error-msg').classList.add('hidden');

  const tagsEl = document.getElementById('scan-tags');
  tagsEl.innerHTML = '';
  (data.strengths || []).forEach(s => {
    const pill = document.createElement('span');
    pill.className = 'tag-pill'; pill.textContent = s;
    tagsEl.appendChild(pill);
  });

  const insightsEl = document.getElementById('scan-insights');
  if (data.mobility || data.communication || (data.challenges && data.challenges.length) || data.dyslexia_note) {
    const rows = [];

    // positive insights first
    if (data.mobility) rows.push(`<div>🧭 <strong>Ergonomic:</strong> ${data.mobility}</div>`);
    if (data.sensory) rows.push(`<div>👁 <strong>Sensory:</strong> ${data.sensory}</div>`);
    if (data.communication) rows.push(`<div>💬 <strong>Communication:</strong> ${data.communication}</div>`);

    // dyslexia note shown kindly in its own highlighted block
    if (data.dyslexia_note && data.dyslexia_note !== 'null') {
      rows.push(`<div style="margin-top:0.5rem;padding:0.4rem 0.6rem;border-left:3px solid var(--warning);background:var(--bg-card)">📖 <strong>Note:</strong> ${data.dyslexia_note}</div>`);
    }

    // challenges — honest but professionally worded
    const challenges = (data.challenges || []).filter(c => c && c.toLowerCase() !== 'none detected');
    if (challenges.length) {
      rows.push('<div style="margin-top:0.5rem"><strong>⚠️ Areas to be aware of:</strong></div>');
      challenges.forEach(c => rows.push(`<div style="padding-left:1rem;color:var(--text-muted)">• ${c}</div>`));
    }

    insightsEl.innerHTML = rows.join('');
    insightsEl.classList.remove('hidden');
  }

  if (conf > 0) {
    const profileTags = document.getElementById('profile-strengths-tags');
    if (profileTags) {
      const manual = AppState.userProfile.skills ? AppState.userProfile.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
      const seen = new Set();
      const combined = [...manual, ...(data.strengths || [])].filter(s => {
        const k = s.toLowerCase();
        return seen.has(k) ? false : seen.add(k);
      });
      profileTags.innerHTML = '';
      combined.forEach(s => {
        const pill = document.createElement('span');
        pill.className = 'tag-pill'; pill.textContent = s;
        profileTags.appendChild(pill);
      });
    }
    const note = document.getElementById('profile-ai-note');
    if (note) note.classList.remove('hidden');
  }

  document.getElementById('scan-results').classList.remove('hidden');
}

document.addEventListener('click', (e) => {
  const modal = document.getElementById('profiling-modal');
  if (e.target === modal) closeProfilingModal();
});

// ==========================================
// VOICE SCAN
// ==========================================
function toggleVoiceScan() {
  AppState.voiceScan.active ? stopVoiceScan(true) : startVoiceScan();
}

function startVoiceScan() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Speech recognition not supported. Please use Chrome or Edge, or switch to Text scan.');
    return;
  }

  const state = AppState.voiceScan;
  state.transcript = '';
  state.startTime = Date.now();
  state.active = true;

  const ring = document.getElementById('voice-ring');
  const statusText = document.getElementById('voice-status-text');
  const preview = document.getElementById('voice-transcript-preview');
  const durationDisplay = document.getElementById('voice-duration-display');
  const wordCount = document.getElementById('voice-word-count');
  const btn = document.getElementById('btn-scan-voice');

  ring?.classList.add('active');
  preview?.classList.remove('hidden');
  if (statusText) statusText.textContent = 'Listening… speak about your strengths and work style';
  if (btn) { btn.textContent = '⏹ Stop & Analyse'; btn.style.background = 'var(--error)'; }

  // builds a fresh recognition instance and wires all handlers
  function createRecognition() {
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-MY';

    rec.onresult = (event) => {
      let final = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      state.transcript += final;
      const fullText = (state.transcript + interim).trim() || 'Listening…';

      if (preview) {
        preview.textContent = fullText;
        preview.scrollTop = preview.scrollHeight;
      }

      const words = state.transcript.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount) {
        wordCount.textContent = `${words} words`;
        // colour shifts green as word count grows
        if (words < 30) wordCount.style.color = 'var(--warning)';
        else if (words < 60) wordCount.style.color = '#c47c2e';
        else wordCount.style.color = 'var(--success)';
      }
    };

    rec.onerror = (event) => {
      // no-speech = just a pause, browser fires onend and we auto-restart
      if (event.error === 'no-speech') return;
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      }
      // hard stop on real errors only
      stopVoiceScan(false);
    };

    // onend fires after silence or browser timeout — restart to keep listening
    rec.onend = () => {
      if (!state.active) return;
      // 100ms delay prevents InvalidStateError on rapid restart
      setTimeout(() => {
        if (!state.active) return;
        try {
          state.recognition = createRecognition();
          state.recognition.start();
        } catch (e) {
          // already started elsewhere — safe to ignore
        }
      }, 100);
    };

    return rec;
  }

  state.recognition = createRecognition();
  state.recognition.start();

  // tick every second: update duration display and quality hint
  state.interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const words = state.transcript.trim().split(/\s+/).filter(Boolean).length;

    let quality;
    if (elapsed < 15) quality = 'keep speaking…';
    else if (elapsed < 30) quality = 'good, keep going';
    else if (words < 40) quality = 'add more detail';
    else quality = '✓ ready to stop';

    if (durationDisplay) durationDisplay.textContent = `${elapsed}s — ${quality}`;
  }, 1000);
}

async function stopVoiceScan(submit = false) {
  const state = AppState.voiceScan;
  if (!state.active) return;
  if (state.recognition) { state.recognition.onend = null; try { state.recognition.stop(); } catch (e) {} state.recognition = null; }
  if (state.interval) { clearInterval(state.interval); state.interval = null; }

  const ring = document.getElementById('voice-ring');
  const statusText = document.getElementById('voice-status-text');
  const btn = document.getElementById('btn-scan-voice');
  const wordCount = document.getElementById('voice-word-count');
  ring?.classList.remove('active');
  if (statusText) statusText.textContent = 'Press to start speaking';
  if (btn) { btn.textContent = '🎙 Start Voice Recording'; btn.style.background = ''; }
  if (wordCount) wordCount.textContent = '';

  const duration = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  state.active = false;

  if (submit) {
    const words = state.transcript.trim().split(/\s+/).filter(Boolean).length;
    if (duration < 10 || words < 15) {
      renderScanError('Voice recording too short. Please speak for at least 15–20 seconds about your skills and preferences.');
      return;
    }
    await runScanRequest('voice', state.transcript.trim(), duration);
  }
}

// ==========================================
// JOBS — LOAD, FILTER, DISPLAY
// ==========================================
async function loadJobs() {
  const listEl = document.getElementById('jobs-list');
  const loadingEl = document.getElementById('jobs-loading');
  listEl.innerHTML = '';
  loadingEl.classList.remove('hidden');

  try {
    const res = await fetch('/api/match-jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: AppState.userProfile }) });
    const data = await res.json();
    AppState.allJobs = data.jobs || [];
  } catch {
    AppState.allJobs = MOCK_JOBS;
  } finally {
    loadingEl.classList.add('hidden');
    renderJobs(getFilteredJobs());
    updateJobToggleBtn();
  }
}

function getFilteredJobs() {
  const search = (document.getElementById('job-search-input')?.value || '').toLowerCase();
  const location = (document.getElementById('filter-location')?.value || '').toLowerCase();
  const score = parseInt(document.getElementById('filter-score')?.value || '0');
  const type = (document.getElementById('filter-type')?.value || '').toLowerCase();
  const showAll = AppState.showAllJobs;

  let jobs = AppState.allJobs;

  // If not showing all, filter to profile-matched needs
  if (!showAll && AppState.userProfile.abilityProfile) {
    const prefs = AppState.userProfile.accessibilityPrefs;
    const workplace = AppState.userProfile.workplaceEnv;
    jobs = jobs.filter(job => {
      const tags = job.tags || [];
      const perks = (job.perks || []).join(' ').toLowerCase();
      if (workplace === 'remote' && !perks.includes('remote') && !tags.includes('remote')) return false;
      if (prefs.includes('screen-reader') && !tags.includes('screen-reader-friendly') && !perks.includes('screen reader')) return false;
      return true;
    });
    // If too few, fallback to all
    if (jobs.length < 3) jobs = AppState.allJobs;
  }

  return jobs.filter(job => {
    const searchable = `${job.title} ${job.company} ${job.location} ${(job.perks || []).join(' ')}`.toLowerCase();
    const matchSearch = !search || searchable.includes(search);
    const matchLoc = !location || job.location.toLowerCase().includes(location);
    const matchScore = !score || (job.match_score || job.base_pwd_score || 0) >= score;
    const matchType = !type || (job.type || '').toLowerCase().includes(type) || (type === 'remote' && job.location.toLowerCase().includes('remote'));
    return matchSearch && matchLoc && matchScore && matchType;
  });
}

function filterJobs() { renderJobs(getFilteredJobs()); }

function toggleShowAllJobs() {
  AppState.showAllJobs = !AppState.showAllJobs;
  updateJobToggleBtn();
  renderJobs(getFilteredJobs());
}

function updateJobToggleBtn() {
  const btn = document.getElementById('btn-toggle-all-jobs');
  if (!btn) return;
  btn.textContent = AppState.showAllJobs ? '◎ Show Matched Only' : '◈ View All Jobs';
}

function renderJobs(jobs) {
  const listEl = document.getElementById('jobs-list');
  listEl.innerHTML = '';

  if (!jobs.length) {
    listEl.innerHTML = '<p style="color:var(--text-muted);padding:2rem 0">No jobs found. Try adjusting your filters or click "View All Jobs".</p>';
    return;
  }

  jobs.forEach(job => {
    const score = job.match_score || job.base_pwd_score || 70;
    const card = document.createElement('div');
    card.className = 'job-card';
    card.setAttribute('role', 'button'); card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${job.title} at ${job.company}, PWD score ${score}`);
    const perksHtml = (job.perks || []).slice(0, 3).map(p => `<span class="perk-chip">${p}</span>`).join('');
    const typeLabel = job.type ? `<span class="perk-chip" style="background:var(--accent-light);color:var(--accent)">${job.type}</span>` : '';
    card.innerHTML = `
      <div class="job-card-score">
        <div class="score-circle ${score >= 90 ? 'score-high' : score >= 80 ? 'score-med' : ''}">${score}</div>
        <span class="score-label">PWD Score</span>
      </div>
      <div class="job-card-body">
        <h3>${job.title}</h3>
        <p class="job-card-meta">${job.company} · ${job.location} · RM ${(job.salary_rm || 0).toLocaleString()}/mo</p>
        <div class="job-card-perks">${typeLabel}${perksHtml}</div>
      </div>
      <div class="job-card-action"><button class="btn-tag">View & Apply →</button></div>`;
    card.addEventListener('click', () => openJobPortal(job));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openJobPortal(job); });
    listEl.appendChild(card);
  });
}

// ==========================================
// JOB APPLICATION PORTAL
// ==========================================
function openJobPortal(job) {
  AppState.currentJob = job;
  const score = job.match_score || job.base_pwd_score || 70;

  document.getElementById('jobs-list').classList.add('hidden');
  document.querySelector('.jobs-filter-bar')?.classList.add('hidden');

  document.getElementById('portal-job-title').textContent = job.title;
  document.getElementById('portal-company').textContent = `${job.company} · ${job.location}`;
  document.getElementById('portal-job-type').textContent = job.type || '';
  document.getElementById('portal-score-bar').style.width = `${score}%`;
  document.getElementById('portal-score-num').textContent = `${score}/100`;
  document.getElementById('portal-salary').textContent = `RM ${(job.salary_rm || 0).toLocaleString()}`;
  document.getElementById('portal-perks').innerHTML = (job.perks || []).map(p => `<span class="perk-chip">${p}</span>`).join('');
  document.getElementById('portal-description').textContent = job.description || '';
  document.getElementById('portal-requirements').innerHTML = (job.requirements || []).map(r => `<li>${r}</li>`).join('');
  document.getElementById('portal-disability-statement').textContent = job.disability_statement || '';

  // Compatibility insights
  const perkText = (job.perks || []).join(' ').toLowerCase();
  const insights = [];
  if (AppState.userProfile.workplaceEnv === 'remote' && perkText.includes('remote')) insights.push('Remote work preference matches this role');
  if (AppState.userProfile.communicationStyle?.includes('async') && perkText.includes('async')) insights.push('Async communication culture aligns with your style');
  if (perkText.includes('keyboard') || perkText.includes('screen reader')) insights.push('Assistive technology support confirmed');
  if (perkText.includes('quiet') || perkText.includes('focus')) insights.push('Quiet/focus-friendly environment available');
  if (perkText.includes('flexible')) insights.push('Flexible hours available');
  if (!insights.length) insights.push('Good overall accessibility match with your profile');
  document.getElementById('portal-insights').innerHTML = insights.map(i => `<div class="insight-item"><span class="insight-dot"></span> ${i}</div>`).join('');

  // Profile highlights
  const strengthsEl = document.getElementById('portal-strengths');
  strengthsEl.innerHTML = '';
  const manual = (AppState.userProfile.skills || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 3);
  const ai = (AppState.userProfile.abilityProfile?.strengths || []).slice(0, 2);
  [...manual, ...ai].slice(0, 5).forEach(s => {
    if (!s) return;
    const pill = document.createElement('span'); pill.className = 'tag-pill'; pill.textContent = s;
    strengthsEl.appendChild(pill);
  });

  // Access prefs
  const prefs = AppState.userProfile.accessibilityPrefs.length ? AppState.userProfile.accessibilityPrefs : ['Keyboard navigation', 'Flexible timing'];
  document.getElementById('portal-access').innerHTML = prefs.map(p => `<div class="pref-item"><span class="pref-dot accent"></span> ${p}</div>`).join('');

  // Pre-fill form
  document.getElementById('app-name').value = AppState.userProfile.name || '';
  document.getElementById('app-job').value = job.title;
  document.getElementById('app-company').value = job.company;

  // AI assessment vs role feedback
  renderApplicationAssessment(job);

  document.getElementById('application-results').classList.add('hidden');
  document.getElementById('job-portal').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderApplicationAssessment(job) {
  const el = document.getElementById('portal-assessment-feedback');
  if (!el) return;
  const scores = AppState.assessmentScores;
  const ability = AppState.userProfile.abilityProfile;
  const items = [];

  if (Object.keys(scores).length) {
    const avg = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length);
    items.push(`Assessment average: <strong>${avg}%</strong> — ${avg >= 75 ? 'Strong cognitive performance' : avg >= 55 ? 'Solid baseline' : 'Consider retaking assessments for a stronger profile'}`);
  }
  if (ability && ability.confidence > 0) {
    items.push(`AI profile confidence: <strong>${ability.confidence}%</strong>`);
    if (ability.communication) items.push(`Communication match: ${ability.communication}`);
  }

  el.innerHTML = items.length
    ? items.map(i => `<div class="insight-item"><span class="insight-dot"></span> <span>${i}</span></div>`).join('')
    : '<div class="insight-item" style="color:var(--text-muted)">Complete the AI scan and assessments to get personalised fit feedback for this role.</div>';
}

function closeJobPortal() {
  AppState.currentJob = null;
  document.getElementById('job-portal').classList.add('hidden');
  document.getElementById('jobs-list').classList.remove('hidden');
  document.querySelector('.jobs-filter-bar')?.classList.remove('hidden');
}

// ==========================================
// JOB APPLICATION LETTER (not accommodation)
// ==========================================
async function generateApplication() {
  const btn = document.getElementById('btn-generate-app');
  btn.textContent = 'Drafting letter…'; btn.disabled = true;

  const payload = {
    name: document.getElementById('app-name').value || AppState.userProfile.name || 'Applicant',
    job_title: document.getElementById('app-job').value,
    company: document.getElementById('app-company').value,
    cover_note: document.getElementById('app-cover-note').value,
    ability_profile: AppState.userProfile.abilityProfile,
  };

  try {
    const res = await fetch('/api/generate-application', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    document.getElementById('application-output').textContent = data.letter;
  } catch {
    document.getElementById('application-output').textContent = buildFallbackApplication(payload);
  }

  document.getElementById('application-results').classList.remove('hidden');
  document.getElementById('application-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  btn.textContent = 'Generate Cover Letter'; btn.disabled = false;
}

function buildFallbackApplication({ name, job_title, company, cover_note }) {
  const strengths = AppState.userProfile.abilityProfile?.strengths?.join(', ') || AppState.userProfile.skills || 'strong analytical and communication skills';
  const extra = cover_note?.trim() ? `\n\n${cover_note}` : '';
  return `Dear Hiring Team at ${company},

I am writing to express my strong interest in the ${job_title} position. My background and skills — including ${strengths} — make me confident I can contribute meaningfully to your team.${extra}

I would welcome the opportunity to discuss my application further and am happy to participate in an interview format that works best for your team.

Thank you sincerely for your consideration.

Warm regards,
${name}`;
}

function copyApplication() {
  const text = document.getElementById('application-output').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
  });
}

// ==========================================
// ASSESSMENTS — improved scoring
// ==========================================
const ASSESSMENT_BANKS = {
  patterns: [
    { q: 'What comes next: 2, 4, 8, 16, ___?', options: ['20', '32', '24', '18'], answer: 1 },
    { q: 'Which completes the pattern? △ ○ □ △ ○ ___', options: ['△', '○', '□', '⬡'], answer: 2 },
    { q: 'Odd one out: Apple, Orange, Carrot, Banana', options: ['Apple', 'Orange', 'Carrot', 'Banana'], answer: 2 },
    { q: 'What is next: 3, 6, 12, 24, ___?', options: ['36', '48', '30', '42'], answer: 1 },
    { q: 'Red : Stop :: Green : ___', options: ['Caution', 'Go', 'Slow', 'Wait'], answer: 1 },
    { q: 'What continues: 1, 4, 9, 16, ___?', options: ['20', '25', '24', '18'], answer: 1 },
    { q: 'Which is the mirror image of "b"?', options: ['d', 'p', 'q', 'b'], answer: 0 },
  ],
  reasoning: [
    { q: 'If all Blorks are Flurbs, and all Flurbs are Gloons, are all Blorks Gloons?', options: ['Yes', 'No', 'Cannot be determined', 'Sometimes'], answer: 0 },
    { q: 'A bat and ball cost RM 1.10. Bat costs RM 1.00 more than ball. How much is the ball?', options: ['10 sen', '5 sen', '15 sen', '20 sen'], answer: 1 },
    { q: 'If some cats are black and some black things are tables, are some cats tables?', options: ['Yes', 'No', 'Cannot be determined', 'Sometimes'], answer: 2 },
    { q: 'Which is the strongest argument for public libraries?', options: ['They are old', 'They offer free access to knowledge for everyone', 'Books are cheaper than digital', 'Librarians are helpful'], answer: 1 },
    { q: 'Rearrange CIFNOA — you get the name of a(n):', options: ['City', 'Animal', 'Ocean', 'Planet'], answer: 2 },
    { q: 'What is always in the future, never in the past?', options: ['Yesterday', 'Tomorrow', 'Today', 'Now'], answer: 1 },
    { q: 'A is taller than B. B is taller than C. Who is shortest?', options: ['A', 'B', 'C', 'Cannot tell'], answer: 2 },
  ],
  typing: [
    { q: 'Type exactly:\n"Accessibility matters for everyone."', type: 'typing', target: 'Accessibility matters for everyone.' },
    { q: 'Type exactly:\n"Inclusive workplaces benefit every employee."', type: 'typing', target: 'Inclusive workplaces benefit every employee.' },
    { q: 'Type exactly:\n"Equal opportunity creates stronger teams."', type: 'typing', target: 'Equal opportunity creates stronger teams.' },
    { q: 'My greatest professional strength is:', type: 'open', options: null, answer: null },
    { q: 'How do you prefer to receive feedback at work?', type: 'open', options: null, answer: null },
  ],
};

const MEMORY_STUDY_SETS = [
  {
    items: ['🐘 Elephant', '🔑 Key', '🌙 Moon', '🎸 Guitar', '🍎 Apple', '✈️ Aeroplane'],
    questions: [
      { q: 'Which of these was in the list?', options: ['🚀 Rocket', '🎸 Guitar', '🎯 Target', '🌊 Wave'], answer: 1 },
      { q: 'What animal appeared?', options: ['🐕 Dog', '🐈 Cat', '🐘 Elephant', '🦁 Lion'], answer: 2 },
      { q: 'Which item relates to travel?', options: ['🌙 Moon', '✈️ Aeroplane', '🔑 Key', '🍎 Apple'], answer: 1 },
      { q: 'How many items were in the list?', options: ['4', '5', '6', '7'], answer: 2 },
      { q: 'Which was NOT in the list?', options: ['🔑 Key', '🌙 Moon', '🎸 Guitar', '🎯 Target'], answer: 3 },
    ],
  },
  {
    items: ['Red', 'Bicycle', 'Cloud', 'Piano', 'River', 'Seven'],
    questions: [
      { q: 'Which number appeared?', options: ['Three', 'Five', 'Seven', 'Nine'], answer: 2 },
      { q: 'Which colour was in the list?', options: ['Blue', 'Red', 'Green', 'Yellow'], answer: 1 },
      { q: 'Which instrument appeared?', options: ['Drum', 'Violin', 'Piano', 'Flute'], answer: 2 },
      { q: 'Which word was NOT in the list?', options: ['Bicycle', 'Cloud', 'River', 'Ocean'], answer: 3 },
      { q: 'How many words were in the list?', options: ['4', '5', '6', '7'], answer: 2 },
    ],
  },
];

let timedMode = false;
let currentMemorySet = null;

function toggleTiming(checkbox) { timedMode = checkbox.checked; checkbox.setAttribute('aria-checked', checkbox.checked.toString()); }
function toggleReducedSensory(checkbox) { checkbox.setAttribute('aria-checked', checkbox.checked.toString()); document.body.classList.toggle('reduced-motion', checkbox.checked); }

function startAssessment(type) {
  const state = AppState.assessmentState;
  if (state.studyTimerInterval) clearInterval(state.studyTimerInterval);
  if (state.timerInterval) clearInterval(state.timerInterval);

  if (type === 'memory') { startMemoryStudyPhase(); return; }

  const qs = ASSESSMENT_BANKS[type] || [];
  Object.assign(state, { type, questions: qs, currentIndex: 0, answers: new Array(qs.length).fill(null), timerInterval: null, timeLeft: 120, startTime: Date.now() });

  document.getElementById('assessment-home').classList.add('hidden');
  document.getElementById('memory-study-phase').classList.add('hidden');
  document.getElementById('assessment-active').classList.remove('hidden');
  document.getElementById('assessment-results').classList.add('hidden');

  renderQuestion();
  if (timedMode) { document.getElementById('timer-display').classList.remove('hidden'); startTimer(); }
}

function startMemoryStudyPhase() {
  currentMemorySet = MEMORY_STUDY_SETS[Math.floor(Math.random() * MEMORY_STUDY_SETS.length)];
  document.getElementById('assessment-home').classList.add('hidden');
  document.getElementById('memory-study-phase').classList.remove('hidden');
  document.getElementById('assessment-active').classList.add('hidden');
  document.getElementById('assessment-results').classList.add('hidden');

  const display = document.getElementById('study-items-display');
  display.innerHTML = '';
  currentMemorySet.items.forEach(item => {
    const el = document.createElement('div');
    el.style.cssText = 'padding:1rem 1.5rem;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);font-size:1.2rem;font-weight:600;color:var(--text-primary);box-shadow:var(--shadow-sm);min-width:100px;text-align:center';
    el.textContent = item;
    display.appendChild(el);
  });

  let timeLeft = 15;
  const timerEl = document.getElementById('study-timer');
  const barFill = document.getElementById('study-bar-fill');
  const barLabel = document.getElementById('study-bar-label');
  timerEl.textContent = `${timeLeft}s`;

  const interval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `${timeLeft}s`;
    barFill.style.width = `${(timeLeft / 15) * 100}%`;
    if (timeLeft <= 5) barLabel.textContent = `${timeLeft} seconds left — final look!`;
    if (timeLeft <= 0) { clearInterval(interval); AppState.assessmentState.studyTimerInterval = null; startMemoryTestPhase(); }
  }, 1000);
  AppState.assessmentState.studyTimerInterval = interval;
}

function startMemoryTestPhase() {
  const qs = currentMemorySet.questions;
  const state = AppState.assessmentState;
  Object.assign(state, { type: 'memory', questions: qs, currentIndex: 0, answers: new Array(qs.length).fill(null), timerInterval: null, timeLeft: 90, startTime: Date.now() });
  document.getElementById('memory-study-phase').classList.add('hidden');
  document.getElementById('assessment-active').classList.remove('hidden');
  renderQuestion();
  if (timedMode) { state.timeLeft = 90; document.getElementById('timer-display').classList.remove('hidden'); startTimer(); }
}

function renderQuestion() {
  const state = AppState.assessmentState;
  const q = state.questions[state.currentIndex];
  const total = state.questions.length;
  const idx = state.currentIndex;

  document.getElementById('assess-progress-bar').style.width = `${(idx / total) * 100}%`;
  document.getElementById('assess-progress-text').textContent = `Question ${idx + 1} of ${total}`;

  const body = document.getElementById('assessment-body');
  body.innerHTML = '';
  const qText = document.createElement('p');
  qText.className = 'question-text'; qText.style.whiteSpace = 'pre-wrap'; qText.textContent = q.q;
  body.appendChild(qText);

  if (q.type === 'open' || q.type === 'typing') {
    const ta = document.createElement('textarea');
    ta.style.cssText = 'width:100%;padding:0.75rem;border:1.5px solid var(--border);border-radius:var(--radius);font-family:var(--font-sans);font-size:0.95rem;resize:vertical;min-height:90px;background:var(--bg);color:var(--text-primary)';
    ta.placeholder = q.type === 'typing' ? 'Type exactly as shown above…' : 'Your answer…';
    ta.addEventListener('input', () => { state.answers[idx] = ta.value; });
    if (state.answers[idx]) ta.value = state.answers[idx];
    body.appendChild(ta);
  } else {
    const optContainer = document.createElement('div');
    optContainer.className = 'question-options';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      if (state.answers[idx] === i) btn.classList.add('selected');
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        state.answers[idx] = i;
        optContainer.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      optContainer.appendChild(btn);
    });
    body.appendChild(optContainer);
  }

  document.getElementById('btn-prev-q').disabled = idx === 0;
  document.getElementById('btn-next-q').textContent = idx === total - 1 ? 'Finish' : 'Next';
}

function nextQuestion() {
  const state = AppState.assessmentState;
  state.currentIndex < state.questions.length - 1 ? (state.currentIndex++, renderQuestion()) : finishAssessment();
}
function prevQuestion() {
  const state = AppState.assessmentState;
  if (state.currentIndex > 0) { state.currentIndex--; renderQuestion(); }
}
function startTimer() {
  const state = AppState.assessmentState;
  const timerEl = document.getElementById('timer-display');
  const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  timerEl.textContent = fmt(state.timeLeft);
  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    timerEl.textContent = fmt(state.timeLeft);
    if (state.timeLeft <= 30) timerEl.classList.add('urgent');
    if (state.timeLeft <= 0) { clearInterval(state.timerInterval); finishAssessment(); }
  }, 1000);
}

function finishAssessment() {
  const state = AppState.assessmentState;
  if (state.timerInterval) clearInterval(state.timerInterval);
  if (state.studyTimerInterval) clearInterval(state.studyTimerInterval);
  document.getElementById('assessment-active').classList.add('hidden');
  document.getElementById('timer-display').classList.add('hidden');
  document.getElementById('timer-display').classList.remove('urgent');

  const { questions, answers, type, startTime } = state;
  const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000) : null;

  // Score MCQ questions
  let mcqCorrect = 0, mcqTotal = 0;
  // Score typing questions separately
  let typingCorrect = 0, typingTotal = 0;

  questions.forEach((q, i) => {
    if (q.type === 'typing' && q.target) {
      typingTotal++;
      const userAns = (answers[i] || '').trim();
      // Similarity check: full match = 100%, partial = proportional
      if (userAns === q.target) typingCorrect += 1;
      else {
        const maxLen = Math.max(userAns.length, q.target.length);
        let matches = 0;
        for (let c = 0; c < Math.min(userAns.length, q.target.length); c++) {
          if (userAns[c] === q.target[c]) matches++;
        }
        typingCorrect += matches / maxLen;
      }
    } else if (q.answer !== null && q.answer !== undefined && q.type !== 'open') {
      mcqTotal++;
      if (answers[i] === q.answer) mcqCorrect++;
    }
  });

  const openAnswered = questions.filter((q, i) => q.type === 'open' && answers[i] && answers[i].trim().length > 5).length;
  const openTotal = questions.filter(q => q.type === 'open').length;

  // Weighted score
  let scorePct = null;
  if (mcqTotal > 0 || typingTotal > 0) {
    const mcqScore = mcqTotal > 0 ? (mcqCorrect / mcqTotal) : 0;
    const typingScore = typingTotal > 0 ? (typingCorrect / typingTotal) : 0;
    const totalParts = (mcqTotal > 0 ? 1 : 0) + (typingTotal > 0 ? 0.5 : 0);
    const weightedSum = (mcqTotal > 0 ? mcqScore : 0) + (typingTotal > 0 ? typingScore * 0.5 : 0);
    scorePct = Math.round((weightedSum / totalParts) * 100);
  }

  if (scorePct !== null) {
    AppState.assessmentScores[type] = scorePct;
    updateAssessmentScoreDisplays();
  }

  const scoresEl = document.getElementById('result-scores-display');
  scoresEl.innerHTML = '';
  const metrics = [];
  if (scorePct !== null) metrics.push({ num: `${scorePct}%`, label: 'Score' });
  if (mcqTotal) metrics.push({ num: `${mcqCorrect}/${mcqTotal}`, label: 'MCQ Correct' });
  if (typingTotal) metrics.push({ num: `${Math.round((typingCorrect / typingTotal) * 100)}%`, label: 'Typing Accuracy' });
  if (openTotal) metrics.push({ num: `${openAnswered}/${openTotal}`, label: 'Open Responses' });
  if (timeTaken) metrics.push({ num: `${timeTaken}s`, label: 'Time Taken' });
  metrics.forEach(m => {
    const item = document.createElement('div');
    item.className = 'result-score-item';
    item.innerHTML = `<span class="result-score-num">${m.num}</span><span class="result-score-label">${m.label}</span>`;
    scoresEl.appendChild(item);
  });

  const breakdown = document.getElementById('result-breakdown');
  const typeLabels = { patterns: 'Pattern Recognition', reasoning: 'Logical Reasoning', memory: 'Memory & Recall', typing: 'Interaction Analysis' };
  if (scorePct !== null) {
    let msg = '';
    if (scorePct >= 80) msg = `✓ Strong ${typeLabels[type] || ''} performance — this is a notable strength for your profile.`;
    else if (scorePct >= 60) msg = `Good result. ${typeLabels[type] || 'Assessment'} competency is solid.`;
    else if (scorePct !== null) msg = `Results recorded. These assessments show how you work, not your worth. Consider retrying after a break.`;
    breakdown.textContent = msg;
  } else if (openTotal > 0) {
    breakdown.textContent = `Open responses recorded (${openAnswered} answered). These inform your profile.`;
  }

  fetch('/api/save-assessment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, score: scorePct, answers: answers.length, timeTaken }) }).catch(() => {});
  document.getElementById('assessment-results').classList.remove('hidden');
}

function updateAssessmentScoreDisplays() {
  const scores = AppState.assessmentScores;
  const entries = Object.entries(scores);
  if (!entries.length) return;
  const avg = Math.round(entries.reduce((sum, [, v]) => sum + v, 0) / entries.length);
  const labelMap = { patterns: 'Pattern Recognition', reasoning: 'Logical Reasoning', memory: 'Memory & Recall', typing: 'Interaction Analysis' };

  const numEl = document.getElementById('assessment-score-number');
  const overallEl = document.getElementById('assessment-overall-score');
  if (numEl) numEl.textContent = `${avg}%`;
  if (overallEl) overallEl.classList.remove('hidden');

  const card = document.getElementById('profile-assessment-card');
  const barsEl = document.getElementById('profile-assessment-scores');
  const overallPct = document.getElementById('profile-overall-pct');
  if (card && barsEl) {
    barsEl.innerHTML = '';
    entries.forEach(([t, pct]) => {
      const row = document.createElement('div');
      row.className = 'style-bar-row';
      row.innerHTML = `<span>${labelMap[t] || t}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span class="bar-val">${pct}%</span>`;
      barsEl.appendChild(row);
    });
    if (overallPct) overallPct.textContent = `${avg}%`;
    card.style.display = '';
  }
}

function exitAssessment() {
  const state = AppState.assessmentState;
  if (state.timerInterval) clearInterval(state.timerInterval);
  if (state.studyTimerInterval) clearInterval(state.studyTimerInterval);
  document.getElementById('timer-display').classList.add('hidden');
  document.getElementById('timer-display').classList.remove('urgent');
  backToAssessments();
}
function backToAssessments() {
  document.getElementById('assessment-active').classList.add('hidden');
  document.getElementById('assessment-results').classList.add('hidden');
  document.getElementById('memory-study-phase').classList.add('hidden');
  document.getElementById('assessment-home').classList.remove('hidden');
}

// ==========================================
// ACCESSIBILITY SETTINGS
// ==========================================
function adjustFontSize(delta) {
  AppState.fontSize = Math.min(24, Math.max(14, AppState.fontSize + delta));
  document.documentElement.style.fontSize = `${AppState.fontSize}px`;
  document.getElementById('font-size-display').textContent = `${AppState.fontSize}px`;
}
function toggleHighContrast(checkbox) { document.body.classList.toggle('high-contrast', checkbox.checked); }
function toggleMotion(checkbox) { document.body.classList.toggle('reduced-motion', checkbox.checked); }
function toggleKeyboardMode(checkbox) {}
function toggleVoiceInput(checkbox) {}
function toggleDyslexiaFont(checkbox) { document.body.classList.toggle('dyslexia-font', checkbox.checked); }
function toggleLineSpacing(checkbox) { document.body.classList.toggle('line-spacing-enhanced', checkbox.checked); }

// ==========================================
// OFFLINE MOCK DATA
// ==========================================
const MOCK_JOBS = [
  { id: 'job_001', title: 'Junior Web Developer', company: 'Codify Sdn Bhd', location: 'Fully Remote', salary_rm: 3200, match_score: 94, type: 'Full-time', tags: ['remote', 'async', 'keyboard-friendly'], perks: ['Fully remote', 'Async-first communication', 'Screen reader & keyboard-nav compatible'], description: 'Build and maintain client web applications.', requirements: ['HTML/CSS/JS basics', 'Git fundamentals'], disability_statement: 'We actively encourage PWD applications. All accommodations provided.' },
  { id: 'job_002', title: 'Data Entry & Quality Analyst', company: 'Prisma Analytics', location: 'Kuala Lumpur (Hybrid)', salary_rm: 2800, match_score: 88, type: 'Full-time', tags: ['hybrid', 'quiet', 'wheelchair-accessible'], perks: ['Wheelchair accessible office', 'Ergonomic workstation', 'Quiet focus pods'], description: 'Review and validate datasets for accuracy.', requirements: ['Attention to detail', 'Basic Excel'], disability_statement: 'OKU-friendly employer. Transport allowance available.' },
  { id: 'job_003', title: 'Customer Support (Chat Only)', company: 'HelpDesk Heroes', location: 'Fully Remote', salary_rm: 2600, match_score: 91, type: 'Full-time', tags: ['remote', 'text-only', 'deaf-friendly'], perks: ['Text-based only — no calls', 'Work from home', 'Flexible shifts'], description: 'Handle enquiries via live chat and email.', requirements: ['Strong written English', 'Empathy'], disability_statement: 'No voice calls ever. Deaf and HoH applicants welcome.' },
  { id: 'job_004', title: 'Content Writer (Freelance)', company: 'Wordsmiths Malaysia', location: 'Fully Remote', salary_rm: 2400, match_score: 93, type: 'Freelance', tags: ['remote', 'flexible', 'async'], perks: ['Fully flexible hours', 'Written briefs — no meetings', 'Pay per article'], description: 'Write blog articles and social content for Malaysian brands.', requirements: ['Strong written skills', 'Ability to research'], disability_statement: 'Any disability welcome. Deadline extensions available.' },
  { id: 'job_005', title: 'E-Commerce Product Lister', company: 'Shoplink MY', location: 'Fully Remote', salary_rm: 2100, match_score: 89, type: 'Part-time', tags: ['remote', 'output-based', 'no-calls'], perks: ['Output-based, self-paced', 'No calls or video', 'Performance bonuses'], description: 'Upload and optimise product listings on Shopee and Lazada.', requirements: ['Basic computer skills', 'Attention to detail'], disability_statement: 'Specifically designed to be fully accessible for PWD candidates.' },
  { id: 'job_006', title: 'Research Assistant (WFH)', company: 'Insight Lab Malaysia', location: 'Fully Remote', salary_rm: 2500, match_score: 90, type: 'Contract', tags: ['remote', 'text-only', 'screen-reader-friendly'], perks: ['100% remote', 'Written-only communication', 'Self-paced deliverables'], description: 'Conduct literature reviews and summarise research reports.', requirements: ['University degree', 'Strong reading comprehension'], disability_statement: 'Strongly encourage OKU applicants. Screen reader & extended deadline support.' },
];

// ==========================================
// UTILS
// ==========================================
function capitalise(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

// ==========================================
// INIT
// ==========================================
(function init() {
  navigate('home');

  // Keyboard shortcut hint in nav footer
  const footer = document.querySelector('.sidebar-footer');
  if (footer) {
    const hint = document.createElement('p');
    hint.style.cssText = 'font-size:0.7rem;color:var(--text-muted);margin-top:0.5rem';
    hint.textContent = 'Alt+R: Read page aloud';
    footer.appendChild(hint);
  }
})();
