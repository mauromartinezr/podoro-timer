import './style.css';
import './app.css';
import { EventsOn, WindowFullscreen, WindowUnfullscreen } from '../wailsjs/runtime/runtime';

const STORAGE_KEY = 'pomodoro.sessions.v1';
const SETTINGS_KEY = 'pomodoro.settings.v1';

const profiles = {
  work: {
    label: 'Work',
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakEvery: 4,
  },
  study: {
    label: 'Study',
    focus: 50,
    shortBreak: 10,
    longBreak: 25,
    longBreakEvery: 3,
  },
};

const defaultSettings = {
  ...profiles.work,
  profile: 'work',
};

const modeLabels = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};

const state = {
  mode: 'focus',
  secondsLeft: defaultSettings.focus * 60,
  isRunning: false,
  intervalId: null,
  currentStart: null,
  statusMessage: '',
  sessions: loadSessions(),
  settings: loadSettings(),
  activeTask: '',
};

state.secondsLeft = state.settings.focus * 60;

document.querySelector('#app').innerHTML = `
  <main class="app-shell">
    <section class="timer-panel" aria-label="Podoro Timer">
      <div class="topbar">
        <div class="top-actions">
          <button class="menu-btn" id="menuButton" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="sidebarPanel">
            <span aria-hidden="true"></span>
          </button>
        </div>
      </div>

      <div class="sidebar-backdrop" id="sidebarBackdrop" hidden></div>
      <aside class="sidebar-panel" id="sidebarPanel" aria-label="Podoro Timer menu" aria-hidden="true">
        <div class="sidebar-header">
          <h2>Menu</h2>
          <button class="icon-btn" id="closeSidebarBtn" type="button" aria-label="Close menu">x</button>
        </div>

        <section class="settings-panel">
          <div class="section-heading">
            <h2>Profile</h2>
          </div>
          <div class="profile-tabs" role="tablist" aria-label="Duration profiles">
            <button class="profile-tab is-active" data-profile="work" type="button">Work</button>
            <button class="profile-tab" data-profile="study" type="button">Study</button>
          </div>
          <div class="settings-grid">
            <label>
              <span>Focus</span>
              <input id="focusLength" type="number" min="1" max="120" />
            </label>
            <label>
              <span>Short</span>
              <input id="shortBreakLength" type="number" min="1" max="60" />
            </label>
            <label>
              <span>Long</span>
              <input id="longBreakLength" type="number" min="1" max="90" />
            </label>
            <label>
              <span>Long every</span>
              <input id="longBreakEvery" type="number" min="2" max="12" />
            </label>
          </div>
        </section>

        <section class="history-panel">
          <div class="section-heading">
            <h2>Recorded time</h2>
            <button class="text-btn danger" id="clearHistoryBtn" type="button">Clear</button>
          </div>
          <div class="stats-row">
            <div>
              <strong id="completedCount">0</strong>
              <span>sessions</span>
            </div>
            <div>
              <strong id="totalMinutes">0</strong>
              <span>minutes</span>
            </div>
          </div>
          <ol class="session-list" id="sessionList"></ol>
        </section>
      </aside>

      <div class="timer-face">
        <div class="progress-ring">
          <svg viewBox="0 0 220 220">
            <circle class="ring-track" cx="110" cy="110" r="96"></circle>
            <circle class="ring-progress" id="ringProgress" cx="110" cy="110" r="96"></circle>
          </svg>
          <div class="time-readout">
            <span id="timeDisplay">25:00</span>
            <button class="center-play-btn" id="playPauseBtn" type="button" aria-label="Start timer">
              <span class="play-icon" aria-hidden="true"></span>
            </button>
            <small id="modeDisplay">Focus session</small>
            <p class="status-message" id="statusMessage" aria-live="polite"></p>
            <button class="quick-action-btn" id="quickActionBtn" type="button" hidden>
              Complete focus
            </button>
          </div>
        </div>
      </div>

      <div class="mode-tabs" role="tablist" aria-label="Timer modes">
        <button class="mode-tab is-active" data-mode="focus" type="button">focus</button>
        <button class="mode-tab" data-mode="shortBreak" type="button">short break</button>
        <button class="mode-tab" data-mode="longBreak" type="button">long break</button>
      </div>
    </section>

    <dialog class="about-dialog" id="aboutDialog" aria-labelledby="aboutTitle">
      <div class="about-content">
        <h2 id="aboutTitle">Podoro Timer</h2>
        <p>A simple focus timer for recording pomodoro sessions.</p>
        <dl>
          <div>
            <dt>Focus</dt>
            <dd>25 minutes</dd>
          </div>
          <div>
            <dt>Breaks</dt>
            <dd>Short and long rests</dd>
          </div>
        </dl>
        <button class="primary-small-btn" id="closeAboutBtn" type="button">Close</button>
      </div>
    </dialog>
  </main>
`;

const elements = {
  timeDisplay: document.querySelector('#timeDisplay'),
  modeDisplay: document.querySelector('#modeDisplay'),
  statusMessage: document.querySelector('#statusMessage'),
  playPauseBtn: document.querySelector('#playPauseBtn'),
  quickActionBtn: document.querySelector('#quickActionBtn'),
  progressRing: document.querySelector('.progress-ring'),
  ringProgress: document.querySelector('#ringProgress'),
  completedCount: document.querySelector('#completedCount'),
  totalMinutes: document.querySelector('#totalMinutes'),
  sessionList: document.querySelector('#sessionList'),
  focusLength: document.querySelector('#focusLength'),
  shortBreakLength: document.querySelector('#shortBreakLength'),
  longBreakLength: document.querySelector('#longBreakLength'),
  longBreakEvery: document.querySelector('#longBreakEvery'),
  profileTabs: Array.from(document.querySelectorAll('.profile-tab')),
  clearHistoryBtn: document.querySelector('#clearHistoryBtn'),
  menuButton: document.querySelector('#menuButton'),
  closeSidebarBtn: document.querySelector('#closeSidebarBtn'),
  sidebarPanel: document.querySelector('#sidebarPanel'),
  sidebarBackdrop: document.querySelector('#sidebarBackdrop'),
  aboutDialog: document.querySelector('#aboutDialog'),
  closeAboutBtn: document.querySelector('#closeAboutBtn'),
  modeTabs: Array.from(document.querySelectorAll('.mode-tab')),
};

const ringCircumference = 2 * Math.PI * 96;
elements.ringProgress.style.strokeDasharray = `${ringCircumference}`;
elements.ringProgress.style.strokeDashoffset = '0';

bindEvents();
syncSettingsInputs();
render();

function bindEvents() {
  elements.playPauseBtn.addEventListener('click', toggleTimer);
  elements.quickActionBtn.addEventListener('click', completePausedTimer);
  elements.menuButton.addEventListener('click', toggleSidebar);
  elements.closeSidebarBtn.addEventListener('click', closeSidebar);
  elements.sidebarBackdrop.addEventListener('click', closeSidebar);
  elements.closeAboutBtn.addEventListener('click', closeAboutDialog);

  elements.modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  elements.profileTabs.forEach((tab) => {
    tab.addEventListener('click', () => applyProfile(tab.dataset.profile));
  });

  [
    elements.focusLength,
    elements.shortBreakLength,
    elements.longBreakLength,
    elements.longBreakEvery,
  ].forEach((input) => input.addEventListener('change', saveSettingsFromInputs));

  elements.clearHistoryBtn.addEventListener('click', () => {
    if (!state.sessions.length) return;
    state.sessions = [];
    saveSessions();
    render();
  });

  document.addEventListener('click', (event) => {
    if (isBreakScreenActive() && !elements.progressRing.contains(event.target)) {
      exitBreakScreen();
      return;
    }

    if (!elements.sidebarPanel.classList.contains('is-open')) return;
    if (elements.sidebarPanel.contains(event.target) || elements.menuButton.contains(event.target)) return;
    closeSidebar();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSidebar();
    }
  });

  if (window.runtime?.EventsOnMultiple) {
    EventsOn('show-about', openAboutDialog);
  }
}

function openAboutDialog() {
  closeSidebar();

  if (elements.aboutDialog.open) {
    return;
  }

  elements.aboutDialog.showModal();
}

function closeAboutDialog() {
  elements.aboutDialog.close();
}

function completePausedTimer() {
  if (state.mode === 'focus') {
    completeSession('manual');
    return;
  }

  exitBreakScreen();
  state.currentStart = null;
  setMode('focus');
}

function toggleSidebar() {
  if (elements.sidebarPanel.classList.contains('is-open')) {
    closeSidebar();
    return;
  }

  openSidebar();
}

function openSidebar() {
  elements.sidebarBackdrop.hidden = false;
  elements.sidebarPanel.classList.add('is-open');
  elements.sidebarPanel.setAttribute('aria-hidden', 'false');
  elements.menuButton.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  elements.sidebarPanel.classList.remove('is-open');
  elements.sidebarPanel.setAttribute('aria-hidden', 'true');
  elements.sidebarBackdrop.hidden = true;
  elements.menuButton.setAttribute('aria-expanded', 'false');
}

function toggleTimer() {
  if (state.isRunning) {
    stopTicker();
    state.statusMessage = 'Paused';
    render();
    return;
  }

  if (!state.currentStart) {
    state.currentStart = new Date().toISOString();
  }

  requestNotificationPermission();
  startTimer(state.mode === 'focus' ? 'Recording focus session' : `${modeLabels[state.mode]} running`);
}

function tick() {
  state.secondsLeft -= 1;

  if (state.secondsLeft <= 0) {
    state.secondsLeft = 0;
    completeSession('finished');
    return;
  }

  renderTimer();
}

function completeSession(reason) {
  const duration = getModeDuration(state.mode);
  const elapsedSeconds = Math.max(0, duration - state.secondsLeft);
  const shouldRecord = state.mode === 'focus' && (reason === 'finished' || elapsedSeconds > 0);

  stopTicker();

  if (shouldRecord) {
    state.sessions.unshift({
      id: crypto.randomUUID(),
      task: 'Focus session',
      mode: state.mode,
      startedAt: state.currentStart || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      seconds: reason === 'finished' ? duration : elapsedSeconds,
    });
    state.sessions = state.sessions.slice(0, 100);
    saveSessions();
  }

  const completedFocus = reason === 'finished' && state.mode === 'focus';
  const completedBreak = reason === 'finished' && state.mode !== 'focus';
  const nextMode = completedFocus ? 'shortBreak' : state.mode;

  state.currentStart = null;

  if (completedFocus) {
    const nextLabel = modeLabels[nextMode];
    showTimerNotification('Focus complete', `${nextLabel} starts now.`);
    setMode(nextMode, { statusMessage: `Next ${nextLabel}` });
    startTimer(`Next ${nextLabel}`);
    return;
  }

  if (completedBreak) {
    showTimerNotification('Break complete', 'Ready for the next focus session.');
    exitBreakScreen();
    setMode('focus', { statusMessage: 'Break finished' });
    return;
  }

  setMode(nextMode, { statusMessage: 'Session recorded' });
}

function resetTimer() {
  stopTicker();
  state.currentStart = null;
  state.secondsLeft = getModeDuration(state.mode);
  state.statusMessage = '';
  render();
}

function setMode(mode, options = {}) {
  stopTicker();

  if (mode === 'focus') {
    exitBreakScreen();
  }

  state.mode = mode;
  state.secondsLeft = getModeDuration(mode);
  state.currentStart = null;
  state.statusMessage = options.statusMessage || '';

  render();
}

function getModeDuration(mode) {
  return state.settings[mode] * 60;
}

function saveSettingsFromInputs() {
  state.settings = {
    profile: state.settings.profile,
    focus: clampNumber(elements.focusLength.value, 1, 120, defaultSettings.focus),
    shortBreak: clampNumber(elements.shortBreakLength.value, 1, 60, defaultSettings.shortBreak),
    longBreak: clampNumber(elements.longBreakLength.value, 1, 90, defaultSettings.longBreak),
    longBreakEvery: clampNumber(elements.longBreakEvery.value, 2, 12, defaultSettings.longBreakEvery),
  };

  saveSettings();
  syncSettingsInputs();
  resetTimer();
}

function syncSettingsInputs() {
  elements.focusLength.value = state.settings.focus;
  elements.shortBreakLength.value = state.settings.shortBreak;
  elements.longBreakLength.value = state.settings.longBreak;
  elements.longBreakEvery.value = state.settings.longBreakEvery;

  elements.profileTabs.forEach((tab) => {
    const isActive = tab.dataset.profile === state.settings.profile;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
}

function render() {
  renderTimer();
  renderHistory();
}

function renderTimer() {
  const duration = getModeDuration(state.mode);
  const progress = duration === 0 ? 0 : 1 - state.secondsLeft / duration;
  const hasElapsed = progress > 0;
  const canUseQuickAction = !state.isRunning && hasElapsed;

  elements.timeDisplay.textContent = formatSeconds(state.secondsLeft);
  elements.modeDisplay.textContent = `${modeLabels[state.mode]} session`;
  elements.statusMessage.textContent = state.statusMessage;
  elements.statusMessage.hidden = state.statusMessage === '';
  elements.playPauseBtn.setAttribute('aria-label', state.isRunning ? 'Pause timer' : 'Start timer');
  elements.playPauseBtn.classList.toggle('is-running', state.isRunning);
  elements.quickActionBtn.hidden = !canUseQuickAction;
  elements.quickActionBtn.textContent = state.mode === 'focus' ? 'Complete focus' : 'Skip break';
  elements.ringProgress.style.strokeDashoffset = `${ringCircumference * (1 - progress)}`;
  document.body.dataset.mode = state.mode;

  elements.modeTabs.forEach((tab) => {
    const isActive = tab.dataset.mode === state.mode;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
}

function renderHistory() {
  const totalSeconds = state.sessions.reduce((sum, session) => sum + session.seconds, 0);
  const todaySeconds = state.sessions
    .filter((session) => isToday(new Date(session.endedAt)))
    .reduce((sum, session) => sum + session.seconds, 0);

  elements.completedCount.textContent = state.sessions.length;
  elements.totalMinutes.textContent = formatWholeMinutes(totalSeconds);

  if (!state.sessions.length) {
    elements.sessionList.innerHTML = `
      <li class="empty-state">
        Start a focus timer to record your first pomodoro.
      </li>
    `;
    return;
  }

  elements.sessionList.innerHTML = state.sessions.slice(0, 12).map((session) => `
    <li class="session-item">
      <div>
        <strong>${escapeHtml(session.task)}</strong>
        <span>${formatDateTime(session.endedAt)}</span>
      </div>
      <time>${formatWholeMinutes(session.seconds)} min</time>
    </li>
  `).join('');
}

function loadSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    const profile = savedSettings?.profile && profiles[savedSettings.profile]
      ? savedSettings.profile
      : defaultSettings.profile;

    return { ...profiles[profile], ...savedSettings, profile };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function loadSessions() {
  try {
    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(sessions) ? sessions : [];
  } catch {
    return [];
  }
}

function saveSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sessions));
}

function stopTicker() {
  state.isRunning = false;

  if (state.intervalId) {
    window.clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

function startTimer(statusMessage) {
  if (!state.currentStart) {
    state.currentStart = new Date().toISOString();
  }

  if (state.mode !== 'focus') {
    enterBreakScreen();
  }

  state.statusMessage = statusMessage;
  state.isRunning = true;
  state.intervalId = window.setInterval(tick, 1000);
  render();
}

function requestNotificationPermission() {
  if (!('Notification' in window) || Notification.permission !== 'default') {
    return;
  }

  Notification.requestPermission().catch(() => {});
}

function showTimerNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  new Notification(title, {
    body,
    silent: false,
  });
}

function enterBreakScreen() {
  document.body.dataset.breakScreen = 'active';

  if (!window.runtime?.WindowFullscreen) {
    return;
  }

  WindowFullscreen();
}

function exitBreakScreen() {
  delete document.body.dataset.breakScreen;

  if (!window.runtime?.WindowUnfullscreen) {
    return;
  }

  WindowUnfullscreen();
}

function isBreakScreenActive() {
  return document.body.dataset.breakScreen === 'active';
}

function applyProfile(profile) {
  if (!profiles[profile]) {
    return;
  }

  state.settings = { ...profiles[profile], profile };
  saveSettings();
  syncSettingsInputs();
  resetTimer();
}

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatWholeMinutes(totalSeconds) {
  if (totalSeconds <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(totalSeconds / 60));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function isToday(date) {
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function escapeHtml(value) {
  const wrapper = document.createElement('span');
  wrapper.textContent = value;
  return wrapper.innerHTML;
}
