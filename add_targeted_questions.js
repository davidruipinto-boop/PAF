const fs = require('fs');
global.window = {};
require('./question-bank.js');
const bank = window.PAF_QUESTION_BANK;
const existing = new Set(bank.map(q => q.id));
const sigs = new Set(bank.map(q => `${q.area}|${q.module}|${q.prompt}`));
let seq = 1;
function id(){ while(existing.has(`MELHORIA${String(seq).padStart(4,'0')}`)) seq++; const v=`MELHORIA${String(seq).padStart(4,'0')}`; existing.add(v); seq++; return v; }
function add(area,module,topic,prompt,correct,distractors,difficulty=3, explanation='Pergunta criada para treinar a matriz da PAF com respostas próximas do mesmo tema.'){
  const sig = `${area}|${module}|${prompt}`;
  if(sigs.has(sig)) return;
  sigs.add(sig);
  bank.push({
    id:id(), area,module,topic,type:'mc',prompt,difficulty,estimate:70,weight:1,
    correctAnswer:correct, explanation,
    options:[{text:correct,correct:true}, ...distractors.slice(0,3).map(text=>({text,correct:false}))],
    keywords: correct.toLowerCase().split(/\W+/).filter(x=>x.length>3).slice(0,8)
  });
}
function addShort(area,module,topic,prompt,answer,keywords,difficulty=3){
  const sig = `${area}|${module}|${prompt}`;
  if(sigs.has(sig)) return;
  sigs.add(sig);
  bank.push({id:id(),area,module,topic,type:'short',prompt,difficulty,estimate:80,weight:1,correctAnswer:answer,explanation:'Resposta curta de treino alinhada com a matriz da PAF.',keywords});
}

// Sociocultural extra, sempre dentro dos módulos reais
const socio = [
 ['Culturas Etnias e Diversidades','Xenofobia','O que é xenofobia?','Rejeição, medo ou hostilidade contra pessoas estrangeiras ou consideradas de fora.',['Discriminação baseada na cor da pele ou origem étnica.','Conjunto de valores, tradições e costumes de um grupo.','Grupo humano definido por afinidades culturais e linguísticas.']],
 ['Culturas Etnias e Diversidades','Racismo','O que é racismo?','Discriminação ou preconceito baseado na cor da pele, origem étnica ou características físicas.',['Rejeição de pessoas estrangeiras por serem de fora.','Conjunto de saberes e costumes de um grupo social.','Comunidade com afinidades linguísticas e culturais.']],
 ['Culturas Etnias e Diversidades','Cultura','Qual destas definições corresponde melhor a cultura?','Conjunto de saberes, valores, tradições, regras, usos e costumes de um grupo social.',['Grupo humano com afinidades culturais, sociais e territoriais.','Rejeição ou hostilidade contra estrangeiros.','Discriminação baseada na cor da pele ou origem étnica.']],
 ['Ler a Imprensa Escrita','Pirâmide invertida','A técnica da pirâmide invertida consiste em...','Apresentar a informação mais importante no início da notícia e os detalhes depois.',['Escrever primeiro a opinião do jornalista e só depois os factos.','Organizar a notícia sempre em perguntas e respostas.','Guardar a informação principal para o último parágrafo.']],
 ['Mudanças Profissionais e Mercado de Trabalho','Empregabilidade','Empregabilidade é...','Capacidade de conseguir, manter ou mudar de emprego graças a competências, formação e atitude.',['Percentagem de pessoas empregadas numa população.','Documento usado para apresentar experiência profissional.','Conjunto de pessoas sem emprego e à procura de trabalho.']],
 ['Portugal e a sua História','Arquitetura século XIX','No final do século XIX, os materiais associados à arquitetura moderna em Portugal foram...','ferro, vidro e cimento.',['madeira, barro e palha.','ouro, prata e cobre.','plástico, borracha e nylon.']],
 ['Uma nova ordem económica mundial','Globalização','Globalização significa...','aproximação e interdependência entre países, economias, culturas e pessoas.',['divisão do mundo em dois blocos ideológicos rivais.','lei fundamental que organiza um Estado.','entrada de Portugal na Comunidade Económica Europeia.']],
 ['Promoção da Saúde','Roda dos Alimentos','A Roda dos Alimentos serve para...','orientar uma alimentação equilibrada, variada e em proporções adequadas.',['indicar os órgãos de soberania de um país.','calcular a taxa de emprego.','explicar o funcionamento do mercado de trabalho.']],
 ['Higiene e prevenção no trabalho','Prevenção','Em higiene e segurança no trabalho, prevenção é...','conjunto de medidas usadas para evitar acidentes e doenças profissionais.',['consequência negativa resultante de um acidente.','probabilidade de um perigo causar dano.','fonte ou situação com potencial para causar dano.']]
];
for (const [m,t,p,c,d] of socio) add('socio',m,t,p,c,d,3);

// Inglês: mais perguntas de significado/regra, não criação livre de frases
const engDaily = [
 ['Daily routine','What does “wake up” mean?','acordar',['levantar-se','tomar o pequeno-almoço','ir para a escola']],
 ['Daily routine','What does “get up” mean?','levantar-se',['acordar','almoçar','ir para casa']],
 ['Daily routine','What does “have breakfast” mean?','tomar o pequeno-almoço',['jantar','almoçar','estudar']],
 ['Simple Present','Simple Present is mainly used for...','habits, routines and general facts.',['actions happening only at this exact moment.','imaginary situations in the past.','completed actions with a fixed past time.']],
 ['Simple Present','Which auxiliary is used in questions with “she/he/it”?','Does',['Do','Did','Will']],
 ['Simple Present','Which negative form is correct for “she”?','She does not / doesn’t work.',['She do not work.','She not works.','She did not works.']],
 ['Simple Present','In the 3rd person singular, the verb usually...','takes -s or -es.',['loses the final letter.','takes will before it.','goes to the past simple.']]
];
for (const [t,p,c,d] of engDaily) add('socio','Inglês - Daily routine / Simple Present',t,p,c,d,2);
const engIf = [
 ['If-clauses','Zero conditional is used for...','general truths or facts.',['unlikely imaginary situations.','future promises only.','actions completed in the past.']],
 ['If-clauses','First conditional structure is...','If + present simple, will + verb.',['If + past simple, would + verb.','If + present simple, present simple.','If + past perfect, would have + past participle.']],
 ['If-clauses','Second conditional is used for...','imaginary or unlikely situations.',['daily routines.','scientific facts only.','certain future situations.']],
 ['If-clauses','In “If it rains, I will stay home”, the conditional is...','first conditional.',['zero conditional.','second conditional.','passive voice.']],
 ['If-clauses','In “If you heat water, it boils”, the conditional is...','zero conditional.',['first conditional.','second conditional.','present perfect.']]
];
for (const [t,p,c,d] of engIf) add('socio','Inglês - If-clauses',t,p,c,d,3);
const engAdj = [
 ['Comparative','The comparative of “small” is...','smaller',['the smallest','more small','smallest']],
 ['Comparative','For long adjectives, the comparative usually uses...','more + adjective',['the + adjective + est','will + adjective','does + adjective']],
 ['Superlative','The superlative of “good” is...','the best',['better','the goodest','more good']],
 ['Superlative','A superlative is used to compare...','one element with a whole group.',['only two elements.','a verb with a noun.','an action in the past.']],
 ['Comparative','Which form is correct?','Portugal is smaller than Spain.',['Portugal is more small than Spain.','Portugal is the smaller than Spain.','Portugal smaller Spain.']]
];
for (const [t,p,c,d] of engAdj) add('socio','Inglês - Viajar na Europa / Graus dos adjetivos',t,p,c,d,3);
const engJob = [
 ['Job vocabulary','What does “salary” mean?','salário',['entrevista','empregador','experiência']],
 ['Job vocabulary','What does “interview” mean?','entrevista',['salário','candidatura','competências']],
 ['Job vocabulary','What does “employer” mean?','empregador',['empregado/trabalhador','currículo','carreira']],
 ['Passive Voice','Passive voice structure is usually...','to be + past participle.',['do/does + verb.','if + present simple.','subject + verb + object only.']],
 ['Passive Voice','In passive voice, the focus is mainly on...','the action or object affected by the action.',['the person who speaks.','the time expression at the end.','the adjective being compared.']],
 ['Passive Voice','“Computers are repaired” is in...','simple present passive.',['simple past passive.','present perfect passive.','future passive.']]
];
for (const [t,p,c,d] of engJob) add('socio','Inglês - Profissão / Passive Voice',t,p,c,d,3);
const engWord = [
 ['Word order','Normal English word order is...','Subject + Verb + Object + Place + Time.',['Verb + Subject + Time + Object + Place.','Object + Subject + Verb + Time + Place.','Time + Place + Object + Verb + Subject.']],
 ['Word order','In English, place usually comes...','before time.',['after time.','before the subject.','between auxiliary and verb.']],
 ['Word order','In questions, English normally uses...','an auxiliary before the subject.',['the object before the verb.','the time expression first always.','no auxiliary in any case.']],
 ['Word order','In “I study English at school every day”, “at school” is...','place.',['subject','object','time']],
 ['Word order','In “I study English at school every day”, “every day” is...','time.',['object','verb','place']]
];
for (const [t,p,c,d] of engWord) add('socio','Inglês - Word order',t,p,c,d,3);

// Informática teórica pesada: arquitetura, texto, folha cálculo, redes. Pouco C/Java/HTML/SQL.
const infoArchitecture = [
 ['CPU','A CPU serve principalmente para...','executar instruções e processar dados.',['guardar ficheiros de forma permanente.','fornecer energia elétrica ao computador.','apresentar imagem no ecrã.']],
 ['RAM','A memória RAM é...','temporária, rápida e volátil.',['permanente e usada para guardar a BIOS.','um disco de armazenamento externo.','um periférico de saída.']],
 ['ROM','A memória ROM é usada para...','guardar instruções permanentes/básicas do sistema.',['guardar temporariamente programas abertos.','filtrar tráfego de rede.','formatar documentos de texto.']],
 ['Cache','A cache do processador serve para...','acelerar o acesso a dados usados com frequência.',['aumentar o tamanho físico do monitor.','substituir o disco rígido.','ligar computadores por Wi-Fi.']],
 ['ULA/ALU','A ULA/ALU é responsável por...','operações aritméticas e lógicas.',['controlar permissões de utilizador.','guardar ficheiros permanentemente.','imprimir documentos.']],
 ['Unidade de controlo','A unidade de controlo do processador...','coordena a execução das instruções.',['guarda documentos do utilizador.','fornece rede sem fios.','é uma folha de cálculo.']],
 ['Motherboard','A motherboard é...','a placa principal onde os componentes se ligam.',['uma memória temporária.','um programa de edição de texto.','um equipamento que traduz domínios em IP.']],
 ['Periféricos','O teclado é um periférico de...','entrada.',['saída.','armazenamento ótico.','processamento central.']]
];
for (const [t,p,c,d] of infoArchitecture) add('info','Arquitetura interna do computador',t,p,c,d,3);
const infoWord = [
 ['Cabeçalho','Num processador de texto, cabeçalho é...','zona superior repetida nas páginas.',['zona inferior repetida nas páginas.','explicação colocada no fundo da página.','divisão do texto em duas colunas.']],
 ['Rodapé','Num processador de texto, rodapé é...','zona inferior repetida nas páginas.',['zona superior repetida nas páginas.','primeira linha de uma tabela dinâmica.','fórmula iniciada por igual.']],
 ['Nota de rodapé','Uma nota de rodapé serve para...','colocar explicações ou referências no fundo da página.',['filtrar dados de uma tabela.','criar uma rede sem fios.','executar instruções do processador.']],
 ['Texto em colunas','Texto em colunas serve para...','organizar o texto em duas ou mais colunas.',['aplicar uma fórmula automática.','traduzir domínios em IP.','atribuir endereços IP automaticamente.']],
 ['Formatação de texto','Formatação de texto permite alterar...','tipo de letra, tamanho, alinhamento, negrito ou espaçamento.',['endereços IP e portas de rede.','o número de núcleos do processador.','a ligação entre clientes e servidores.']],
 ['Tabelas','Numa aplicação de texto, uma tabela serve para...','organizar informação em linhas e colunas.',['guardar dados na memória RAM.','encaminhar pacotes na rede.','comparar potências de base igual.']]
];
for (const [t,p,c,d] of infoWord) add('info','Processador de texto',t,p,c,d,2);
const infoCalc = [
 ['Célula','Numa folha de cálculo, uma célula é...','a interseção entre uma linha e uma coluna.',['um equipamento de rede.','uma zona inferior de uma página.','um tipo de memória permanente.']],
 ['Fórmulas','Numa folha de cálculo, uma fórmula começa normalmente por...','=',['#','<','@']],
 ['Função SOMA','A função SOMA serve para...','somar valores de um intervalo.',['calcular o maior valor de um intervalo.','contar apenas textos.','filtrar registos por uma condição.']],
 ['Função MÉDIA','A função MÉDIA serve para...','calcular a média dos valores selecionados.',['devolver sempre o valor mais alto.','contar linhas vazias.','formatar texto em colunas.']],
 ['Filtros','Os filtros numa folha de cálculo servem para...','mostrar apenas dados que cumprem determinada condição.',['apagar definitivamente os dados ocultos.','criar cabeçalhos em documentos de texto.','atribuir IPs numa rede local.']],
 ['Formatação condicional','A formatação condicional permite...','alterar automaticamente o aspeto das células conforme regras.',['somar todos os valores sem fórmula.','proteger uma rede contra ataques.','criar uma página HTML.']],
 ['Tabela dinâmica','Uma tabela dinâmica serve para...','resumir e organizar grandes quantidades de dados.',['iniciar a execução de um programa Java.','guardar instruções permanentes do computador.','ligar computadores em topologia anel.']],
 ['Gráfico dinâmico','Um gráfico dinâmico serve para...','representar visualmente dados resumidos de uma tabela dinâmica.',['introduzir texto no rodapé.','executar instruções em C.','traduzir nomes de domínio.']]
];
for (const [t,p,c,d] of infoCalc) add('info','Folha de cálculo',t,p,c,d,3);
const infoNet = [
 ['Rede de computadores','Uma rede de computadores é...','conjunto de dispositivos ligados para partilhar dados, recursos e serviços.',['um programa para formatar texto.','uma memória rápida dentro do processador.','uma fórmula de folha de cálculo.']],
 ['LAN','LAN é...','rede local, como uma rede de casa, escola ou empresa.',['rede de grande área, como a Internet.','rede sem fios de curto alcance apenas Bluetooth.','servidor que traduz domínios em IP.']],
 ['WAN','WAN é...','rede de grande área, como a Internet.',['rede local de uma sala.','memória permanente do computador.','programa para editar texto.']],
 ['WLAN','WLAN é...','rede local sem fios baseada em Wi-Fi.',['rede local sempre por cabo coaxial.','servidor de ficheiros.','comando SQL para consultar dados.']],
 ['Switch','Um switch serve para...','ligar vários dispositivos numa rede local.',['ligar redes diferentes à Internet.','traduzir nomes de domínio em IP.','atribuir IPs automaticamente.']],
 ['Router','Um router serve para...','ligar redes diferentes e encaminhar tráfego.',['apenas formatar texto em colunas.','guardar dados temporários do processador.','criar notas de rodapé.']],
 ['Access Point','Um access point serve para...','permitir acesso sem fios à rede.',['filtrar tráfego como regra de segurança.','calcular médias numa folha de cálculo.','guardar instruções permanentes.']],
 ['Firewall','Uma firewall serve para...','filtrar tráfego e ajudar a proteger a rede.',['atribuir IPs automaticamente.','ligar periféricos à motherboard.','aplicar cabeçalhos e rodapés.']],
 ['DHCP','DHCP serve para...','atribuir endereços IP automaticamente.',['traduzir nomes de domínio em IP.','ligar redes diferentes.','criar tabelas dinâmicas.']],
 ['DNS','DNS serve para...','traduzir nomes de domínio em endereços IP.',['atribuir IPs automaticamente.','filtrar tráfego de rede.','ligar computadores por cabo.']],
 ['Cliente/servidor','Numa rede cliente/servidor...','os clientes pedem serviços a servidores.',['todos os computadores têm sempre a mesma função sem servidor.','não existe partilha de recursos.','os dados só circulam por Bluetooth.']],
 ['Ponto-a-ponto','Numa rede ponto-a-ponto...','os computadores podem partilhar recursos diretamente entre si.',['há sempre um servidor central obrigatório.','só existe ligação por fibra ótica.','os clientes não comunicam entre si.']],
 ['Fibra ótica','A fibra ótica transmite dados através de...','luz.',['ondas sonoras no ar.','corrente elétrica no teclado.','tinta impressa no papel.']],
 ['Topologia estrela','Numa topologia em estrela, os dispositivos ligam-se a...','um equipamento central, como switch.',['um único cabo comum sem equipamento central.','um círculo fechado entre todos os dispositivos.','uma ligação apenas ponto-a-ponto entre dois computadores.']]
];
for (const [t,p,c,d] of infoNet) add('info','Conexões de rede / Rede local',t,p,c,d,3);

// Pequena cobertura dos módulos práticos, sem dominar o exame teórico
add('info','Programação em C/C++','Algoritmo','Em C/C++, um algoritmo é...','sequência de passos lógicos para resolver um problema.',['memória permanente do computador.','equipamento que liga redes diferentes.','zona inferior de um documento.'],2);
add('info','Programação em JAVA','Classe','Em Java/POO, uma classe é...','molde ou modelo usado para criar objetos.',['objeto concreto criado em memória.','botão de uma janela Swing.','função que calcula média no Excel.'],2);
add('info','Criação de páginas Web em hipertexto','HTML','HTML serve principalmente para...','estruturar o conteúdo de uma página web.',['formatar tabelas dinâmicas no Excel.','atribuir IPs automaticamente.','executar operações aritméticas na CPU.'],2);
add('info','Scripts CGI e folhas de estilo','Formulário Web','Um formulário web serve para...','recolher dados introduzidos pelo utilizador.',['traduzir domínios em IP.','ligar periféricos à motherboard.','calcular a mediana de uma amostra.'],2);

// Matemática/FQ: reforço de perguntas de clique sem fugir aos apontamentos/matriz
const mfc = [
 ['Movimentos e Forças','Aceleração','Num gráfico v=f(t), a aceleração corresponde a...','declive da reta.',['área total por baixo do gráfico.','valor máximo do eixo do tempo.','período de uma oscilação.']],
 ['Movimentos e Forças','Movimento uniforme','Se a velocidade é constante, a aceleração é...','0 m/s².',['positiva obrigatoriamente.','igual ao tempo.','igual à frequência.']],
 ['Movimentos Ondulatórios','Frequência','Frequência é...','número de oscilações por segundo.',['tempo de uma oscilação completa.','distância entre duas cristas consecutivas.','altura máxima da onda.']],
 ['Movimentos Ondulatórios','Período','Período é...','tempo de uma oscilação completa.',['número de oscilações por segundo.','velocidade de propagação da onda.','massa da fonte sonora.']],
 ['Compostos Orgânicos / Hidrocarbonetos','Hidrocarboneto','Um hidrocarboneto é formado apenas por...','carbono e hidrogénio.',['carbono e oxigénio.','hidrogénio e azoto.','enxofre e oxigénio.']],
 ['Organização, análise da informação e probabilidades','Mediana','A mediana é...','valor central depois de ordenar os dados.',['valor que aparece mais vezes.','soma dos valores a dividir pelo número de valores.','número de casos favoráveis.']],
 ['Operações Numéricas e Estimação','Potências','Na multiplicação de potências com a mesma base...','somam-se os expoentes.',['subtraem-se os expoentes.','multiplicam-se as bases e mantêm-se os expoentes.','os expoentes ficam sempre iguais a zero.']],
 ['Funções, Limites e Cálculo Diferencial','Zero da função','Um zero da função é...','valor de x para o qual f(x)=0.',['valor máximo da função.','valor mínimo da função.','valor que não pertence ao domínio.']]
];
for (const [m,t,p,c,d] of mfc) add('mfc',m,t,p,c,d,3);

fs.writeFileSync('question-bank.js', '/* Banco de perguntas PAF - alinhado com a matriz, revisões e avaliações. Opções baralhadas em cada exame; modo escrito usa perguntas próprias; rubricas humanas. */\nwindow.PAF_QUESTION_BANK = ' + JSON.stringify(bank, null, 2) + ';\n', 'utf8');
console.log('total', bank.length, 'added', seq-1);
