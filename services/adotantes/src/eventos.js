const { Kafka, Partitioners, logLevel } = require('kafkajs');
const Adotante = require('./models/Adotante');
const { bancoConectado } = require('./db');

// Publicação de eventos no Kafka.
//
// O serviço de Adotantes não é chamado por HTTP pelos outros microsserviços.
// Sempre que um adotante é cadastrado, ele publica os dados no tópico
// "adotantes.eventos" (chave = id do adotante). Quem precisar desses dados
// (hoje, o serviço de Adoções) consome o tópico e mantém a própria cópia.

const TOPICO = 'adotantes.eventos';
const TEMPO_ENTRE_TENTATIVAS_MS = 5000;

const kafka = new Kafka({
  clientId: 'adotantes',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  // As falhas de conexão já são registradas pelas mensagens "[kafka]" deste arquivo
  logLevel: logLevel.NOTHING,
});
const produtor = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });

let conectado = false;
produtor.on(produtor.events.DISCONNECT, () => {
  conectado = false;
});

// Só os campos que os outros serviços usam saem do serviço de Adotantes.
// Questionário, endereço, telefone e profissão ficam aqui (dados pessoais).
// A idade não é enviada: quem consome calcula a partir da data de nascimento.
function paraEvento(adotante) {
  const a = typeof adotante.toObject === 'function' ? adotante.toObject() : adotante;
  return {
    id: String(a._id),
    nomeCompleto: a.nomeCompleto,
    dataNascimento: a.dataNascimento,
    cidade: a.cidade,
    uf: a.uf,
    email: a.email,
    atualizadoEm: a.atualizadoEm,
  };
}

function mensagem(adotante) {
  const dados = paraEvento(adotante);
  return {
    key: dados.id,
    value: JSON.stringify({
      tipo: 'AdotanteSalvo',
      versao: 1,
      ocorridoEm: new Date().toISOString(),
      dados,
    }),
  };
}

// Publica os dados do adotante. Uma falha no Kafka não derruba a requisição:
// o evento perdido é reenviado na sincronização feita a cada inicialização.
async function publicarAdotante(adotante) {
  if (!conectado) {
    console.error(`[kafka] Adotante ${adotante._id} não publicado: Kafka desconectado.`);
    return false;
  }
  try {
    await produtor.send({ topic: TOPICO, messages: [mensagem(adotante)] });
    return true;
  } catch (erro) {
    console.error(`[kafka] Falha ao publicar o adotante ${adotante._id}: ${erro.message}`);
    return false;
  }
}

// Republica todos os adotantes. Como o tópico é compactado (guarda o último
// evento de cada id), repetir isso é inofensivo e garante que registros
// antigos ou eventos perdidos cheguem aos consumidores.
async function sincronizarTodos() {
  while (!bancoConectado()) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  const adotantes = await Adotante.find().lean();
  for (let i = 0; i < adotantes.length; i += 100) {
    await produtor.send({ topic: TOPICO, messages: adotantes.slice(i, i + 100).map(mensagem) });
  }
  console.log(`[kafka] Sincronização concluída: ${adotantes.length} adotantes publicados.`);
}

// Conecta ao Kafka. Se falhar, tenta de novo a cada 5 segundos, sem derrubar o servidor.
async function conectarKafka() {
  try {
    await produtor.connect();
    conectado = true;
    console.log('[kafka] Produtor conectado.');
    await sincronizarTodos();
  } catch (erro) {
    console.error(`[kafka] Falha ao conectar: ${erro.message}`);
    console.error(`[kafka] Nova tentativa em ${TEMPO_ENTRE_TENTATIVAS_MS / 1000}s...`);
    setTimeout(conectarKafka, TEMPO_ENTRE_TENTATIVAS_MS);
  }
}

function kafkaConectado() {
  return conectado;
}

module.exports = { conectarKafka, kafkaConectado, publicarAdotante, paraEvento };
