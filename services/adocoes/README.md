# Microsserviço de Adoções — AdotaPet

Serviço responsável por registrar e consultar solicitações de adoção. Ele usa **Node.js**, **Express** e **Mongoose**, roda na porta **3003** e grava seus dados no banco **`adocoes_db`** do MongoDB Atlas.

Para validar uma solicitação, o serviço consulta os microsserviços de Animais e Adotantes por HTTP. Ele nunca acessa os bancos desses serviços diretamente.

```
adocoes :3003 ──► Atlas: adocoes_db
      │
      ├──► animais   :3001 ──► verifica existência e disponibilidade
      └──► adotantes :3002 ──► verifica existência e idade mínima
```

---

## Como rodar

O serviço faz parte do Docker Compose da raiz do projeto. Com o arquivo `.env` configurado, rode a partir da pasta `adotapet`:

```bash
docker compose up --build adocoes
```

Para subir todo o projeto:

```bash
docker compose up --build
```

O serviço fica disponível em <http://localhost:3003>.

| Endereço | O que é |
|---|---|
| <http://localhost:3003/health> | Saúde do serviço, banco e dependências |
| <http://localhost:3003/adocoes> | Cadastro e listagem de solicitações |

Durante o desenvolvimento, os arquivos de `src/` estão montados no container e o processo usa `node --watch`.

## Variáveis de ambiente

As variáveis são definidas no `docker-compose.yml` da raiz.

| Variável | Exemplo | Uso |
|---|---|---|
| `PORT` | `3003` | Porta HTTP do serviço |
| `DB_NAME` | `adocoes_db` | Banco usado pelo Mongoose |
| `MONGODB_URI` | Vem de `ADOCOES_MONGODB_URI` | Connection string do usuário `svc_adocoes` |
| `ANIMAIS_API_URL` | `http://animais:3001` | API do microsserviço de Animais |
| `ADOTANTES_API_URL` | `http://adotantes:3002` | API do microsserviço de Adotantes |

> As credenciais ficam somente no `.env` da raiz. Nunca coloque connection strings no código ou faça commit do `.env`.

## Documento salvo

**Coleção:** `solicitacoes`

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

Os resumos guardam uma cópia dos dados no momento da solicitação. Alterações posteriores no animal ou no adotante não modificam esse registro histórico.

## Rotas

| Método | Rota | Descrição | Sucesso |
|---|---|---|---|
| `POST` | `/adocoes` | Registrar uma solicitação | `201` + documento criado |
| `GET` | `/adocoes` | Listar solicitações | `200` + array |
| `GET` | `/adocoes/:id` | Consultar uma solicitação | `200` + documento |

### Registrar uma solicitação

`POST /adocoes`

```json
{
  "animalId": "6710f1c2a1b2c3d4e5f60001",
  "adotanteId": "6710f1c2a1b2c3d4e5f60101"
}
```

Exemplo:

```bash
curl -X POST http://localhost:3003/adocoes \
  -H "Content-Type: application/json" \
  -d '{"animalId":"6710f1c2a1b2c3d4e5f60001","adotanteId":"6710f1c2a1b2c3d4e5f60101"}'
```

Fluxo executado pelo serviço:

1. Valida `animalId` e `adotanteId`.
2. Consulta `GET /animais/:animalId` e verifica se o animal está disponível.
3. Consulta `GET /adotantes/:adotanteId` e verifica se o adotante tem pelo menos 21 anos.
4. Verifica se já existe uma solicitação `Pendente` para o mesmo animal e adotante.
5. Salva a solicitação com os resumos históricos.

Registrar uma solicitação não muda a disponibilidade do animal.

### Listar solicitações

`GET /adocoes`

Filtros opcionais e combináveis:

- `animalId`
- `adotanteId`
- `status` — nesta versão, o valor aceito é `Pendente`

Exemplo:

```bash
curl "http://localhost:3003/adocoes?animalId=6710f1c2a1b2c3d4e5f60001&status=Pendente"
```

### Consultar uma solicitação

`GET /adocoes/:id`

```bash
curl http://localhost:3003/adocoes/6710f1c2a1b2c3d4e5f60201
```

## Regras e respostas de erro

| Código | Quando ocorre |
|---|---|
| `400` | IDs ou filtros inválidos |
| `404` | Animal, adotante ou solicitação não encontrado |
| `409` | Animal indisponível ou solicitação pendente duplicada |
| `422` | Adotante com menos de 21 anos |
| `503` | Microsserviço dependente indisponível ou com resposta inválida |
| `500` | Erro inesperado |

Formato das respostas de erro:

```json
{
  "erro": "Mensagem legível para mostrar ao usuário.",
  "detalhes": ["informação adicional de validação"]
}
```

Enquanto as rotas de Animais e Adotantes ainda responderem `501`, uma tentativa válida de criar uma adoção retorna `503`. As consultas às solicitações continuam funcionando normalmente.

## Estrutura

```
services/adocoes/
├── Dockerfile
├── package.json
├── package-lock.json
├── README.md
└── src/
    ├── server.js
    ├── db.js
    ├── models/
    │   └── Solicitacao.js
    └── routes/
        └── adocoes.js
```

## Comandos úteis

Execute a partir da raiz do projeto:

| Comando | Para quê |
|---|---|
| `docker compose restart adocoes` | Reiniciar somente este serviço |
| `docker compose logs -f adocoes` | Acompanhar os logs |
| `docker compose ps adocoes` | Ver o estado do container |

## Problemas comuns

| Sintoma | Solução |
|---|---|
| `MONGODB_URI não definida` | Confira `ADOCOES_MONGODB_URI` no `.env` da raiz |
| Banco aparece como `desconectado` | Confira os logs e o acesso ao MongoDB Atlas |
| Criação retorna `503` | Verifique se Animais e Adotantes implementaram as rotas de consulta |
| Alteração não apareceu no container | Rode `docker compose restart adocoes` |

O contrato completo e as decisões compartilhadas entre os serviços estão em [docs/contrato-api.md](../../docs/contrato-api.md), na raiz do projeto.
