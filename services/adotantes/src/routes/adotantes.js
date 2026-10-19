const express = require('express');
const mongoose = require('mongoose');
const Adotante = require('../models/Adotante');

const router = express.Router();

// Calcula a idade considerando se o aniversário deste ano já aconteceu.
function idadeEm(dataNascimento) {
  const [ano, mes, dia] = dataNascimento.split('-').map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const aindaNaoFezAniversario =
    hoje.getMonth() + 1 < mes ||
    (hoje.getMonth() + 1 === mes && hoje.getDate() < dia);

  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

// Aceita somente datas reais no formato AAAA-MM-DD que não estejam no futuro.
function dataNascimentoValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const [ano, mes, dia] = valor.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia &&
    data <= new Date()
  );
}

// Valida os dados recebidos e retorna uma lista de mensagens de erro.
function validarCadastro(corpo) {
  const detalhes = [];
  const camposTexto = [
    'nomeCompleto',
    'uf',
    'telefone',
    'email',
  ];

  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
    return ['o corpo da requisição deve ser um objeto JSON'];
  }

  // Verifica a presença dos campos de texto obrigatórios.
  for (const campo of camposTexto) {
    if (typeof corpo[campo] !== 'string' || !corpo[campo].trim()) {
      detalhes.push(`campo '${campo}' é obrigatório e deve ser texto`);
    }
  }

  // Estes dados podem ser omitidos; quando enviados, devem ser texto.
  for (const campo of ['profissao', 'endereco', 'cidade']) {
    if (corpo[campo] != null && typeof corpo[campo] !== 'string') {
      detalhes.push(`campo '${campo}' deve ser texto quando informado`);
    }
  }

  if (!dataNascimentoValida(corpo.dataNascimento)) {
    detalhes.push(
      "campo 'dataNascimento' deve ser uma data válida no formato AAAA-MM-DD e não futura"
    );
  }

  if (
    typeof corpo.uf === 'string' &&
    corpo.uf.trim() &&
    !/^[a-zA-Z]{2}$/.test(corpo.uf.trim())
  ) {
    detalhes.push("campo 'uf' deve ter 2 letras");
  }

  if (
    typeof corpo.email === 'string' &&
    corpo.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(corpo.email.trim())
  ) {
    detalhes.push("campo 'email' deve ter um formato válido");
  }

  // Confere os campos exigidos pelo questionário do adotante.
  const questionario = corpo.questionario;
  if (!questionario || typeof questionario !== 'object' || Array.isArray(questionario)) {
    detalhes.push("campo 'questionario' é obrigatório e deve ser um objeto");
  } else {
    for (const campo of ['jaTeveAnimais', 'possuiQuintal', 'moradiaPropria']) {
      if (typeof questionario[campo] !== 'boolean') {
        detalhes.push(`campo 'questionario.${campo}' é obrigatório e deve ser booleano`);
      }
    }

    if (typeof questionario.tipoMoradia !== 'string' || !questionario.tipoMoradia.trim()) {
      detalhes.push("campo 'questionario.tipoMoradia' é obrigatório");
    }

    if (
      !Number.isInteger(questionario.outrosAnimaisEmCasa) ||
      questionario.outrosAnimaisEmCasa < 0
    ) {
      detalhes.push(
        "campo 'questionario.outrosAnimaisEmCasa' deve ser um inteiro maior ou igual a zero"
      );
    }

    if (
      typeof questionario.horasDisponiveisPorDia !== 'number' ||
      questionario.horasDisponiveisPorDia < 0 ||
      questionario.horasDisponiveisPorDia > 24
    ) {
      detalhes.push("campo 'questionario.horasDisponiveisPorDia' deve estar entre 0 e 24");
    }

    if (typeof questionario.motivoAdocao !== 'string' || !questionario.motivoAdocao.trim()) {
      detalhes.push("campo 'questionario.motivoAdocao' é obrigatório");
    }
  }

  return detalhes;
}

// POST /adotantes: valida e salva um cadastro com o questionário.
router.post('/', async (req, res, next) => {
  const detalhes = validarCadastro(req.body);
  if (detalhes.length) {
    return res.status(400).json({ erro: 'Dados inválidos.', detalhes });
  }

  try {
    const adotante = await Adotante.create(req.body);
    return res.status(201).json(adotante);
  } catch (erro) {
    // O índice único do MongoDB/Mongoose gera o código 11000 para e-mail repetido.
    if (erro.code === 11000) {
      return res.status(409).json({ erro: 'Já existe um adotante cadastrado com este e-mail.' });
    }

    // Converte erros de validação do modelo em uma resposta 400.
    if (erro.name === 'ValidationError') {
      const erros = Object.values(erro.errors).map(({ message }) => message);
      return res.status(400).json({ erro: 'Dados inválidos.', detalhes: erros });
    }

    return next(erro);
  }
});

// GET /adotantes: lista os cadastros do mais recente para o mais antigo.
router.get('/', async (req, res, next) => {
  try {
    const adotantes = await Adotante.find().sort({ criadoEm: -1 }).lean();
    return res.json(adotantes);
  } catch (erro) {
    return next(erro);
  }
});

// GET /adotantes/:id: consulta um cadastro e inclui a idade calculada.
router.get('/:id', async (req, res, next) => {
  // Verifica o formato do ID antes de consultar o MongoDB.
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ erro: 'Id inválido.' });
  }

  try {
    const adotante = await Adotante.findById(req.params.id).lean();
    if (!adotante) {
      return res.status(404).json({ erro: 'Adotante não encontrado.' });
    }

    // A idade é derivada da data de nascimento e não fica armazenada.
    return res.json({ ...adotante, idade: idadeEm(adotante.dataNascimento) });
  } catch (erro) {
    return next(erro);
  }
});

module.exports = router;
