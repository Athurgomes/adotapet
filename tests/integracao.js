// Testes de integração do AdotaPet (responsável: Pessoa 9).
//
// Executa o fluxo completo (animal -> adotante -> solicitação -> consulta) e os
// cenários de erro contra os 3 microsserviços, seguindo o docs/contrato-api.md.
// Ao final, grava um relatório de evidências em tests/resultados/.
//
// Uso (com o projeto rodando via "docker compose up"):
//   docker compose run --rm testes            -> fluxo completo + erros (sem precisar de Node)
//   docker compose run --rm testes --queda    -> serviço fora do ar (pare um serviço antes)
//   node tests/integracao.js [--queda]        -> o mesmo, com Node 18+ instalado
//
// Resultados possíveis de cada caso:
//   PASSOU    -> comportamento igual ao contrato
//   FALHOU    -> comportamento diferente do contrato (registrar em docs/testes/registro-de-erros.md)
//   PENDENTE  -> a rota ainda responde 501 (não implementada)
//   BLOQUEADO -> depende de um caso anterior que não passou

const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');

const URLS = {
  animais: process.env.ANIMAIS_URL || 'http://localhost:3001',
  adotantes: process.env.ADOTANTES_URL || 'http://localhost:3002',
  adocoes: process.env.ADOCOES_URL || 'http://localhost:3003',
};

const MODO_QUEDA = process.argv.includes('--queda');
const INICIO = new Date();
const MARCA = INICIO.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-'); // ex.: 20261019-013045
const PASTA_RESULTADOS = path.join(__dirname, 'resultados');
const ORIGEM_FRONTEND = 'http://localhost:5500';

// ---------------------------------------------------------------------------
// Infraestrutura dos testes
// ---------------------------------------------------------------------------

class Falha extends Error {}
class Pendente extends Error {}
class Bloqueado extends Error {}

const casos = [];
let casoAtual = null;

function caso(id, titulo, requisitos, fn) {
  casos.push({ id, titulo, requisitos, fn, chamadas: [] });
}

async function chamar(servico, metodo, caminho, corpo, opcoes = {}) {
  const url = URLS[servico] + caminho;
  const headers = { ...opcoes.headers };
  let body;
  if (opcoes.corpoBruto !== undefined) {
    body = opcoes.corpoBruto;
    headers['Content-Type'] = 'application/json';
  } else if (corpo !== undefined) {
    body = JSON.stringify(corpo);
    headers['Content-Type'] = 'application/json';
  }

  const registro = { metodo, url, corpo: body };
  casoAtual?.chamadas.push(registro);
  const inicio = Date.now();

  let resposta;
  try {
    resposta = await fetch(url, { method: metodo, headers, body, signal: AbortSignal.timeout(15000) });
  } catch (erro) {
    registro.status = 'sem resposta';
    throw new Falha(`${servico} não respondeu em ${url} (${erro.cause?.code || erro.message}). O serviço está rodando?`);
  }

  const texto = await resposta.text();
  let dados = texto;
  try { dados = JSON.parse(texto); } catch { /* resposta não é JSON */ }

  Object.assign(registro, { status: resposta.status, dados, ms: Date.now() - inicio });

  if (resposta.status === 501) {
    throw new Pendente(`${metodo} ${new URL(url).pathname} ainda responde 501 (não implementada)`);
  }
  if (resposta.status === 404 && dados?.erro === 'Rota não encontrada.' && !opcoes.rotaPodeNaoExistir) {
    throw new Pendente(`${metodo} ${new URL(url).pathname} não existe no serviço (rota não criada)`);
  }
  return { status: resposta.status, dados, headers: resposta.headers };
}

function verificar(condicao, mensagem) {
  if (!condicao) throw new Falha(mensagem);
}

function esperarStatus(r, esperado, contexto) {
  verificar(
    r.status === esperado,
    `${contexto}: esperado HTTP ${esperado}, recebido ${r.status} ${resumir(JSON.stringify(r.dados), 200)}`
  );
}

// Erros devem seguir o formato { "erro": "...", "detalhes": [...] } do contrato.
function esperarErro(r, esperado, contexto) {
  esperarStatus(r, esperado, contexto);
  verificar(
    typeof r.dados?.erro === 'string' && r.dados.erro.length > 0,
    `${contexto}: a resposta ${esperado} não tem o campo "erro" (formato de erro do contrato)`
  );
}

function precisa(valor, descricao) {
  if (!valor) throw new Bloqueado(`depende de: ${descricao}`);
}

function resumir(valor, limite = 2000) {
  const texto = typeof valor === 'string' ? valor : JSON.stringify(valor, null, 2);
  if (texto === undefined) return '';
  return texto.length > limite ? `${texto.slice(0, limite)}\n... (${texto.length - limite} caracteres omitidos)` : texto;
}

// Compara valores recursivamente. Datas são comparadas só pelo dia,
// porque "2026-03-10" pode voltar do banco como "2026-03-10T00:00:00.000Z".
function mesmoValor(a, b) {
  const data = /^\d{4}-\d{2}-\d{2}/;
  if (typeof a === 'string' && typeof b === 'string' && data.test(a) && data.test(b)) {
    return a.slice(0, 10) === b.slice(0, 10);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => mesmoValor(item, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return Object.keys(a).every((chave) => mesmoValor(a[chave], b[chave]));
  }
  return a === b;
}

function camposDiferentes(enviado, recebido) {
  return Object.keys(enviado).filter((campo) => !mesmoValor(enviado[campo], recebido?.[campo]));
}

const idFalso = () => randomBytes(12).toString('hex'); // formato válido de ObjectId, mas inexistente

// "Hoje" no horário de Brasília: a regra dos 21 anos vale pela data local do usuário,
// mesmo que os containers rodem em UTC (ver E06 no registro de erros).
const [HOJE_ANO, HOJE_MES, HOJE_DIA] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
  .format(INICIO)
  .split('-')
  .map(Number);

// Data de nascimento (AAAA-MM-DD) de quem completa "anos" hoje, deslocada em "dias".
function dataNascimento(anos, dias = 0) {
  const d = new Date(Date.UTC(HOJE_ANO - anos, HOJE_MES - 1, HOJE_DIA + dias));
  return d.toISOString().slice(0, 10);
}

function idadeEsperada(data) {
  const [ano, mes, dia] = data.slice(0, 10).split('-').map(Number);
  let idade = HOJE_ANO - ano;
  if (HOJE_MES < mes || (HOJE_MES === mes && HOJE_DIA < dia)) idade -= 1;
  return idade;
}

// ---------------------------------------------------------------------------
// Dados fictícios (RNF09). O sufixo "(teste ...)" facilita a limpeza depois.
// ---------------------------------------------------------------------------

const IMAGEM = 'https://placehold.co/600x400?text=AdotaPet';

const dados = {
  cachorro: {
    nome: `Caramelo (teste ${MARCA})`,
    especie: 'cachorro',
    sexo: 'macho',
    idade: 3,
    porte: 'medio',
    caracteristicas: {
      cor: 'caramelo',
      pelagem: 'curta',
      castrado: true,
      temperamento: ['dócil', 'brincalhão'],
      convivenciaComCriancas: true,
    },
    vacinas: [
      { nome: 'V10', data: '2026-03-10' },
      { nome: 'Antirrábica', data: '2026-04-02' },
    ],
    cidade: 'Belo Horizonte',
    uf: 'MG',
    imagemUrl: IMAGEM,
  },
  // Gato com características diferentes do cachorro (flexibilidade do MongoDB)
  gato: {
    nome: `Mingau (teste ${MARCA})`,
    especie: 'gato',
    sexo: 'femea',
    idade: 1,
    porte: 'pequeno',
    caracteristicas: {
      pelagem: 'longa',
      cores: ['branco', 'cinza'],
      castrado: false,
      usaCaixaDeAreia: true,
      convivenciaComOutrosGatos: 'boa',
    },
    vacinas: [{ nome: 'V4 felina', data: '2026-02-15' }],
    cidade: 'Campinas',
    uf: 'SP',
    imagemUrl: IMAGEM,
  },
  // Espécie "outro", sem vacinas e com campos próprios
  coelho: {
    nome: `Pipoca (teste ${MARCA})`,
    especie: 'outro',
    sexo: 'femea',
    idade: 0,
    porte: 'pequeno',
    caracteristicas: { tipo: 'coelho', raca: 'mini lop', alimentacao: ['feno', 'verduras'] },
    cidade: 'Belo Horizonte',
    uf: 'MG',
    imagemUrl: IMAGEM,
  },
};

function novoAdotante(nome, nascimento) {
  const sufixo = randomBytes(3).toString('hex');
  return {
    nomeCompleto: `${nome} (teste ${MARCA})`,
    dataNascimento: nascimento,
    profissao: 'Professora',
    endereco: 'Rua das Flores, 123 - Centro',
    cidade: 'Belo Horizonte',
    uf: 'MG',
    telefone: '(31) 90000-0000',
    email: `teste.${MARCA}.${sufixo}@exemplo.com`,
    questionario: {
      jaTeveAnimais: true,
      tipoMoradia: 'casa',
      possuiQuintal: true,
      moradiaPropria: true,
      outrosAnimaisEmCasa: 1,
      horasDisponiveisPorDia: 4,
      motivoAdocao: 'Quero um companheiro para a família.',
    },
  };
}

const adotantes = {
  maria: novoAdotante('Maria Fictícia da Silva', '1995-06-20'),
  limite: novoAdotante('João Vinte e Um Anos', dataNascimento(21)), // completa 21 anos hoje
  jovem: novoAdotante('Pedro Vinte Anos', dataNascimento(21, 1)), // completa 21 anos amanhã
};

// Identificadores criados durante a execução
const ctx = {};

// ---------------------------------------------------------------------------
// 0. Ambiente
// ---------------------------------------------------------------------------

function casosAmbiente() {
  caso('CT01', 'Os 3 serviços estão no ar e conectados ao banco', ['RNF02', 'RNF05'], async () => {
    const problemas = [];
    for (const servico of Object.keys(URLS)) {
      try {
        const r = await chamar(servico, 'GET', '/health');
        if (r.status !== 200) problemas.push(`${servico}: HTTP ${r.status}`);
        else if (r.dados?.banco !== 'conectado') problemas.push(`${servico}: banco "${r.dados?.banco}"`);
      } catch (erro) {
        problemas.push(erro.message);
      }
    }
    verificar(problemas.length === 0, problemas.join('; '));
  });

  caso('CT02', 'Adoções alcança Animais e Adotantes via HTTP', ['RNF04'], async () => {
    const r = await chamar('adocoes', 'GET', '/health');
    esperarStatus(r, 200, 'GET /health');
    const dep = r.dados?.dependencias || {};
    verificar(dep.animais === 'no ar', `Adoções vê Animais como "${dep.animais}"`);
    verificar(dep.adotantes === 'no ar', `Adoções vê Adotantes como "${dep.adotantes}"`);
  });

  caso('CT03', 'CORS liberado para o frontend (localhost:5500)', ['RNF01'], async () => {
    for (const servico of Object.keys(URLS)) {
      const r = await chamar(servico, 'GET', '/health', undefined, { headers: { Origin: ORIGEM_FRONTEND } });
      const permitido = r.headers.get('access-control-allow-origin');
      verificar(
        permitido === '*' || permitido === ORIGEM_FRONTEND,
        `${servico}: cabeçalho Access-Control-Allow-Origin ausente ou diferente ("${permitido}")`
      );
    }
  });

  caso('CT04', 'Rota inexistente retorna 404 no formato de erro', ['RNF08'], async () => {
    for (const servico of Object.keys(URLS)) {
      esperarErro(await chamar(servico, 'GET', '/rota-que-nao-existe', undefined, { rotaPodeNaoExistir: true }), 404, servico);
    }
  });

  caso('CT05', 'JSON malformado retorna 400 (e não 500)', ['RNF08'], async () => {
    const rotas = { animais: '/animais', adotantes: '/adotantes', adocoes: '/adocoes' };
    const problemas = [];
    for (const [servico, rota] of Object.entries(rotas)) {
      const r = await chamar(servico, 'POST', rota, undefined, { corpoBruto: '{"nome": "Rex",' });
      if (r.status !== 400) problemas.push(`${servico}: HTTP ${r.status}`);
    }
    verificar(problemas.length === 0, `esperado 400 em todos: ${problemas.join('; ')}`);
  });
}

// ---------------------------------------------------------------------------
// 1. Microsserviço de Animais
// ---------------------------------------------------------------------------

function casosAnimais() {
  caso('CT10', 'Cadastrar animal (cachorro) com características e vacinas', ['RF01'], async () => {
    const r = await chamar('animais', 'POST', '/animais', dados.cachorro);
    esperarStatus(r, 201, 'POST /animais');
    verificar(typeof r.dados?._id === 'string', 'resposta sem _id');
    verificar(r.dados.disponivel === true, `"disponivel" deveria ser true por padrão, veio ${r.dados.disponivel}`);
    verificar(r.dados.criadoEm, 'resposta sem "criadoEm" (timestamps)');
    const dif = camposDiferentes(dados.cachorro, r.dados);
    verificar(dif.length === 0, `campos diferentes do enviado: ${dif.join(', ')}`);
    ctx.cachorro = r.dados._id;
  });

  caso('CT11', 'Cadastrar animais com estruturas diferentes (gato e "outro")', ['RF01', 'RNF05'], async () => {
    for (const chave of ['gato', 'coelho']) {
      const r = await chamar('animais', 'POST', '/animais', dados[chave]);
      esperarStatus(r, 201, `POST /animais (${chave})`);
      const dif = camposDiferentes(dados[chave], r.dados);
      verificar(dif.length === 0, `${chave}: campos diferentes do enviado: ${dif.join(', ')}`);
      ctx[chave] = r.dados._id;
    }
  });

  caso('CT12', 'Consultar animal por id (dados persistidos)', ['RF04'], async () => {
    precisa(ctx.cachorro, 'CT10');
    const r = await chamar('animais', 'GET', `/animais/${ctx.cachorro}`);
    esperarStatus(r, 200, 'GET /animais/:id');
    const dif = camposDiferentes(dados.cachorro, r.dados);
    verificar(dif.length === 0, `campos diferentes do cadastrado: ${dif.join(', ')}`);
  });

  caso('CT13', 'Listar animais (catálogo)', ['RF02'], async () => {
    precisa(ctx.cachorro && ctx.gato, 'CT10 e CT11');
    const r = await chamar('animais', 'GET', '/animais');
    esperarStatus(r, 200, 'GET /animais');
    verificar(Array.isArray(r.dados), 'a resposta deveria ser um array');
    const ids = r.dados.map((a) => a._id);
    verificar(ids.includes(ctx.cachorro) && ids.includes(ctx.gato), 'os animais cadastrados não aparecem na lista');
  });

  caso('CT14', 'Filtrar por espécie', ['RF03'], async () => {
    precisa(ctx.cachorro && ctx.gato, 'CT10 e CT11');
    const r = await chamar('animais', 'GET', '/animais?especie=gato');
    esperarStatus(r, 200, 'GET /animais?especie=gato');
    verificar(Array.isArray(r.dados), 'a resposta deveria ser um array');
    const errados = r.dados.filter((a) => a.especie !== 'gato');
    verificar(errados.length === 0, `${errados.length} resultado(s) que não são gato`);
    const ids = r.dados.map((a) => a._id);
    verificar(ids.includes(ctx.gato), 'o gato cadastrado não aparece no filtro');
    verificar(!ids.includes(ctx.cachorro), 'o cachorro apareceu no filtro de gatos');
  });

  caso('CT15', 'Filtros combinados (espécie, sexo, porte, cidade e UF)', ['RF03'], async () => {
    precisa(ctx.cachorro, 'CT10');
    const filtro = { especie: 'cachorro', sexo: 'macho', porte: 'medio', cidade: 'Belo Horizonte', uf: 'MG' };
    const r = await chamar('animais', 'GET', `/animais?${new URLSearchParams(filtro)}`);
    esperarStatus(r, 200, 'GET /animais com filtros');
    verificar(Array.isArray(r.dados), 'a resposta deveria ser um array');
    const errados = r.dados.filter((a) => Object.entries(filtro).some(([campo, valor]) => a[campo] !== valor));
    verificar(errados.length === 0, `${errados.length} resultado(s) fora do filtro`);
    verificar(r.dados.some((a) => a._id === ctx.cachorro), 'o cachorro cadastrado não aparece no filtro');
  });

  caso('CT16', 'Cadastro sem campos obrigatórios retorna 400', ['RNF08'], async () => {
    esperarErro(await chamar('animais', 'POST', '/animais', { nome: 'Sem dados' }), 400, 'POST /animais incompleto');
  });

  caso('CT17', 'Cadastro com valores inválidos retorna 400', ['RNF08'], async () => {
    const invalidos = {
      'espécie fora da lista': { especie: 'dragao' },
      'UF com 3 letras': { uf: 'MGX' },
      'sexo fora da lista': { sexo: 'indefinido' },
      'porte fora da lista': { porte: 'gigante' },
    };
    for (const [descricao, alteracao] of Object.entries(invalidos)) {
      const r = await chamar('animais', 'POST', '/animais', { ...dados.cachorro, ...alteracao });
      esperarErro(r, 400, descricao);
    }
  });

  caso('CT18', 'Consultar animal com id inválido (400) e inexistente (404)', ['RF04', 'RNF08'], async () => {
    esperarErro(await chamar('animais', 'GET', '/animais/123'), 400, 'id inválido');
    esperarErro(await chamar('animais', 'GET', `/animais/${idFalso()}`), 404, 'id inexistente');
  });

  caso('CT19', 'Atualizar disponibilidade para false', ['RF05'], async () => {
    precisa(ctx.coelho, 'CT11');
    const r = await chamar('animais', 'PATCH', `/animais/${ctx.coelho}/disponibilidade`, { disponivel: false });
    esperarStatus(r, 200, 'PATCH disponibilidade');
    verificar(r.dados?.disponivel === false, `a resposta deveria trazer disponivel=false, veio ${r.dados?.disponivel}`);
    const consulta = await chamar('animais', 'GET', `/animais/${ctx.coelho}`);
    verificar(consulta.dados?.disponivel === false, 'a alteração não foi persistida no banco');
    ctx.indisponivel = ctx.coelho;
  });

  caso('CT20', 'Indisponíveis ficam fora do catálogo (filtro disponivel)', ['RF02', 'RF05'], async () => {
    precisa(ctx.indisponivel, 'CT19');
    const falsos = await chamar('animais', 'GET', '/animais?disponivel=false');
    esperarStatus(falsos, 200, 'GET ?disponivel=false');
    verificar(falsos.dados.some((a) => a._id === ctx.indisponivel), 'o animal indisponível não aparece em disponivel=false');
    verificar(falsos.dados.every((a) => a.disponivel === false), 'há animais disponíveis em disponivel=false');
    const verdadeiros = await chamar('animais', 'GET', '/animais?disponivel=true');
    verificar(!verdadeiros.dados.some((a) => a._id === ctx.indisponivel), 'o animal indisponível aparece em disponivel=true');
  });

  caso('CT21', 'Atualizar disponibilidade com valor inválido retorna 400', ['RNF08'], async () => {
    precisa(ctx.cachorro, 'CT10');
    const r = await chamar('animais', 'PATCH', `/animais/${ctx.cachorro}/disponibilidade`, { disponivel: 'talvez' });
    esperarErro(r, 400, 'disponivel não booleano');
    esperarErro(
      await chamar('animais', 'PATCH', `/animais/${idFalso()}/disponibilidade`, { disponivel: false }),
      404,
      'animal inexistente'
    );
  });

  caso('CT22', 'Editar as informações de um animal', ['RF12', 'RNF11'], async () => {
    precisa(ctx.gato, 'CT11');
    const alteracoes = {
      ...dados.gato,
      nome: `Mingau Editado (teste ${MARCA})`,
      idade: 2,
      caracteristicas: { ...dados.gato.caracteristicas, castrado: true },
      vacinas: [...dados.gato.vacinas, { nome: 'Antirrábica', data: '2026-10-01' }],
    };
    const r = await chamar('animais', 'PUT', `/animais/${ctx.gato}`, alteracoes);
    esperarStatus(r, 200, 'PUT /animais/:id');
    const dif = camposDiferentes(alteracoes, r.dados);
    verificar(dif.length === 0, `campos diferentes do enviado: ${dif.join(', ')}`);
    const consulta = await chamar('animais', 'GET', `/animais/${ctx.gato}`);
    const difBanco = camposDiferentes(alteracoes, consulta.dados);
    verificar(difBanco.length === 0, `a edição não foi persistida: ${difBanco.join(', ')}`);
  });

  caso('CT23', 'Editar animal com dados inválidos (400) ou inexistente (404)', ['RF12', 'RNF08'], async () => {
    precisa(ctx.gato, 'CT11');
    esperarErro(
      await chamar('animais', 'PUT', `/animais/${ctx.gato}`, { ...dados.gato, especie: 'dragao' }),
      400,
      'espécie inválida'
    );
    esperarErro(await chamar('animais', 'PUT', `/animais/${idFalso()}`, dados.gato), 404, 'animal inexistente');
    esperarErro(await chamar('animais', 'PUT', '/animais/123', dados.gato), 400, 'id inválido');
  });
}

// ---------------------------------------------------------------------------
// 2. Microsserviço de Adotantes
// ---------------------------------------------------------------------------

function casosAdotantes() {
  caso('CT30', 'Registrar questionário do interessado (sem conta)', ['RF06'], async () => {
    for (const [chave, adotante] of Object.entries(adotantes)) {
      const r = await chamar('adotantes', 'POST', '/adotantes', adotante);
      esperarStatus(r, 201, `POST /adotantes (${chave})`);
      verificar(typeof r.dados?._id === 'string', `${chave}: resposta sem _id`);
      const dif = camposDiferentes(adotante, r.dados);
      verificar(dif.length === 0, `${chave}: campos diferentes do enviado: ${dif.join(', ')}`);
      ctx[chave] = r.dados._id;
    }
  });

  caso('CT31', 'Consultar interessado por id com idade calculada', ['RF07', 'RF10'], async () => {
    precisa(ctx.maria, 'CT30');
    const r = await chamar('adotantes', 'GET', `/adotantes/${ctx.maria}`);
    esperarStatus(r, 200, 'GET /adotantes/:id');
    const dif = camposDiferentes(adotantes.maria, r.dados);
    verificar(dif.length === 0, `campos diferentes do cadastrado: ${dif.join(', ')}`);
    const esperada = idadeEsperada(adotantes.maria.dataNascimento);
    verificar(r.dados.idade === esperada, `campo "idade" deveria ser ${esperada}, veio ${r.dados.idade}`);
  });

  caso('CT32', 'Listar interessados (usado no painel)', ['RF13'], async () => {
    precisa(ctx.maria, 'CT30');
    const r = await chamar('adotantes', 'GET', '/adotantes');
    esperarStatus(r, 200, 'GET /adotantes');
    verificar(Array.isArray(r.dados), 'a resposta deveria ser um array');
    verificar(r.dados.some((a) => a._id === ctx.maria), 'o adotante cadastrado não aparece na lista');
  });

  caso('CT33', 'E-mail já cadastrado retorna 409', ['RNF08'], async () => {
    precisa(ctx.maria, 'CT30');
    const r = await chamar('adotantes', 'POST', '/adotantes', { ...adotantes.maria, nomeCompleto: 'Outra Pessoa' });
    esperarErro(r, 409, 'e-mail repetido');
  });

  caso('CT34', 'Questionário sem campos obrigatórios retorna 400', ['RF06', 'RNF08'], async () => {
    esperarErro(await chamar('adotantes', 'POST', '/adotantes', { nomeCompleto: 'Só o nome' }), 400, 'só o nome');
    const { questionario, ...semQuestionario } = novoAdotante('Sem Questionário', '1990-01-01');
    esperarErro(await chamar('adotantes', 'POST', '/adotantes', semQuestionario), 400, 'sem questionário');
  });

  caso('CT35', 'Questionário com e-mail ou UF inválidos retorna 400', ['RF06', 'RNF08'], async () => {
    const base = novoAdotante('Dados Inválidos', '1990-01-01');
    esperarErro(await chamar('adotantes', 'POST', '/adotantes', { ...base, email: 'sem-arroba' }), 400, 'e-mail inválido');
    esperarErro(await chamar('adotantes', 'POST', '/adotantes', { ...base, uf: 'Minas' }), 400, 'UF inválida');
  });

  caso('CT36', 'Consultar interessado com id inválido (400) e inexistente (404)', ['RF10', 'RNF08'], async () => {
    esperarErro(await chamar('adotantes', 'GET', '/adotantes/abc'), 400, 'id inválido');
    esperarErro(await chamar('adotantes', 'GET', `/adotantes/${idFalso()}`), 404, 'id inexistente');
  });

  caso('CT37', 'Buscar interessado só pelo e-mail (?email=)', ['RNF10'], async () => {
    precisa(ctx.maria, 'CT30');
    const r = await chamar('adotantes', 'GET', `/adotantes?email=${encodeURIComponent(adotantes.maria.email.toUpperCase())}`);
    esperarStatus(r, 200, 'GET /adotantes?email=');
    verificar(Array.isArray(r.dados), 'a resposta deveria ser um array');
    verificar(r.dados.length === 1 && r.dados[0]._id === ctx.maria, `deveria voltar só o cadastro da Maria, voltaram ${r.dados.length}`);
    const vazio = await chamar('adotantes', 'GET', `/adotantes?email=ninguem.${MARCA}@exemplo.com`);
    verificar(Array.isArray(vazio.dados) && vazio.dados.length === 0, 'e-mail inexistente deveria voltar lista vazia');
  });

  caso('CT38', 'Questionário sem cidade, profissão ou endereço retorna 400', ['RF06', 'RNF08'], async () => {
    for (const campo of ['cidade', 'profissao', 'endereco']) {
      const { [campo]: _, ...semCampo } = novoAdotante(`Sem ${campo}`, '1990-01-01');
      esperarErro(await chamar('adotantes', 'POST', '/adotantes', semCampo), 400, `sem ${campo}`);
    }
  });
}

// ---------------------------------------------------------------------------
// 3. Microsserviço de Adoções (comunicação entre os serviços)
// ---------------------------------------------------------------------------

function casosAdocoes() {
  caso('CT40', 'Solicitar adoção válida (status Pendente + resumos)', ['RF08', 'RF09', 'RF10'], async () => {
    precisa(ctx.cachorro && ctx.maria, 'CT10 e CT30');
    const r = await chamar('adocoes', 'POST', '/adocoes', { animalId: ctx.cachorro, adotanteId: ctx.maria });
    esperarStatus(r, 201, 'POST /adocoes');
    const s = r.dados;
    verificar(typeof s?._id === 'string', 'resposta sem _id');
    ctx.adocao = s._id;
    verificar(s.status === 'Pendente', `status deveria ser "Pendente", veio "${s.status}"`);
    verificar(String(s.animalId) === ctx.cachorro, 'animalId diferente do enviado');
    verificar(String(s.adotanteId) === ctx.maria, 'adotanteId diferente do enviado');
    verificar(s.resumoAnimal?.nome === dados.cachorro.nome, 'resumoAnimal.nome não confere com o animal');
    verificar(s.resumoAnimal?.especie === dados.cachorro.especie, 'resumoAnimal.especie não confere');
    verificar(s.resumoAdotante?.nomeCompleto === adotantes.maria.nomeCompleto, 'resumoAdotante.nomeCompleto não confere');
    const idade = idadeEsperada(adotantes.maria.dataNascimento);
    verificar(s.resumoAdotante?.idade === idade, `resumoAdotante.idade deveria ser ${idade}, veio ${s.resumoAdotante?.idade}`);
  });

  caso('CT41', 'Consultar solicitação por id (persistida)', ['RF09', 'RF13'], async () => {
    precisa(ctx.adocao, 'CT40');
    const r = await chamar('adocoes', 'GET', `/adocoes/${ctx.adocao}`);
    esperarStatus(r, 200, 'GET /adocoes/:id');
    verificar(r.dados?.status === 'Pendente', `status deveria ser "Pendente", veio "${r.dados?.status}"`);
    verificar(r.dados?.resumoAnimal?.nome === dados.cachorro.nome, 'resumoAnimal não foi persistido');
  });

  caso('CT42', 'Listar solicitações com filtros (animalId, adotanteId, status)', ['RF13'], async () => {
    precisa(ctx.adocao, 'CT40');
    const filtros = { animalId: ctx.cachorro, adotanteId: ctx.maria, status: 'Pendente' };
    for (const [campo, valor] of Object.entries(filtros)) {
      const r = await chamar('adocoes', 'GET', `/adocoes?${campo}=${encodeURIComponent(valor)}`);
      esperarStatus(r, 200, `GET /adocoes?${campo}`);
      verificar(Array.isArray(r.dados), 'a resposta deveria ser um array');
      verificar(r.dados.some((s) => s._id === ctx.adocao), `a solicitação não aparece no filtro ${campo}`);
      verificar(r.dados.every((s) => String(s[campo]) === valor), `há resultados fora do filtro ${campo}`);
    }
  });

  caso('CT43', 'A solicitação não altera a disponibilidade do animal', ['RF09'], async () => {
    precisa(ctx.adocao, 'CT40');
    const r = await chamar('animais', 'GET', `/animais/${ctx.cachorro}`);
    verificar(r.dados?.disponivel === true, 'o animal ficou indisponível após a solicitação (o contrato diz que não muda)');
  });

  caso('CT44', 'Solicitação pendente duplicada retorna 409', ['RF10'], async () => {
    precisa(ctx.adocao, 'CT40');
    const r = await chamar('adocoes', 'POST', '/adocoes', { animalId: ctx.cachorro, adotanteId: ctx.maria });
    esperarErro(r, 409, 'mesmo adotante e mesmo animal');
  });

  caso('CT45', 'Interessado com exatamente 21 anos pode solicitar o mesmo animal', ['RF07', 'RF10'], async () => {
    precisa(ctx.cachorro && ctx.limite, 'CT10 e CT30');
    const r = await chamar('adocoes', 'POST', '/adocoes', { animalId: ctx.cachorro, adotanteId: ctx.limite });
    esperarStatus(r, 201, 'POST /adocoes (21 anos hoje)');
  });

  caso('CT46', 'Interessado com menos de 21 anos retorna 422', ['RF07'], async () => {
    precisa(ctx.gato && ctx.jovem, 'CT11 e CT30');
    const r = await chamar('adocoes', 'POST', '/adocoes', { animalId: ctx.gato, adotanteId: ctx.jovem });
    esperarErro(r, 422, 'adotante com 20 anos');
  });

  caso('CT47', 'Animal indisponível retorna 409', ['RF05', 'RF10'], async () => {
    precisa(ctx.indisponivel && ctx.maria, 'CT19 e CT30');
    const r = await chamar('adocoes', 'POST', '/adocoes', { animalId: ctx.indisponivel, adotanteId: ctx.maria });
    esperarErro(r, 409, 'animal indisponível');
  });

  caso('CT48', 'Animal ou interessado inexistente retorna 404', ['RF10'], async () => {
    precisa(ctx.cachorro && ctx.maria, 'CT10 e CT30');
    esperarErro(
      await chamar('adocoes', 'POST', '/adocoes', { animalId: idFalso(), adotanteId: ctx.maria }),
      404,
      'animal inexistente'
    );
    esperarErro(
      await chamar('adocoes', 'POST', '/adocoes', { animalId: ctx.gato || ctx.cachorro, adotanteId: idFalso() }),
      404,
      'adotante inexistente'
    );
  });

  caso('CT49', 'Solicitação sem animalId/adotanteId retorna 400', ['RNF08'], async () => {
    esperarErro(await chamar('adocoes', 'POST', '/adocoes', {}), 400, 'corpo vazio');
    esperarErro(await chamar('adocoes', 'POST', '/adocoes', { animalId: idFalso() }), 400, 'sem adotanteId');
  });

  caso('CT50', 'Solicitação com ids em formato inválido retorna 400', ['RNF08'], async () => {
    const r = await chamar('adocoes', 'POST', '/adocoes', { animalId: '123', adotanteId: 'abc' });
    esperarErro(r, 400, 'ids inválidos');
  });

  caso('CT51', 'Consultar solicitação com id inválido (400) e inexistente (404)', ['RF13', 'RNF08'], async () => {
    esperarErro(await chamar('adocoes', 'GET', '/adocoes/xyz'), 400, 'id inválido');
    esperarErro(await chamar('adocoes', 'GET', `/adocoes/${idFalso()}`), 404, 'id inexistente');
  });

  caso('CT53', 'Alterar o status da solicitação no painel (rota extra)', ['RF13'], async () => {
    precisa(ctx.adocao, 'CT40');
    const r = await chamar('adocoes', 'PATCH', `/adocoes/${ctx.adocao}/status`, { status: 'Em contato' });
    esperarStatus(r, 200, 'PATCH /adocoes/:id/status');
    verificar(r.dados?.status === 'Em contato', `status deveria ser "Em contato", veio "${r.dados?.status}"`);
    const consulta = await chamar('adocoes', 'GET', `/adocoes/${ctx.adocao}`);
    verificar(consulta.dados?.status === 'Em contato', 'a alteração de status não foi persistida');
    esperarErro(
      await chamar('adocoes', 'PATCH', `/adocoes/${ctx.adocao}/status`, { status: 'Aprovada' }),
      400,
      'status fora da lista'
    );
    esperarErro(
      await chamar('adocoes', 'PATCH', `/adocoes/${idFalso()}/status`, { status: 'Pendente' }),
      404,
      'solicitação inexistente'
    );
  });

  caso('CT52', 'Catálogo de animais não expõe dados de adotantes', ['RNF10'], async () => {
    precisa(ctx.adocao, 'CT40');
    const r = await chamar('animais', 'GET', '/animais');
    const texto = JSON.stringify(r.dados);
    for (const adotante of Object.values(adotantes)) {
      verificar(!texto.includes(adotante.email), `o e-mail ${adotante.email} aparece no catálogo`);
      verificar(!texto.includes(adotante.nomeCompleto), `o nome ${adotante.nomeCompleto} aparece no catálogo`);
    }
  });
}

// ---------------------------------------------------------------------------
// 4. Serviço fora do ar (--queda)
// ---------------------------------------------------------------------------

function casosQueda() {
  caso('CQ01', 'Adoções detecta o serviço parado', ['RNF02', 'RNF04'], async () => {
    const r = await chamar('adocoes', 'GET', '/health');
    esperarStatus(r, 200, 'GET /health de Adoções');
    ctx.dependencias = r.dados?.dependencias || {};
    const parados = Object.entries(ctx.dependencias).filter(([, estado]) => estado !== 'no ar');
    verificar(
      parados.length > 0,
      'nenhum serviço parado. Antes de usar --queda, rode "docker compose stop animais" (ou adotantes)'
    );
  });

  caso('CQ02', 'Com Animais fora do ar, a solicitação retorna 503', ['RF10', 'RNF08'], async () => {
    precisa(ctx.dependencias?.animais && ctx.dependencias.animais !== 'no ar', 'Animais parado');
    const r = await chamar('adocoes', 'POST', '/adocoes', { animalId: idFalso(), adotanteId: idFalso() });
    esperarErro(r, 503, 'Animais fora do ar');
  });

  caso('CQ03', 'Com Adotantes fora do ar, a solicitação retorna 503', ['RF10', 'RNF08'], async () => {
    precisa(ctx.dependencias?.adotantes && ctx.dependencias.adotantes !== 'no ar', 'Adotantes parado');
    precisa(ctx.dependencias.animais === 'no ar', 'Animais no ar (para criar um animal válido)');
    const animal = await chamar('animais', 'POST', '/animais', { ...dados.cachorro, nome: `Queda (teste ${MARCA})` });
    esperarStatus(animal, 201, 'POST /animais');
    const r = await chamar('adocoes', 'POST', '/adocoes', { animalId: animal.dados._id, adotanteId: idFalso() });
    esperarErro(r, 503, 'Adotantes fora do ar');
  });

  caso('CQ04', 'Os serviços que continuam no ar seguem respondendo', ['RNF02', 'RNF06'], async () => {
    precisa(ctx.dependencias, 'CQ01');
    for (const [servico, estado] of Object.entries(ctx.dependencias)) {
      if (estado !== 'no ar') continue;
      const r = await chamar(servico, 'GET', `/${servico}`);
      esperarStatus(r, 200, `GET /${servico}`);
    }
    esperarStatus(await chamar('adocoes', 'GET', '/adocoes'), 200, 'GET /adocoes');
  });
}

// ---------------------------------------------------------------------------
// Execução e relatório
// ---------------------------------------------------------------------------

const CORES = { PASSOU: '\x1b[32m', FALHOU: '\x1b[31m', PENDENTE: '\x1b[33m', BLOQUEADO: '\x1b[90m' };
const RESET = '\x1b[0m';

async function executar() {
  if (MODO_QUEDA) {
    casosQueda();
  } else {
    casosAmbiente();
    casosAnimais();
    casosAdotantes();
    casosAdocoes();
  }

  console.log(`\nAdotaPet — testes de integração (${MODO_QUEDA ? 'serviço fora do ar' : 'fluxo completo'})`);
  console.log(Object.entries(URLS).map(([s, u]) => `  ${s}: ${u}`).join('\n'), '\n');

  for (const c of casos) {
    casoAtual = c;
    try {
      await c.fn();
      c.resultado = 'PASSOU';
    } catch (erro) {
      if (erro instanceof Pendente) c.resultado = 'PENDENTE';
      else if (erro instanceof Bloqueado) c.resultado = 'BLOQUEADO';
      else c.resultado = 'FALHOU';
      c.motivo = erro instanceof Falha || erro instanceof Pendente || erro instanceof Bloqueado
        ? erro.message
        : `erro no próprio teste: ${erro.stack}`;
    }
    const cor = CORES[c.resultado];
    console.log(`${cor}${c.resultado.padEnd(9)}${RESET} ${c.id}  ${c.titulo}`);
    if (c.motivo) console.log(`           ${c.motivo}`);
  }
  casoAtual = null;

  const contagem = {};
  for (const c of casos) contagem[c.resultado] = (contagem[c.resultado] || 0) + 1;
  console.log(
    `\nTotal: ${casos.length} | ` +
      ['PASSOU', 'FALHOU', 'PENDENTE', 'BLOQUEADO'].map((r) => `${r}: ${contagem[r] || 0}`).join(' | ')
  );

  const arquivo = gravarRelatorio(contagem);
  console.log(`Evidências salvas em: ${path.relative(process.cwd(), arquivo) || arquivo}\n`);
  process.exitCode = contagem.FALHOU ? 1 : 0;
}

function gravarRelatorio(contagem) {
  const linhas = [];
  const dataHora = INICIO.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  linhas.push('# Resultado dos testes de integração — AdotaPet', '');
  linhas.push(`- **Executado em:** ${dataHora}`);
  linhas.push(`- **Modo:** ${MODO_QUEDA ? 'serviço fora do ar (--queda)' : 'fluxo completo + cenários de erro'}`);
  linhas.push(`- **URLs:** ${Object.entries(URLS).map(([s, u]) => `${s} = ${u}`).join(', ')}`);
  linhas.push(`- **Marca dos dados de teste:** \`teste ${MARCA}\``, '');

  linhas.push('## Resumo', '', '| Resultado | Quantidade |', '|---|---|');
  for (const r of ['PASSOU', 'FALHOU', 'PENDENTE', 'BLOQUEADO']) linhas.push(`| ${r} | ${contagem[r] || 0} |`);
  linhas.push(`| **Total** | **${casos.length}** |`, '');

  linhas.push('## Casos', '', '| ID | Caso | Requisitos | Resultado | Observação |', '|---|---|---|---|---|');
  for (const c of casos) {
    const obs = (c.motivo || '').split('\n')[0].replace(/\|/g, '\\|');
    linhas.push(`| ${c.id} | ${c.titulo} | ${c.requisitos.join(', ')} | ${c.resultado} | ${obs} |`);
  }
  linhas.push('');

  linhas.push('## Detalhes (requisições e respostas)', '');
  for (const c of casos) {
    linhas.push(`### ${c.id} — ${c.titulo}`, '', `**Resultado:** ${c.resultado}${c.motivo ? ` — ${c.motivo}` : ''}`, '');
    for (const ch of c.chamadas) {
      linhas.push(`**${ch.metodo} ${ch.url}** → \`${ch.status}\`${ch.ms !== undefined ? ` (${ch.ms} ms)` : ''}`, '');
      if (ch.corpo) linhas.push('Enviado:', '```json', resumir(tentarFormatar(ch.corpo)), '```');
      if (ch.dados !== undefined && ch.dados !== '') linhas.push('Recebido:', '```json', resumir(ch.dados), '```');
      linhas.push('');
    }
  }

  fs.mkdirSync(PASTA_RESULTADOS, { recursive: true });
  const nome = `${MODO_QUEDA ? 'queda' : 'integracao'}-${MARCA}.md`;
  const arquivo = path.join(PASTA_RESULTADOS, nome);
  fs.writeFileSync(arquivo, linhas.join('\n'), 'utf8');
  return arquivo;
}

function tentarFormatar(texto) {
  try { return JSON.parse(texto); } catch { return texto; }
}

executar().catch((erro) => {
  console.error(erro);
  process.exitCode = 2;
});
