/* Salão de Exames PAF*/
const BANK = window.PAF_QUESTION_BANK || [];

let currentExam = [];
let currentArea = 'socio';
let currentMode = 'serio';
let startTime = null;
let remainingSeconds = 0;
let timerInterval = null;
let lastResultText = '';
let revealedAnswers = new Set();
let issueReviewIndexes = [];
let issueCursor = -1;

const AREA_LABEL = {
  socio: 'Sociocultural exato + Inglês',
  mfc: 'Matemática + Física/Química',
  info: 'Informática teórica'
};

const TYPE_LABEL = {
  mc: 'Escolha múltipla',
  multi: 'Checkbox',
  short: 'Resposta curta',
  long: 'Resposta desenvolvida',
  number: 'Cálculo',
  code: 'Código'
};

const setupEl = document.getElementById('setup');
const examEl = document.getElementById('exam');
const resultsEl = document.getElementById('results');
const historyEl = document.getElementById('history');
const questionsForm = document.getElementById('questionsForm');
const timerEl = document.getElementById('timer');
const timerCard = document.getElementById('timerCard');
const timerProgress = document.getElementById('timerProgress');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');

const STOPWORDS = new Set([
  'a','o','os','as','um','uma','uns','umas','de','da','do','das','dos','e','ou','em','no','na','nos','nas','por','para','com','sem','que','se','ao','aos','à','às','esta','este','isto','isso','sao','são','ser','serve','como','quando','onde','mais','menos','entre','sobre','num','numa','neste','nesta','esse','essa','ele','ela','eles','elas','tambem','também','muito','pouco','sua','seu','suas','seus','tem','têm','ter','foi','e','é'
]);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function textToHtml(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function questionTitle(q, index) {
  const firstLine = String(q.prompt || q.topic || 'Pergunta').split('\n')[0].trim();
  return `${index + 1}. ${firstLine}`;
}

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordsOf(text) {
  const norm = normalizeText(text);
  if (!norm) return [];
  return norm.split(' ').filter(w => w && !STOPWORDS.has(w));
}

function simpleStem(word) {
  let w = normalizeText(word);
  if (w.length > 5 && w.endsWith('oes')) w = w.slice(0, -3);
  if (w.length > 5 && w.endsWith('ais')) w = w.slice(0, -3);
  if (w.length > 4 && w.endsWith('es')) w = w.slice(0, -2);
  if (w.length > 4 && w.endsWith('s')) w = w.slice(0, -1);
  return w;
}

function editDistance(a, b) {
  a = simpleStem(a);
  b = simpleStem(b);
  if (a === b) return 0;
  if (!a || !b) return Math.max(a.length, b.length);
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function wordMatches(termWord, userWords) {
  const t = simpleStem(termWord);
  if (!t) return true;
  return userWords.some(w => {
    const u = simpleStem(w);
    if (u === t) return true;
    if (t.length >= 5 && (u.includes(t) || t.includes(u))) return true;
    if (t.length >= 7 && editDistance(t, u) <= 2) return true;
    if (t.length >= 5 && editDistance(t, u) <= 1) return true;
    return false;
  });
}

function termMatched(userText, term) {
  const userNorm = normalizeText(userText);
  const termNorm = normalizeText(term);
  if (!termNorm) return false;
  if (userNorm.includes(termNorm)) return true;

  const userWords = wordsOf(userText);
  const termWords = wordsOf(term);
  if (!termWords.length) return false;

  if (termWords.length === 1) {
    return wordMatches(termWords[0], userWords);
  }

  const matched = termWords.filter(t => wordMatches(t, userWords)).length;
  return matched / termWords.length >= 0.66;
}

function keywordFound(userRaw, keyword) {
  return termMatched(userRaw, keyword);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getSelectedArea() {
  return document.querySelector('input[name="area"]:checked').value;
}

function getDurationMinutes() {
  const custom = Number(document.getElementById('customDuration').value);
  if (custom && custom >= 15) return custom;
  return Number(document.getElementById('duration').value);
}

function bankStats() {
  const stats = {
    total: BANK.length,
    socio: BANK.filter(q => q.area === 'socio').length,
    core: BANK.filter(q => q.area === 'socio' && q.core).length,
    mfc: BANK.filter(q => q.area === 'mfc').length,
    info: BANK.filter(q => q.area === 'info').length,
    modules: new Set(BANK.map(q => q.module)).size
  };

  document.getElementById('bankStats').innerHTML = `
    <div class="stat-card"><strong>${stats.total}</strong><span>perguntas focadas</span></div>
    <div class="stat-card"><strong>${stats.core}</strong><span>Sociocultural exatas</span></div>
    <div class="stat-card"><strong>${stats.socio}</strong><span>Sociocultural + Inglês</span></div>
    <div class="stat-card"><strong>${stats.mfc}</strong><span>Mat/FQ com gráficos/tabelas</span></div>
    <div class="stat-card"><strong>${stats.info}</strong><span>Informática matriz</span></div>
    <div class="stat-card"><strong>${stats.modules}</strong><span>módulos/tópicos</span></div>`;
}

function filterPool(area, mode, includeTraps) {
  let pool = BANK.filter(q => q.area === area);
  if (!includeTraps) pool = pool.filter(q => !q.trap && !(q.type === 'multi' && q.difficulty >= 4));
  if (mode === 'normal') return pool.filter(q => q.difficulty <= 4);
  if (mode === 'vinte') {
    const hard = pool.filter(q => q.difficulty >= 3 || ['number', 'long', 'multi', 'code'].includes(q.type));
    return hard.length > 30 ? hard : pool;
  }
  return pool;
}

function targetQuestionCount(minutes, mode, area) {
  const manual = document.getElementById('questionCountMode')?.value || 'auto';
  if (manual !== 'auto') return Number(manual);

  let count;
  if (area === 'socio') {
    count = mode === 'normal' ? Math.round(minutes * 0.26) : mode === 'vinte' ? Math.round(minutes * 0.46) : Math.round(minutes * 0.42);
  } else if (area === 'mfc') {
    count = mode === 'normal' ? Math.round(minutes * 0.20) : mode === 'vinte' ? Math.round(minutes * 0.34) : Math.round(minutes * 0.29);
  } else {
    count = mode === 'normal' ? Math.round(minutes * 0.24) : mode === 'vinte' ? Math.round(minutes * 0.38) : Math.round(minutes * 0.34);
  }

  let min = mode === 'normal' ? 14 : mode === 'vinte' ? 26 : 20;
  let max = minutes >= 180 ? 80 : mode === 'vinte' ? 56 : mode === 'serio' ? 48 : 34;
  if (area === 'socio' && mode !== 'normal') {
    min = Math.max(min, 40);
    max = Math.max(max, mode === 'vinte' ? 58 : 50);
  }
  return Math.max(min, Math.min(count, max));
}

function weightedRandomQuestion(list, mode) {
  if (!list.length) return null;
  const weights = list.map(q => {
    let w = 1;
    if (q.core) w += 2.4;
    if (mode === 'vinte') w += q.difficulty * 0.55;
    if (['number', 'long', 'multi', 'code'].includes(q.type)) w += 0.6;
    if (q.visual || q.extraHtml) w += 0.5;
    if (q.trap) w += mode === 'normal' ? 0.1 : 0.7;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

function cloneForExam(q) {
  const cloned = JSON.parse(JSON.stringify(q));
  if (cloned.options) cloned._choices = shuffleArray(cloned.options);
  return cloned;
}

function pushUnique(chosen, used, q) {
  if (q && !used.has(q.id)) {
    chosen.push(q);
    used.add(q.id);
    return true;
  }
  return false;
}

function buildSocioExam(pool, target, mode) {
  const chosen = [];
  const used = new Set();
  const core = shuffleArray(pool.filter(q => q.core));
  const english = pool.filter(q => q.module.startsWith('Inglês'));
  const variants = pool.filter(q => !q.core && !q.module.startsWith('Inglês'));

  let coreQuota = Math.min(core.length, Math.round(target * 0.68));
  if (target >= 40) coreQuota = Math.min(core.length, 33);
  if (mode !== 'normal' && target >= 33) coreQuota = Math.min(core.length, 33);
  for (const q of core.slice(0, coreQuota)) pushUnique(chosen, used, q);

  const englishQuota = Math.max(4, Math.round(target * 0.25));
  const engModules = [...new Set(english.map(q => q.module))];
  for (const module of shuffleArray(engModules)) {
    if (chosen.length >= target || chosen.filter(q => q.module.startsWith('Inglês')).length >= englishQuota) break;
    pushUnique(chosen, used, weightedRandomQuestion(english.filter(q => q.module === module && !used.has(q.id)), mode));
  }
  while (chosen.length < target && chosen.filter(q => q.module.startsWith('Inglês')).length < englishQuota) {
    if (!pushUnique(chosen, used, weightedRandomQuestion(english.filter(q => !used.has(q.id)), mode))) break;
  }
  while (chosen.length < target) {
    const rest = [...variants, ...english, ...core].filter(q => !used.has(q.id));
    if (!pushUnique(chosen, used, weightedRandomQuestion(rest, mode))) break;
  }
  return shuffleArray(chosen).map(cloneForExam);
}

function buildBalancedExam(pool, target, mode) {
  const chosen = [];
  const used = new Set();
  const byModule = new Map();
  for (const q of pool) {
    if (!byModule.has(q.module)) byModule.set(q.module, []);
    byModule.get(q.module).push(q);
  }

  const modules = shuffleArray([...byModule.keys()]);
  for (const module of modules) {
    if (chosen.length >= target) break;
    pushUnique(chosen, used, weightedRandomQuestion(byModule.get(module), mode));
  }

  while (chosen.length < target) {
    const counts = new Map();
    for (const q of chosen) counts.set(q.module, (counts.get(q.module) || 0) + 1);
    const candidates = shuffleArray(modules).sort((a, b) => (counts.get(a) || 0) - (counts.get(b) || 0));
    let added = false;
    for (const module of candidates) {
      const available = byModule.get(module).filter(q => !used.has(q.id));
      if (available.length && pushUnique(chosen, used, weightedRandomQuestion(available, mode))) {
        added = true;
        break;
      }
    }
    if (!added) break;
  }
  return shuffleArray(chosen).map(cloneForExam);
}

function buildExam(area, minutes, mode, includeTraps) {
  const pool = filterPool(area, mode, includeTraps);
  const target = Math.min(targetQuestionCount(minutes, mode, area), pool.length);
  if (area === 'socio') return buildSocioExam(pool, target, mode);
  return buildBalancedExam(pool, target, mode);
}

function renderExam() {
  revealedAnswers = new Set();
  questionsForm.innerHTML = '';
  const allowReveal = document.getElementById('showAnswersAllowed').checked;

  currentExam.forEach((q, index) => {
    const tpl = document.getElementById('questionTemplate').content.cloneNode(true);
    const card = tpl.querySelector('.question-card');
    card.dataset.id = q.id;
    tpl.querySelector('.module').textContent = q.module;
    tpl.querySelector('h3').textContent = questionTitle(q, index);
    tpl.querySelector('.badge').textContent = `${TYPE_LABEL[q.type]} · nível ${q.difficulty}${q.trap ? ' · rasteira' : ''}`;
    tpl.querySelector('.prompt').innerHTML = textToHtml(q.prompt);
    const extra = tpl.querySelector('.question-extra');
    extra.innerHTML = (q.visual || '') + (q.extraHtml || '') + (q.rounding ? `<p class="rounding"><strong>Arredondamento:</strong> ${escapeHtml(q.rounding)}</p>` : '');
    tpl.querySelector('.answer-zone').innerHTML = renderAnswerZone(q, allowReveal);
    questionsForm.appendChild(tpl);
  });

  updateProgress();
}

function correctOptionsText(q) {
  if (q._choices) return q._choices.filter(o => o.correct).map(o => o.text).join('; ');
  let ans = q.correctAnswer || 'Ver explicação.';
  if (q.type === 'number' && q.unit && !String(ans).includes(q.unit)) ans += ' ' + q.unit;
  return ans;
}

function renderStudyTools(q, allowReveal) {
  if (!allowReveal) return '';
  return `<div class="study-tools"><button type="button" class="ghost answer-toggle" data-answer-for="${q.id}">Ver resposta</button><div class="answer-reveal hidden" id="answer-${q.id}"><p><strong>Resposta esperada:</strong><br>${escapeHtml(correctOptionsText(q))}</p><p><strong>Explicação:</strong><br>${escapeHtml(q.explanation || 'Sem explicação adicional.')}</p></div></div>`;
}

function renderAnswerZone(q, allowReveal) {
  let html = '';
  if (q.type === 'mc') {
    html = q._choices.map((opt, i) => `<label class="option"><input type="radio" name="${q.id}" value="${i}"><span>${escapeHtml(opt.text)}</span></label>`).join('');
  } else if (q.type === 'multi') {
    html = `<p class="hint">Pode haver uma, várias ou só uma resposta correta. Lê com atenção.</p>` + q._choices.map((opt, i) => `<label class="option"><input type="checkbox" name="${q.id}" value="${i}"><span>${escapeHtml(opt.text)}</span></label>`).join('');
  } else if (q.type === 'number') {
    html = `<input type="text" inputmode="decimal" name="${q.id}" placeholder="Resultado${q.unit ? ' em ' + escapeHtml(q.unit) : ''}${q.rounding ? ' · ' + escapeHtml(q.rounding) : ''}">`;
  } else if (q.type === 'short') {
    html = `<input type="text" name="${q.id}" placeholder="Resposta curta">`;
  } else if (q.type === 'code') {
    html = `<textarea class="code-input" name="${q.id}" spellcheck="false" placeholder="Escreve o código ou fragmento pedido"></textarea>`;
  } else {
    html = `<textarea name="${q.id}" placeholder="Escreve a resposta desenvolvida"></textarea>`;
  }
  return html + renderStudyTools(q, allowReveal);
}

function getUserAnswer(q) {
  if (q.type === 'mc') {
    const selected = document.querySelector(`input[name="${q.id}"]:checked`);
    if (!selected) return null;
    const idx = Number(selected.value);
    return { index: idx, text: q._choices[idx].text };
  }
  if (q.type === 'multi') {
    return [...document.querySelectorAll(`input[name="${q.id}"]:checked`)].map(el => {
      const idx = Number(el.value);
      return { index: idx, text: q._choices[idx].text };
    });
  }
  const field = document.querySelector(`[name="${q.id}"]`);
  return field ? field.value.trim() : '';
}

function isAnswered(q, answer) {
  if (q.type === 'mc') return !!answer;
  if (q.type === 'multi') return Array.isArray(answer) && answer.length > 0;
  return String(answer || '').trim().length > 0;
}

function answerToText(q, answer) {
  if (answer === null || answer === undefined) return 'Sem resposta';
  if (q.type === 'mc') return answer.text || 'Sem resposta';
  if (q.type === 'multi') return answer.length ? answer.map(a => a.text).join('; ') : 'Sem resposta';
  return answer || 'Sem resposta';
}

function conceptScoreFromRubric(answer, rubric) {
  let totalWeight = 0;
  let earnedWeight = 0;
  const foundLabels = [];

  for (const item of rubric) {
    const weight = Number(item.weight || 1);
    totalWeight += weight;
    const terms = item.terms || [];
    if (terms.some(term => termMatched(answer, term))) {
      earnedWeight += weight;
      foundLabels.push(item.label || terms[0]);
    }
  }

  return {
    ratio: totalWeight ? earnedWeight / totalWeight : 0,
    found: foundLabels,
    total: rubric.length
  };
}

function tokenOverlapScore(answer, correctAnswer) {
  const correctWords = [...new Set(wordsOf(correctAnswer).filter(w => w.length >= 4))];
  if (!correctWords.length) return 0;
  const userWords = wordsOf(answer);
  const found = correctWords.filter(w => wordMatches(w, userWords)).length;
  return found / correctWords.length;
}

function scoreWrittenQuestion(q, answer, max) {
  if (!String(answer || '').trim()) {
    return { earned: 0, status: 'wrong', detail: 'Sem resposta escrita.' };
  }

  let ratio = 0;
  let detail = '';

  if (q.rubric && q.rubric.length) {
    const concept = conceptScoreFromRubric(answer, q.rubric);
    const overlap = tokenOverlapScore(answer, q.correctAnswer || '');
    ratio = Math.max(concept.ratio, overlap * 0.82);
    detail = `Correção por ideias principais. Ideias encontradas: ${concept.found.length}/${concept.total}${concept.found.length ? ' - ' + concept.found.join(', ') : ''}.`;
  } else {
    const keywords = q.keywords || [];
    if (!keywords.length) return { earned: max, status: 'correct', detail: 'Resposta registada.' };
    const found = keywords.filter(k => keywordFound(answer, k));
    ratio = Math.max(found.length / keywords.length, tokenOverlapScore(answer, q.correctAnswer || '') * 0.75);
    detail = `Ideias encontradas: ${found.length}/${keywords.length}.`;
  }

  const correctThreshold = q.area === 'socio' ? 0.62 : 0.72;
  const partialThreshold = q.area === 'socio' ? 0.26 : 0.34;

  if (ratio >= correctThreshold) {
    return { earned: max, status: 'correct', detail: `${detail} Resposta aceite como correta.` };
  }
  if (ratio >= partialThreshold) {
    const minCredit = q.area === 'socio' ? 0.45 : 0.35;
    const multiplier = q.area === 'socio' ? 0.98 : 0.9;
    const earned = max * Math.min(0.9, Math.max(minCredit, ratio * multiplier));
    return { earned, status: 'partial', detail: `${detail} Resposta parcialmente correta.` };
  }

  return { earned: 0, status: 'wrong', detail: `${detail} Resposta insuficiente.` };
}

function scoreQuestion(q) {
  const answer = getUserAnswer(q);
  const max = Number(q.weight || 1);
  const answered = isAnswered(q, answer);
  let earned = 0;
  let status = 'wrong';
  let detail = '';

  if (q.type === 'mc') {
    if (answer && q._choices[answer.index]?.correct) {
      earned = max;
      status = 'correct';
      detail = 'Resposta certa.';
    } else if (!answer) {
      detail = 'Sem resposta.';
    } else {
      detail = 'Escolha incorreta.';
    }
  } else if (q.type === 'multi') {
    const correctIdx = q._choices.map((o, i) => (o.correct ? i : null)).filter(i => i !== null).sort((a, b) => a - b);
    const selectedIdx = (answer || []).map(a => a.index).sort((a, b) => a - b);
    const exact = correctIdx.length === selectedIdx.length && correctIdx.every((v, i) => v === selectedIdx[i]);
    if (exact) {
      earned = max;
      status = 'correct';
      detail = 'Selecionaste exatamente as opções corretas.';
    } else if (!selectedIdx.length) {
      detail = 'Sem resposta.';
    } else {
      const tp = selectedIdx.filter(i => q._choices[i]?.correct).length;
      const fp = selectedIdx.filter(i => !q._choices[i]?.correct).length;
      const ratio = correctIdx.length ? Math.max(0, (tp - fp * 0.55) / correctIdx.length) : 0;
      if (ratio >= 0.5) {
        earned = max * Math.min(0.7, ratio);
        status = 'partial';
        detail = 'Tiveste parte das opções certas, mas falhou a seleção exata.';
      } else {
        detail = 'As opções assinaladas não correspondem às corretas.';
      }
    }
  } else if (q.type === 'number') {
    const raw = String(answer || '').replace(',', '.');
    const match = raw.match(/-?\d+(\.\d+)?/);
    if (match) {
      const value = Number(match[0]);
      const tolerance = Number(q.tolerance ?? 0.01);
      if (Math.abs(value - Number(q.numericAnswer)) <= tolerance) {
        earned = max;
        status = 'correct';
        detail = 'Resultado numérico correto.';
      } else {
        detail = `Resultado diferente do esperado. Diferença: ${Math.abs(value - Number(q.numericAnswer)).toFixed(3)}.`;
      }
    } else {
      detail = 'Não encontrei um número na resposta.';
    }
  } else {
    const written = scoreWrittenQuestion(q, answer, max);
    earned = written.earned;
    status = written.status;
    detail = written.detail;
  }

  return {
    q,
    answer,
    answered,
    answerText: answerToText(q, answer),
    earned,
    max,
    status,
    detail,
    revealed: revealedAnswers.has(q.id)
  };
}

function countAnswered() {
  let answered = 0;
  for (const q of currentExam) {
    if (isAnswered(q, getUserAnswer(q))) answered++;
  }
  return answered;
}

function updateProgress() {
  if (!currentExam.length) {
    progressText.textContent = '0/0 respondidas';
    timerProgress.textContent = '0/0 respondidas';
    progressFill.style.width = '0%';
    return;
  }
  const answered = countAnswered();
  const text = `${answered}/${currentExam.length} respondidas`;
  progressText.textContent = text;
  timerProgress.textContent = text;
  progressFill.style.width = `${Math.round((answered / currentExam.length) * 100)}%`;
}

function startTimer(minutes) {
  clearInterval(timerInterval);
  remainingSeconds = minutes * 60;
  timerEl.textContent = formatTime(remainingSeconds);
  timerCard.classList.remove('warning', 'danger');

  timerInterval = setInterval(() => {
    remainingSeconds--;
    timerEl.textContent = formatTime(Math.max(0, remainingSeconds));
    if (remainingSeconds <= 10 * 60) timerCard.classList.add('warning');
    if (remainingSeconds <= 3 * 60) timerCard.classList.add('danger');
    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      finishExam(true);
    }
  }, 1000);
}

function startExam() {
  currentArea = getSelectedArea();
  const minutes = getDurationMinutes();
  currentMode = document.getElementById('difficultyMode').value;
  const includeTraps = document.getElementById('includeTraps').checked;

  currentExam = buildExam(currentArea, minutes, currentMode, includeTraps);
  startTime = new Date();

  document.getElementById('examTitle').textContent = AREA_LABEL[currentArea];
  document.getElementById('examLabel').textContent = `Modo: ${currentMode === 'vinte' ? '20/20' : currentMode === 'serio' ? 'PAF sério' : 'Normal'}`;
  document.getElementById('examMeta').textContent = `${currentExam.length} perguntas · ${minutes} minutos · respostas baralhadas · cobertura equilibrada por módulos`;

  setupEl.classList.add('hidden');
  resultsEl.classList.add('hidden');
  historyEl.classList.add('hidden');
  examEl.classList.remove('hidden');
  document.body.classList.add('exam-running');

  renderExam();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  startTimer(minutes);
}

function unansweredCount() {
  return currentExam.filter(q => !isAnswered(q, getUserAnswer(q))).length;
}

function finishExam(auto = false) {
  if (!auto) {
    const unanswered = unansweredCount();
    if (unanswered > 0 && !confirm(`Ainda tens ${unanswered} perguntas sem resposta. Queres mesmo terminar?`)) return;
  }
  clearInterval(timerInterval);
  showResults(currentExam.map(scoreQuestion), auto);
}

function exitExam() {
  if (!confirm('Queres sair deste exame? As respostas deste exame não serão corrigidas nem guardadas.')) return;
  backToSetup();
}

function buildModuleStats(results) {
  const map = new Map();
  for (const r of results) {
    const key = r.q.module;
    if (!map.has(key)) map.set(key, { module: key, earned: 0, max: 0 });
    const row = map.get(key);
    row.earned += r.earned;
    row.max += r.max;
  }
  return [...map.values()]
    .map(m => ({ ...m, percent: m.max ? (m.earned / m.max) * 100 : 0 }))
    .sort((a, b) => a.percent - b.percent);
}

function issueNavigationHtml(count) {
  if (!count) {
    return `<div class="issue-nav"><strong>Revisão rápida:</strong> Não há respostas erradas/parciais respondidas para navegar. As perguntas sem resposta ficam listadas no relatório, mas não entram nas setas.</div>`;
  }
  return `<div class="issue-nav" id="issueNav">
    <strong>Rever falhas respondidas:</strong>
    <button class="secondary" type="button" onclick="jumpIssue(-1)">← Anterior errada/parcial</button>
    <button class="secondary" type="button" onclick="jumpIssue(1)">Próxima errada/parcial →</button>
    <button class="ghost" type="button" onclick="window.scrollTo({ top: 0, behavior: 'smooth' })">Voltar ao topo</button>
    <span id="issueCounter">0/${count}</span>
  </div>`;
}

function showResults(results, auto) {
  const total = results.reduce((s, r) => s + r.max, 0);
  const earned = results.reduce((s, r) => s + r.earned, 0);
  const grade = total ? (earned / total) * 20 : 0;
  const rounded = Math.round(grade * 10) / 10;
  const correct = results.filter(r => r.status === 'correct').length;
  const partial = results.filter(r => r.status === 'partial').length;
  const wrong = results.filter(r => r.status === 'wrong').length;
  const unanswered = results.filter(r => !r.answered).length;
  const revealed = results.filter(r => r.revealed).length;
  const elapsed = startTime ? Math.round((new Date() - startTime) / 1000) : 0;
  const moduleStats = buildModuleStats(results);
  const weakModules = moduleStats.filter(m => m.percent < 75).slice(0, 5);
  const gradeDeg = Math.round((rounded / 20) * 360);

  issueReviewIndexes = results
    .map((r, i) => ({ r, i }))
    .filter(x => x.r.answered && x.r.status !== 'correct')
    .map(x => x.i);
  issueCursor = -1;

  let message = rounded >= 18 ? 'Excelente. Agora treina sem ver respostas e com menos tempo.'
    : rounded >= 14 ? 'Bom, mas ainda há módulos para fechar.'
    : rounded >= 10 ? 'Passa, mas ainda não está seguro para nota máxima.'
    : 'Ainda está frágil. Revê teoria e faz treino por módulo.';

  resultsEl.style.setProperty('--gradeDeg', `${gradeDeg}deg`);
  resultsEl.innerHTML = `
    <div class="result-top">
      <div class="grade-circle"><div class="grade-inner"><div><strong>${rounded}</strong><span>/20</span></div></div></div>
      <div>
        <p class="eyebrow">Correção automática</p>
        <h2>${auto ? 'Tempo terminado' : 'Exame terminado'}</h2>
        <p>${message}</p>
        <div class="summary-grid">
          <div class="stat-card"><strong>${correct}</strong><span>certas</span></div>
          <div class="stat-card"><strong>${partial}</strong><span>parciais</span></div>
          <div class="stat-card"><strong>${wrong}</strong><span>erradas</span></div>
          <div class="stat-card"><strong>${unanswered}</strong><span>sem resposta</span></div>
          <div class="stat-card"><strong>${revealed}</strong><span>respostas vistas</span></div>
          <div class="stat-card"><strong>${formatTime(elapsed)}</strong><span>tempo usado</span></div>
        </div>
        <div class="actions">
          <button class="primary" onclick="restartSameArea()">Fazer outro exame</button>
          <button class="secondary" onclick="downloadResult()">Exportar resultado .txt</button>
          <button class="secondary" onclick="backToSetup()">Voltar ao início</button>
        </div>
      </div>
    </div>
    <div class="module-report"><h3>Relatório por módulo</h3>${moduleStats.map(m => `<div class="module-row"><span>${escapeHtml(m.module)}</span><strong>${m.percent.toFixed(0)}%</strong></div>`).join('')}</div>
    <div class="notice"><strong>O que melhorar:</strong> ${weakModules.length ? weakModules.map(m => escapeHtml(m.module)).join(', ') : 'mantém o treino e tenta repetir sem ver respostas.'}</div>
    ${issueNavigationHtml(issueReviewIndexes.length)}
    <div class="review-list">${results.map((r, i) => renderReviewCard(r, i)).join('')}</div>`;

  lastResultText = buildResultText(results, rounded, elapsed, moduleStats);
  saveHistory(rounded, results.length, elapsed, currentArea, moduleStats, revealed);
  examEl.classList.add('hidden');
  resultsEl.classList.remove('hidden');
  document.body.classList.remove('exam-running');
  updateIssueCounter();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderReviewCard(r, index) {
  const statusText = r.status === 'correct' ? 'Certa' : r.status === 'partial' ? 'Parcial' : 'Errada';
  const unansweredText = r.answered ? '' : ' · sem resposta';
  return `<article id="review-${index}" class="review-card ${r.status}" data-review-index="${index}">
    <p class="eyebrow">${escapeHtml(r.q.module)} · ${escapeHtml(TYPE_LABEL[r.q.type])}${r.revealed ? ' · resposta vista durante o exame' : ''}${unansweredText}</p>
    <h3>${escapeHtml(questionTitle(r.q, index))}</h3>
    <p><strong>Pergunta:</strong><br>${escapeHtml(r.q.prompt)}</p>
    <p><strong>A tua resposta:</strong></p>
    <div class="answer-box">${escapeHtml(r.answerText)}</div>
    <p><strong>Correção:</strong> ${statusText} (${r.earned.toFixed(2)}/${r.max.toFixed(2)} pontos)</p>
    <p><strong>Resposta correta/esperada:</strong></p>
    <div class="answer-box">${escapeHtml(correctOptionsText(r.q))}</div>
    <p><strong>Explicação:</strong> ${escapeHtml(r.q.explanation || r.detail)}</p>
    <p><em>${escapeHtml(r.detail)}</em></p>
  </article>`;
}

function updateIssueCounter() {
  const el = document.getElementById('issueCounter');
  if (!el) return;
  if (!issueReviewIndexes.length) {
    el.textContent = '0/0';
    return;
  }
  el.textContent = `${Math.max(0, issueCursor + 1)}/${issueReviewIndexes.length}`;
}

function jumpIssue(delta) {
  if (!issueReviewIndexes.length) return;
  issueCursor = (issueCursor + delta + issueReviewIndexes.length) % issueReviewIndexes.length;
  const reviewIndex = issueReviewIndexes[issueCursor];
  document.querySelectorAll('.review-card.issue-highlight').forEach(el => el.classList.remove('issue-highlight'));
  const card = document.getElementById(`review-${reviewIndex}`);
  if (card) {
    card.classList.add('issue-highlight');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  updateIssueCounter();
}

function buildResultText(results, grade, elapsed, moduleStats) {
  let txt = `SALÃO DE EXAMES PAF\nExame: ${AREA_LABEL[currentArea]}\nModo: ${currentMode}\nNota: ${grade}/20\nTempo usado: ${formatTime(elapsed)}\nRespostas vistas durante o exame: ${results.filter(r => r.revealed).length}\n\nRelatório por módulo:\n`;
  for (const m of moduleStats) txt += `- ${m.module}: ${m.percent.toFixed(0)}%\n`;
  txt += '\nCorreção pergunta a pergunta:\n';
  results.forEach((r, i) => {
    txt += `\n${i + 1}. [${r.status.toUpperCase()}] ${r.q.module} - ${r.q.prompt}\nPergunta: ${r.q.prompt}\nA tua resposta: ${r.answerText}\nResposta correta: ${correctOptionsText(r.q)}\nExplicação: ${r.q.explanation || r.detail}\n`;
  });
  return txt;
}

function saveHistory(grade, questionCount, elapsed, area, moduleStats, revealed) {
  const history = JSON.parse(localStorage.getItem('pafHistory') || '[]');
  history.unshift({
    date: new Date().toLocaleString('pt-PT'),
    grade,
    area: AREA_LABEL[area],
    questionCount,
    elapsed,
    revealed,
    weakest: moduleStats.slice(0, 3).map(m => `${m.module} (${m.percent.toFixed(0)}%)`)
  });
  localStorage.setItem('pafHistory', JSON.stringify(history.slice(0, 40)));
}

function showHistory() {
  const history = JSON.parse(localStorage.getItem('pafHistory') || '[]');
  historyEl.innerHTML = `<p class="eyebrow">Histórico local</p><h2>Os teus últimos exames</h2>${history.length ? history.map(h => `<div class="history-item"><strong>${escapeHtml(h.area)} · ${escapeHtml(h.date)}</strong><p>Nota: ${h.grade}/20 · Perguntas: ${h.questionCount} · Tempo: ${formatTime(h.elapsed)} · Respostas vistas: ${h.revealed || 0}</p><p>Módulos a rever: ${h.weakest.length ? h.weakest.map(escapeHtml).join(', ') : 'sem dados'}</p></div>`).join('') : '<p>Ainda não há exames guardados neste navegador.</p>'}<div class="actions"><button class="secondary" onclick="backToSetup()">Voltar</button><button class="danger" onclick="clearHistory()">Limpar histórico</button></div>`;
  setupEl.classList.add('hidden');
  resultsEl.classList.add('hidden');
  examEl.classList.add('hidden');
  document.body.classList.remove('exam-running');
  historyEl.classList.remove('hidden');
}

function clearHistory() {
  localStorage.removeItem('pafHistory');
  showHistory();
}

function downloadResult() {
  const blob = new Blob([lastResultText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resultado_paf_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function restartSameArea() {
  setupEl.classList.remove('hidden');
  resultsEl.classList.add('hidden');
  historyEl.classList.add('hidden');
  examEl.classList.add('hidden');
  document.querySelector(`input[name="area"][value="${currentArea}"]`).checked = true;
  startExam();
}

function backToSetup() {
  clearInterval(timerInterval);
  setupEl.classList.remove('hidden');
  resultsEl.classList.add('hidden');
  historyEl.classList.add('hidden');
  examEl.classList.add('hidden');
  document.body.classList.remove('exam-running');
  timerEl.textContent = '--:--:--';
  timerProgress.textContent = '0/0 respondidas';
  timerCard.classList.remove('warning', 'danger');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function init() {
  bankStats();
  document.getElementById('startBtn').addEventListener('click', startExam);
  document.getElementById('finishBtn').addEventListener('click', () => finishExam(false));
  document.getElementById('exitBtn').addEventListener('click', exitExam);
  document.getElementById('historyBtn').addEventListener('click', showHistory);
  document.getElementById('backToTopBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  questionsForm.addEventListener('input', updateProgress);
  questionsForm.addEventListener('change', updateProgress);
  questionsForm.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.answer-toggle');
    if (!btn) return;
    const id = btn.dataset.answerFor;
    const box = document.getElementById(`answer-${id}`);
    if (!box) return;
    box.classList.toggle('hidden');
    revealedAnswers.add(id);
    btn.textContent = box.classList.contains('hidden') ? 'Ver resposta' : 'Esconder resposta';
  });
}

init();
