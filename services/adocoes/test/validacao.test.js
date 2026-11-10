const test = require('node:test');
const assert = require('node:assert/strict');
const { avaliarSolicitacao, idadeEm } = require('../src/validacao');

const HOJE = new Date(2026, 10, 10); // 10/11/2026

const animal = {
  _id: 'a'.repeat(24),
  nome: 'Thor',
  especie: 'cachorro',
  porte: 'medio',
  cidade: 'Goiânia',
  uf: 'GO',
  imagemUrl: 'https://exemplo.com/thor.jpg',
  disponivel: true,
};

const adotante = {
  _id: 'b'.repeat(24),
  nomeCompleto: 'Maria Souza',
  dataNascimento: '1990-05-20',
  cidade: 'Goiânia',
  uf: 'GO',
  email: 'maria@exemplo.com',
};

test('idade considera se o aniversário do ano já passou', () => {
  assert.equal(idadeEm('2005-11-10', HOJE), 21); // faz 21 hoje
  assert.equal(idadeEm('2005-11-11', HOJE), 20); // faz 21 amanhã
  assert.equal(idadeEm('1990-05-20', HOJE), 36);
});

test('solicitação válida devolve os resumos com a idade calculada', () => {
  const r = avaliarSolicitacao(animal, adotante, HOJE);
  assert.equal(r.erro, undefined);
  assert.deepEqual(r.resumoAnimal, {
    nome: 'Thor', especie: 'cachorro', porte: 'medio', cidade: 'Goiânia', uf: 'GO',
    imagemUrl: 'https://exemplo.com/thor.jpg',
  });
  assert.equal(r.resumoAdotante.idade, 36);
  assert.equal(r.resumoAdotante.email, 'maria@exemplo.com');
});

test('animal ou adotante que ainda não estão na réplica retornam 404', () => {
  assert.deepEqual(avaliarSolicitacao(null, adotante, HOJE), { erro: 404, mensagem: 'Animal não encontrado.' });
  assert.deepEqual(avaliarSolicitacao(animal, null, HOJE), { erro: 404, mensagem: 'Adotante não encontrado.' });
});

test('animal indisponível retorna 409', () => {
  assert.equal(avaliarSolicitacao({ ...animal, disponivel: false }, adotante, HOJE).erro, 409);
});

test('adotante com exatamente 21 anos pode, com 20 anos não pode (422)', () => {
  assert.equal(avaliarSolicitacao(animal, { ...adotante, dataNascimento: '2005-11-10' }, HOJE).erro, undefined);
  assert.equal(avaliarSolicitacao(animal, { ...adotante, dataNascimento: '2005-11-11' }, HOJE).erro, 422);
});

test('réplica com dados incompletos retorna 503', () => {
  assert.equal(avaliarSolicitacao({ ...animal, nome: undefined }, adotante, HOJE).erro, 503);
  assert.equal(avaliarSolicitacao(animal, { ...adotante, email: undefined }, HOJE).erro, 503);
  assert.equal(avaliarSolicitacao(animal, { ...adotante, dataNascimento: 'abc' }, HOJE).erro, 503);
});
