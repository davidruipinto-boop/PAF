from pathlib import Path
p=Path('/mnt/data/paf_work/app.js')
s=p.read_text()
# Add functions after cloneForExam
old="""function cloneForExam(q) {\n  const cloned = JSON.parse(JSON.stringify(q));\n  if (cloned.options) cloned._choices = shuffleArray(cloned.options);\n  return cloned;\n}\n"""
new="""function cloneForExam(q) {\n  const cloned = JSON.parse(JSON.stringify(q));\n  if (cloned.options) cloned._choices = shuffleArray(cloned.options);\n  return cloned;\n}\n\nfunction promptLooksLikeChoice(prompt) {\n  const p = String(prompt || '');\n  return /\\b(assinala|assinale|seleciona|selecione|escolhe|escolha)\\b/i.test(p)\n    || /\\bindica\\s+uma\\s+op[cç][aã]o/i.test(p)\n    || /\\bqual\\s+das\\s+seguintes\\s+op[cç][oõ]es/i.test(p);\n}\n\nfunction shouldRenderAsChoice(q) {\n  if (!q || q.options || q._choices) return false;\n  if (!['short', 'long'].includes(q.type)) return false;\n  return promptLooksLikeChoice(q.prompt);\n}\n"""
if old not in s: print('old clone not found')
s=s.replace(old,new)
# cleanPromptForWritten add indica uma opcao
old="""function cleanPromptForWritten(prompt) {\n  return String(prompt || '')\n    .replace(/\\b(assinala|seleciona|escolhe)\\b[^.?!]*(resposta|op[cç][aã]o)[^.?!]*[.?!]?/gi, '')\n    .replace(/\\b(assinale|selecione|escolha)\\b[^.?!]*(correta|corretas)[^.?!]*[.?!]?/gi, '')\n"""
new="""function cleanPromptForWritten(prompt) {\n  return String(prompt || '')\n    .replace(/\\bindica\\s+uma\\s+op[cç][aã]o[^.?!]*[.?!]?/gi, '')\n    .replace(/\\b(assinala|seleciona|escolhe)\\b[^.?!]*(resposta|op[cç][aã]o)[^.?!]*[.?!]?/gi, '')\n    .replace(/\\b(assinale|selecione|escolha)\\b[^.?!]*(correta|corretas)[^.?!]*[.?!]?/gi, '')\n"""
if old not in s: print('clean block not found')
s=s.replace(old,new)
# replace English infer section
old="""  // Inglês: em modo escrito, a pergunta deve obrigar a produzir a frase/resposta, não a escolher uma opção.\n  if (module.startsWith('Inglês')) {\n    if (/complete|completa|blank|lacuna|frase/i.test(prompt)) return `${prompt}\\nEscreve a resposta completa, não apenas a letra da opção.`;\n    if (/passive|voz passiva/i.test(module + ' ' + prompt)) return `Escreve por extenso a frase correta em voz passiva e indica o tempo verbal se for pedido.`;\n    if (/word order|ordem/i.test(module + ' ' + prompt)) return `Ordena a frase em inglês corretamente e escreve a frase completa.`;\n    if (/graus|comparative|superlative|adjetivos/i.test(module + ' ' + prompt)) return `Escreve a forma correta do adjetivo e uma frase completa se necessário.`;\n    return `${prompt}\\nResponde por extenso em inglês ou explica a regra gramatical pedida.`;\n  }\n"""
new="""  // Inglês: evita pedir criação livre de frases, porque a correção automática fica injusta.\n  // Aqui o treino foca significado, identificação da regra ou escolha da forma correta.\n  if (module.startsWith('Inglês')) {\n    if (/daily routine|rotina|wake up|get up|breakfast|school|homework|work/i.test(module + ' ' + prompt + ' ' + term)) {\n      return `Indica por escrito o significado pedido de vocabulário de daily routine ou a regra do Simple Present associada.`;\n    }\n    if (/if-clauses|conditional|zero|first|second/i.test(module + ' ' + prompt)) {\n      return `Identifica o tipo de if-clause/conditional ou explica a estrutura pedida, sem criar uma frase nova.`;\n    }\n    if (/passive|voz passiva/i.test(module + ' ' + prompt)) {\n      return `Identifica a opção/forma correta de passive voice ou explica a estrutura, sem criar uma frase nova.`;\n    }\n    if (/word order|ordem/i.test(module + ' ' + prompt)) {\n      return `Indica a ordem correta da frase em inglês ou a regra de word order pedida.`;\n    }\n    if (/graus|comparative|superlative|adjetivos/i.test(module + ' ' + prompt)) {\n      return `Indica a forma correta do comparative/superlative ou explica a regra pedida.`;\n    }\n    if (/profiss|job|career|salary|interview|employer|employee|skills|experience/i.test(module + ' ' + prompt + ' ' + term)) {\n      return `Indica o significado do vocabulário profissional pedido ou identifica o conceito correto.`;\n    }\n    return `${prompt}\\nResponde com o significado, conceito ou regra pedida, sem criar frases novas.`;\n  }\n"""
if old not in s: print('english block not found')
s=s.replace(old,new)
# prepareQuestionForAnswerMode replace
old="""function prepareQuestionForAnswerMode(q, answerMode) {\n  const cloned = cloneForExam(q);\n  if (answerMode === 'click') return makeClickQuestion(cloned);\n  if (answerMode === 'written') return makeWrittenQuestion(cloned);\n  return cloned;\n}\n"""
new="""function prepareQuestionForAnswerMode(q, answerMode) {\n  const cloned = cloneForExam(q);\n  // Mesmo no modo misturado, se o enunciado diz para escolher/assinalar uma opção,\n  // a pergunta tem de aparecer com opções e não com caixa de texto.\n  if (answerMode === 'click' || (answerMode === 'mixed' && shouldRenderAsChoice(cloned))) {\n    return makeClickQuestion(cloned);\n  }\n  if (answerMode === 'written') return makeWrittenQuestion(cloned);\n  return cloned;\n}\n"""
if old not in s: print('prepare block not found')
s=s.replace(old,new)
# infoModulePriority replace and add max function after mandatoryRounds
old="""function infoModulePriority(module) {\n  const high = [\n    'Arquitetura interna do computador',\n    'Processador de texto',\n    'Folha de cálculo',\n    'Conexões de rede / Rede local'\n  ];\n  const medium = ['Scripts CGI e folhas de estilo'];\n  if (high.includes(module)) return 3;\n  if (medium.includes(module)) return 2;\n  return 1;\n}\n"""
new="""function infoModulePriority(module) {\n  const high = [\n    'Arquitetura interna do computador',\n    'Processador de texto',\n    'Folha de cálculo',\n    'Conexões de rede / Rede local'\n  ];\n  const low = [\n    'Programação em C/C++',\n    'Programação em JAVA',\n    'Criação de páginas Web em hipertexto',\n    'Scripts CGI e folhas de estilo'\n  ];\n  if (high.includes(module)) return 4;\n  if (low.includes(module)) return 1;\n  return 2;\n}\n\nfunction infoLowTheoryModule(module) {\n  return [\n    'Programação em C/C++',\n    'Programação em JAVA',\n    'Criação de páginas Web em hipertexto',\n    'Scripts CGI e folhas de estilo'\n  ].includes(module);\n}\n\nfunction maxQuestionsForModule(area, module, mode, target) {\n  if (area !== 'info') return Infinity;\n  // Estes módulos continuam na matriz, por isso aparecem, mas com pouco peso na teoria.\n  // A prática de C/Java/HTML/SQL é treinada na secção própria.\n  if (infoLowTheoryModule(module)) {\n    if (mode === 'vinte' && target >= 45) return 2;\n    return 1;\n  }\n  return Infinity;\n}\n"""
if old not in s: print('info priority not found')
s=s.replace(old,new)
# mandatory replace to low desired
old="""function mandatoryRoundsForModule(area, module, target, totalModules) {\n  if (target < totalModules * 2) return 1;\n  if (area === 'mfc') return 2;\n  if (area === 'info') {\n    return infoModulePriority(module) >= 3 ? 2 : 1;\n  }\n  return 1;\n}\n"""
new="""function mandatoryRoundsForModule(area, module, target, totalModules) {\n  if (target < totalModules * 2) return 1;\n  if (area === 'mfc') return 2;\n  if (area === 'info') {\n    if (infoLowTheoryModule(module)) return 1;\n    return infoModulePriority(module) >= 4 ? 2 : 1;\n  }\n  return 1;\n}\n"""
if old not in s: print('mandatory block not found')
s=s.replace(old,new)
# Socio mustCore cap 33 replace
old="""  // Se o exame for automático e tiver espaço, entram sempre as 33 perguntas reais de Sociocultural.\n  const mustCore = Math.min(core.length, 33);\n  const minimumUseful = mustCore + englishModules.length;\n  if (target >= 33) target = Math.max(target, minimumUseful);\n\n  let coreQuota = target >= 33 ? mustCore : Math.min(core.length, Math.round(target * 0.70));\n"""
new="""  // Se o exame for automático e tiver espaço, entram todas as perguntas-base reais de Sociocultural\n  // e a pergunta extra de xenofobia pedida para a matriz.\n  const mustCore = core.length;\n  const minimumUseful = mustCore + englishModules.length;\n  if (target >= 33) target = Math.max(target, minimumUseful);\n\n  let coreQuota = target >= 33 ? mustCore : Math.min(core.length, Math.round(target * 0.70));\n"""
if old not in s: print('socio quota block not found')
s=s.replace(old,new)
# buildBalanced first pass use max
old="""  // Primeira passagem: pelo menos 1 pergunta por módulo da matriz.\n  for (const module of modules) {\n    if (chosen.length >= target) break;\n    pushUnique(chosen, used, weightedRandomQuestion(byModule.get(module), mode));\n  }\n"""
new="""  // Primeira passagem: pelo menos 1 pergunta por módulo da matriz.\n  for (const module of modules) {\n    if (chosen.length >= target) break;\n    pushUnique(chosen, used, weightedRandomQuestion(byModule.get(module), mode));\n  }\n""" # unchanged
# replace second pass while to respect max
old="""    while ((chosen.filter(q => q.module === module).length < desired) && chosen.length < target) {\n      const available = byModule.get(module).filter(q => !used.has(q.id));\n      if (!pushUnique(chosen, used, weightedRandomQuestion(available, mode))) break;\n    }\n"""
new="""    while ((chosen.filter(q => q.module === module).length < desired) && chosen.length < target) {\n      const maxForModule = maxQuestionsForModule(area, module, mode, target);\n      if (chosen.filter(q => q.module === module).length >= maxForModule) break;\n      const available = byModule.get(module).filter(q => !used.has(q.id));\n      if (!pushUnique(chosen, used, weightedRandomQuestion(available, mode))) break;\n    }\n"""
if old not in s: print('second pass while not found')
s=s.replace(old,new)
# fill loop available filter respecting max
old="""    for (const module of candidates) {\n      const available = byModule.get(module).filter(q => !used.has(q.id));\n      if (available.length && pushUnique(chosen, used, weightedRandomQuestion(available, mode))) {\n        added = true;\n        break;\n      }\n    }\n"""
new="""    for (const module of candidates) {\n      const maxForModule = maxQuestionsForModule(area, module, mode, target);\n      if ((counts.get(module) || 0) >= maxForModule) continue;\n      const available = byModule.get(module).filter(q => !used.has(q.id));\n      if (available.length && pushUnique(chosen, used, weightedRandomQuestion(available, mode))) {\n        added = true;\n        break;\n      }\n    }\n"""
if old not in s: print('fill for not found')
s=s.replace(old,new)
# startExam remove results-active and showResults add
old="""  setupEl.classList.add('hidden');\n  resultsEl.classList.add('hidden');\n  historyEl.classList.add('hidden');\n  examEl.classList.remove('hidden');\n  document.body.classList.add('exam-running');\n"""
new="""  setupEl.classList.add('hidden');\n  resultsEl.classList.add('hidden');\n  historyEl.classList.add('hidden');\n  examEl.classList.remove('hidden');\n  document.body.classList.add('exam-running');\n  document.body.classList.remove('results-active');\n"""
if old not in s: print('start body block not found')
s=s.replace(old,new)
old="""  examEl.classList.add('hidden');\n  resultsEl.classList.remove('hidden');\n  document.body.classList.remove('exam-running');\n  updateIssueCounter();\n"""
new="""  examEl.classList.add('hidden');\n  resultsEl.classList.remove('hidden');\n  document.body.classList.remove('exam-running');\n  document.body.classList.add('results-active');\n  updateIssueCounter();\n"""
if old not in s: print('show body block not found')
s=s.replace(old,new)
# in showHistory remove results-active too
old="""  document.body.classList.remove('exam-running');\n  historyEl.classList.remove('hidden');\n}"""
new="""  document.body.classList.remove('exam-running');\n  document.body.classList.remove('results-active');\n  historyEl.classList.remove('hidden');\n}"""
if old not in s: print('showHistory body block not found')
s=s.replace(old,new,1)
# maybe backToSetup at bottom ensure remove. Need inspect later.
p.write_text(s)
