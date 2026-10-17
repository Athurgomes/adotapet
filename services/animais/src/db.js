const mongoose = require('mongoose');

const TEMPO_ENTRE_TENTATIVAS_MS = 5000;

// Conecta ao MongoDB Atlas. Se falhar, tenta de novo a cada 5 segundos,
// sem derrubar o servidor (o /health mostra se o banco está conectado).
async function conectarBanco(uri, dbName) {
  if (!uri) {
    console.error('[db] MONGODB_URI não definida. Confira o arquivo .env na raiz do projeto.');
    return;
  }

  try {
    await mongoose.connect(uri, { dbName });
    console.log(`[db] Conectado ao banco "${dbName}".`);
  } catch (erro) {
    console.error(`[db] Falha ao conectar em "${dbName}": ${erro.message}`);
    console.error(`[db] Nova tentativa em ${TEMPO_ENTRE_TENTATIVAS_MS / 1000}s...`);
    setTimeout(() => conectarBanco(uri, dbName), TEMPO_ENTRE_TENTATIVAS_MS);
  }
}

function bancoConectado() {
  return mongoose.connection.readyState === 1;
}

module.exports = { conectarBanco, bancoConectado };
