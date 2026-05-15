const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('question-bank.js', 'utf8');
const ctx = { window: {} };
vm.runInNewContext(code, ctx);
let B = ctx.window.PAF_QUESTION_BANK;

function hasId(id){ return B.some(q=>q.id===id); }
function add(q){ if(!hasId(q.id)) B.push(q); }
function mc(id, area, module, topic, prompt, correct, wrongs, difficulty=3, explanation='Pergunta alinhada com as revisões/matriz da PAF.'){
  add({ id, area, module, topic, type:'mc', prompt, difficulty, estimate:75, weight:1, correctAnswer:correct, explanation,
    options: [{text:correct, correct:true}, ...wrongs.map(w=>({text:w, correct:false}))],
    keywords:[correct], trap:false });
}
function multi(id, area, module, topic, prompt, corrects, wrongs, difficulty=4, explanation='Pergunta com rasteira: assinala apenas o que corresponde ao enunciado.'){
  add({ id, area, module, topic, type:'multi', prompt, difficulty, estimate:110, weight:1.2, correctAnswer:corrects.join('; '), explanation,
    options: [...corrects.map(w=>({text:w, correct:true})), ...wrongs.map(w=>({text:w, correct:false}))],
    keywords:corrects, trap:true });
}
function number(id, area, module, topic, prompt, numericAnswer, correctAnswer, unit, tolerance, rounding, difficulty=4, explanation='Resolve com atenção ao arredondamento indicado no enunciado.'){
  add({ id, area, module, topic, type:'number', prompt, difficulty, estimate:160, weight:1.4, numericAnswer, correctAnswer, unit, tolerance, rounding, explanation,
    keywords:[String(numericAnswer)] });
}
function long(id, area, module, topic, prompt, correctAnswer, rubric, difficulty=4, weight=1.5, explanation='Pergunta retirada das revisões de Sociocultural. Responde pelas ideias principais, não precisas usar exatamente as mesmas palavras.'){
  add({ id, area, module, topic, type:'long', prompt, difficulty, estimate:160, weight, correctAnswer, explanation, keywords: rubric.flatMap(r=>r.terms || []), rubric, core:true, humanGrading:true });
}

// Marca a pergunta de Cultura como núcleo certo das revisões de Sociocultural (pergunta 33).
long('QBSOC0033','socio','Culturas, Etnias e Diversidades','Cultura','O que se entende por cultura?',
  'Cultura é o conjunto de saberes, conhecimentos, valores, tradições, usos, costumes, normas e regras de um determinado grupo social.',
  [
    {label:'conjunto de saberes/conhecimentos', terms:['conjunto de saberes','conhecimentos','saberes']},
    {label:'valores/tradições/costumes', terms:['valores','tradições','usos e costumes','costumes']},
    {label:'normas/regras', terms:['normas','regras']},
    {label:'grupo social', terms:['grupo social','determinado grupo','comunidade']}
  ], 3, 1.5);

// Mais perguntas práticas/focadas para a avaliação de HTML/site final.
const htmlMod = 'Criação de páginas Web em hipertexto';
mc('QBHTML001','info',htmlMod,'Site com três páginas','Na avaliação de criação de páginas web, o site deve ter no mínimo...', 'três páginas', ['uma página apenas','duas páginas','cinco bases de dados'], 2, 'O enunciado da avaliação de HTML pede um site com no mínimo três páginas.');
mc('QBHTML002','info',htmlMod,'Navegação do site','No site “Andar de Mota”, os links Início, Galeria e Tabela pertencem principalmente à...', 'barra/menu de navegação', ['tabela de dados','galeria de imagens','folha de estilos externa'], 2);
mc('QBHTML003','info',htmlMod,'CSS externo','No site enviado, o ficheiro estilo.css é ligado às páginas HTML através de...', '<link rel="stylesheet" href="estilo.css">', ['<script src="estilo.css"></script>','<img src="estilo.css">','<a href="estilo.css">CSS</a>'], 3);
mc('QBHTML004','info',htmlMod,'Galeria','Numa página de galeria, a combinação mais correta para imagem com legenda é...', '<figure> com <img> e <figcaption>', ['<table> com <audio>','<header> com <iframe>','<form> com <input>'], 3);
mc('QBHTML005','info',htmlMod,'Vídeo local','Para inserir um vídeo local numa página HTML, a tag mais adequada é...', '<video controls><source src="media/mota_video.mp4"></video>', ['<audio controls><source src="media/mota_video.mp4"></audio>','<link href="media/mota_video.mp4">','<table src="media/mota_video.mp4">'], 3);
mc('QBHTML006','info',htmlMod,'Áudio local','Para inserir um ficheiro de áudio local, deve usar-se...', '<audio controls> com <source>', ['<img> com src de áudio','<nav> com href de áudio','<thead> com controls'], 3);
mc('QBHTML007','info',htmlMod,'Tabela HTML','Na página tabela.html, os títulos “Tipo”, “Utilização” e “Vantagem” devem estar em células...', '<th>', ['<td> obrigatoriamente sem cabeçalho','<img>','<audio>'], 2);
mc('QBHTML008','info',htmlMod,'Estrutura de tabela','Numa tabela HTML, uma linha é criada com...', '<tr>', ['<td>','<th>','<nav>'], 2);
mc('QBHTML009','info',htmlMod,'Célula de tabela','Numa tabela HTML, uma célula normal de dados é criada com...', '<td>', ['<tr>','<thead>','<figure>'], 2);
mc('QBHTML010','info',htmlMod,'Responsividade','A linha <meta name="viewport" content="width=device-width, initial-scale=1.0"> serve principalmente para...', 'ajudar a página a adaptar-se ao ecrã, especialmente no telemóvel', ['criar uma base de dados MySQL','tocar áudio automaticamente','substituir a tag body'], 3);
mc('QBHTML011','info',htmlMod,'alt da imagem','O atributo alt numa imagem serve principalmente para...', 'descrever a imagem quando ela não carrega ou para acessibilidade', ['mudar a cor do fundo','criar uma ligação à base de dados','definir o tamanho da tabela'], 3);
mc('QBHTML012','info',htmlMod,'Semântica HTML','No teu site, o elemento <header> é usado para...', 'cabeçalho/título inicial da página', ['guardar dados de formulário','criar uma linha de tabela','mostrar apenas ficheiros de áudio'], 2);
mc('QBHTML013','info',htmlMod,'Menu nav','O elemento <nav> deve ser usado para...', 'agrupar links de navegação do site', ['definir uma imagem da galeria','criar uma coluna da tabela','calcular médias'], 2);
mc('QBHTML014','info',htmlMod,'Listas','Na página inicial, uma lista de vantagens pode ser feita com...', '<ul> e <li>', ['<table> e <source>','<audio> e <video>','<meta> e <title>'], 2);
mc('QBHTML015','info',htmlMod,'CSS classes','No CSS, o seletor .caixa aplica estilos a...', 'todos os elementos com class="caixa"', ['todos os ficheiros chamados caixa.html','apenas ao id="caixa"','todas as imagens da pasta imagens'], 3);
mc('QBHTML016','info',htmlMod,'CSS id vs class','Em CSS, uma classe começa por . e um id começa por...', '#', ['@','/','* obrigatoriamente'], 3);
mc('QBHTML017','info',htmlMod,'Galeria responsiva','A propriedade grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) ajuda a...', 'criar uma grelha responsiva de imagens', ['ligar a base de dados','tocar áudio no navegador','calcular a média das linhas'], 4);
mc('QBHTML018','info',htmlMod,'object-fit','Na galeria, object-fit: cover serve para...', 'preencher o espaço da imagem sem deformar, podendo cortar parte da imagem', ['criar uma ligação entre páginas','alterar a base de dados','fazer download do vídeo'], 4);
mc('QBHTML019','info',htmlMod,'border-collapse','Em tabelas, border-collapse: collapse serve para...', 'juntar as bordas da tabela e das células', ['criar cabeçalhos automáticos','aumentar a velocidade do vídeo','apagar linhas da tabela'], 3);
mc('QBHTML020','info',htmlMod,'iframe vs video','Se o vídeo está guardado localmente na pasta media, a solução HTML mais correta é geralmente...', 'usar <video controls> com <source>', ['usar apenas <iframe> sem source','guardar o vídeo dentro do CSS','usar <table controls>'], 4);
multi('QBHTML021','info',htmlMod,'Requisitos da avaliação HTML','Assinala apenas requisitos pedidos na avaliação de criação de páginas web.', ['mínimo de três páginas','pelo menos uma tabela','pelo menos uma galeria de imagens','barra ou botões de navegação'], ['programa em C com scanf','classe Java com extends','consulta SQL com UPDATE obrigatório'], 4, 'A avaliação de HTML pedia site com várias páginas, tabela, galeria e navegação.');
multi('QBHTML022','info',htmlMod,'Multimédia no site','Assinala os elementos multimédia pedidos no trabalho de HTML.', ['pelo menos um vídeo','pelo menos um áudio'], ['obrigatoriamente um ficheiro .jar','obrigatoriamente uma função scanf','obrigatoriamente uma stored procedure'], 3);
multi('QBHTML023','info',htmlMod,'Boas práticas do site','Assinala boas práticas para o site “Andar de Mota”.', ['usar alt nas imagens','ter menu igual nas páginas','usar CSS externo','organizar ficheiros em pastas como imagens e media'], ['meter todo o texto dentro de <title>','usar apenas uma página se houver galeria','retirar o viewport para telemóvel'], 4);

// Perguntas de Scripts CGI/MySQL ligadas ao enunciado de página dinâmica e BD.
const sqlMod = 'Scripts CGI e folhas de estilo';
mc('QBSQL001','info',sqlMod,'Projeto web dinâmico','Na avaliação de Scripts CGI/folhas de estilo, além da pasta do projeto, era pedido entregar também...', 'imagem da página Web em .jpg e BD MySQL em .sql', ['apenas um ficheiro .class','apenas um áudio .ogg','um ficheiro .c e uma imagem da consola'], 3, 'O enunciado de Scripts CGI pede projeto compactado, imagem da página Web e base de dados MySQL em .sql.');
mc('QBSQL002','info',sqlMod,'POST formulário','Num formulário com dados pessoais, o método mais adequado costuma ser...', 'POST', ['GET para tudo','DELETE no atributo method','CSS'], 3);
mc('QBSQL003','info',sqlMod,'Dados por URL','O método que envia os dados pela URL é...', 'GET', ['POST','PRIMARY KEY','localhost'], 3);
mc('QBSQL004','info',sqlMod,'INSERT','Para inserir um novo contacto vindo de um formulário numa tabela MySQL, usa-se...', 'INSERT INTO', ['SELECT FROM','DELETE sem WHERE','ORDER BY apenas'], 3);
mc('QBSQL005','info',sqlMod,'Prepared statements','Para evitar SQL Injection, a melhor prática é...', 'validar dados e usar consultas preparadas', ['concatenar diretamente tudo que vem do formulário','retirar a chave primária','usar sempre GET'], 4);

// Mais exercícios automáticos de Matemática/Física/Química, próximos dos apontamentos.
number('QBMFC001','mfc','Movimentos e Forças','Aceleração por gráfico','Num gráfico v=f(t), a velocidade passa de 2 m/s para 14 m/s entre t=1 s e t=5 s. Calcula a aceleração.', 3, '3 m/s²', 'm/s²', 0.05, 'Resultado exato ou às centésimas.', 4);
number('QBMFC002','mfc','Movimentos e Forças','Aceleração negativa','Num gráfico v=f(t), a velocidade passa de 18 m/s para 6 m/s entre t=2 s e t=8 s. Calcula a aceleração.', -2, '-2 m/s²', 'm/s²', 0.05, 'Resultado exato.', 4);
number('QBMFC003','mfc','Movimentos e Forças','Aceleração nula','Num gráfico v=f(t), a velocidade mantém-se em 7 m/s entre t=0 s e t=10 s. Calcula a aceleração.', 0, '0 m/s²', 'm/s²', 0.05, 'Resultado exato.', 2);
mc('QBMFC004','mfc','Movimentos e Forças','Tipo de movimento','Num gráfico v=f(t), se a reta é horizontal, o movimento tem...', 'velocidade constante e aceleração nula', ['velocidade sempre negativa','aceleração sempre positiva','velocidade igual a zero obrigatoriamente'], 3);
mc('QBMFC005','mfc','Movimentos e Forças','Gráfico a=f(t)','Se no gráfico v=f(t) a velocidade aumenta sempre com declive constante, o gráfico a=f(t) correspondente é...', 'uma linha horizontal acima de zero', ['uma linha horizontal em zero','uma linha horizontal abaixo de zero','uma parábola'], 4);
number('QBMFC006','mfc','Movimentos Ondulatórios','Frequência','Uma onda tem período T = 0,25 s. Calcula a frequência.', 4, '4 Hz', 'Hz', 0.05, 'Resultado exato.', 3);
number('QBMFC007','mfc','Movimentos Ondulatórios','Período','Uma onda tem frequência f = 5 Hz. Calcula o período.', 0.2, '0,2 s', 's', 0.01, 'Arredonda às décimas.', 3);
number('QBMFC008','mfc','Movimentos Ondulatórios','Velocidade da onda','Uma onda tem comprimento de onda λ = 3 m e frequência f = 6 Hz. Calcula a velocidade de propagação.', 18, '18 m/s', 'm/s', 0.05, 'Resultado exato.', 3);
mc('QBMFC009','mfc','Movimentos Ondulatórios','Grandezas de onda','A amplitude de uma onda corresponde...', 'ao afastamento máximo em relação à posição de equilíbrio', ['ao tempo de uma oscilação completa','ao número de oscilações por segundo','à distância entre dois pontos iguais consecutivos'], 3);
mc('QBMFC010','mfc','Movimentos Ondulatórios','Comprimento de onda','O comprimento de onda é...', 'a distância entre dois pontos equivalentes consecutivos da onda', ['o número de oscilações por segundo','o tempo de uma oscilação','a altura máxima da onda'], 3);
number('QBMFC011','mfc','Organização, Análise da Informação e Probabilidades','Média com tabela','Numa turma, as notas foram 8, 12, 14, 16 e 20. Calcula a média.', 14, '14', '', 0.05, 'Resultado exato.', 3);
number('QBMFC012','mfc','Organização, Análise da Informação e Probabilidades','Mediana par','Calcula a mediana dos valores 4, 8, 9, 13, 14, 20.', 11, '11', '', 0.05, 'Resultado exato.', 3);
mc('QBMFC013','mfc','Organização, Análise da Informação e Probabilidades','Moda','Nos dados 2, 3, 3, 4, 6, 6, 6, 8, a moda é...', '6', ['3','4','não existe moda'], 2);
number('QBMFC014','mfc','Organização, Análise da Informação e Probabilidades','Probabilidade','Num saco há 5 bolas azuis, 3 vermelhas e 2 verdes. Qual a probabilidade de sair uma bola vermelha?', 0.3, '3/10 = 0,3 = 30%', '', 0.01, 'Podes responder em decimal; arredonda às décimas se necessário.', 3);
number('QBMFC015','mfc','Organização, Análise da Informação e Probabilidades','Probabilidade percentagem','Num dado equilibrado, qual a probabilidade de sair número maior que 4?', 33.33, '2/6 = 1/3 ≈ 33,33%', '%', 0.2, 'Responde em percentagem, arredondada às centésimas.', 3);
mc('QBMFC016','mfc','Operações Numéricas e Estimação','Potência produto','Simplifica: 3^4 × 3^2', '3^6', ['3^8','6^6','3^2'], 3);
mc('QBMFC017','mfc','Operações Numéricas e Estimação','Potência quociente','Simplifica: 7^9 / 7^4', '7^5', ['7^13','1^5','7^36'], 3);
mc('QBMFC018','mfc','Operações Numéricas e Estimação','Expoente negativo','Simplifica: 2^-3', '1/8', ['8','-8','1/6'], 3);
mc('QBMFC019','mfc','Operações Numéricas e Estimação','Notação científica','Qual é a escrita correta de 0,00045 em notação científica?', '4,5 × 10^-4', ['45 × 10^-4','4,5 × 10^4','0,45 × 10^-3'], 3);
mc('QBMFC020','mfc','Operações Numéricas e Estimação','Comparação científica','Qual é maior?', '7,9 × 10^8', ['5 × 10^6','3 × 10^8','3,89 × 10^7'], 3);
number('QBMFC021','mfc','Funções, Limites e Cálculo Diferencial','Função valor','Para f(x)=10x²+x-2, calcula f(2).', 40, '40', '', 0.05, 'Resultado exato.', 3);
number('QBMFC022','mfc','Funções, Limites e Cálculo Diferencial','Zero de função linear','Para f(x)=3x-9, calcula o zero da função.', 3, 'x = 3', '', 0.05, 'Resultado exato.', 3);
mc('QBMFC023','mfc','Funções, Limites e Cálculo Diferencial','Concavidade','Na função f(x)=2x²-3x+1, a parábola tem concavidade...', 'voltada para cima, porque a>0', ['voltada para baixo, porque a>0','nula, porque b<0','sempre igual a zero'], 3);
number('QBMFC024','mfc','Funções, Limites e Cálculo Diferencial','Discriminante','Na equação x²-5x+6=0, calcula o discriminante Δ.', 1, 'Δ = 1', '', 0.05, 'Resultado exato.', 3);
mc('QBMFC025','mfc','Funções, Limites e Cálculo Diferencial','Inequação 2º grau','A inequação x²-4 < 0 tem solução...', ']-2, 2[', [']-∞, -2[ ∪ ]2, +∞[','{-2,2}','[2,+∞['], 4);
mc('QBMFC026','mfc','Hidrocarbonetos','Hidrocarboneto','Um hidrocarboneto é formado apenas por...', 'carbono e hidrogénio', ['carbono e oxigénio','hidrogénio e azoto','ferro e carbono'], 2);
mc('QBMFC027','mfc','Hidrocarbonetos','Nomenclatura','C3H8 chama-se...', 'propano', ['etano','metano','butano'], 2);
mc('QBMFC028','mfc','Hidrocarbonetos','Ligação dupla','O sufixo usado para hidrocarbonetos com ligação dupla é...', '-eno', ['-ano','-ino','-ol'], 3);

// Pequenas perguntas teóricas extra para informática, mas com distratores do mesmo tema.
mc('QBINFO001','info','Processador de texto','Nota de rodapé','Uma nota de rodapé serve principalmente para...', 'explicar ou referenciar informação no fundo da página', ['criar uma fórmula numa célula','traduzir nomes de domínio em IP','compilar código Java'], 3);
mc('QBINFO002','info','Processador de texto','Cabeçalho','O cabeçalho de um documento aparece normalmente...', 'no topo das páginas', ['no fundo da página apenas','dentro de uma célula A1','na porta do router'], 2);
mc('QBINFO003','info','Folha de cálculo','Fórmula','Numa folha de cálculo, uma fórmula começa normalmente por...', '=', ['#','//','<html>'], 2);
mc('QBINFO004','info','Folha de cálculo','MÉDIA','A função MÉDIA(A1:A5) serve para...', 'calcular a média dos valores de A1 até A5', ['somar apenas textos','filtrar linhas da rede','criar uma chave primária'], 3);
mc('QBINFO005','info','Folha de cálculo','Filtro','Um filtro numa folha de cálculo serve para...', 'mostrar apenas dados que cumprem certos critérios', ['apagar definitivamente todos os dados','criar uma classe Java','atribuir IP automaticamente'], 3);

// Ajustes a algumas perguntas existentes com respostas no tópico: não removemos a matéria, mas os tópicos deixam de revelar diretamente a resposta quando usados em relatórios antigos.
for (const q of B) {
  if (q.id === 'V4Q0017') q.topic = 'Ilhas do Porto: causa histórica';
  if (q.id === 'V4Q0441') q.topic = 'Numeração de páginas';
  if (q.id === 'V4Q0445') q.topic = 'Função principal em C';
  if (q.id === 'V4Q0446') q.topic = 'Função principal em Java';
  if (q.id === 'V4Q0452') q.topic = 'Filtro em SQL';
  if (q.id === 'V4Q0461') q.topic = 'Serviço de nomes em rede';
  if (q.id === 'V4Q0463') q.topic = 'Proteção de rede';
  if (q.id === 'V4Q0222') q.topic = 'Título principal em HTML';
  if (q.id === 'V4Q0199') q.topic = 'Característica em POO';
  if (q.id === 'V4Q0209') q.topic = 'Evento de botão Swing';
}

// Converter prefixo/versão
const out = '/* Banco de perguntas PAF  - alinhado com a matriz, revisões e site final. Opções baralhadas em cada exame; títulos não revelam resposta; rubricas humanas. */\nwindow.PAF_QUESTION_BANK = ' + JSON.stringify(B, null, 2) + ';\n';
fs.writeFileSync('question-bank.js', out);
console.log('updated', B.length, 'questions');
console.log('core socio', B.filter(q=>q.area==='socio'&&q.core).length);
