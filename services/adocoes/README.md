# Microsserviço de Adoções — Aumigo

Serviço responsável por registrar e consultar solicitações de adoção. Ele usa **Node.js**, **Express** e **Mongoose**, roda na porta **3003** e grava seus dados no banco **`adocoes_db`** do MongoDB Atlas.

O serviço **não chama** as APIs de Animais e Adotantes. Os dados de que ele precisa chegam por eventos no **Kafka** e ficam em réplicas no próprio `adocoes_db`. Ele nunca acessa os bancos dos outros serviços.

```
animais   ──publica──► animais.eventos   ──┐
adotantes ──publica──► adotantes.eventos ──┴──► adocoes :3003 ──► Atlas: adocoes_db
                                                   │                 (solicitacoes + réplicas)
                                                   └──publica──► adocoes.eventos
```

Por isso uma solicitação pode ser registrada mesmo com Animais ou Adotantes fora do ar.

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
| <http://localhost:3003/health> | Saúde do serviço: banco, Kafka e quantos registros há em cada réplica |
| <http://localhost:3003/adocoes> | Cadastro e listagem de solicitações |

Durante o desenvolvimento, os arquivos de `src/` estão montados no container e o processo usa `node --watch`.

## Variáveis de ambiente

As variáveis são definidas no `docker-compose.yml` da raiz.

| Variável | Exemplo | Uso |
|---|---|---|
| `PORT` | `3003` | Porta HTTP do serviço |
| `DB_NAME` | `adocoes_db` | Banco usado pelo Mongoose |
| `MONGODB_URI` | Vem de `ADOCOES_MONGODB_URI` | Connection string do usuário `svc_adocoes` |
| `KAFKA_BROKERS` | `kafka:9092` | Endereço do Kafka (o único serviço externo que Adoções precisa conhecer) |

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

## Réplicas (dados vindos do Kafka)

| Coleção | Tópico de origem | Campos |
|---|---|---|
| `replica_animais` | `animais.eventos` (`AnimalSalvo`) | `nome`, `especie`, `porte`, `cidade`, `uf`, `imagemUrl`, `disponivel`, `atualizadoEm` |
| `replica_adotantes` | `adotantes.eventos` (`AdotanteSalvo`) | `nomeCompleto`, `dataNascimento`, `cidade`, `uf`, `email`, `atualizadoEm` |

O `_id` de cada réplica é o id do serviço de origem. Um evento só é aplicado se o `atualizadoEm` dele não for mais antigo que o já salvo, então receber o mesmo evento duas vezes, ou fora de ordem, não causa problema. A idade é calculada a partir de `dataNascimento` na hora da solicitação.

O consumidor (grupo `adocoes-replicas`) lê os tópicos desde o início na primeira vez e só começa depois que o banco conecta. Ao parar o container, ele sai do grupo na hora, para que o próximo container volte a consumir sem esperar.

## Rotas

| Método | Rota | Descrição | Sucesso |
|---|---|---|---|
| `POST` | `/adocoes` | Registrar uma solicitação | `201` + documento criado |
| `GET` | `/adocoes` | Listar solicitações | `200` + array |
| `GET` | `/adocoes/:id` | Consultar uma solicitação | `200` + documento |
| `PATCH` | `/adocoes/:id/status` | Alterar o andamento (painel) | `200` + documento atualizado |

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
2. Busca o animal em `replica_animais` e verifica se está disponível.
3. Busca o adotante em `replica_adotantes` e verifica se tem pelo menos 21 anos.
4. Verifica se já existe uma solicitação `Pendente` para o mesmo animal e adotante.
5. Salva a solicitação com os resumos históricos e publica `SolicitacaoCriada` em `adocoes.eventos`.

A regra de negócio (passos 2 e 3) fica em `src/validacao.js`, sem acesso a banco ou rede.

Registrar uma solicitação não muda a disponibilidade do animal.

### Listar solicitações

`GET /adocoes`

Filtros opcionais e combináveis:

- `animalId`
- `adotanteId`
- `status` — `Pendente`, `Em contato` ou `Concluído`

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
| `404` | Animal, adotante ou solicitação não encontrado (um animal recém-cadastrado pode levar alguns milissegundos para chegar à réplica) |
| `409` | Animal indisponível ou solicitação pendente duplicada |
| `422` | Adotante com menos de 21 anos |
| `503` | Banco de Adoções indisponível ou réplica com dados incompletos |
| `500` | Erro inesperado |

Formato das respostas de erro:

```json
{
  "erro": "Mensagem legível para mostrar ao usuário.",
  "detalhes": ["informação adicional de validação"]
}
```

## Estrutura

```
services/adocoes/
├── Dockerfile
├── package.json
├── package-lock.json
├── README.md
├── src/
│   ├── server.js
│   ├── db.js
│   ├── eventos.js           # Kafka: consome animais/adotantes.eventos e publica adocoes.eventos
│   ├── replicas.js          # Aplica os eventos nas réplicas (ignora eventos antigos)
│   ├── validacao.js         # Regras da solicitação (idade, disponibilidade), sem I/O
│   ├── models/
│   │   ├── Solicitacao.js
│   │   ├── AnimalReplica.js
│   │   └── AdotanteReplica.js
│   └── routes/
│       └── adocoes.js
└── test/                    # Testes unitários (npm test)
```

## Testes unitários

Não precisam de banco nem de Kafka:

```bash
cd services/adocoes
npm install
npm test
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
| `kafka: "desconectado"` no `/health` | O Kafka leva uns 20 segundos para subir; o serviço tenta de novo a cada 5 segundos. Veja `docker compose logs kafka` |
| Criação retorna `404` para um animal que existe | A réplica ainda não recebeu o evento. Confira `replicas` no `/health` e os logs de Adoções |
| `not allowed to do action [find] on adocoes_db.replica_...` | O usuário `svc_adocoes` está restrito a uma coleção no Atlas. A permissão deve ser `readWrite` no banco `adocoes_db` inteiro |
| Alteração não apareceu no container | Rode `docker compose restart adocoes` |

O contrato completo e as decisões compartilhadas entre os serviços estão em [docs/contrato-api.md](../../docs/contrato-api.md), na raiz do projeto.
