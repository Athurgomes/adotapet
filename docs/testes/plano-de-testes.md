# Plano de testes e integração — AdotaPet

> **Responsável:** Pessoa 9 (Integração, Testes e Documentação)
> **Base:** requisitos **revisados** RF01–RF13 / RNF01–RNF11 (`requisitos (1).docx`, 21/10/2026) e [contrato-api.md](../contrato-api.md)
> Erros encontrados vão para o [registro de erros](registro-de-erros.md).

## 1. Objetivo

Verificar se os três microsserviços, o site público e o painel administrativo funcionam juntos:
- se as APIs seguem o contrato;
- se os dados são gravados no MongoDB Atlas;
- se o serviço de Adoções se comunica com Animais e Adotantes por HTTP;
- se o sistema trata os erros com mensagens adequadas.

## 2. Estratégia

| Tipo | Como | Onde |
|---|---|---|
| **Integração das APIs (automatizado)** | Script que chama as rotas reais e compara com o contrato | [`tests/integracao.js`](../../tests/integracao.js) |
| **Serviço fora do ar (semi-automatizado)** | Parar um serviço e rodar o script com `--queda` | idem |
| **Site público e painel (manual)** | Roteiro de telas no navegador, com prints e a aba Network (F12) aberta | Seção 5 |
| **Persistência e banco (manual)** | Conferir os documentos no MongoDB Compass com o usuário `leitura_geral` | Seção 6 |

Cada caso tem um dos resultados abaixo:

| Resultado | Significado |
|---|---|
| **PASSOU** | Comportamento igual ao contrato |
| **FALHOU** | Comportamento diferente: registrar no [registro de erros](registro-de-erros.md) e avisar o responsável |
| **PENDENTE** | A rota ainda responde `501` ou ainda não existe no serviço |
| **BLOQUEADO** | Depende de um caso anterior que não passou |

## 3. Como executar

Pré-requisito: projeto rodando (`docker compose up --build`) e `.env` configurado.

```bash
# Fluxo completo + cenários de erro (em outro terminal, com o projeto no ar)
docker compose run --rm testes
```

Para o cenário de serviço fora do ar:

```bash
docker compose stop animais
docker compose run --rm testes --queda
docker compose start animais

docker compose stop adotantes
docker compose run --rm testes --queda
docker compose start adotantes
```

> Espere uns 10 segundos depois do `start` antes do próximo teste: o serviço precisa reconectar ao Atlas.

Quem tiver Node 18+ instalado também pode rodar direto: `node tests/integracao.js` (ou `--queda`).

O resultado aparece no terminal e é salvo em `tests/resultados/integracao-AAAAMMDD-HHMMSS.md`, com **todas as requisições e respostas**. Esse arquivo é a evidência para o relatório. A pasta não vai para o Git: copie para `docs/relatorio/evidencias/testes/` os resultados que forem usados no relatório.

> Os testes gravam dados fictícios no Atlas (nomes terminados em `(teste AAAAMMDD-HHMMSS)`). Veja como limpar na seção 8.
> A regra dos 21 anos é testada com a **data de Brasília** (ver E06 no registro de erros).

## 4. Casos automatizados

### 4.0 Ambiente

| ID | Caso | Esperado | Requisitos |
|---|---|---|---|
| CT01 | Os 3 serviços estão no ar e conectados ao banco | `/health` com `banco: "conectado"` | RNF02, RNF05 |
| CT02 | Adoções alcança Animais e Adotantes | `dependencias` com os dois `"no ar"` | RNF04 |
| CT03 | CORS liberado para o frontend | `Access-Control-Allow-Origin` presente | RNF01 |
| CT04 | Rota inexistente | `404` + `{ "erro": ... }` | RNF08 |
| CT05 | JSON malformado no corpo | `400` (e não `500`) | RNF08 |

### 4.1 Animais

| ID | Caso | Esperado | Requisitos |
|---|---|---|---|
| CT10 | Cadastrar cachorro com características e vacinas | `201`, `_id`, `disponivel: true`, campos iguais aos enviados | RF01 |
| CT11 | Cadastrar gato e "outro" (coelho) com estruturas diferentes | `201` e `caracteristicas` gravadas sem perder campos | RF01, RNF05 |
| CT12 | Consultar por id | `200` com os mesmos dados do cadastro | RF04 |
| CT13 | Listar | `200` + array com os animais cadastrados | RF02 |
| CT14 | Filtrar por espécie | Só gatos, incluindo o cadastrado | RF03 |
| CT15 | Filtros combinados (espécie, sexo, porte, cidade, UF) | Todos os resultados atendem aos filtros | RF03 |
| CT16 | Cadastro sem campos obrigatórios | `400` + `erro` | RNF08 |
| CT17 | Espécie, UF, sexo ou porte inválidos | `400` em cada um | RNF08 |
| CT18 | Id inválido / inexistente | `400` / `404` | RF04, RNF08 |
| CT19 | Atualizar disponibilidade para `false` | `200` e alteração persistida | RF05 |
| CT20 | Indisponíveis ficam fora do catálogo (`disponivel=true`) | O animal indisponível só aparece em `disponivel=false` | RF02, RF05 |
| CT21 | Disponibilidade não booleana / animal inexistente | `400` / `404` | RNF08 |
| CT22 | **Editar** as informações de um animal (`PUT /animais/:id`) | `200` e alterações persistidas, inclusive `caracteristicas` e `vacinas` | RF12, RNF11 |
| CT23 | Editar com dados inválidos / inexistente / id inválido | `400` / `404` / `400` | RF12, RNF08 |

### 4.2 Adotantes (questionário do interessado)

| ID | Caso | Esperado | Requisitos |
|---|---|---|---|
| CT30 | Registrar o questionário de 3 interessados (31 anos, 21 anos hoje, 20 anos), sem conta | `201` para os três | RF06 |
| CT31 | Consultar por id | `200` com o campo `idade` calculado corretamente | RF07, RF10 |
| CT32 | Listar (usado no painel para mostrar o questionário) | `200` + array com o interessado | RF13 |
| CT33 | E-mail repetido | `409` | RNF08 |
| CT34 | Sem campos obrigatórios / sem questionário | `400` | RF06, RNF08 |
| CT35 | E-mail ou UF inválidos | `400` | RF06, RNF08 |
| CT36 | Id inválido / inexistente | `400` / `404` | RF10, RNF08 |
| CT37 | Buscar só pelo e-mail (`?email=`) | Volta apenas aquele cadastro; e-mail inexistente → lista vazia | RNF10 |
| CT38 | Questionário sem cidade, profissão ou endereço | `400` | RF06, RNF08 |

### 4.3 Adoções (comunicação entre os serviços)

| ID | Caso | Esperado | Requisitos |
|---|---|---|---|
| CT40 | Solicitação válida | `201`, `status: "Pendente"`, `resumoAnimal` e `resumoAdotante` iguais aos dados de origem | RF08, RF09, RF10 |
| CT41 | Consultar solicitação por id | `200` com os resumos persistidos | RF09, RF13 |
| CT42 | Listar com filtros `animalId`, `adotanteId`, `status` | Só resultados do filtro | RF13 |
| CT43 | Solicitação não muda a disponibilidade do animal | Animal continua `disponivel: true` | RF09 |
| CT44 | Mesma solicitação pendente duas vezes | `409` | RF10 |
| CT45 | Interessado que completa 21 anos hoje, mesmo animal | `201` (limite da regra + outro interessado pode solicitar) | RF07, RF10 |
| CT46 | Interessado com 20 anos | `422` | RF07 |
| CT47 | Animal indisponível | `409` | RF05, RF10 |
| CT48 | Animal / interessado inexistente | `404` | RF10 |
| CT49 | Sem `animalId` ou `adotanteId` | `400` | RNF08 |
| CT50 | Ids em formato inválido | `400` | RNF08 |
| CT51 | Consultar solicitação com id inválido / inexistente | `400` / `404` | RF13, RNF08 |
| CT53 | Alterar o status no painel (`PATCH /adocoes/:id/status`, rota extra) | `200` e persistido; status fora da lista `400`; inexistente `404` | RF13 (ver E23) |
| CT52 | Catálogo não mostra dados de interessados | Nome e e-mail não aparecem em `GET /animais` | RNF10 |

### 4.4 Serviço fora do ar (`--queda`)

| ID | Caso | Esperado | Requisitos |
|---|---|---|---|
| CQ01 | Adoções detecta o serviço parado | `/health` mostra a dependência `"fora do ar"` | RNF02, RNF04 |
| CQ02 | Animais parado → solicitar adoção | `503` + `erro` | RF10, RNF08 |
| CQ03 | Adotantes parado → solicitar adoção | `503` + `erro` | RF10, RNF08 |
| CQ04 | Os outros serviços continuam respondendo | `200` nas listagens | RNF02, RNF06 |

## 5. Roteiro manual (navegador)

Tirar print de cada passo, com a aba **Network** (F12) aberta quando houver envio de dados (ver [checklist de evidências](../relatorio/evidencias/README.md)).

### 5.1 Site público

| ID | Passo | Resultado esperado | Requisitos |
|---|---|---|---|
| CF01 | Abrir <http://localhost:5500> | Catálogo só com animais **disponíveis**: foto, nome, espécie, porte, cidade/UF | RF02, RF05 |
| CF02 | Filtrar por espécie, sexo, porte e região | Só os animais do filtro; mensagem quando não há resultados | RF03 |
| CF04 | Abrir os detalhes de um animal | Informações do animal | RF04 |
| CF05 | Preencher o questionário (sem criar conta) e escolher o animal | `POST /adotantes` 201 | RF06 |
| CF06 | Enviar a solicitação | `POST /adocoes` 201 e mensagem de sucesso | RF08, RF09 |
| CF08 | Enviar com campos vazios / e-mail inválido | Mensagem de erro clara, sem travar a tela | RNF08 |
| CF09 | Solicitar com interessado de 20 anos e com animal indisponível | Mensagem de erro (422 / 409), **sem** tela de sucesso | RF07, RF10 |
| CF10 | Com `docker compose stop animais`, enviar uma solicitação | Mensagem de serviço indisponível, **sem** tela de sucesso | RNF02, RNF08 |
| CF11 | Abrir o site no celular (ou DevTools, 375 px) | Layout legível, sem rolagem horizontal | RNF07 |
| CF12 | Conferir o console do navegador (F12) | Sem erros de CORS ou de JavaScript | RNF01 |
| CF13 | Conferir o catálogo e a aba Network | Nenhum dado pessoal de interessado no catálogo nem nas requisições do site público | RNF10 |

### 5.2 Área administrativa (`/admin/`)

| ID | Passo | Resultado esperado | Requisitos |
|---|---|---|---|
| CF14 | Entrar com e-mail/senha errados e depois com os certos | Mensagem de erro; depois, o painel abre | RF11, RNF11 |
| CF03 | Cadastrar um animal pelo painel | `POST /animais` 201; animal aparece no painel e no catálogo | RF01, RNF11 |
| CF15 | Cadastrar com dado inválido (ex.: URL de imagem sem `https://`) | Mensagem de erro da API; o animal **não** aparece na lista | RNF08 |
| CF16 | Editar nome, idade e características de um animal e recarregar a página | `PUT /animais/:id` 200; alterações continuam após recarregar; características e vacinas preservadas | RF12 |
| CF07 | Marcar um animal como indisponível | `PATCH .../disponibilidade` 200; ele some do catálogo do site | RF05 |
| CF17 | Abrir a lista de solicitações | Lista com dados do interessado e do animal, vinda da API (sem dados de demonstração) | RF13 |
| CF18 | Sair do painel e tentar voltar a `/admin/` | Pede login de novo | RF11 |

## 6. Verificações manuais de infraestrutura e banco

| ID | Passo | Resultado esperado | Requisitos |
|---|---|---|---|
| CM01 | `docker compose ps` | 4 containers `running` (`healthy` nos serviços) | RNF02 |
| CM02 | `/health` dos 3 serviços | "no ar" e "conectado" | RNF05 |
| CM03 | Compass com `leitura_geral`: `animais_db.animais`, `adotantes_db.adotantes`, `adocoes_db.solicitacoes` | Documentos criados pelos testes e pelo site, com estruturas diferentes em `caracteristicas` | RNF05, RF09 |
| CM04 | Conferir que cada serviço usa um usuário do Atlas com acesso só ao próprio banco | Documentado no [guia do banco](../guia-banco-de-dados.md) | RNF06 |
| CM05 | `docker compose restart animais adotantes adocoes` e consultar de novo os registros | Dados continuam lá (persistência no Atlas) | RF04, RF09 |
| CM06 | Revisar o código do serviço de Adoções | Só usa `fetch` para os outros serviços; nenhuma conexão com outro banco | RNF04, RNF06 |
| CM07 | Revisar `package.json` dos serviços | Node.js + Express | RNF03 |

## 7. Matriz de rastreabilidade

Requisitos **revisados** (21/10/2026):

| Requisito | Casos |
|---|---|
| RF01 Cadastro de animais (área administrativa) | CT10, CT11, CF03 |
| RF02 Listagem de animais disponíveis | CT13, CT20, CF01 |
| RF03 Filtro de animais | CT14, CT15, CF02 |
| RF04 Consulta de animais | CT12, CT18, CF04, CM05 |
| RF05 Disponibilidade (some da página inicial) | CT19, CT20, CT47, CF07 |
| RF06 Questionário de adoção (sem conta) | CT30, CT34, CT35, CF05 |
| RF07 Idade mínima | CT31, CT45, CT46, CF09 |
| RF08 Solicitação de adoção | CT40, CF06 |
| RF09 Registro da solicitação | CT40, CT41, CT43, CM03, CM05 |
| RF10 Validação da solicitação | CT31, CT36, CT40, CT44–CT48, CQ02, CQ03, CF09 |
| RF11 Login administrativo | CF14, CF18 (ver E21) |
| RF12 Edição de animais | CT22, CT23, CF16 |
| RF13 Consulta de solicitações no painel | CT32, CT41, CT42, CT51, CT53, CF17 |
| RNF01 Aplicação web | CT03, CF12 |
| RNF02 Microsserviços | CT01, CQ01, CQ04, CF10, CM01 |
| RNF03 Node.js + Express | CM07 |
| RNF04 Comunicação REST | CT02, CQ01, CM06 |
| RNF05 MongoDB, um banco por serviço | CT01, CT11, CM02, CM03 |
| RNF06 Independência dos serviços | CQ04, CM04, CM06 |
| RNF07 Interface responsiva | CF11 |
| RNF08 Validação e erros | CT04, CT05, CT16, CT17, CT21, CT23, CT33–CT36, CT49–CT51, CF08, CF10, CF15 |
| RNF09 Dados fictícios | Todos os dados de teste são fictícios; nenhum caso pede CPF/RG |
| RNF10 Privacidade | CT52, CF13 (ver E22) |
| RNF11 Área administrativa | CT22, CF03, CF14, CF16 |

**Correspondência com a numeração antiga** (usada nos documentos até 21/10): antigo RF06 + RF08 → novo RF06 · antigo RF09 (consulta de adotantes) → removido · antigo RF10 → RF08 + RF09 · antigo RF11 → RF10 · antigo RF12 (status "Pendente") → removido como requisito (continua no contrato) · novos: RF11, RF12, RNF11.

## 8. Limpeza dos dados de teste

Não há rotas de exclusão nesta versão. Antes da apresentação, a **Pessoa 8** (usuário `exp_pessoa8`) pode apagar os dados gerados pelos testes no `mongosh` ou na aba *Shell* do Compass:

```js
use('animais_db');   db.animais.deleteMany({ nome: /\(teste \d{8}-\d{6}\)$/ });
use('adotantes_db'); db.adotantes.deleteMany({ nomeCompleto: /\(teste( \d{8}-\d{6})?\)$/ });
use('adocoes_db');   db.solicitacoes.deleteMany({ 'resumoAnimal.nome': /\(teste \d{8}-\d{6}\)$/ });
```

> A exclusão é definitiva. Rode antes um `find` com o mesmo filtro para conferir o que será apagado.

## 9. Histórico de execuções

| Data | Código testado | Automáticos (CT) | Serviço fora do ar (CQ) | Navegador (CF) | Observações |
|---|---|---|---|---|---|
| 19/10/2026 | `main` (só a estrutura inicial) | 4 passou, 1 falhou, 12 pendentes, 20 bloqueados | 1 passou, 2 pendentes | — | Rotas ainda em `501`. Encontrado o E01 |
| 21/10/2026 (tarde) | `main` (PRs #1–#3) + `backend/api_animais` | **36 passou, 1 falhou** (CT05) | **4 de 4** | CF06 **falhou** (E09, E10); CF11 ok | Novos: E09–E16 |
| 21/10/2026 (noite) | `main` (PRs #1–#6), requisitos revisados | **37 passou, 1 falhou** (CT05), **2 pendentes** (CT22, CT23: não há rota de edição) | **4 de 4** | CF05/CF06 **ok** (201/201); CF10 **falhou** (E09); CF14 ok; CF16 **falhou** (E17); CF17 ok | Novos: E17–E23. Serviços rodados com Node (Docker desligado) |
| 22/10/2026 | `main` + correções da Pessoa 9 ([correcoes-integracao.md](correcoes-integracao.md)) | **42 de 42** (novos: CT37, CT38) | **4 de 4** | Ensaio da demonstração: CF05/CF06 ok; CF09 ok (422 do serviço de Adoções); CF10 ok (mensagem de indisponível); catálogo sem resposta ok; CF16 ok (edição salva e preserva dados); CF15 ok; `/admin` sem porta 80 | Docker com `TZ` de Brasília |

## 10. Critério de pronto para a apresentação

- Todos os casos CT e CQ com **PASSOU** (ou com falha justificada no registro de erros).
- Roteiro CF01–CF18 executado, com prints.
- Nenhum erro com status **Aberto** de gravidade Crítica ou Alta.
- Dados de teste limpos e dados de demonstração (fictícios) cadastrados.
