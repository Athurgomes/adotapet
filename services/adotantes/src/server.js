const express = require('express');
const cors = require('cors');
const { conectarBanco, bancoConectado } = require('./db');
const adotantesRoutes = require('./routes/adotantes');

const SERVICO = 'adotantes';
const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'adotantes_db';

const app = express();
app.use(cors());
app.use(express.json());

// Verifica se o serviço está no ar e se o banco está conectado.
app.get('/health', (req, res) => {
  res.json({
    servico: SERVICO,
    status: 'ok',
    banco: bancoConectado() ? 'conectado' : 'desconectado',
  });
});

app.use('/adotantes', adotantesRoutes);

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Erros não tratados
app.use((erro, req, res, next) => {
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

app.listen(PORT, () => {
  console.log(`[${SERVICO}] Rodando na porta ${PORT}`);
  conectarBanco(MONGODB_URI, DB_NAME);
});
