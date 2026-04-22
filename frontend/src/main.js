import './style.css';
import './app.css';

const STORAGE_KEY = 'pomodoro.sessions.v1';
const SETTINGS_KEY = 'pomodoro.settings.v1';

const defaultSettings = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakEvery: 4,
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
  sessions: loadSessions(),
  settings: loadSettings(),
  activeTask: '',
};

state.secondsLeft = state.settings.focus * 60;

document.querySelector('#app').innerHTML = `
  <main class="app-shell">
    <section class="timer-panel" aria-label="Pomodoro timer">
      <div class="topbar">
        <div>
          <p class="eyebrow">Pomodoro tracker</p>
          <h1>Record focused work time</h1>
        </div>
        <div class="today-total" aria-live="polite">
          <span id="todayMinutes">0</span>
          <small>min today</small>
        </div>
      </div>

      <div class="mode-tabs" role="tablist" aria-label="Timer modes">
        <button class="mode-tab is-active" data-mode="focus" type="button">Focus</button>
        <button class="mode-tab" data-mode="shortBreak" type="button">Short break</button>
        <button class="mode-tab" data-mode="longBreak" type="button">Long break</button>
      </div>

      <div class="timer-face">
        <div class="progress-ring" aria-hidden="true">
          <svg viewBox="0 0 220 220">
            <circle class="ring-track" cx="110" cy="110" r="96"></circle>
            <circle class="ring-progress" id="ringProgress" cx="110" cy="110" r="96"></circle>
          </svg>
          <div class="time-readout">
            <span id="timeDisplay">25:00</span>
            <small id="modeDisplay">Focus session</small>
          </div>
        </div>
      </div>

      <label class="task-field" for="taskInput">
        <span>Task</span>
        <input id="taskInput" type="text" maxlength="80" placeholder="What are you working on?" autocomplete="off" />
      </label>

      <div class="controls" aria-label="Timer controls">
        <button class="primary-btn" id="startPauseBtn" type="button">Start</button>
        <button class="secondary-btn" id="completeBtn" type="button">Complete</button>
        <button class="secondary-btn" id="resetBtn" type="button">Reset</button>
      </div>
    </section>

    <aside class="side-panel" aria-label="Session records">
      <section class="settings-panel">
        <div class="section-heading">
          <h2>Durations</h2>
          <button class="text-btn" id="resetSettingsBtn" type="button">Defaults</button>
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
  </main>
`;

const elements = {
  timeDisplay: document.querySelector('#timeDisplay'),
  modeDisplay: document.querySelector('#modeDisplay'),
  startPauseBtn: document.querySelector('#startPauseBtn'),
  completeBtn: document.querySelector('#completeBtn'),
  resetBtn: document.querySelector('#resetBtn'),
  taskInput: document.querySelector('#taskInput'),
  ringProgress: document.querySelector('#ringProgress'),
  todayMinutes: document.querySelector('#todayMinutes'),
  completedCount: document.querySelector('#completedCount'),
  totalMinutes: document.querySelector('#totalMinutes'),
  sessionList: document.querySelector('#sessionList'),
  focusLength: document.querySelector('#focusLength'),
  shortBreakLength: document.querySelector('#shortBreakLength'),
  longBreakLength: document.querySelector('#longBreakLength'),
  longBreakEvery: document.querySelector('#longBreakEvery'),
  resetSettingsBtn: document.querySelector('#resetSettingsBtn'),
  clearHistoryBtn: document.querySelector('#clearHistoryBtn'),
  modeTabs: Array.from(document.querySelectorAll('.mode-tab')),
};

const ringCircumference = 2 * Math.PI * 96;
elements.ringProgress.style.strokeDasharray = `${ringCircumference}`;
elements.ringProgress.style.strokeDashoffset = '0';

bindEvents();
syncSettingsInputs();
render();

function bindEvents() {
  elements.startPauseBtn.addEventListener('click', toggleTimer);
  elements.completeBtn.addEventListener('click', () => completeSession('manual'));
  elements.resetBtn.addEventListener('click', resetTimer);
  elements.taskInput.addEventListener('input', (event) => {
    state.activeTask = event.target.value.trim();
  });

  elements.modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  [
    elements.focusLength,
    elements.shortBreakLength,
    elements.longBreakLength,
    elements.longBreakEvery,
  ].forEach((input) => input.addEventListener('change', saveSettingsFromInputs));

  elements.resetSettingsBtn.addEventListener('click', () => {
    state.settings = { ...defaultSettings };
    saveSettings();
    syncSettingsInputs();
    resetTimer();
  });

  elements.clearHistoryBtn.addEventListener('click', () => {
    if (!state.sessions.length) return;
    state.sessions = [];
    saveSessions();
    render();
  });
}

function toggleTimer() {
  if (state.isRunning) {
    stopTicker();
    render();
    return;
  }

  if (!state.currentStart) {
    state.currentStart = new Date().toISOString();
  }

  state.isRunning = true;
  state.intervalId = window.setInterval(tick, 1000);
  render();
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
  const shouldRecord = state.mode === 'focus' && (reason === 'finished' || elapsedSeconds >= 60);

  stopTicker();

  if (shouldRecord) {
    state.sessions.unshift({
      id: crypto.randomUUID(),
      task: state.activeTask || 'Focus session',
      mode: state.mode,
      startedAt: state.currentStart || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      seconds: reason === 'finished' ? duration : elapsedSeconds,
    });
    state.sessions = state.sessions.slice(0, 100);
    saveSessions();
  }

  const nextMode = reason === 'finished' && state.mode === 'focus'
    ? getNextBreakMode()
    : state.mode;

  state.currentStart = null;
  setMode(nextMode, { keepTask: nextMode !== 'focus' });
}

function resetTimer() {
  stopTicker();
  state.currentStart = null;
  state.secondsLeft = getModeDuration(state.mode);
  render();
}

function setMode(mode, options = {}) {
  stopTicker();
  state.mode = mode;
  state.secondsLeft = getModeDuration(mode);
  state.currentStart = null;

  if (!options.keepTask && mode === 'focus') {
    state.activeTask = elements.taskInput.value.trim();
  }

  render();
}

function getNextBreakMode() {
  const completedFocusSessions = state.sessions.filter((session) => session.mode === 'focus').length;
  return completedFocusSessions % state.settings.longBreakEvery === 0 ? 'longBreak' : 'shortBreak';
}

function getModeDuration(mode) {
  return state.settings[mode] * 60;
}

function saveSettingsFromInputs() {
  state.settings = {
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
}

function render() {
  renderTimer();
  renderHistory();
}

function renderTimer() {
  const duration = getModeDuration(state.mode);
  const progress = duration === 0 ? 0 : 1 - state.secondsLeft / duration;

  elements.timeDisplay.textContent = formatSeconds(state.secondsLeft);
  elements.modeDisplay.textContent = `${modeLabels[state.mode]} session`;
  elements.startPauseBtn.textContent = state.isRunning ? 'Pause' : 'Start';
  elements.completeBtn.disabled = state.mode !== 'focus' || (!state.isRunning && state.secondsLeft === duration);
  elements.ringProgress.style.strokeDashoffset = `${ringCircumference * (1 - progress)}`;

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
  elements.totalMinutes.textContent = Math.round(totalSeconds / 60);
  elements.todayMinutes.textContent = Math.round(todaySeconds / 60);

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
      <time>${Math.round(session.seconds / 60)} min</time>
    </li>
  `).join('');
}

function loadSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
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

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
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
