const mongoose = require('mongoose');

// Cópia local (réplica) dos adotantes, alimentada pelos eventos do tópico
// "adotantes.eventos". Guarda só o que o serviço de Adoções precisa para validar
// uma solicitação e montar o resumoAdotante. O _id é o mesmo id do serviço de Adotantes.
const adotanteReplicaSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    nomeCompleto: String,
    // A idade é calculada na hora da solicitação, a partir da data de nascimento
    dataNascimento: String,
    cidade: String,
    uf: String,
    email: String,
    atualizadoEm: Date,
  },
  { versionKey: false }
);

module.exports = mongoose.model('AdotanteReplica', adotanteReplicaSchema, 'replica_adotantes');
