const { Kafka, Partitioners, logLevel } = require('kafkajs');
const Animal = require('./models/Animal');
const { bancoConectado } = require('./db');

// Publicação de eventos no Kafka.
//
// O serviço de Animais não é chamado por HTTP pelos outros microsserviços.
// Sempre que um animal é criado ou alterado, ele publica o estado atual no
// tópico "animais.eventos" (chave = id do animal). Quem precisar desses dados
// (hoje, o serviço de Adoções) consome o tópico e mantém a própria cópia.

const TOPICO = 'animais.eventos';
const TEMPO_ENTRE_TENTATIVAS_MS = 5000;

const kafka = new Kafka({
  clientId: 'animais',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  // As falhas de conexão já são registradas pelas mensagens "[kafka]" deste arquivo
  logLevel: logLevel.NOTHING,
});
const produtor = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });

let conectado = false;
produtor.on(produtor.events.DISCONNECT, () => {
  conectado = false;
});

// Só os campos que os outros serviços usam saem do serviço de Animais.
function paraEvento(animal) {
  const a = typeof animal.toObject === 'function' ? animal.toObject() : animal;
  return {
    id: String(a._id),
    nome: a.nome,
    especie: a.especie,
    porte: a.porte,
    cidade: a.cidade,
    uf: a.uf,
    imagemUrl: a.imagemUrl,
    disponivel: a.disponivel,
    atualizadoEm: a.atualizadoEm,
  };
}

function mensagem(animal) {
  const dados = paraEvento(animal);
  return {
    key: dados.id,
    value: JSON.stringify({
      tipo: 'AnimalSalvo',
      versao: 1,
      ocorridoEm: new Date().toISOString(),
      dados,
    }),
  };
}

// Publica o estado atual do animal. Uma falha no Kafka não derruba a requisição:
// o evento perdido é reenviado na sincronização feita a cada inicialização.
async function publicarAnimal(animal) {
  if (!conectado) {
    console.error(`[kafka] Animal ${animal._id} não publicado: Kafka desconectado.`);
    return false;
  }
  try {
    await produtor.send({ topic: TOPICO, messages: [mensagem(animal)] });
    return true;
  } catch (erro) {
    console.error(`[kafka] Falha ao publicar o animal ${animal._id}: ${erro.message}`);
    return false;
  }
}

// Republica todos os animais. Como o tópico é compactado (guarda o último
// evento de cada id), repetir isso é inofensivo e garante que registros
// antigos ou eventos perdidos cheguem aos consumidores.
async function sincronizarTodos() {
  while (!bancoConectado()) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  const animais = await Animal.find().lean();
  for (let i = 0; i < animais.length; i += 100) {
    await produtor.send({ topic: TOPICO, messages: animais.slice(i, i + 100).map(mensagem) });
  }
  console.log(`[kafka] Sincronização concluída: ${animais.length} animais publicados.`);
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

// Fecha a conexão com o Kafka ao parar o container (docker compose stop/restart).
async function desconectarKafka() {
  await produtor.disconnect().catch(() => {});
}

module.exports = { conectarKafka, desconectarKafka, kafkaConectado, publicarAnimal, paraEvento };
