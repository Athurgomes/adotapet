# Aumigo — Plataforma Comunitária de Adoção de Animais

Site para cadastrar animais disponíveis para adoção, cadastrar interessados e registrar solicitações de adoção. A arquitetura usa **3 microsserviços independentes**, cada um com o próprio banco no **MongoDB Atlas**.

| Componente | Tecnologia | Porta | Banco | Responsável |
|---|---|---|---|---|
| Frontend | HTML, CSS, JavaScript (nginx) | 5500 | — | Pessoa 4 |
| Microsserviço de Animais | Node.js + Express + Mongoose | 3001 | `animais_db` | Pessoa 5 |
| Microsserviço de Adotantes | Node.js + Express + Mongoose | 3002 | `adotantes_db` | Pessoa 6 |
| Microsserviço de Adoções | Node.js + Express + Mongoose | 3003 | `adocoes_db` | Pessoa 7 |

Tudo roda em containers Docker, agrupados no projeto **`projeto-adotapet`**.

```
Navegador ──► frontend :5500
    │
    ├──► animais   :3001 ──► Atlas: animais_db
    ├──► adotantes :3002 ──► Atlas: adotantes_db
    └──► adocoes   :3003 ──► Atlas: adocoes_db
              │
              ├──► HTTP: animais   (verifica existência e disponibilidade)
              └──► HTTP: adotantes (verifica existência e idade mínima)
```

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
| <http://localhost:3003/health> | Saúde do serviço de Adoções (mostra também se ele alcança os outros dois) |

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
├── docker-compose.yml       # Orquestra os 4 containers (projeto-adotapet)
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
| `ANIMAIS_API_URL` | adocoes | `http://animais:3001` (nome do serviço na rede do Docker) |
| `ADOTANTES_API_URL` | adocoes | `http://adotantes:3002` |

> Entre containers, use o **nome do serviço** (`http://animais:3001`). No navegador (frontend), use **`localhost`** (`http://localhost:3001`).

## Problemas comuns

| Sintoma | Solução |
|---|---|
| `required variable ANIMAIS_MONGODB_URI is missing` | O arquivo `.env` não existe ou está incompleto. Copie o `.env.example` e preencha. |
| `error during connect` / `cannot find the file specified` | O Docker Desktop não está aberto. |
| `port is already allocated` | Outro programa usa a porta (ex.: Live Server na 5500). Feche-o ou rode `docker compose down`. |
| Serviço "no ar", mas banco "desconectado" | Veja os logs (`docker compose logs animais`) e o [guia do banco](docs/guia-banco-de-dados.md#problemas-comuns). |
| Mudei o `package.json` e nada aconteceu | Rode `docker compose up --build`. |
| Rota responde `501` | Normal: a rota ainda não foi implementada. |

## Documentação

- [Contrato de API](docs/contrato-api.md): **leitura obrigatória antes de programar**
- [Guia rápido do banco de dados](docs/guia-banco-de-dados.md): **leitura obrigatória antes de rodar**
- [Plano de testes](docs/testes/plano-de-testes.md) e [registro de erros](docs/testes/registro-de-erros.md)
- [Relatório técnico](docs/relatorio/relatorio-tecnico.md) (esqueleto e status das contribuições)
