# Guia rápido — Banco de dados (MongoDB Atlas)

Leia antes de começar a programar. Dúvidas de conexão: falar com a **Pessoa 3**.

## Como está configurado

- O banco fica na nuvem, no **MongoDB Atlas** (plano gratuito M0). Ninguém precisa instalar MongoDB.
- Existe **um cluster** (`adotapet`) com **três bancos lógicos**, um por microsserviço:

| Banco | Coleção | Microsserviço | Porta |
|---|---|---|---|
| `animais_db` | `animais` | Animais | 3001 |
| `adotantes_db` | `adotantes` | Adotantes | 3002 |
| `adocoes_db` | `solicitacoes` | Adoções | 3003 |

- Cada microsserviço conecta com **um usuário próprio, que só tem acesso ao próprio banco**. Se o serviço de Adoções tentar gravar em `animais_db`, o Atlas bloqueia. É assim que garantimos o **RNF06**: para obter dados de outro serviço, chame a **API** dele (HTTP), nunca o banco.

### Usuários

As senhas estão no arquivo **`credenciais-mongodb.txt`**, enviado no grupo.

| Usuário | Permissão | Para quê |
|---|---|---|
| `svc_animais` | leitura e escrita em `animais_db` | Usado pelo serviço de Animais (vem no `.env`) |
| `svc_adotantes` | leitura e escrita em `adotantes_db` | Usado pelo serviço de Adotantes (vem no `.env`) |
| `svc_adocoes` | leitura e escrita em `adocoes_db` | Usado pelo serviço de Adoções (vem no `.env`) |
| `exp_pessoa8` | leitura e escrita nos 3 bancos | Experimentos da Pessoa 8 no Compass/mongosh |
| `leitura_geral` | somente leitura nos 3 bancos | Para quem quiser **visualizar** os dados no Compass |

## Passo a passo para todos (rodar o projeto)

1. Instale e abra o **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**.
2. Clone o repositório e entre na pasta `adotapet`.
3. Salve o arquivo **`.env`** enviado no grupo **na raiz do projeto** (mesma pasta do `docker-compose.yml`).
   - O nome precisa ser exatamente `.env`. No Windows, cuidado para não ficar `.env.txt`.
   - Ele **não vai para o GitHub** (está no `.gitignore`). **Nunca** faça commit dele.
4. Rode:
   ```bash
   docker compose up --build
   ```
5. Abra <http://localhost:5500>. Os 3 serviços devem aparecer como **"no ar"** e **"conectado"**.

Você **não precisa** mexer em connection string no código: o `docker-compose.yml` lê o `.env` e entrega a cada serviço as variáveis `MONGODB_URI` e `DB_NAME`.

## O que cada pessoa precisa fazer

| Pessoa | O que fazer |
|---|---|
| **4 — Frontend** | Só o passo a passo acima. O frontend **nunca** acessa o banco: ele chama as APIs (`frontend/js/config.js`). |
| **5 — Animais** | Passo a passo acima e criar os models Mongoose em `services/animais/src/`. A conexão já está pronta em `src/db.js`. |
| **6 — Adotantes** | O mesmo, em `services/adotantes/src/`. |
| **7 — Adoções** | O mesmo, em `services/adocoes/src/`. Para consultar animais e adotantes, use `fetch` com `process.env.ANIMAIS_API_URL` e `process.env.ADOTANTES_API_URL`. |
| **8 — Experimentos** | Conectar no **Compass** com o usuário `exp_pessoa8` (veja abaixo). Use preferencialmente uma coleção própria (ex.: `experimentos`) para não bagunçar os dados que os serviços usam. |
| **9 — Testes** | Rodar o projeto e conferir os dados gravados no **Compass** com `leitura_geral`. |
| **1 e 2** | Opcional: visualizar os dados no Compass com `leitura_geral`. |

### Exemplo para os backends (Pessoas 5, 6 e 7)

A conexão já é feita no `server.js`. Basta criar o model e usá-lo nas rotas:

```js
// src/models/Animal.js
const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    especie: { type: String, required: true },
    caracteristicas: { type: mongoose.Schema.Types.Mixed }, // campos livres
    disponivel: { type: Boolean, default: true },
    // ... demais campos do docs/contrato-api.md
  },
  { timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } }
);

// O terceiro argumento é o nome da coleção no banco
module.exports = mongoose.model('Animal', animalSchema, 'animais');
```

Os campos e nomes oficiais estão em [contrato-api.md](contrato-api.md).

## Visualizar os dados com o MongoDB Compass

1. Baixe o **[MongoDB Compass](https://www.mongodb.com/try/download/compass)** (gratuito).
2. Clique em **Add new connection** e cole a **string** do seu usuário (do `credenciais-mongodb.txt`).
3. Clique em **Save & Connect**. Os 3 bancos aparecem no menu à esquerda.

Com `leitura_geral` você vê tudo, mas não consegue alterar nada. Pode explorar sem medo.

## Regras importantes

- **Nunca** coloque senhas ou o `.env` no GitHub, em prints do relatório ou em slides.
- Um serviço **não** acessa o banco de outro. Use a API.
- Use apenas **dados fictícios** (sem CPF, RG ou dados reais, RNF09).
- O plano gratuito tem 512 MB, que é suficiente. Mesmo assim, não insira imagens no banco: guarde só a **URL** da imagem.

## Problemas comuns

| Sintoma | Solução |
|---|---|
| `required variable ANIMAIS_MONGODB_URI is missing` | O `.env` não está na raiz do projeto ou o nome está errado (`.env.txt`). |
| Serviço "no ar", mas banco "desconectado" | Veja o log: `docker compose logs animais`. |
| `bad auth : authentication failed` | Usuário ou senha errados. Copie de novo o `.env` do grupo. |
| `querySrv ENOTFOUND` / timeout | Problema de rede: algumas redes (ex.: da faculdade) bloqueiam o Atlas. Teste em outra rede ou no 4G. |
| `not authorized on ... to execute command` | Você está tentando acessar um banco sem permissão. Confira o usuário e o banco. |
