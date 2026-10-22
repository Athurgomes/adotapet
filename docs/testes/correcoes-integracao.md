# Correções feitas na integração — AdotaPet

> **Responsável:** Pessoa 9 (Integração, Testes e Documentação), 22/10/2026.
> Todas as correções vieram de falhas encontradas nos testes (ver [registro de erros](registro-de-erros.md)) e foram testadas de novo depois de aplicadas.

## Resultado antes e depois

| | Antes (21/10, noite) | Depois (22/10) |
|---|---|---|
| Testes automáticos das APIs | 37 de 40 (1 falha, 2 pendentes) | **42 de 42** (2 casos novos) |
| Serviço fora do ar | 4 de 4 | **4 de 4** |
| Formulário com Adoções respondendo 503 | Mostrava **"Formulário enviado!"** | Mostra **"serviço indisponível"** |
| Edição de animal no painel | Dizia "atualizado", mas **não salvava** | Salva e preserva características e vacinas |
| Painel com Animais fora do ar | Mostrava **animais de demonstração falsos** | Mostra o erro; as solicitações continuam visíveis |
| `docker compose up` | Exigia a **porta 80** livre | Só a 5500 (e as APIs) |

## Correções por responsável

### Pessoa 3 — Infraestrutura

| ID | O que mudou | Por quê | Arquivo |
|---|---|---|---|
| E06 | `TZ: America/Sao_Paulo` nos 3 serviços | Os containers rodavam em UTC: das 21h à meia-noite, a regra dos 21 anos usava o **dia seguinte** e aceitava quem só faz 21 anos amanhã. Teste às 23h de 21/10: depois da correção, o CT46 recusou corretamente uma pessoa que faz 21 anos em 22/10 | `docker-compose.yml` |
| E20 | Removida a porta `80:80`; o nginx passou a fazer redirecionamento relativo (`absolute_redirect off`) | `/admin` redirecionava para `http://localhost/admin/` **sem a porta 5500**, e a porta 80 tinha sido aberta para contornar isso. Em computadores com a porta 80 ocupada, o `docker compose up` falhava e **nenhum container subia**, o que seria um risco no dia da apresentação. Agora `/admin` vai para `/admin/` mantendo a porta | `docker-compose.yml`, `frontend/Dockerfile`, `frontend/index.html` (link `/admin/`) |

### Pessoa 5 — Animais

| ID | O que mudou | Por quê | Arquivo |
|---|---|---|---|
| E17 | Nova rota `PUT /animais/:id` | O RF12 (edição de animais) não tinha rota no backend. O painel chamava `PUT` e recebia **404**. Agora atualiza os campos enviados e valida o documento inteiro de novo (mesmas regras do cadastro) | `services/animais/src/routes/animais.js` |

### Pessoa 6 — Adotantes

| ID | O que mudou | Por quê | Arquivo |
|---|---|---|---|
| E11 | `profissao`, `endereco` e `cidade` voltaram a ser obrigatórios | O RF06 revisado lista os três no questionário, e o serviço de Adoções **precisa** da cidade para montar o resumo. Um interessado sem cidade era aceito, mas a adoção dele falhava com **503**, um erro que parece "serviço fora do ar" | `services/adotantes/src/routes/adotantes.js`, `models/Adotante.js` |
| E22 | Filtro `GET /adotantes?email=` | Quando o e-mail já existia, o site público baixava a lista de **todos** os interessados (nome, telefone, endereço) no navegador do visitante só para achar um cadastro (RNF10). Agora busca só aquele e-mail | `services/adotantes/src/routes/adotantes.js` |
| E01 | JSON malformado → `400` | Respondia `500` (erro interno) para um erro do cliente (RNF08). Mesma correção que a Pessoa 5 já tinha feito em Animais | `services/adotantes/src/server.js` |

### Pessoa 7 — Adoções

| ID | O que mudou | Por quê | Arquivo |
|---|---|---|---|
| E01 | JSON malformado → `400` | Mesmo motivo acima | `services/adocoes/src/server.js` |

### Pessoa 4 — Site público

| ID | O que mudou | Por quê | Arquivo |
|---|---|---|---|
| E09 | A tela de sucesso só aparece com `201` do serviço de Adoções. Para `503` ou serviço fora do ar, aparece *"Não foi possível registrar a solicitação agora porque um dos nossos serviços está indisponível"*. Removido o id falso `mock_adotante_...` | Com o serviço de Animais parado, o site mostrava **"Formulário enviado! status Pendente"**, mas nada era gravado. Era exatamente o cenário do slide "Falha parcial" | `frontend/js/app.js` |
| RF07 | A idade mínima passou a ser validada **só pelo serviço de Adoções**, e o site mostra a mensagem dele (`422`) | O site bloqueava antes de chamar a API, então a demonstração "barrado pelo serviço de Adoções" não chegava ao serviço. Além disso, o cálculo no navegador errava por 1 dia (fuso) e duplicava uma regra que é do backend (RF10) | `frontend/js/app.js` |
| E22 | Usa `GET /adotantes?email=` | Ver Pessoa 6 | `frontend/js/app.js` |
| E14 | Selo "Vacinado" só quando o animal tem vacinas | Aparecia em todos os animais, inclusive nos sem vacina | `frontend/js/app.js` |
| E15 | Textos da API escapados antes de entrar no HTML | Um animal com nome contendo HTML executaria código no site | `frontend/js/app.js` |

### Pessoa 4 — Painel administrativo

| ID | O que mudou | Por quê | Arquivo |
|---|---|---|---|
| E17 | Edição só confirma com `200`; senão mostra o erro da API | Mostrava "atualizado com sucesso" e a alteração sumia ao recarregar | `frontend/js/admin.js` |
| E19 | Ao editar, `caracteristicas` e `vacinas` não alteradas são reenviadas como vieram da API; vacinas digitadas mantêm a data das que já existiam | A edição transformava as características em um texto único e apagava as datas das vacinas, ou seja, **destruía a flexibilidade do MongoDB** que o trabalho demonstra | `frontend/js/admin.js` |
| E18 | Removidos os dados de demonstração (animais e solicitações falsos). Cadastro com erro mostra a mensagem da API em vermelho e não adiciona o animal. Mudança de status é desfeita se a API recusar | Se a API falhasse, o painel mostrava dados inventados como se fossem reais, inclusive com "contato@email.com" e "São Paulo" | `frontend/js/admin.js`, `frontend/css/admin.css` |
| — | Campos "Características" e "Vacinas" deixaram de ser obrigatórios no painel | São opcionais no contrato. Um animal sem vacinas (ex.: o coelho dos testes) **não podia ser editado** | `frontend/admin/index.html` |

## O que não mudou (precisa de decisão do grupo)

| ID | Assunto | Quem decide |
|---|---|---|
| E21 | O login do painel é só de interface: a senha está no `admin.js` e as APIs não exigem login. Atende ao RF11 (tela de login), mas precisa ir para o relatório como limitação do protótipo | Pessoa 1 |
| E23 | Status "Em contato" e "Concluído" no painel: não estão nos requisitos revisados (agora documentados no contrato) | Pessoa 1 |
| E16 | Nome do site: "Aumigo" ou "AdotaPet" | Pessoas 1 e 2 |

## Como conferir

```bash
docker compose up -d --build
docker compose run --rm testes            # 42 de 42
docker compose stop animais
docker compose run --rm testes --queda    # 3 passou + 1 bloqueado (esperado)
docker compose start animais
```

Evidências em [`docs/relatorio/evidencias/testes/`](../relatorio/evidencias/testes/).
