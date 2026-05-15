from pathlib import Path
p = Path('/mnt/data/paf_work/app.js')
s = p.read_text(encoding='utf-8')
old = """function cloneForExam(q) {\n  const cloned = JSON.parse(JSON.stringify(q));\n  if (cloned.options) cloned._choices = shuffleArray(cloned.options);\n  return cloned;\n}\n"""
new = """function cloneForExam(q) {\n  const cloned = JSON.parse(JSON.stringify(q));\n  if (cloned.options) {\n    normalizeChoiceOptions(cloned);\n    cloned._choices = shuffleArray(cloned.options);\n  }\n  return cloned;\n}\n"""
if old not in s:
    raise SystemExit('cloneForExam pattern not found')
s = s.replace(old,new)
old2 = """function thematicDistractors(q, correct) {\n  const pool = BANK\n    .filter(other => other.id !== q.id && other.area === q.area && other.module === q.module)\n    .map(other => shortAnswerText(correctTextForQuestion(other), 180))\n    .filter(text => text && normalizeText(text) !== normalizeText(correct));\n\n  const sameArea = BANK\n    .filter(other => other.id !== q.id && other.area === q.area && other.module !== q.module)\n    .map(other => shortAnswerText(correctTextForQuestion(other), 180))\n    .filter(text => text && normalizeText(text) !== normalizeText(correct));\n\n  const genericByArea = {\n    socio: [\n      'É uma explicação relacionada com outro conteúdo sociocultural, mas não responde diretamente à pergunta.',\n      'É uma definição incompleta porque troca o conceito pedido por outro semelhante.',\n      'É uma resposta demasiado geral e não identifica os elementos principais do tema.'\n    ],\n    mfc: [\n      'Aplicar uma fórmula sem respeitar os dados do enunciado.',\n      'Trocar a grandeza pedida por outra grandeza do mesmo tema.',\n      'Calcular com os valores corretos, mas usar uma unidade ou arredondamento incorreto.'\n    ],\n    info: [\n      'Executar outra operação do mesmo módulo, mas não a função pedida.',\n      'Definir um conceito próximo, mas diferente do conceito apresentado.',\n      'Descrever uma ação possível no computador, mas não a finalidade correta do comando.'\n    ]\n  };\n\n  const all = shuffleArray([...pool, ...sameArea, ...(genericByArea[q.area] || [])]);\n  const out = [];\n  for (const text of all) {\n    const norm = normalizeText(text);\n    if (!norm || norm === normalizeText(correct)) continue;\n    if (out.some(x => normalizeText(x) === norm)) continue;\n    out.push(text);\n    if (out.length >= 3) break;\n  }\n  while (out.length < 3) out.push((genericByArea[q.area] || genericByArea.info)[out.length]);\n  return out.slice(0, 3);\n}\n"""
new2 = r"""const CURATED_DISTRACTORS = {
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
    'Conceito semelhante do mesmo módulo, mas não corresponde ao que foi perguntado.',
    'Resposta incompleta porque troca a função pedida por outra próxima.',
    'Definição relacionada com o tema, mas aplicada ao conceito errado.',
    'Explicação plausível, mas que não identifica corretamente o elemento pedido.'
  ];
}

function thematicDistractors(q, correct) {
  const correctNorm = normalizeText(correct);
  const sameModule = BANK
    .filter(other => other.id !== q.id && other.area === q.area && other.module === q.module)
    .map(other => shortAnswerText(correctTextForQuestion(other), 190))
    .filter(text => text && normalizeText(text) !== correctNorm);

  const curated = moduleDistractorList(q);
  const all = shuffleArray([...sameModule, ...curated]);
  const out = [];
  for (const text of all) {
    const norm = normalizeText(text);
    if (!norm || norm === correctNorm) continue;
    if (out.some(x => normalizeText(x) === norm)) continue;
    if (correctNorm && (norm.includes(correctNorm) || correctNorm.includes(norm))) continue;
    out.push(text);
    if (out.length >= 6) break;
  }
  while (out.length < 3) {
    const fallback = moduleDistractorList(q)[out.length] || 'Resposta relacionada com o mesmo tema, mas incorreta neste caso.';
    if (!out.some(x => normalizeText(x) === normalizeText(fallback)) && normalizeText(fallback) !== correctNorm) out.push(fallback);
    else out.push('Conceito próximo do mesmo módulo, mas não é a resposta correta.');
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
"""
if old2 not in s:
    raise SystemExit('thematicDistractors pattern not found')
s = s.replace(old2,new2)
p.write_text(s, encoding='utf-8')
print('patched app')
