/* Salão de Exames PAF */
const BANK = window.PAF_QUESTION_BANK || [];

let currentExam = [];
let currentArea = 'socio';
let currentMode = 'serio';
let currentAnswerMode = 'mixed';
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

const ANSWER_MODE_LABEL = {
  mixed: 'Misturado',
  click: 'Só clicar',
  written: 'Só por extenso'
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

function isNoTimeMode() {
  return Boolean(document.getElementById('noTimeMode')?.checked);
}

function getAnswerMode() {
  return document.getElementById('answerMode')?.value || 'mixed';
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

function targetQuestionCount(minutes, mode, area, answerMode = 'mixed') {
  const manual = document.getElementById('questionCountMode')?.value || 'auto';
  if (manual !== 'auto') return Number(manual);

  let count;
  if (area === 'socio') {
    count = mode === 'normal' ? Math.round(minutes * 0.32) : mode === 'vinte' ? Math.round(minutes * 0.52) : Math.round(minutes * 0.46);
  } else if (area === 'mfc') {
    count = mode === 'normal' ? Math.round(minutes * 0.22) : mode === 'vinte' ? Math.round(minutes * 0.36) : Math.round(minutes * 0.31);
  } else {
    count = mode === 'normal' ? Math.round(minutes * 0.26) : mode === 'vinte' ? Math.round(minutes * 0.40) : Math.round(minutes * 0.36);
  }

  let min = mode === 'normal' ? 16 : mode === 'vinte' ? 30 : 22;
  let max = minutes >= 180 ? 88 : mode === 'vinte' ? 62 : mode === 'serio' ? 54 : 38;

  // Sociocultural deve conseguir incluir as 33 perguntas reais + módulos de Inglês.
  if (area === 'socio') {
    min = Math.max(min, 40);
    max = Math.max(max, mode === 'vinte' ? 64 : 54);
  }

  // Matemática/FQ e Informática ficam com perguntas suficientes para tocar todos os módulos da matriz.
  if (area === 'mfc' && mode !== 'normal') min = Math.max(min, 24);
  if (area === 'info' && mode !== 'normal') min = Math.max(min, 30);

  if (answerMode === 'click') {
    count = Math.round(count * 1.30);
    min += mode === 'normal' ? 3 : 6;
    max += minutes >= 180 ? 22 : 14;
  } else if (answerMode === 'written') {
    count = area === 'socio' ? Math.round(count * 0.95) : Math.round(count * 0.76);
    if (area !== 'socio') {
      min = Math.max(area === 'info' ? 22 : 14, Math.round(min * 0.78));
      max = Math.max(22, Math.round(max * 0.80));
    }
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
  if (cloned.options) {
    normalizeChoiceOptions(cloned);
    cloned._choices = shuffleArray(cloned.options);
  }
  return cloned;
}

function promptLooksLikeChoice(prompt) {
  const p = String(prompt || '');
  return /\b(assinala|assinale|seleciona|selecione|escolhe|escolha)\b/i.test(p)
    || /\bindica\s+uma\s+op[cç][aã]o/i.test(p)
    || /\bqual\s+das\s+seguintes\s+op[cç][oõ]es/i.test(p);
}

function shouldRenderAsChoice(q) {
  if (!q || q.options || q._choices) return false;
  if (!['short', 'long'].includes(q.type)) return false;
  return promptLooksLikeChoice(q.prompt);
}

function stripHtmlText(value) {
  const div = document.createElement('div');
  div.innerHTML = String(value ?? '');
  return div.textContent || div.innerText || '';
}

function shortAnswerText(value, max = 190) {
  let text = stripHtmlText(String(value ?? ''))
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 'Ver explicação.';
  if (text.length <= max) return text;
  const sentence = text.split(/(?<=[.!?])\s+/)[0];
  if (sentence && sentence.length <= max) return sentence;
  return text.slice(0, max - 1).trim() + '…';
}

function correctTextForQuestion(q) {
  if (q._choices && (q.type === 'mc' || q.type === 'multi')) {
    const correct = q._choices.filter(o => o.correct).map(o => o.text).join('; ');
    if (correct) return correct;
  }
  if (q.options && (q.type === 'mc' || q.type === 'multi')) {
    const correct = q.options.filter(o => o.correct).map(o => o.text).join('; ');
    if (correct) return correct;
  }
  let ans = q.correctAnswer || '';
  if (q.type === 'number' && q.numericAnswer !== undefined) {
    ans = q.correctAnswer || String(q.numericAnswer);
    if (q.unit && !String(ans).includes(q.unit)) ans += ' ' + q.unit;
  }
  return ans || 'Ver explicação.';
}

function buildKeywordsFromText(text) {
  return [...new Set(wordsOf(text).filter(w => w.length >= 4))].slice(0, 8);
}

function formatNumberChoice(value, q) {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  let decimals = 0;
  if (q.rounding && /cent[eé]simas/i.test(q.rounding)) decimals = 2;
  else if (q.rounding && /d[eé]cimas/i.test(q.rounding)) decimals = 1;
  else if (Math.abs(num - Math.round(num)) > 0.0001) decimals = 2;
  let text = num.toFixed(decimals).replace('.', ',');
  if (q.unit) text += ' ' + q.unit;
  return text;
}

function numericClickOptions(q) {
  const base = Number(q.numericAnswer);
  if (!Number.isFinite(base)) return null;
  const candidates = [base];
  const abs = Math.abs(base) || 1;
  const offsets = [1, -1, 2, -2, abs * 0.5, -abs * 0.5, abs, -abs, base === 0 ? 5 : 0];
  for (const off of offsets) {
    const v = base + off;
    if (Number.isFinite(v)) candidates.push(v);
  }
  if (base !== 0) candidates.push(-base, base * 2, base / 2);
  const texts = [];
  for (const c of candidates) {
    const t = formatNumberChoice(c, q);
    if (!texts.some(x => normalizeText(x) === normalizeText(t))) texts.push(t);
    if (texts.length >= 6) break;
  }
  const correct = formatNumberChoice(base, q);
  const wrong = texts.filter(t => normalizeText(t) !== normalizeText(correct)).slice(0, 3);
  while (wrong.length < 3) wrong.push(`${wrong.length + 1}${q.unit ? ' ' + q.unit : ''}`);
  return shuffleArray([{ text: correct, correct: true }, ...wrong.map(text => ({ text, correct: false }))]);
}

const CURATED_DISTRACTORS = {
  'A Literatura do Nosso Tempo': [
    'Comparação entre dois elementos usando uma palavra comparativa.',
    'Personificação, quando se atribuem características humanas a seres ou objetos.',
    'Hipérbole, quando se exagera uma ideia para dar expressividade.',
    'Narrador não participante, que conta a ação na 3.ª pessoa.',
    'Texto poético, escrito em verso, com ritmo, rima e expressividade.',
    'Texto narrativo, feito para contar uma história com narrador, ação, tempo e espaço.',
    'Texto dramático, escrito para ser representado em palco por atores.',
    'Rima interpolada, quando o esquema apresenta uma organização do tipo ABBA.'
  ],
  'Diversidade Linguística Cultural': [
    'CPLP: Comunidade dos Países de Língua Portuguesa.',
    'PALOP: Países Africanos de Língua Oficial Portuguesa.',
    'Língua materna: primeira língua aprendida em casa ou na família.',
    'Língua oficial: língua usada pelo Estado, escola e documentos oficiais.',
    'Dialeto: variedade regional ou social de uma língua.',
    'Variedade do português: forma como o português varia conforme a região ou comunidade.'
  ],
  'Culturas Etnias e Diversidades': [
    'Cultura: conjunto de valores, tradições, normas, costumes e conhecimentos de um grupo.',
    'Etnia: comunidade humana com afinidades culturais, linguísticas e sociais.',
    'Xenofobia: rejeição ou hostilidade contra pessoas estrangeiras ou consideradas de fora.',
    'Racismo: discriminação baseada na cor da pele, origem étnica ou características físicas.',
    'Preconceito: opinião negativa formada antes de conhecer verdadeiramente uma pessoa ou grupo.',
    'Discriminação: tratamento desigual ou injusto dado a uma pessoa ou grupo.'
  ],
  'Portugal e a sua História': [
    'Revolução Industrial: transformações ligadas a máquinas, fábricas e novas formas de produção.',
    'Ilhas do Porto: bairros operários associados ao crescimento industrial.',
    'Arquitetura do século XIX: uso de ferro, vidro e cimento.',
    'Salazar: figura associada ao Estado Novo e à sua chegada ao poder após 1928.',
    'Industrialização: processo de crescimento das fábricas e da produção mecanizada.'
  ],
  'Uma nova ordem económica mundial': [
    'Guerra Fria: tensão entre EUA e URSS e divisão do mundo em blocos.',
    'Queda do Muro de Berlim: símbolo do fim da Guerra Fria.',
    'Globalização: aumento das ligações entre países, economias, culturas e pessoas.',
    'Cidadania: participação responsável na sociedade, com direitos e deveres.',
    'Bloco capitalista: conjunto de países alinhados com a economia de mercado.'
  ],
  'Portugal e a Europa': [
    'Constituição: lei fundamental que organiza o Estado e os direitos dos cidadãos.',
    'Órgãos de soberania: Presidente da República, Assembleia, Governo e Tribunais.',
    'Adesão à CEE: entrada de Portugal na comunidade europeia em conjunto com Espanha.',
    'Assembleia da República: órgão legislativo português.',
    'Tribunais: órgão de soberania responsável pela justiça.'
  ],
  'Ler a Imprensa Escrita': [
    'Notícia: texto informativo sobre um facto recente de interesse público.',
    'Reportagem: texto jornalístico mais desenvolvido e aprofundado.',
    'Entrevista: género jornalístico organizado por perguntas e respostas.',
    'Pirâmide invertida: técnica que coloca a informação mais importante no início.',
    'Editorial: texto de opinião que apresenta a posição de um órgão de comunicação.'
  ],
  'Mudanças Profissionais e Mercado de Trabalho': [
    'Trabalho: esforço físico ou intelectual para produzir bens ou serviços.',
    'Emprego: atividade profissional remunerada.',
    'Mercado de trabalho: relação entre quem oferece e quem procura trabalho.',
    'População ativa: pessoas empregadas ou disponíveis para trabalhar.',
    'População desempregada: pessoas sem emprego, disponíveis e à procura de trabalho.',
    'Empregabilidade: capacidade de conseguir, manter ou mudar de emprego.'
  ],
  'O Homem e o Ambiente': [
    'Sustentabilidade: satisfazer necessidades atuais sem comprometer gerações futuras.',
    'Pilar ambiental: proteção dos recursos naturais e do ambiente.',
    'Pilar social: bem-estar, justiça social e qualidade de vida.',
    'Pilar económico: desenvolvimento equilibrado e uso responsável dos recursos.',
    'Consumo responsável: uso consciente dos recursos para evitar desperdício.'
  ],
  'Promoção da Saúde': [
    'Promoção da saúde: aumentar a capacidade de pessoas e comunidades melhorarem a saúde.',
    'Roda dos Alimentos: guia para uma alimentação equilibrada e variada.',
    'Planeamento familiar: informação e cuidados para decidir sobre filhos e prevenir riscos.',
    'Preservativo: método que protege contra infeções sexualmente transmissíveis.',
    'IST: infeção de transmissão sexual que deve ser prevenida.'
  ],
  'Higiene e prevenção no trabalho': [
    'Perigo: fonte, situação ou ato com potencial para causar dano.',
    'Risco: probabilidade de ocorrer uma situação indesejada com determinada gravidade.',
    'Dano: consequência negativa, como lesão, ferimento ou prejuízo para a saúde.',
    'Prevenção: medidas usadas para evitar acidentes e doenças profissionais.',
    'EPI: equipamento de proteção individual usado para reduzir riscos.'
  ],
  'Arquitetura interna do computador': [
    'CPU: componente que executa instruções e processa dados.',
    'RAM: memória temporária, rápida e volátil.',
    'ROM: memória permanente com instruções básicas.',
    'Cache: memória rápida que guarda dados usados com frequência.',
    'ULA/ALU: unidade que realiza operações aritméticas e lógicas.',
    'Unidade de controlo: coordena o funcionamento do processador.',
    'Motherboard: placa principal onde se ligam os componentes.',
    'Disco SSD/HDD: armazenamento permanente de dados.'
  ],
  'Processador de texto': [
    'Cabeçalho: zona superior repetida nas páginas de um documento.',
    'Rodapé: zona inferior repetida nas páginas de um documento.',
    'Nota de rodapé: explicação ou referência colocada no fundo da página.',
    'Texto em colunas: organização do texto em duas ou mais colunas.',
    'Tabela: estrutura com linhas e colunas para organizar informação.',
    'Formatação de texto: alteração de tipo de letra, tamanho, estilo e alinhamento.'
  ],
  'Folha de cálculo': [
    'Célula: interseção entre uma linha e uma coluna.',
    'Fórmula: expressão que começa por = e calcula um resultado.',
    'Função SOMA: soma valores de um intervalo.',
    'Função MÉDIA: calcula a média dos valores selecionados.',
    'Filtro: mostra apenas dados que cumprem determinada condição.',
    'Formatação condicional: altera o aspeto das células conforme regras.',
    'Tabela dinâmica: resume e organiza grandes quantidades de dados.',
    'Gráfico dinâmico: representa visualmente dados de uma tabela dinâmica.'
  ],
  'Conexões de rede / Rede local': [
    'LAN: rede local, como uma rede de casa, escola ou empresa.',
    'WAN: rede de grande área, como a Internet.',
    'WLAN: rede local sem fios baseada em Wi-Fi.',
    'Switch: liga vários dispositivos numa rede local.',
    'Router: liga redes diferentes e encaminha tráfego.',
    'Access Point: permite acesso à rede sem fios.',
    'Firewall: filtra tráfego e ajuda a proteger a rede.',
    'DHCP: atribui endereços IP automaticamente.',
    'DNS: traduz nomes de domínio em endereços IP.',
    'Cliente/servidor: modelo em que clientes pedem serviços a servidores.',
    'Ponto-a-ponto: rede onde computadores partilham recursos diretamente.',
    'Fibra ótica: meio físico que transmite dados através de luz.'
  ],
  'Programação em C/C++': [
    'Algoritmo: sequência de passos lógicos para resolver um problema.',
    'Variável: espaço de memória usado para guardar valores.',
    'Função: bloco de código criado para executar uma tarefa.',
    'Protótipo: declaração antecipada de uma função em C.',
    'scanf: instrução usada para ler dados do utilizador.',
    'printf: instrução usada para mostrar dados no ecrã.'
  ],
  'Programação em JAVA': [
    'Classe: molde/modelo usado para criar objetos.',
    'Objeto: instância concreta de uma classe.',
    'Atributo: característica guardada num objeto.',
    'Método: ação ou comportamento de uma classe.',
    'Construtor: método especial usado para criar e inicializar objetos.',
    'JFrame: janela principal numa aplicação gráfica Swing.',
    'JButton: botão usado numa interface gráfica.',
    'ActionListener: código executado quando ocorre um evento.'
  ],
  'Criação de páginas Web em hipertexto': [
    'HTML: linguagem usada para estruturar páginas web.',
    'CSS: linguagem usada para formatar a apresentação de páginas web.',
    'h1: título principal de uma página ou secção.',
    'p: parágrafo de texto.',
    'img: elemento usado para inserir uma imagem.',
    'a: elemento usado para criar uma hiperligação.',
    'table: elemento usado para criar tabelas.'
  ],
  'Scripts CGI e folhas de estilo': [
    'Formulário: conjunto de campos usados para recolher dados do utilizador.',
    'GET: método que envia dados pela URL.',
    'POST: método que envia dados no corpo do pedido.',
    'MySQL: sistema de gestão de bases de dados.',
    'SELECT: comando usado para consultar dados.',
    'INSERT: comando usado para inserir dados.',
    'UPDATE: comando usado para atualizar dados.',
    'WHERE: cláusula usada para filtrar registos.'
  ],
  'Inglês - Daily routine / Simple Present': [
    'wake up significa acordar.',
    'get up significa levantar-se.',
    'have breakfast significa tomar o pequeno-almoço.',
    'go to school significa ir para a escola.',
    'Simple Present é usado para hábitos, rotinas e factos gerais.',
    'Na 3.ª pessoa do singular, acrescenta-se normalmente -s ao verbo.',
    'A negativa usa do not/don’t ou does not/doesn’t.',
    'A interrogativa usa Do ou Does antes do sujeito.'
  ],
  'Inglês - If-clauses': [
    'Zero conditional: If + present simple, present simple.',
    'First conditional: If + present simple, will + verbo.',
    'Second conditional: If + past simple, would + verbo.',
    'Zero conditional é usado para verdades gerais.',
    'First conditional é usado para situações reais ou prováveis no futuro.',
    'Second conditional é usado para hipóteses imaginárias ou pouco prováveis.'
  ],
  'Inglês - Viajar na Europa / Graus dos adjetivos': [
    'Comparative compara duas coisas.',
    'Superlative indica o grau máximo dentro de um grupo.',
    'Adjetivos curtos formam o comparative com -er.',
    'Adjetivos longos formam o comparative com more.',
    'Good tem formas irregulares: better e the best.',
    'Bad tem formas irregulares: worse e the worst.'
  ],
  'Inglês - Profissão / Passive Voice': [
    'job significa emprego.',
    'salary significa salário.',
    'interview significa entrevista.',
    'employer significa empregador.',
    'employee significa empregado/trabalhador.',
    'Passive voice usa o verbo to be + particípio passado.',
    'Na passiva, o foco está na ação ou no objeto, não em quem pratica a ação.'
  ],
  'Inglês - Word order': [
    'A ordem normal é Subject + Verb + Object + Place + Time.',
    'Subject é quem pratica a ação.',
    'Verb é a ação da frase.',
    'Object é aquilo que recebe a ação.',
    'Place normalmente aparece antes do time.',
    'Nas perguntas, usa-se normalmente um auxiliar antes do sujeito.'
  ],
  'Movimentos e Forças': [
    'Aceleração: variação da velocidade por unidade de tempo.',
    'Movimento uniforme: velocidade constante e aceleração nula.',
    'Movimento acelerado: o módulo da velocidade aumenta.',
    'Movimento retardado: o módulo da velocidade diminui.',
    'Num gráfico v=f(t), a aceleração corresponde ao declive.',
    'a = Δv / Δt é a fórmula da aceleração média.'
  ],
  'Movimentos Ondulatórios': [
    'Amplitude: afastamento máximo relativamente à posição de equilíbrio.',
    'Comprimento de onda: distância entre dois pontos equivalentes consecutivos.',
    'Período: tempo de uma oscilação completa.',
    'Frequência: número de oscilações por segundo.',
    'v = λ × f relaciona velocidade, comprimento de onda e frequência.',
    'Som é uma onda mecânica que precisa de meio material.'
  ],
  'Compostos Orgânicos / Hidrocarbonetos': [
    'Hidrocarboneto: composto formado apenas por carbono e hidrogénio.',
    'Alcano: hidrocarboneto com ligações simples.',
    'Alceno: hidrocarboneto com pelo menos uma ligação dupla.',
    'Alcino: hidrocarboneto com pelo menos uma ligação tripla.',
    'Met- indica 1 carbono; et- indica 2 carbonos; prop- indica 3 carbonos.',
    '-ano indica ligação simples, -eno ligação dupla e -ino ligação tripla.'
  ],
  'Organização, análise da informação e probabilidades': [
    'Média: soma dos valores dividida pelo número de valores.',
    'Mediana: valor central depois de ordenar os dados.',
    'Moda: valor que aparece mais vezes.',
    'Lei de Laplace: casos favoráveis divididos pelos casos possíveis.',
    'Probabilidade em percentagem: multiplicar a fração por 100.',
    'Amostra: conjunto de dados observados.'
  ],
  'Operações Numéricas e Estimação': [
    'Na multiplicação de potências com a mesma base, somam-se os expoentes.',
    'Na divisão de potências com a mesma base, subtraem-se os expoentes.',
    'Potência de potência: multiplicam-se os expoentes.',
    'Expoente zero: qualquer base não nula elevada a zero dá 1.',
    'Expoente negativo transforma-se no inverso da potência.',
    'Notação científica escreve números na forma a × 10^n, com 1 ≤ a < 10.'
  ],
  'Funções, Limites e Cálculo Diferencial': [
    'Domínio: conjunto de valores possíveis de x.',
    'Contradomínio: conjunto de valores possíveis de saída.',
    'Zero da função: valor de x para o qual f(x)=0.',
    'Máximo: valor mais alto atingido pela função.',
    'Mínimo: valor mais baixo atingido pela função.',
    'Discriminante: Δ = b² - 4ac numa equação do 2.º grau.',
    'Concavidade voltada para cima quando o coeficiente a é positivo.',
    'Concavidade voltada para baixo quando o coeficiente a é negativo.'
  ]
};


function moduleDistractorList(q) {
  if (CURATED_DISTRACTORS[q.module]) return CURATED_DISTRACTORS[q.module];
  const module = String(q.module || '');
  if (module.startsWith('Inglês - Daily')) return CURATED_DISTRACTORS['Inglês - Daily routine / Simple Present'];
  if (module.startsWith('Inglês - If')) return CURATED_DISTRACTORS['Inglês - If-clauses'];
  if (module.includes('Graus')) return CURATED_DISTRACTORS['Inglês - Viajar na Europa / Graus dos adjetivos'];
  if (module.includes('Passive') || module.includes('Profissão')) return CURATED_DISTRACTORS['Inglês - Profissão / Passive Voice'];
  if (module.includes('Word order')) return CURATED_DISTRACTORS['Inglês - Word order'];
  return [
    'Conceito próximo do mesmo módulo, mas aplicado ao elemento errado.',
    'Definição parcialmente relacionada, mas não corresponde ao conceito pedido.',
    'Função semelhante, mas que pertence a outro elemento do mesmo tema.',
    'Descrição plausível dentro do módulo, mas não identifica corretamente a resposta.'
  ];
}

function hasAny(value, terms) {
  const n = normalizeText(value);
  return terms.some(term => {
    const t = normalizeText(term);
    if (!t) return false;
    if (/^[a-z0-9]{1,4}$/.test(t)) {
      const pattern = new RegExp(`(^|\\s|/|-)${t}(\\s|$|/|-)`);
      return pattern.test(n);
    }
    return n.includes(t);
  });
}

function topicText(q, correct = '') {
  return `${q.module || ''} ${q.topic || ''} ${q.prompt || ''} ${correct || ''}`;
}

function topicSpecificDistractors(q, correct) {
  const text = topicText(q, correct);
  const module = String(q.module || '');

  if (module === 'Arquitetura interna do computador') {
    if (hasAny(text, ['ram', 'memória ram'])) return [
      'permanente e não volátil, usada para instruções básicas do sistema.',
      'armazenamento permanente de ficheiros e programas mesmo sem energia.',
      'memória muito rápida e pequena usada para dados frequentes do processador.',
      'registos internos muito rápidos usados pela CPU durante a execução.'
    ];
    if (hasAny(text, ['rom', 'memória rom'])) return [
      'temporária, rápida e volátil; perde dados quando o computador desliga.',
      'armazenamento permanente de ficheiros, programas e documentos.',
      'memória pequena e muito rápida usada para acelerar acessos do processador.',
      'memória interna da CPU usada apenas durante operações imediatas.'
    ];
    if (hasAny(text, ['cache'])) return [
      'memória temporária principal onde são carregados programas em execução.',
      'memória permanente com instruções básicas de arranque.',
      'armazenamento permanente de ficheiros e programas.',
      'placa principal que liga fisicamente os componentes.'
    ];
    if (hasAny(text, ['ula', 'alu', 'lógica', 'aritmética'])) return [
      'coordena a execução das instruções dentro do processador.',
      'guarda temporariamente dados usados com frequência pelo processador.',
      'armazena dados, programas e ficheiros de forma permanente.',
      'liga fisicamente os componentes principais do computador.'
    ];
    if (hasAny(text, ['unidade de controlo', 'controlo'])) return [
      'realiza operações aritméticas e lógicas.',
      'guarda dados usados com frequência para acelerar o processador.',
      'armazena programas e ficheiros permanentemente.',
      'fornece energia elétrica aos componentes internos.'
    ];
    if (hasAny(text, ['cpu', 'processador'])) return [
      'memória temporária e volátil onde correm programas.',
      'memória permanente com instruções básicas do sistema.',
      'placa principal onde se ligam os componentes.',
      'armazenamento permanente de dados e ficheiros.'
    ];
    if (hasAny(text, ['motherboard', 'placa principal'])) return [
      'processador que executa instruções e processa dados.',
      'memória temporária onde são carregados programas.',
      'disco que armazena ficheiros de forma permanente.',
      'unidade que realiza operações aritméticas e lógicas.'
    ];
    if (hasAny(text, ['disco', 'ssd', 'hdd', 'armazenamento'])) return [
      'memória temporária e volátil usada durante a execução dos programas.',
      'memória permanente com instruções básicas de arranque.',
      'unidade de processamento que executa instruções.',
      'memória rápida que acelera o acesso a dados frequentes.'
    ];
    if (hasAny(text, ['periférico', 'entrada', 'saída'])) return [
      'dispositivo usado apenas para introduzir dados no computador.',
      'dispositivo usado apenas para apresentar informação ao utilizador.',
      'dispositivo que pode enviar e receber dados.',
      'componente interno responsável pelo processamento central.'
    ];
  }

  if (module === 'Processador de texto') {
    if (hasAny(text, ['cabeçalho', 'cabecalho'])) return [
      'zona inferior da página repetida em várias páginas.',
      'explicação ou referência colocada no fundo da página.',
      'divisão do texto em duas ou mais colunas verticais.',
      'estrutura com linhas e colunas para organizar informação.'
    ];
    if (hasAny(text, ['rodapé', 'rodape'])) return [
      'zona superior da página repetida em várias páginas.',
      'nota explicativa colocada no fundo da página.',
      'divisão do texto em colunas verticais.',
      'conjunto de células organizado em linhas e colunas.'
    ];
    if (hasAny(text, ['nota de rodapé', 'notas de rodapé', 'nota de rodape'])) return [
      'zona inferior repetida automaticamente nas páginas.',
      'zona superior repetida automaticamente nas páginas.',
      'organização do texto em duas ou mais colunas.',
      'alteração do tipo de letra, tamanho e alinhamento.'
    ];
    if (hasAny(text, ['colunas'])) return [
      'informação repetida no topo da página.',
      'informação repetida no fundo da página.',
      'referência explicativa colocada no fundo da página.',
      'estrutura com linhas e células para organizar dados.'
    ];
    if (hasAny(text, ['tabela'])) return [
      'texto dividido em duas ou mais colunas verticais.',
      'zona superior repetida em todas as páginas.',
      'explicação colocada no fundo da página.',
      'alteração de tipo de letra, tamanho e alinhamento.'
    ];
    if (hasAny(text, ['formatação', 'formatar'])) return [
      'inserção de uma nota explicativa no fundo da página.',
      'divisão do texto em colunas verticais.',
      'repetição de informação no cabeçalho ou rodapé.',
      'organização de informação em linhas e colunas.'
    ];
  }

  if (module === 'Folha de cálculo') {
    if (hasAny(text, ['filtro'])) return [
      'aplica automaticamente cores/formatos quando uma regra é cumprida.',
      'resume e agrupa muitos dados por categorias.',
      'representa visualmente dados resumidos de uma tabela dinâmica.',
      'testa uma condição e devolve um resultado se for verdadeira e outro se for falsa.'
    ];
    if (hasAny(text, ['formatação condicional', 'formatacao condicional'])) return [
      'mostra apenas linhas que cumprem uma condição, sem apagar dados.',
      'resume dados por categorias numa tabela dinâmica.',
      'representa visualmente dados de uma tabela dinâmica.',
      'calcula automaticamente a média de um intervalo.'
    ];
    if (hasAny(text, ['tabela dinâmica', 'tabela dinamica'])) return [
      'mostra apenas alguns registos conforme uma condição.',
      'aplica formatos automáticos às células conforme regras.',
      'representa visualmente os dados num gráfico ligado ao resumo.',
      'testa uma condição e devolve dois resultados possíveis.'
    ];
    if (hasAny(text, ['gráfico dinâmico', 'grafico dinamico'])) return [
      'resume e organiza dados por categorias numa tabela.',
      'mostra apenas as linhas que cumprem uma condição.',
      'altera o aspeto das células com base numa regra.',
      'é uma expressão que começa por = e calcula valores.'
    ];
    if (hasAny(text, ['função se', 'funcao se'])) return [
      'soma os valores de um intervalo.',
      'calcula a média dos valores selecionados.',
      'mostra apenas dados que cumprem uma condição.',
      'altera automaticamente o aspeto das células conforme uma regra.'
    ];
    if (hasAny(text, ['soma'])) return [
      'calcula a média aritmética dos valores.',
      'devolve o maior valor do intervalo.',
      'devolve o menor valor do intervalo.',
      'conta os valores que cumprem uma condição.'
    ];
    if (hasAny(text, ['média', 'media'])) return [
      'soma os valores sem dividir pela quantidade.',
      'devolve o maior valor de um intervalo.',
      'devolve o menor valor de um intervalo.',
      'conta quantas células têm números.'
    ];
    if (hasAny(text, ['célula', 'celula'])) return [
      'conjunto de células selecionadas, como A1:A10.',
      'linha horizontal identificada por números.',
      'coluna vertical identificada por letras.',
      'expressão que começa por = para calcular resultados.'
    ];
    if (hasAny(text, ['fórmula', 'formula'])) return [
      'regra visual aplicada às células quando há uma condição.',
      'comando para mostrar apenas dados selecionados.',
      'resumo automático de dados por categorias.',
      'representação visual de dados numa folha.'
    ];
  }

  if (module === 'Conexões de rede / Rede local') {
    if (hasAny(text, ['lan'])) return [
      'rede de grande área, como a Internet.',
      'rede metropolitana que cobre uma cidade.',
      'rede local sem fios baseada em Wi-Fi.',
      'rede pessoal de curto alcance entre dispositivos próximos.'
    ];
    if (hasAny(text, ['wan'])) return [
      'rede local de casa, escola ou empresa.',
      'rede metropolitana dentro de uma cidade.',
      'rede local sem fios baseada em Wi-Fi.',
      'rede pessoal de curto alcance.'
    ];
    if (hasAny(text, ['wlan'])) return [
      'rede local apenas cablada dentro de um edifício.',
      'rede de grande área, como a Internet.',
      'rede metropolitana de uma cidade.',
      'rede ponto-a-ponto sem servidor central.'
    ];
    if (hasAny(text, ['man'])) return [
      'rede local dentro de casa, escola ou empresa.',
      'rede de grande área, como a Internet.',
      'rede local sem fios baseada em Wi-Fi.',
      'rede pessoal de curto alcance.'
    ];
    if (hasAny(text, ['switch'])) return [
      'liga redes diferentes e encaminha tráfego para fora da LAN.',
      'atribui endereços IP automaticamente aos dispositivos.',
      'traduz nomes de domínio em endereços IP.',
      'filtra tráfego para proteger a rede.'
    ];
    if (hasAny(text, ['router'])) return [
      'liga vários dispositivos apenas dentro da mesma rede local.',
      'permite acesso Wi-Fi à rede sem fios.',
      'atribui endereços IP automaticamente.',
      'traduz nomes de domínio em endereços IP.'
    ];
    if (hasAny(text, ['access point', 'ponto de acesso'])) return [
      'liga redes diferentes e encaminha tráfego para a Internet.',
      'liga vários dispositivos por cabo dentro da LAN.',
      'atribui IPs automaticamente aos dispositivos.',
      'filtra tráfego e bloqueia acessos perigosos.'
    ];
    if (hasAny(text, ['firewall'])) return [
      'atribui endereços IP automaticamente.',
      'traduz nomes de domínio em endereços IP.',
      'liga dispositivos por cabo dentro de uma LAN.',
      'permite acesso sem fios à rede.'
    ];
    if (hasAny(text, ['dhcp'])) return [
      'traduz nomes de domínio em endereços IP.',
      'filtra tráfego para proteger a rede.',
      'liga vários dispositivos numa rede local.',
      'partilha ficheiros com utilizadores da rede.'
    ];
    if (hasAny(text, ['dns'])) return [
      'atribui endereços IP automaticamente aos dispositivos.',
      'filtra tráfego para proteger a rede.',
      'liga vários dispositivos por cabo numa LAN.',
      'partilha impressoras e ficheiros na rede.'
    ];
    if (hasAny(text, ['estrela'])) return [
      'todos os dispositivos partilham um cabo principal comum.',
      'cada dispositivo liga-se a dois vizinhos formando um círculo.',
      'os dispositivos têm vários caminhos redundantes entre si.',
      'os computadores partilham recursos diretamente sem servidor.'
    ];
    if (hasAny(text, ['barramento'])) return [
      'todos os dispositivos ligam-se a um equipamento central.',
      'cada dispositivo liga-se a dois vizinhos formando um círculo.',
      'existem vários caminhos entre dispositivos.',
      'a rede depende de clientes que pedem serviços a servidores.'
    ];
    if (hasAny(text, ['anel'])) return [
      'todos os dispositivos ligam-se a um switch central.',
      'todos os dispositivos partilham um cabo principal.',
      'os dispositivos ligam-se por vários caminhos redundantes.',
      'os clientes pedem serviços a um servidor central.'
    ];
    if (hasAny(text, ['cliente/servidor', 'cliente servidor'])) return [
      'todos os computadores partilham recursos diretamente sem servidor central.',
      'todos os equipamentos estão ligados a um cabo principal.',
      'cada dispositivo liga-se a dois vizinhos formando um anel.',
      'os nomes de domínio são traduzidos em endereços IP.'
    ];
    if (hasAny(text, ['ponto-a-ponto', 'ponto a ponto'])) return [
      'clientes pedem serviços a um servidor dedicado.',
      'um serviço atribui IPs automaticamente aos dispositivos.',
      'um servidor traduz nomes de domínio em endereços IP.',
      'um equipamento central concentra todos os dispositivos.'
    ];
    if (hasAny(text, ['fibra'])) return [
      'cabo de cobre com pares entrançados usado em Ethernet.',
      'ondas de rádio usadas em Wi-Fi.',
      'cabo coaxial com condutor central metálico.',
      'armazenamento interno permanente de dados.'
    ];
    if (hasAny(text, ['par entrançado', 'par entrancado', 'ethernet'])) return [
      'meio físico que transmite dados através de luz.',
      'meio sem fios baseado em ondas de rádio.',
      'cabo coaxial com condutor central e blindagem.',
      'serviço que traduz nomes de domínio em IPs.'
    ];
    if (hasAny(text, ['sem fios', 'wireless', 'wi-fi', 'wifi'])) return [
      'transmissão por pulsos de luz numa fibra ótica.',
      'transmissão por sinais elétricos em cabo de cobre.',
      'transmissão por cabo coaxial com blindagem.',
      'armazenamento de dados num servidor.'
    ];
  }

  if (module === 'Culturas Etnias e Diversidades') {
    if (hasAny(text, ['xenofobia'])) return [
      'discriminação baseada na cor da pele, origem étnica ou características físicas.',
      'grupo humano com afinidades culturais, linguísticas e sociais.',
      'conjunto de valores, tradições, normas e costumes de um grupo.',
      'tratamento desigual ou injusto dado a uma pessoa ou grupo.'
    ];
    if (hasAny(text, ['racismo'])) return [
      'rejeição ou hostilidade contra pessoas estrangeiras ou consideradas de fora.',
      'comunidade humana definida por afinidades culturais e linguísticas.',
      'conjunto de valores, tradições e costumes de um grupo.',
      'opinião negativa formada antes de conhecer uma pessoa ou grupo.'
    ];
    if (hasAny(text, ['etnia'])) return [
      'rejeição ou medo de estrangeiros.',
      'discriminação baseada na cor da pele ou origem étnica.',
      'conjunto de valores, normas, saberes e costumes.',
      'tratamento desigual aplicado injustamente a um grupo.'
    ];
    if (hasAny(text, ['cultura'])) return [
      'grupo humano com afinidades linguísticas, sociais e políticas.',
      'hostilidade contra estrangeiros ou pessoas consideradas de fora.',
      'discriminação baseada na cor da pele ou origem étnica.',
      'ato de tratar pessoas de forma desigual e injusta.'
    ];
  }

  return [];
}

function distractorAllowed(q, text, correctNorm) {
  const norm = normalizeText(text);
  if (!norm || norm === correctNorm) return false;
  if (correctNorm && (norm.includes(correctNorm) || correctNorm.includes(norm))) return false;

  const module = String(q.module || '');
  const area = String(q.area || '');

  // Impede misturas absurdas entre Inglês e Sociocultural/Informática.
  const englishWords = ['wake up','get up','breakfast','simple present','doesn','don t','if clause','conditional','comparative','superlative','passive voice','word order','salary','interview','employer','employee'];
  if (!module.startsWith('Inglês') && hasAny(norm, englishWords)) return false;

  const socioWords = ['romantismo','palop','cplp','didascália','didascalia','xenofobia','racismo','etnia','lenda','fabula','fábula','muro de berlim','guerra fria'];
  if (area === 'info' && hasAny(norm, socioWords)) return false;

  const infoWords = ['cpu','ram','rom','switch','router','firewall','dhcp','dns','html','css','scanf','jframe','mysql','where'];
  if (module.startsWith('Inglês') && hasAny(norm, infoWords)) return false;

  return true;
}

function thematicDistractors(q, correct) {
  const correctNorm = normalizeText(correct);
  const smart = topicSpecificDistractors(q, correct);
  const curated = moduleDistractorList(q);

  const sameTopic = BANK
    .filter(other => other.id !== q.id && other.area === q.area && other.module === q.module && normalizeText(other.topic) === normalizeText(q.topic))
    .map(other => shortAnswerText(correctTextForQuestion(other), 190));

  const sameModule = BANK
    .filter(other => other.id !== q.id && other.area === q.area && other.module === q.module)
    .map(other => shortAnswerText(correctTextForQuestion(other), 190));

  // Ordem importante: primeiro distratores pensados para o tópico,
  // depois conceitos do mesmo módulo. Assim evitamos opções absurdas e demasiado óbvias.
  const all = [...smart, ...curated, ...sameTopic, ...sameModule];
  const out = [];

  for (const text of all) {
    const norm = normalizeText(text);
    if (!distractorAllowed(q, text, correctNorm)) continue;
    if (out.some(x => normalizeText(x) === norm)) continue;
    out.push(text);
    if (out.length >= 5) break;
  }

  while (out.length < 3) {
    const fallback = moduleDistractorList(q).find(x => distractorAllowed(q, x, correctNorm) && !out.some(y => normalizeText(y) === normalizeText(x)));
    if (fallback) out.push(fallback);
    else out.push('Definição próxima dentro do mesmo módulo, mas aplicada ao conceito errado.');
  }

  return out.slice(0, 3);
}


function normalizeChoiceOptions(q) {
  if (!q || !q.options || !Array.isArray(q.options)) return q;
  const correctOptions = q.options.filter(o => o && o.correct).map(o => ({ text: String(o.text), correct: true }));
  if (!correctOptions.length) return q;

  const correctText = correctOptions.map(o => o.text).join('; ');
  const neededWrong = Math.max(3, Math.min(5, q.options.length - correctOptions.length || 3));
  const wrongTexts = thematicDistractors(q, correctText).slice(0, neededWrong);
  const wrongOptions = wrongTexts.map(text => ({ text, correct: false }));
  q.options = shuffleArray([...correctOptions, ...wrongOptions]);
  return q;
}

function makeClickQuestion(q) {
  if (q.type === 'mc' || q.type === 'multi') return q;
  const originalType = q.type;
  const correct = shortAnswerText(correctTextForQuestion(q), originalType === 'long' ? 230 : 170);
  let options = null;

  if (originalType === 'number') {
    options = numericClickOptions(q);
  }

  if (!options) {
    const wrong = thematicDistractors(q, correct);
    options = shuffleArray([{ text: correct, correct: true }, ...wrong.map(text => ({ text, correct: false }))]);
  }

  q._originalType = originalType;
  q.type = 'mc';
  q.options = options;
  q._choices = shuffleArray(options);
  q.correctAnswer = correct;
  q.keywords = q.keywords && q.keywords.length ? q.keywords : buildKeywordsFromText(correct);
  if (originalType === 'number') {
    q.prompt = `${q.prompt}\nEscolhe o resultado correto.`;
  } else if (originalType === 'long') {
    q.prompt = `${q.prompt}\nSeleciona a opção correta.`;
  } else if (originalType === 'code') {
    q.prompt = `${q.prompt}\nEscolhe a interpretação/solução correta.`;
  }
  return q;
}


function cleanPromptForWritten(prompt) {
  return String(prompt || '')
    .replace(/\bindica\s+uma\s+op[cç][aã]o[^.?!]*[.?!]?/gi, '')
    .replace(/\b(assinala|seleciona|escolhe)\b[^.?!]*(resposta|op[cç][aã]o)[^.?!]*[.?!]?/gi, '')
    .replace(/\b(assinale|selecione|escolha)\b[^.?!]*(correta|corretas)[^.?!]*[.?!]?/gi, '')
    .replace(/\bEscolhe a resposta mais completa\.?/gi, '')
    .replace(/\bchoose\b[^.?!]*(correct|best|sentence|comparative|superlative|passive|word order)[^.?!]*[.?!]?/gi, '')
    .replace(/\bselect\b[^.?!]*(correct|best|sentence|option)[^.?!]*[.?!]?/gi, '')
    .replace(/\bEscolhe o resultado correto\.?/gi, '')
    .replace(/\bResponde por extenso, sem escolher op[cç][oõ]es\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferWrittenPrompt(q, correct) {
  const moduleNameForWritten = String(q.module || '');
  const customWritten = String(q.writtenPrompt || '');
  // Em Inglês não usamos prompts de criação livre de frases, porque a correção automática
  // torna-se injusta. Mesmo que uma pergunta antiga tenha writtenPrompt, reescrevemos
  // para significado/regra/estrutura.
  if (customWritten && !(moduleNameForWritten.startsWith('Inglês') && /escrev|cria|frase|using|complete/i.test(customWritten))) {
    return q.writtenPrompt;
  }

  const topic = String(q.topic || '').trim();
  const module = String(q.module || '').trim();
  const prompt = cleanPromptForWritten(q.prompt);
  const term = topic || prompt.replace(/[?.!]+$/g, '').slice(0, 80);
  const normalizedPrompt = normalizeText(prompt);

  // Matemática/Física/Química: uma pergunta por extenso deve pedir cálculo, interpretação ou justificação.
  if (q.area === 'mfc') {
    if (q.type === 'number') {
      return `${prompt}\nResolve por extenso: apresenta a fórmula usada, substitui os valores, indica o resultado e respeita o arredondamento pedido.`;
    }
    if (/gr[aá]fico|tabela|fun[cç][aã]o|probabilidade|m[eé]dia|mediana|moda|acelera[cç][aã]o|onda|hidrocarboneto|pot[eê]ncia|nota[cç][aã]o cient/i.test(prompt + ' ' + module)) {
      return `${prompt}\nExplica por extenso o raciocínio e escreve a resposta final completa.`;
    }
    return `Explica por extenso o conteúdo de ${term}, incluindo a regra, fórmula ou ideia principal.`;
  }

  // Inglês: evita pedir criação livre de frases, porque a correção automática fica injusta.
  // Aqui o treino foca significado, identificação da regra ou escolha da forma correta.
  if (module.startsWith('Inglês')) {
    if (/daily routine|rotina|wake up|get up|breakfast|school|homework|work/i.test(module + ' ' + prompt + ' ' + term)) {
      return `Indica por escrito o significado pedido de vocabulário de daily routine ou a regra do Simple Present associada.`;
    }
    if (/if-clauses|conditional|zero|first|second/i.test(module + ' ' + prompt)) {
      return `Identifica o tipo de if-clause/conditional ou explica a estrutura pedida, sem criar uma frase nova.`;
    }
    if (/passive|voz passiva/i.test(module + ' ' + prompt)) {
      return `Identifica a opção/forma correta de passive voice ou explica a estrutura, sem criar uma frase nova.`;
    }
    if (/word order|ordem/i.test(module + ' ' + prompt)) {
      return `Indica a ordem correta da frase em inglês ou a regra de word order pedida.`;
    }
    if (/graus|comparative|superlative|adjetivos/i.test(module + ' ' + prompt)) {
      return `Indica a forma correta do comparative/superlative ou explica a regra pedida.`;
    }
    if (/profiss|job|career|salary|interview|employer|employee|skills|experience/i.test(module + ' ' + prompt + ' ' + term)) {
      return `Indica o significado do vocabulário profissional pedido ou identifica o conceito correto.`;
    }
    return `${prompt}\nResponde com o significado, conceito ou regra pedida, sem criar frases novas.`;
  }

  // Informática: evita ficar com “Assinala a correta” sem opções; transforma em pergunta teórica útil.
  if (q.area === 'info') {
    if (/arquitetura|cpu|processador|mem[oó]ria|ram|rom|cache|hardware|software|motherboard|disco|ula|alu/i.test(module + ' ' + term)) {
      return `Define, de forma concreta, em arquitetura de computadores: ${term}.`;
    }
    if (/processador de texto|rodap[eé]|cabe[cç]alho|colunas|tabelas|notas de rodap[eé]|margens|formata/i.test(module + ' ' + term)) {
      return `Define, de forma concreta, num processador de texto: ${term}.`;
    }
    if (/folha de c[aá]lculo|excel|c[eé]lula|f[oó]rmula|fun[cç][aã]o|filtro|formata[cç][aã]o condicional|tabela din[aâ]mica|gr[aá]fico din[aâ]mico/i.test(module + ' ' + term)) {
      return `Define, de forma concreta, numa folha de cálculo: ${term}.`;
    }
    if (/rede|lan|wan|wlan|man|switch|router|firewall|dns|dhcp|servidor|cliente|ponto|topologia|fibra|ethernet|access point|modem/i.test(module + ' ' + term)) {
      return `Define, de forma concreta, em redes: ${term}.`;
    }
    if (/sql|mysql|base de dados|where|select|insert|update|delete|chave|formul[aá]rio|get|post/i.test(module + ' ' + term)) {
      return `Define, de forma concreta, em bases de dados/web: ${term}.`;
    }
    if (/html|css|p[aá]gina|tag|link|imagem|tabela|formul[aá]rio/i.test(module + ' ' + term)) {
      return `Define, de forma concreta, em criação de páginas web: ${term}.`;
    }
    if (/c\/c\+\+|java|programa[cç][aã]o|algoritmo|classe|objeto|fun[cç][aã]o|vari[aá]vel/i.test(module + ' ' + term)) {
      return `Define, de forma concreta, em programação: ${term}.`;
    }
    return `Explica por extenso o conceito de ${term}, dentro do módulo ${module}.`;
  }

  // Sociocultural: mantém a pergunta real, mas remove instruções de escolha.
  if (prompt && !/assinala|escolhe|seleciona|selecione|escolha/i.test(prompt)) {
    return `${prompt}\nResponde por extenso, com as ideias principais.`;
  }
  return `Explica por extenso o conceito/tema: ${term}.`;
}

function makeWrittenQuestion(q) {
  const originalType = q.type;
  if (originalType === 'long') {
    q.prompt = inferWrittenPrompt(q, q.correctAnswer || '');
    return q;
  }

  const correct = q.writtenCorrectAnswer || correctTextForQuestion(q);
  q._originalType = originalType;
  q._correctOptionsText = correct;
  q.type = 'long';
  q.correctAnswer = originalType === 'number'
    ? `${correct}. Mostra o cálculo e respeita o arredondamento/unidade indicados no enunciado.`
    : correct;
  q.options = undefined;
  q._choices = undefined;
  q.keywords = q.keywords && q.keywords.length ? q.keywords : buildKeywordsFromText(q.correctAnswer);
  q.prompt = inferWrittenPrompt(q, correct);

  if (originalType === 'number') {
    q.prompt = q.prompt.includes('Resolve por extenso') ? q.prompt : `${q.prompt}\nResolve por extenso: escreve a fórmula/cálculo e o resultado final.`;
  } else if (originalType === 'code') {
    q.prompt = q.prompt.includes('Explica') ? q.prompt : `${q.prompt}\nExplica por extenso ou escreve o excerto de código pedido.`;
  }
  return q;
}

function prepareQuestionForAnswerMode(q, answerMode) {
  const cloned = cloneForExam(q);
  // Mesmo no modo misturado, se o enunciado diz para escolher/assinalar uma opção,
  // a pergunta tem de aparecer com opções e não com caixa de texto.
  if (answerMode === 'click' || (answerMode === 'mixed' && shouldRenderAsChoice(cloned))) {
    return makeClickQuestion(cloned);
  }
  if (answerMode === 'written') return makeWrittenQuestion(cloned);
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


function infoModulePriority(module) {
  const high = [
    'Arquitetura interna do computador',
    'Processador de texto',
    'Folha de cálculo',
    'Conexões de rede / Rede local'
  ];
  const low = [
    'Programação em C/C++',
    'Programação em JAVA',
    'Criação de páginas Web em hipertexto',
    'Scripts CGI e folhas de estilo'
  ];
  if (high.includes(module)) return 4;
  if (low.includes(module)) return 1;
  return 2;
}

function infoLowTheoryModule(module) {
  return [
    'Programação em C/C++',
    'Programação em JAVA',
    'Criação de páginas Web em hipertexto',
    'Scripts CGI e folhas de estilo'
  ].includes(module);
}

function maxQuestionsForModule(area, module, mode, target) {
  if (area !== 'info') return Infinity;
  // Estes módulos continuam na matriz, por isso aparecem, mas com pouco peso na teoria.
  // A prática de C/Java/HTML/SQL é treinada na secção própria.
  if (infoLowTheoryModule(module)) {
    if (mode === 'vinte' && target >= 45) return 2;
    return 1;
  }
  return Infinity;
}

function mandatoryRoundsForModule(area, module, target, totalModules) {
  if (target < totalModules * 2) return 1;
  if (area === 'mfc') return 2;
  if (area === 'info') {
    if (infoLowTheoryModule(module)) return 1;
    return infoModulePriority(module) >= 4 ? 2 : 1;
  }
  return 1;
}

function buildSocioExam(pool, target, mode) {
  const chosen = [];
  const used = new Set();
  const core = shuffleArray(pool.filter(q => q.core));
  const english = pool.filter(q => q.module.startsWith('Inglês'));
  const variants = pool.filter(q => !q.core && !q.module.startsWith('Inglês'));
  const englishModules = [...new Set(english.map(q => q.module))];

  // Se o exame for automático e tiver espaço, entram todas as perguntas-base reais de Sociocultural
  // e a pergunta extra de xenofobia pedida para a matriz.
  const mustCore = core.length;
  const minimumUseful = mustCore + englishModules.length;
  // Sociocultural tem perguntas-base reais das revisões: entram sempre no exame,
  // mesmo no modo de só clicar, para não falhar matéria certa da PAF.
  target = Math.max(target, minimumUseful);

  let coreQuota = mustCore;
  for (const q of core.slice(0, coreQuota)) pushUnique(chosen, used, q);

  // Em Inglês, tenta tocar todos os blocos da matriz: daily routine/simple present, if-clauses,
  // graus dos adjetivos, profissões/job vocabulary, passive voice e word order.
  const englishQuota = Math.max(englishModules.length, Math.round(target * 0.30));
  for (const module of shuffleArray(englishModules)) {
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

function buildBalancedExam(pool, target, mode, area = 'info') {
  const chosen = [];
  const used = new Set();
  const byModule = new Map();
  for (const q of pool) {
    if (!byModule.has(q.module)) byModule.set(q.module, []);
    byModule.get(q.module).push(q);
  }

  const modules = shuffleArray([...byModule.keys()]);

  // Primeira passagem: pelo menos 1 pergunta por módulo da matriz.
  for (const module of modules) {
    if (chosen.length >= target) break;
    pushUnique(chosen, used, weightedRandomQuestion(byModule.get(module), mode));
  }

  // Segunda passagem: nos módulos mais importantes/práticos da teoria de informática e nos blocos de M/FQ,
  // reforça para 2 perguntas quando o tamanho do exame permite.
  for (const module of shuffleArray(modules)) {
    if (chosen.length >= target) break;
    const desired = mandatoryRoundsForModule(area, module, target, modules.length);
    while ((chosen.filter(q => q.module === module).length < desired) && chosen.length < target) {
      const maxForModule = maxQuestionsForModule(area, module, mode, target);
      if (chosen.filter(q => q.module === module).length >= maxForModule) break;
      const available = byModule.get(module).filter(q => !used.has(q.id));
      if (!pushUnique(chosen, used, weightedRandomQuestion(available, mode))) break;
    }
  }

  // Preenchimento: em Informática dá mais peso ao que não é C/Java/HTML puro,
  // porque a teoria tende a aparecer mais em arquitetura, Word, Excel e redes.
  while (chosen.length < target) {
    const counts = new Map();
    for (const q of chosen) counts.set(q.module, (counts.get(q.module) || 0) + 1);
    const candidates = shuffleArray(modules).sort((a, b) => {
      const ca = counts.get(a) || 0;
      const cb = counts.get(b) || 0;
      if (area === 'info') {
        const sa = ca / infoModulePriority(a);
        const sb = cb / infoModulePriority(b);
        if (sa !== sb) return sa - sb;
        return infoModulePriority(b) - infoModulePriority(a);
      }
      if (ca !== cb) return ca - cb;
      return 0;
    });
    let added = false;
    for (const module of candidates) {
      const maxForModule = maxQuestionsForModule(area, module, mode, target);
      if ((counts.get(module) || 0) >= maxForModule) continue;
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

function buildExam(area, minutes, mode, includeTraps, answerMode = 'mixed') {
  const pool = filterPool(area, mode, includeTraps);
  let target = Math.min(targetQuestionCount(minutes, mode, area, answerMode), pool.length);
  // Garante cobertura mínima dos módulos da matriz, também no modo “Só clicar”.
  if (area !== 'socio') {
    const moduleCount = new Set(pool.map(q => q.module)).size;
    target = Math.max(target, moduleCount);
  }
  const rawExam = area === 'socio' ? buildSocioExam(pool, target, mode) : buildBalancedExam(pool, target, mode, area);
  return rawExam.map(q => prepareQuestionForAnswerMode(q, answerMode));
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
    const ph = currentAnswerMode === 'written' ? 'Responde por extenso. Escreve ideias principais, cálculo ou explicação.' : 'Escreve a resposta desenvolvida';
    html = `<textarea name="${q.id}" placeholder="${ph}"></textarea>`;
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
    if (q._originalType === 'number' && q.numericAnswer !== undefined) {
      const raw = String(answer || '').replace(',', '.');
      const match = raw.match(/-?\d+(\.\d+)?/);
      if (match) {
        const value = Number(match[0]);
        const tolerance = Number(q.tolerance ?? 0.01);
        if (Math.abs(value - Number(q.numericAnswer)) <= tolerance) {
          earned = max;
          status = 'correct';
          detail = 'Resultado numérico correto dentro da resposta por extenso.';
        } else {
          const written = scoreWrittenQuestion(q, answer, max);
          earned = written.earned;
          status = written.status;
          detail = `${written.detail} O número encontrado não bate com o resultado esperado.`;
        }
      } else {
        const written = scoreWrittenQuestion(q, answer, max);
        earned = written.earned;
        status = written.status;
        detail = `${written.detail} Não encontrei o resultado numérico na resposta.`;
      }
    } else {
      const written = scoreWrittenQuestion(q, answer, max);
      earned = written.earned;
      status = written.status;
      detail = written.detail;
    }
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

function startTimer(minutes, noTime = false) {
  clearInterval(timerInterval);
  timerCard.classList.remove('warning', 'danger');

  if (noTime) {
    remainingSeconds = 0;
    timerEl.textContent = 'Sem tempo';
    timerProgress.textContent = `${countAnswered()}/${currentExam.length} respondidas`;
    return;
  }

  remainingSeconds = minutes * 60;
  timerEl.textContent = formatTime(remainingSeconds);

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
  currentAnswerMode = getAnswerMode();
  const includeTraps = document.getElementById('includeTraps').checked;
  const noTime = isNoTimeMode();

  currentExam = buildExam(currentArea, minutes, currentMode, includeTraps, currentAnswerMode);
  startTime = new Date();

  document.getElementById('examTitle').textContent = AREA_LABEL[currentArea];
  document.getElementById('examLabel').textContent = `Modo: ${currentMode === 'vinte' ? '20/20' : currentMode === 'serio' ? 'PAF sério' : 'Normal'}`;
  document.getElementById('examMeta').textContent = `${currentExam.length} perguntas · ${noTime ? 'sem tempo' : minutes + ' minutos'} · ${ANSWER_MODE_LABEL[currentAnswerMode]} · respostas baralhadas · cobertura equilibrada por módulos`; 

  setupEl.classList.add('hidden');
  resultsEl.classList.add('hidden');
  historyEl.classList.add('hidden');
  examEl.classList.remove('hidden');
  document.body.classList.add('exam-running');
  document.body.classList.remove('results-active');

  renderExam();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  startTimer(minutes, noTime);
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
  document.body.classList.add('results-active');
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
  let txt = `SALÃO DE EXAMES PAF\nExame: ${AREA_LABEL[currentArea]}\nDificuldade: ${currentMode}\nModo de resposta: ${ANSWER_MODE_LABEL[currentAnswerMode]}\nNota: ${grade}/20\nTempo usado: ${formatTime(elapsed)}\nRespostas vistas durante o exame: ${results.filter(r => r.revealed).length}\n\nRelatório por módulo:\n`;
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
    answerMode: ANSWER_MODE_LABEL[currentAnswerMode],
    questionCount,
    elapsed,
    revealed,
    weakest: moduleStats.slice(0, 3).map(m => `${m.module} (${m.percent.toFixed(0)}%)`)
  });
  localStorage.setItem('pafHistory', JSON.stringify(history.slice(0, 40)));
}

function showHistory() {
  const history = JSON.parse(localStorage.getItem('pafHistory') || '[]');
  historyEl.innerHTML = `<p class="eyebrow">Histórico local</p><h2>Os teus últimos exames</h2>${history.length ? history.map(h => `<div class="history-item"><strong>${escapeHtml(h.area)} · ${escapeHtml(h.date)}</strong><p>Nota: ${h.grade}/20 · ${escapeHtml(h.answerMode || 'Misturado')} · Perguntas: ${h.questionCount} · Tempo: ${formatTime(h.elapsed)} · Respostas vistas: ${h.revealed || 0}</p><p>Módulos a rever: ${h.weakest.length ? h.weakest.map(escapeHtml).join(', ') : 'sem dados'}</p></div>`).join('') : '<p>Ainda não há exames guardados neste navegador.</p>'}<div class="actions"><button class="secondary" onclick="backToSetup()">Voltar</button><button class="danger" onclick="clearHistory()">Limpar histórico</button></div>`;
  setupEl.classList.add('hidden');
  resultsEl.classList.add('hidden');
  examEl.classList.add('hidden');
  document.body.classList.remove('exam-running');
  document.body.classList.remove('results-active');
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
  document.body.classList.remove('results-active');
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
