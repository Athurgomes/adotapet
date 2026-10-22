# Registro de erros e pendências — AdotaPet

> **Responsável:** Pessoa 9. Cada item é avisado ao responsável e acompanhado até ser corrigido.
> Ao corrigir, quem corrigiu atualiza o **Status** e roda de novo o caso de teste indicado.

**Status:** `Aberto` (precisa de correção) · `A decidir` (a equipe precisa combinar) · `Corrigido` (aguardando novo teste) · `Fechado` (testado e ok)
**Gravidade:** `Crítica` (impede um requisito) · `Alta` · `Média` · `Baixa`

> **Atualização de 22/10/2026:** a Pessoa 9 corrigiu os itens marcados como **Corrigido** (detalhes e justificativas em [correcoes-integracao.md](correcoes-integracao.md)). Depois das correções: **42 de 42** casos automáticos, **4 de 4** de queda e o roteiro da demonstração no navegador passaram. Ficam para decisão do grupo: E16, E21 e E23.

**Verificação anterior:** 21/10/2026 (23h30), `main` com os PRs #1 a #6, contra os **requisitos revisados** (`requisitos (1).docx`). Resultado:

- **37 de 40** casos automáticos passaram.
- **4 de 4** nos cenários de serviço fora do ar.
- No navegador, o **fluxo principal pelo site funcionou** (questionário → 201 → solicitação → 201).

Detalhes nas [evidências](../relatorio/evidencias/testes/).

> **Mudança de numeração:** com os requisitos revisados, os RFs mudaram de número. Os IDs abaixo seguem a **nova** numeração (ver a tabela de correspondência no [plano de testes](plano-de-testes.md#7-matriz-de-rastreabilidade)).

## Resumo

| ID | Gravidade | Título | Responsável | Caso | Status |
|---|---|---|---|---|---|
| E17 | Crítica | Não existe rota para editar animal; o painel mostra "atualizado com sucesso" e nada é salvo (RF12) | Pessoa 5 (rota) e Pessoa 4 (painel) | CT22, CT23, CF16 | **Corrigido** (22/10, ver [correções](correcoes-integracao.md)) |
| E09 | Alta | O site mostra "Formulário enviado!" quando Adoções responde 503 ou está fora do ar | Pessoa 4 | CF10 | **Corrigido** (22/10, ver [correções](correcoes-integracao.md)) |
| E18 | Alta | O painel mostra sucesso e dados falsos quando a API falha (cadastro e listas) | Pessoa 4 | CF15, CF17 | **Corrigido** (22/10, ver [correções](correcoes-integracao.md)) |
| E19 | Alta | A edição no painel apagaria as características e as datas das vacinas | Pessoa 4 | CF16 | **Corrigido** (22/10, ver [correções](correcoes-integracao.md)) |
| E11 | Alta | Interessado sem `cidade` é aceito, mas a adoção dele falha com 503 | Pessoas 6 e 7 | CT40 | **Corrigido** (22/10, ver [correções](correcoes-integracao.md)) |
| E06 | Média | Containers em UTC: entre 21h e 0h, a regra dos 21 anos usa o dia seguinte | Pessoa 3 (e Pessoa 4) | CT45, CT46 | **Corrigido** (22/10, ver [correções](correcoes-integracao.md)) |
| E01 | Média | JSON malformado retorna 500 em vez de 400 | Pessoas 6 e 7 | CT05 | **Corrigido** (22/10, ver [correções](correcoes-integracao.md)) |
| E20 | Média | Porta 80 exposta no compose para o `/admin` funcionar | Pessoa 3 / Pessoa 4 | CM01 | **Corrigido** (22/10, ver [correções](correcoes-integracao.md)) |
| E21 | Média | Login só na tela: a senha está no código e as APIs não exigem login | Pessoa 1 (documentar) | CF14 | A decidir |
| E22 | Média | O site público baixa a lista de **todos** os interessados para tratar e-mail repetido | Pessoas 4 e 6 | CF13 | **Corrigido** (22/10, ver [correções](correcoes-integracao.md)) |
| E23 | Documentação | Status "Em contato"/"Concluído" e `PATCH /adocoes/:id/status` não estão no contrato nem nos requisitos | Pessoas 7 e 1 | CT53 | A decidir (rota já documentada no contrato) |
| E14 | Baixa | Selo "Vacinado" aparece em todos os animais | Pessoa 4 | CF01 | **Corrigido** (22/10, ver [correções](correcoes-integracao.md)) |
| E15 | Baixa | Dados dos animais inseridos no HTML sem escapar | Pessoa 4 | — | **Corrigido** (22/10, ver [correções](correcoes-integracao.md)) |
| E16 | Documentação | O site se chama "Aumigo" e o projeto se chama "AdotaPet" | Pessoas 1 e 2 | — | A decidir |
| E10 | — | Questionário incompleto no formulário | Pessoa 4 | CF05 | **Fechado** |
| E12 | — | Microsserviço de Animais fora da `main` | Pessoa 5 | — | **Fechado** (PR #4) |
| E13 | — | Faltavam telas de cadastro, edição, disponibilidade e consulta de solicitações | Pessoa 4 | — | **Fechado** (PR #6; ver E17) |
| E03 | — | Privacidade na consulta de solicitações | — | — | **Fechado** (RF13 revisado: lista só no painel) |
| E04 | — | "Idade" no RF06 | — | — | **Fechado** (RF06 revisado já fala em data de nascimento) |
| E02, E05, E07, E08 | — | (ver abaixo) | — | — | Fechados |

---

## E17 — Edição de animais não é salva (Crítica, RF12)

- **Backend (Pessoa 5):** o serviço de Animais só tem `POST /animais`, `GET /animais`, `GET /animais/:id` e `PATCH /animais/:id/disponibilidade`. **Não há rota de edição.** O painel chama `PUT /animais/:id` e recebe `404 "Rota não encontrada."`.
- **Painel (Pessoa 4):** quando o `PUT` falha, o painel só envia o `PATCH` de disponibilidade, atualiza a tabela **na memória** e mostra *"Informações de … foram atualizadas com sucesso"*. Ao recarregar a página, a edição some.
- **Teste em 21/10:** nome alterado para "Mingau EDITADO PELO PAINEL" → `PUT` 404 → aviso de sucesso → no banco o nome continuou o antigo. Print: [`E17-edicao-mostra-sucesso-com-404.jpg`](../relatorio/evidencias/erros/E17-edicao-mostra-sucesso-com-404.jpg).
- **Correção:**
  1. Pessoa 5: criar `PUT /animais/:id` (mesmas validações do `POST`, `runValidators: true`, `404` se não existir, `400` para id inválido) e registrar no `contrato-api.md`. Os casos **CT22** e **CT23** já testam a rota.
  2. Pessoa 4: se o `PUT` não retornar `200`, mostrar o erro da API e **não** atualizar a tabela.

## E09 — Sucesso falso no formulário de adoção (Alta, parcialmente corrigido)

- **Melhorou desde 21/10 de manhã:** o questionário agora é completo (E10 fechado) e o site mostra os erros de validação do serviço de Adotantes e os erros 400/404/409/422 de Adoções.
- **Continua errado:** em `app.js`, a condição `if (!respAdocao.ok && respAdocao.status !== 503)` faz o **503 ser tratado como sucesso**. Se o serviço de Adoções estiver fora do ar (erro de rede), o `catch` também segue para a tela de sucesso. E se Adotantes estiver fora do ar, o código ainda usa o id falso `mock_adotante_...`.
- **Teste em 21/10 (23h):** com o serviço de Animais parado, `POST /adotantes` → 201 e `POST /adocoes` → **503**, mas a tela mostrou "Formulário enviado! … status Pendente". Print: [`E09-sucesso-com-503-animais-fora-do-ar.jpg`](../relatorio/evidencias/erros/E09-sucesso-com-503-animais-fora-do-ar.jpg).
- **Correção:** mostrar a tela de sucesso **somente** quando `respAdocao.status === 201`. Para 503 ou erro de rede, mostrar algo como *"Não foi possível registrar a solicitação agora. Tente novamente em alguns minutos."* Remover o `mock_adotante_`.

## E18 — Painel com dados de demonstração e sucesso falso (Alta)

Encontrado na revisão do `frontend/js/admin.js`:
- **Cadastro de animal** (linhas ~437–446): se o `POST /animais` falhar (ex.: `400` por URL de imagem inválida), o animal é adicionado **só na tela**, com id `local_...`, e aparece o aviso *"… foi adicionado à listagem."*.
- **Lista de animais**: se a API falhar, aparecem animais de demonstração (`initialAnimalsDemo`: Amora, Luna...) como se fossem reais.
- **Lista de solicitações**: se a API falhar **ou se não houver nenhuma solicitação**, aparecem solicitações de demonstração (`initialRequestsDemo`). Campos ausentes viram valores inventados (`"contato@email.com"`, `"São Paulo, SP"`).
- **Mudança de status**: a tela muda antes da resposta da API e não volta se ela falhar.
- **Correção:** mostrar o erro da API (ou "lista vazia") em vez de dados de demonstração. Mostrar sucesso só com resposta `201`/`200`.

## E19 — A edição no painel apagaria dados do animal (Alta)

- O modal de edição transforma `caracteristicas` em um texto (ex.: `"longa, branco,cinza, false, true, boa"`) e envia `{ temperamento: "<esse texto>" }`. Ele também transforma as vacinas em `[{ nome: "V4 felina" }]`, **sem as datas**.
- Quando a rota de edição existir (E17), salvar qualquer alteração vai **apagar as características flexíveis e as datas das vacinas**, que são justamente o ponto forte do MongoDB no trabalho (seção 3 da análise da Pessoa 8).
- **Correção sugerida:** no modal, editar só os campos simples (nome, idade, porte, cidade, UF, imagem, disponibilidade) e reenviar `caracteristicas` e `vacinas` **como vieram da API**. Outra opção é um campo de texto com o JSON de `caracteristicas`.

## E11 — Interessado sem cidade não consegue adotar (Alta)

- O serviço de Adotantes aceita `cidade`, `profissao` e `endereco` vazios, mas o serviço de Adoções exige `cidade`. Nesse caso a solicitação recebe **503** "Resposta inválida do serviço de adotantes".
- O **RF06 revisado** lista profissão, endereço e cidade entre as informações do questionário, e o formulário do site já exige os três. **Recomendação:** tornar os três obrigatórios no serviço de Adotantes (Pessoa 6).

## E06 — Fuso horário e a regra dos 21 anos (Média)

- Os containers rodam em **UTC**. Às 23h de 21/10 em Brasília, já é 22/10 em UTC: o serviço de Adotantes calcula a idade com a data de 22/10 e aceita quem só completa 21 anos no dia seguinte.
- **Teste em 21/10 (23h36):** com os serviços rodando no fuso de Brasília, o CT45 e o CT46 deram o resultado correto. O script de testes agora usa a data de Brasília como referência.
- **Correção (Pessoa 3):** acrescentar `TZ: America/Sao_Paulo` em `environment` dos três serviços no `docker-compose.yml`.
- **Frontend (Pessoa 4):** `calculateAge()` usa `new Date('AAAA-MM-DD')`, que é lido como UTC. Calcular a partir dos números da data (`split('-')`).

## E01 — JSON malformado retorna 500 (Média)

- **Animais: ok.** **Adotantes e Adoções ainda respondem 500** (CT05). Correção igual à da Pessoa 5 no `server.js`:
  ```js
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  ```

## E20 — Porta 80 no `docker-compose.yml` (Média, confirmar com Docker)

- O PR #6 acrescentou `"80:80"` ao frontend. O motivo provável: o nginx redireciona `/admin` para `http://localhost/admin/` **sem a porta 5500**, e a porta 80 foi aberta para esse redirecionamento funcionar.
- **Problema:** em computadores onde a porta 80 já está em uso (IIS, Skype, outros servidores), o `docker compose up` falha com `port is already allocated` e **o site inteiro não sobe**.
- **Correção sugerida:** tirar o `"80:80"` e trocar o link do rodapé para `/admin/` (com barra no final). Outra opção é configurar `absolute_redirect off;` no nginx.

## E21 — Login administrativo só na tela (Média, documentar)

- O **RF11** pede uma *tela* de login com e-mail e senha, e isso existe: o login errado mostra a mensagem certa e o certo abre o painel (testado em 21/10).
- **Limitações** que precisam ir para o relatório como decisão de protótipo:
  - E-mail e senha estão escritos no `admin.js`, que é público, e qualquer pessoa pode ver no navegador (F12).
  - O "login" é só uma marca no `sessionStorage`.
  - As APIs não verificam login: qualquer um pode chamar `POST /animais` ou `PATCH /adocoes/:id/status` direto.
- **Sugestão:** registrar na seção de escopo/arquitetura que a autenticação real (backend, senha com hash, token) fica para versões futuras.

## E22 — O site público baixa todos os interessados (Média, RNF10)

- Quando o e-mail já está cadastrado (`409`), o `app.js` chama `GET /adotantes` e procura o e-mail na lista. Isso baixa nome, telefone, endereço e questionário de **todos** os interessados para o navegador de qualquer visitante, o que vai contra o espírito do RNF10.
- **Correção:** criar `GET /adotantes?email=...` (Pessoa 6), que devolve só aquele cadastro, ou simplesmente mostrar "este e-mail já foi usado".

## E23 — Status extras fora do contrato (Documentação)

- O PR #6 acrescentou os status `"Em contato"` e `"Concluído"` e a rota `PATCH /adocoes/:id/status` (testada no CT53: funciona). O contrato e os requisitos revisados não citam isso. O escopo diz que não haverá "acompanhamento individual das solicitações nem etapas de aprovação ou recusa".
- **Ação:** Pessoa 7 documenta a rota no `contrato-api.md`. Pessoa 1 decide se ela entra nos requisitos (ex.: "o administrador pode marcar o andamento do contato") ou se é removida.

## E14 — Selo "Vacinado" fixo (Baixa)

- Todos os cards mostram "Vacinado", inclusive animais com `vacinas: []`. Mostrar só quando `pet.vacinas?.length > 0`.

## E15 — Dados inseridos no HTML sem escapar (Baixa)

- `app.js` e `admin.js` montam cards e tabelas com `innerHTML` usando dados da API. Um animal com nome `<img src=x onerror=alert(1)>` executaria código no site e no painel. Usar `textContent` ou uma função `escapeHtml()`.

## E16 — Nome do projeto: "Aumigo" x "AdotaPet"

- O site e o painel usam **Aumigo**; requisitos, repositório e relatório usam **AdotaPet**. Definir o nome para a apresentação e o relatório.

---

## Itens fechados

| ID | Título | Como foi resolvido |
|---|---|---|
| E10 | Questionário incompleto no formulário | PR #6 acrescentou quintal, moradia própria, já teve animais, outros animais e horas por dia. Teste no navegador em 21/10: `POST /adotantes` 201 e `POST /adocoes` 201 |
| E12 | Animais fora da `main` | PR #4 (21/10) |
| E13 | Telas faltando | PR #6 criou o painel com login, cadastro, edição, disponibilidade e lista de solicitações (a edição depende do E17) |
| E03 | Privacidade da consulta de solicitações | RF13 revisado: a lista geral fica no painel administrativo |
| E04 | "Idade" no RF06 | RF06 revisado fala em "data de nascimento" |
| E02 | Ids inválidos no `POST /adocoes` | Adoções responde 400 (CT50) |
| E05 | Filtro por cidade | Animais ignora maiúsculas; o site filtra por "contém". Aceito para o protótipo |
| E07 | URL de clone no README | Corrigida (falta subir) |
| E08 | Limpeza dos dados de teste | [Seção 8 do plano](plano-de-testes.md#8-limpeza-dos-dados-de-teste) |

---

## Modelo para novos registros

```markdown
## E24 — Título curto (Gravidade)

- **Onde:** serviço / arquivo / tela
- **Caso de teste:** CTxx ou CFxx
- **Como reproduzir:** passo a passo ou requisição
- **Esperado:** (segundo o contrato/requisito)
- **Obtido:** (status HTTP, mensagem, print em docs/relatorio/evidencias/)
- **Responsável:** Pessoa X
- **Status:** Aberto
```
