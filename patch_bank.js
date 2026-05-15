const fs = require('fs');
global.window = {};
require('./question-bank.js');
let bank = window.PAF_QUESTION_BANK;
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ç/g,'c').trim();}
function hasId(id){return bank.some(q=>q.id===id)}
function mcQuestion({id,area='info',module,topic,prompt,correct,wrong,difficulty=3,estimate=70,weight=1,explanation}){
 return {id,area,module,topic,type:'mc',prompt,difficulty,estimate,weight,correctAnswer:correct,explanation:explanation||'Pergunta teórica baseada na matriz e nas revisões.',options:[{text:correct,correct:true},...wrong.map(text=>({text,correct:false}))],keywords:String(correct).split(/\s+/).filter(w=>w.length>3).slice(0,6)};
}
function shortQuestion({id,area='info',module,topic,prompt,correct,difficulty=3,estimate=90,weight=1,explanation,keywords}){
 return {id,area,module,topic,type:'short',prompt,difficulty,estimate,weight,correctAnswer:correct,explanation:explanation||'Pergunta teórica baseada na matriz e nas revisões.',keywords:keywords||String(correct).split(/\s+/).filter(w=>w.length>3).slice(0,7)};
}
function longQuestion({id,area='info',module,topic,prompt,correct,difficulty=3,estimate=150,weight=1.4,explanation,keywords,rubric,core=false}){
 return {id,area,module,topic,type:'long',prompt,difficulty,estimate,weight,correctAnswer:correct,explanation:explanation||'Pergunta teórica baseada na matriz e nas revisões.',keywords:keywords||String(correct).split(/\s+/).filter(w=>w.length>3).slice(0,10),rubric,humanGrading:true,core};
}
// 1) Corrigir Planeamento Familiar: se pede uma opção, mostra opções reais.
const pf = bank.find(q => q.id === 'V4Q0029' || /não é objetivo do Planeamento Familiar/i.test(q.prompt||''));
if (pf) {
  pf.type = 'mc';
  pf.prompt = 'Qual das seguintes opções NÃO é objetivo do Planeamento Familiar?';
  pf.correctAnswer = 'Aumentar a incidência das infeções de transmissão sexual e as suas consequências.';
  pf.options = [
    {text:'Aumentar a incidência das infeções de transmissão sexual e as suas consequências.', correct:true},
    {text:'Prevenir infeções sexualmente transmissíveis e as suas consequências.', correct:false},
    {text:'Ajudar as pessoas a decidir se e quando querem ter filhos.', correct:false},
    {text:'Informar sobre métodos contracetivos e saúde sexual.', correct:false}
  ];
  pf.keywords = ['aumentar','incidência','infeções','transmissão sexual','consequências'];
  pf.explanation = 'A pergunta está pela negativa: não é objetivo aumentar as infeções; o objetivo seria prevenir/diminuir.';
}
// 2) Transformar perguntas de Inglês que pediam criar frases em perguntas objetivas de significado/regra.
const dailyMeanings = {
  'wake up':'acordar', 'have breakfast':'tomar o pequeno-almoço', 'go to school':'ir para a escola',
  'study':'estudar', 'watch TV':'ver televisão', 'do homework':'fazer os trabalhos de casa',
  'brush her teeth':'escovar os dentes', 'finish school':'terminar a escola', 'play football':'jogar futebol',
  'work':'trabalhar', 'start':'começar', 'study English':'estudar inglês'
};
const dailyWrong = ['ir dormir','almoçar','trabalhar num escritório','fazer uma entrevista'];
const jobMeanings = {
  'employer':'empregador', 'employee':'empregado/trabalhador', 'salary':'salário', 'interview':'entrevista',
  'application':'candidatura', 'skills':'competências', 'experience':'experiência', 'career':'carreira',
  'CV':'currículo', 'resume':'currículo'
};
const jobWrong = ['viagem','rodapé','rede local','pequeno-almoço'];
for (const q of bank) {
  if (q.area === 'socio' && String(q.module||'').startsWith('Inglês')) {
    let m = String(q.prompt||'').match(/Escreve uma frase de rotina diária usando "([^"]+)"/i);
    if (m) {
      const expr = m[1]; const correct = dailyMeanings[expr] || 'rotina diária';
      q.type = 'mc'; q.prompt = `O que significa "${expr}" em português?`; q.correctAnswer = correct;
      q.options = [{text:correct,correct:true}, ...dailyWrong.filter(x=>norm(x)!==norm(correct)).slice(0,3).map(text=>({text,correct:false}))];
      q.keywords = [correct]; q.explanation = 'Pergunta de vocabulário de daily routine, sem pedir criação de frases.';
      delete q.rubric; delete q.humanGrading;
    }
    m = String(q.prompt||'').match(/Escreve uma frase simples em inglês usando "([^"]+)"/i);
    if (m) {
      const word = m[1]; const correct = jobMeanings[word] || `significado de ${word}`;
      q.type = 'mc'; q.prompt = `No vocabulário de trabalho, o que significa "${word}"?`; q.correctAnswer = correct;
      q.options = [{text:correct,correct:true}, ...jobWrong.filter(x=>norm(x)!==norm(correct)).slice(0,3).map(text=>({text,correct:false}))];
      q.keywords = [correct]; q.explanation = 'Pergunta de vocabulário profissional, sem pedir criação de frases.';
      delete q.rubric; delete q.humanGrading;
    }
    // Evita enunciados tipo “cria/usa numa frase”.
    q.prompt = String(q.prompt||'').replace(/Cria uma frase[^.?!]*[.?!]?/gi, 'Indica a resposta correta ou o significado pedido.');
    q.prompt = q.prompt.replace(/Como usarias[^.?!]*[.?!]?/gi, 'Indica a função/significado pedido.');
  }
}
// 3) Adicionar xenofobia (matriz + revisão de sociocultural).
const xenofobiaQs = [
  longQuestion({id:'SOC_XEN_001',area:'socio',module:'Culturas, Etnias e Diversidades',topic:'Xenofobia',prompt:'O que é xenofobia?',correct:'Xenofobia é a rejeição, medo, preconceito ou hostilidade contra pessoas estrangeiras ou consideradas de fora.',difficulty:3,estimate:130,weight:1.5,core:true,explanation:'A matriz inclui Culturas, Etnia, Xenofobia e Racismo. Responde com a ideia de rejeição/preconceito contra estrangeiros.',keywords:['xenofobia','rejeição','medo','preconceito','hostilidade','estrangeiros'],rubric:[{label:'conceito',terms:['xenofobia','rejeição','preconceito','hostilidade','medo']},{label:'alvo',terms:['estrangeiros','pessoas de fora','imigrantes','consideradas de fora']}]}),
  mcQuestion({id:'SOC_XEN_002',area:'socio',module:'Culturas, Etnias e Diversidades',topic:'Xenofobia',prompt:'A xenofobia está principalmente relacionada com...',correct:'preconceito ou rejeição contra estrangeiros/pessoas de fora.',wrong:['diferenças de pronúncia dentro da mesma língua.','uma técnica jornalística usada nas notícias.','o cálculo da taxa de emprego.'],difficulty:2,explanation:'Xenofobia é rejeição/hostilidade contra estrangeiros ou pessoas consideradas de fora.'}),
  mcQuestion({id:'SOC_XEN_003',area:'socio',module:'Culturas, Etnias e Diversidades',topic:'Xenofobia',prompt:'Qual é a atitude mais contrária à xenofobia?',correct:'respeitar pessoas de diferentes origens e culturas.',wrong:['rejeitar pessoas estrangeiras.','confundir língua materna com língua oficial.','usar discurso indireto num texto narrativo.'],difficulty:2}),
  shortQuestion({id:'SOC_XEN_004',area:'socio',module:'Culturas, Etnias e Diversidades',topic:'Xenofobia',prompt:'Indica uma palavra-chave associada à xenofobia.',correct:'preconceito contra estrangeiros',difficulty:2,keywords:['preconceito','estrangeiros','rejeição','hostilidade']}),
  mcQuestion({id:'SOC_XEN_005',area:'socio',module:'Culturas, Etnias e Diversidades',topic:'Xenofobia',prompt:'Qual destas situações representa xenofobia?',correct:'discriminar alguém por ser estrangeiro ou vir de outro país.',wrong:['usar ferro, vidro e cimento numa construção.','dividir um texto em colunas.','calcular uma média aritmética.'],difficulty:3})
];
for (const q of xenofobiaQs) if (!hasId(q.id)) bank.push(q);
// 4) Adicionar mais perguntas de informática teórica não centradas em C/Java/HTML/SQL.
const infoQs = [];
let idn = 1;
function iid(){ return 'INFO_THEORY_EXTRA_' + String(idn++).padStart(3,'0'); }
const mc = (module, topic, prompt, correct, wrong, difficulty=3) => infoQs.push(mcQuestion({id:iid(),module,topic,prompt,correct,wrong,difficulty,estimate:75,weight:1}));
const sh = (module, topic, prompt, correct, keywords, difficulty=3) => infoQs.push(shortQuestion({id:iid(),module,topic,prompt,correct,keywords,difficulty,estimate:85,weight:1}));
const lo = (module, topic, prompt, correct, keywords, difficulty=4) => infoQs.push(longQuestion({id:iid(),module,topic,prompt,correct,keywords,difficulty,estimate:145,weight:1.4}));
// Arquitetura
mc('Arquitetura interna do computador','Hardware e software','Qual é a diferença principal entre hardware e software?','Hardware é a parte física; software são os programas/sistemas.',['Hardware é apenas a internet; software é apenas o monitor.','Hardware são os ficheiros; software é a fonte de alimentação.','Hardware e software significam exatamente a mesma coisa.']);
mc('Arquitetura interna do computador','CPU','A CPU/processador serve principalmente para...','executar instruções e processar dados.',['guardar dados permanentemente.','fornecer energia elétrica ao computador.','mostrar imagens no ecrã.']);
mc('Arquitetura interna do computador','RAM','A memória RAM caracteriza-se por ser...','temporária, rápida e volátil.',['permanente e usada para guardar o sistema para sempre.','um periférico de saída.','um cabo de rede sem fios.']);
mc('Arquitetura interna do computador','ROM','A memória ROM é normalmente associada a...','memória permanente com instruções básicas.',['memória temporária que se apaga sempre que abre um programa.','um dispositivo usado só para imprimir.','um protocolo que traduz nomes em IP.']);
mc('Arquitetura interna do computador','Cache','A cache do processador serve para...','acelerar o acesso a dados usados com frequência.',['guardar ficheiros pessoais durante anos.','substituir a motherboard.','atribuir endereços IP.']);
mc('Arquitetura interna do computador','ULA/ALU','A ULA/ALU é responsável por...','operações aritméticas e lógicas.',['controlar a iluminação do monitor.','guardar documentos Word.','ligar redes diferentes.']);
mc('Arquitetura interna do computador','Unidade de controlo','A unidade de controlo do processador serve para...','coordenar as operações e o fluxo de instruções.',['aumentar o espaço do disco.','filtrar tráfego de rede.','formatar tabelas no Word.']);
mc('Arquitetura interna do computador','Motherboard','A motherboard é importante porque...','é a placa principal onde se ligam os componentes.',['é sempre um programa antivírus.','é uma técnica de pirâmide invertida.','é um tipo de servidor DHCP.']);
mc('Arquitetura interna do computador','Periféricos','Qual é um exemplo de periférico de entrada?','teclado.',['monitor.','colunas.','impressora.']);
mc('Arquitetura interna do computador','Periféricos','Qual é um exemplo de periférico de saída?','monitor.',['teclado.','rato.','scanner.']);
sh('Arquitetura interna do computador','Disco SSD/HDD','Para que serve um disco HDD/SSD?', 'Armazenar dados de forma permanente.', ['armazenar','dados','permanente','disco']);
lo('Arquitetura interna do computador','Processador','Explica a diferença entre RAM, disco e CPU.', 'A CPU processa instruções; a RAM guarda dados temporários em uso; o disco guarda dados permanentemente.', ['cpu','processa','ram','temporária','disco','permanente']);
// Processador de texto
mc('Processador de texto','Cabeçalho','Num processador de texto, o cabeçalho é...', 'informação repetida no topo das páginas.', ['uma fórmula de folha de cálculo.','a margem inferior do documento.','uma tabela dinâmica.']);
mc('Processador de texto','Rodapé','Num processador de texto, o rodapé é...', 'informação repetida no fundo das páginas.', ['o título principal do documento.','uma rede local sem fios.','um tipo de processador.']);
mc('Processador de texto','Notas de rodapé','As notas de rodapé servem para...', 'acrescentar explicações ou referências no fim da página.', ['calcular médias automaticamente.','ligar computadores a um switch.','criar um endereço IP.']);
mc('Processador de texto','Texto em colunas','A opção texto em colunas permite...', 'dividir o texto em duas ou mais colunas.', ['ordenar células por valor.','filtrar pacotes de rede.','criar um servidor DNS.']);
mc('Processador de texto','Tabelas','Numa tabela de processador de texto, é possível...', 'organizar informação em linhas e colunas.', ['executar instruções da CPU.','substituir o router.','atribuir IPs automaticamente.']);
mc('Processador de texto','Formatação','Negrito, itálico e sublinhado são exemplos de...', 'formatação de texto.', ['topologias de rede.','memórias voláteis.','funções de servidor.']);
mc('Processador de texto','Alinhamento','O alinhamento de texto serve para...', 'definir a posição do texto na linha, como esquerda, centro ou direita.', ['aumentar a RAM.','criar uma rede WAN.','fazer backup do disco.']);
sh('Processador de texto','Numeração de páginas','Para que serve a numeração de páginas?', 'Para identificar e organizar as páginas de um documento.', ['número','páginas','organizar','documento']);
sh('Processador de texto','Margens','O que são margens num documento?', 'São os espaços entre o conteúdo e as extremidades da página.', ['espaços','conteúdo','extremidades','página']);
lo('Processador de texto','Documento formal','Explica três ferramentas de processador de texto úteis num trabalho formal.', 'Cabeçalho/rodapé, notas de rodapé, tabelas, formatação, alinhamento, margens e numeração ajudam a organizar e apresentar um documento.', ['cabeçalho','rodapé','notas','tabelas','formatação','margens']);
// Folha de cálculo
mc('Folha de cálculo','Célula','Numa folha de cálculo, uma célula é...', 'a interseção entre uma linha e uma coluna.', ['uma página web.','um dispositivo de rede.','um periférico de entrada.']);
mc('Folha de cálculo','Intervalo','O intervalo A1:A10 representa...', 'um conjunto de células da A1 até à A10.', ['um endereço IP.','uma topologia em estrela.','uma nota de rodapé.']);
mc('Folha de cálculo','Fórmulas','Numa folha de cálculo, as fórmulas começam normalmente por...', '=', ['#','//','<html>']);
mc('Folha de cálculo','SOMA','A função SOMA serve para...', 'somar valores de células.', ['mostrar apenas valores filtrados.','criar uma tabela HTML.','traduzir nomes em IP.']);
mc('Folha de cálculo','MÉDIA','A função MÉDIA serve para...', 'calcular a média dos valores selecionados.', ['contar apenas texto.','formatar o rodapé.','criar uma ligação WAN.']);
mc('Folha de cálculo','MÁXIMO','A função MÁXIMO devolve...', 'o maior valor de um intervalo.', ['o menor valor de um intervalo.','a soma dos valores.','a quantidade de linhas com texto.']);
mc('Folha de cálculo','MÍNIMO','A função MÍNIMO devolve...', 'o menor valor de um intervalo.', ['o maior valor de um intervalo.','a média dos valores.','o nome do ficheiro.']);
mc('Folha de cálculo','SE','A função SE serve para...', 'devolver resultados diferentes conforme uma condição.', ['guardar dados permanentemente.','criar uma nota de rodapé.','ligar redes diferentes.']);
mc('Folha de cálculo','Filtros','Os filtros numa folha de cálculo servem para...', 'mostrar apenas os dados que cumprem certos critérios.', ['apagar automaticamente todos os dados.','aumentar a velocidade da CPU.','criar uma ligação Wi-Fi.']);
mc('Folha de cálculo','Formatação condicional','A formatação condicional serve para...', 'aplicar formatação automática quando uma condição é cumprida.', ['escrever código Java.','traduzir endereços DNS.','criar um cabo coaxial.']);
mc('Folha de cálculo','Tabelas dinâmicas','Uma tabela dinâmica serve para...', 'resumir e analisar grandes conjuntos de dados.', ['enviar páginas para a impressora.','criar uma palavra-passe.','definir a altura do monitor.']);
mc('Folha de cálculo','Gráficos dinâmicos','Um gráfico dinâmico é útil para...', 'visualizar dados resumidos de forma gráfica.', ['guardar energia da fonte de alimentação.','filtrar tráfego numa firewall.','abrir um ficheiro .java.']);
sh('Folha de cálculo','CONTAR.SE','Para que serve a função CONTAR.SE?', 'Conta valores que obedecem a uma condição.', ['conta','valores','condição']);
lo('Folha de cálculo','Filtros e formatação condicional','Explica a diferença entre filtros e formatação condicional.', 'Filtros mostram apenas dados que cumprem critérios; formatação condicional destaca/formatta dados automaticamente quando uma condição é cumprida.', ['filtros','mostrar','critérios','formatação condicional','destaca','condição']);
// Redes
mc('Conexões de rede / Rede local','Rede de computadores','Uma rede de computadores é...', 'um conjunto de dispositivos ligados para partilhar dados, recursos e serviços.', ['um único computador sem ligação.','um programa de processamento de texto.','uma função de média no Excel.']);
mc('Conexões de rede / Rede local','LAN','LAN significa...', 'rede local, como numa casa, escola ou empresa.', ['rede mundial de grande área.','rede só por satélite.','um servidor de impressão.']);
mc('Conexões de rede / Rede local','WAN','WAN é uma rede...', 'de grande área, como a Internet.', ['limitada a uma sala.','apenas com Bluetooth.','que só liga impressoras.']);
mc('Conexões de rede / Rede local','WLAN','WLAN está associada a...', 'rede local sem fios/Wi-Fi.', ['rede por cabo coaxial obrigatória.','memória ROM.','tabela dinâmica.']);
mc('Conexões de rede / Rede local','MAN','MAN é uma rede...', 'metropolitana, normalmente ao nível de uma cidade.', ['local dentro de uma sala.','de memória do processador.','de notas de rodapé.']);
mc('Conexões de rede / Rede local','Topologia estrela','Na topologia estrela, os dispositivos ligam-se geralmente a...', 'um equipamento central, como um switch.', ['um único cabo linear sem centro.','dois vizinhos formando anel.','um documento de texto.']);
mc('Conexões de rede / Rede local','Topologia barramento','Na topologia barramento, os computadores ligam-se...', 'a um cabo principal comum.', ['a um ponto central obrigatório.','a uma tabela dinâmica.','a um servidor DNS apenas.']);
mc('Conexões de rede / Rede local','Topologia anel','Na topologia anel, os dispositivos...', 'ligam-se a dois vizinhos formando um círculo.', ['ligam-se sempre só por Wi-Fi.','não comunicam entre si.','substituem a memória RAM.']);
mc('Conexões de rede / Rede local','Switch','Um switch serve para...', 'ligar vários dispositivos numa rede local.', ['traduzir nomes em endereços IP.','atribuir IPs automaticamente.','proteger contra vírus sozinho.']);
mc('Conexões de rede / Rede local','Router','Um router serve para...', 'ligar redes diferentes e encaminhar tráfego, incluindo acesso à Internet.', ['armazenar texto em colunas.','fazer cálculos de média.','formatar células.']);
mc('Conexões de rede / Rede local','Access Point','Um access point serve para...', 'fornecer acesso Wi-Fi a uma rede.', ['guardar dados permanentemente.','criar cabeçalhos no Word.','calcular a função SE.']);
mc('Conexões de rede / Rede local','Modem','Um modem está associado a...', 'ligar a rede do utilizador ao operador/fornecedor de Internet.', ['dividir texto em colunas.','criar notas de rodapé.','guardar variáveis temporárias da CPU.']);
mc('Conexões de rede / Rede local','Firewall','Uma firewall serve para...', 'filtrar tráfego e ajudar a proteger a rede.', ['atribuir IPs automaticamente.','traduzir nomes de domínio.','formatar uma tabela no Word.']);
mc('Conexões de rede / Rede local','DHCP','O servidor DHCP serve para...', 'atribuir endereços IP automaticamente aos dispositivos.', ['traduzir nomes em IP.','guardar documentos Word.','mostrar gráficos dinâmicos.']);
mc('Conexões de rede / Rede local','DNS','O servidor DNS serve para...', 'traduzir nomes de domínio em endereços IP.', ['atribuir IPs automaticamente.','ligar computadores por cabo.','resumir dados numa tabela dinâmica.']);
mc('Conexões de rede / Rede local','Servidor de ficheiros','Um servidor de ficheiros serve para...', 'guardar e partilhar ficheiros na rede.', ['enviar imagens para o monitor.','formatar texto em negrito.','executar a ULA.']);
mc('Conexões de rede / Rede local','Servidor de impressão','Um servidor de impressão serve para...', 'gerir impressoras e pedidos de impressão na rede.', ['traduzir nomes DNS.','dividir texto em colunas.','aumentar a RAM.']);
mc('Conexões de rede / Rede local','Servidor web','Um servidor web serve para...', 'alojar e disponibilizar páginas ou aplicações web.', ['criar um cabo de fibra.','substituir um teclado.','calcular a moda.']);
mc('Conexões de rede / Rede local','Cliente/servidor','Numa rede cliente/servidor...', 'os clientes pedem serviços a servidores.', ['todos os computadores têm sempre a mesma função sem servidor.','não existem recursos partilhados.','só há ligação por infravermelhos.']);
mc('Conexões de rede / Rede local','Ponto-a-ponto','Numa rede ponto-a-ponto...', 'os computadores podem partilhar recursos diretamente entre si.', ['há sempre um servidor central obrigatório.','não existe comunicação entre computadores.','só funciona com folhas de cálculo.']);
mc('Conexões de rede / Rede local','Cabo de par entrançado','O cabo de par entrançado é normalmente usado em...', 'ligações Ethernet de rede local.', ['notas de rodapé.','tabelas dinâmicas.','memória ROM.']);
mc('Conexões de rede / Rede local','Fibra ótica','A fibra ótica transmite dados através de...', 'luz e permite velocidades elevadas.', ['som mecânico.','papel impresso.','memória RAM.']);
mc('Conexões de rede / Rede local','Cabo coaxial','O cabo coaxial é um meio físico usado em algumas ligações de...', 'TV/internet ou redes mais antigas.', ['processamento de texto.','fórmulas de Excel.','programação orientada por objetos.']);
sh('Conexões de rede / Rede local','Meios físicos','Indica dois meios físicos de transmissão em redes.', 'Cabo de par entrançado e fibra ótica.', ['cabo','fibra','coaxial','wireless']);
lo('Conexões de rede / Rede local','Equipamentos de rede','Explica a diferença entre switch, router e access point.', 'O switch liga dispositivos numa LAN; o router liga redes diferentes e encaminha tráfego; o access point fornece acesso Wi-Fi.', ['switch','liga dispositivos','router','liga redes','access point','wi-fi']);
lo('Conexões de rede / Rede local','DHCP e DNS','Explica a diferença entre DHCP e DNS.', 'DHCP atribui IPs automaticamente; DNS traduz nomes de domínio em endereços IP.', ['dhcp','atribui ip','dns','traduz nomes','endereços ip']);
for (const q of infoQs) if (!hasId(q.id)) bank.push(q);
// 5) Limpar prompts em inglês restantes que peçam explicitamente criação de frase.
for (const q of bank) {
  if (q.area==='socio' && String(q.module||'').startsWith('Inglês')) {
    if (/escreve uma frase|cria uma frase|usa .* numa frase|como usarias/i.test(q.prompt||'')) {
      q.prompt = q.prompt.replace(/Escreve uma frase[^.?!]*[.?!]?/i, 'Indica o significado ou a regra pedida.');
      q.prompt = q.prompt.replace(/Cria uma frase[^.?!]*[.?!]?/i, 'Indica o significado ou a regra pedida.');
      q.prompt = q.prompt.replace(/Como usarias[^.?!]*[.?!]?/i, 'Indica o significado ou a regra pedida.');
    }
  }
}
// 6) Sanear opções duplicadas no banco.
for (const q of bank) {
  if (Array.isArray(q.options)) {
    const seen = new Set();
    const opts=[];
    for (const opt of q.options) {
      const n = norm(opt.text);
      if (!n || seen.has(n)) continue;
      seen.add(n); opts.push(opt);
    }
    q.options=opts;
  }
}
const output = '/* Banco de perguntas PAF - alinhado com a matriz, revisões e avaliações. Opções baralhadas em cada exame; modo escrito usa perguntas próprias; rubricas humanas. */\nwindow.PAF_QUESTION_BANK = ' + JSON.stringify(bank,null,2) + ';\n';
fs.writeFileSync('question-bank.js', output);
console.log('Total', bank.length);
const stats={}; for (const q of bank.filter(q=>q.area==='info')) stats[q.module]=(stats[q.module]||0)+1; console.log(stats);
console.log('xenofobia', bank.filter(q=>/xenofobia/i.test(JSON.stringify(q))).length);
console.log('bad english', bank.filter(q=>q.area==='socio' && String(q.module||'').startsWith('Inglês') && /escreve uma frase|cria uma frase|como usarias|usa .* numa frase/i.test(q.prompt||'')).length);
