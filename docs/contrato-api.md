# Contrato de API — Aumigo (RASCUNHO para revisão)

> **Status:** proposta inicial feita pela Pessoa 3 com base nos requisitos RF01–RF13.
> **Atualização de 22/10/2026 (Pessoa 9):** inclusão de `PUT /animais/:id`, `GET /adotantes?email=`, `PATCH /adocoes/:id/status` e das regras de erro já implementadas. A numeração de RFs citada abaixo é a da primeira versão dos requisitos.
> Precisa ser revisada e aprovada pelas Pessoas 4, 5, 6, 7 e 8 **antes de programar**.
> Mudanças combinadas devem ser registradas neste arquivo.

## Convenções gerais

| Item | Padrão |
|---|---|
| Formato | JSON (`Content-Type: application/json`) |
| Nomes de campos | Português, `camelCase`, sem acento (`imagemUrl`, `nomeCompleto`) |
| Identificador | `_id` gerado pelo MongoDB (string de 24 caracteres) |
| Datas | ISO 8601 (`"2026-10-17"` ou `"2026-10-17T14:30:00.000Z"`) |
| UF | 2 letras maiúsculas (`"SP"`) |
| Datas automáticas | `criadoEm` e `atualizadoEm` (opção `timestamps` do Mongoose) |

### Formato de erro (todos os serviços)

```json
{
  "erro": "Mensagem legível para mostrar ao usuário.",
  "detalhes": ["campo 'nome' é obrigatório", "campo 'uf' deve ter 2 letras"]
}
```
`detalhes` é opcional e é usado principalmente em erros de validação.

### Códigos HTTP

| Código | Quando usar |
|---|---|
| 200 | Consulta ou atualização bem-sucedida |
| 201 | Cadastro criado |
| 400 | Dados inválidos ou campos obrigatórios faltando; `id` em formato inválido |
| 404 | Registro não encontrado |
| 409 | Conflito de regra de negócio (ex.: animal indisponível) |
| 422 | Regra não atendida (ex.: adotante com menos de 21 anos) |
| 503 | Serviço dependente fora do ar (usado pelo serviço de Adoções) |
| 500 | Erro inesperado |

### Rota de saúde (todos os serviços)

`GET /health` → `200`
```json
{ "servico": "animais", "status": "ok", "banco": "conectado" }
```
O serviço de Adoções também retorna `"dependencias": { "animais": "no ar", "adotantes": "no ar" }`.

---

## 1. Microsserviço de Animais — porta 3001 — banco `animais_db` (✅ implementado)

**Coleção:** `animais`

### Documento

```json
{
  "_id": "6710f1c2a1b2c3d4e5f60001",
  "nome": "Caramelo",
  "especie": "cachorro",
  "sexo": "macho",
  "idade": 3,
  "porte": "medio",
  "caracteristicas": {
    "cor": "caramelo",
    "pelagem": "curta",
    "castrado": true,
    "temperamento": ["dócil", "brincalhão"],
    "convivenciaComCriancas": true
  },
  "vacinas": [
    { "nome": "V10", "data": "2026-03-10" },
    { "nome": "Antirrábica", "data": "2026-04-02" }
  ],
  "cidade": "Belo Horizonte",
  "uf": "MG",
  "imagemUrl": "https://exemplo.com/caramelo.jpg",
  "disponivel": true,
  "criadoEm": "2026-10-17T14:30:00.000Z",
  "atualizadoEm": "2026-10-17T14:30:00.000Z"
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `nome` | string | sim | |
| `especie` | string | sim | `cachorro`, `gato` ou `outro` |
| `sexo` | string | sim | `macho` ou `femea` |
| `idade` | number | sim | Em anos (filhotes com menos de 1 ano: `0`). *A discutir: usar meses?* |
| `porte` | string | sim | `pequeno`, `medio` ou `grande` |
| `caracteristicas` | objeto | não | **Livre**: cada espécie pode ter campos diferentes (flexibilidade do MongoDB) |
| `vacinas` | array | não | Lista de `{ nome, data }` |
| `cidade` | string | sim | |
| `uf` | string | sim | 2 letras |
| `imagemUrl` | string | sim | URL da foto |
| `disponivel` | boolean | não | Padrão `true` |

### Rotas

| Método | Rota | Descrição | Sucesso | Erros |
|---|---|---|---|---|
| `POST` | `/animais` | Cadastrar animal (RF01) | 201 + documento criado | 400 |
| `GET` | `/animais` | Listar com filtros opcionais (RF02, RF03) | 200 + array | 400 |
| `GET` | `/animais/:id` | Consultar um animal (RF04) | 200 + documento | 400, 404 |
| `PUT` | `/animais/:id` | Editar animal pela área administrativa (RF12) | 200 + documento atualizado | 400, 404 |
| `PATCH` | `/animais/:id/disponibilidade` | Atualizar disponibilidade (RF05) | 200 + documento atualizado | 400, 404 |

### Detalhes de implementação

- `especie`, `sexo` e `porte` são normalizados para minúsculas; `uf` para maiúsculas; textos têm espaços das pontas removidos.
- `_id`, `criadoEm` e `atualizadoEm` são gerados pelo serviço: se vierem no corpo do `POST`, são ignorados.
- `imagemUrl` precisa começar com `http://` ou `https://`. `caracteristicas` precisa ser um objeto (o conteúdo é livre).
- Sem conexão com o banco, todas as rotas respondem `503`.
- A listagem vem ordenada do mais recente para o mais antigo (`criadoEm` decrescente).

### `POST /animais` (RF01)

Corpo (os campos `caracteristicas`, `vacinas` e `disponivel` são opcionais):
```json
{
  "nome": "Mimi",
  "especie": "gato",
  "sexo": "femea",
  "idade": 0,
  "porte": "pequeno",
  "caracteristicas": { "fiv": false, "hipoalergenico": true },
  "vacinas": [{ "nome": "V4", "data": "2026-09-01" }],
  "cidade": "São Paulo",
  "uf": "sp",
  "imagemUrl": "https://exemplo.com/mimi.jpg"
}
```
`201` + documento criado (com `_id`, `disponivel: true`, `criadoEm`, `atualizadoEm` e `uf: "SP"`).

`400` (campos faltando ou inválidos):
```json
{
  "erro": "Dados inválidos.",
  "detalhes": ["O campo 'especie' deve ser: cachorro, gato ou outro.", "O campo 'idade' não pode ser negativo."]
}
```

### `GET /animais` (RF02, RF03)

Filtros (query string, todos opcionais e combináveis; parâmetro vazio é ignorado):

| Filtro | Valores | Observação |
|---|---|---|
| `especie` | `cachorro`, `gato`, `outro` | |
| `sexo` | `macho`, `femea` | |
| `porte` | `pequeno`, `medio`, `grande` | |
| `cidade` | texto | Nome **completo**, sem diferenciar maiúsculas de minúsculas (acentos contam) |
| `uf` | 2 letras | Sem diferenciar maiúsculas de minúsculas |
| `disponivel` | `true`, `false` | |

Exemplo: `GET /animais?especie=gato&uf=SP&disponivel=true` → `200` + array (vazio `[]` se nada combinar).

Valor inválido em `especie`, `sexo`, `porte` ou `disponivel` → `400`:
```json
{ "erro": "Dados inválidos.", "detalhes": ["O filtro 'porte' deve ser: pequeno, medio, grande."] }
```

### `GET /animais/:id` (RF04)

`200` + documento (formato da seção "Documento"). Erros:

| Código | Corpo |
|---|---|
| 400 | `{ "erro": "ID inválido." }` |
| 404 | `{ "erro": "Animal não encontrado." }` |

### `PUT /animais/:id` (RF12)

*Incluída em 22/10/2026 (E17 do registro de erros).* Corpo com os campos a alterar (os mesmos do `POST`; `_id`, `criadoEm` e `atualizadoEm` são ignorados). Só os campos enviados mudam, e o documento inteiro é validado de novo antes de salvar.
```json
{ "nome": "Caramelo", "idade": 4, "caracteristicas": { "castrado": true }, "vacinas": [{ "nome": "V10", "data": "2026-03-10" }] }
```
`200` + documento atualizado. Erros: `400` (id inválido ou dados inválidos, com `detalhes`), `404` (animal não existe).

> `caracteristicas` e `vacinas` são **substituídas** pelo que for enviado. O painel reenvia esses campos como vieram da API quando eles não foram alterados, para não perder dados.

### `PATCH /animais/:id/disponibilidade` (RF05)

Corpo (`disponivel` é obrigatório e precisa ser booleano de verdade: `"false"` ou `0` são rejeitados):
```json
{ "disponivel": false }
```
`200` + documento atualizado. Erros:

| Código | Quando | Corpo |
|---|---|---|
| 400 | `id` inválido | `{ "erro": "ID inválido." }` |
| 400 | `disponivel` ausente ou não booleano | `{ "erro": "Dados inválidos.", "detalhes": ["O campo 'disponivel' é obrigatório e deve ser true ou false."] }` |
| 404 | animal não existe | `{ "erro": "Animal não encontrado." }` |

### Outros erros (todas as rotas de `/animais`)

| Código | Quando | Corpo |
|---|---|---|
| 400 | JSON malformado no corpo | `{ "erro": "JSON inválido no corpo da requisição." }` |
| 503 | Serviço sem conexão com o banco | `{ "erro": "Banco de dados indisponível." }` |

Exemplos prontos para executar: [`services/animais/testes.http`](../services/animais/testes.http).

---

## 2. Microsserviço de Adotantes — porta 3002 — banco `adotantes_db`

**Coleção:** `adotantes`

### Documento

```json
{
  "_id": "6710f1c2a1b2c3d4e5f60101",
  "nomeCompleto": "Maria Fictícia da Silva",
  "dataNascimento": "1995-06-20",
  "profissao": "Professora",
  "endereco": "Rua das Flores, 123 - Centro",
  "cidade": "Belo Horizonte",
  "uf": "MG",
  "telefone": "(31) 90000-0000",
  "email": "maria.ficticia@exemplo.com",
  "questionario": {
    "jaTeveAnimais": true,
    "tipoMoradia": "casa",
    "possuiQuintal": true,
    "moradiaPropria": true,
    "outrosAnimaisEmCasa": 1,
    "horasDisponiveisPorDia": 4,
    "motivoAdocao": "Quero um companheiro para a família."
  },
  "criadoEm": "2026-10-17T14:30:00.000Z",
  "atualizadoEm": "2026-10-17T14:30:00.000Z"
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `nomeCompleto` | string | sim | |
| `dataNascimento` | string (data) | sim | A idade é **calculada** a partir dela. *Proposta: guardar a data em vez da idade, para a idade não ficar desatualizada* |
| `profissao` | string | sim | |
| `endereco` | string | sim | |
| `cidade` | string | sim | Também usada no `resumoAdotante` da solicitação |
| `uf` | string | sim | 2 letras |
| `telefone` | string | sim | |
| `email` | string | sim | Formato de e-mail; único |
| `questionario` | objeto | sim | Respostas do RF08 (experiência, moradia, disponibilidade) |

> **RNF09:** não pedir CPF nem RG. Usar apenas dados fictícios.
> **RNF10:** dados de adotantes nunca aparecem no catálogo de animais.

### Rotas

| Método | Rota | Descrição | Sucesso | Erros |
|---|---|---|---|---|
| `POST` | `/adotantes` | Cadastrar adotante + questionário (RF06, RF08) | 201 + documento criado | 400, 409 (e-mail já cadastrado) |
| `GET` | `/adotantes` | Listar adotantes (painel, RF13). Filtro opcional `?email=` devolve só aquele cadastro (sem diferenciar maiúsculas) | 200 + array | 400 (`email` vazio) |
| `GET` | `/adotantes/:id` | Consultar um adotante (RF09) | 200 + documento **com o campo `idade` calculado** | 400, 404 |

O campo `idade` (calculado) no `GET /adotantes/:id` é o que o serviço de Adoções usa para validar a idade mínima.

---

## 3. Microsserviço de Adoções — porta 3003 — banco `adocoes_db`

**Coleção:** `solicitacoes`

### Documento

```json
{
  "_id": "6710f1c2a1b2c3d4e5f60201",
  "animalId": "6710f1c2a1b2c3d4e5f60001",
  "adotanteId": "6710f1c2a1b2c3d4e5f60101",
  "status": "Pendente",
  "resumoAnimal": {
    "nome": "Caramelo",
    "especie": "cachorro",
    "porte": "medio",
    "cidade": "Belo Horizonte",
    "uf": "MG",
    "imagemUrl": "https://exemplo.com/caramelo.jpg"
  },
  "resumoAdotante": {
    "nomeCompleto": "Maria Fictícia da Silva",
    "idade": 31,
    "cidade": "Belo Horizonte",
    "uf": "MG",
    "email": "maria.ficticia@exemplo.com"
  },
  "criadoEm": "2026-10-17T14:30:00.000Z",
  "atualizadoEm": "2026-10-17T14:30:00.000Z"
}
```

Os campos `resumoAnimal` e `resumoAdotante` são uma **cópia dos dados no momento da solicitação** (registro histórico, RF10). Eles não são atualizados se o animal ou o adotante mudar depois.

### Rotas

| Método | Rota | Descrição | Sucesso | Erros |
|---|---|---|---|---|
| `POST` | `/adocoes` | Registrar solicitação (RF10, RF11, RF12) | 201 + documento criado | 400, 404, 409, 422, 503 |
| `GET` | `/adocoes` | Listar solicitações (RF13). Filtros opcionais: `animalId`, `adotanteId`, `status` | 200 + array | |
| `GET` | `/adocoes/:id` | Consultar uma solicitação (RF13) | 200 + documento | 400, 404 |
| `PATCH` | `/adocoes/:id/status` | Marcar o andamento no painel. Corpo: `{ "status": "Em contato" }` | 200 + documento atualizado | 400 (status fora da lista), 404 |

**Status possíveis:** `"Pendente"` (padrão ao registrar), `"Em contato"`, `"Concluído"`. *Incluídos pelo painel administrativo (PR #6); falta a Pessoa 1 confirmar se entram nos requisitos (E23).*

**Corpo de `POST /adocoes`:**
```json
{ "animalId": "6710f1c2a1b2c3d4e5f60001", "adotanteId": "6710f1c2a1b2c3d4e5f60101" }
```

### Fluxo de validação do `POST /adocoes` (RF11)

```
1. Validar se animalId e adotanteId foram enviados               -> 400
2. GET {ANIMAIS_API_URL}/animais/:animalId
     - serviço fora do ar                                       -> 503
     - 404                                                      -> 404 "Animal não encontrado"
     - disponivel == false                                      -> 409 "Animal indisponível para adoção"
3. GET {ADOTANTES_API_URL}/adotantes/:adotanteId
     - serviço fora do ar                                       -> 503
     - 404                                                      -> 404 "Adotante não encontrado"
     - idade < 21                                               -> 422 "Idade mínima para adoção é 21 anos"
4. Verificar em adocoes_db se já existe solicitação "Pendente"
   com o mesmo animalId e adotanteId                            -> 409 "Já existe uma solicitação pendente deste adotante para este animal"
5. Salvar a solicitação com status "Pendente" e os resumos      -> 201
```

### Regras definidas

- **Sem solicitação duplicada:** o mesmo adotante não pode ter duas solicitações `"Pendente"` para o mesmo animal. A segunda tentativa retorna **409** (passo 4 do fluxo).
- **Ids em formato inválido:** `animalId` ou `adotanteId` que não são ObjectId (24 caracteres hexadecimais) → **400**, antes de chamar os outros serviços (E02).
- **Resposta inesperada dos outros serviços:** se Animais ou Adotantes responderem algo diferente de `200`/`404` (ex.: `503` porque o banco deles caiu), Adoções responde **503**.
- **A solicitação não altera o animal:** registrar uma solicitação **não** muda `disponivel` para `false`. Nesta versão não existe aprovação (RF12), então o animal continua disponível e pode receber solicitações de outros adotantes. A disponibilidade só muda pela rota `PATCH /animais/:id/disponibilidade`.
