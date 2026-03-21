'use strict';

// =============================================
// CONFIG
// =============================================
const GODS = {
  easy: {
    name: 'Hermes',
    icon: '🪽',
    flavor: 'Train with Hermes \u2014 speed is everything!',
    maxDividend: 20,
    maxDivisor: 5,
    accent: '#FFD700',
    accentGlow: 'rgba(255, 215, 0, 0.25)',
  },
  medium: {
    name: 'Athena',
    icon: '🦉',
    flavor: "Seek Athena's wisdom \u2014 think before you leap!",
    maxDividend: 50,
    maxDivisor: 10,
    accent: '#B57BEE',
    accentGlow: 'rgba(181, 123, 238, 0.25)',
  },
  hard: {
    name: 'Zeus',
    icon: '⚡',
    flavor: 'Prove yourself to Zeus \u2014 only the strongest survive!',
    maxDividend: 100,
    maxDivisor: 12,
    accent: '#4A9FD4',
    accentGlow: 'rgba(74, 159, 212, 0.25)',
  },
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 42; // ≈ 263.9
const CONFETTI_EMOJIS = ['⭐', '🌟', '✨', '💫', '🌠'];
const RESULTS_CONFETTI_EMOJIS = ['⭐', '🌟', '✨', '💫', '🌠', '🎉', '🎊', '🏆'];

// =============================================
// STATE
// =============================================
const state = {
  difficulty: 'easy',
  timerMinutes: 1,
  score: 0,
  currentAnswer: null,
  secondsLeft: 0,
  totalSeconds: 0,
  timerInterval: null,
  advancing: false,
};

// =============================================
// DOM REFS
// =============================================
const screens = {
  home:    document.getElementById('screen-home'),
  game:    document.getElementById('screen-game'),
  results: document.getElementById('screen-results'),
};

const els = {
  // Home
  godIcon:         document.getElementById('god-icon'),
  godName:         document.getElementById('god-name'),
  godFlavor:       document.getElementById('god-flavor'),
  difficultyGroup: document.getElementById('difficulty-group'),
  timerGroup:      document.getElementById('timer-group'),
  hsValue:         document.getElementById('hs-value'),
  btnStart:        document.getElementById('btn-start'),

  // Game
  liveScore:       document.getElementById('live-score'),
  liveBest:        document.getElementById('live-best'),
  liveTimer:       document.getElementById('live-timer'),
  ringFill:        document.getElementById('ring-fill'),
  problemCard:     document.getElementById('problem-card'),
  dividend:        document.getElementById('dividend'),
  divisor:         document.getElementById('divisor'),
  answerInput:     document.getElementById('answer-input'),
  btnSkip:         document.getElementById('btn-skip'),
  feedback:        document.getElementById('feedback'),
  confettiLayer:   document.getElementById('confetti-layer'),

  // Results
  resultsGodIcon:  document.getElementById('results-god-icon'),
  resultsScore:    document.getElementById('results-score'),
  newHsBanner:     document.getElementById('new-hs-banner'),
  resultsMeta:     document.getElementById('results-meta'),
  resultsPrevBest: document.getElementById('results-prev-best'),
  btnPlayAgain:    document.getElementById('btn-play-again'),
  btnHome:         document.getElementById('btn-home'),
  resultsConfetti: document.getElementById('results-confetti-layer'),
};

// =============================================
// LOCALSTORAGE HELPERS
// =============================================
function hsKey(difficulty, minutes) {
  return `dailydivision_hs_${difficulty}_${minutes}`;
}

function getHighScore(difficulty, minutes) {
  return parseInt(localStorage.getItem(hsKey(difficulty, minutes)) || '0', 10);
}

function saveHighScore(difficulty, minutes, score) {
  localStorage.setItem(hsKey(difficulty, minutes), String(score));
}

// =============================================
// PROBLEM GENERATION
// =============================================
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProblem() {
  const cfg = GODS[state.difficulty];
  const divisor = randInt(1, cfg.maxDivisor);
  const maxQuotient = Math.floor(cfg.maxDividend / divisor);
  const quotient = randInt(1, Math.max(1, maxQuotient));
  const dividend = divisor * quotient;
  return { dividend, divisor, answer: quotient };
}

// =============================================
// THEME
// =============================================
function applyGodTheme(difficulty) {
  const god = GODS[difficulty];
  document.documentElement.style.setProperty('--accent', god.accent);
  document.documentElement.style.setProperty('--accent-glow', god.accentGlow);

  // Update ring stroke color immediately (not waiting for CSS transition)
  els.ringFill.style.stroke = god.accent;

  // Home screen god display
  els.godIcon.textContent = god.icon;
  els.godName.textContent = god.name;
  els.godFlavor.textContent = god.flavor;
}

// =============================================
// SCREEN MANAGEMENT
// =============================================
function showScreen(id) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  const target = screens[id];
  target.classList.remove('hidden');
  // Re-trigger entrance animation
  target.style.animation = 'none';
  target.offsetHeight; // reflow
  target.style.animation = '';
}

// =============================================
// HOME SCREEN
// =============================================
function showHome() {
  stopTimer();
  applyGodTheme(state.difficulty);
  updateHomeHighScore();
  syncActiveButtons();
  showScreen('home');
}

function updateHomeHighScore() {
  const hs = getHighScore(state.difficulty, state.timerMinutes);
  els.hsValue.textContent = hs > 0 ? String(hs) : '—';
}

function syncActiveButtons() {
  setActiveBtn(els.difficultyGroup, state.difficulty);
  setActiveBtn(els.timerGroup, String(state.timerMinutes));
}

function setActiveBtn(groupEl, value) {
  groupEl.querySelectorAll('.choice-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });
}

// =============================================
// GAME SCREEN
// =============================================
function showGame() {
  stopTimer();
  state.score = 0;
  state.advancing = false;

  applyGodTheme(state.difficulty);
  els.liveScore.textContent = '0';
  els.liveBest.textContent = String(getHighScore(state.difficulty, state.timerMinutes));
  els.feedback.textContent = '';
  els.feedback.className = 'feedback';

  showScreen('game');
  loadNextProblem(false); // no slide animation for first problem
  startTimer();

  // Focus input after screen transition
  setTimeout(() => els.answerInput.focus(), 100);
}

function loadNextProblem(animate = true) {
  const { dividend, divisor, answer } = generateProblem();
  state.currentAnswer = answer;

  els.dividend.textContent = String(dividend);
  els.divisor.textContent = String(divisor);
  els.answerInput.value = '';

  // Trigger slide-in animation
  if (animate) {
    els.problemCard.style.animation = 'none';
    els.problemCard.offsetHeight; // reflow
    els.problemCard.style.animation = '';
    els.problemCard.className = 'problem-card';
    // Force reflow again then add animation
    els.problemCard.offsetHeight;
    els.problemCard.style.animation = 'slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both';
  }

  // Re-focus input to keep iPad keyboard open
  setTimeout(() => {
    els.answerInput.focus();
    state.advancing = false;
  }, 50);
}

function handleAnswerInput() {
  if (state.advancing) return;

  const raw = els.answerInput.value.replace(/[^0-9]/g, '');
  if (raw === '') return;

  const val = parseInt(raw, 10);
  if (val === state.currentAnswer) {
    state.advancing = true;
    onCorrectAnswer();
  }
}

function onCorrectAnswer() {
  state.score++;
  els.liveScore.textContent = String(state.score);

  // Score pop animation
  els.liveScore.classList.remove('pop');
  els.liveScore.offsetHeight;
  els.liveScore.classList.add('pop');
  setTimeout(() => els.liveScore.classList.remove('pop'), 350);

  // Card flash
  els.problemCard.style.animation = 'none';
  els.problemCard.offsetHeight;
  els.problemCard.className = 'problem-card';
  els.problemCard.offsetHeight;
  els.problemCard.style.animation = 'correctFlash 0.4s ease both';

  // Confetti
  spawnConfetti(els.confettiLayer, 7, CONFETTI_EMOJIS);

  // Feedback
  showFeedback('Correct! ✓', 'correct');

  setTimeout(() => loadNextProblem(true), 350);
}

function handleSkip() {
  if (state.advancing) return;

  // Card shake
  els.problemCard.style.animation = 'none';
  els.problemCard.offsetHeight;
  els.problemCard.className = 'problem-card';
  els.problemCard.offsetHeight;
  els.problemCard.style.animation = 'shake 0.4s ease both';

  showFeedback('Skipped ✗', 'wrong');

  setTimeout(() => loadNextProblem(true), 300);
}

function showFeedback(text, type) {
  els.feedback.textContent = text;
  els.feedback.className = `feedback ${type}`;
  setTimeout(() => {
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
  }, 800);
}

// =============================================
// TIMER
// =============================================
function startTimer() {
  state.totalSeconds = state.timerMinutes * 60;
  state.secondsLeft = state.totalSeconds;
  updateTimerDisplay();
  updateTimerRing();

  state.timerInterval = setInterval(tickTimer, 1000);
}

function tickTimer() {
  state.secondsLeft--;
  updateTimerDisplay();
  updateTimerRing();

  if (state.secondsLeft <= 0) {
    stopTimer();
    showResults();
  }
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function updateTimerDisplay() {
  const mins = Math.floor(state.secondsLeft / 60);
  const secs = state.secondsLeft % 60;
  els.liveTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

  const isUrgent = state.secondsLeft <= 10 && state.secondsLeft > 0;
  els.liveTimer.className = isUrgent ? 'timer-text urgent' : 'timer-text';
}

function updateTimerRing() {
  const ratio = state.totalSeconds > 0 ? state.secondsLeft / state.totalSeconds : 0;
  const offset = RING_CIRCUMFERENCE * (1 - ratio);
  els.ringFill.style.strokeDashoffset = String(offset);

  const isUrgent = state.secondsLeft <= 10 && state.secondsLeft > 0;
  if (isUrgent) {
    els.ringFill.classList.add('urgent');
    els.ringFill.style.stroke = '#FF6B6B';
  } else {
    els.ringFill.classList.remove('urgent');
    els.ringFill.style.stroke = GODS[state.difficulty].accent;
  }
}

// =============================================
// RESULTS SCREEN
// =============================================
function showResults() {
  const god = GODS[state.difficulty];
  const finalScore = state.score;
  const prevBest = getHighScore(state.difficulty, state.timerMinutes);
  const isNewHS = finalScore > prevBest;

  if (isNewHS) {
    saveHighScore(state.difficulty, state.timerMinutes, finalScore);
  }

  // Populate results
  els.resultsGodIcon.textContent = god.icon;
  els.resultsMeta.textContent = `${god.name} \u00B7 ${state.timerMinutes} minute${state.timerMinutes > 1 ? 's' : ''}`;
  els.resultsPrevBest.textContent = prevBest > 0 ? `Previous best: ${prevBest}` : 'First run!';
  els.resultsScore.textContent = '0';

  els.newHsBanner.classList.toggle('hidden', !isNewHS);

  showScreen('results');

  // Animate score count-up
  animateScoreCount(0, finalScore, els.resultsScore);

  // Star shower on new high score
  if (isNewHS) {
    setTimeout(() => spawnConfetti(els.resultsConfetti, 20, RESULTS_CONFETTI_EMOJIS, true), 300);
  }
}

function animateScoreCount(from, to, el) {
  if (to === 0) {
    el.textContent = '0';
    return;
  }
  const duration = Math.min(1200, to * 80);
  const steps = Math.min(to, 30);
  const interval = duration / steps;
  let current = from;
  const increment = Math.ceil(to / steps);

  const counter = setInterval(() => {
    current = Math.min(current + increment, to);
    el.textContent = String(current);
    if (current >= to) clearInterval(counter);
  }, interval);
}

// =============================================
// CONFETTI
// =============================================
function spawnConfetti(container, count, emojis, spread = false) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'confetti-particle';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const startX = spread
      ? Math.random() * window.innerWidth
      : window.innerWidth / 2 + (Math.random() - 0.5) * 200;
    const startY = spread
      ? Math.random() * window.innerHeight * 0.6
      : window.innerHeight * 0.55;

    el.style.left = `${startX}px`;
    el.style.top = `${startY}px`;
    el.style.fontSize = `${1.2 + Math.random() * 1}rem`;
    el.style.animationDuration = `${0.8 + Math.random() * 0.8}s`;
    el.style.animationDelay = `${Math.random() * 0.3}s`;

    // Random horizontal drift
    const driftX = (Math.random() - 0.5) * 120;
    el.style.setProperty('--drift', `${driftX}px`);
    el.style.transform = `translateX(0)`;

    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// =============================================
// EVENT LISTENERS
// =============================================

// Difficulty selection
els.difficultyGroup.addEventListener('click', e => {
  const btn = e.target.closest('.choice-btn');
  if (!btn) return;
  state.difficulty = btn.dataset.value;
  setActiveBtn(els.difficultyGroup, state.difficulty);
  applyGodTheme(state.difficulty);
  updateHomeHighScore();
});

// Timer selection
els.timerGroup.addEventListener('click', e => {
  const btn = e.target.closest('.choice-btn');
  if (!btn) return;
  state.timerMinutes = parseInt(btn.dataset.value, 10);
  setActiveBtn(els.timerGroup, btn.dataset.value);
  updateHomeHighScore();
});

// Start game
els.btnStart.addEventListener('click', showGame);

// Answer input
els.answerInput.addEventListener('input', handleAnswerInput);

// Skip
els.btnSkip.addEventListener('click', handleSkip);

// Play again (same difficulty + timer)
els.btnPlayAgain.addEventListener('click', showGame);

// Back to home
els.btnHome.addEventListener('click', showHome);

// =============================================
// INIT
// =============================================
function init() {
  // Set ring stroke-dasharray
  els.ringFill.style.strokeDasharray = String(RING_CIRCUMFERENCE);
  els.ringFill.style.strokeDashoffset = '0';

  applyGodTheme(state.difficulty);
  syncActiveButtons();
  updateHomeHighScore();
}

init();
