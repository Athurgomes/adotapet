// Aplicação dos eventos recebidos do Kafka nas réplicas locais.
//
// Cada evento traz o estado completo do registro (não só a diferença). Por isso
// basta gravar o último estado recebido, desde que ele não seja mais antigo do
// que o já salvo: o Kafka entrega "pelo menos uma vez" e, ao reconstruir as
// réplicas, eventos antigos podem chegar depois de novos.

const MODELO_POR_TIPO = {
  AnimalSalvo: 'AnimalReplica',
  AdotanteSalvo: 'AdotanteReplica',
};

async function salvarSeMaisRecente(Modelo, dados) {
  const { id, ...campos } = dados;
  const atualizadoEm = campos.atualizadoEm ? new Date(campos.atualizadoEm) : new Date(0);

  try {
    await Modelo.updateOne(
      {
        _id: id,
        $or: [{ atualizadoEm: { $lte: atualizadoEm } }, { atualizadoEm: { $exists: false } }],
      },
      { $set: { ...campos, atualizadoEm } },
      { upsert: true }
    );
    return true;
  } catch (erro) {
    // Já existe uma versão mais nova: o filtro não casa e o upsert tenta criar
    // um documento com o mesmo _id. É o comportamento esperado, o evento é ignorado.
    if (erro.code === 11000) return false;
    throw erro;
  }
}

// Retorna true se a réplica foi atualizada e false se o evento foi ignorado.
async function aplicarEvento(evento, modelos) {
  const nomeModelo = MODELO_POR_TIPO[evento?.tipo];
  if (!nomeModelo || !evento.dados?.id) return false;
  return salvarSeMaisRecente(modelos[nomeModelo], evento.dados);
}

module.exports = { aplicarEvento };
