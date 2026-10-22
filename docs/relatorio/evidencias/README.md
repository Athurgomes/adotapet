# Checklist de evidências (prints)

> **Responsável por reunir:** Pessoa 9. Qualquer integrante pode tirar os prints da própria parte e enviar.

## Regras

- Nome do arquivo: `EVxx-descricao-curta.png` (ex.: `EV05-catalogo.png`).
- **Nunca** mostrar senhas, connection strings (`mongodb+srv://...`) ou o conteúdo do `.env`. No Compass, esconda a barra com a string de conexão ou recorte o print.
- Usar só dados fictícios (RNF09). Antes dos prints finais, cadastrar dados de demonstração com nomes "bonitos" (sem o sufixo `(teste ...)`).
- Preferir prints da janela inteira do navegador, com a URL visível.
- Os resultados do script de testes (`tests/resultados/*.md`) que forem usados no relatório também vão para esta pasta.

## Lista

| ID | Evidência | Como obter | Seção do relatório | Caso | Feito |
|---|---|---|---|---|---|
| EV01 | Containers rodando | `docker compose ps` no terminal | 5 | CM01 | [ ] |
| EV02 | Página de status com os 3 serviços "no ar" e "conectado" | <http://localhost:5500> (antes do frontend final) | 5 | CM02 | [ ] |
| EV03 | Os 3 bancos no Atlas/Compass | Compass com `leitura_geral`, menu lateral | 5, 7 | CM03 | [ ] |
| EV04 | Resultado do script de testes com tudo PASSOU | `docker compose run --rm testes` no terminal | 11 | CT01–CT52 | [ ] |
| EV05 | Catálogo de animais | Página inicial do site | 9 | CF01 | [x] `EV05-catalogo.jpg` e `EV05a-pagina-inicial.jpg` |
| EV06 | Filtro por espécie | Catálogo filtrado | 9 | CF02 | [x] `EV06-filtro-especie.jpg` |
| EV07 | Cadastro de animal com mensagem de sucesso | Formulário de animais | 9 | CF03 | [ ] |
| EV08 | Detalhes do animal | Página/modal do animal | 9 | CF04 | [ ] |
| EV09 | Cadastro de adotante com questionário | Formulário de adotantes | 9 | CF05 | [x] `EV09-questionario.jpg` |
| EV10 | Solicitação de adoção registrada ("Pendente") | Tela de solicitação | 9, 11 | CF06 | [x] `EV10-solicitacao-pendente.jpg` |
| EV11 | Consulta de solicitações | Tela de consulta | 9, 11 | CF07 | [ ] |
| EV12 | Mensagem de erro de validação | Formulário vazio ou e-mail inválido | 11 | CF08 | [ ] |
| EV13 | Erro de idade mínima (422) | Solicitação com adotante de 20 anos | 11 | CF09 | [x] `EV13-idade-minima-422.jpg` |
| EV14 | Erro de animal indisponível (409) | Solicitação para animal indisponível | 11 | CF09 | [ ] |
| EV15 | Serviço parado: `docker compose stop animais` + `/health` de Adoções | Terminal + <http://localhost:3003/health> | 11.4 | CQ01 | [x] `EV15-health-animais-fora-do-ar.jpg` (só o `/health`) |
| EV16 | Serviço parado: mensagem 503 no site | Tela de solicitação | 11.4 | CF10 | [x] `EV16-site-servico-indisponivel-503.jpg` |
| EV17 | Site no celular (ou DevTools 375 px) | F12 → modo dispositivo | 6, 9 | CF11 | [x] `EV17-site-celular-375px.jpg` |
| EV18 | Aba Network mostrando as chamadas às 3 APIs | F12 → Network | 9, 11 | CF12 | [ ] |
| EV19 | Documento de animal no Compass (com `caracteristicas` e `vacinas`) | `animais_db.animais` | 7, 10 | CM03 | [ ] |
| EV20 | Dois animais com `caracteristicas` diferentes no Compass | `animais_db.animais` | 7, 10 | CT11 | [ ] |
| EV21 | Documento de solicitação com `resumoAnimal` e `resumoAdotante` | `adocoes_db.solicitacoes` | 7, 8.3 | CT40 | [ ] |
| EV22 | Dados mantidos após `docker compose restart` | Consulta antes e depois | 11 | CM05 | [ ] |
| EV23 | Protótipo do Figma | Pessoa 2 | 6 | — | [ ] |
| EV24 | Experimentos no MongoDB e no PostgreSQL | Pessoa 8 | 10 | — | [x] `docs/evidencias-mongodb/01–05` |
| EV25 | Tela de login do painel com mensagem de erro | <http://localhost:5500/admin/> com senha errada | 9 | CF14 | [x] `EV25-login-senha-incorreta.jpg` |
| EV26 | Painel: cadastro de animal com aviso de sucesso | Painel → Cadastro de animais | 9 | CF03 | [x] `EV26-painel-cadastro-animal.jpg` |
| EV27 | Painel: edição de animal e o animal editado após recarregar | Modal de edição + F5 | 9 | CF16 | [x] `EV27-painel-edicao-animal.jpg` |
| EV28 | Painel: lista de solicitações com detalhes do interessado | Painel → Adotantes | 9 | CF17 | [x] `EV28-painel-solicitacoes-ficha.jpg` |
| EV29 | Animal marcado como indisponível sumindo do catálogo | Painel + página inicial | 9 | CF07 | [x] `EV29-painel-animal-indisponivel.jpg` |

> Prints de **erros** (para o registro de erros, não para o relatório final) ficam em `erros/`. Prints de **funcionamento** ficam na raiz desta pasta.
