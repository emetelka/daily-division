'use strict';

const GODS = {
  division: {
    easy:   { name: 'Hermes', icon: '🪽', flavor: 'Train with Hermes \u2014 speed is everything!',            maxDividend: 20,  maxDivisor: 5,  accent: '#FFD700' },
    medium: { name: 'Athena', icon: '🦉', flavor: "Seek Athena's wisdom \u2014 think before you leap!",      maxDividend: 50,  maxDivisor: 10, accent: '#B57BEE' },
    hard:   { name: 'Zeus',   icon: '⚡', flavor: 'Prove yourself to Zeus \u2014 only the strongest survive!', maxDividend: 100, maxDivisor: 12, accent: '#4A9FD4' },
  },
  multiplication: {
    easy:   { name: 'Aphrodite', icon: '🌸', flavor: 'Let Aphrodite charm you \u2014 beauty is in every answer!', maxFactor: 10, accent: '#FF6B9D' },
    medium: { name: 'Poseidon',  icon: '🔱', flavor: 'Command Poseidon\u2019s power \u2014 the seas obey!',       maxFactor: 12, accent: '#00B4D8' },
    hard:   { name: 'Ares',      icon: '\u2694\ufe0f', flavor: 'Face Ares in battle \u2014 glory to the victorious!', maxFactor: 15, accent: '#E63946' },
  },
  fraction: {
    easy:   { name: 'Demeter',    icon: '\ud83c\udf3e', flavor: 'Begin with Demeter \u2014 every answer divides by 2!',              maxGcd: 2,  maxSimplified: 4,  properOnly: true,  accent: '#7CB342' },
    medium: { name: 'Hephaestus', icon: '\u2692\ufe0f',  flavor: 'Forge with Hephaestus \u2014 precision is the craftsman\u2019s gift!', maxGcd: 5,  maxSimplified: 5,  accent: '#FF8C00' },
    hard:   { name: 'Hades',      icon: '\ud83d\udc80',  flavor: 'Enter Hades\u2019 domain \u2014 only the sharpest minds endure!',      maxGcd: 12, maxSimplified: 12, accent: '#9C27B0' },
  },
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 42;

const ANIMATIONS = {
  slideIn:      'slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
  correctFlash: 'correctFlash 0.4s ease both',
  shake:        'shake 0.4s ease both',
};

const CONFETTI_EMOJIS         = ['⭐', '🌟', '✨', '💫', '🌠'];
const RESULTS_CONFETTI_EMOJIS = ['⭐', '🌟', '✨', '💫', '🌠', '🎉', '🎊', '🏆'];
const MEDALS                  = ['🥇', '🥈', '🥉'];

const state = {
  difficulty:           'easy',
  operation:            'division',
  timerMinutes:         1,
  score:                0,
  currentAnswer:        null,
  currentAnswerNum:     null,
  currentAnswerDenom:   null,
  secondsLeft:          0,
  totalSeconds:         0,
  timerInterval:        null,
  scoreCountInterval:   null,
  modalTimer:           null,
  advancing:            false,
};

// Tracks current filter selections in the leaderboard screen
const lbState = {
  operation:    'division',
  difficulty:   'easy',
  minutes:      1,
  returnScreen: 'home',
};

const screens = {
  home:        document.getElementById('screen-home'),
  game:        document.getElementById('screen-game'),
  results:     document.getElementById('screen-results'),
  leaderboard: document.getElementById('screen-leaderboard'),
};

const els = {
  // home
  godIcon:              document.getElementById('god-icon'),
  godName:              document.getElementById('god-name'),
  godFlavor:            document.getElementById('god-flavor'),
  difficultyGroup:      document.getElementById('difficulty-group'),
  operationGroup:       document.getElementById('operation-group'),
  timerGroup:           document.getElementById('timer-group'),
  hsValue:              document.getElementById('hs-value'),
  btnStart:             document.getElementById('btn-start'),
  btnLeaderboardHome:   document.getElementById('btn-leaderboard-home'),

  // game
  liveScore:       document.getElementById('live-score'),
  liveBest:        document.getElementById('live-best'),
  liveTimer:       document.getElementById('live-timer'),
  ringFill:        document.getElementById('ring-fill'),
  problemCard:     document.getElementById('problem-card'),
  problemOp:       document.getElementById('problem-op'),
  dividend:        document.getElementById('dividend'),
  divisor:         document.getElementById('divisor'),
  problemText:     document.getElementById('problem-text'),
  answerInput:     document.getElementById('answer-input'),
  fractionAnswer:  document.getElementById('fraction-answer'),
  numerInput:      document.getElementById('numer-input'),
  denomInput:      document.getElementById('denom-input'),
  btnSkip:         document.getElementById('btn-skip'),
  btnExit:         document.getElementById('btn-exit'),
  feedback:        document.getElementById('feedback'),
  confettiLayer:   document.getElementById('confetti-layer'),

  // results
  resultsGodIcon:        document.getElementById('results-god-icon'),
  resultsScore:          document.getElementById('results-score'),
  newHsBanner:           document.getElementById('new-hs-banner'),
  resultsMeta:           document.getElementById('results-meta'),
  resultsPrevBest:       document.getElementById('results-prev-best'),
  btnPlayAgain:          document.getElementById('btn-play-again'),
  btnHome:               document.getElementById('btn-home'),
  resultsConfetti:       document.getElementById('results-confetti-layer'),
  btnLeaderboardResults: document.getElementById('btn-leaderboard-results'),

  // leaderboard
  lbOpGroup:   document.getElementById('lb-op-group'),
  lbDiffGroup: document.getElementById('lb-diff-group'),
  lbTimeGroup: document.getElementById('lb-time-group'),
  lbEntries:   document.getElementById('lb-entries'),
  btnLbBack:   document.getElementById('btn-lb-back'),

  // name modal
  nameModal:   document.getElementById('name-modal'),
  nameInput:   document.getElementById('name-input'),
  btnSaveName: document.getElementById('btn-save-name'),
};

// =================== STORAGE ===================

function hsKey(operation, difficulty, minutes) {
  // Key format kept identical to legacy: hs_{difficulty}_{operation}_{minutes}
  return `dailydivision_hs_${difficulty}_${operation}_${minutes}`;
}

function getLeaderboard(operation, difficulty, minutes) {
  const raw = localStorage.getItem(hsKey(operation, difficulty, minutes));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // Legacy: plain number string → migrate to entry format
  const n = parseInt(raw, 10);
  return n > 0 ? [{ score: n, name: 'Anonymous' }] : [];
}

function getHighScore(operation, difficulty, minutes) {
  const lb = getLeaderboard(operation, difficulty, minutes);
  return lb.length > 0 ? lb[0].score : 0;
}


function addToLeaderboard(operation, difficulty, minutes, score, name) {
  const lb = getLeaderboard(operation, difficulty, minutes);
  lb.push({ score, name: name.trim() || 'Anonymous' });
  lb.sort((a, b) => b.score - a.score);
  localStorage.setItem(hsKey(operation, difficulty, minutes), JSON.stringify(lb.slice(0, 3)));
}

function getLastName() {
  return localStorage.getItem('dailydivision_last_name') || '';
}

function saveLastName(name) {
  if (name.trim()) localStorage.setItem('dailydivision_last_name', name.trim());
}

// =================== UTILITIES ===================

function hexToRgba(hex, alpha = 0.25) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =================== PROBLEM GENERATION ===================

function generateProblem() {
  const cfg = GODS[state.operation][state.difficulty];
  if (state.operation === 'division') {
    const divisor = randInt(1, cfg.maxDivisor);
    const quotient = randInt(1, Math.max(1, Math.floor(cfg.maxDividend / divisor)));
    return { a: divisor * quotient, b: divisor, answer: quotient, op: '\u00f7' };
  } else if (state.operation === 'multiplication') {
    const a = randInt(1, cfg.maxFactor);
    const b = randInt(1, cfg.maxFactor);
    return { a, b, answer: a * b, op: '\u00d7' };
  } else {
    let simplNum, simplDenom, factor;
    do {
      factor     = randInt(2, cfg.maxGcd);
      simplNum   = randInt(1, cfg.maxSimplified);
      simplDenom = randInt(2, cfg.maxSimplified);
    } while (simplNum === simplDenom || gcd(simplNum, simplDenom) !== 1 || (cfg.properOnly && simplNum > simplDenom));
    return { a: simplNum * factor, b: simplDenom * factor,
             answerNum: simplNum, answerDenom: simplDenom, op: 'fraction' };
  }
}

// =================== ANIMATION HELPERS ===================

function forceReflow(el) { el.offsetHeight; }

function triggerCardAnimation(animationValue) {
  els.problemCard.style.animation = 'none';
  forceReflow(els.problemCard);
  els.problemCard.className = 'problem-card';
  forceReflow(els.problemCard);
  els.problemCard.style.animation = animationValue;
}

// =================== THEME ===================

function applyAccent(operation, difficulty) {
  const god = GODS[operation][difficulty];
  document.documentElement.style.setProperty('--accent', god.accent);
  document.documentElement.style.setProperty('--accent-glow', hexToRgba(god.accent));
}

function applyGodTheme(operation, difficulty) {
  const god = GODS[operation][difficulty];
  applyAccent(operation, difficulty);
  els.ringFill.style.stroke = god.accent;
  els.godIcon.textContent = god.icon;
  els.godName.textContent = god.name;
  els.godFlavor.textContent = god.flavor;
}

// =================== SCREEN MANAGEMENT ===================

function showScreen(id) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  const target = screens[id];
  target.classList.remove('hidden');
  target.style.animation = 'none';
  forceReflow(target);
  target.style.animation = '';
}

// Cancel any pending modal timer and, if modal is already open, auto-save and close it
function closePendingModal() {
  clearTimeout(state.modalTimer);
  state.modalTimer = null;
  if (!els.nameModal.classList.contains('hidden')) {
    const name = els.nameInput.value.trim() || getLastName() || 'Anonymous';
    saveLastName(name);
    addToLeaderboard(state.operation, state.difficulty, state.timerMinutes, state.score, name);
    els.nameModal.classList.add('hidden');
  }
}

function showHome() {
  closePendingModal();
  stopTimer();
  applyGodTheme(state.operation, state.difficulty);
  updateHomeHighScore();
  syncActiveButtons();
  showScreen('home');
}

function updateHomeHighScore() {
  const hs = getHighScore(state.operation, state.difficulty, state.timerMinutes);
  els.hsValue.textContent = hs > 0 ? String(hs) : '—';
}

function syncActiveButtons() {
  setActiveBtn(els.difficultyGroup, state.difficulty);
  setActiveBtn(els.operationGroup, state.operation);
  setActiveBtn(els.timerGroup, String(state.timerMinutes));
  updateDifficultyButtons();
}

function populateDiffButtons(groupEl, operation) {
  groupEl.querySelectorAll('.choice-btn').forEach(btn => {
    const god = GODS[operation][btn.dataset.value];
    btn.querySelector('.btn-icon').textContent  = god.icon;
    btn.querySelector('.btn-label').textContent = god.name;
  });
}

function updateDifficultyButtons() {
  populateDiffButtons(els.difficultyGroup, state.operation);
}

function setActiveBtn(groupEl, value) {
  groupEl.querySelectorAll('.choice-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });
}

// =================== GAME ===================

function showGame() {
  closePendingModal();
  stopTimer();
  clearScoreCount();
  state.score = 0;

  applyGodTheme(state.operation, state.difficulty);
  els.liveScore.textContent = '0';
  els.liveBest.textContent = String(getHighScore(state.operation, state.difficulty, state.timerMinutes));
  els.feedback.textContent = '';
  els.feedback.className = 'feedback';

  showScreen('game');
  loadNextProblem(false);
  startTimer();

  setTimeout(() => (state.operation === 'fraction' ? els.numerInput : els.answerInput).focus(), 100);
}

function loadNextProblem(animate = true) {
  const { a, b, answer, answerNum, answerDenom, op } = generateProblem();
  state.currentAnswer      = answer      ?? null;
  state.currentAnswerNum   = answerNum   ?? null;
  state.currentAnswerDenom = answerDenom ?? null;

  els.dividend.textContent = String(a);
  els.divisor.textContent  = String(b);

  const isFraction = (op === 'fraction');
  els.problemText.classList.toggle('fraction-layout', isFraction);
  els.answerInput.classList.toggle('hidden', isFraction);
  els.fractionAnswer.classList.toggle('hidden', !isFraction);

  if (isFraction) {
    els.problemOp.textContent = '';
    els.numerInput.value  = '';
    els.denomInput.value  = '';
  } else {
    els.problemOp.textContent = op;
    els.answerInput.value = '';
  }

  if (animate) {
    triggerCardAnimation(ANIMATIONS.slideIn);
  }

  // Delay keeps the iPad keyboard open between problems
  setTimeout(() => {
    (isFraction ? els.numerInput : els.answerInput).focus();
    state.advancing = false;
  }, 50);
}

function parseInput(inputEl) {
  return parseInt(inputEl.value.replace(/[^0-9]/g, ''), 10);
}

function isDefinitelyWrong(val, answer) {
  return !isNaN(val) && val !== 0 && !String(answer).startsWith(String(val));
}

const inputErrorTimers = new WeakMap();
function flashInputError(inputEl) {
  clearTimeout(inputErrorTimers.get(inputEl));
  inputEl.classList.remove('input-error');
  forceReflow(inputEl);
  inputEl.classList.add('input-error');
  inputErrorTimers.set(inputEl, setTimeout(() => inputEl.classList.remove('input-error'), 400));
}

function handleAnswerInput() {
  if (state.advancing) return;

  if (state.operation === 'fraction') {
    const num = parseInput(els.numerInput);
    const den = parseInput(els.denomInput);
    if (num === state.currentAnswerNum && den === state.currentAnswerDenom) {
      state.advancing = true;
      onCorrectAnswer();
      return;
    }
    if (els.numerInput.value !== '' && isDefinitelyWrong(num, state.currentAnswerNum))   flashInputError(els.numerInput);
    if (els.denomInput.value !== '' && isDefinitelyWrong(den, state.currentAnswerDenom)) flashInputError(els.denomInput);
  } else {
    const val = parseInput(els.answerInput);
    if (val === state.currentAnswer) {
      state.advancing = true;
      onCorrectAnswer();
      return;
    }
    if (els.answerInput.value !== '' && isDefinitelyWrong(val, state.currentAnswer)) flashInputError(els.answerInput);
  }
}

function onCorrectAnswer() {
  state.score++;
  els.liveScore.textContent = String(state.score);

  els.liveScore.classList.remove('pop');
  forceReflow(els.liveScore);
  els.liveScore.classList.add('pop');

  triggerCardAnimation(ANIMATIONS.correctFlash);
  spawnConfetti(els.confettiLayer, 7, CONFETTI_EMOJIS);
  showFeedback('Correct! \u2713', 'correct');

  setTimeout(() => {
    els.liveScore.classList.remove('pop');
    loadNextProblem(true);
  }, 350);
}

function handleSkip() {
  if (state.advancing) return;
  triggerCardAnimation(ANIMATIONS.shake);
  showFeedback('Skipped \u2717', 'wrong');
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

// =================== TIMER ===================

function startTimer() {
  state.totalSeconds = state.timerMinutes * 60;
  state.secondsLeft = state.totalSeconds;
  updateTimerDisplay(false);
  updateTimerRing(false);
  state.timerInterval = setInterval(tickTimer, 1000);
}

function tickTimer() {
  state.secondsLeft--;
  const isUrgent = state.secondsLeft <= 10 && state.secondsLeft > 0;
  updateTimerDisplay(isUrgent);
  updateTimerRing(isUrgent);

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

function updateTimerDisplay(isUrgent) {
  const mins = Math.floor(state.secondsLeft / 60);
  const secs = state.secondsLeft % 60;
  els.liveTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  els.liveTimer.className = isUrgent ? 'timer-text urgent' : 'timer-text';
}

function updateTimerRing(isUrgent) {
  const ratio = state.totalSeconds > 0 ? state.secondsLeft / state.totalSeconds : 0;
  els.ringFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - ratio));

  if (isUrgent) {
    els.ringFill.classList.add('urgent');
    els.ringFill.style.stroke = '#FF6B6B';
  } else {
    els.ringFill.classList.remove('urgent');
    els.ringFill.style.stroke = GODS[state.operation][state.difficulty].accent;
  }
}

// =================== RESULTS ===================

function showResults() {
  const god = GODS[state.operation][state.difficulty];
  const finalScore = state.score;
  const lb       = getLeaderboard(state.operation, state.difficulty, state.timerMinutes);
  const prevBest = lb.length > 0 ? lb[0].score : 0;
  const isNewHS  = finalScore > prevBest;
  const isTop3   = finalScore > 0 && (lb.length < 3 || finalScore > lb[lb.length - 1].score);

  els.resultsGodIcon.textContent = god.icon;
  els.resultsMeta.textContent = `${god.name} \u00B7 ${state.timerMinutes} minute${state.timerMinutes > 1 ? 's' : ''}`;
  els.resultsPrevBest.textContent = prevBest > 0 ? `Previous best: ${prevBest}` : 'First run!';
  els.resultsScore.textContent = '0';
  els.newHsBanner.textContent = isNewHS ? '\u2B50 New High Score! \u2B50' : '\u2B50 Top 3 Score! \u2B50';
  els.newHsBanner.classList.toggle('hidden', !isTop3);

  showScreen('results');
  animateScoreCount(finalScore, els.resultsScore);

  if (isTop3) {
    setTimeout(() => spawnConfetti(els.resultsConfetti, 20, RESULTS_CONFETTI_EMOJIS, true), 300);
    // Show name modal after the score count finishes
    const countDuration = Math.min(1200, finalScore * 80) + 600;
    state.modalTimer = setTimeout(() => showNameModal(), countDuration);
  }
}

// =================== NAME MODAL ===================

function showNameModal() {
  els.nameInput.value = getLastName();
  els.nameModal.classList.remove('hidden');
  setTimeout(() => els.nameInput.focus(), 150);
}

function saveNameAndClose() {
  const name = els.nameInput.value.trim() || 'Anonymous';
  saveLastName(name);
  addToLeaderboard(state.operation, state.difficulty, state.timerMinutes, state.score, name);
  els.nameModal.classList.add('hidden');
  updateHomeHighScore();
}

// =================== LEADERBOARD ===================

function showLeaderboard(context) {
  closePendingModal();
  lbState.operation    = context.operation;
  lbState.difficulty   = context.difficulty;
  lbState.minutes      = context.minutes;
  lbState.returnScreen = context.returnScreen || 'home';

  setActiveBtn(els.lbOpGroup, lbState.operation);
  setActiveBtn(els.lbDiffGroup, lbState.difficulty);
  setActiveBtn(els.lbTimeGroup, String(lbState.minutes));
  updateLbDiffButtons();
  renderLeaderboard();
  showScreen('leaderboard');
}

function updateLbDiffButtons() {
  populateDiffButtons(els.lbDiffGroup, lbState.operation);
  applyAccent(lbState.operation, lbState.difficulty);
}

function renderLeaderboard() {
  const lb  = getLeaderboard(lbState.operation, lbState.difficulty, lbState.minutes);
  const god = GODS[lbState.operation][lbState.difficulty];
  const godLabel = `${god.icon} ${god.name} &middot; ${lbState.minutes} min`;

  const rows = Array.from({ length: 3 }, (_, i) => {
    const entry = lb[i];
    if (entry) {
      return `<div class="lb-entry${i === 0 ? ' lb-entry-top' : ''}">
        <span class="lb-medal">${MEDALS[i]}</span>
        <span class="lb-name">${escapeHtml(entry.name)}</span>
        <span class="lb-score">${entry.score}</span>
      </div>`;
    }
    return `<div class="lb-entry lb-entry-empty">
      <span class="lb-medal">${MEDALS[i]}</span>
      <span class="lb-name lb-name-empty">—</span>
      <span class="lb-score lb-score-empty">—</span>
    </div>`;
  }).join('');

  els.lbEntries.innerHTML = `<div class="lb-god-label">${godLabel}</div>${rows}`;
}

// =================== SCORE COUNT ANIMATION ===================

function clearScoreCount() {
  if (state.scoreCountInterval) {
    clearInterval(state.scoreCountInterval);
    state.scoreCountInterval = null;
  }
}

function animateScoreCount(to, el) {
  clearScoreCount();
  if (to === 0) { el.textContent = '0'; return; }

  const steps = Math.min(to, 30);
  const interval = Math.min(1200, to * 80) / steps;
  const increment = Math.ceil(to / steps);
  let current = 0;

  state.scoreCountInterval = setInterval(() => {
    current = Math.min(current + increment, to);
    el.textContent = String(current);
    if (current >= to) clearScoreCount();
  }, interval);
}

// =================== CONFETTI ===================

function spawnConfetti(container, count, emojis, spread = false) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'confetti-particle';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    el.style.left = `${spread ? Math.random() * window.innerWidth : window.innerWidth / 2 + (Math.random() - 0.5) * 200}px`;
    el.style.top  = `${spread ? Math.random() * window.innerHeight * 0.6 : window.innerHeight * 0.55}px`;
    el.style.fontSize = `${1.2 + Math.random() * 1}rem`;
    el.style.animationDuration = `${0.8 + Math.random() * 0.8}s`;
    el.style.animationDelay   = `${Math.random() * 0.3}s`;
    el.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);

    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// =================== EVENT LISTENERS ===================

// Home
els.difficultyGroup.addEventListener('click', e => {
  const btn = e.target.closest('.choice-btn');
  if (!btn) return;
  state.difficulty = btn.dataset.value;
  setActiveBtn(els.difficultyGroup, state.difficulty);
  applyGodTheme(state.operation, state.difficulty);
  updateHomeHighScore();
});

els.operationGroup.addEventListener('click', e => {
  const btn = e.target.closest('.choice-btn');
  if (!btn) return;
  state.operation = btn.dataset.value;
  setActiveBtn(els.operationGroup, state.operation);
  updateDifficultyButtons();
  applyGodTheme(state.operation, state.difficulty);
  updateHomeHighScore();
});

els.timerGroup.addEventListener('click', e => {
  const btn = e.target.closest('.choice-btn');
  if (!btn) return;
  state.timerMinutes = parseInt(btn.dataset.value, 10);
  setActiveBtn(els.timerGroup, btn.dataset.value);
  updateHomeHighScore();
});

els.btnStart.addEventListener('click', showGame);
els.btnLeaderboardHome.addEventListener('click', () => {
  showLeaderboard({ operation: state.operation, difficulty: state.difficulty, minutes: state.timerMinutes, returnScreen: 'home' });
});

// Game
els.answerInput.addEventListener('input', handleAnswerInput);
els.numerInput.addEventListener('input', handleAnswerInput);
els.denomInput.addEventListener('input', handleAnswerInput);
els.btnSkip.addEventListener('click', handleSkip);
els.btnExit.addEventListener('click', showHome);

// Results
els.btnPlayAgain.addEventListener('click', showGame);
els.btnHome.addEventListener('click', showHome);
els.btnLeaderboardResults.addEventListener('click', () => {
  showLeaderboard({ operation: state.operation, difficulty: state.difficulty, minutes: state.timerMinutes, returnScreen: 'results' });
});

// Leaderboard
els.lbOpGroup.addEventListener('click', e => {
  const btn = e.target.closest('.choice-btn');
  if (!btn) return;
  lbState.operation = btn.dataset.value;
  setActiveBtn(els.lbOpGroup, lbState.operation);
  updateLbDiffButtons();
  renderLeaderboard();
});

els.lbDiffGroup.addEventListener('click', e => {
  const btn = e.target.closest('.choice-btn');
  if (!btn) return;
  lbState.difficulty = btn.dataset.value;
  setActiveBtn(els.lbDiffGroup, lbState.difficulty);
  updateLbDiffButtons();
  renderLeaderboard();
});

els.lbTimeGroup.addEventListener('click', e => {
  const btn = e.target.closest('.choice-btn');
  if (!btn) return;
  lbState.minutes = parseInt(btn.dataset.value, 10);
  setActiveBtn(els.lbTimeGroup, btn.dataset.value);
  renderLeaderboard();
});

els.btnLbBack.addEventListener('click', () => {
  if (lbState.returnScreen === 'results') {
    applyGodTheme(state.operation, state.difficulty);
    showScreen('results');
  } else {
    showHome();
  }
});

// Name modal
els.btnSaveName.addEventListener('click', saveNameAndClose);
els.nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveNameAndClose();
});

// =================== INIT ===================

(function init() {
  els.ringFill.style.strokeDasharray = String(RING_CIRCUMFERENCE);
  els.ringFill.style.strokeDashoffset = '0';
  applyGodTheme(state.operation, state.difficulty);
  syncActiveButtons();
  updateHomeHighScore();

  function updateKeyboardState() {
    const kbOpen = !!(window.visualViewport &&
      window.visualViewport.height < window.innerHeight * 0.75);
    if (kbOpen !== document.body.classList.contains('keyboard-open')) {
      document.body.classList.toggle('keyboard-open', kbOpen);
    }
  }
  window.visualViewport?.addEventListener('resize', updateKeyboardState);
  updateKeyboardState();
})();
