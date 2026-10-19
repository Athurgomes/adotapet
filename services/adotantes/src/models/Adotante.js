const mongoose = require('mongoose');

// Define as perguntas e os tipos de resposta do questionário de adoção.
const questionarioSchema = new mongoose.Schema(
  {
    jaTeveAnimais: { type: Boolean, required: true },
    tipoMoradia: { type: String, required: true, trim: true },
    possuiQuintal: { type: Boolean, required: true },
    moradiaPropria: { type: Boolean, required: true },
    outrosAnimaisEmCasa: { type: Number, required: true, min: 0 },
    horasDisponiveisPorDia: { type: Number, required: true, min: 0, max: 24 },
    motivoAdocao: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// Define os dados pessoais, validações e campos de data do adotante.
const adotanteSchema = new mongoose.Schema(
  {
    nomeCompleto: { type: String, required: true, trim: true },
    dataNascimento: { type: String, required: true },
    profissao: { type: String, trim: true },
    endereco: { type: String, trim: true },
    cidade: { type: String, trim: true },
    uf: { type: String, required: true, uppercase: true, trim: true, match: /^[A-Z]{2}$/ },
    telefone: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    questionario: { type: questionarioSchema, required: true },
  },
  { timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } }
);

// Usa explicitamente a coleção "adotantes" no banco do microsserviço.
module.exports = mongoose.model('Adotante', adotanteSchema, 'adotantes');
