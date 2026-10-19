const express = require('express');
const Solicitacao = require('../models/Solicitacao');

const router = express.Router();
const ID_VALIDO = /^[a-f\d]{24}$/i;
const STATUS_PENDENTE = 'Pendente';
const ANIMAIS_API_URL = process.env.ANIMAIS_API_URL || 'http://localhost:3001';
const ADOTANTES_API_URL = process.env.ADOTANTES_API_URL || 'http://localhost:3002';

// Rotas do microsserviço de Adoções (responsável: Pessoa 7).
// Contrato completo em docs/contrato-api.md.
// Cada rota responde 501 até ser implementada.
//
// As URLs dos outros serviços vêm das variáveis de ambiente:
//   process.env.ANIMAIS_API_URL   -> ex.: http://animais:3001
//   process.env.ADOTANTES_API_URL -> ex.: http://adotantes:3002
// Use fetch (já disponível no Node) para consultá-los. Nunca acesse
// animais_db ou adotantes_db diretamente (RNF06).

function responderErro(res, status, erro, detalhes) {
  return res.status(status).json(detalhes ? { erro, detalhes } : { erro });
}

async function consultarServico(url, servico, mensagemNaoEncontrado) {
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(3000) });

    if (resposta.status === 404) {
      return { erro: 404, mensagem: mensagemNaoEncontrado };
    }
    if (!resposta.ok) {
      return { erro: 503, mensagem: `Serviço de ${servico} indisponível.` };
    }

    return { dados: await resposta.json() };
  } catch {
    return { erro: 503, mensagem: `Serviço de ${servico} indisponível.` };
  }
}

// RF10 / RF11 / RF12 - Registrar solicitação de adoção (status "Pendente")
router.post('/', async (req, res, next) => {
  const { animalId, adotanteId } = req.body || {};
  const detalhes = [];

  if (!ID_VALIDO.test(animalId || '')) {
    detalhes.push("campo 'animalId' deve ser um id válido de 24 caracteres hexadecimais");
  }
  if (!ID_VALIDO.test(adotanteId || '')) {
    detalhes.push("campo 'adotanteId' deve ser um id válido de 24 caracteres hexadecimais");
  }
  if (detalhes.length > 0) {
    return responderErro(res, 400, 'Dados inválidos.', detalhes);
  }

  try {
    const consultaAnimal = await consultarServico(
      `${ANIMAIS_API_URL}/animais/${animalId}`,
      'animais',
      'Animal não encontrado.'
    );
    if (consultaAnimal.erro) {
      return responderErro(res, consultaAnimal.erro, consultaAnimal.mensagem);
    }

    const animal = consultaAnimal.dados;
    const camposAnimal = ['nome', 'especie', 'porte', 'cidade', 'uf', 'imagemUrl'];
    if (
      !animal ||
      typeof animal.disponivel !== 'boolean' ||
      camposAnimal.some((campo) => typeof animal[campo] !== 'string')
    ) {
      return responderErro(res, 503, 'Resposta inválida do serviço de animais.');
    }
    if (!animal.disponivel) {
      return responderErro(res, 409, 'Animal indisponível para adoção.');
    }

    const consultaAdotante = await consultarServico(
      `${ADOTANTES_API_URL}/adotantes/${adotanteId}`,
      'adotantes',
      'Adotante não encontrado.'
    );
    if (consultaAdotante.erro) {
      return responderErro(res, consultaAdotante.erro, consultaAdotante.mensagem);
    }

    const adotante = consultaAdotante.dados;
    const camposAdotante = ['nomeCompleto', 'cidade', 'uf', 'email'];
    if (
      !adotante ||
      !Number.isInteger(adotante.idade) ||
      adotante.idade < 0 ||
      camposAdotante.some((campo) => typeof adotante[campo] !== 'string')
    ) {
      return responderErro(res, 503, 'Resposta inválida do serviço de adotantes.');
    }
    if (adotante.idade < 21) {
      return responderErro(res, 422, 'Idade mínima para adoção é 21 anos.');
    }

    const duplicada = await Solicitacao.exists({
      animalId,
      adotanteId,
      status: STATUS_PENDENTE,
    });
    if (duplicada) {
      return responderErro(
        res,
        409,
        'Já existe uma solicitação pendente deste adotante para este animal.'
      );
    }

    const solicitacao = await Solicitacao.create({
      animalId,
      adotanteId,
      status: STATUS_PENDENTE,
      resumoAnimal: {
        nome: animal.nome,
        especie: animal.especie,
        porte: animal.porte,
        cidade: animal.cidade,
        uf: animal.uf,
        imagemUrl: animal.imagemUrl,
      },
      resumoAdotante: {
        nomeCompleto: adotante.nomeCompleto,
        idade: adotante.idade,
        cidade: adotante.cidade,
        uf: adotante.uf,
        email: adotante.email,
      },
    });

    return res.status(201).json(solicitacao);
  } catch (erro) {
    if (erro.code === 11000) {
      return responderErro(
        res,
        409,
        'Já existe uma solicitação pendente deste adotante para este animal.'
      );
    }
    return next(erro);
  }
});

// RF13 - Listar solicitações
router.get('/', async (req, res, next) => {
  const filtro = {};

  for (const campo of ['animalId', 'adotanteId']) {
    if (req.query[campo] !== undefined) {
      if (typeof req.query[campo] !== 'string' || !ID_VALIDO.test(req.query[campo])) {
        return responderErro(res, 400, `Filtro '${campo}' inválido.`);
      }
      filtro[campo] = req.query[campo];
    }
  }

  if (req.query.status !== undefined) {
    if (req.query.status !== STATUS_PENDENTE) {
      return responderErro(res, 400, "Filtro 'status' inválido.");
    }
    filtro.status = req.query.status;
  }

  try {
    return res.json(await Solicitacao.find(filtro));
  } catch (erro) {
    return next(erro);
  }
});

// RF13 - Consultar uma solicitação
router.get('/:id', async (req, res, next) => {
  if (!ID_VALIDO.test(req.params.id)) {
    return responderErro(res, 400, 'Id inválido.');
  }

  try {
    const solicitacao = await Solicitacao.findById(req.params.id);
    if (!solicitacao) {
      return responderErro(res, 404, 'Solicitação não encontrada.');
    }
    return res.json(solicitacao);
  } catch (erro) {
    return next(erro);
  }
});

module.exports = router;
