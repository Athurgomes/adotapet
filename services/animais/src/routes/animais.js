const express = require('express');
const mongoose = require('mongoose');
const Animal = require('../models/Animal');
const { bancoConectado } = require('../db');

const router = express.Router();

// Rotas do microsserviço de Animais (responsável: Pessoa 5).
// Contrato completo em docs/contrato-api.md.

// Campos que o cliente pode enviar no cadastro (_id, criadoEm e atualizadoEm são ignorados)
const CAMPOS_PERMITIDOS = [
  'nome', 'especie', 'sexo', 'idade', 'porte',
  'caracteristicas', 'vacinas', 'cidade', 'uf', 'imagemUrl', 'disponivel',
];

// Filtros de enum aceitos em GET /animais
const FILTROS_ENUM = {
  especie: Animal.ESPECIES,
  sexo: Animal.SEXOS,
  porte: Animal.PORTES,
};

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const erroValidacao = (res, detalhes) =>
  res.status(400).json({ erro: 'Dados inválidos.', detalhes });

// Sem conexão, o Mongoose seguraria a requisição esperando o banco; respondemos 503 na hora.
router.use((req, res, next) => {
  if (!bancoConectado()) {
    return res.status(503).json({ erro: 'Banco de dados indisponível.' });
  }
  next();
});

// Valida o :id antes de chegar nas rotas que o usam
router.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id) || String(id).length !== 24) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }
  next();
});

// RF01 - Cadastrar animal
router.post('/', async (req, res) => {
  const dados = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (req.body && req.body[campo] !== undefined) dados[campo] = req.body[campo];
  }

  const animal = await Animal.create(dados);
  res.status(201).json(animal);
});

// RF02 / RF03 - Listar animais, com filtros por espécie, sexo, porte, cidade, UF e disponibilidade
router.get('/', async (req, res) => {
  const filtro = {};
  const detalhes = [];

  // Parâmetro vazio (ex.: ?especie=) é tratado como "sem filtro"
  const valorDe = (nome) => {
    const valor = req.query[nome];
    if (valor === undefined || valor === '') return undefined;
    if (typeof valor !== 'string') {
      detalhes.push(`O filtro '${nome}' deve ser informado uma única vez.`);
      return undefined;
    }
    return valor.trim();
  };

  for (const [nome, permitidos] of Object.entries(FILTROS_ENUM)) {
    const valor = valorDe(nome)?.toLowerCase();
    if (!valor) continue;
    if (permitidos.includes(valor)) filtro[nome] = valor;
    else detalhes.push(`O filtro '${nome}' deve ser: ${permitidos.join(', ')}.`);
  }

  const disponivel = valorDe('disponivel')?.toLowerCase();
  if (disponivel === 'true') filtro.disponivel = true;
  else if (disponivel === 'false') filtro.disponivel = false;
  else if (disponivel !== undefined) detalhes.push("O filtro 'disponivel' deve ser true ou false.");

  const cidade = valorDe('cidade');
  if (cidade) filtro.cidade = new RegExp(`^${escaparRegex(cidade)}$`, 'i');

  const uf = valorDe('uf');
  if (uf) filtro.uf = uf.toUpperCase();

  if (detalhes.length) return erroValidacao(res, detalhes);

  const animais = await Animal.find(filtro).sort({ criadoEm: -1 });
  res.json(animais);
});

// RF04 - Consultar um animal
router.get('/:id', async (req, res) => {
  const animal = await Animal.findById(req.params.id);
  if (!animal) return res.status(404).json({ erro: 'Animal não encontrado.' });
  res.json(animal);
});

// RF12 - Editar animal (área administrativa)
// Atualiza os campos enviados; o documento inteiro é validado de novo ao salvar.
router.put('/:id', async (req, res) => {
  const animal = await Animal.findById(req.params.id);
  if (!animal) return res.status(404).json({ erro: 'Animal não encontrado.' });

  for (const campo of CAMPOS_PERMITIDOS) {
    if (req.body && req.body[campo] !== undefined) animal.set(campo, req.body[campo]);
  }

  await animal.save();
  res.json(animal);
});

// RF05 - Atualizar disponibilidade
router.patch('/:id/disponibilidade', async (req, res) => {
  const disponivel = req.body?.disponivel;
  if (typeof disponivel !== 'boolean') {
    return erroValidacao(res, ["O campo 'disponivel' é obrigatório e deve ser true ou false."]);
  }

  const animal = await Animal.findByIdAndUpdate(
    req.params.id,
    { disponivel },
    { new: true, runValidators: true }
  );
  if (!animal) return res.status(404).json({ erro: 'Animal não encontrado.' });
  res.json(animal);
});

// Erros de validação do Mongoose viram 400 com a lista de problemas
router.use((erro, req, res, next) => {
  if (erro instanceof mongoose.Error.ValidationError) {
    const detalhes = Object.values(erro.errors).map((e) =>
      e instanceof mongoose.Error.CastError ? `Valor inválido para o campo '${e.path}'.` : e.message
    );
    return erroValidacao(res, detalhes);
  }
  if (erro instanceof mongoose.Error.CastError) {
    return erroValidacao(res, [`Valor inválido para o campo '${erro.path}'.`]);
  }
  next(erro);
});

module.exports = router;
