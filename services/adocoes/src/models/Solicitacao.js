const mongoose = require('mongoose');

const solicitacaoSchema = new mongoose.Schema(
  {
    animalId: { type: String, required: true },
    adotanteId: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pendente', 'Em contato', 'Concluído'],
      default: 'Pendente',
      required: true,
    },
    resumoAnimal: {
      nome: { type: String, required: true },
      especie: { type: String, required: true },
      porte: { type: String, required: true },
      cidade: { type: String, required: true },
      uf: { type: String, required: true },
      imagemUrl: { type: String, required: true },
    },
    resumoAdotante: {
      nomeCompleto: { type: String, required: true },
      idade: { type: Number, required: true },
      cidade: { type: String, required: true },
      uf: { type: String, required: true },
      email: { type: String, required: true },
    },
  },
  { timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } }
);

// Impede solicitações pendentes duplicadas, inclusive em requisições simultâneas.
solicitacaoSchema.index(
  { animalId: 1, adotanteId: 1 },
  { unique: true, partialFilterExpression: { status: 'Pendente' } }
);

module.exports = mongoose.model('Solicitacao', solicitacaoSchema, 'solicitacoes');
