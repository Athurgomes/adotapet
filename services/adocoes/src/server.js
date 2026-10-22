const express = require('express');
const cors = require('cors');
const { conectarBanco, bancoConectado } = require('./db');
const adocoesRoutes = require('./routes/adocoes');

const SERVICO = 'adocoes';
const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'adocoes_db';
const ANIMAIS_API_URL = process.env.ANIMAIS_API_URL || 'http://localhost:3001';
const ADOTANTES_API_URL = process.env.ADOTANTES_API_URL || 'http://localhost:3002';

const app = express();
app.use(cors());
app.use(express.json());

// Verifica se um serviço vizinho responde no /health.
async function servicoNoAr(url) {
  try {
    const resposta = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
    return resposta.ok ? 'no ar' : 'com erro';
  } catch {
    return 'fora do ar';
  }
}

// Verifica se o serviço está no ar, se o banco está conectado
// e se os serviços de Animais e Adotantes estão acessíveis.
app.get('/health', async (req, res) => {
  const [animais, adotantes] = await Promise.all([
    servicoNoAr(ANIMAIS_API_URL),
    servicoNoAr(ADOTANTES_API_URL),
  ]);

  res.json({
    servico: SERVICO,
    status: 'ok',
    banco: bancoConectado() ? 'conectado' : 'desconectado',
    dependencias: { animais, adotantes },
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
});
