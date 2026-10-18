const mongoose = require('mongoose');

// Intervalo entre novas tentativas quando o Atlas não está acessível.
const TEMPO_ENTRE_TENTATIVAS_MS = 5000;

// Conecta ao banco lógico do serviço e tenta novamente se a conexão falhar.
async function conectarBanco(uri, dbName) {
  if (!uri) {
    console.error('[db] MONGODB_URI não definida. Confira o arquivo .env na raiz do projeto.');
    return;
  }

  try {
    // O nome do banco vem da configuração do serviço (adotantes_db por padrão).
    await mongoose.connect(uri, { dbName });
    console.log(`[db] Conectado ao banco "${dbName}".`);
  } catch (erro) {
    console.error(`[db] Falha ao conectar em "${dbName}": ${erro.message}`);
    console.error(`[db] Nova tentativa em ${TEMPO_ENTRE_TENTATIVAS_MS / 1000}s...`);
    setTimeout(() => conectarBanco(uri, dbName), TEMPO_ENTRE_TENTATIVAS_MS);
  }
}

// Informa se o Mongoose está conectado para a rota /health.
function bancoConectado() {
  return mongoose.connection.readyState === 1;
}

module.exports = { conectarBanco, bancoConectado };
