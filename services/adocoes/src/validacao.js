// Regras de negócio da solicitação de adoção (RF07, RF10), sem acesso a banco
// nem a rede: recebem os dados das réplicas e dizem se a solicitação pode ser feita.

const IDADE_MINIMA = 21;

// Calcula a idade considerando se o aniversário deste ano já aconteceu
// (mesma regra do serviço de Adotantes).
function idadeEm(dataNascimento, hoje = new Date()) {
  const [ano, mes, dia] = String(dataNascimento).split('-').map(Number);
  let idade = hoje.getFullYear() - ano;
  const aindaNaoFezAniversario =
    hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia);
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

const CAMPOS_ANIMAL = ['nome', 'especie', 'porte', 'cidade', 'uf', 'imagemUrl'];
const CAMPOS_ADOTANTE = ['nomeCompleto', 'cidade', 'uf', 'email'];

// Retorna { erro: <status HTTP>, mensagem } quando a solicitação não pode ser
// registrada, ou { resumoAnimal, resumoAdotante } quando pode.
function avaliarSolicitacao(animal, adotante, hoje = new Date()) {
  if (!animal) {
    return { erro: 404, mensagem: 'Animal não encontrado.' };
  }
  if (typeof animal.disponivel !== 'boolean' || CAMPOS_ANIMAL.some((c) => typeof animal[c] !== 'string')) {
    return { erro: 503, mensagem: 'Dados do animal incompletos. Tente novamente em instantes.' };
  }
  if (!animal.disponivel) {
    return { erro: 409, mensagem: 'Animal indisponível para adoção.' };
  }

  if (!adotante) {
    return { erro: 404, mensagem: 'Adotante não encontrado.' };
  }
  const idade = idadeEm(adotante.dataNascimento, hoje);
  if (!Number.isInteger(idade) || idade < 0 || CAMPOS_ADOTANTE.some((c) => typeof adotante[c] !== 'string')) {
    return { erro: 503, mensagem: 'Dados do adotante incompletos. Tente novamente em instantes.' };
  }
  if (idade < IDADE_MINIMA) {
    return { erro: 422, mensagem: `Idade mínima para adoção é ${IDADE_MINIMA} anos.` };
  }

  return {
    resumoAnimal: {
      nome: animal.nome,
      especie: animal.especie,
      porte: animal.porte,
      cidade: animal.cidade,
      uf: animal.uf,
      imagemUrl: animal.imagemUrl,
    },
    resumoAdotante: {
      nomeCompleto: adotante.nomeCompleto,
      idade,
      cidade: adotante.cidade,
      uf: adotante.uf,
      email: adotante.email,
    },
  };
}

module.exports = { avaliarSolicitacao, idadeEm, IDADE_MINIMA };
