# API de Adotantes — AdotaPet

Documentação do microsserviço de Adotantes. Este serviço cadastra e consulta interessados em adotar, incluindo os dados do questionário. Ele gerencia somente seus próprios dados no banco `adotantes_db`.

## Endereços e execução

| Acesso | Endereço |
|---|---|
| Front-end no navegador | `http://localhost:3002` |
| Microsserviço de Adoções, dentro do Docker | `http://adotantes:3002` |
| Verificação de saúde | `GET /health` |

Para iniciar apenas o serviço de Adotantes a partir da raiz do repositório:

```bash
docker compose up -d --build adotantes
```

O serviço usa a porta `3002` e conecta à coleção `adotantes` do banco `adotantes_db`. A URI de conexão vem da variável `ADOTANTES_MONGODB_URI` no `.env`.

## Convenções

- Todas as rotas usam JSON (`Content-Type: application/json`).
- Datas de nascimento usam `AAAA-MM-DD`, por exemplo `1995-06-20`.
- O MongoDB gera o identificador `_id` (ObjectId de 24 caracteres).
- Os campos `criadoEm` e `atualizadoEm` são gerados pelo Mongoose.
- UF é armazenada em maiúsculas; e-mail é armazenado em minúsculas.
- Não são solicitados CPF ou RG.

## Rotas

| Método | Rota | Descrição | Respostas principais |
|---|---|---|---|
| `GET` | `/health` | Informa se o serviço está no ar e conectado ao banco | `200` |
| `POST` | `/adotantes` | Cadastra adotante e questionário | `201`, `400`, `409`, `500` |
| `GET` | `/adotantes` | Lista os cadastros, mais recentes primeiro | `200`, `500` |
| `GET` | `/adotantes/:id` | Consulta um cadastro e inclui sua idade calculada | `200`, `400`, `404`, `500` |

### `GET /health`

Exemplo de resposta:

```json
{
  "servico": "adotantes",
  "status": "ok",
  "banco": "conectado"
}
```

### `POST /adotantes`

Corpo esperado:

```json
{
  "nomeCompleto": "Maria Exemplo",
  "dataNascimento": "1995-06-20",
  "profissao": "Professora",
  "endereco": "Rua Fictícia, 123",
  "cidade": "Goiânia",
  "uf": "GO",
  "telefone": "62000000000",
  "email": "maria.exemplo@example.com",
  "questionario": {
    "jaTeveAnimais": true,
    "tipoMoradia": "casa",
    "possuiQuintal": true,
    "moradiaPropria": false,
    "outrosAnimaisEmCasa": 0,
    "horasDisponiveisPorDia": 4,
    "motivoAdocao": "Gostaria de adotar um animal fictício."
  }
}
```

Todos os campos acima são obrigatórios. Regras adicionais:

- `dataNascimento` deve ser uma data real, no formato `AAAA-MM-DD`, e não pode estar no futuro.
- `uf` deve conter duas letras.
- `email` deve ter formato válido e ser único (não diferencia maiúsculas de minúsculas).
- `questionario.jaTeveAnimais`, `possuiQuintal` e `moradiaPropria` devem ser booleanos (`true`/`false`).
- `questionario.outrosAnimaisEmCasa` deve ser um inteiro igual ou maior que zero.
- `questionario.horasDisponiveisPorDia` deve ser um número entre 0 e 24.
- `questionario.tipoMoradia` e `questionario.motivoAdocao` devem ser textos não vazios.

Em caso de sucesso, responde `201 Created` com o documento criado, incluindo `_id`, `criadoEm` e `atualizadoEm`. E-mail repetido retorna `409 Conflict`. Dados inválidos retornam `400 Bad Request`:

```json
{
  "erro": "Dados inválidos.",
  "detalhes": ["campo 'uf' deve ter 2 letras"]
}
```

### `GET /adotantes`

Retorna um array JSON com os documentos cadastrados, ordenados do mais recente ao mais antigo. A resposta inclui os dados pessoais e o questionário; não use essa rota para exibir dados em páginas públicas ou no catálogo de animais.

### `GET /adotantes/:id`

Exemplo: `GET /adotantes/6710f1c2a1b2c3d4e5f60101`

Retorna o documento e a idade calculada a partir de `dataNascimento`:

```json
{
  "_id": "6710f1c2a1b2c3d4e5f60101",
  "nomeCompleto": "Maria Exemplo",
  "dataNascimento": "1995-06-20",
  "profissao": "Professora",
  "endereco": "Rua Fictícia, 123",
  "cidade": "Goiânia",
  "uf": "GO",
  "telefone": "62000000000",
  "email": "maria.exemplo@example.com",
  "questionario": {
    "jaTeveAnimais": true,
    "tipoMoradia": "casa",
    "possuiQuintal": true,
    "moradiaPropria": false,
    "outrosAnimaisEmCasa": 0,
    "horasDisponiveisPorDia": 4,
    "motivoAdocao": "Gostaria de adotar um animal fictício."
  },
  "criadoEm": "2026-10-17T14:30:00.000Z",
  "atualizadoEm": "2026-10-17T14:30:00.000Z",
  "idade": 31
}
```

`idade` é calculada na consulta, não é persistida. Um ID malformado retorna `400`; um ID válido sem cadastro retorna `404`:

```json
{ "erro": "Adotante não encontrado." }
```

## Integração do front-end (Pessoa 4)

O arquivo `frontend/js/config.js` já define `API.adotantes` como `http://localhost:3002`. Use essa constante no navegador, em vez de repetir a URL. O serviço permite CORS.

Exemplo de envio do formulário:

```javascript
async function cadastrarAdotante(dadosDoFormulario) {
  const resposta = await fetch(`${API.adotantes}/adotantes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dadosDoFormulario),
  });

  const resultado = await resposta.json();
  if (!resposta.ok) {
    throw new Error(resultado.detalhes?.join('; ') || resultado.erro);
  }

  return resultado; // documento criado, incluindo _id
}
```

Use os campos e nomes do exemplo de `POST` acima. Guarde o `_id` retornado para enviá-lo ao microsserviço de Adoções; não exponha o documento completo do adotante no catálogo. Para consultar um adotante no navegador:

```javascript
const resposta = await fetch(`${API.adotantes}/adotantes/${adotanteId}`);
const adotante = await resposta.json();
```

O microsserviço de Adoções, quando executado na rede Docker, acessa a mesma rota por `http://adotantes:3002/adotantes/:id`.

## Roteiro de testes

Use Bruno, Postman ou outra ferramenta HTTP com base `http://localhost:3002`. Para cadastrar, envie o corpo de exemplo em `POST /adotantes`. Use e-mails novos em cada execução, pois são únicos.

| Cenário | Requisição / alteração | Resultado esperado |
|---|---|---|
| Serviço e banco disponíveis | `GET /health` | `200`; `banco` igual a `conectado` |
| Cadastro válido | `POST /adotantes` com o JSON completo | `201`; resposta contém `_id` |
| Listagem | `GET /adotantes` | `200`; array contém o cadastro criado |
| Consulta | `GET /adotantes/:id` com o `_id` do cadastro | `200`; inclui `idade` numérica |
| Campo obrigatório ausente | Remova, por exemplo, `nomeCompleto` do POST | `400`; resposta inclui `erro` e `detalhes` |
| Data inválida | Use `dataNascimento: "2025-02-30"` | `400` |
| UF inválida | Use `uf: "GYN"` | `400` |
| E-mail duplicado | Repita o POST com o mesmo e-mail | `409` |
| ID malformado | `GET /adotantes/abc` | `400` |
| ID válido sem cadastro | Consulte um ObjectId inexistente de 24 caracteres | `404` |

Também confira no MongoDB Compass se os cadastros aparecem em `adotantes_db` → `adotantes`.

### Teste rápido com `curl`

```bash
curl -i http://localhost:3002/health
curl -i http://localhost:3002/adotantes
```

Para testar um cadastro, use no Bruno ou Postman o JSON apresentado em [`POST /adotantes`](#post-adotantes). Para listar e consultar no Compass, atualize a coleção depois de salvar.

## Privacidade e limites conhecidos

- O microsserviço não implementa autenticação nesta versão acadêmica.
- `GET /adotantes` retorna todos os campos, inclusive dados pessoais. Não o conecte a componentes públicos do front-end nem exiba os documentos no catálogo.
- O microsserviço de Animais não deve acessar este banco diretamente; serviços vizinhos consultam dados por HTTP.
- Não há rotas de edição ou remoção de cadastros nesta versão.
- Use somente dados fictícios em demonstrações e testes.
