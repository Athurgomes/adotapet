const test = require('node:test');
const assert = require('node:assert/strict');
const { aplicarEvento } = require('../src/replicas');

// Modelo em memória que imita o updateOne do Mongoose usado em replicas.js:
// filtro por _id + "atualizadoEm menor ou igual", com upsert.
function modeloEmMemoria() {
  const docs = new Map();
  return {
    docs,
    async updateOne(filtro, { $set }) {
      const atual = docs.get(filtro._id);
      const limite = filtro.$or[0].atualizadoEm.$lte;
      if (!atual) {
        docs.set(filtro._id, { _id: filtro._id, ...$set });
        return;
      }
      if (atual.atualizadoEm <= limite) {
        docs.set(filtro._id, { ...atual, ...$set });
        return;
      }
      const erro = new Error('E11000 duplicate key');
      erro.code = 11000;
      throw erro;
    },
  };
}

function modelos() {
  return { AnimalReplica: modeloEmMemoria(), AdotanteReplica: modeloEmMemoria() };
}

const evento = (tipo, dados) => ({ tipo, versao: 1, ocorridoEm: new Date().toISOString(), dados });

test('AnimalSalvo cria e atualiza a réplica de animais', async () => {
  const m = modelos();
  await aplicarEvento(evento('AnimalSalvo', { id: 'x1', nome: 'Thor', disponivel: true, atualizadoEm: '2026-11-10T10:00:00Z' }), m);
  await aplicarEvento(evento('AnimalSalvo', { id: 'x1', nome: 'Thor', disponivel: false, atualizadoEm: '2026-11-10T11:00:00Z' }), m);
  assert.equal(m.AnimalReplica.docs.get('x1').disponivel, false);
  assert.equal(m.AdotanteReplica.docs.size, 0);
});

test('evento mais antigo que a réplica é ignorado', async () => {
  const m = modelos();
  await aplicarEvento(evento('AnimalSalvo', { id: 'x1', disponivel: false, atualizadoEm: '2026-11-10T11:00:00Z' }), m);
  const aplicado = await aplicarEvento(
    evento('AnimalSalvo', { id: 'x1', disponivel: true, atualizadoEm: '2026-11-10T10:00:00Z' }),
    m
  );
  assert.equal(aplicado, false);
  assert.equal(m.AnimalReplica.docs.get('x1').disponivel, false);
});

test('o mesmo evento entregue duas vezes não muda o resultado', async () => {
  const m = modelos();
  const e = evento('AdotanteSalvo', { id: 'p1', nomeCompleto: 'Maria', atualizadoEm: '2026-11-10T10:00:00Z' });
  await aplicarEvento(e, m);
  await aplicarEvento(e, m);
  assert.equal(m.AdotanteReplica.docs.size, 1);
  assert.equal(m.AdotanteReplica.docs.get('p1').nomeCompleto, 'Maria');
});

test('tipos desconhecidos ou sem id são ignorados', async () => {
  const m = modelos();
  assert.equal(await aplicarEvento(evento('Outro', { id: 'z' }), m), false);
  assert.equal(await aplicarEvento(evento('AnimalSalvo', {}), m), false);
  assert.equal(await aplicarEvento(null, m), false);
});
