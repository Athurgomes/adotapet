const mongoose = require('mongoose');

// Cópia local (réplica) dos animais, alimentada pelos eventos do tópico
// "animais.eventos". Guarda só o que o serviço de Adoções precisa para validar
// uma solicitação e montar o resumoAnimal. O _id é o mesmo id do serviço de Animais.
const animalReplicaSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    nome: String,
    especie: String,
    porte: String,
    cidade: String,
    uf: String,
    imagemUrl: String,
    disponivel: Boolean,
    // Data da última alteração no serviço de origem: evita aplicar um evento antigo por cima de um novo
    atualizadoEm: Date,
  },
  { versionKey: false }
);

module.exports = mongoose.model('AnimalReplica', animalReplicaSchema, 'replica_animais');
