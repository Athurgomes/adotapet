const { Kafka, Partitioners, logLevel } = require('kafkajs');
const AnimalReplica = require('./models/AnimalReplica');
const AdotanteReplica = require('./models/AdotanteReplica');
const { bancoConectado } = require('./db');
const { aplicarEvento } = require('./replicas');

// Comunicação do serviço de Adoções pelo Kafka.
//
// Consome:  animais.eventos e adotantes.eventos -> mantém as réplicas locais
//           (replica_animais e replica_adotantes, no adocoes_db).
// Publica:  adocoes.eventos -> SolicitacaoCriada e StatusAlterado, para que
//           outros serviços possam reagir no futuro sem chamar esta API.

const TOPICOS_CONSUMIDOS = ['animais.eventos', 'adotantes.eventos'];
const TOPICO_PUBLICADO = 'adocoes.eventos';
const TEMPO_ENTRE_TENTATIVAS_MS = 5000;

const kafka = new Kafka({
  clientId: 'adocoes',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  // As falhas de conexão já são registradas pelas mensagens "[kafka]" deste arquivo
  logLevel: logLevel.NOTHING,
});
const consumidor = kafka.consumer({ groupId: 'adocoes-replicas' });
const produtor = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });

const estado = { consumidor: false, produtor: false };
consumidor.on(consumidor.events.CRASH, () => {
  estado.consumidor = false;
});
consumidor.on(consumidor.events.GROUP_JOIN, () => {
  estado.consumidor = true;
});
produtor.on(produtor.events.DISCONNECT, () => {
  estado.produtor = false;
});

const modelos = { AnimalReplica, AdotanteReplica };

async function processarMensagem({ topic, message }) {
  let evento;
  try {
    evento = JSON.parse(message.value.toString());
  } catch {
    console.error(`[kafka] Mensagem inválida ignorada em ${topic} (offset ${message.offset}).`);
    return;
  }

  // Sem banco, lança o erro para o Kafka entregar a mesma mensagem de novo depois.
  if (!bancoConectado()) {
    throw new Error('Banco desconectado: a mensagem será reprocessada.');
  }
  await aplicarEvento(evento, modelos);
}

async function conectarKafka() {
  try {
    await produtor.connect();
    estado.produtor = true;
    await consumidor.connect();
    // fromBeginning: na primeira vez, lê todo o histórico (compactado) e monta as réplicas
    await consumidor.subscribe({ topics: TOPICOS_CONSUMIDOS, fromBeginning: true });
    await consumidor.run({ eachMessage: processarMensagem });
    console.log('[kafka] Conectado: consumindo animais.eventos e adotantes.eventos.');
  } catch (erro) {
    console.error(`[kafka] Falha ao conectar: ${erro.message}`);
    console.error(`[kafka] Nova tentativa em ${TEMPO_ENTRE_TENTATIVAS_MS / 1000}s...`);
    await Promise.allSettled([consumidor.disconnect(), produtor.disconnect()]);
    estado.produtor = false;
    estado.consumidor = false;
    setTimeout(conectarKafka, TEMPO_ENTRE_TENTATIVAS_MS);
  }
}

function kafkaConectado() {
  return estado.produtor && estado.consumidor;
}

// Publica um evento sobre uma solicitação. Uma falha no Kafka não desfaz a
// solicitação já gravada: o erro é registrado no log.
async function publicarSolicitacao(tipo, solicitacao) {
  if (!estado.produtor) {
    console.error(`[kafka] ${tipo} ${solicitacao._id} não publicado: Kafka desconectado.`);
    return false;
  }
  try {
    await produtor.send({
      topic: TOPICO_PUBLICADO,
      messages: [
        {
          key: String(solicitacao._id),
          value: JSON.stringify({
            tipo,
            versao: 1,
            ocorridoEm: new Date().toISOString(),
            dados: {
              id: String(solicitacao._id),
              animalId: solicitacao.animalId,
              adotanteId: solicitacao.adotanteId,
              status: solicitacao.status,
              atualizadoEm: solicitacao.atualizadoEm,
            },
          }),
        },
      ],
    });
    return true;
  } catch (erro) {
    console.error(`[kafka] Falha ao publicar ${tipo} ${solicitacao._id}: ${erro.message}`);
    return false;
  }
}

module.exports = { conectarKafka, kafkaConectado, publicarSolicitacao };
