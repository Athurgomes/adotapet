# Relatório Técnico — Aumigo: Plataforma Comunitária de Adoção de Animais

> **Organização:** Pessoa 9. Este arquivo é o **esqueleto** do relatório: cada seção indica o responsável e o que precisa ser enviado.
> Ao final, o conteúdo será padronizado e passado para o formato de entrega (Word/PDF).

## Status das contribuições

| Seção | Responsável | O que enviar | Status |
|---|---|---|---|
| 1–3. Introdução, requisitos e escopo | Pessoa 1 | Texto do documento de requisitos | Recebido — **versão revisada** (`requisitos (1).docx`, 21/10) |
| 4. Arquitetura | Pessoa 1 + Pessoa 3 | Decisões de arquitetura e diagrama | Texto recebido; falta o diagrama e as decisões (4.1) |
| 5. Infraestrutura e ambiente | Pessoa 3 | Repositório, Docker, Atlas, usuários e variáveis | Parcial (README e guia do banco) |
| 6. Design (UI/UX) | Pessoa 2 | Link do Figma, paleta, fontes, prints das telas, decisões | Pendente |
| 7. Modelagem dos dados no MongoDB | Pessoa 8 + 5, 6, 7 | Modelos finais dos 3 documentos e justificativas | Recebido (`docs/analise-comparativa-banco.md`, seção 3) |
| 8.1 Microsserviço de Animais | Pessoa 5 | Rotas implementadas, exemplos de requisição/resposta, decisões | Código na `main` (PR #4), **falta a rota de edição (E17)**; base: `contrato-api.md` e `testes.http` |
| 8.2 Microsserviço de Adotantes | Pessoa 6 | Idem + validações | Código na `main`; texto pendente |
| 8.3 Microsserviço de Adoções | Pessoa 7 | Idem + comunicação entre serviços | Código na `main`; base para o texto: `services/adocoes/README.md` |
| 9. Frontend | Pessoa 4 | Páginas, integração com as APIs, prints | Site e painel na `main` (PRs #3 e #6); correções pendentes: E09, E17, E18, E19 |
| 10. Experimentação MongoDB x PostgreSQL | Pessoa 8 | Comandos, resultados, modelo relacional, comparação | Recebido (`docs/analise-comparativa-banco.md` + 5 prints em `docs/evidencias-mongodb/`) |
| 11. Testes e integração | Pessoa 9 | Plano, resultados, erros e correções | Em andamento |
| 12. Conclusão | Todos (Pessoa 1 consolida) | 1 parágrafo de cada um: dificuldades e aprendizados | Pendente |

**Como enviar:** texto em `.docx`, Google Docs ou Markdown, com os prints separados (PNG) e nomeados conforme o [checklist de evidências](evidencias/README.md). Não enviar prints com senhas ou connection strings.

## Padrões do relatório

- Idioma: português, 3ª pessoa ("o sistema permite", "foi utilizado").
- Termos padronizados: **microsserviço** (não "micro-serviço"), **interessado** (quem preenche o questionário; o serviço continua se chamando *Adotantes*), **solicitação de adoção**, **área administrativa** / **painel administrativo**, **MongoDB Atlas**, nomes dos bancos em código (`animais_db`).
- Numeração dos requisitos: usar a da **versão revisada** (RF01–RF13, RNF01–RNF11).
- Nomes de campos, rotas e comandos em `código`: `GET /animais`, `disponivel`.
- Figuras numeradas com legenda abaixo: *Figura N – Descrição. Fonte: os autores (2026).*
- Tabelas numeradas com título acima: *Tabela N – Descrição.*
- Trechos de código curtos (até ~20 linhas); o código completo fica no repositório.
- Prints sem senhas, connection strings ou dados pessoais reais (RNF09).

---

## Sumário

1. Introdução
2. Requisitos
3. Delimitação do escopo
4. Arquitetura
5. Infraestrutura e ambiente
6. Design da interface
7. Modelagem dos dados no MongoDB
8. Microsserviços
9. Frontend
10. Experimentação e análise comparativa: MongoDB x PostgreSQL
11. Testes e integração
12. Conclusão
13. Referências
- Apêndice A — Contribuições dos integrantes

---

## 1. Introdução

*Responsável: Pessoa 1 — texto da versão revisada dos requisitos (21/10/2026)*

### 1.1 Problema

Atualmente, muitos animais disponíveis para adoção são divulgados por meio de redes sociais, grupos de mensagens e publicações individuais. Como essas informações ficam espalhadas em diferentes lugares, pode ser difícil para as pessoas encontrarem animais disponíveis e obterem informações sobre eles.

Além disso, a falta de um espaço organizado pode dificultar a divulgação dos animais por parte de protetores independentes e abrigos.

### 1.2 Justificativa

O Aumigo foi pensado para facilitar a divulgação de animais disponíveis para adoção, reunindo suas informações em uma única plataforma. A ideia é permitir que um administrador autorizado cadastre e gerencie os animais divulgados, enquanto as pessoas interessadas poderão consultar as informações e fazer solicitações de adoção.

O projeto também permite aplicar na prática os conteúdos estudados na disciplina, principalmente a utilização de bancos de dados não convencionais e a arquitetura de microsserviços. Para isso, será utilizado o MongoDB para armazenar os dados e três microsserviços responsáveis por animais, adotantes e solicitações de adoção.

### 1.3 Objetivos

O objetivo do Aumigo é desenvolver uma plataforma web que facilite a divulgação de animais disponíveis para adoção e permita que pessoas interessadas encontrem informações sobre eles em um único lugar.

Para isso, o sistema permitirá cadastrar e editar animais com informações como nome, espécie, sexo, idade, porte e características, além de disponibilizar um catálogo para consulta com filtros por espécie, sexo, porte e região. Também será possível que pessoas interessadas em adotar preencham um formulário com informações pessoais e perguntas sobre suas condições para cuidar de um animal, permitindo o envio de solicitações de adoção.

O projeto também tem como objetivo aplicar os conhecimentos estudados na disciplina, utilizando o MongoDB para armazenar os dados e uma arquitetura de microsserviços para separar as funcionalidades do sistema.

### 1.4 Público-alvo

O público-alvo são protetores independentes e abrigos que precisam divulgar animais disponíveis para adoção, além de pessoas que desejam adotar um animal e procuram uma forma mais organizada de encontrar essas informações.

## 2. Requisitos

*Responsável: Pessoa 1*

Os requisitos funcionais definem as funcionalidades que o Aumigo deverá oferecer aos usuários, enquanto os requisitos não funcionais descrevem as características técnicas necessárias para o funcionamento do sistema.

### 2.1 Requisitos funcionais

*Tabela 1 – Requisitos funcionais.*

| Código | Requisito | Descrição |
|---|---|---|
| RF01 | Cadastro de animais | O sistema deverá permitir o cadastro de animais pela área administrativa, incluindo nome, espécie, sexo, idade, porte, características, histórico de vacinas, cidade, UF e URL da imagem. |
| RF02 | Listagem de animais | O sistema deverá apresentar um catálogo com os animais cadastrados disponíveis e suas principais informações. |
| RF03 | Filtro de animais | O sistema deverá permitir filtrar os animais cadastrados por espécie, sexo, porte, cidade e UF. |
| RF04 | Consulta de animais | O sistema deverá permitir consultar as informações de um animal específico. |
| RF05 | Atualização da disponibilidade | O sistema deverá permitir alterar a disponibilidade dos animais pela área administrativa, registrando a alteração no banco de dados. Animais indisponíveis não deverão aparecer na página inicial. |
| RF06 | Questionário de adoção | O sistema deverá disponibilizar um questionário para que o interessado informe nome completo, data de nascimento, profissão, endereço, cidade, UF, telefone, e-mail, tipo de moradia, animal de interesse e informações sobre sua rotina e os motivos pelos quais deseja adotar, sem necessidade de criar uma conta. |
| RF07 | Idade mínima | O sistema deverá permitir solicitações de adoção apenas de pessoas com idade igual ou superior a 21 anos, conforme regra definida para o projeto. |
| RF08 | Solicitação de adoção | O sistema deverá permitir o envio de solicitações de adoção a partir do questionário preenchido pelo interessado, associando suas informações ao animal escolhido. |
| RF09 | Registro da solicitação | O sistema deverá registrar os dados das solicitações de adoção recebidas para armazenamento e consulta pelos serviços responsáveis. |
| RF10 | Validação da solicitação | O microsserviço de Adoções deverá consultar os serviços de Animais e Adotantes via API REST para verificar os dados necessários, a idade mínima e a disponibilidade do animal. |
| RF11 | Interface de login administrativo | O sistema deverá disponibilizar uma tela de login administrativo com campos para e-mail e senha. |
| RF12 | Edição de animais | O sistema deverá permitir a edição das informações dos animais já cadastrados por meio da área administrativa. |
| RF13 | Consulta de solicitações | O sistema deverá permitir consultar, no painel administrativo, uma lista geral das solicitações de adoção registradas, contendo informações dos interessados e dos animais solicitados. |

### 2.2 Requisitos não funcionais

*Tabela 2 – Requisitos não funcionais.*

| Código | Requisito | Descrição |
|---|---|---|
| RNF01 | Aplicação web | O sistema deverá funcionar por meio de um navegador, utilizando HTML, CSS e JavaScript no frontend. |
| RNF02 | Arquitetura de microsserviços | O backend deverá ser dividido em três microsserviços independentes: Animais, Adotantes e Adoções. |
| RNF03 | Tecnologias do backend | Os microsserviços deverão ser desenvolvidos utilizando Node.js e Express. |
| RNF04 | Comunicação entre serviços | Os microsserviços deverão se comunicar por meio de APIs REST, utilizando requisições HTTP. |
| RNF05 | Banco de dados | O sistema deverá utilizar MongoDB, com um banco lógico separado para cada microsserviço. |
| RNF06 | Independência dos serviços | Cada microsserviço deverá gerenciar seus próprios dados, sem acessar diretamente o banco de dados dos outros serviços. |
| RNF07 | Interface | O site deverá apresentar uma interface simples, organizada e responsiva. |
| RNF08 | Validação e tratamento de erros | O sistema deverá validar os dados recebidos e apresentar mensagens adequadas em situações de erro. |
| RNF09 | Dados de demonstração | O sistema deverá utilizar dados fictícios durante os testes e a apresentação, sem exigir CPF ou RG. |
| RNF10 | Privacidade dos dados | Os dados pessoais fornecidos pelos interessados no questionário de adoção não deverão ser exibidos publicamente no catálogo de animais. |
| RNF11 | Área administrativa | O sistema deverá disponibilizar uma interface administrativa destinada ao cadastro, à edição e à atualização da disponibilidade dos animais. |

## 3. Delimitação do escopo

*Responsável: Pessoa 1*

O Aumigo será desenvolvido como um protótipo de plataforma web voltada à divulgação de animais disponíveis para adoção e ao envio de solicitações por pessoas interessadas em adotá-los.

O sistema permitirá listar e consultar animais, além de filtrar os resultados por espécie, sexo, porte e região, considerando a cidade e a UF. O cadastro, a edição e a atualização da disponibilidade dos animais serão realizados por meio de uma área administrativa, que contará com uma interface de login. Quando um animal for marcado como indisponível, essa informação será atualizada no banco de dados e ele deixará de aparecer na página inicial.

Os interessados em adotar poderão preencher um único questionário com informações pessoais, tipo de moradia, animal de interesse e perguntas sobre sua rotina e os motivos pelos quais desejam adotar, sem necessidade de criar uma conta ou realizar login. Para solicitar uma adoção, será necessário atender à idade mínima de 21 anos, estabelecida como regra do projeto.

O sistema permitirá o envio de solicitações de adoção a partir do questionário preenchido pelos interessados. As solicitações registradas poderão ser consultadas em uma lista geral no painel administrativo, sem a necessidade de cadastro ou login dos interessados. Nesta versão, não será implementado um acompanhamento individual das solicitações nem etapas de aprovação ou recusa.

O desenvolvimento utilizará MongoDB e uma arquitetura composta por três microsserviços: Animais, Adotantes e Adoções. Cada serviço será responsável por seus próprios dados, e a comunicação entre eles ocorrerá por meio de APIs REST.

Nesta versão, não serão implementados recursos como pagamentos, chat entre usuários, verificação de documentos de identidade ou análise automática de candidatos por inteligência artificial. Essas funcionalidades, assim como a avaliação das solicitações de adoção, poderão ser consideradas em versões futuras.

> **[A DECIDIR — Pessoa 1]** O painel permite marcar solicitações como "Em contato" e "Concluído" (E23). Isso não está no escopo acima: incluir aqui ou pedir a remoção.

## 4. Arquitetura

*Responsáveis: Pessoa 1 (texto) e Pessoa 3 (infraestrutura)*

O Aumigo utiliza uma arquitetura de microsserviços, dividindo as principais funcionalidades do sistema em três serviços independentes: Animais, Adotantes e Adoções. Essa divisão permite organizar melhor as responsabilidades e demonstrar a comunicação entre diferentes serviços.

Os microsserviços são desenvolvidos utilizando Node.js e Express, com MongoDB para o armazenamento das informações. Cada serviço tem seu próprio banco de dados lógico, evitando o acesso direto aos dados dos demais serviços.

- **Microsserviço de Animais** (porta 3001, `animais_db`): cadastro, edição, listagem, consulta, filtragem por espécie, sexo, porte e região e atualização da disponibilidade dos animais. Quando um animal é marcado como indisponível, ele deixa de aparecer na página inicial.
- **Microsserviço de Adotantes** (porta 3002, `adotantes_db`): recebimento e armazenamento das informações fornecidas pelos interessados por meio do questionário de adoção, incluindo dados pessoais e respostas sobre suas condições para cuidar de um animal.
- **Microsserviço de Adoções** (porta 3003, `adocoes_db`): registro e consulta das solicitações de adoção, associando o animal escolhido às informações fornecidas pelo interessado. Antes de registrar uma solicitação, consulta os microsserviços de Animais e Adotantes, por meio de APIs REST, para verificar os dados necessários, a idade mínima estabelecida e a disponibilidade do animal. As solicitações podem ser apresentadas em uma lista geral no painel administrativo.

O sistema também conta com uma **área administrativa**, composta por uma interface de login e funcionalidades de cadastro, edição e atualização da disponibilidade dos animais, além da consulta geral das solicitações de adoção registradas. Essa área faz parte do frontend e usa as APIs dos três microsserviços, sem a necessidade de criar um microsserviço adicional.

A comunicação entre os microsserviços ocorre por meio de APIs REST, utilizando requisições HTTP. Dessa forma, o microsserviço de Adoções obtém as informações necessárias dos outros serviços sem acessar diretamente seus bancos de dados.

```
Aumigo
├── Frontend (HTML, CSS e JavaScript) — nginx, porta 5500
│   ├── Página inicial: catálogo de animais disponíveis, filtros e consulta
│   ├── Formulário de adoção: dados pessoais e informações adicionais
│   └── Área administrativa (/admin/): login, cadastro, edição e disponibilidade
│       dos animais, lista de solicitações
└── Backend (Node.js e Express)
    ├── Microsserviço de Animais   (3001) ── MongoDB: animais_db
    ├── Microsserviço de Adotantes (3002) ── MongoDB: adotantes_db
    └── Microsserviço de Adoções   (3003) ── MongoDB: adocoes_db
            └── HTTP → Animais e Adotantes (validação da solicitação)
```

> **[INSERIR Figura 1 – Arquitetura do Aumigo]** (versão desenhada do esquema acima)

### 4.1 Decisões de arquitetura

> *A completar pela Pessoa 1, com base no que já foi combinado e implementado:*
- Um usuário do Atlas por serviço, com acesso apenas ao próprio banco (garante o RNF06 na prática).
- Comunicação síncrona por HTTP/REST entre Adoções e os outros dois serviços.
- Resumo do animal e do interessado copiado na solicitação (registro histórico, RF09).
- Data de nascimento em vez de idade no questionário (idade sempre atualizada, RF06/RF07).
- A solicitação não altera a disponibilidade do animal: só o administrador muda (RF05).
- Área administrativa no próprio frontend, sem microsserviço extra; o login é apenas de interface (RF11), sem autenticação no backend nesta versão (ver E21).
- Uso de Docker Compose para padronizar o ambiente da equipe.

## 5. Infraestrutura e ambiente

*Responsável: Pessoa 3*

> **[A ENVIAR]** Repositório e estrutura de pastas; Docker Compose (4 containers, portas, variáveis de ambiente); MongoDB Atlas (cluster, 3 bancos, usuários e permissões); como executar o projeto. Base: `README.md` e `docs/guia-banco-de-dados.md`.
>
> Prints sugeridos: EV01, EV02, EV03 do [checklist](evidencias/README.md).

## 6. Design da interface

*Responsável: Pessoa 2*

> **[A ENVIAR]** Link do protótipo no Figma; paleta de cores, fontes e componentes (botões, cards, formulários); fluxo de navegação entre catálogo, cadastros e solicitações; decisões de design e responsividade.

## 7. Modelagem dos dados no MongoDB

*Responsáveis: Pessoa 8, com as Pessoas 5, 6 e 7*

> **[RECEBIDO — padronizar]** Conteúdo em `docs/analise-comparativa-banco.md`, seção 3 (modelagem das solicitações, adotantes e animais). Conferir com os modelos finais do código (`services/*/src/models/`) e com o `contrato-api.md`.

## 8. Microsserviços

### 8.1 Microsserviço de Animais

*Responsável: Pessoa 5*

> **[A ENVIAR]** Rotas implementadas (tabela método/rota/descrição/códigos), exemplo de requisição e resposta, validações, como os filtros foram feitos, testes realizados.

### 8.2 Microsserviço de Adotantes

*Responsável: Pessoa 6*

> **[A ENVIAR]** Rotas, validações (campos obrigatórios, e-mail único, UF), cálculo da idade, exemplo de requisição e resposta.

### 8.3 Microsserviço de Adoções

*Responsável: Pessoa 7*

> **[A ENVIAR]** Rotas, fluxo de validação do `POST /adocoes` (chamadas HTTP aos outros serviços e códigos 400/404/409/422/503), montagem dos resumos, regra de solicitação duplicada.

## 9. Frontend

*Responsável: Pessoa 4*

> **[A ENVIAR]** Páginas desenvolvidas, como o frontend chama as APIs (`js/config.js`), filtros, validações e mensagens de sucesso/erro, prints das telas.

## 10. Experimentação e análise comparativa: MongoDB x PostgreSQL

*Responsável: Pessoa 8*

> **[RECEBIDO — padronizar]** Conteúdo em `docs/analise-comparativa-banco.md`, seções 2 e 4 a 8, com os prints em `docs/evidencias-mongodb/` (01 a 05). Ajustes: a seção 4.5 (evidências) está no fim do arquivo, depois da conclusão, e deve ir para dentro da seção 4; numerar as figuras no padrão do relatório.

## 11. Testes e integração

*Responsável: Pessoa 9*

### 11.1 Estratégia

Os testes foram organizados em quatro frentes: testes automatizados de integração das APIs, cenários de serviço fora do ar, roteiro manual do frontend e verificações no banco de dados. O plano completo, com a matriz de rastreabilidade entre requisitos e casos de teste, está em `docs/testes/plano-de-testes.md`.

O script `tests/integracao.js` executa o fluxo completo (cadastro de animal → cadastro de adotante → solicitação de adoção → consulta da solicitação) e os cenários de erro previstos no contrato de API, chamando as rotas reais dos três microsserviços. Ele é executado com `docker compose run --rm testes` e gera um relatório com todas as requisições e respostas, usado como evidência.

> **[INSERIR Tabela – Resumo dos casos de teste]** (40 casos de integração, 4 de indisponibilidade, 18 no navegador — 11 no site público e 7 no painel —, 7 de infraestrutura)

### 11.2 Resultados

> **[A ATUALIZAR na versão final]** Resultado parcial de 21/10/2026 (23h30), `main` com os PRs #1 a #6, contra os requisitos revisados:

Na execução de 21/10/2026, com os três microsserviços e o painel administrativo integrados à `main`, 37 dos 40 casos automatizados passaram. Os casos cobrem o cadastro, a consulta, os filtros e a disponibilidade de animais, o registro do questionário com idade calculada, o registro das solicitações com validação entre serviços (idade mínima, animal indisponível, registros inexistentes e solicitação duplicada) e a alteração de status no painel. Os quatro cenários de indisponibilidade também passaram: com o serviço de Animais ou de Adotantes parado, o serviço de Adoções responde `503` e os demais seguem funcionando.

Ficaram em aberto o tratamento de JSON malformado nos serviços de Adotantes e Adoções (E01) e a edição de animais (RF12), cuja rota ainda não existe no serviço de Animais (E17).

No navegador, o fluxo principal funcionou de ponta a ponta: o questionário foi registrado (`201`) e a solicitação também (`201`). Os testes de erro, porém, mostraram que o site exibe a mensagem de sucesso quando o serviço de Adoções responde `503` (E09), e que o painel informa "atualizado com sucesso" em uma edição que não foi gravada (E17). Esses casos reforçam a importância de testar o fluxo completo pela interface, e não só as APIs isoladamente.

> Evidências: `evidencias/testes/integracao-20261022-023723.md`, `evidencias/testes/queda-*-20261022-*.md` e `evidencias/erros/`.

### 11.3 Erros encontrados e correções

Os testes de 21/10/2026 revelaram 23 problemas, registrados em `docs/testes/registro-de-erros.md`. Os principais afetavam justamente o tratamento de falhas: o site exibia sucesso quando o serviço de Adoções respondia `503`, o painel informava ter salvo uma edição que não existia no backend (RF12), e os containers usavam o fuso UTC, o que deslocava a regra dos 21 anos em um dia entre 21h e meia-noite. As correções foram aplicadas em 22/10/2026 e validadas pelos mesmos testes: 42 de 42 casos automatizados, 4 de 4 cenários de indisponibilidade e o roteiro da demonstração no navegador.

> **[RESUMIR na versão final]** Tabela de `docs/testes/correcoes-integracao.md` (erro, causa, correção e responsável).

### 11.4 Demonstração da independência dos serviços

> **[A PREENCHER]** Print do `docker compose stop animais`, do `/health` de Adoções mostrando "fora do ar" e da resposta `503` (casos CQ01–CQ04 e CF10).

## 12. Conclusão

*Todos — consolidação: Pessoa 1*

> **[A ENVIAR]** Cada integrante envia 1 parágrafo: o que fez, principal dificuldade e aprendizado. Incluir trabalhos futuros (aprovação/recusa de solicitações, autenticação, upload de imagens, etc.).

## 13. Referências

> **[A ENVIAR]** Cada integrante envia as referências que usou (documentação do MongoDB, Express, Mongoose, Docker, PostgreSQL, artigos sobre microsserviços).

---

## Apêndice A — Contribuições dos integrantes

*Tabela – Contribuições de cada integrante.*

| Integrante | Nome | Responsabilidade | Principais entregas |
|---|---|---|---|
| Pessoa 1 | | Pesquisa, requisitos e organização | Documento de requisitos, escopo, arquitetura |
| Pessoa 2 | | Design (UI/UX) | |
| Pessoa 3 | | Infraestrutura e configuração | Repositório, Docker Compose, MongoDB Atlas, guias |
| Pessoa 4 | | Frontend | |
| Pessoa 5 | | Microsserviço de Animais | |
| Pessoa 6 | | Microsserviço de Adotantes | |
| Pessoa 7 | | Microsserviço de Adoções | |
| Pessoa 8 | | Experimentação e análise comparativa | |
| Pessoa 9 | | Integração, testes e documentação | Plano de testes, testes automatizados, registro de erros, organização do relatório |
