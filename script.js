
let intervalId = null;
let initialTimeoutId = null;
let timerIntervalId = null;
let nextReminder = null;
let reminderRunning = false;
let pausedRemaining = null; // ms remaining when paused
let deferredPrompt;




window.addEventListener('load', () => {
  const saved = JSON.parse(localStorage.getItem('waterData')) || {};
  // saved state will be handled below (interval, reminders, options)

  // populate inputs with saved values
  const intervalInput = document.getElementById('interval');
  if (saved && saved.interval && intervalInput) intervalInput.value = saved.interval;

  // resume reminder if running
  if (saved && saved.reminderRunning && saved.interval) {
    const intervalMs = (saved.interval) * 60000;
    const nr = saved.nextReminder || (Date.now() + intervalMs);
    nextReminder = nr;
    reminderRunning = true;
    const timeToFirst = nr - Date.now();
    if (timeToFirst <= 0) {
      // if missed, fire now and schedule repeating
      notifyUser('Time to drink water \uD83D\uDCA7');
      nextReminder = Date.now() + intervalMs;
      saveData();
      intervalId = setInterval(() => {
        notifyUser('Time to drink water \uD83D\uDCA7');
        nextReminder = Date.now() + intervalMs;
        saveData();
        startTimer(nextReminder);
      }, intervalMs);
    } else {
      initialTimeoutId = setTimeout(() => {
        notifyUser('Time to drink water \uD83D\uDCA7');
        nextReminder = Date.now() + intervalMs;
        saveData();
        startTimer(nextReminder);
        intervalId = setInterval(() => {
          notifyUser('Time to drink water \uD83D\uDCA7');
          nextReminder = Date.now() + intervalMs;
          saveData();
          startTimer(nextReminder);
        }, intervalMs);
      }, timeToFirst);
    }

    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) stopBtn.style.display = 'inline-block';
    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.disabled = true;
    startTimer(nextReminder);
  }

  // restore paused remaining if present
  if (saved && saved.pausedRemaining && !saved.reminderRunning) {
    pausedRemaining = saved.pausedRemaining;
    const resumeBtn = document.getElementById('resumeBtn');
    if (resumeBtn) resumeBtn.style.display = 'inline-block';
    // show paused countdown
    if (!timerIntervalId) timerIntervalId = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay();
  }

  // Close modals on Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.open').forEach(m => {
        m.setAttribute('aria-hidden', 'true');
        m.classList.remove('open');
      });
    }
  });

  function openSettings(){
    const m = document.getElementById('settingsModal');
    const iv = document.getElementById('interval');
    const is = document.getElementById('intervalSetting');
    if (is && iv) is.value = iv.value || '';
    m.setAttribute('aria-hidden','false');
    m.classList.add('open');
  }

  function closeSettings(){
    const m = document.getElementById('settingsModal');
    m.setAttribute('aria-hidden','true');
    m.classList.remove('open');
  }

  function showOnboarding(){
    const m = document.getElementById('onboardingModal');
    m.setAttribute('aria-hidden','false');
    m.classList.add('open');
  }

  const closeOnboardBtn = document.getElementById('closeOnboard');
  if (closeOnboardBtn) closeOnboardBtn.addEventListener('click', ()=>{
    if (document.getElementById('dontShowOnboard')?.checked) localStorage.setItem('seenOnboard','true');
    const m = document.getElementById('onboardingModal');
    m.setAttribute('aria-hidden','true');
    m.classList.remove('open');
  });

  // Theme init
  const body = document.body;
  const savedTheme = localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (savedTheme === 'dark') body.classList.add('dark');
  updateThemeToggle();

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

  // update meta theme-color so OS UI matches
  updateMetaThemeColor();

  const installBtn = document.getElementById('installBtn');

  // Settings & help wiring
  const settingsBtn = document.getElementById('settingsBtn');
  const helpBtn = document.getElementById('helpBtn');

  // Show onboarding on first visit (unless opted out)
  if (localStorage.getItem('seenOnboard') !== 'true') {
    setTimeout(() => showOnboarding(), 800);
  }

  if (helpBtn) helpBtn.addEventListener('click', () => showOnboarding());
  if (settingsBtn) settingsBtn.addEventListener('click', () => openSettings());

  const closeSettingsBtn = document.getElementById('closeSettings');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const resetProgressBtn = document.getElementById('resetProgress');

  // Reminder sound setting
  const reminderSoundCheckbox = document.getElementById('reminderSound');
  if (reminderSoundCheckbox) {
    reminderSoundCheckbox.checked = localStorage.getItem('reminderSound') === 'true';
    reminderSoundCheckbox.addEventListener('change', (e) => {
      localStorage.setItem('reminderSound', e.target.checked ? 'true' : 'false');
      showToast(e.target.checked ? 'Sound enabled' : 'Sound disabled');
    });
  }

  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
    const intervalVal = parseInt(document.getElementById('intervalSetting').value, 10) || null;
    if (intervalVal) document.getElementById('interval').value = intervalVal;
    showToast('Settings saved');
    closeSettings();
    saveData();
  });

  if (resetProgressBtn) resetProgressBtn.addEventListener('click', resetProgress);
  const pageResetBtn = document.getElementById('resetBtn');
  if (pageResetBtn) pageResetBtn.addEventListener('click', resetProgress);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'block';
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        showToast('Thanks for installing!');
      } else {
        showToast('Installation dismissed');
      }
      deferredPrompt = null;
      installBtn.style.display = 'none';
    });
  }
});

function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeToggle();
  updateMetaThemeColor();
}

function updateThemeToggle(){
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const isDark = document.body.classList.contains('dark');
  btn.innerText = isDark ? '☀️' : '🌙';
  btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
}

function updateMetaThemeColor(){
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const color = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
  if (color) meta.setAttribute('content', color);
}

function startReminder() {
  console.log('startReminder called');
  const intervalMinutes = parseInt(document.getElementById('interval').value, 10);

  if (!intervalMinutes) {
    alert('Please enter a reminder interval');
    return;
  }

  saveData();

  const intervalMs = intervalMinutes * 60000;

  // clear any existing timers
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  if (initialTimeoutId) { clearTimeout(initialTimeoutId); initialTimeoutId = null; }
  if (timerIntervalId) { clearInterval(timerIntervalId); timerIntervalId = null; }

  // schedule repeating notifications
  nextReminder = Date.now() + intervalMs;
  reminderRunning = true;
  intervalId = setInterval(() => {
    notifyUser('Time to drink water 💧');
    nextReminder = Date.now() + intervalMs;
    saveData();
    startTimer(nextReminder);
  }, intervalMs);

  // start UI timer and persist
  startTimer(nextReminder);
  const stopBtn = document.getElementById('stopBtn');
  if (stopBtn) stopBtn.style.display = 'inline-block';
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.disabled = true;
  saveData();

  requestNotificationPermission().then(granted => {
    if (!granted) {
      showToast('Notifications are disabled — reminders will use in-page alerts.');
    }
    showToast('Reminder started!');
  });
}

function stopReminder(){
  console.log('stopReminder called');
  // clear active repeating timers
  if (intervalId){ clearInterval(intervalId); intervalId = null; }
  if (initialTimeoutId){ clearTimeout(initialTimeoutId); initialTimeoutId = null; }
  // keep a ticking UI so the paused countdown updates
  if (timerIntervalId){ clearInterval(timerIntervalId); timerIntervalId = null; }

  // store remaining time until next reminder so we can resume
  if (nextReminder && reminderRunning) {
    pausedRemaining = Math.max(0, nextReminder - Date.now());
  } else if (!pausedRemaining) {
    pausedRemaining = null;
  }

  nextReminder = null;
  reminderRunning = false;

  const stopBtn = document.getElementById('stopBtn');
  if (stopBtn) stopBtn.style.display = 'none';
  const resumeBtn = document.getElementById('resumeBtn');
  if (resumeBtn) resumeBtn.style.display = 'inline-block';
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.disabled = false;

  // start UI updater so pausedRemaining display decrements every second
  if (!timerIntervalId) timerIntervalId = setInterval(updateTimerDisplay, 1000);
  updateTimerDisplay();
  saveData();
  showToast('Reminder paused');
}

// Resume a paused reminder
function resumeReminder(){
  console.log('resumeReminder called');
  if (!pausedRemaining || pausedRemaining <= 0) {
    showToast('No paused reminder to resume — starting a fresh reminder');
    pausedRemaining = null;
    startReminder();
    return;
  }
  const intervalMinutes = parseInt(document.getElementById('interval').value, 10);
  if (!intervalMinutes) { showToast('Please set an interval to resume'); return; }

  const intervalMs = intervalMinutes * 60000;
  reminderRunning = true;
  nextReminder = Date.now() + pausedRemaining;

  // schedule the next notification after the paused time, then start the repeating interval
  initialTimeoutId = setTimeout(() => {
    notifyUser('Time to drink water \uD83D\uDCA7');
    nextReminder = Date.now() + intervalMs;
    saveData();
    startTimer(nextReminder);
    intervalId = setInterval(() => {
      notifyUser('Time to drink water \uD83D\uDCA7');
      nextReminder = Date.now() + intervalMs;
      saveData();
      startTimer(nextReminder);
    }, intervalMs);
  }, pausedRemaining);

  // UI changes
  const stopBtn = document.getElementById('stopBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  if (stopBtn) stopBtn.style.display = 'inline-block';
  if (resumeBtn) resumeBtn.style.display = 'none';
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.disabled = true;

  // clear paused state
  pausedRemaining = null;
  saveData();
  showToast('Reminder resumed');
}

// Reset reminders and settings
function resetProgress(){
  if (!confirm('Reset reminders? This will stop any active reminders.')) return;
  stopReminder();
  pausedRemaining = null;
  const resumeBtn = document.getElementById('resumeBtn'); if (resumeBtn) resumeBtn.style.display = 'none';
  saveData();
  showToast('Reminders reset');
  try{ closeSettings(); }catch(e){}
} 

function startTimer(nextTs){
  if (!nextTs) return updateTimerDisplay();
  if (timerIntervalId) clearInterval(timerIntervalId);
  timerIntervalId = setInterval(updateTimerDisplay, 1000);
  updateTimerDisplay();
}

function formatMs(ms) {
  const totalSec = Math.max(0, Math.floor(ms/1000));
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  if (hh > 0) return `${hh}h ${mm}m`;
  return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

function updateTimerDisplay(){
  const el = document.getElementById('timer');
  const countdownEl = document.getElementById('countdown');
  const progressEl = document.getElementById('countdownProgress');
  if (!el) return;

  // Paused state UI
  if (!reminderRunning && pausedRemaining) {
    el.innerText = 'Paused';
    if (countdownEl) countdownEl.innerText = formatMs(pausedRemaining);
    // update progress bar relative to current interval value
    const intervalMinutes = parseInt(document.getElementById('interval')?.value, 10) || null;
    if (progressEl && intervalMinutes) {
      const intervalMs = intervalMinutes * 60000;
      const percent = Math.max(0, Math.min(100, Math.round((intervalMs - pausedRemaining) / intervalMs * 100)));
      progressEl.style.width = percent + '%';
      progressEl.setAttribute('aria-valuenow', percent);
    }
    // decrement pausedRemaining so UI shows time ticking
    pausedRemaining = Math.max(0, pausedRemaining - 1000);
    if (pausedRemaining === 0) {
      // if it reached zero while paused, trigger notification and clear paused
      notifyUser('Time to drink water \uD83D\uDCA7');
      pausedRemaining = null;
      saveData();
    }
    return;
  }

  if (!nextReminder || !reminderRunning){
    el.innerText = 'Not running';
    if (countdownEl) countdownEl.innerText = '--:--';
    if (progressEl) { progressEl.style.width = '0%'; progressEl.setAttribute('aria-valuenow','0'); }
    return;
  }

  let diff = nextReminder - Date.now();
  if (diff < 0) diff = 0;
  const hh = Math.floor(diff / 3600000);
  const mm = Math.floor((diff % 3600000) / 60000);
  const ss = Math.floor((diff % 60000) / 1000);
  let str = '';
  let countdownStr = '';
  if (hh > 0) {
    str = `${hh}h ${mm}m`;
    countdownStr = `${hh}h ${mm}m`;
  } else {
    str = `${mm}:${String(ss).padStart(2, '0')}`;
    countdownStr = `${mm}:${String(ss).padStart(2, '0')}`;
  }
  el.innerText = `Next reminder in: ${str}`;
  if (countdownEl) countdownEl.innerText = countdownStr;

  // Update progress bar based on current interval setting
  const intervalMinutes = parseInt(document.getElementById('interval')?.value, 10) || null;
  if (progressEl && intervalMinutes) {
    const intervalMs = intervalMinutes * 60000;
    const percent = Math.max(0, Math.min(100, Math.round((intervalMs - diff) / intervalMs * 100)));
    progressEl.style.width = percent + '%';
    progressEl.setAttribute('aria-valuenow', percent);
  } else if (progressEl) {
    progressEl.style.width = '0%';
    progressEl.setAttribute('aria-valuenow','0');
  }
} 

// Save data (only storing reminder state)
function saveData() {
  const interval = parseInt(document.getElementById('interval')?.value, 10) || null;
  localStorage.setItem('waterData',
    JSON.stringify({ interval, nextReminder, reminderRunning, pausedRemaining })
  );
} 

// Notifications
function requestNotificationPermission() {
  if (!('Notification' in window)) return Promise.resolve(false);
  if (Notification.permission === 'granted') return Promise.resolve(true);
  return Notification.requestPermission().then(permission => permission === 'granted');
}

function playFeedback(){
  try{
    if (navigator.vibrate) navigator.vibrate([200,80,200]);
    const useSound = localStorage.getItem('reminderSound') === 'true';
    if (useSound){
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.06;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      setTimeout(()=>{ o.stop(); ctx.close(); }, 350);
    }
  }catch(e){}
}

function notifyUser(message) {
  console.log('notifyUser:', message);
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg && reg.showNotification) {
        reg.showNotification('Water Reminder', {
          body: message,
          icon: 'icon-192.png',
          vibrate: [200, 100, 200]
        });
        // give a gentle feedback on the page if enabled
        playFeedback();
        return;
      }
      if (Notification.permission === 'granted') {
        new Notification(message);
        playFeedback();
        return;
      }
      showToast(message);
      playFeedback();
    }).catch(() => {
      if (Notification.permission === 'granted') {
        new Notification(message);
        playFeedback();
      } else {
        showToast(message);
        playFeedback();
      }
    });
  } else if (Notification.permission === 'granted') {
    new Notification(message);
    playFeedback();
  } else {
    showToast(message);
    playFeedback();
  }
}

// Simple in-page toast
function showToast(msg, duration = 3500) {
  let t = document.createElement('div');
  t.className = 'toast';
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, duration);
} 