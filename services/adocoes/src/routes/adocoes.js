const express = require('express');

const router = express.Router();

// Rotas do microsserviço de Adoções (responsável: Pessoa 7).
// Contrato completo em docs/contrato-api.md.
// Cada rota responde 501 até ser implementada.
//
// As URLs dos outros serviços vêm das variáveis de ambiente:
//   process.env.ANIMAIS_API_URL   -> ex.: http://animais:3001
//   process.env.ADOTANTES_API_URL -> ex.: http://adotantes:3002
// Use fetch (já disponível no Node) para consultá-los. Nunca acesse
// animais_db ou adotantes_db diretamente (RNF06).

const naoImplementado = (req, res) => {
  res.status(501).json({ erro: 'Rota ainda não implementada.' });
};

// RF10 / RF11 / RF12 - Registrar solicitação de adoção (status "Pendente")
router.post('/', naoImplementado);

// RF13 - Listar solicitações
router.get('/', naoImplementado);

// RF13 - Consultar uma solicitação
router.get('/:id', naoImplementado);

module.exports = router;
