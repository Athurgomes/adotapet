const mongoose = require('mongoose');

const ESPECIES = ['cachorro', 'gato', 'outro'];
const SEXOS = ['macho', 'femea'];
const PORTES = ['pequeno', 'medio', 'grande'];

// Vacina aplicada: { nome, data }. Sem _id próprio.
const vacinaSchema = new mongoose.Schema(
  {
    nome: { type: String, required: [true, "O nome da vacina é obrigatório."], trim: true },
    data: { type: Date },
  },
  { _id: false }
);

const animalSchema = new mongoose.Schema(
  {
    nome: { type: String, required: [true, "O campo 'nome' é obrigatório."], trim: true },
    especie: {
      type: String,
      required: [true, "O campo 'especie' é obrigatório."],
      trim: true,
      lowercase: true,
      enum: { values: ESPECIES, message: "O campo 'especie' deve ser: cachorro, gato ou outro." },
    },
    sexo: {
      type: String,
      required: [true, "O campo 'sexo' é obrigatório."],
      trim: true,
      lowercase: true,
      enum: { values: SEXOS, message: "O campo 'sexo' deve ser: macho ou femea." },
    },
    idade: {
      type: Number,
      required: [true, "O campo 'idade' é obrigatório."],
      min: [0, "O campo 'idade' não pode ser negativo."],
    },
    porte: {
      type: String,
      required: [true, "O campo 'porte' é obrigatório."],
      trim: true,
      lowercase: true,
      enum: { values: PORTES, message: "O campo 'porte' deve ser: pequeno, medio ou grande." },
    },
    // Campos livres: cada espécie pode ter características diferentes
    caracteristicas: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      validate: {
        validator: (valor) => valor === undefined || (valor !== null && typeof valor === 'object' && !Array.isArray(valor)),
        message: "O campo 'caracteristicas' deve ser um objeto.",
      },
    },
    vacinas: { type: [vacinaSchema], default: [] },
    cidade: { type: String, required: [true, "O campo 'cidade' é obrigatório."], trim: true },
    uf: {
      type: String,
      required: [true, "O campo 'uf' é obrigatório."],
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{2}$/, "O campo 'uf' deve ter 2 letras."],
    },
    imagemUrl: {
      type: String,
      required: [true, "O campo 'imagemUrl' é obrigatório."],
      trim: true,
      match: [/^https?:\/\/\S+$/i, "O campo 'imagemUrl' deve ser uma URL http(s) válida."],
    },
    disponivel: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
    versionKey: false,
    minimize: false, // mantém caracteristicas: {} em vez de descartar o objeto vazio
  }
);

const Animal = mongoose.model('Animal', animalSchema, 'animais');

Animal.ESPECIES = ESPECIES;
Animal.SEXOS = SEXOS;
Animal.PORTES = PORTES;

module.exports = Animal;
