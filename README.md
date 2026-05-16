# Salão de Exames PAF

Abre `index.html` no navegador.

## Principais modos de treino

- `Misturado`: mantém o funcionamento normal, com perguntas de clicar, cálculo, resposta curta e resposta desenvolvida.
- `Só clicar`: transforma as perguntas em escolha múltipla/checkboxes para treinares no telemóvel sem escrever.
- `Só por extenso`: transforma as perguntas em respostas escritas para treinares memória, explicação e escrita completa.
- `Fazer o exame sem tempo`: mantém o tamanho normal do exame, mas desliga o contador para estudar sem pressão.

## O que está incluído

- Perguntas de Sociocultural baseadas nas revisões reais, com as 33 perguntas principais.
- Inglês reforçado e alinhado com a matriz: daily routine, simple present, if-clauses, graus dos adjetivos, job vocabulary, passive voice e word order.
- Matemática/Física/Química alinhada com a matriz e apontamentos: gráficos, aceleração, ondas, hidrocarbonetos, média, mediana, moda, probabilidades, potências, notação científica, funções, equações e inequações.
- Informática alinhada com a matriz, com reforço especial na teoria: arquitetura interna, processador de texto, folha de cálculo, redes/rede local, C/C++, Java, HTML/CSS e Scripts CGI/MySQL.
- Secção prática em `pratica.html` com C, Java, HTML, SQL/MySQL e PHP/MySQL.
- Fichas de consulta em `fichas/`, incluindo HTML Bootstrap, C, Java e SQL.

## Ficheiros principais

- `index.html` - exames teóricos.
- `question-bank.js` - banco de perguntas.
- `app.js` - lógica do exame, temporizador, modos de resposta e correção.
- `style.css` - tema escuro e adaptação para telemóvel.
- `pratica.html` - exercícios práticos.
- `fichas/HTML_BOOTSTRAP_BASE/` - site completo em Bootstrap sobre o Clube Tech Santarém, com 3+ páginas, tabela, galeria, vídeo, áudio e formulário.

## Nota importante

A correção das respostas abertas é automática e tenta corrigir por ideias principais. Serve para estudo, mas no exame real convém comparares sempre com a resposta esperada.


## Atualização de qualidade das escolhas múltiplas

- As respostas erradas foram reforçadas para serem do mesmo módulo/tema da pergunta.
- As opções de Informática teórica foram ajustadas para evitar escolhas óbvias ou fora do assunto.
- Foram removidas perguntas do tipo “explica como usarias/farias”; agora as perguntas pedem definição, identificação ou finalidade concreta.
- A navegação de revisão das respostas erradas/parciais já não fica presa no ecrã; acompanha a página normalmente.
- O layout foi ajustado para telemóvel, com melhor quebra de texto e comportamento em tabelas/gráficos.
