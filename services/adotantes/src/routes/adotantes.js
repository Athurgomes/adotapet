const express = require('express');

const router = express.Router();

// Rotas do microsserviço de Adotantes (responsável: Pessoa 6).
// Contrato completo em docs/contrato-api.md.
// Cada rota responde 501 até ser implementada.

const naoImplementado = (req, res) => {
  res.status(501).json({ erro: 'Rota ainda não implementada.' });
};

// RF06 / RF08 - Cadastrar adotante (dados pessoais + questionário)
router.post('/', naoImplementado);

// RF09 - Listar adotantes
router.get('/', naoImplementado);

// RF09 - Consultar um adotante (usada também pelo serviço de Adoções)
router.get('/:id', naoImplementado);

module.exports = router;
