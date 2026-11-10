const express = require('express');
const cors = require('cors');
const { conectarBanco, bancoConectado } = require('./db');
const { conectarKafka, kafkaConectado } = require('./eventos');
const AnimalReplica = require('./models/AnimalReplica');
const AdotanteReplica = require('./models/AdotanteReplica');
const adocoesRoutes = require('./routes/adocoes');

const SERVICO = 'adocoes';
const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'adocoes_db';

const app = express();
app.use(cors());
app.use(express.json());

// Quantos registros já chegaram pelo Kafka (null se o banco estiver fora do ar).
async function contarReplicas() {
  if (!bancoConectado()) return { animais: null, adotantes: null };
  const [animais, adotantes] = await Promise.all([
    AnimalReplica.estimatedDocumentCount(),
    AdotanteReplica.estimatedDocumentCount(),
  ]);
  return { animais, adotantes };
}

// Verifica se o serviço está no ar, se o banco e o Kafka estão conectados e
// quantos animais e adotantes já estão nas réplicas. Não consulta os outros
// serviços: Adoções funciona mesmo com Animais ou Adotantes fora do ar.
app.get('/health', async (req, res) => {
  res.json({
    servico: SERVICO,
    status: 'ok',
    banco: bancoConectado() ? 'conectado' : 'desconectado',
    kafka: kafkaConectado() ? 'conectado' : 'desconectado',
    replicas: await contarReplicas().catch(() => ({ animais: null, adotantes: null })),
  });
});

app.use('/adocoes', adocoesRoutes);

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Erros não tratados
app.use((erro, req, res, next) => {
  // Corpo da requisição com JSON malformado
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

app.listen(PORT, () => {
  console.log(`[${SERVICO}] Rodando na porta ${PORT}`);
  conectarBanco(MONGODB_URI, DB_NAME);
  conectarKafka();
});
