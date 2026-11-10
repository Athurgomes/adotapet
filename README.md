# Aumigo — Plataforma Comunitária de Adoção de Animais

Site para cadastrar animais disponíveis para adoção, cadastrar interessados e registrar solicitações de adoção. A arquitetura usa **3 microsserviços independentes**, cada um com o próprio banco no **MongoDB Atlas**. Os microsserviços **não chamam as APIs uns dos outros**: eles se comunicam por eventos no **Apache Kafka**.

| Componente | Tecnologia | Porta | Banco | Responsável |
|---|---|---|---|---|
| Frontend | HTML, CSS, JavaScript (nginx) | 5500 | — | Pessoa 4 |
| Microsserviço de Animais | Node.js + Express + Mongoose | 3001 | `animais_db` | Pessoa 5 |
| Microsserviço de Adotantes | Node.js + Express + Mongoose | 3002 | `adotantes_db` | Pessoa 6 |
| Microsserviço de Adoções | Node.js + Express + Mongoose | 3003 | `adocoes_db` | Pessoa 7 |
| Mensageria | Apache Kafka (KRaft, 1 nó) | 9092 (interna) | — | — |
| Kafka UI (opcional) | kafbat/kafka-ui | 8080 | — | — |

Tudo roda em containers Docker, agrupados no projeto **`projeto-adotapet`**.

```
Navegador ──HTTP──► frontend :5500
    │
    ├──HTTP──► animais   :3001 ──► Atlas: animais_db
    ├──HTTP──► adotantes :3002 ──► Atlas: adotantes_db
    └──HTTP──► adocoes   :3003 ──► Atlas: adocoes_db (+ réplicas de animais e adotantes)

Entre os microsserviços, só eventos (Kafka):

  animais   ──publica──► animais.eventos   ──┐
  adotantes ──publica──► adotantes.eventos ──┴──► adocoes consome e atualiza as réplicas
  adocoes   ──publica──► adocoes.eventos   (solicitação criada / status alterado)
```

### Comunicação por eventos (Kafka)

- Sempre que um animal é cadastrado ou alterado, o serviço de **Animais** publica o estado atual em `animais.eventos`. O de **Adotantes** faz o mesmo em `adotantes.eventos` a cada cadastro.
- O serviço de **Adoções** consome esses tópicos e guarda, no **próprio banco**, uma cópia mínima (réplica) com o que precisa: disponibilidade do animal, data de nascimento do adotante e os campos dos resumos.
- No `POST /adocoes`, a validação usa essas réplicas. **Não há chamada HTTP entre os serviços**, então uma solicitação pode ser registrada mesmo com Animais ou Adotantes fora do ar.
- Os tópicos de animais e adotantes são **compactados** (o Kafka guarda o último evento de cada id) e cada serviço republica todos os seus registros ao iniciar. Assim, as réplicas podem ser reconstruídas a qualquer momento e nenhum evento perdido fica para trás.
- **Consistência eventual:** um animal recém-cadastrado leva alguns milissegundos para chegar à réplica. É o preço da independência entre os serviços.

Formato dos eventos e tópicos: [contrato de API, seção 4](docs/contrato-api.md#4-eventos-kafka).

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e **aberto**
- [Git](https://git-scm.com/downloads)
- Arquivo `.env` com as connection strings do Atlas (enviado no grupo pela Pessoa 3)

Não é preciso instalar Node.js nem MongoDB: tudo roda dentro dos containers.

## Como rodar

```bash
# 1. Clonar o repositório
git clone https://github.com/Athurgomes/adotapet.git
cd adotapet

# 2. Criar o .env a partir do modelo e colar as strings recebidas
cp .env.example .env

# 3. Subir tudo
docker compose up --build
```

Pronto:

| Endereço | O que é |
|---|---|
| <http://localhost:5500> | Site (por enquanto, uma página de status dos serviços) |
| <http://localhost:3001/health> | Saúde do serviço de Animais |
| <http://localhost:3002/health> | Saúde do serviço de Adotantes |
| <http://localhost:3003/health> | Saúde do serviço de Adoções (mostra também o Kafka e quantos registros há nas réplicas) |
| <http://localhost:8080> | Kafka UI: tópicos e mensagens (só com `docker compose --profile kafka-ui up`) |

Se a página mostrar os 3 serviços **"no ar"** e **"conectado"**, o ambiente está pronto.

## Comandos úteis

| Comando | Para quê |
|---|---|
| `docker compose up --build` | Subir tudo (reconstrói se algo mudou) |
| `docker compose up -d --build` | Subir em segundo plano |
| `docker compose down` | Parar e remover os containers |
| `docker compose ps` | Ver o estado de cada serviço |
| `docker compose logs -f animais` | Acompanhar os logs de um serviço |
| `docker compose restart adocoes` | Reiniciar um serviço |
| `docker compose stop animais` | Derrubar só um serviço (bom para demonstrar a independência na apresentação) |
| `docker compose --profile kafka-ui up -d` | Subir também a interface do Kafka (<http://localhost:8080>) |

### Testes de integração

Com o projeto no ar, em outro terminal:

```bash
docker compose run --rm testes            # fluxo completo + cenários de erro
docker compose run --rm testes --queda    # depois de "docker compose stop animais" (ou adotantes)
```

O resultado (PASSOU / FALHOU / PENDENTE) aparece no terminal e as evidências ficam em `tests/resultados/`. Rotas ainda não implementadas aparecem como **PENDENTE**. Detalhes no [plano de testes](docs/testes/plano-de-testes.md).

### Desenvolvimento

- **Backend:** ao salvar qualquer arquivo em `services/<servico>/src/`, o serviço reinicia sozinho (`node --watch`). Não precisa reconstruir.
- **Frontend:** basta salvar e recarregar a página (F5).
- **Adicionar uma dependência npm** (ex.: no serviço de animais):
  ```bash
  cd services/animais
  npm install nome-do-pacote          # se tiver Node instalado
  cd ../..
  docker compose up --build animais
  ```
  Sem Node instalado, rode o `npm install` dentro de um container:
  ```bash
  docker run --rm -v "${PWD}/services/animais:/app" -w /app node:24-alpine npm install nome-do-pacote
  ```
  Sempre faça commit do `package.json` **e** do `package-lock.json`.

## Estrutura de pastas

```
adotapet/
├── docker-compose.yml       # Orquestra os containers, incluindo o Kafka (projeto-adotapet)
├── .env.example             # Modelo das variáveis de ambiente (o .env real NÃO vai para o Git)
├── frontend/                # Pessoa 4
│   ├── index.html
│   ├── css/  js/  img/
│   └── js/config.js         # URLs das APIs usadas pelo navegador
├── services/
│   ├── animais/             # Pessoa 5
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── server.js    # Express, CORS, /health, tratamento de erros
│   │       ├── db.js        # Conexão com o MongoDB (Mongoose)
│   │       └── routes/      # Rotas do serviço (stubs que respondem 501)
│   ├── adotantes/           # Pessoa 6 (mesma estrutura)
│   └── adocoes/             # Pessoa 7 (mesma estrutura)
├── tests/                   # Pessoa 9
│   └── integracao.js        # Testes de integração (docker compose run --rm testes)
└── docs/
    ├── contrato-api.md        # Campos, rotas e JSON combinados entre os serviços
    ├── guia-banco-de-dados.md # Como conectar no MongoDB Atlas e quem usa cada acesso
    ├── testes/                # Plano de testes e registro de erros
    └── relatorio/             # Relatório técnico e evidências (prints)
```

## Variáveis de ambiente

Definidas no `docker-compose.yml`. Só as connection strings vêm do `.env`.

| Variável | Serviço | Valor |
|---|---|---|
| `PORT` | todos | 3001 / 3002 / 3003 |
| `DB_NAME` | todos | `animais_db` / `adotantes_db` / `adocoes_db` |
| `MONGODB_URI` | todos | Vem de `ANIMAIS_MONGODB_URI`, `ADOTANTES_MONGODB_URI` e `ADOCOES_MONGODB_URI` no `.env` |
| `KAFKA_BROKERS` | todos | `kafka:9092` (nome do serviço na rede do Docker) |

> Os microsserviços não precisam saber o endereço uns dos outros: só o do Kafka. No navegador (frontend), as APIs continuam em **`localhost`** (`http://localhost:3001`).

## Problemas comuns

| Sintoma | Solução |
|---|---|
| `required variable ANIMAIS_MONGODB_URI is missing` | O arquivo `.env` não existe ou está incompleto. Copie o `.env.example` e preencha. |
| `error during connect` / `cannot find the file specified` | O Docker Desktop não está aberto. |
| `port is already allocated` | Outro programa usa a porta (ex.: Live Server na 5500). Feche-o ou rode `docker compose down`. |
| Serviço "no ar", mas banco "desconectado" | Veja os logs (`docker compose logs animais`) e o [guia do banco](docs/guia-banco-de-dados.md#problemas-comuns). |
| Mudei o `package.json` e nada aconteceu | Rode `docker compose up --build`. |
| Rota responde `501` | Normal: a rota ainda não foi implementada. |
| `kafka: "desconectado"` no `/health` logo ao subir | O Kafka leva uns 20 segundos para ficar pronto; os serviços tentam de novo a cada 5 segundos. |
| Solicitação de um animal recém-cadastrado responde `404` | A réplica ainda não recebeu o evento. Espere um instante e tente de novo; se persistir, veja `docker compose logs adocoes`. |

## Documentação

- [Contrato de API](docs/contrato-api.md): **leitura obrigatória antes de programar**
- [Guia rápido do banco de dados](docs/guia-banco-de-dados.md): **leitura obrigatória antes de rodar**
- [Plano de testes](docs/testes/plano-de-testes.md) e [registro de erros](docs/testes/registro-de-erros.md)
- [Relatório técnico](docs/relatorio/relatorio-tecnico.md) (esqueleto e status das contribuições)
