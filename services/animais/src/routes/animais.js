const express = require('express');

const router = express.Router();

// Rotas do microsserviço de Animais (responsável: Pessoa 5).
// Contrato completo em docs/contrato-api.md.
// Cada rota responde 501 até ser implementada.

const naoImplementado = (req, res) => {
  res.status(501).json({ erro: 'Rota ainda não implementada.' });
};

// RF01 - Cadastrar animal
router.post('/', naoImplementado);

// RF02 / RF03 - Listar animais, com filtros por espécie, sexo, porte, cidade, UF e disponibilidade
router.get('/', naoImplementado);

// RF04 - Consultar um animal
router.get('/:id', naoImplementado);

// RF05 - Atualizar disponibilidade
router.patch('/:id/disponibilidade', naoImplementado);

module.exports = router;
