const express = require('express');
const Solicitacao = require('../models/Solicitacao');
const AnimalReplica = require('../models/AnimalReplica');
const AdotanteReplica = require('../models/AdotanteReplica');
const { avaliarSolicitacao } = require('../validacao');
const { publicarSolicitacao } = require('../eventos');

const router = express.Router();
const ID_VALIDO = /^[a-f\d]{24}$/i;
const STATUS_PENDENTE = 'Pendente';

// Rotas do microsserviço de Adoções (responsável: Pessoa 7).
// Contrato completo em docs/contrato-api.md.
//
// Este serviço NÃO chama as APIs de Animais e Adotantes. Os dados de que ele
// precisa chegam pelo Kafka e ficam nas réplicas locais (models/*Replica.js),
// no próprio adocoes_db. Assim, uma solicitação pode ser registrada mesmo com
// Animais ou Adotantes fora do ar (RNF06: cada serviço só acessa o próprio banco).

function responderErro(res, status, erro, detalhes) {
  return res.status(status).json(detalhes ? { erro, detalhes } : { erro });
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
    const [animal, adotante] = await Promise.all([
      AnimalReplica.findById(animalId.toLowerCase()).lean(),
      AdotanteReplica.findById(adotanteId.toLowerCase()).lean(),
    ]);

    const avaliacao = avaliarSolicitacao(animal, adotante);
    if (avaliacao.erro) {
      return responderErro(res, avaliacao.erro, avaliacao.mensagem);
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
      resumoAnimal: avaliacao.resumoAnimal,
      resumoAdotante: avaliacao.resumoAdotante,
    });

    await publicarSolicitacao('SolicitacaoCriada', solicitacao);
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
    const STATUS_PERMITIDOS = ['Pendente', 'Em contato', 'Concluído'];
    if (!STATUS_PERMITIDOS.includes(req.query.status)) {
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

// Atualizar status da solicitação ('Pendente' <-> 'Em contato' <-> 'Concluído')
router.patch('/:id/status', async (req, res, next) => {
  if (!ID_VALIDO.test(req.params.id)) {
    return responderErro(res, 400, 'Id inválido.');
  }

  const { status } = req.body || {};
  const STATUS_PERMITIDOS = ['Pendente', 'Em contato', 'Concluído'];
  if (!STATUS_PERMITIDOS.includes(status)) {
    return responderErro(
      res,
      400,
      `Status inválido. Deve ser: ${STATUS_PERMITIDOS.join(', ')}.`
    );
  }

  try {
    const solicitacao = await Solicitacao.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!solicitacao) {
      return responderErro(res, 404, 'Solicitação não encontrada.');
    }
    await publicarSolicitacao('StatusAlterado', solicitacao);
    return res.json(solicitacao);
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
