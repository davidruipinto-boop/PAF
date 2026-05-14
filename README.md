# Salão de Exames PAF

Abre `index.html` no navegador.

## O que mudou

- Os títulos dos cartões de pergunta agora mostram a pergunta e não uma palavra que pudesse denunciar a resposta.
- Em Sociocultural, o banco inclui as 33 perguntas base das revisões.
- A parte de HTML foi reforçada com perguntas baseadas na avaliação de criação de páginas web e no site `Andar de Mota` enviado.
- A ficha `fichas/HTML_BOOTSTRAP_BASE/` foi refeita com base no site `Andar de Mota`, usando Bootstrap e sem JavaScript personalizado.
- O site original enviado fica em `pratica/html_site_goncalo_original/` para comparação.
- A navegação das perguntas erradas/parciais no fim do exame foi movida mais para baixo e tem botão `Voltar ao topo`.
- O modo `PAF sério` gera mais algumas perguntas automaticamente, com cobertura mais forte.

## Ficheiros principais

- `index.html` - exames teóricos.
- `question-bank.js` - banco de perguntas.
- `app.js` - lógica do exame, temporizador e correção.
- `style.css` - tema escuro e versão mobile.
- `pratica.html` - exercícios práticos.
- `fichas/HTML_BOOTSTRAP_BASE/` - ficha HTML com Bootstrap baseada no site de mota.

## Nota importante

A correção das respostas abertas é automática e tenta corrigir por ideias principais. Serve para estudo, mas no exame real convém comparares sempre com a resposta esperada.
