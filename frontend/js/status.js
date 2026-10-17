// Página provisória da infraestrutura: mostra se cada microsserviço
// está no ar e conectado ao banco. Pode ser removida pela Pessoa 4.

async function verificarServico(nome, url) {
  const linha = document.querySelector(`[data-servico="${nome}"]`);
  const celulaServico = linha.querySelector('.status-servico');
  const celulaBanco = linha.querySelector('.status-banco');

  try {
    const resposta = await fetch(`${url}/health`);
    const dados = await resposta.json();
    celulaServico.textContent = 'no ar';
    celulaServico.className = 'status-servico ok';
    celulaBanco.textContent = dados.banco;
    celulaBanco.className = `status-banco ${dados.banco === 'conectado' ? 'ok' : 'erro'}`;
  } catch {
    celulaServico.textContent = 'fora do ar';
    celulaServico.className = 'status-servico erro';
    celulaBanco.textContent = '-';
    celulaBanco.className = 'status-banco';
  }
}

function verificarTodos() {
  Object.entries(API).forEach(([nome, url]) => verificarServico(nome, url));
}

document.getElementById('atualizar').addEventListener('click', verificarTodos);
verificarTodos();
