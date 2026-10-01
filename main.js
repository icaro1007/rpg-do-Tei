let deckJ1 = []; let maoJ1 = [];
let deckJ2 = []; let maoJ2 = [];
let turnoAtivo = 1; 
let jogoIniciado = false;

// Passivas, Especiais, suportes e poções são ações livres: podem ser ativados
// por qualquer lado a qualquer momento. Quando uma dessas ações já encerrava o
// turno pelas regras antigas, só troca a vez se pertencer ao jogador da vez.
function obterLadoRealDaCarta(idUnico) {
    let pacote = idUnico ? document.getElementById("pacote-" + String(idUnico).replace("pacote-", "")) : null;
    if (pacote?.closest("#campo-j1, #mao-j1")) return "j1";
    if (pacote?.closest("#campo-j2, #mao-j2")) return "j2";
    return null;
}

// Cliques feitos pelo robô só podem concluir escolhas iniciadas por cartas do
// próprio robô. Cliques manuais continuam livres para os dois lados, inclusive
// fora do turno, como nas regras atuais da arena.
function cliquePodeResolverAcaoPendente(idDonoDaAcao) {
    if (window.__rpgCliqueAutomaticoBot !== true) return true;
    return obterLadoRealDaCarta(idDonoDaAcao) === "j2";
}

function ehVezDaCarta(idUnico) {
    let lado = obterLadoRealDaCarta(idUnico);
    return !!lado && jogoIniciado && turnoAtivo === (lado === "j1" ? 1 : 2);
}

function passarTurnoSeForVezDaCarta(idUnico) {
    if (!ehVezDaCarta(idUnico)) return false;
    passarTurno();
    return true;
}

function passarTurnoSeForVezDoLado(lado) {
    if (!jogoIniciado || turnoAtivo !== (lado === "j1" ? 1 : 2)) return false;
    passarTurno();
    return true;
}
let faseAbertura = false;      // 🆕 fase de jogada simultânea antes do 1º turno
let aberturaEscolhaJ1 = null;  // 🆕 id da carta que o jogador escolheu pra abertura
let aberturaEscolhaJ2 = null;  // 🆕 id da carta que o oponente escolheu pra abertura
let ultimaCartaOponente = null; 
let ultimaCartaJogador = null;  
let ctrlV = {}; 
let bonusUnidao = {}; // Guarda apenas a parcela variável que cada Unidão copiou dos aliados
let goblinJaAtacouNesteTurno = {}; // Registra se o Goblin já fez o primeiro ataque da rodada
let goblinAtaquesGanhos = {};      // Guarda quais Goblins específicos ganharam o ataque extra
let ultimoIdQueAtacou = null;      // Guarda o ID da última carta que desferiu um ataque
let viajantesJaUsaram = {};        // idUnico -> true: a Passiva do Viajante do Tempo é 1 vez só
let suportePreparado = null; // Guarda o nome da arma engatilhada
let idItemNaMao = null;      // Guarda o ID da carta na mão para destruí-la depois
let modoAtaque = false;      // 🩹 CORREÇÃO: faltava declarar (causava ReferenceError antes do 1º passarTurno)
let danoPreparado = 0;       // 🩹 CORREÇÃO: idem
let modoAtaqueInimigo = false; // 🩹 CORREÇÃO: idem
let danoInimigoPreparado = 0;  // 🩹 CORREÇÃO: idem
let modoRouboGoblin = false;
let idGoblinLadrao = null;
let faseRouboGoblin = 1; // 1 = escolhendo a carta inimiga pra roubar, 2 = escolhendo a carta aliada que recebe o dano
let bloqueioNecro = {}; // Guarda as cartas do Necromante e quantos turnos faltam para liberar
let pocaoVeluxAtiva = {}; // Guarda quais cartas beberam a Velux nesta rodada
let modoTraicao = false;
let idTraidor = null;
let escudoGuerreiro = {}; // Guarda quais Guerreiros estão com o escudo ativo
let modoAlvoBarril = false;
let modoAlvoBarrilInimigo = false;
let idBarrilAtivo = null;
let alvosDoBarril = {}; // Guarda { idDoBarril: idDoAlvo }
let barrilJaImpactou = {}; // Guarda { idDoBarril: true } se já deu o dano de impacto
let lancamentosBarrilGoblinEmCurso = {}; // segura os marcadores até o barril terminar de cair
let pulsosBarrilGoblinPendentes = {}; // lembra o primeiro ataque caso ele aconteça durante o voo
let modoEspecialBarrilGoblin = false; // 📦 Especial do Barril de Goblin acionado ANTES de atacar (escolhe alvo e já ataca+rola)
let modoAlvoBarrilBarbaro = false;
let modoAlvoBarrilBarbaroInimigo = false;
let splashBarbaroAtivo = {}; // objeto por ID (idUnico do Barril) — evita vazar o splash entre 2 Barris de Bárbaro em campo ao mesmo tempo
let barrilBarbaroEmAnimacao = false; // impede outra ação enquanto o Barril ainda está rolando até o alvo
let modoAlvoCavaleiro = false;        // Aguardando o jogador clicar no alvo principal do Cavaleiro das Trevas
let modoAlvoCavaleiroInimigo = false; // Idem, do lado do oponente/bot
let idCavaleiroAtivo = null;          // Guarda o idUnico do Cavaleiro que está atacando
var modoProtecaoBarril = false;
var modoProtecaoBarrilInimigo = false;
var idBarrilProtetor = null;
var cartasProtegidas = {}; // Guarda quem está sendo protegido por qual Barril

function podeVincularProtecaoBarril(idAlvo, idProtetor) {
    idAlvo = String(idAlvo).replace("pacote-", "");
    idProtetor = String(idProtetor).replace("pacote-", "");
    if (idAlvo === idProtetor) return false;

    let alvo = document.getElementById("pacote-" + idAlvo);
    let protetor = document.getElementById("pacote-" + idProtetor);
    let campoAlvo = alvo && alvo.closest("#campo-j1, #campo-j2");
    if (!campoAlvo || !protetor || protetor.closest("#campo-j1, #campo-j2") !== campoAlvo) return false;

    // Barris podem formar uma cadeia (A protege B, B protege C), mas nunca um
    // círculo: dois Barris protegendo um ao outro ficariam impossíveis de atacar.
    let atual = idProtetor;
    let visitados = new Set();
    while (atual && !visitados.has(atual)) {
        if (atual === idAlvo) return false;
        visitados.add(atual);
        atual = cartasProtegidas[atual] ? String(cartasProtegidas[atual]) : null;
    }
    return true;
}

function vincularProtecaoBarril(idAlvo, idProtetor) {
    if (!podeVincularProtecaoBarril(idAlvo, idProtetor)) {
        narrar("❌ Escolha outra carta aliada. Um Barril não pode proteger a si mesmo nem formar um círculo de proteção.");
        return false;
    }
    idAlvo = String(idAlvo).replace("pacote-", "");
    idProtetor = String(idProtetor).replace("pacote-", "");
    cartasProtegidas[idAlvo] = idProtetor;
    ativarVisualProtecaoBarril(idAlvo, idProtetor);
    narrar("🛡️ Vínculo criado! O Barril agora protege esta carta, mesmo que ela também seja um Barril.");
    return true;
}
let modoBruxoTransformar = false;
let modoBruxoRoubar = false;
let idBruxoAtivo = null;
let modoGeloSimples = false;
let idPocaoAtiva = null; 
let duracaoGelo = {}; // Guarda quem está congelado e por quantas passagens de turno
let passagemAutomaticaGeloPendente = null; // evita um passe atrasado trocar dois turnos de uma vez
let alvosDoBumerangue = {}; // Guarda a lista de quem o bumerangue bateu: { idBume: ['alvo1', 'alvo2'] }
let trajetosVisuaisBumerangue = {}; // pontos percorridos na ida, reutilizados quando o especial manda o bumerangue voltar
let geloBumerskeletonAtivos = {}; // mantém os fragmentos ligados somente ao gelo causado pelo Bumerskeleton
let timersFogoBumerskeleton = {}; // permite renovar o fogo visual sem um temporizador antigo apagá-lo cedo
let modoEspecialBumerskeleton = false; // 🪃 Especial do Bumerskeleton acionado ANTES de atacar
let idBumerskeletonEspecialAtivo = null;
let especialFixoBumerskeleton = {}; // idUnico -> 3 (fogo) ou 5 (gelo), definido no primeiro sucesso
let recargaGeloBumerskeleton = {}; // idUnico -> 0/1: gelo fixo congela em ataques alternados
let especialFixoSeparado = {}; // idUnico -> true: a dupla ataca separada permanentemente depois do primeiro 6
let bonusVampi7Sozinho = {}; // idUnico -> true enquanto o +1 de dano por ser a última carta estiver ativo
let tabelaDanoBumerangue = [1, 2, 4, 4, 4, 4, 4, 4, 4, 4]; // Escala pela ORDEM do golpe na cadeia: 1º alvo leva 1, 2º leva 2, do 3º em diante 4 cada (teto pra não ficar forte demais)
let cartasCongeladas = {}; // Registra quais cartas estão sob o efeito de gelo do bumerangue
let cavalosDeTroiaAtivos = {}; // idUnico -> passagens de turno restantes até explodir (2 rodadas = 4 passagens, 1 rodada = vez de cada jogador)
let incendiarioCiclo = {}; // idUnico -> fase atual (1=joga pólvora, 2 e 3=queima 1 dano cada, 4=parado, depois volta pra 1)
let incendiarioAlvos = {}; // idUnico -> lista de IDs das cartas inimigas que receberam a pólvora nesse ciclo
let incendiarioFasesVisuais = {}; // acompanha a fase já aplicada para manter pólvora/fogo visíveis mesmo entre turnos
let modoTransformacaoIcaro = false; // aguardando clique na carta que vai virar outra
let idIcaroAtivo = null;
let modoAjusteThiago = false; // aguardando clique na carta que vai ter um atributo ajustado em ±1
let idThiagoAtivo = null;
let fogueiraTicks = { j1: [], j2: [] }; // cada Fogueira ativa guarda sua duração e seu efeito visual
let proximoIdVisualFogueira = 1;
let parceriaSeparado = {}; // idSeparado -> idParceiro; pode formar correntes sem ciclos
let modoParceriaSeparado = false; // aguardando clique na carta aliada que vai virar parceira
let idSeparadoParceriaAtivo = null;
let separadaoDividido = {}; // idSeparado -> quantos ataques da dupla ainda faltam (habilidade dado 6)
let separadaoAtacantesNaSequencia = {}; // idSeparado -> IDs que já atacaram; permite começar por qualquer integrante
let ignorarInterceptacaoSeparadoUmaVez = false; // o botão manual pode encerrar a vez sem contar uma seleção incompleta como ataque
let modoPrenderNoTempo = false; // aguardando clique na carta inimiga que vai ficar presa no tempo
let idPrenderNoTempoAtivo = null;
let portableDuracao = {}; // idUnico -> passagens de turno restantes até a bateria acabar (2 rodadas = 4 passagens)
let ladraoUsosPorCarta = {}; // idUnico -> true; cada Ladrão possui sua própria tentativa por turno
let cemiterio = { j1: [], j2: [] }; // guarda as cartas mortas de cada lado, prontas pra Reviverta trazer de volta
let revivertaPendente = null; // { idItem, ehAliado } enquanto o cemitério está aberto aguardando escolha
let crackerPendente = null; // { idItem, ehAliado } enquanto a tela de roubo do Cracker está aberta aguardando escolha
let buffsAllsforms = {}; // idUnico -> array de { bonus, restam } — restam em passagens de turno (1 rodada = 2 passagens)
let dupliquetionPendente = null; // { idItem, ehAliado } enquanto a tela de escolha da Dupliquetion está aberta
let modoAlvoVenenoMago = false; // aguardando o Mago escolher uma carta do lado oposto
let idMagoVenenoAtivo = null;
let venenosMago = {}; // idEfeito -> { idMago, idAlvo, restam }; um mesmo Mago pode manter vários alvos
let proximoIdVenenoMago = 1;
// Quantidade real de integrantes que ainda vivem em cada Trio. O valor só pode
// diminuir: recuperar vida cura os sobreviventes, mas não ressuscita um integrante.
let unidadesVivasTrios = {};
// Espelho leve dos atributos que estão realmente visíveis nas cartas. Ele não
// substitui os números do jogo: apenas permite detectar qualquer mudança de
// vida/dano e atualizar imediatamente as passivas que dependem desses valores.
let atributosAoVivo = new Map();
let sincronizacaoAtributosAgendada = false;
// Guarda apenas a diferença causada por buffs externos. O valor natural do
// Cavaleiro muda ao vivo entre 2, 3 e 5 sem apagar Besta/Auvex/Allsforms.
let danoCavaleirosAoVivo = new Map();
// 👻 ECTO — a identidade atingida perde suas habilidades permanentemente.
// Vida, dano, buffs externos e o ataque comum continuam funcionando normalmente.
let cartasSilenciadasEcto = {};

function configuracaoDoTrio(nomeCarta) {
    if (nomeCarta === "Trio de Goblin") {
        return {
            vidaPorUnidade: 2,
            maximo: 3,
            // O trio completo causa 2; com dois ou um Goblin, causa 1.
            danoPorQuantidade: { 3: 2, 2: 1, 1: 1, 0: 0 }
        };
    }
    if (nomeCarta === "Trio de Bárbaros") {
        return {
            vidaPorUnidade: 3,
            maximo: 3,
            danoPorQuantidade: { 3: 3, 2: 2, 1: 1, 0: 0 }
        };
    }
    return null;
}

function quantidadeUnidadesDoTrio(vida, configuracao) {
    if (!Number.isFinite(vida) || vida <= 0) return 0;
    return Math.max(1, Math.min(configuracao.maximo, Math.ceil(vida / configuracao.vidaPorUnidade)));
}

// Diminui o atributo de dano no mesmo instante em que um integrante morre.
// Só retiramos a parcela natural do Trio; bônus de Besta, Auvex, Curandeiro,
// Allsforms e outros efeitos continuam preservados.
function sincronizarDanoDoTrio(idUnico, vidaAntes, vidaDepois) {
    let pacote = document.getElementById("pacote-" + idUnico);
    if (!pacote) return;

    let nomeEl = pacote.querySelector(".nome-carta");
    if (!nomeEl) return;
    let nomeCarta = obterNomeEfetivoCarta(idUnico, nomeEl.innerText.trim());
    let configuracao = configuracaoDoTrio(nomeCarta);
    if (!configuracao) return;

    let quantidadeAnterior = unidadesVivasTrios[idUnico];
    if (!Number.isFinite(quantidadeAnterior)) {
        quantidadeAnterior = quantidadeUnidadesDoTrio(vidaAntes, configuracao);
    }

    // Cura nunca aumenta a quantidade: apenas dano capaz de atravessar o limite
    // de vida de um integrante faz a contagem baixar.
    let quantidadePelaVida = quantidadeUnidadesDoTrio(vidaDepois, configuracao);
    let quantidadeAtual = Math.min(quantidadeAnterior, quantidadePelaVida);
    unidadesVivasTrios[idUnico] = quantidadeAtual;

    let danoNaturalAnterior = configuracao.danoPorQuantidade[quantidadeAnterior] || 0;
    let danoNaturalAtual = configuracao.danoPorQuantidade[quantidadeAtual] || 0;
    let reducao = Math.max(0, danoNaturalAnterior - danoNaturalAtual);
    if (reducao <= 0) return;

    let danoEl = document.getElementById("dano-" + idUnico);
    if (!danoEl) return;
    let danoAntes = parseFloat(danoEl.innerText) || 0;
    danoEl.innerText = Math.max(0, danoAntes - reducao);
    if (typeof mostrarEfeitoPerdaAtaque === "function") mostrarEfeitoPerdaAtaque(idUnico);
}

function sincronizarAtributosAoVivo() {
    let idsPresentes = new Set();
    let houveMudanca = false;

    document.querySelectorAll("div[id^='pacote-']").forEach(pacote => {
        let idUnico = pacote.id.replace("pacote-", "");
        let vidaEl = document.getElementById("vida-" + idUnico);
        let danoEl = document.getElementById("dano-" + idUnico);
        if (!vidaEl || !danoEl) return;

        idsPresentes.add(idUnico);
        let vida = parseFloat(vidaEl.innerText);
        let dano = parseFloat(danoEl.innerText);
        vida = Number.isFinite(vida) ? Math.max(0, vida) : 0;
        dano = Number.isFinite(dano) ? Math.max(0, dano) : 0;

        // Segurança global: nenhum caminho alternativo pode deixar um atributo
        // inválido ou negativo aparecendo até a próxima atualização da partida.
        if (parseFloat(vidaEl.innerText) !== vida) vidaEl.innerText = vida;
        if (parseFloat(danoEl.innerText) !== dano) danoEl.innerText = dano;

        let anterior = atributosAoVivo.get(idUnico);
        if (!anterior || anterior.vida !== vida || anterior.dano !== dano) {
            houveMudanca = true;
            if (anterior && anterior.vida !== vida) {
                sincronizarDanoDoTrio(idUnico, anterior.vida, vida);
                dano = parseFloat(danoEl.innerText);
                dano = Number.isFinite(dano) ? Math.max(0, dano) : 0;
            }

            pacote.dataset.vidaAtual = String(vida);
            pacote.dataset.danoAtual = String(dano);
            let status = pacote.querySelector(".status-container");
            if (status) status.setAttribute("aria-label", `${vida} de vida e ${dano} de ataque`);
            atributosAoVivo.set(idUnico, { vida, dano });
        }
    });

    Array.from(atributosAoVivo.keys()).forEach(idUnico => {
        if (!idsPresentes.has(idUnico)) {
            atributosAoVivo.delete(idUnico);
            houveMudanca = true;
        }
    });

    if (houveMudanca) {
        // Unidão e os estados visuais que dependem de atributos passam a reagir
        // no mesmo instante, inclusive a buffs, curas e danos fora do ataque comum.
        if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
        if (typeof sincronizarVisuaisVampi7 === "function") sincronizarVisuaisVampi7();
    }

    // Também precisa rodar quando uma carta apenas muda de mão para campo: nesse
    // caso os atributos não mudaram, mas a quantidade de alvos do Cavaleiro sim.
    if (typeof sincronizarDanoCavaleirosAoVivo === "function") {
        sincronizarDanoCavaleirosAoVivo();
    }
}

function agendarSincronizacaoAtributosAoVivo() {
    if (sincronizacaoAtributosAgendada) return;
    sincronizacaoAtributosAgendada = true;
    requestAnimationFrame(() => {
        sincronizacaoAtributosAgendada = false;
        sincronizarAtributosAoVivo();
    });
}

// 🚨 NOVIDADE: A lista de suportes/poções agora fica no topo do código!
let suportesReais = [
    "besta", "recuperida", "velux", "pocaotraicao", 
    "adiv", "pocaogelo", "escudo_item", "cavalotroia", "fogueira", "vampi7", "portable", "plus_life", "reviverta", "cracker", "allsforms", "dupliquetion", "auvex",
];

function ativarEfeitoVelocidade(idUnico) {
    let carta = document.getElementById("pacote-" + idUnico);
    if (!carta) return;

    carta.classList.add("com-velocidade-extra");

    let efeito = carta.querySelector(":scope > .efeito-velocidade-extra");
    if (!efeito) {
        efeito = document.createElement("span");
        efeito.className = "efeito-velocidade-extra";
        efeito.setAttribute("aria-hidden", "true");

        for (let i = 0; i < 6; i++) {
            let rastro = document.createElement("i");
            rastro.className = "rastro-velocidade rastro-velocidade-" + (i + 1);
            efeito.appendChild(rastro);
        }

        carta.appendChild(efeito);
    }

    // Reinicia o clarão sempre que a carta recebe uma nova carga de velocidade.
    efeito.classList.remove("velocidade-acabou-de-ativar");
    void efeito.offsetWidth;
    efeito.classList.add("velocidade-acabou-de-ativar");
}

function removerEfeitoVelocidade(idUnico) {
    let carta = document.getElementById("pacote-" + idUnico);
    if (!carta) return;

    carta.classList.remove("com-velocidade-extra");
    let efeito = carta.querySelector(":scope > .efeito-velocidade-extra");
    if (efeito) efeito.remove();
}

let origensTransformacaoOrk = {};

function guardarOrigemTransformacaoOrk(nomeCarta, idUnico, pacoteCarta) {
    if (typeof window.rpgPrepararAnimacaoDivisaoSlime === "function") {
        window.rpgPrepararAnimacaoDivisaoSlime(idUnico);
    }
    if (typeof window.rpgPrepararAlmaSpiritista === "function" && pacoteCarta) {
        window.rpgPrepararAlmaSpiritista(idUnico, pacoteCarta);
    }
    if (nomeCarta !== "Ork" || !pacoteCarta) return;

    let retangulo = pacoteCarta.getBoundingClientRect();
    let imagem = pacoteCarta.querySelector("img");
    origensTransformacaoOrk[idUnico] = {
        left: retangulo.left,
        top: retangulo.top,
        width: retangulo.width,
        height: retangulo.height,
        imagem: imagem ? imagem.src : caminhoImagemRpg("ork.png")
    };
}

function animarTransformacaoOrk(idUnico, goblinsInvocados) {
    let origem = origensTransformacaoOrk[idUnico];
    delete origensTransformacaoOrk[idUnico];
    if (!origem) return;

    let centroX = origem.left + origem.width / 2;
    let centroY = origem.top + origem.height / 2;
    let fantasma = document.createElement("span");
    fantasma.className = "transformacao-ork-origem";
    fantasma.setAttribute("aria-hidden", "true");
    fantasma.style.left = origem.left + "px";
    fantasma.style.top = origem.top + "px";
    fantasma.style.width = origem.width + "px";
    fantasma.style.height = origem.height + "px";

    let imagemOrk = document.createElement("img");
    imagemOrk.className = "imagem-ork-transformando";
    imagemOrk.src = origem.imagem;
    imagemOrk.alt = "";
    fantasma.appendChild(imagemOrk);

    for (let i = 0; i < 8; i++) {
        let particula = document.createElement("i");
        particula.className = "particula-transformacao-ork";
        particula.style.setProperty("--ork-particula-x", ((i % 4) * 24 - 36) + "px");
        particula.style.setProperty("--ork-particula-y", (i < 4 ? -42 - i * 5 : 34 + (i - 4) * 5) + "px");
        particula.style.animationDelay = (i * 0.035) + "s";
        fantasma.appendChild(particula);
    }

    document.body.appendChild(fantasma);

    goblinsInvocados.forEach((goblin, indice) => {
        if (!goblin) return;
        let destino = goblin.getBoundingClientRect();
        let destinoX = destino.left + destino.width / 2;
        let destinoY = destino.top + destino.height / 2;
        goblin.style.setProperty("--ork-origem-x", (centroX - destinoX) + "px");
        goblin.style.setProperty("--ork-origem-y", (centroY - destinoY) + "px");
        goblin.style.setProperty("--ork-atraso", (0.12 + indice * 0.1) + "s");
        goblin.classList.add("goblin-nascido-do-ork");

        setTimeout(() => {
            goblin.classList.remove("goblin-nascido-do-ork");
            goblin.style.removeProperty("--ork-origem-x");
            goblin.style.removeProperty("--ork-origem-y");
            goblin.style.removeProperty("--ork-atraso");
        }, 1450);
    });

    setTimeout(() => {
        if (fantasma.parentNode) fantasma.remove();
    }, 1150);
}

function criarFantasmaAlvoBruxo(pacoteAlvo, tipo) {
    if (!pacoteAlvo) return null;

    let retangulo = pacoteAlvo.getBoundingClientRect();
    let fantasma = pacoteAlvo.cloneNode(true);
    fantasma.removeAttribute("id");
    fantasma.querySelectorAll("[id]").forEach(elemento => elemento.removeAttribute("id"));
    fantasma.querySelectorAll("button").forEach(botao => botao.remove());
    fantasma.querySelectorAll("[onclick]").forEach(elemento => elemento.removeAttribute("onclick"));
    fantasma.classList.add("fantasma-alvo-bruxo", tipo === "roubar" ? "alvo-roubado-bruxo" : "alvo-transmutado-bruxo");
    fantasma.style.left = retangulo.left + "px";
    fantasma.style.top = retangulo.top + "px";
    fantasma.style.width = retangulo.width + "px";
    fantasma.style.height = retangulo.height + "px";
    document.body.appendChild(fantasma);

    setTimeout(() => {
        if (fantasma.parentNode) fantasma.remove();
    }, 1250);

    return {
        left: retangulo.left,
        top: retangulo.top,
        width: retangulo.width,
        height: retangulo.height
    };
}

function animarPocaoBruxo(idBruxo, idAlvo, tipo) {
    let bruxo = document.getElementById("pacote-" + idBruxo);
    let alvo = document.getElementById("pacote-" + idAlvo);
    if (!bruxo || !alvo) return null;

    let retanguloBruxo = bruxo.getBoundingClientRect();
    let retanguloAlvo = alvo.getBoundingClientRect();
    let inicioX = retanguloBruxo.left + retanguloBruxo.width / 2;
    let inicioY = retanguloBruxo.top + retanguloBruxo.height / 2;
    let distanciaX = (retanguloAlvo.left + retanguloAlvo.width / 2) - inicioX;
    let distanciaY = (retanguloAlvo.top + retanguloAlvo.height / 2) - inicioY;
    let origemAlvo = criarFantasmaAlvoBruxo(alvo, tipo);

    let frasco = document.createElement("span");
    frasco.className = "pocao-lancada-bruxo " + (tipo === "roubar" ? "pocao-dominacao-bruxo" : "pocao-polimorfia-bruxo");
    frasco.textContent = "🧪";
    frasco.dataset.simbolo = tipo === "roubar" ? "✦" : "↻";
    frasco.setAttribute("aria-hidden", "true");
    frasco.style.left = inicioX + "px";
    frasco.style.top = inicioY + "px";
    frasco.style.setProperty("--bruxo-pocao-x", distanciaX + "px");
    frasco.style.setProperty("--bruxo-pocao-y", distanciaY + "px");
    frasco.style.setProperty("--bruxo-pocao-meio-x", (distanciaX / 2) + "px");
    frasco.style.setProperty("--bruxo-pocao-meio-y", (distanciaY / 2 - 48) + "px");
    document.body.appendChild(frasco);

    setTimeout(() => {
        if (frasco.parentNode) frasco.remove();
    }, 1150);

    return origemAlvo;
}

function animarBruxoVirandoPocao(idBruxo) {
    let bruxo = document.getElementById("pacote-" + idBruxo);
    if (!bruxo) return;

    let retangulo = bruxo.getBoundingClientRect();
    let imagemOriginal = bruxo.querySelector("img");
    let efeito = document.createElement("span");
    efeito.className = "bruxo-virando-pocao";
    efeito.setAttribute("aria-hidden", "true");
    efeito.style.left = retangulo.left + "px";
    efeito.style.top = retangulo.top + "px";
    efeito.style.width = retangulo.width + "px";
    efeito.style.height = retangulo.height + "px";

    let imagem = document.createElement("img");
    imagem.className = "imagem-bruxo-encolhendo";
    imagem.src = imagemOriginal ? imagemOriginal.src : caminhoImagemRpg("bruxo.png");
    imagem.alt = "";
    efeito.appendChild(imagem);

    let pocao = document.createElement("b");
    pocao.className = "pocao-nascendo-do-bruxo";
    pocao.textContent = "🧪";
    efeito.appendChild(pocao);

    for (let i = 0; i < 6; i++) {
        let faisca = document.createElement("i");
        faisca.className = "faisca-transformacao-bruxo";
        faisca.style.setProperty("--bruxo-faisca-x", ((i % 3) * 34 - 34) + "px");
        faisca.style.setProperty("--bruxo-faisca-y", (i < 3 ? -42 - i * 6 : 35 + (i - 3) * 7) + "px");
        efeito.appendChild(faisca);
    }

    document.body.appendChild(efeito);
    setTimeout(() => {
        if (efeito.parentNode) efeito.remove();
    }, 1250);
}

function animarCartaRoubadaBruxo(cartaRoubada, origem) {
    if (!cartaRoubada || !origem) return;

    let destino = cartaRoubada.getBoundingClientRect();
    let origemX = origem.left + origem.width / 2;
    let origemY = origem.top + origem.height / 2;
    let destinoX = destino.left + destino.width / 2;
    let destinoY = destino.top + destino.height / 2;
    cartaRoubada.style.setProperty("--bruxo-roubo-x", (origemX - destinoX) + "px");
    cartaRoubada.style.setProperty("--bruxo-roubo-y", (origemY - destinoY) + "px");
    cartaRoubada.classList.add("carta-roubada-pelo-bruxo");

    setTimeout(() => {
        cartaRoubada.classList.remove("carta-roubada-pelo-bruxo");
        cartaRoubada.style.removeProperty("--bruxo-roubo-x");
        cartaRoubada.style.removeProperty("--bruxo-roubo-y");
    }, 1450);
}

function criarResiduoPolvoraIncendiario(pacote) {
    if (!pacote || pacote.querySelector(".residuo-polvora-incendiario")) return;

    let residuo = document.createElement("span");
    residuo.className = "residuo-polvora-incendiario";
    residuo.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 8; i++) {
        let grao = document.createElement("i");
        grao.style.setProperty("--grao-x", (10 + ((i * 31) % 82)) + "%");
        grao.style.setProperty("--grao-y", (13 + ((i * 47) % 72)) + "%");
        grao.style.setProperty("--grao-tamanho", (2 + (i % 3)) + "px");
        residuo.appendChild(grao);
    }
    pacote.appendChild(residuo);
}

function criarChamasIncendiario(pacote) {
    if (!pacote || pacote.querySelector(".chamas-carta-incendiario")) return;

    let chamas = document.createElement("span");
    chamas.className = "chamas-carta-incendiario";
    chamas.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 4; i++) {
        let chama = document.createElement("b");
        chama.textContent = "🔥";
        chama.style.setProperty("--chama-x", (9 + i * 27) + "%");
        chama.style.setProperty("--chama-atraso", (i * -0.16) + "s");
        chamas.appendChild(chama);
    }
    pacote.appendChild(chamas);
}

function definirVisualIncendiario(pacote, estado) {
    if (!pacote) return;

    if (estado === "fogo") {
        if (pacote.classList.contains("com-polvora-incendiario")) pacote.classList.remove("com-polvora-incendiario");
        if (!pacote.classList.contains("em-chamas-incendiario")) pacote.classList.add("em-chamas-incendiario");
        let residuo = pacote.querySelector(".residuo-polvora-incendiario");
        if (residuo) residuo.remove();
        criarChamasIncendiario(pacote);
        return;
    }

    if (estado === "polvora") {
        if (pacote.classList.contains("em-chamas-incendiario")) pacote.classList.remove("em-chamas-incendiario");
        if (!pacote.classList.contains("com-polvora-incendiario")) pacote.classList.add("com-polvora-incendiario");
        let chamas = pacote.querySelector(".chamas-carta-incendiario");
        if (chamas) chamas.remove();
        criarResiduoPolvoraIncendiario(pacote);
        return;
    }

    if (pacote.classList.contains("com-polvora-incendiario") || pacote.classList.contains("em-chamas-incendiario") || pacote.classList.contains("fogo-pulsando-incendiario")) {
        pacote.classList.remove("com-polvora-incendiario", "em-chamas-incendiario", "fogo-pulsando-incendiario");
    }
    let residuo = pacote.querySelector(".residuo-polvora-incendiario");
    let chamas = pacote.querySelector(".chamas-carta-incendiario");
    if (residuo) residuo.remove();
    if (chamas) chamas.remove();
}

function sincronizarVisuaisIncendiario() {
    let estadosPorAlvo = {};

    Object.keys(incendiarioAlvos).forEach(idIncendiario => {
        let fase = incendiarioFasesVisuais[idIncendiario];
        if (fase === undefined) fase = incendiarioCiclo[idIncendiario];
        let estado = fase === 1 ? "polvora" : ((fase === 2 || fase === 3) ? "fogo" : null);
        if (!estado) return;

        (incendiarioAlvos[idIncendiario] || []).forEach(idPacoteAlvo => {
            if (estado === "fogo" || !estadosPorAlvo[idPacoteAlvo]) estadosPorAlvo[idPacoteAlvo] = estado;
        });
    });

    document.querySelectorAll("#campo-j1 > div[id^='pacote-'], #campo-j2 > div[id^='pacote-']").forEach(pacote => {
        definirVisualIncendiario(pacote, estadosPorAlvo[pacote.id] || null);
    });
}

function animarSalpicoPolvoraIncendiario(idIncendiario, idsPacotesAlvo) {
    let incendiario = document.getElementById("pacote-" + idIncendiario);
    if (!incendiario) return;

    let origem = incendiario.getBoundingClientRect();
    let origemX = origem.left + origem.width / 2;
    let origemY = origem.top + origem.height * 0.42;

    (idsPacotesAlvo || []).forEach((idPacoteAlvo, indiceAlvo) => {
        let alvo = document.getElementById(idPacoteAlvo);
        if (!alvo) return;
        let destino = alvo.getBoundingClientRect();
        let destinoX = destino.left + destino.width / 2;
        let destinoY = destino.top + destino.height * 0.45;

        for (let i = 0; i < 6; i++) {
            let particula = document.createElement("i");
            particula.className = "particula-polvora-incendiario";
            particula.setAttribute("aria-hidden", "true");
            particula.style.left = origemX + "px";
            particula.style.top = origemY + "px";
            particula.style.setProperty("--polvora-x", (destinoX - origemX + ((i % 3) - 1) * 18) + "px");
            particula.style.setProperty("--polvora-y", (destinoY - origemY + (i < 3 ? -13 : 14)) + "px");
            particula.style.setProperty("--polvora-meio-x", ((destinoX - origemX) / 2) + "px");
            particula.style.setProperty("--polvora-meio-y", ((destinoY - origemY) / 2 - 38 - (i % 2) * 12) + "px");
            particula.style.setProperty("--polvora-atraso", (indiceAlvo * 0.07 + i * 0.035) + "s");
            document.body.appendChild(particula);
            setTimeout(() => {
                if (particula.parentNode) particula.remove();
            }, 1350);
        }
    });
}

function animarFogoIncendiario(idPacoteAlvo, primeiroAcendimento) {
    let pacote = document.getElementById(idPacoteAlvo);
    if (!pacote) return;

    pacote.classList.remove("fogo-pulsando-incendiario");
    void pacote.offsetWidth;
    pacote.classList.add("fogo-pulsando-incendiario");
    setTimeout(() => {
        if (pacote.isConnected) pacote.classList.remove("fogo-pulsando-incendiario");
    }, 850);

    let impacto = document.createElement("span");
    impacto.className = "inicio-fogo-incendiario" + (primeiroAcendimento ? " primeira-chama-incendiario" : " chama-continuando-incendiario");
    impacto.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 7; i++) {
        let faisca = document.createElement("i");
        faisca.style.setProperty("--faisca-x", (((i % 4) - 1.5) * 24) + "px");
        faisca.style.setProperty("--faisca-y", (-28 - (i % 3) * 18) + "px");
        faisca.style.setProperty("--faisca-atraso", (i * 0.035) + "s");
        impacto.appendChild(faisca);
    }
    pacote.appendChild(impacto);
    setTimeout(() => {
        if (impacto.parentNode) impacto.remove();
    }, 1050);
}

function obterCentroVisual(elemento) {
    if (!elemento) return null;
    let retangulo = elemento.getBoundingClientRect();
    return {
        x: retangulo.left + retangulo.width / 2,
        y: retangulo.top + retangulo.height * 0.42
    };
}

// 📦 BARRIL DE GOBLINS — o visual usa a própria vida do Barril. Como cada Goblin vale
// 1 de vida e 0,25 de dano periódico, as três bolinhas sempre mostram quantos ainda vivem.
function localizarStatusDentroDaCarta(pacote, idStatus) {
    if (!pacote) return null;
    return Array.from(pacote.querySelectorAll("[id]"))
        .find(elemento => elemento.id === idStatus) || null;
}

function quantidadeGoblinsVivosBarril(idBarril) {
    let pacoteBarril = document.getElementById("pacote-" + idBarril);
    let vida = localizarStatusDentroDaCarta(pacoteBarril, "vida-" + idBarril);
    if (!vida) return 0;

    let valor = parseFloat(vida.innerText);
    if (!Number.isFinite(valor) || valor <= 0) return 0;
    return Math.max(0, Math.min(3, Math.ceil(valor)));
}

// Aplica SOMENTE o ataque periódico dos Goblins. A leitura da vida fica presa ao pacote
// correto, evitando que IDs repetidos, animações ou outro vínculo atinjam uma carta errada.
// O 0,75 mostrado no Barril já é o dano dos três Goblins (3 x 0,25), portanto só a parcela
// acima/abaixo de 0,75 é tratada como buff ou redução — ela não pode ser somada duas vezes.
function aplicarDanoPeriodicoBarrilGoblin(idBarril, idAlvo) {
    let pacoteBarril = document.getElementById("pacote-" + idBarril);
    let pacoteAlvo = document.getElementById("pacote-" + idAlvo);

    if (!pacoteBarril || !pacoteAlvo) {
        removerMarcadorBarrilGoblin(idBarril);
        delete alvosDoBarril[idBarril];
        return null;
    }

    let vidaBarrilEl = localizarStatusDentroDaCarta(pacoteBarril, "vida-" + idBarril);
    let danoBarrilEl = localizarStatusDentroDaCarta(pacoteBarril, "dano-" + idBarril);
    let vidaAlvoEl = localizarStatusDentroDaCarta(pacoteAlvo, "vida-" + idAlvo);
    if (!vidaBarrilEl || !vidaAlvoEl) return null;

    let vidaBarril = parseFloat(vidaBarrilEl.innerText);
    let vidaAlvoAntes = parseFloat(vidaAlvoEl.innerText);
    let danoAtualBarril = danoBarrilEl ? parseFloat(danoBarrilEl.innerText) : 0.75;
    if (!Number.isFinite(vidaBarril) || !Number.isFinite(vidaAlvoAntes) || !Number.isFinite(danoAtualBarril)) return null;

    let goblinsVivos = Math.max(0, Math.min(3, Math.ceil(vidaBarril)));
    let modificadorDeDano = danoAtualBarril - 0.75;
    let danoTotal = Math.max(0, Math.round(((goblinsVivos * 0.25) + modificadorDeDano) * 100) / 100);
    let novaVida = Math.max(0, Math.round((vidaAlvoAntes - danoTotal) * 100) / 100);
    let nomeExibido = pacoteAlvo.querySelector(".nome-carta") ? pacoteAlvo.querySelector(".nome-carta").innerText.trim() : "Carta";

    if (danoTotal > 0) pulsarMarcadoresBarrilGoblin(idBarril);
    vidaAlvoEl.innerText = novaVida;
    sincronizarDanoDoTrio(idAlvo, vidaAlvoAntes, novaVida);

    // Esta é a única condição em que o ataque dos Goblins pode remover o alvo.
    if (novaVida <= 0) {
        let nomeEfetivo = obterNomeEfetivoCarta(idAlvo, nomeExibido);
        let campoDestino = pacoteAlvo.closest("#campo-j2") ? "campo-j2" : "campo-j1";
        registrarMorte(nomeEfetivo, campoDestino === "campo-j2" ? "j2" : "j1");
        guardarOrigemTransformacaoOrk(nomeEfetivo, idAlvo, pacoteAlvo);
        pacoteAlvo.remove();
        removerMarcadorBarrilGoblin(idBarril);
        delete alvosDoBarril[idBarril];
        ativarPassivasAoMorrer(nomeEfetivo, idAlvo, campoDestino);
        return { danoTotal, novaVida, nomeAlvo: nomeExibido, destruido: true };
    }

    return { danoTotal, novaVida, nomeAlvo: nomeExibido, destruido: false };
}

function localizarMarcadorBarrilGoblin(idBarril) {
    return Array.from(document.querySelectorAll(".marcadores-goblins-barril"))
        .find(marcador => marcador.dataset.barrilId === String(idBarril)) || null;
}

function criarMarcadorBarrilGoblin(idBarril, pacoteAlvo, vivos) {
    let marcador = document.createElement("span");
    marcador.className = "marcadores-goblins-barril";
    marcador.dataset.barrilId = idBarril;
    marcador.dataset.vivos = String(vivos);
    marcador.setAttribute("aria-hidden", "true");

    for (let indice = 0; indice < 3; indice++) {
        let goblin = document.createElement("i");
        goblin.className = "bolinha-goblin-barril" + (indice < vivos ? "" : " goblin-barril-morto");
        marcador.appendChild(goblin);
    }

    pacoteAlvo.appendChild(marcador);
    return marcador;
}

function atualizarMarcadorBarrilGoblin(idBarril, pacoteAlvo, vivos, linha) {
    let marcador = localizarMarcadorBarrilGoblin(idBarril);
    if (marcador && marcador.parentElement !== pacoteAlvo) {
        marcador.remove();
        marcador = null;
    }
    if (!marcador) marcador = criarMarcadorBarrilGoblin(idBarril, pacoteAlvo, vivos);

    marcador.style.setProperty("--linha-barril-goblin", linha || 0);
    let anteriores = parseInt(marcador.dataset.vivos, 10);
    if (!Number.isFinite(anteriores)) anteriores = vivos;
    marcador.dataset.vivos = String(vivos);

    Array.from(marcador.children).forEach((bolinha, indice) => {
        if (indice < vivos) {
            bolinha.classList.remove("goblin-barril-morto", "goblin-barril-sumindo");
            return;
        }

        if (indice < anteriores) {
            bolinha.classList.remove("goblin-barril-pulsando");
            bolinha.classList.add("goblin-barril-sumindo");
            setTimeout(() => {
                if (!bolinha.isConnected || indice < parseInt(marcador.dataset.vivos, 10)) return;
                bolinha.classList.remove("goblin-barril-sumindo");
                bolinha.classList.add("goblin-barril-morto");
            }, 430);
        } else if (!bolinha.classList.contains("goblin-barril-sumindo")) {
            bolinha.classList.add("goblin-barril-morto");
        }
    });
}

function removerMarcadorBarrilGoblin(idBarril) {
    let marcador = localizarMarcadorBarrilGoblin(idBarril);
    if (marcador) marcador.remove();
    delete pulsosBarrilGoblinPendentes[idBarril];
    delete lancamentosBarrilGoblinEmCurso[idBarril];
}

function sincronizarMarcadoresBarrilGoblin() {
    let linhasPorAlvo = {};
    let idsAtivos = new Set();

    Object.keys(alvosDoBarril).forEach(idBarril => {
        idsAtivos.add(String(idBarril));
        let idAlvo = alvosDoBarril[idBarril];
        let pacoteBarril = document.getElementById("pacote-" + idBarril);
        let pacoteAlvo = document.getElementById("pacote-" + idAlvo);

        if (!pacoteBarril || !pacoteAlvo) {
            removerMarcadorBarrilGoblin(idBarril);
            delete alvosDoBarril[idBarril];
            return;
        }

        // Durante o lançamento, as bolinhas só aparecem depois que o Barril pousa.
        if (lancamentosBarrilGoblinEmCurso[idBarril]) return;

        let vivos = quantidadeGoblinsVivosBarril(idBarril);
        if (vivos <= 0) {
            removerMarcadorBarrilGoblin(idBarril);
            return;
        }

        let linha = linhasPorAlvo[idAlvo] || 0;
        linhasPorAlvo[idAlvo] = linha + 1;
        atualizarMarcadorBarrilGoblin(idBarril, pacoteAlvo, vivos, linha);
    });

    document.querySelectorAll(".marcadores-goblins-barril").forEach(marcador => {
        if (!idsAtivos.has(marcador.dataset.barrilId)) marcador.remove();
    });
}

function pulsarMarcadoresBarrilGoblin(idBarril) {
    if (lancamentosBarrilGoblinEmCurso[idBarril]) {
        pulsosBarrilGoblinPendentes[idBarril] = true;
        return;
    }

    sincronizarMarcadoresBarrilGoblin();
    let marcador = localizarMarcadorBarrilGoblin(idBarril);
    if (!marcador) return;

    let vivos = quantidadeGoblinsVivosBarril(idBarril);
    Array.from(marcador.children).slice(0, vivos).forEach((bolinha, indice) => {
        bolinha.classList.remove("goblin-barril-pulsando");
        void bolinha.offsetWidth;
        bolinha.style.setProperty("--atraso-pulso-goblin", (indice * 0.07) + "s");
        bolinha.classList.add("goblin-barril-pulsando");
        setTimeout(() => {
            if (bolinha.isConnected) bolinha.classList.remove("goblin-barril-pulsando");
        }, 720 + indice * 70);
    });
}

function animarLancamentoBarrilGoblin(idBarril, idAlvo) {
    let pacoteBarril = document.getElementById("pacote-" + idBarril);
    let pacoteAlvo = document.getElementById("pacote-" + idAlvo);
    if (!pacoteBarril || !pacoteAlvo) return;

    let origem = obterCentroVisual(pacoteBarril);
    let destino = obterCentroVisual(pacoteAlvo);
    if (!origem || !destino) return;

    lancamentosBarrilGoblinEmCurso[idBarril] = true;
    removerMarcadorBarrilGoblin(idBarril);
    lancamentosBarrilGoblinEmCurso[idBarril] = true;

    let barril = document.createElement("span");
    barril.className = "barril-goblin-lancado";
    barril.setAttribute("aria-hidden", "true");
    barril.style.left = origem.x + "px";
    barril.style.top = origem.y + "px";
    barril.style.setProperty("--barril-goblin-x", (destino.x - origem.x) + "px");
    barril.style.setProperty("--barril-goblin-y", (destino.y - origem.y) + "px");
    barril.style.setProperty("--barril-goblin-meio-x", ((destino.x - origem.x) / 2) + "px");
    barril.style.setProperty("--barril-goblin-meio-y", ((destino.y - origem.y) / 2 - 105) + "px");

    let imagemOriginal = pacoteBarril.querySelector("img");
    if (imagemOriginal) {
        let imagem = document.createElement("img");
        imagem.src = imagemOriginal.src;
        imagem.alt = "";
        barril.appendChild(imagem);
    } else {
        barril.textContent = "🛢️";
    }
    document.body.appendChild(barril);

    setTimeout(() => {
        let alvoAtual = document.getElementById("pacote-" + idAlvo);
        if (alvoAtual) {
            let impacto = document.createElement("span");
            impacto.className = "impacto-barril-goblin";
            impacto.setAttribute("aria-hidden", "true");
            for (let i = 0; i < 6; i++) {
                let poeira = document.createElement("i");
                poeira.style.setProperty("--poeira-barril-x", (((i % 3) - 1) * 30) + "px");
                poeira.style.setProperty("--poeira-barril-y", (-18 - (i % 2) * 22) + "px");
                impacto.appendChild(poeira);
            }
            alvoAtual.appendChild(impacto);
            setTimeout(() => { if (impacto.parentNode) impacto.remove(); }, 680);
        }

        delete lancamentosBarrilGoblinEmCurso[idBarril];
        sincronizarMarcadoresBarrilGoblin();
        if (pulsosBarrilGoblinPendentes[idBarril]) {
            delete pulsosBarrilGoblinPendentes[idBarril];
            setTimeout(() => pulsarMarcadoresBarrilGoblin(idBarril), 70);
        }
    }, 620);

    setTimeout(() => { if (barril.parentNode) barril.remove(); }, 880);
}

function criarVooBumerangue(origem, destino, atraso = 0, retornando = false, idBumerskeleton = null) {
    if (!origem || !destino) return;

    let bumerangue = document.createElement("span");
    bumerangue.className = "bumerangue-voando" + (retornando ? " bumerangue-retornando" : "");
    if (idBumerskeleton) bumerangue.dataset.bumerangueDono = idBumerskeleton;
    bumerangue.textContent = "🪃";
    bumerangue.setAttribute("aria-hidden", "true");
    bumerangue.style.left = origem.x + "px";
    bumerangue.style.top = origem.y + "px";
    bumerangue.style.setProperty("--bume-x", (destino.x - origem.x) + "px");
    bumerangue.style.setProperty("--bume-y", (destino.y - origem.y) + "px");
    bumerangue.style.setProperty("--bume-meio-x", ((destino.x - origem.x) / 2) + "px");
    bumerangue.style.setProperty("--bume-meio-y", ((destino.y - origem.y) / 2 - (retornando ? 34 : 46)) + "px");
    bumerangue.style.setProperty("--bume-atraso", atraso + "s");
    document.body.appendChild(bumerangue);

    setTimeout(() => {
        if (bumerangue.parentNode) bumerangue.remove();
    }, (atraso + 0.9) * 1000);
}

function iniciarTrajetoVisualBumerangue(idBumerskeleton, idPrimeiroAlvo) {
    let bume = document.getElementById("pacote-" + idBumerskeleton);
    let primeiroAlvo = document.getElementById("pacote-" + idPrimeiroAlvo);
    let origem = obterCentroVisual(bume);
    let destino = obterCentroVisual(primeiroAlvo);

    trajetosVisuaisBumerangue[idBumerskeleton] = [];
    if (origem) trajetosVisuaisBumerangue[idBumerskeleton].push(origem);
    if (destino) trajetosVisuaisBumerangue[idBumerskeleton].push(destino);
    criarVooBumerangue(origem, destino, 0, false, idBumerskeleton);

    return destino || origem;
}

function registrarRicocheteVisualBumerangue(idBumerskeleton, origem, pacoteDestino, atraso) {
    let destino = obterCentroVisual(pacoteDestino);
    if (!destino) return origem;

    if (!trajetosVisuaisBumerangue[idBumerskeleton]) trajetosVisuaisBumerangue[idBumerskeleton] = [];
    trajetosVisuaisBumerangue[idBumerskeleton].push(destino);
    criarVooBumerangue(origem, destino, atraso, false, idBumerskeleton);
    return destino;
}

function animarRetornoBumerangue(idBumerskeleton) {
    let pontos = trajetosVisuaisBumerangue[idBumerskeleton] || [];
    if (pontos.length < 2) return;

    let atraso = 0;
    for (let i = pontos.length - 1; i > 0; i--) {
        criarVooBumerangue(pontos[i], pontos[i - 1], atraso, true, idBumerskeleton);
        atraso += 0.34;
    }
}

function ativarFogoVisualBumerskeleton(idAlvo) {
    let pacote = document.getElementById("pacote-" + idAlvo);
    if (!pacote) return;

    pacote.classList.add("fogo-bumerskeleton");
    let chamas = pacote.querySelector(".chamas-bumerskeleton");
    if (!chamas) {
        chamas = document.createElement("span");
        chamas.className = "chamas-bumerskeleton";
        chamas.setAttribute("aria-hidden", "true");
        for (let i = 0; i < 4; i++) {
            let chama = document.createElement("b");
            chama.textContent = "🔥";
            chama.style.setProperty("--fogo-bume-x", (8 + i * 28) + "%");
            chama.style.setProperty("--fogo-bume-atraso", (i * -0.14) + "s");
            chamas.appendChild(chama);
        }
        pacote.appendChild(chamas);
    }

    pacote.classList.remove("impacto-fogo-bumerskeleton");
    void pacote.offsetWidth;
    pacote.classList.add("impacto-fogo-bumerskeleton");

    if (timersFogoBumerskeleton[idAlvo]) clearTimeout(timersFogoBumerskeleton[idAlvo]);
    timersFogoBumerskeleton[idAlvo] = setTimeout(() => {
        let cartaAtual = document.getElementById("pacote-" + idAlvo);
        if (cartaAtual) {
            cartaAtual.classList.remove("fogo-bumerskeleton", "impacto-fogo-bumerskeleton");
            let fogoAtual = cartaAtual.querySelector(".chamas-bumerskeleton");
            if (fogoAtual) fogoAtual.remove();
        }
        delete timersFogoBumerskeleton[idAlvo];
    }, 2300);
}

function criarFragmentosGeloBumerskeleton(pacote) {
    if (!pacote || pacote.querySelector(".fragmentos-gelo-bumerskeleton")) return;

    let fragmentos = document.createElement("span");
    fragmentos.className = "fragmentos-gelo-bumerskeleton";
    fragmentos.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 9; i++) {
        let fragmento = document.createElement("i");
        fragmento.style.setProperty("--gelo-bume-x", (8 + ((i * 29) % 84)) + "%");
        fragmento.style.setProperty("--gelo-bume-y", (10 + ((i * 43) % 78)) + "%");
        fragmento.style.setProperty("--gelo-bume-atraso", (i * -0.17) + "s");
        fragmentos.appendChild(fragmento);
    }
    pacote.appendChild(fragmentos);
}

function ativarGeloVisualBumerskeleton(idAlvo) {
    geloBumerskeletonAtivos[idAlvo] = true;
    let pacote = document.getElementById("pacote-" + idAlvo);
    if (!pacote) return;

    if (!pacote.classList.contains("gelo-bumerskeleton")) pacote.classList.add("gelo-bumerskeleton");
    criarFragmentosGeloBumerskeleton(pacote);

    let impacto = document.createElement("span");
    impacto.className = "impacto-gelo-bumerskeleton";
    impacto.setAttribute("aria-hidden", "true");
    impacto.textContent = "❄";
    pacote.appendChild(impacto);
    setTimeout(() => {
        if (impacto.parentNode) impacto.remove();
    }, 950);
}

function removerGeloVisualBumerskeleton(idAlvo) {
    delete geloBumerskeletonAtivos[idAlvo];
    let pacote = document.getElementById("pacote-" + idAlvo);
    if (!pacote) return;
    pacote.classList.remove("gelo-bumerskeleton");
    let fragmentos = pacote.querySelector(".fragmentos-gelo-bumerskeleton");
    if (fragmentos) fragmentos.remove();
}

function sincronizarVisuaisGeloBumerskeleton() {
    Object.keys(geloBumerskeletonAtivos).forEach(idAlvo => {
        let pacote = document.getElementById("pacote-" + idAlvo);
        if (!duracaoGelo[idAlvo]) {
            removerGeloVisualBumerskeleton(idAlvo);
        } else if (pacote && pacote.classList.contains("congelada")) {
            if (!pacote.classList.contains("gelo-bumerskeleton")) pacote.classList.add("gelo-bumerskeleton");
            criarFragmentosGeloBumerskeleton(pacote);
        }
    });
}

function animarAtaqueAreaCavaleiro(idCavaleiro, pacoteAlvoPrincipal, alvosAtingidos, especialAtivo) {
    let cavaleiro = document.getElementById("pacote-" + idCavaleiro);
    if (!cavaleiro || !pacoteAlvoPrincipal) return;

    let origem = obterCentroVisual(cavaleiro);
    let destino = obterCentroVisual(pacoteAlvoPrincipal);
    if (!origem || !destino) return;

    let arma = document.createElement("span");
    arma.className = especialAtivo ? "arma-cavaleiro arma-grande-cavaleiro" : "arma-cavaleiro arma-pequena-cavaleiro";
    arma.textContent = "🗡️";
    arma.setAttribute("aria-hidden", "true");

    if (especialAtivo) {
        arma.style.left = destino.x + "px";
        arma.style.top = destino.y + "px";
    } else {
        arma.style.left = origem.x + "px";
        arma.style.top = origem.y + "px";
        arma.style.setProperty("--arma-cavaleiro-x", (destino.x - origem.x) + "px");
        arma.style.setProperty("--arma-cavaleiro-y", (destino.y - origem.y) + "px");
        arma.style.setProperty("--arma-cavaleiro-meio-x", ((destino.x - origem.x) / 2) + "px");
        arma.style.setProperty("--arma-cavaleiro-meio-y", ((destino.y - origem.y) / 2 - 36) + "px");
    }
    document.body.appendChild(arma);

    let atrasoImpacto = especialAtivo ? 390 : 330;
    let dadosDosAlvos = (alvosAtingidos || []).map(pacote => {
        let retangulo = pacote.getBoundingClientRect();
        return {
            id: pacote.id,
            left: retangulo.left,
            top: retangulo.top,
            width: retangulo.width,
            height: retangulo.height
        };
    });

    setTimeout(() => {
        dadosDosAlvos.forEach((alvo, indice) => {
            let onda = document.createElement("span");
            onda.className = "onda-area-cavaleiro" + (especialAtivo ? " onda-grande-cavaleiro" : " onda-pequena-cavaleiro");
            onda.setAttribute("aria-hidden", "true");
            onda.style.left = (alvo.left + alvo.width / 2) + "px";
            onda.style.top = (alvo.top + alvo.height / 2) + "px";
            onda.style.width = alvo.width + "px";
            onda.style.height = alvo.height + "px";
            onda.style.setProperty("--onda-cavaleiro-atraso", (indice * 0.06) + "s");
            document.body.appendChild(onda);

            let pacoteAtual = document.getElementById(alvo.id);
            if (pacoteAtual) {
                let classeImpacto = especialAtivo ? "impacto-grande-cavaleiro" : "impacto-pequeno-cavaleiro";
                pacoteAtual.classList.remove(classeImpacto);
                void pacoteAtual.offsetWidth;
                pacoteAtual.classList.add(classeImpacto);
                setTimeout(() => {
                    if (pacoteAtual.isConnected) pacoteAtual.classList.remove(classeImpacto);
                }, 820);
            }

            setTimeout(() => {
                if (onda.parentNode) onda.remove();
            }, 1000 + indice * 60);
        });
    }, atrasoImpacto);

    setTimeout(() => {
        if (arma.parentNode) arma.remove();
    }, especialAtivo ? 1050 : 880);
}

let contadorHistoricoNarrador = 0;

function limparHistoricoNarrador() {
    contadorHistoricoNarrador = 0;
    let lista = document.getElementById("lista-historico-narrador");
    if (lista) lista.innerHTML = "";
    let quantidade = document.getElementById("quantidade-historico-narrador");
    if (quantidade) quantidade.textContent = "0";
    let historico = document.getElementById("historico-narrador");
    if (historico) historico.open = false;
}

function narrar(mensagem) {
    let texto = String(mensagem ?? "").trim();
    if (!texto) return;

    let painel = document.getElementById("painel-narrador");
    if (painel) {
        painel.innerText = texto;
        painel.classList.remove("narrador-atualizando");
        void painel.offsetWidth;
        painel.classList.add("narrador-atualizando");
    }

    let lista = document.getElementById("lista-historico-narrador");
    if (!lista) return;

    let ultima = lista.firstElementChild;
    if (ultima && ultima.dataset.mensagem === texto) {
        let repeticoes = (parseInt(ultima.dataset.repeticoes, 10) || 1) + 1;
        ultima.dataset.repeticoes = String(repeticoes);
        let selo = ultima.querySelector(".repeticao-narrador");
        if (!selo) {
            selo = document.createElement("small");
            selo.className = "repeticao-narrador";
            ultima.appendChild(selo);
        }
        selo.textContent = `×${repeticoes}`;
        return;
    }

    contadorHistoricoNarrador++;
    let item = document.createElement("li");
    item.dataset.mensagem = texto;
    item.dataset.repeticoes = "1";

    let ordem = document.createElement("small");
    ordem.className = "ordem-narrador";
    ordem.textContent = `#${contadorHistoricoNarrador}`;

    let conteudo = document.createElement("span");
    conteudo.textContent = texto;
    item.appendChild(ordem);
    item.appendChild(conteudo);
    lista.prepend(item);

    // Mantém o painel leve mesmo em partidas muito longas.
    while (lista.children.length > 30) lista.lastElementChild.remove();
    lista.scrollTop = 0;
    let quantidade = document.getElementById("quantidade-historico-narrador");
    if (quantidade) quantidade.textContent = String(lista.children.length);
}

// O Ctrl C/V mantém o próprio nome na tela, mas para as regras do jogo ele assume a
// identidade da carta copiada. Toda passiva que depende do nome deve passar por este helper.
function obterNomeEfetivoCarta(idUnico, nomeExibido) {
    let copia = (typeof ctrlV !== 'undefined' && ctrlV[idUnico]) ? ctrlV[idUnico] : null;
    return (copia && copia.nomeOriginal) ? copia.nomeOriginal : (nomeExibido || "");
}

function atacanteAtualEh(nomeCarta) {
    let pacote = ultimoIdQueAtacou ? document.getElementById("pacote-" + ultimoIdQueAtacou) : null;
    if (!pacote || cartaSilenciadaPeloEcto(ultimoIdQueAtacou)) return false;
    let nomeExibido = pacote.querySelector(".nome-carta")?.innerText?.trim() || "";
    return obterNomeEfetivoCarta(ultimoIdQueAtacou, nomeExibido) === nomeCarta;
}

function bumerangueAindaTemDono(idBumerskeleton) {
    let pacote = document.getElementById("pacote-" + idBumerskeleton);
    if (!pacote || cartaSilenciadaPeloEcto(idBumerskeleton)) return false;
    let nomeExibido = pacote.querySelector(".nome-carta")?.innerText?.trim() || "";
    return obterNomeEfetivoCarta(idBumerskeleton, nomeExibido) === "Bumerskeleton";
}

function removerVoosSemBumerskeleton() {
    document.querySelectorAll(".bumerangue-voando[data-bumerangue-dono]").forEach(voo => {
        if (!bumerangueAindaTemDono(voo.dataset.bumerangueDono)) voo.remove();
    });
}

function cartaSilenciadaPeloEcto(idUnico) {
    return !!(idUnico && cartasSilenciadasEcto[idUnico]);
}
window.rpgCartaSilenciadaPeloEcto = cartaSilenciadaPeloEcto;

function aplicarInterfaceSilencioEcto(idUnico) {
    let pacote = document.getElementById("pacote-" + idUnico);
    if (!pacote) return;

    pacote.classList.add("silenciada-pelo-ecto");
    pacote.dataset.ectoSilenciada = "true";
    let acoes = pacote.querySelector("div[id^='acoes-']");
    if (acoes) {
        Array.from(acoes.querySelectorAll("button")).forEach(botao => {
            let acao = botao.getAttribute("onclick") || "";
            if (/^\s*(iniciarAtaque|inimigoAtacar)\s*\(/.test(acao)) {
                botao.classList.add("btn-ataque-sem-habilidade");
            } else {
                botao.remove();
            }
        });

        if (!acoes.querySelector(".btn-ataque-sem-habilidade")) {
            let ehAliado = pacote.closest("#campo-j1, #mao-j1") !== null;
            let nome = (pacote.querySelector(".nome-carta")?.innerText || "Carta").replace(/\s*\(S\/Hab\)\s*$/i, "");
            let botao = document.createElement("button");
            botao.className = "btn-ataque-sem-habilidade";
            botao.textContent = "Atacar ⚔️";
            botao.style.cssText = `padding:5px;width:100%;margin-bottom:2px;cursor:pointer;${ehAliado ? "" : "background-color:darkred;color:white;"}`;
            botao.setAttribute("onclick", ehAliado
                ? `iniciarAtaque('${nome.replace(/'/g, "\\'")}', '${idUnico}')`
                : `inimigoAtacar('${idUnico}')`);
            acoes.appendChild(botao);
        }
    }

    if (!pacote.querySelector(".selo-silencio-ecto")) {
        let selo = document.createElement("span");
        selo.className = "selo-silencio-ecto";
        selo.textContent = "SEM HAB.";
        selo.title = "Passiva e Especial removidos permanentemente pelo Ecto";
        pacote.appendChild(selo);
    }
}

function desativarHabilidadesSilenciadas(idUnico) {
    let bonusAnterior = Number(bonusUnidao[idUnico]) || 0;
    let tinhaEscudo = !!escudoGuerreiro[idUnico];
    let danoEl = document.getElementById("dano-" + idUnico);
    if (danoEl && bonusAnterior > 0) {
        danoEl.innerText = Math.max(0, (parseFloat(danoEl.innerText) || 0) - bonusAnterior);
    }

    [bonusUnidao, goblinJaAtacouNesteTurno, goblinAtaquesGanhos, viajantesJaUsaram,
        escudoGuerreiro, alvosDoBarril, barrilJaImpactou, splashBarbaroAtivo,
        especialFixoBumerskeleton, recargaGeloBumerskeleton, especialFixoSeparado, bonusVampi7Sozinho,
        cavalosDeTroiaAtivos, incendiarioCiclo, incendiarioAlvos,
        incendiarioFasesVisuais, separadaoDividido, separadaoAtacantesNaSequencia,
        portableDuracao, ctrlV
    ].forEach(estado => {
        if (estado && typeof estado === "object") delete estado[idUnico];
    });
    if (typeof orkBuffado !== "undefined") delete orkBuffado[idUnico];
    if (typeof ladroesQueJaRoubaram !== "undefined") delete ladroesQueJaRoubaram[idUnico];
    if (typeof cavaleiroAtivado !== "undefined") delete cavaleiroAtivado[idUnico];
    if (typeof window.mensageirosEmArea !== "undefined") delete window.mensageirosEmArea[idUnico];
    if (typeof limparFormaCriadorDoCtrl === "function") limparFormaCriadorDoCtrl(idUnico);

    Object.keys(parceriaSeparado).forEach(idSeparado => {
        if (idSeparado === idUnico || parceriaSeparado[idSeparado] === idUnico) {
            delete parceriaSeparado[idSeparado];
            delete separadaoDividido[idSeparado];
            delete separadaoAtacantesNaSequencia[idSeparado];
        }
    });
    Object.keys(cartasProtegidas).forEach(idProtegido => {
        if (String(cartasProtegidas[idProtegido]) !== String(idUnico)) return;

        // Se o Ecto apagar a habilidade de um Barril protetor, todas as cartas
        // que dependiam DELE são libertadas na mesma hora. A proteção que outro
        // Barril fornece à carta atingida continua existindo para ataques comuns.
        if (typeof quebrarVisualProtecaoBarril === "function") {
            quebrarVisualProtecaoBarril(idProtegido, false);
        }
        delete cartasProtegidas[idProtegido];
    });
    if (typeof restaurarPosicaoBarril === "function") restaurarPosicaoBarril(idUnico);
    if (typeof sincronizarVisuaisProtecaoBarril === "function") sincronizarVisuaisProtecaoBarril();

    if (tinhaEscudo && typeof quebrarVisualEscudo === "function") quebrarVisualEscudo(idUnico);
    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
    if (typeof window.rpgSincronizarFraguers === "function") window.rpgSincronizarFraguers();
}

function silenciarCartaPeloEcto(idUnico) {
    let pacote = document.getElementById("pacote-" + idUnico);
    if (!pacote) return null;
    let nome = pacote.querySelector(".nome-carta")?.innerText?.replace(/\s*\(S\/Hab\)\s*$/i, "").trim() || "Carta";
    let ids = pacote.dataset.inimigoEspecial === "slime" && typeof window.rpgObterIdsFamiliaSlime === "function"
        ? window.rpgObterIdsFamiliaSlime(idUnico)
        : [idUnico];
    if (ids.length === 0) ids = [idUnico];
    let jaEstavaSilenciada = ids.every(cartaSilenciadaPeloEcto);

    ids.forEach(id => {
        cartasSilenciadasEcto[id] = true;
        desativarHabilidadesSilenciadas(id);
        aplicarInterfaceSilencioEcto(id);
    });
    return { nome, quantidade: ids.length, jaEstavaSilenciada };
}
window.rpgSilenciarCartaPeloEcto = silenciarCartaPeloEcto;

// 👻 ECTO — uma projeção pequena sai da carta, atravessa o alvo e leva embora
// a runa da habilidade. O efeito é visual e não atrasa o dano nem a vez do bot.
function animarToqueEcto(idEcto, idAlvo, removeuHabilidade) {
    let pacoteEcto = document.getElementById("pacote-" + idEcto);
    let pacoteAlvo = document.getElementById("pacote-" + idAlvo);
    if (!pacoteEcto || !pacoteAlvo) return;

    let origem = pacoteEcto.getBoundingClientRect();
    let destino = pacoteAlvo.getBoundingClientRect();
    let inicioX = origem.left + origem.width / 2;
    let inicioY = origem.top + origem.height * .42;
    let deslocamentoX = destino.left + destino.width / 2 - inicioX;
    let deslocamentoY = destino.top + destino.height * .42 - inicioY;
    let sentido = deslocamentoX < 0 ? -1 : 1;

    let projecao = document.createElement("span");
    projecao.className = "projecao-ecto-rpg";
    projecao.setAttribute("aria-hidden", "true");
    projecao.style.left = `${inicioX}px`;
    projecao.style.top = `${inicioY}px`;
    projecao.style.setProperty("--ecto-x", `${deslocamentoX + sentido * destino.width * .34}px`);
    projecao.style.setProperty("--ecto-y", `${deslocamentoY}px`);
    projecao.style.setProperty("--ecto-meio-x", `${deslocamentoX * .55}px`);
    projecao.style.setProperty("--ecto-meio-y", `${deslocamentoY * .55 - 18}px`);
    projecao.style.setProperty("--ecto-direcao", String(sentido));

    let imagemOriginal = pacoteEcto.querySelector("img");
    if (imagemOriginal?.src) {
        let imagem = document.createElement("img");
        imagem.src = imagemOriginal.src;
        imagem.alt = "";
        projecao.appendChild(imagem);
    } else {
        projecao.textContent = "👻";
    }
    for (let indice = 0; indice < 3; indice++) projecao.appendChild(document.createElement("i"));
    document.body.appendChild(projecao);

    pacoteEcto.classList.remove("ecto-projetando-rpg");
    void pacoteEcto.offsetWidth;
    pacoteEcto.classList.add("ecto-projetando-rpg");

    setTimeout(() => {
        if (!pacoteAlvo.isConnected) return;
        pacoteAlvo.classList.remove("impacto-toque-ecto-rpg");
        void pacoteAlvo.offsetWidth;
        pacoteAlvo.classList.add("impacto-toque-ecto-rpg");

        if (removeuHabilidade) {
            let atributo = document.createElement("span");
            atributo.className = "atributo-arrancado-ecto-rpg";
            atributo.textContent = "✦";
            atributo.setAttribute("aria-hidden", "true");
            pacoteAlvo.appendChild(atributo);
            setTimeout(() => atributo.remove(), 720);
        }
        setTimeout(() => pacoteAlvo?.isConnected && pacoteAlvo.classList.remove("impacto-toque-ecto-rpg"), 660);
    }, 455);

    setTimeout(() => {
        projecao.remove();
        pacoteEcto?.isConnected && pacoteEcto.classList.remove("ecto-projetando-rpg");
    }, 960);
}

// O toque acontece antes de descontar a vida. Assim, se o golpe for letal,
// Passivas de morte como as do Ork, Barril e Slime já estarão desativadas.
function aplicarToqueEctoAntesDoDano(idAlvo) {
    let idEcto = ultimoIdQueAtacou;
    let pacoteEcto = idEcto ? document.getElementById("pacote-" + idEcto) : null;
    let pacoteAlvo = idAlvo ? document.getElementById("pacote-" + idAlvo) : null;
    if (!pacoteEcto || !pacoteAlvo || pacoteEcto.dataset.inimigoEspecial !== "ecto" || cartaSilenciadaPeloEcto(idEcto)) return false;

    let resultado = silenciarCartaPeloEcto(idAlvo);
    if (!resultado) return false;
    animarToqueEcto(idEcto, idAlvo, !resultado.jaEstavaSilenciada);
    pacoteAlvo.dataset.ectoUltimoAtacante = idEcto;
    narrar(resultado.jaEstavaSilenciada
        ? `👻 ${resultado.nome} já estava sem habilidade; o Ecto manteve o bloqueio permanente.`
        : `👻 TOQUE DO ECTO! ${resultado.nome} perdeu permanentemente sua Passiva e seu Especial.`);
    return true;
}

// 🧬 CTRL C / CTRL V — a gosma se deforma enquanto uma cópia luminosa da última
// carta usada pelo oponente é absorvida. A mecânica acontece normalmente, sem esperar
// a animação, para não atrasar o turno nem o bot.
function animarMetamorfoseCtrl(idCtrl, nomeCopiado, ehAliado) {
    let pacoteCtrl = document.getElementById("pacote-" + idCtrl);
    if (!pacoteCtrl) return;

    // A carta usada fica no campo; não procura na mão para não animar por engano outra
    // cópia do mesmo tipo que o oponente ainda nem jogou.
    let recipientesOpostos = ehAliado ? ["#campo-j2"] : ["#campo-j1"];
    let candidatas = recipientesOpostos.flatMap(seletor => {
        let recipiente = document.querySelector(seletor);
        return recipiente ? Array.from(recipiente.querySelectorAll("div[id^='pacote-']")) : [];
    })
        .filter(pacote => {
            let nome = pacote.querySelector(".nome-carta");
            return nome && nome.innerText.trim() === nomeCopiado;
        });
    let pacoteCopiado = candidatas.length ? candidatas[candidatas.length - 1] : null;
    let rectCtrl = pacoteCtrl.getBoundingClientRect();
    let rectOrigem = pacoteCopiado ? pacoteCopiado.getBoundingClientRect() : rectCtrl;
    let imagemCopiada = pacoteCopiado ? pacoteCopiado.querySelector("img") : null;

    let origemX = rectOrigem.left + rectOrigem.width / 2;
    let origemY = rectOrigem.top + rectOrigem.height / 2;
    let destinoX = rectCtrl.left + rectCtrl.width / 2;
    let destinoY = rectCtrl.top + rectCtrl.height / 2;

    let copia = document.createElement("div");
    copia.className = "copia-metamorfa-ctrl";
    copia.style.setProperty("--ctrl-origem-x", origemX + "px");
    copia.style.setProperty("--ctrl-origem-y", origemY + "px");
    copia.style.setProperty("--ctrl-meio-x", ((origemX + destinoX) / 2) + "px");
    copia.style.setProperty("--ctrl-meio-y", (Math.min(origemY, destinoY) - 48) + "px");
    copia.style.setProperty("--ctrl-destino-x", destinoX + "px");
    copia.style.setProperty("--ctrl-destino-y", destinoY + "px");
    copia.innerHTML = imagemCopiada && imagemCopiada.src
        ? `<img src="${imagemCopiada.src}" alt=""><span>${nomeCopiado}</span>`
        : `<b>🧬</b><span>${nomeCopiado}</span>`;

    let pulso = document.createElement("div");
    pulso.className = "pulso-metamorfo-ctrl";
    pulso.style.left = destinoX + "px";
    pulso.style.top = destinoY + "px";
    pulso.innerHTML = "<i></i><i></i><i></i>";

    document.body.appendChild(copia);
    document.body.appendChild(pulso);
    pacoteCtrl.classList.remove("ctrl-metamorfo-balancando");
    void pacoteCtrl.offsetWidth;
    pacoteCtrl.classList.add("ctrl-metamorfo-balancando");
    if (pacoteCopiado) pacoteCopiado.classList.add("fonte-copia-ctrl");

    setTimeout(() => {
        copia.remove();
        pulso.remove();
        if (pacoteCtrl.isConnected) pacoteCtrl.classList.remove("ctrl-metamorfo-balancando");
        if (pacoteCopiado && pacoteCopiado.isConnected) pacoteCopiado.classList.remove("fonte-copia-ctrl");
    }, 1450);
}

function obterModoCartaAliada() {
    if (modoTraicao) return "executar-traicao";
    let acaoLadrao = typeof obterAcaoRouboLadraoNoLado === "function"
        ? obterAcaoRouboLadraoNoLado("j1")
        : null;
    if (acaoLadrao) return acaoLadrao;
    if (modoAtaqueInimigo) return "ataque-inimigo";
    if (modoCura) return "cura";
    if (modoRouboGoblin) return "roubo-goblin";
    if (modoBruxoTransformar) return "bruxo-transformar";
    if (modoBruxoRoubar) return "bruxo-roubar";
    if (suportePreparado !== null) return "suporte";
    return "ataque-normal";
}

function obterModoCartaInimiga() {
    if (modoTraicao) return "executar-traicao";
    let acaoLadrao = typeof obterAcaoRouboLadraoNoLado === "function"
        ? obterAcaoRouboLadraoNoLado("j2")
        : null;
    if (acaoLadrao) return acaoLadrao;
    if (modoCuraInimigo) return "cura-inimiga";
    if (modoRouboGoblin) return "roubo-goblin";
    if (suportePreparado !== null) return "suporte";
    return "receber-ataque";
}

function removerVenenoDoMago(idEfeitoVeneno) {
    let efeito = venenosMago[idEfeitoVeneno];
    if (!efeito) return;

    let idAlvo = efeito.idAlvo;
    delete venenosMago[idEfeitoVeneno];

    let aindaEstaEnvenenado = Object.values(venenosMago).some(outro => outro.idAlvo === idAlvo);
    if (!aindaEstaEnvenenado) {
        let pacoteAlvo = document.getElementById("pacote-" + idAlvo);
        if (pacoteAlvo) pacoteAlvo.classList.remove("envenenada");
    }
}

function animarGarrafaVeneno(idMago, idAlvo) {
    let mago = document.getElementById("pacote-" + idMago);
    let alvo = document.getElementById("pacote-" + idAlvo);
    if (!mago || !alvo) return;

    let origem = mago.getBoundingClientRect();
    let destino = alvo.getBoundingClientRect();
    let inicioX = origem.left + origem.width / 2;
    let inicioY = origem.top + origem.height / 2;
    let distanciaX = (destino.left + destino.width / 2) - inicioX;
    let distanciaY = (destino.top + destino.height / 2) - inicioY;

    let garrafa = document.createElement("span");
    garrafa.className = "garrafa-veneno-lancada";
    garrafa.textContent = "🧪";
    garrafa.setAttribute("aria-hidden", "true");
    garrafa.style.left = inicioX + "px";
    garrafa.style.top = inicioY + "px";
    garrafa.style.setProperty("--veneno-x", distanciaX + "px");
    garrafa.style.setProperty("--veneno-y", distanciaY + "px");
    garrafa.style.setProperty("--veneno-meio-x", distanciaX / 2 + "px");
    garrafa.style.setProperty("--veneno-meio-y", distanciaY / 2 - 42 + "px");
    document.body.appendChild(garrafa);

    garrafa.addEventListener("animationend", () => garrafa.remove(), { once: true });
    setTimeout(() => {
        if (garrafa.parentNode) garrafa.remove();
    }, 1000);
}

function aplicarAlvoVenenoMago(idPacoteAlvo) {
    let pacoteMago = document.getElementById("pacote-" + idMagoVenenoAtivo);
    let pacoteAlvo = document.getElementById(idPacoteAlvo);

    if (!pacoteMago) {
        modoAlvoVenenoMago = false;
        idMagoVenenoAtivo = null;
        return;
    }
    if (!pacoteAlvo) return;

    let ladoMago = pacoteMago.closest("#campo-j1") ? "j1" : pacoteMago.closest("#campo-j2") ? "j2" : null;
    let ladoAlvo = pacoteAlvo.closest("#campo-j1") ? "j1" : pacoteAlvo.closest("#campo-j2") ? "j2" : null;
    if (!ladoAlvo || ladoMago === ladoAlvo) {
        return narrar("❌ O veneno do Mago precisa atingir uma carta do campo oposto!");
    }

    let idAlvo = idPacoteAlvo.replace("pacote-", "");
    // Cada lançamento recebe seu próprio registro. Se o mesmo Mago escolher novamente
    // a MESMA carta, apenas renova as duas rodadas; em outro alvo, ambos continuam ativos.
    let idEfeitoExistente = Object.keys(venenosMago).find(idEfeito => {
        let efeito = venenosMago[idEfeito];
        return efeito.idMago === idMagoVenenoAtivo && efeito.idAlvo === idAlvo;
    });
    if (idEfeitoExistente) {
        venenosMago[idEfeitoExistente].restam = 4;
    } else {
        let idEfeitoNovo = `veneno-${idMagoVenenoAtivo}-${proximoIdVenenoMago++}`;
        venenosMago[idEfeitoNovo] = { idMago: idMagoVenenoAtivo, idAlvo: idAlvo, restam: 4 };
    }
    pacoteAlvo.classList.add("envenenada");
    animarGarrafaVeneno(idMagoVenenoAtivo, idAlvo);

    let nomeAlvo = pacoteAlvo.querySelector(".nome-carta").innerText.trim();
    modoAlvoVenenoMago = false;
    idMagoVenenoAtivo = null;
    narrar(`☠️ ${nomeAlvo} foi envenenado! Sofrerá 0,5 de dano em cada jogada pelas próximas 2 rodadas.`);
}

// A captura do clique deixa qualquer carta normal, token ou transformação ser alvo do veneno.
document.addEventListener("click", function (evento) {
    if (!modoAlvoVenenoMago) return;
    let imagem = evento.target && evento.target.closest ? evento.target.closest("img") : null;
    let pacote = imagem ? imagem.closest("div[id^='pacote-']") : null;
    if (!pacote || (!pacote.closest("#campo-j1") && !pacote.closest("#campo-j2"))) return;

    evento.preventDefault();
    evento.stopImmediatePropagation();
    aplicarAlvoVenenoMago(pacote.id);
}, true);

function iniciarJogo() {
    limparHistoricoNarrador();
    deckJ1 = []; maoJ1 = [];
    deckJ2 = []; maoJ2 = [];
    especialFixoBumerskeleton = {};
    recargaGeloBumerskeleton = {};
    especialFixoSeparado = {};
    parceriaSeparado = {};
    separadaoDividido = {};
    separadaoAtacantesNaSequencia = {};
    ignorarInterceptacaoSeparadoUmaVez = false;
    bonusVampi7Sozinho = {};
    unidadesVivasTrios = {};
    cartasSilenciadasEcto = {};

    let deckTropaJ1 = []; let deckSuporteJ1 = [];
    let deckTropaJ2 = []; let deckSuporteJ2 = [];

    // A coleção da tela inicial passa a definir quais cartas existem na partida.
    // No início ficam desbloqueados Guerreiro, Bárbaro, Mago e Escudo. A partida,
    // porém, continua começando com 5 cartas: cada tipo liberado entra no sorteio
    // com a quantidade definida em cartas.js (qtd), permitindo cópias na mão.
    let idsDisponiveis = (typeof window.obterIdsCartasDisponiveisRpg === "function")
        ? new Set(window.obterIdsCartasDisponiveisRpg())
        : null;

    bancoDeCartas.forEach(carta => {
        if (idsDisponiveis && !idsDisponiveis.has(carta.id)) return;
        let quantidadeNoDeck = carta.qtd;
        for(let i = 0; i < quantidadeNoDeck; i++) {
            let instJ1 = { ...carta, idUnico: carta.id + "_" + i };
            let instJ2 = { ...carta, idUnico: carta.id + "_inimigo_" + i };
            
            if (suportesReais.includes(carta.id)) {
                deckSuporteJ1.push(instJ1);
                deckSuporteJ2.push(instJ2);
            } else {
                deckTropaJ1.push(instJ1);
                deckTropaJ2.push(instJ2);
            }
        }
    });

    deckTropaJ1.sort(() => Math.random() - 0.5);
    deckSuporteJ1.sort(() => Math.random() - 0.5);
    deckTropaJ2.sort(() => Math.random() - 0.5);
    deckSuporteJ2.sort(() => Math.random() - 0.5);

    function montarMaoInicial(tropas, suportes) {
        let totalDisponivel = tropas.length + suportes.length;
        let tamanhoDaMao = Math.min(5, totalDisponivel);
        let mao = [];

        // Toda batalha começa com pelo menos um suporte, quando houver algum liberado.
        // As outras posições são preenchidas pelas variações de quantidade das tropas.
        if (suportes.length > 0) mao.push(suportes.pop());
        while (mao.length < tamanhoDaMao && tropas.length > 0) mao.push(tropas.pop());
        while (mao.length < tamanhoDaMao && suportes.length > 0) mao.push(suportes.pop());
        return mao;
    }

    maoJ1 = montarMaoInicial(deckTropaJ1, deckSuporteJ1);
    maoJ2 = montarMaoInicial(deckTropaJ2, deckSuporteJ2);

    deckJ1 = [...deckTropaJ1, ...deckSuporteJ1].sort(() => Math.random() - 0.5);
    deckJ2 = [...deckTropaJ2, ...deckSuporteJ2].sort(() => Math.random() - 0.5);

    maoJ1.sort(() => Math.random() - 0.5);
    maoJ2.sort(() => Math.random() - 0.5);

    let divMaoJ1 = document.getElementById("mao-j1");
    divMaoJ1.innerHTML = "<h3>Sua Mão</h3>"; 
    maoJ1.forEach(cartaComprada => {
        divMaoJ1.innerHTML += criarHTMLCarta(cartaComprada, "jogarCarta", "carta-aliada", true);
    });

    let divMaoJ2 = document.getElementById("mao-j2");
    divMaoJ2.innerHTML = "<h3>Mão do Oponente</h3>"; 
    maoJ2.forEach(cartaComprada => {
        divMaoJ2.innerHTML += criarHTMLCarta(cartaComprada, "jogarCartaInimigo", "carta-inimiga-espera", false);
    });

    // 🆕 FASE DE ABERTURA: antes do primeiro turno normal, cada lado escolhe 1 carta
    // (uma TROPA) da própria mão. As duas são reveladas e postas em campo ao mesmo tempo.
    faseAbertura = true;
    aberturaEscolhaJ1 = null;
    aberturaEscolhaJ2 = null;
    document.getElementById("texto-turno").innerText = "Fase de Abertura";
    narrar("⚔️ Escolha 1 TROPA da sua mão pra abrir o jogo. As duas cartas serão reveladas juntas!");
    let btnDado = document.getElementById("btn-rolar-dado");
    if (btnDado) btnDado.style.display = "none";

    if (typeof window.onFaseAberturaPronta === "function") window.onFaseAberturaPronta();
}

// 🆕 Registra a escolha de abertura de um jogador (1 = você, 2 = oponente) e revela
// as duas ao mesmo tempo assim que ambas estiverem prontas.
function escolherCartaAbertura(idDoPacote, jogador) {
    let pacoteCarta = document.getElementById(idDoPacote);
    if (!pacoteCarta) return;

    let idSemPacote = idDoPacote.replace("pacote-", "");
    let idBase = idSemPacote.split("_")[0];
    let infoCarta = bancoDeCartas.find(c => c.id === idBase);
    let ehSuporte = infoCarta && suportesReais.includes(infoCarta.id);
    if (ehSuporte) {
        return narrar("❌ A carta de abertura precisa ser uma TROPA — suportes/poções não podem abrir o jogo.");
    }

    if (jogador === 1) {
        if (aberturaEscolhaJ1 !== null) return narrar("⏳ Você já escolheu! Aguardando o oponente...");
        aberturaEscolhaJ1 = idDoPacote;
        pacoteCarta.classList.add("carta-selecionada-abertura");
        narrar(aberturaEscolhaJ2 === null ? "✅ Você escolheu! Aguardando o oponente escolher a dele..." : "⚔️ Revelando as cartas de abertura!");
    } else {
        if (aberturaEscolhaJ2 !== null) return;
        aberturaEscolhaJ2 = idDoPacote;
        pacoteCarta.classList.add("carta-selecionada-abertura");
        narrar(aberturaEscolhaJ1 === null ? "✅ O oponente escolheu! Aguardando você escolher a sua..." : "⚔️ Revelando as cartas de abertura!");
    }

    tentarRevelarAbertura();
}

function tentarRevelarAbertura() {
    if (aberturaEscolhaJ1 === null || aberturaEscolhaJ2 === null) return;

    let escolhaJ1 = aberturaEscolhaJ1;
    let escolhaJ2 = aberturaEscolhaJ2;
    aberturaEscolhaJ1 = null;
    aberturaEscolhaJ2 = null;
    faseAbertura = false; // libera jogarCarta/jogarCartaInimigo pra fazerem o deploy de verdade

    let c1 = document.getElementById(escolhaJ1);
    let c2 = document.getElementById(escolhaJ2);
    if (c1) c1.classList.remove("carta-selecionada-abertura");
    if (c2) c2.classList.remove("carta-selecionada-abertura");

    narrar("⚔️ Ambas as cartas de abertura foram reveladas!");
    jogarCarta(escolhaJ1);
    jogarCartaInimigo(escolhaJ2);

    let btnDado = document.getElementById("btn-rolar-dado");
    if (btnDado) btnDado.style.display = "";
    document.getElementById("texto-turno").innerText = "Role o dado pra ver quem começa!";
}

function rolarDado() {
    let dadoTela = document.getElementById("dado-tela");
    let textoTurno = document.getElementById("texto-turno");
    let painelNarrador = document.getElementById("painel-narrador");
    
    dadoTela.style.animation = 'none';
    setTimeout(() => dadoTela.style.animation = '', 10);

    if (faseAbertura === true) {
        return narrar("⏳ Escolha sua carta de abertura primeiro!");
    }

    if (!jogoIniciado) {
        let dadoJ1 = Math.floor(Math.random() * 6) + 1;
        let dadoJ2 = Math.floor(Math.random() * 6) + 1;

        if (dadoJ1 > dadoJ2) {
            dadoTela.innerText = `🎲 ${dadoJ1} x ${dadoJ2}`;
            textoTurno.innerText = "Sua Vez!";
            textoTurno.style.color = "#2ecc71"; 
            narrar("Você tirou um número maior e começa jogando!");
            turnoAtivo = 1; 
            jogoIniciado = true; 
        } 
        else if (dadoJ2 > dadoJ1) {
            dadoTela.innerText = `🎲 ${dadoJ1} x ${dadoJ2}`;
            textoTurno.innerText = "Vez do Oponente!";
            textoTurno.style.color = "#e74c3c"; 
            narrar("O oponente tirou um número maior e começa!");
            turnoAtivo = 2; 
            jogoIniciado = true; 
        }
        else {
            // 🎲 EMPATE — sem isso, o jogo ficava travado esperando alguém rolar de novo
            // sem nenhum aviso na tela.
            dadoTela.innerText = `🎲 ${dadoJ1} x ${dadoJ2}`;
            narrar("Empate! Role o dado de novo pra decidir quem começa.");
        }
    } else {
        let resultado = Math.floor(Math.random() * 6) + 1;
        dadoTela.innerText = "🎲 " + resultado;
        narrar(`O dado rolou um ${resultado}.`);
    }
}

// 🆕 Botão "Passar a Vez" — sempre disponível pra quem estiver com o turno,
// mesmo que ainda tenha ataque possível. Limpa qualquer escolha de alvo pendente
// pra garantir que o próximo turno não comece bugado.
function passarVezManual() {
    if (barrilBarbaroEmAnimacao) return narrar("🪵 Espere o Barril de Bárbaro terminar o impacto!");
    if (faseAbertura === true) return narrar("⏳ Escolha sua carta de abertura primeiro!");
    if (!jogoIniciado) return narrar("⏳ Role o dado de iniciativa primeiro!");
    // 🚨 Sem isso, dava pra clicar em "Passar a Vez" durante o turno do OPONENTE (ex: logo
    // depois de atacar, antes do bot terminar de jogar) e isso passava o turno de novo,
    // devolvendo a vez pra você no meio da jogada do bot e travando ele.
    if (turnoAtivo !== 1) return narrar("⏳ Não é a sua vez!");

    suportePreparado = null;
    modoTraicao = false;
    modoGeloSimples = false;
    modoAlvoVenenoMago = false;
    idMagoVenenoAtivo = null;
    if (typeof modoAlvoBarril !== "undefined") modoAlvoBarril = false;
    if (typeof modoAlvoBarrilBarbaro !== "undefined") modoAlvoBarrilBarbaro = false;
    if (typeof modoAlvoBarrilBarbaroInimigo !== "undefined") modoAlvoBarrilBarbaroInimigo = false;
    if (typeof modoProtecaoBarril !== "undefined") modoProtecaoBarril = false;
    if (typeof modoProtecaoBarrilInimigo !== "undefined") modoProtecaoBarrilInimigo = false;
    if (typeof idBarrilProtetor !== "undefined") idBarrilProtetor = null;
    modoAtaque = false;
    modoAtaqueInimigo = false;

    ignorarInterceptacaoSeparadoUmaVez = true;
    passarTurno();
}

function passarTurno() {
    // Se alguma ação ou o botão manual encerrou o turno antes do aviso de congelamento,
    // cancela o passe agendado para ele não atingir o jogador seguinte.
    if (passagemAutomaticaGeloPendente !== null) {
        clearTimeout(passagemAutomaticaGeloPendente);
        passagemAutomaticaGeloPendente = null;
    }

    // O Especial do Separado precisa sobreviver a TODOS os caminhos de ataque. Algumas
    // cartas (Cavaleiro, Barris, Mensageiro etc.) encerram a jogada diretamente aqui e
    // não passam pelo resolvedor do ataque comum. Por isso o registro da dupla acontece
    // no ponto central de troca de turno: o primeiro integrante segura a vez; o segundo
    // libera a troca normalmente, independentemente de qual deles começou.
    if (!ignorarInterceptacaoSeparadoUmaVez && ultimoIdQueAtacou) {
        let estadoSeparado = finalizarAtaqueSeparadoDividido(ultimoIdQueAtacou, turnoAtivo === 2);
        if (estadoSeparado === "aguardando") {
            modoAtaque = false;
            modoAtaqueInimigo = false;
            danoPreparado = 0;
            danoInimigoPreparado = 0;
            ultimoIdQueAtacou = null;
            return;
        }
    }
    ignorarInterceptacaoSeparadoUmaVez = false;

    // 1. CHECAGEM DE REATAQUES (Se ativar, sai da função sem passar o turno)
    if (ultimoIdQueAtacou && goblinAtaquesGanhos[ultimoIdQueAtacou] === true) {
        goblinAtaquesGanhos[ultimoIdQueAtacou] = false; 
        ativarEfeitoVelocidade(ultimoIdQueAtacou);
        narrar("🔥 PASSIVA: O Goblin ganhou o direito de atacar mais uma vez nesta rodada!");
        return; 
    }

    if (ultimoIdQueAtacou && pocaoVeluxAtiva[ultimoIdQueAtacou] === true) {
        pocaoVeluxAtiva[ultimoIdQueAtacou] = false; 
        ativarEfeitoVelocidade(ultimoIdQueAtacou);
        narrar(barrilJaImpactou[ultimoIdQueAtacou]
            ? "⚡ EFEITO VELUX: Escolha outra carta inimiga para os goblins do Barril migrarem. O Barril não será lançado de novo."
            : "⚡ EFEITO VELUX: Na velocidade da luz! A carta que acabou de atacar tem direito a MAIS UM ATAQUE agora!");
        return; 
    }

    // Chegou aqui depois que todos os ataques extras dessa carta foram usados.
    if (ultimoIdQueAtacou) removerEfeitoVelocidade(ultimoIdQueAtacou);
    
    // 2. RESET DE VARIÁVEIS DA RODADA
    goblinJaAtacouNesteTurno = {};
    
    goblinAtaquesGanhos = {};
    ultimoIdQueAtacou = null;
    ladraoUsosPorCarta = {}; // libera separadamente a tentativa de cada Ladrão no próximo turno
    
    // Inverte o turno de 1 para 2 ou de 2 para 1
    turnoAtivo = (turnoAtivo === 1) ? 2 : 1;
    
    modoAtaque = false;
    modoAtaqueInimigo = false;
    danoPreparado = 0;
    danoInimigoPreparado = 0;
    
    modoAlvoBarril = false;
    modoAlvoBarrilInimigo = false;
    idBarrilAtivo = null;
    modoAlvoVenenoMago = false;
    idMagoVenenoAtivo = null;

    // 3. ATUALIZAÇÃO DO TEXTO DA INTERFACE
    let containerTurno = document.getElementById("texto-turno");
    if (containerTurno) {
        if (turnoAtivo === 1) {
            containerTurno.innerText = "Sua Vez!";
            containerTurno.style.color = "#2ecc71"; 
        } else {
            containerTurno.innerText = "Vez do Oponente!";
            containerTurno.style.color = "#e74c3c"; 
        }
    }

    // Narração do início do turno
    if (turnoAtivo === 1) {
        narrar("🔵 Seu turno começou! Planeje bem seus ataques.");
    } else {
        narrar("🔴 Turno do Oponente iniciado! Prepare-se para defender.");
    }

    // 4. --- MALDIÇÃO DO BARRIL DE GOBLINS (Dano por rodada) ---
    if (typeof alvosDoBarril !== 'undefined') {
        Object.keys(alvosDoBarril).forEach(idBarril => {
            let idAlvo = alvosDoBarril[idBarril];
            let resultado = aplicarDanoPeriodicoBarrilGoblin(idBarril, idAlvo);
            if (!resultado) return;

            if (resultado.destruido) {
                narrar(`💀 Os Goblins do Barril causaram ${resultado.danoTotal} de dano e derrotaram [${resultado.nomeAlvo}]!`);
            } else {
                narrar(`⚔️ Os Goblins do Barril atacaram [${resultado.nomeAlvo}] causando ${resultado.danoTotal} de dano no fim do turno! Vida restante: ${resultado.novaVida}.`);
            }
        });
    }

    // 4.1 --- VENENO DO MAGO ---
    // Duas rodadas completas equivalem a quatro passagens de turno. Depois de aplicado,
    // o veneno pertence ao alvo e continua mesmo que o Mago seja derrotado.
    Object.keys(venenosMago).forEach(idEfeitoVeneno => {
        let efeito = venenosMago[idEfeitoVeneno];
        let pacoteAlvo = document.getElementById("pacote-" + efeito.idAlvo);

        if (!pacoteAlvo) {
            removerVenenoDoMago(idEfeitoVeneno);
            return;
        }

        pacoteAlvo.classList.add("envenenada");
        let nomeAlvo = pacoteAlvo.querySelector(".nome-carta").innerText.trim();
        let alvoEhInimigo = pacoteAlvo.closest("#campo-j2") !== null;
        aplicarDanoDireto(pacoteAlvo.id, 0.5, alvoEhInimigo);
        efeito.restam--;

        if (efeito.restam <= 0 || !document.getElementById(pacoteAlvo.id)) {
            removerVenenoDoMago(idEfeitoVeneno);
            narrar(`☠️ ${nomeAlvo} sofreu os últimos 0,5 de dano. O veneno acabou!`);
        } else {
            narrar(`☠️ O veneno causou 0,5 de dano em ${nomeAlvo}! Restam ${efeito.restam} jogadas.`);
        }
    });

    // 5. ⏳ LIMPEZA DE FADIGA DO NECROMANTE (Duração de 1 Rodada = 2 trocas de turno)
    // 🩹 CORREÇÃO: antes tentava adivinhar o lado da carta pelo ID conter "inimigo",
    // mas os tokens do Necromante (ex: "necro_xxxx") nunca têm essa palavra no nome,
    // então os tokens do OPONENTE tinham a fadiga liberada cedo demais (quase na hora).
    // Agora é um contador de verdade: desconta 1 a cada troca de turno, dos dois lados igual.
    if (typeof bloqueioNecro !== 'undefined') {
        for (let idCarta in bloqueioNecro) {
            bloqueioNecro[idCarta]--;
            if (bloqueioNecro[idCarta] <= 0) {
                delete bloqueioNecro[idCarta];
            }
        }
    }

    // 6. ❄️ SISTEMA DE DEGELO — todos os gelos ganharam +1 rodada (= +2 passagens)
    if (typeof duracaoGelo !== 'undefined' && duracaoGelo !== null) {
        Object.keys(duracaoGelo).forEach(idCarta => {
            duracaoGelo[idCarta]--; // Reduz 1 turno do relógio do gelo
            
            // Se o tempo acabou, o gelo derrete
            if (duracaoGelo[idCarta] <= 0) {
                let pacote = document.getElementById("pacote-" + idCarta);
                
                // 🔍 TRADUTOR DE NOME: Transforma o ID feio no Nome Real
                let nomeReal = "Uma carta"; 
                let idBase = idCarta.split('_')[0]; // Corta o "_0" ou "_inimigo_0" e pega só a base
                
                if (typeof bancoDeCartas !== 'undefined') {
                    let cartaInfo = bancoDeCartas.find(c => c.id === idBase);
                    if (cartaInfo) nomeReal = cartaInfo.nome;
                }

                if (pacote) {
                    pacote.classList.remove("congelada");
                    pacote.style.filter = "none"; // 🚨 ADICIONAMOS ISSO AQUI: Remove a cor azul do Bumerskeleton!
                    removerGeloVisualBumerskeleton(idCarta);
                    narrar(`☀️ O gelo derreteu! ${nomeReal} se libertou!`);
                }
                delete duracaoGelo[idCarta]; 
            }
        });
    }

    // 6.5 🐴 CAVALO DE TRÓIA — contagem regressiva até a explosão (1 de dano em TODAS as cartas
    // inimigas: campo, mão e também a reserva futura do modo Ondas), depois o Cavalo some.
    if (typeof cavalosDeTroiaAtivos !== 'undefined') {
        Object.keys(cavalosDeTroiaAtivos).forEach(idCarta => {
            cavalosDeTroiaAtivos[idCarta]--;
            if (cavalosDeTroiaAtivos[idCarta] <= 0) {
                let pacoteCavalo = document.getElementById("pacote-" + idCarta);
                if (pacoteCavalo) {
                    let ladoCavalo = pacoteCavalo.closest("#campo-j2") ? "j2" : "j1";
                    let ladoInimigo = (ladoCavalo === "j1") ? "j2" : "j1";
                    animarEstilhacosCavaloTroia(pacoteCavalo, ladoInimigo);
                    let resultadoTroia = aplicarDanoCavaloDeTroia(ladoInimigo, 1);
                    let textoReserva = resultadoTroia.reservaAtingida > 0
                        ? ` e ${resultadoTroia.reservaAtingida} da reserva das próximas ondas`
                        : "";
                    let textoEliminadas = resultadoTroia.reservaEliminada === 1
                        ? " Uma carta foi derrotada antes de entrar em campo!"
                        : resultadoTroia.reservaEliminada > 1
                            ? ` ${resultadoTroia.reservaEliminada} cartas foram derrotadas antes de entrar em campo!`
                            : "";
                    narrar(`🐴 SURPRESA! O Cavalo de Tróia se abriu e atingiu TODAS as cartas inimigas do campo e da mão${textoReserva} com 1 de dano!${textoEliminadas}`);
                    pacoteCavalo.remove();
                }
                delete cavalosDeTroiaAtivos[idCarta];
            }
        });
    }

    // 6.6 🔥 FOGUEIRA — contagem regressiva até a 2ª cura (a última rodada de +1 de vida).
    if (typeof fogueiraTicks !== 'undefined') {
        ["j1", "j2"].forEach(lado => {
            for (let i = fogueiraTicks[lado].length - 1; i >= 0; i--) {
                // Compatibilidade com partidas antigas que ainda tenham guardado apenas um número.
                if (typeof fogueiraTicks[lado][i] === "number") {
                    fogueiraTicks[lado][i] = { restam: fogueiraTicks[lado][i], visualId: null };
                }

                let efeitoFogueira = fogueiraTicks[lado][i];
                efeitoFogueira.restam--;
                if (efeitoFogueira.restam <= 0) {
                    narrar(`🔥 A Fogueira do time ${lado === "j1" ? "aliado" : "inimigo"} deu sua última cura: +1 de vida em todas as tropas (campo e mão)!`);
                    animarCuraColetivaFogueira(efeitoFogueira.visualId, lado);
                    curarTodosAliados(lado, 1);
                    setTimeout(() => apagarVisualFogueira(efeitoFogueira.visualId), 430);
                    fogueiraTicks[lado].splice(i, 1);
                }
            }
        });
    }

    // 6.65 🛸 PORTABLE — contagem regressiva da bateria (2 rodadas = 4 passagens de turno);
    // quando acaba, a bateria acaba de vez e ele some do campo (sem nenhum efeito extra).
    if (typeof portableDuracao !== 'undefined') {
        Object.keys(portableDuracao).forEach(idCarta => {
            portableDuracao[idCarta]--;
            if (portableDuracao[idCarta] <= 0) {
                let pacotePortable = document.getElementById("pacote-" + idCarta);
                if (pacotePortable) {
                    narrar("🛸 A bateria do Portable acabou e ele saiu de campo!");
                    animarQuedaEQuebraPortable(pacotePortable);
                    pacotePortable.remove();
                }
                delete portableDuracao[idCarta];
            }
        });
    }

    // 6.66 💥 ALLSFORMS — contagem regressiva dos buffs de +3 dano (1 rodada = 2 passagens de
    // turno); cada buff é revertido individualmente quando o dele acaba (dá pra empilhar vários).
    if (typeof buffsAllsforms !== 'undefined') {
        Object.keys(buffsAllsforms).forEach(idCarta => {
            let lista = buffsAllsforms[idCarta];
            for (let i = lista.length - 1; i >= 0; i--) {
                lista[i].restam--;
                if (lista[i].restam <= 0) {
                    let txtDano = document.getElementById("dano-" + idCarta);
                    if (txtDano) {
                        let danoAtual = parseFloat(txtDano.innerText) || 0;
                        txtDano.innerText = Math.max(0, danoAtual - lista[i].bonus);
                    }
                    lista.splice(i, 1);
                }
            }
            if (lista.length === 0) delete buffsAllsforms[idCarta];
        });
    }

    // 6.7 🔥 INCENDIÁRIO — avança o ciclo de cada um em campo (1=jogou pólvora, 2/3=queima,
    // 4=parado, e no "5º turno" volta pra 1 e joga pólvora de novo, sozinho, sem precisar
    // de nenhum clique em Atacar).
    if (typeof incendiarioCiclo !== 'undefined') {
        Object.keys(incendiarioCiclo).forEach(idInc => {
            let faseAtual = incendiarioCiclo[idInc];
            let proximaFase = faseAtual >= 4 ? 1 : faseAtual + 1;
            executarFaseIncendiario(idInc, proximaFase);
            if (typeof incendiarioCiclo[idInc] !== 'undefined') incendiarioCiclo[idInc] = proximaFase;
        });
    }

    // 👥 O 6 do Separado é uma conquista permanente, não um efeito de uma rodada.
    // Toda vez que o turno do time da dupla começa, os dois ataques separados ficam
    // prontos outra vez sem exigir um novo Especial nem uma nova rolagem de dado.
    prepararEspeciaisFixosSeparadoDoTurno();

    // 7. ATUALIZAÇÃO VISUAL DAS UNIÕES
    if (typeof atualizarTodosUnidoes === "function") {
        atualizarTodosUnidoes();
    }

    // 🚨 8. VERIFICADOR DE APAGÃO POR GELO AUTOMÁTICO
    // Executa logo após o turno mudar para verificar se o jogador atual está travado
    if (typeof verificarBloqueioTotalGelo === "function") {
        if (turnoAtivo === 1) {
            verificarBloqueioTotalGelo("j1");
        } else {
            verificarBloqueioTotalGelo("j2");
        }
    }
}

function verificarBloqueioTotalGelo(idJogador) {
    let campo = document.getElementById("campo-" + idJogador);
    if (!campo) return false;

    // Só a ARENA importa. Antes a mão entrava na conta, então uma poção ou suporte não
    // congelado escondia o bloqueio mesmo sem existir atacante disponível em campo.
    let cartasNaArena = Array.from(campo.querySelectorAll("div[id^='pacote-']"));
    let todasCongeladas = cartasNaArena.length > 0 && cartasNaArena.every(pacote => pacote.classList.contains("congelada"));

    if (todasCongeladas) {
        let quem = idJogador === "j1" ? "Você está" : "O Oponente está";
        let turnoEsperado = idJogador === "j1" ? 1 : 2;
        
        narrar(`🥶 ${quem} com todas as cartas da arena congeladas e sem ataque possível! Passando o turno...`);
        
        // Espera 1,5 segundo para o aviso ser lido. Depois confirma que ainda é o mesmo
        // turno e que nenhuma carta descongelou ou entrou na arena nesse intervalo.
        passagemAutomaticaGeloPendente = setTimeout(() => {
            passagemAutomaticaGeloPendente = null;
            let campoAtual = document.getElementById("campo-" + idJogador);
            let cartasAtuais = campoAtual ? Array.from(campoAtual.querySelectorAll("div[id^='pacote-']")) : [];
            let continuaSemAtaque = cartasAtuais.length > 0 && cartasAtuais.every(pacote => pacote.classList.contains("congelada"));

            if (turnoAtivo === turnoEsperado && continuaSemAtaque) passarTurno();
        }, 1500);
        
        return true;
    }
    return false;
}

function invocarToken(idBaseCarta, idCampo) {
    let cartaBase = bancoDeCartas.find(c => c.id === idBaseCarta);
    if (!cartaBase) return;
    
    let idUnico = idBaseCarta + "-" + Math.floor(Math.random() * 10000);
    let novaCarta = { ...cartaBase, idUnico: idUnico };
    
    let ehAliado = idCampo === "campo-j1";
    let html = criarHTMLCarta(novaCarta, ehAliado ? "jogarCarta" : "jogarCartaInimigo", ehAliado ? "carta-aliada" : "carta-inimiga", ehAliado);
    
    let tempDiv = document.createElement("div");
    tempDiv.innerHTML = html.trim();
    let pacoteNovo = tempDiv.firstChild;
    
    document.getElementById(idCampo).appendChild(pacoteNovo);

    let img = pacoteNovo.querySelector("img");
    img.removeAttribute("onclick");
    
    img.onclick = function() {
        let idDoPacote = "pacote-" + idUnico;
        let idSemPacote = idUnico;
        
        if (modoLadrao === true) resolverCliqueRouboLadrao(idDoPacote);
        else if (modoAlvoBarril === true && !ehAliado) aplicarAlvoBarril(idDoPacote);
        else if ((modoAlvoBarrilBarbaro === true || modoAlvoBarrilBarbaroInimigo === true)) aplicarAlvoBarrilBarbaro(idDoPacote);
        else if (typeof modoEspecialBarrilGoblin !== 'undefined' && modoEspecialBarrilGoblin === true) aplicarAlvoBarril(idDoPacote, true);
        else if (typeof modoEspecialBumerskeleton !== 'undefined' && modoEspecialBumerskeleton === true) aplicarEspecialBumerskeletonAntesDeAtacar(idDoPacote);
        else if (modoCura === true && ehAliado) aplicarCuraAliada(idDoPacote);
        else if (modoCuraInimigo === true && !ehAliado) aplicarCuraInimiga(idDoPacote);
        else if (modoAtaqueInimigo === true && ehAliado) aplicarDanoInimigo(idDoPacote);
        else if (modoRouboGoblin === true) aplicarRouboDanoGoblin(idDoPacote);
        // Goblins nascidos do Ork também podem ser escolhidos como parceiros.
        else if (modoParceriaSeparado === true) aplicarParceriaSeparado(idDoPacote);
        // ⚔️ CAVALEIRO DAS TREVAS — tokens invocados também podem ser alvos da área.
        else if (modoAlvoCavaleiro === true && !ehAliado) aplicarAlvoCavaleiro(idDoPacote);
        else if (modoAlvoCavaleiroInimigo === true && ehAliado) aplicarAlvoCavaleiroInimigo(idDoPacote);
        // 🧪 2º PRIORIDADE: BRUXO (TRANSFORMAR 4)
        else if (typeof modoBruxoTransformar !== 'undefined' && modoBruxoTransformar === true) {
            let totalTransformado = transformarFamiliaSlimeEmPocao(idDoPacote);
            gerarPocaoAleatoria("mao-j1"); 
            modoBruxoTransformar = false;
            idBruxoAtivo = null;
            narrar(totalTransformado > 1
                ? `✨ ZAP! A família Slime inteira (${totalTransformado} cartas) virou uma única Poção para você!`
                : "✨ ZAP! A carta inimiga virou pó e o Bruxo criou uma Poção para você!");
            return; 
        }

        // 🔮 3º PRIORIDADE: BRUXO (ROUBAR 6)
        else if (typeof modoBruxoRoubar !== 'undefined' && modoBruxoRoubar === true) {
            let idAlvo = idDoPacote.replace("pacote-", "");
            converterCartaRoubadaPeloBruxo(idAlvo, true); // 🩹 rouba e preserva também passivas especiais como a do Slime
            
            let pacoteBruxo = document.getElementById("pacote-" + idBruxoAtivo);
            if (pacoteBruxo) pacoteBruxo.remove(); // Bruxo some
            
            gerarPocaoAleatoria("mao-j1"); // Bruxo vira poção na sua mão
            modoBruxoRoubar = false;
            idBruxoAtivo = null;
            narrar("Dominação Mental! Carta roubada e o Bruxo recuou como Poção!");
            return;
        }
        else if (modoProtecaoBarril === true) {
            if (vincularProtecaoBarril(idSemPacote, idBarrilProtetor)) {
                modoProtecaoBarril = false; idBarrilProtetor = null;
            }
        }
        else if (modoProtecaoBarrilInimigo === true) {
            if (vincularProtecaoBarril(idSemPacote, idBarrilProtetor)) {
                modoProtecaoBarrilInimigo = false; idBarrilProtetor = null;
            }
        }
        else if (suportePreparado !== null) {
            if (ehAliado && !idItemNaMao.includes("inimigo")) equiparSuporte(idSemPacote);
            else if (!ehAliado && idItemNaMao.includes("inimigo")) equiparSuporte(idSemPacote);
            else narrar("Ação inválida para este suporte!");
        }
        else if (ehAliado) iniciarAtaque(novaCarta.nome, idUnico);
        else receberAtaque("vida-" + idSemPacote, idDoPacote);
    };
    
    let divAcoes = pacoteNovo.querySelector("div[id^='acoes-']");
    if (divAcoes) divAcoes.style.display = "block";

    atualizarTodosUnidoes();
    return pacoteNovo;
}
function invocarTokenPeloNomeSemHabilidade(nomeCarta, idCampo) {
    let cartaBase = bancoDeCartas.find(c => c.nome === nomeCarta);
    if (!cartaBase) return;
    
    let idUnico = cartaBase.id + "-token-" + Math.floor(Math.random() * 10000);
    let novaCarta = { ...cartaBase, idUnico: idUnico };
    
    let ehAliado = idCampo === "campo-j1";
    let html = criarHTMLCarta(novaCarta, ehAliado ? "jogarCarta" : "jogarCartaInimigo", ehAliado ? "carta-aliada" : "carta-inimiga", ehAliado);
    
    let tempDiv = document.createElement("div");
    tempDiv.innerHTML = html.trim();
    let pacoteNovo = tempDiv.firstChild;
    
    document.getElementById(idCampo).appendChild(pacoteNovo);

    let img = pacoteNovo.querySelector("img") || pacoteNovo.querySelector(".imagem-carta");
    if (img) {
        img.removeAttribute("onclick");
        img.onclick = function() {
            let idDoPacote = "pacote-" + idUnico;
            let idSemPacote = idUnico;

            // ❄️ POÇÃO DE GELO (ALVO SIMPLES) — faltava nos tokens
            if (typeof modoGeloSimples !== 'undefined' && modoGeloSimples === true) {
                let pacoteAlvo = document.getElementById(idDoPacote);
                let pacotePocao = document.getElementById("pacote-" + idPocaoAtiva);
                let quemJogouGelo = pacotePocao && pacotePocao.parentElement ? pacotePocao.parentElement.id : "";
                let alvoEhJ1 = pacoteAlvo.closest("#campo-j1") !== null || pacoteAlvo.closest("#mao-j1") !== null;
                let alvoEhJ2 = pacoteAlvo.closest("#campo-j2") !== null || pacoteAlvo.closest("#mao-j2") !== null;
                if ((quemJogouGelo.includes("j1") && alvoEhJ1) || (quemJogouGelo.includes("j2") && alvoEhJ2)) {
                    return narrar("❌ Alvo inválido! A Poção de Gelo só pode ser usada em cartas do OPONENTE.");
                }
                pacoteAlvo.classList.add("congelada");
                duracaoGelo[idSemPacote] = 3; // Gelo Simples: duração menor que os efeitos em área
                if (pacotePocao) pacotePocao.remove();
                modoGeloSimples = false;
                idPocaoAtiva = null;
                narrar("❄️ Alvo atingido e congelado pelo Gelo Simples!");
                return;
            }

            // 🛡️ ADICIONADO: Interceção para criar vínculo no Token Aliado
            if (typeof modoProtecaoBarril !== 'undefined' && modoProtecaoBarril && ehAliado) {
                if (vincularProtecaoBarril(idSemPacote, idBarrilProtetor)) {
                    modoProtecaoBarril = false; idBarrilProtetor = null;
                }
                return;
            }
            // 🛡️ ADICIONADO: Interceção para criar vínculo no Token Inimigo
            else if (typeof modoProtecaoBarrilInimigo !== 'undefined' && modoProtecaoBarrilInimigo && !ehAliado) {
                if (vincularProtecaoBarril(idSemPacote, idBarrilProtetor)) {
                    modoProtecaoBarrilInimigo = false; idBarrilProtetor = null;
                }
                return;
            }
            else if (typeof modoTraicao !== 'undefined' && modoTraicao) { executarTraicao(idDoPacote); return; }
            // 💰 LADRÃO — o lado correto vem da posição do Ladrão ativo, não do turno.
            else if (typeof modoLadrao !== 'undefined' && modoLadrao === true) resolverCliqueRouboLadrao(idDoPacote);
            else if (typeof modoAtaqueInimigo !== 'undefined' && modoAtaqueInimigo && ehAliado) aplicarDanoInimigo(idDoPacote);
            else if (typeof modoCura !== 'undefined' && modoCura && ehAliado) aplicarCuraAliada(idDoPacote);
            else if (typeof modoCuraInimigo !== 'undefined' && modoCuraInimigo && !ehAliado) aplicarCuraInimiga(idDoPacote);
            // 🩸 ROUBO DE DANO DO GOBLIN — faltava nos tokens
            else if (typeof modoRouboGoblin !== 'undefined' && modoRouboGoblin === true) aplicarRouboDanoGoblin(idDoPacote);
            else if (typeof modoAlvoBarril !== 'undefined' && modoAlvoBarril && !ehAliado) aplicarAlvoBarril(idDoPacote);
            else if (typeof modoAlvoBarrilBarbaro !== 'undefined' && (modoAlvoBarrilBarbaro || modoAlvoBarrilBarbaroInimigo)) aplicarAlvoBarrilBarbaro(idDoPacote);
            else if (typeof modoEspecialBarrilGoblin !== 'undefined' && modoEspecialBarrilGoblin === true) aplicarAlvoBarril(idDoPacote, true);
            else if (typeof modoEspecialBumerskeleton !== 'undefined' && modoEspecialBumerskeleton === true) aplicarEspecialBumerskeletonAntesDeAtacar(idDoPacote);
            // ⚔️ CAVALEIRO DAS TREVAS — faltava nos tokens (as duas direções)
            else if (typeof modoAlvoCavaleiro !== 'undefined' && modoAlvoCavaleiro === true && !ehAliado) aplicarAlvoCavaleiro(idDoPacote);
            else if (typeof modoAlvoCavaleiroInimigo !== 'undefined' && modoAlvoCavaleiroInimigo === true && ehAliado) aplicarAlvoCavaleiroInimigo(idDoPacote);
            // 🎨 ÍCARO / ⚖️ THIAGO / 👥 SEPARADO / ⏳ VIAJANTE DO TEMPO — faltavam nos tokens
            else if (typeof modoTransformacaoIcaro !== 'undefined' && modoTransformacaoIcaro === true && cliquePodeResolverAcaoPendente(idIcaroAtivo)) aplicarTransformacaoIcaro(idDoPacote);
            else if (typeof modoAjusteThiago !== 'undefined' && modoAjusteThiago === true && cliquePodeResolverAcaoPendente(idThiagoAtivo)) aplicarAjusteThiago(idDoPacote);
            else if (typeof modoParceriaSeparado !== 'undefined' && modoParceriaSeparado === true) aplicarParceriaSeparado(idDoPacote);
            else if (typeof modoPrenderNoTempo !== 'undefined' && modoPrenderNoTempo === true) aplicarPrenderNoTempo(idDoPacote);
            else if (typeof suportePreparado !== 'undefined' && suportePreparado !== null) equiparSuporte(idSemPacote);
            else if (ehAliado) iniciarAtaque(novaCarta.nome, idSemPacote);
            else receberAtaque("vida-" + idSemPacote, idDoPacote);
        };
    }
    
    let divAcoes = pacoteNovo.querySelector("div[id^='acoes-']");
    if (divAcoes) {
        divAcoes.style.display = "block";
        let btnEspecial = divAcoes.querySelector("button[onclick*='usarHabilidade']");
        if (btnEspecial) btnEspecial.remove(); 
    }

    pacoteNovo.querySelector(".nome-carta").innerText += " (S/Hab)";

    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
    return pacoteNovo;
}

// 🩹 CORREÇÃO: depois do Bruxo roubar uma carta, ela só era MOVIDA de lado (appendChild),
// mas continuava com a classe CSS e o botão "Atacar" do dono ORIGINAL — por isso não dava
// pra atacar com ela depois. Esta função reconstrói a cartinha do zero (preservando vida
// e dano atuais) já com a classe, o botão de ataque e o clique de batalha do NOVO dono.
function converterCartaRoubada(idUnico, novoDonoEhJ1) {
    let pacoteAtual = document.getElementById("pacote-" + idUnico);
    if (!pacoteAtual) return;

    let nome = pacoteAtual.querySelector(".nome-carta").innerText.trim();
    let imgSrc = pacoteAtual.querySelector("img").getAttribute("src");
    let vidaEl = document.getElementById("vida-" + idUnico);
    let danoEl = document.getElementById("dano-" + idUnico);
    let vidaAtual = vidaEl ? vidaEl.innerText : "0";
    let danoAtual = danoEl ? danoEl.innerText : "0";
    let estavaCongelada = pacoteAtual.classList.contains("congelada");
    // O Esqueleto é reconstruído pelo roubo do Bruxo. Guardamos a família
    // antes de trocar o elemento para religar sua passiva no novo lado.
    let familiaEsqueletoRoubado = pacoteAtual.dataset.inimigoEspecial === "esqueleto"
        ? pacoteAtual.dataset.esqueletoFamilia
        : null;
    let eraZumbi = pacoteAtual.dataset.inimigoEspecial === "zumbi";
    let eraAicer = pacoteAtual.dataset.inimigoEspecial === "aicer";
    let eraEcto = pacoteAtual.dataset.inimigoEspecial === "ecto";
    let eraFraguer = pacoteAtual.dataset.inimigoEspecial === "fraguer";
    let eraFraguerFundido = pacoteAtual.dataset.inimigoEspecial === "fraguer-fundido";
    let eraSpiritista = pacoteAtual.dataset.inimigoEspecial === "spiritista";
    let eraSeteNegativo = pacoteAtual.dataset.inimigoEspecial === "sete-negativo";
    // O bônus do Fraguer pertence à quantidade de aliados do lado antigo.
    // No roubo conservamos apenas seu dano próprio; o novo grupo recalcula o bônus.
    if (eraFraguer) {
        let bonusFraguerAnterior = Number(pacoteAtual.dataset.fraguerBonus) || 0;
        danoAtual = String(Math.max(0, (parseFloat(danoAtual) || 0) - bonusFraguerAnterior));
    }

    let cartaObj = { nome: nome, idUnico: idUnico, img: imgSrc, vida: vidaAtual, dano: danoAtual };
    let classeCss = novoDonoEhJ1 ? "carta-aliada" : "carta-inimiga";
    let funcaoJogar = novoDonoEhJ1 ? "jogarCarta" : "jogarCartaInimigo";
    let html = criarHTMLCarta(cartaObj, funcaoJogar, classeCss, novoDonoEhJ1);

    let temp = document.createElement("div");
    temp.innerHTML = html.trim();
    let novoElemento = temp.firstElementChild;

    let campoDestino = document.getElementById(novoDonoEhJ1 ? "campo-j1" : "campo-j2");
    campoDestino.appendChild(novoElemento);
    pacoteAtual.remove();

    if (estavaCongelada) novoElemento.classList.add("congelada");

    // Faz a carta "entrar em modo de batalha" de verdade (ataque, traição, etc já funcionando)
    if (novoDonoEhJ1) jogarCarta("pacote-" + idUnico);
    else jogarCartaInimigo("pacote-" + idUnico);

    if (familiaEsqueletoRoubado !== null
        && typeof window.rpgRestaurarEsqueletoRoubado === "function") {
        window.rpgRestaurarEsqueletoRoubado(idUnico, novoDonoEhJ1, familiaEsqueletoRoubado);
    }
    if (eraZumbi && typeof window.rpgRegistrarZumbi === "function") {
        window.rpgRegistrarZumbi(idUnico, novoDonoEhJ1);
    }
    if (eraAicer && typeof window.rpgRegistrarAicer === "function") {
        window.rpgRegistrarAicer(idUnico, novoDonoEhJ1);
    }
    if (eraEcto && typeof window.rpgRegistrarEcto === "function") {
        window.rpgRegistrarEcto(idUnico, novoDonoEhJ1);
    }
    if ((eraFraguer || eraFraguerFundido) && typeof window.rpgRegistrarFraguer === "function") {
        window.rpgRegistrarFraguer(idUnico, novoDonoEhJ1, eraFraguerFundido);
    }
    if (eraSpiritista && typeof window.rpgRegistrarSpiritista === "function") {
        window.rpgRegistrarSpiritista(idUnico, novoDonoEhJ1);
    }
    if (eraSeteNegativo && typeof window.rpgRegistrarSeteNegativo === "function") {
        window.rpgRegistrarSeteNegativo(idUnico, novoDonoEhJ1);
    }
    if (cartaSilenciadaPeloEcto(idUnico)) aplicarInterfaceSilencioEcto(idUnico);

    return novoElemento;
}

// Roubar um Slime significa roubar a família inteira. Cada integrante preserva
// a vida e o dano atuais, todos mudam de lado e continuam ligados no mesmo estágio.
function converterCartaRoubadaPeloBruxo(idUnico, novoDonoEhJ1) {
    let idsFamilia = typeof window.rpgObterIdsFamiliaSlime === "function"
        ? window.rpgObterIdsFamiliaSlime(idUnico)
        : [];

    if (idsFamilia.length === 0
        || typeof window.rpgPrepararRouboFamiliaSlime !== "function"
        || typeof window.rpgRegistrarFamiliaSlimeRoubada !== "function") {
        return converterCartaRoubada(idUnico, novoDonoEhJ1);
    }

    let transferencia = window.rpgPrepararRouboFamiliaSlime(idUnico);
    if (!transferencia) return converterCartaRoubada(idUnico, novoDonoEhJ1);

    let cartaEscolhida = null;
    let idsConvertidos = [];
    transferencia.membros.forEach(idMembro => {
        let convertida = converterCartaRoubada(idMembro, novoDonoEhJ1);
        if (convertida) {
            idsConvertidos.push(idMembro);
            if (idMembro === idUnico) cartaEscolhida = convertida;
        }
    });
    window.rpgRegistrarFamiliaSlimeRoubada(idsConvertidos, novoDonoEhJ1, transferencia.estagio);
    return cartaEscolhida || (idsConvertidos.length > 0 ? document.getElementById("pacote-" + idsConvertidos[0]) : null);
}

// 🧟 ZUMBI — remove os bônus, penalidades e estados acumulados da vítima antes
// de ela trocar de lado. A identidade e a habilidade natural da carta continuam;
// o que é apagado são somente as alterações conquistadas durante a partida.
function limparEstadosDaVitimaZumbi(idUnico) {
    [bonusUnidao, goblinJaAtacouNesteTurno, goblinAtaquesGanhos, viajantesJaUsaram,
        bloqueioNecro, pocaoVeluxAtiva, escudoGuerreiro, barrilJaImpactou,
        splashBarbaroAtivo, duracaoGelo, geloBumerskeletonAtivos,
        especialFixoBumerskeleton, recargaGeloBumerskeleton, especialFixoSeparado, bonusVampi7Sozinho,
        cartasCongeladas, cavalosDeTroiaAtivos, incendiarioCiclo,
        incendiarioFasesVisuais, separadaoDividido, separadaoAtacantesNaSequencia,
        portableDuracao, buffsAllsforms, unidadesVivasTrios, ctrlV
    ].forEach(estadoCarta => {
        if (estadoCarta && typeof estadoCarta === "object") delete estadoCarta[idUnico];
    });
    if (typeof orkBuffado !== "undefined") delete orkBuffado[idUnico];
    if (typeof ladroesQueJaRoubaram !== "undefined") delete ladroesQueJaRoubaram[idUnico];
    if (typeof cavaleiroAtivado !== "undefined") delete cavaleiroAtivado[idUnico];
    if (typeof window.mensageirosEmArea !== "undefined") delete window.mensageirosEmArea[idUnico];
    delete cartasSilenciadasEcto[idUnico];

    Object.keys(venenosMago).forEach(idEfeito => {
        if (venenosMago[idEfeito] && venenosMago[idEfeito].idAlvo === idUnico) delete venenosMago[idEfeito];
    });
    Object.keys(alvosDoBarril).forEach(idBarril => {
        if (idBarril === idUnico || alvosDoBarril[idBarril] === idUnico) delete alvosDoBarril[idBarril];
    });
    Object.keys(cartasProtegidas).forEach(idProtegido => {
        if (idProtegido === idUnico || cartasProtegidas[idProtegido] === idUnico) delete cartasProtegidas[idProtegido];
    });
    Object.keys(incendiarioAlvos).forEach(idIncendiario => {
        incendiarioAlvos[idIncendiario] = (incendiarioAlvos[idIncendiario] || []).filter(id => id !== idUnico);
    });
    Object.keys(parceriaSeparado).forEach(idSeparado => {
        if (idSeparado === idUnico || parceriaSeparado[idSeparado] === idUnico) {
            delete parceriaSeparado[idSeparado];
            delete separadaoDividido[idSeparado];
            delete separadaoAtacantesNaSequencia[idSeparado];
        }
    });
}

function finalizarVisualVitimaZumbi(idUnico) {
    let pacote = document.getElementById("pacote-" + idUnico);
    if (!pacote) return;
    pacote.classList.remove("congelada", "carta-envenenada-mago", "carta-com-polvora", "carta-em-chamas");
    pacote.style.filter = "none";
    pacote.querySelectorAll(".aura-veneno-mago, .fumaca-veneno-mago, .efeito-gelo-bumerskeleton, .aura-escudo-carta, .escudo-fosco-carta").forEach(el => el.remove());
}

// Converte a carta no próprio campo do Zumbi. Vida e dano voltam aos valores
// originais, com a única exceção da vida, que nasce pela metade.
function converterVitimaZumbi(idUnico, novoDonoEhJ1) {
    let pacoteOriginal = document.getElementById("pacote-" + idUnico);
    if (!pacoteOriginal) return null;

    let nomeExibido = pacoteOriginal.querySelector(".nome-carta")?.innerText?.trim() || "Carta";
    let nomeBase = nomeExibido.replace(/\s*\(S\/Hab\)\s*$/i, "");
    let tipoEspecial = pacoteOriginal.dataset.inimigoEspecial || "";

    // A família Slime é uma carta conceitual: todos os corpos sobreviventes mudam
    // de lado juntos e cada um recomeça com metade da vida de seu estágio.
    if (tipoEspecial === "slime") {
        let estagio = Math.max(0, Math.min(3, Number(pacoteOriginal.dataset.slimeEstagio) || 0));
        let atributos = [
            { vida: 10, dano: 1 }, { vida: 4, dano: 2 },
            { vida: 2, dano: 3 }, { vida: 1, dano: 4 }
        ][estagio];
        let idsFamilia = typeof window.rpgObterIdsFamiliaSlime === "function"
            ? window.rpgObterIdsFamiliaSlime(idUnico)
            : [idUnico];
        idsFamilia.forEach(limparEstadosDaVitimaZumbi);
        let convertida = converterCartaRoubadaPeloBruxo(idUnico, novoDonoEhJ1);
        idsFamilia.forEach(idMembro => {
            let vida = document.getElementById("vida-" + idMembro);
            let dano = document.getElementById("dano-" + idMembro);
            if (vida) vida.innerText = atributos.vida / 2;
            if (dano) dano.innerText = atributos.dano;
            finalizarVisualVitimaZumbi(idMembro);
        });
        if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
        return convertida ? { nome: "Slime", quantidade: idsFamilia.length } : null;
    }

    let base = bancoDeCartas.find(c => c.nome === nomeBase);
    let vidaOriginal = base ? Number(base.vida) : (tipoEspecial === "esqueleto" ? 1 : tipoEspecial === "zumbi" ? 4 : tipoEspecial === "aicer" ? 3 : tipoEspecial === "ecto" ? 2 : tipoEspecial === "fraguer" ? 4 : tipoEspecial === "fraguer-fundido" ? 2 : tipoEspecial === "spiritista" ? 10 : tipoEspecial === "sete-negativo" ? 5 : Number(document.getElementById("vida-" + idUnico)?.innerText));
    let danoOriginal = base ? Number(base.dano) : (tipoEspecial === "esqueleto" ? 1 : tipoEspecial === "zumbi" ? 2 : tipoEspecial === "aicer" ? 1 : tipoEspecial === "ecto" ? 3 : tipoEspecial === "fraguer" ? 1 : tipoEspecial === "fraguer-fundido" ? 8 : tipoEspecial === "spiritista" ? 1 : tipoEspecial === "sete-negativo" ? 0 : Number(document.getElementById("dano-" + idUnico)?.innerText));
    if (!Number.isFinite(vidaOriginal)) vidaOriginal = 1;
    if (!Number.isFinite(danoOriginal)) danoOriginal = 0;

    limparEstadosDaVitimaZumbi(idUnico);
    let convertida = converterCartaRoubada(idUnico, novoDonoEhJ1);
    if (!convertida) return null;

    let vida = document.getElementById("vida-" + idUnico);
    let dano = document.getElementById("dano-" + idUnico);
    if (vida) vida.innerText = Math.max(0.5, vidaOriginal / 2);
    if (dano) dano.innerText = danoOriginal;
    finalizarVisualVitimaZumbi(idUnico);

    // converterCartaRoubada já religa o Esqueleto. O Zumbi também precisa
    // recuperar sua própria passiva caso seja a carta infectada.
    if (tipoEspecial === "zumbi" && typeof window.rpgRegistrarZumbi === "function") {
        window.rpgRegistrarZumbi(idUnico, novoDonoEhJ1);
    }
    if (tipoEspecial === "aicer" && typeof window.rpgRegistrarAicer === "function") {
        window.rpgRegistrarAicer(idUnico, novoDonoEhJ1);
    }
    if (tipoEspecial === "ecto" && typeof window.rpgRegistrarEcto === "function") {
        window.rpgRegistrarEcto(idUnico, novoDonoEhJ1);
    }
    if ((tipoEspecial === "fraguer" || tipoEspecial === "fraguer-fundido")
        && typeof window.rpgRegistrarFraguer === "function") {
        window.rpgRegistrarFraguer(idUnico, novoDonoEhJ1, tipoEspecial === "fraguer-fundido");
    }
    if (tipoEspecial === "spiritista" && typeof window.rpgRegistrarSpiritista === "function") {
        window.rpgRegistrarSpiritista(idUnico, novoDonoEhJ1);
    }
    if (tipoEspecial === "sete-negativo" && typeof window.rpgRegistrarSeteNegativo === "function") {
        window.rpgRegistrarSeteNegativo(idUnico, novoDonoEhJ1);
    }
    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
    return { nome: nomeBase, quantidade: 1 };
}

window.rpgConverterVitimaZumbi = converterVitimaZumbi;

// Transformar um Slime em poção também consome a família inteira, mas cria apenas
// uma poção: todas as formas pertencem à mesma carta original.
function transformarFamiliaSlimeEmPocao(idPacoteAlvo) {
    let idPuro = idPacoteAlvo.replace("pacote-", "");
    let idsFamilia = typeof window.rpgObterIdsFamiliaSlime === "function"
        ? window.rpgObterIdsFamiliaSlime(idPuro)
        : [];
    if (idsFamilia.length > 0 && typeof window.rpgApagarFamiliaSlime === "function") {
        return window.rpgApagarFamiliaSlime(idPuro);
    }

    let pacote = document.getElementById(idPacoteAlvo);
    if (!pacote) return 0;
    pacote.remove();
    return 1;
}

// 🔥 Cura TODAS as tropas de um lado — campo e mão — ignorando suportes/poções.
// Mesmo padrão de filtro usado na explosão do Cavalo de Tróia.
function curarTodosAliados(lado, quantidade) {
    let campoAliado = document.getElementById("campo-" + lado);
    if (campoAliado) {
        let cartasCampo = Array.from(campoAliado.querySelectorAll("div[id^='pacote-']"));
        cartasCampo.forEach(pacote => {
            // Cura = dano negativo, reaproveitando aplicarDanoDireto (já bloqueia o Cavalo de Tróia).
            aplicarDanoDireto(pacote.id, -quantidade, lado === "j2");
        });
    }

    let maoAliada = document.getElementById("mao-" + lado);
    if (maoAliada) {
        let cartasMao = Array.from(maoAliada.querySelectorAll("div[id^='pacote-']"));
        cartasMao.forEach(pacote => {
            let idPuro = pacote.id.replace("pacote-", "");

            let infoCarta = bancoDeCartas
                .filter(c => idPuro === c.id || idPuro.startsWith(c.id + "_") || idPuro.startsWith(c.id + "-"))
                .sort((a, b) => b.id.length - a.id.length)[0];
            let ehSuporte = infoCarta && suportesReais.includes(infoCarta.id);
            if (ehSuporte) return;

            let txtVida = document.getElementById("vida-" + idPuro);
            if (!txtVida) return;
            txtVida.innerText = parseFloat(txtVida.innerText) + quantidade;
        });
    }
}

// 🔥 Mantém uma representação apenas visual da Fogueira no campo enquanto o efeito durar.
// Ela não recebe id de pacote nem classes de tropa, portanto não entra em ataques nem nas decisões do bot.
function acenderVisualFogueira(pacoteItem, lado, visualId) {
    let campo = document.getElementById("campo-" + lado);
    if (!campo || !pacoteItem) return null;

    let visual = pacoteItem.cloneNode(true);
    visual.id = visualId;
    visual.className = "fogueira-ativa-visual";
    visual.removeAttribute("onclick");

    visual.querySelectorAll("[id]").forEach(elemento => elemento.removeAttribute("id"));
    visual.querySelectorAll("button, .botoes-carta, .acoes-carta").forEach(elemento => elemento.remove());
    visual.querySelectorAll("[onclick]").forEach(elemento => elemento.removeAttribute("onclick"));

    let chama = document.createElement("div");
    chama.className = "chama-fogueira-viva";
    chama.setAttribute("aria-hidden", "true");
    chama.innerHTML = '<span>🔥</span><i></i><i></i><i></i>';
    visual.appendChild(chama);

    campo.appendChild(visual);
    requestAnimationFrame(() => visual.classList.add("fogueira-acendeu"));
    return visual;
}

// Pequenas brasas quentes ligam a Fogueira às cartas curadas; os corações continuam
// sendo mostrados pelo efeito geral de recuperação de vida do jogo.
function animarCuraColetivaFogueira(visualId, lado) {
    let visual = visualId ? document.getElementById(visualId) : null;
    if (!visual) return;

    visual.classList.remove("fogueira-pulsando-cura");
    void visual.offsetWidth;
    visual.classList.add("fogueira-pulsando-cura");
    setTimeout(() => visual && visual.classList.remove("fogueira-pulsando-cura"), 900);

    let alvos = [];
    ["campo-" + lado, "mao-" + lado].forEach(idArea => {
        let area = document.getElementById(idArea);
        if (!area) return;
        area.querySelectorAll("div[id^='pacote-']").forEach(pacote => {
            if (pacote.querySelector("[id^='vida-']")) alvos.push(pacote);
        });
    });

    let origem = visual.getBoundingClientRect();
    let origemX = origem.left + origem.width / 2;
    let origemY = origem.top + origem.height * 0.47;

    alvos.forEach((alvo, indice) => {
        let destino = alvo.getBoundingClientRect();
        let brasa = document.createElement("div");
        brasa.className = "brasa-cura-fogueira";
        brasa.style.setProperty("--fogueira-inicio-x", origemX + "px");
        brasa.style.setProperty("--fogueira-inicio-y", origemY + "px");
        brasa.style.setProperty("--fogueira-fim-x", (destino.left + destino.width * 0.28) + "px");
        brasa.style.setProperty("--fogueira-fim-y", (destino.top + destino.height * 0.76) + "px");
        brasa.style.animationDelay = Math.min(indice * 45, 270) + "ms";
        document.body.appendChild(brasa);
        setTimeout(() => brasa.remove(), 1250 + Math.min(indice * 45, 270));
    });
}

function apagarVisualFogueira(visualId) {
    let visual = visualId ? document.getElementById(visualId) : null;
    if (!visual || visual.classList.contains("fogueira-se-apagando")) return;

    visual.classList.add("fogueira-se-apagando");
    let fumaca = document.createElement("div");
    fumaca.className = "fumaca-fogueira-apagando";
    fumaca.setAttribute("aria-hidden", "true");
    fumaca.innerHTML = "<i></i><i></i><i></i>";
    visual.appendChild(fumaca);
    setTimeout(() => visual.remove(), 1450);
}

// 🔥 FOGUEIRA — cura 1 de vida em todas as tropas aliadas (campo + mão) na hora, e agenda
// mais 1 cura igual depois de 1 rodada completa (2 curas no total, 1 por rodada, 2 rodadas).
function usarFogueira(idItem, lado) {
    let pacoteItem = document.getElementById("pacote-" + idItem);
    if (!pacoteItem) return;

    let visualId = "fogueira-ativa-" + proximoIdVisualFogueira++;
    acenderVisualFogueira(pacoteItem, lado, visualId);

    animarCuraColetivaFogueira(visualId, lado);
    curarTodosAliados(lado, 1);
    fogueiraTicks[lado].push({
        restam: 2, // 2 passagens de turno = 1 rodada completa até a 2ª cura
        visualId
    });
    pacoteItem.remove();

    narrar("🔥 A Fogueira acendeu! Todas as tropas do time (campo e mão) curaram 1 de vida — e vão curar mais 1 daqui a 1 rodada!");
    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
}

function jogarCarta(idDoPacote, somentePrepararCampo = false) {
    if (typeof idDoPacote !== "string") return;
    if (faseAbertura === true) return escolherCartaAbertura(idDoPacote, 1);

    let pacoteCarta = document.getElementById(idDoPacote);
    if (!pacoteCarta) return; 

    let idSemPacote = idDoPacote.replace("pacote-", "");
    let estaNaMao = pacoteCarta.parentElement && pacoteCarta.parentElement.id.includes("mao");
    
    let nomeDaCartaHtml = pacoteCarta.querySelector(".nome-carta").innerText.trim(); 
    let textoBusca = nomeDaCartaHtml.toLowerCase();

    // 🚨 ROTA 1: ITENS E POÇÕES
    
    if (textoBusca.includes("Poção de Gelo") || textoBusca.includes("gelo")) {
    return usarHabilidade("Poção de Gelo", idSemPacote, null);
}
    if (textoBusca.includes("besta")) return ativarSuporte("Besta", idSemPacote);
    if (textoBusca.includes("auvex")) return ativarSuporte("Auvex", idSemPacote);
    if (textoBusca.includes("velux") || textoBusca.includes("veluz")) return ativarSuporte("Velux", idSemPacote);
    if (textoBusca.includes("adiv")) return ativarSuporte("Adiv", idSemPacote);
    if (textoBusca.includes("recuperida")) return ativarSuporte("Recuperida", idSemPacote);
    if (textoBusca.includes("plus life")) return ativarSuporte("PlusLife", idSemPacote);
    if (textoBusca.includes("reviverta")) return usarReviverta(idSemPacote, true);
    if (textoBusca.includes("cracker")) return usarCracker(idSemPacote, true);
    if (textoBusca.includes("allsforms")) return usarAllsforms(idSemPacote, true);
    if (textoBusca.includes("dupliquetion")) return usarDupliquetion(idSemPacote, true);
    if (textoBusca.includes("traição") || textoBusca.includes("traicao")) return ativarSuporte("Traicao", idSemPacote);
    if (textoBusca.includes("escudo")) return ativarSuporte("Escudo", idSemPacote);
    if (textoBusca.includes("fogueira")) return usarFogueira(idSemPacote, "j1");

    // 🚨 ROTA 2: CRIATURAS NORMAIS
    if (estaNaMao) {

        if (pacoteCarta.classList.contains("congelada")) {
            narrar("❄️ Esta carta está congelada na sua mão e não pode ir para o campo!");
            return;
        }

        if (bloqueioNecro[idSemPacote] && bloqueioNecro[idSemPacote] > 0) return narrar("⏳ FADIGA! Esta carta precisa descansar.");
        
        if (typeof window.rpgMarcarMovimentacaoEsqueleto === "function") {
            window.rpgMarcarMovimentacaoEsqueleto(idSemPacote);
        }
        document.getElementById("campo-j1").appendChild(pacoteCarta);
        narrar("Você invocou uma criatura no campo!");

        if (nomeDaCartaHtml === 'Cavalo de Tróia') {
            cavalosDeTroiaAtivos[idSemPacote] = 4; // 2 rodadas = 4 passagens de turno
            narrar("🐴 O Cavalo de Tróia foi posicionado! Em 2 rodadas ele vai se abrir, causando 1 de dano em TODAS as cartas inimigas (campo e mão)!");
        }

        if (nomeDaCartaHtml === 'Separado' || nomeDaCartaHtml === 'Separadois') {
            let outrosAliados = Array.from(document.getElementById("campo-j1").getElementsByClassName("carta-aliada")).filter(p => p.id !== "pacote-" + idSemPacote);
            if (outrosAliados.length > 0) {
                modoParceriaSeparado = true;
                idSeparadoParceriaAtivo = idSemPacote;
                narrar(`👥 ${nomeDaCartaHtml} entrou em campo! Clique em outra carta sua pra ela virar parceira (vão atacar juntas o mesmo alvo).`);
            } else {
                narrar(`👥 ${nomeDaCartaHtml} entrou em campo, mas não tem nenhuma outra carta sua pra ser parceira ainda — vai atacar sozinho por enquanto.`);
            }
        }

        if (nomeDaCartaHtml === 'Incendiário') {
            narrar("🔥 Incendiário entrou em campo! Use o botão \"Jogar Pólvora\" quando houver um alvo na arena.");
        }

        if (nomeDaCartaHtml === 'Portable') {
            portableDuracao[idSemPacote] = 4; // 2 rodadas = 4 passagens de turno
            narrar("🛸 Portable entrou em campo! Por 2 rodadas, ele ataca junto de qualquer carta sua que atacar. Depois a bateria acaba e ele some.");
        }
    }

    let cartaBase = bancoDeCartas.find(c => c.nome === nomeDaCartaHtml);
    if (!somentePrepararCampo && cartaBase) ultimaCartaJogador = cartaBase;

    let imagem = pacoteCarta.querySelector("img");
    imagem.removeAttribute("onclick"); 
    
imagem.onclick = function() {
        
    // 🧪 2º PRIORIDADE: BRUXO (TRANSFORMAR 4)
        if (typeof modoBruxoTransformar !== 'undefined' && modoBruxoTransformar === true) {
            let pacoteAlvo = document.getElementById(idDoPacote);
            
            // 🚀 DEDUZ O DONO DO BRUXO ATIVO PARA DAR A POÇÃO NA MÃO CERTA
            let oBruxoEAliado = document.getElementById("pacote-" + idBruxoAtivo).closest("#campo-j1") !== null;
            let maoDoDonoDoBruxo = oBruxoEAliado ? "mao-j1" : "mao-j2";

            animarPocaoBruxo(idBruxoAtivo, idDoPacote.replace("pacote-", ""), "transformar");
            let totalTransformado = transformarFamiliaSlimeEmPocao(idDoPacote);
            
            // Cria a poção na mão de quem usou o Bruxo (tamanho correto)
            gerarPocaoAleatoria(maoDoDonoDoBruxo); 
            
            modoBruxoTransformar = false;
            idBruxoAtivo = null;
            narrar(totalTransformado > 1
                ? `✨ ZAP! A família Slime inteira (${totalTransformado} cartas) virou uma única poção pequena na sua mão!`
                : "✨ ZAP! A carta inimiga virou pó e o Bruxo destilou uma poção pequena na sua mão!");
            return; 
        }

        // 🔮 3º PRIORIDADE: BRUXO (ROUBAR 6)
        if (typeof modoBruxoRoubar !== 'undefined' && modoBruxoRoubar === true) {
            let pacoteAlvo = document.getElementById(idDoPacote);
            let pacoteBruxo = document.getElementById("pacote-" + idBruxoAtivo);

            if (!pacoteBruxo) {
                narrar("Erro: Não encontrei o Bruxo na arena!");
                modoBruxoRoubar = false;
                return;
            }

            // 🚀 DEDUZ O DONO DO BRUXO ATIVO PARA O ROUBO E TRANSFORMAÇÃO
            let oBruxoEAliado = pacoteBruxo.closest("#campo-j1") !== null;
            let campoDoDonoDoBruxo = oBruxoEAliado ? document.getElementById("campo-j1") : document.getElementById("campo-j2");
            let maoDoDonoDoBruxo = oBruxoEAliado ? "mao-j1" : "mao-j2";

            // 1. ROUBA A CARTA: reconstrói no campo de quem usou o Bruxo, já 100% do novo dono
            let origemRouboBruxo = animarPocaoBruxo(idBruxoAtivo, idDoPacote.replace("pacote-", ""), "roubar");
            let cartaRoubadaBruxo = converterCartaRoubadaPeloBruxo(idDoPacote.replace("pacote-", ""), oBruxoEAliado);
            animarCartaRoubadaBruxo(cartaRoubadaBruxo, origemRouboBruxo);
            
            // 2. O BRUXO VIRA POÇÃO: Remove o Bruxo do campo
            animarBruxoVirandoPocao(idBruxoAtivo);
            pacoteBruxo.remove(); 
            
            // 3. Cria a poção na mão de quem usou o Bruxo (tamanho correto)
            gerarPocaoAleatoria(maoDoDonoDoBruxo);

            modoBruxoRoubar = false;
            idBruxoAtivo = null;
            narrar("🔮 Dominação Mental! Carta roubada, e o Bruxo recuou como poção pequena na sua mão!");
            return;
        }
    // 🛡️ 1º PRIORIDADE: VÍNCULO DO BARRIL ALIADO
        if (typeof modoProtecaoBarril !== 'undefined' && modoProtecaoBarril === true) {
            if (vincularProtecaoBarril(idSemPacote, idBarrilProtetor)) {
                modoProtecaoBarril = false;
                idBarrilProtetor = null;
            }
            return;
        }
            // ❄️ POÇÃO DE GELO (ALVO SIMPLES - SEU LADO CLICANDO)
        if (typeof modoGeloSimples !== 'undefined' && modoGeloSimples === true) {
            let pacoteAlvo = document.getElementById(idDoPacote);
            let pacotePocao = document.getElementById("pacote-" + idPocaoAtiva);
            let quemJogouGelo = pacotePocao && pacotePocao.parentElement ? pacotePocao.parentElement.id : "";
            let alvoEhJ1 = pacoteAlvo.closest("#campo-j1") !== null || pacoteAlvo.closest("#mao-j1") !== null;
            let alvoEhJ2 = pacoteAlvo.closest("#campo-j2") !== null || pacoteAlvo.closest("#mao-j2") !== null;

            if ((quemJogouGelo.includes("j1") && alvoEhJ1) || (quemJogouGelo.includes("j2") && alvoEhJ2)) {
                return narrar("❌ Alvo inválido! A Poção de Gelo só pode ser usada em cartas do OPONENTE.");
            }

            pacoteAlvo.classList.add("congelada");

            let idAlvo = idDoPacote.replace("pacote-", "");
            duracaoGelo[idAlvo] = 3; // Gelo Simples: duração menor que os efeitos em área

            if (pacotePocao) pacotePocao.remove();

            modoGeloSimples = false;
            idPocaoAtiva = null;
            narrar("❄️ Alvo atingido e congelado pelo Gelo Simples!");
            return;
        }
        else if (modoTraicao === true) executarTraicao(idDoPacote);
        else if (modoLadrao === true) resolverCliqueRouboLadrao(idDoPacote);
        else if (modoAtaqueInimigo === true) aplicarDanoInimigo(idDoPacote);
        else if (modoAlvoBarrilBarbaro === true || modoAlvoBarrilBarbaroInimigo === true) aplicarAlvoBarrilBarbaro(idDoPacote);
        else if (modoCura === true) aplicarCuraAliada(idDoPacote);
        else if (modoRouboGoblin === true) aplicarRouboDanoGoblin(idDoPacote);
        else if (modoAlvoBarril === true) aplicarAlvoBarril(idDoPacote);
        else if (typeof modoEspecialBarrilGoblin !== 'undefined' && modoEspecialBarrilGoblin === true) aplicarAlvoBarril(idDoPacote, true);
        else if (typeof modoEspecialBumerskeleton !== 'undefined' && modoEspecialBumerskeleton === true) aplicarEspecialBumerskeletonAntesDeAtacar(idDoPacote);
        else if (modoAlvoCavaleiroInimigo === true) aplicarAlvoCavaleiroInimigo(idDoPacote);
        else if (modoTransformacaoIcaro === true && cliquePodeResolverAcaoPendente(idIcaroAtivo)) aplicarTransformacaoIcaro(idDoPacote);
        else if (modoAjusteThiago === true && cliquePodeResolverAcaoPendente(idThiagoAtivo)) aplicarAjusteThiago(idDoPacote);
        else if (modoParceriaSeparado === true) aplicarParceriaSeparado(idDoPacote);
        else if (modoPrenderNoTempo === true) aplicarPrenderNoTempo(idDoPacote);
        else if (suportePreparado !== null) { 
            equiparSuporte(idSemPacote);
        } else {
            iniciarAtaque(nomeDaCartaHtml, idSemPacote);
        }
    };
    imagem.style.cursor = "pointer";

    let divAcoes = pacoteCarta.querySelector("div[id^='acoes-']");
    if (divAcoes) divAcoes.style.display = "block"; 
   
    if (!somentePrepararCampo) {
        let cartaParaPassiva = { nome: nomeDaCartaHtml, passivaAtivada: false };
        if (typeof verificarPassivaNecromante === "function") verificarPassivaNecromante(cartaParaPassiva, true);
    }

    atualizarTodosUnidoes();
}

function jogarCartaInimigo(idDoPacote, somentePrepararCampo = false) {
    if (typeof idDoPacote !== "string") return;
    if (faseAbertura === true) return escolherCartaAbertura(idDoPacote, 2);

    let pacoteCarta = document.getElementById(idDoPacote);
    if (!pacoteCarta) return;

    let idSemPacote = idDoPacote.replace("pacote-", "");
    let estaNaMao = pacoteCarta.parentElement && pacoteCarta.parentElement.id.includes("mao");
    
    let nomeDaCartaHtml = pacoteCarta.querySelector(".nome-carta").innerText.trim();
    let textoBusca = nomeDaCartaHtml.toLowerCase();

    // 🚨 ROTA 1: ITENS E POÇÕES
    if (textoBusca.includes("gelo") || textoBusca.includes("Poção de Gelo")) {
    return usarHabilidade("Poção de Gelo", idSemPacote, null); // Ativa o poder direto da mão!
}
    if (textoBusca.includes("besta")) return ativarSuporte("Besta", idSemPacote);
    if (textoBusca.includes("auvex")) return ativarSuporte("Auvex", idSemPacote);
    if (textoBusca.includes("velux") || textoBusca.includes("veluz")) return ativarSuporte("Velux", idSemPacote);
    if (textoBusca.includes("adiv")) return ativarSuporte("Adiv", idSemPacote);
    if (textoBusca.includes("recuperida")) return ativarSuporte("Recuperida", idSemPacote);
    if (textoBusca.includes("plus life")) return ativarSuporte("PlusLife", idSemPacote);
    if (textoBusca.includes("reviverta")) return usarReviverta(idSemPacote, false);
    if (textoBusca.includes("cracker")) return usarCracker(idSemPacote, false);
    if (textoBusca.includes("allsforms")) return usarAllsforms(idSemPacote, false);
    if (textoBusca.includes("dupliquetion")) return usarDupliquetion(idSemPacote, false);
    if (textoBusca.includes("traição") || textoBusca.includes("traicao")) return ativarSuporte("Traicao", idSemPacote);
    if (textoBusca.includes("escudo")) return ativarSuporte("Escudo", idSemPacote);
    if (textoBusca.includes("fogueira")) return usarFogueira(idSemPacote, "j2");

    // 🚨 ROTA 2: CRIATURAS INIMIGAS
    if (estaNaMao) {

        if (pacoteCarta.classList.contains("congelada")) {
            narrar("❄️ Esta carta está congelada na mão do oponente e não pode ser invocada!");
            return;
        }
        if (bloqueioNecro[idSemPacote] && bloqueioNecro[idSemPacote] > 0) return narrar("⏳ FADIGA! A carta precisa descansar.");

        if (typeof window.rpgMarcarMovimentacaoEsqueleto === "function") {
            window.rpgMarcarMovimentacaoEsqueleto(idSemPacote);
        }
        document.getElementById("campo-j2").appendChild(pacoteCarta);
        narrar("O Oponente invocou uma criatura no campo!");

        if (nomeDaCartaHtml === 'Cavalo de Tróia') {
            cavalosDeTroiaAtivos[idSemPacote] = 4; // 2 rodadas = 4 passagens de turno
            narrar("🐴 O Cavalo de Tróia inimigo foi posicionado! Em 2 rodadas ele vai se abrir, causando 1 de dano em TODAS as suas cartas (campo e mão)!");
        }

        if (nomeDaCartaHtml === 'Separado' || nomeDaCartaHtml === 'Separadois') {
            let outrosAliados = Array.from(document.getElementById("campo-j2").getElementsByClassName("carta-inimiga")).filter(p => p.id !== "pacote-" + idSemPacote);
            if (outrosAliados.length > 0) {
                modoParceriaSeparado = true;
                idSeparadoParceriaAtivo = idSemPacote;
                narrar(`👥 ${nomeDaCartaHtml} inimigo entrou em campo! O Oponente vai escolher outra carta dele pra ser parceira.`);
            } else {
                narrar(`👥 ${nomeDaCartaHtml} inimigo entrou em campo, mas ainda não tem outra carta pra ser parceira.`);
            }
        }

        if (nomeDaCartaHtml === 'Incendiário') {
            narrar("🔥 Incendiário inimigo entrou em campo! Ele vai jogar a pólvora quando houver um alvo na arena.");
        }

        if (nomeDaCartaHtml === 'Portable') {
            portableDuracao[idSemPacote] = 4; // 2 rodadas = 4 passagens de turno
            narrar("🛸 Portable inimigo entrou em campo! Por 2 rodadas, ele ataca junto de qualquer carta do time dele que atacar. Depois a bateria acaba e ele some.");
        }
    }
    
    pacoteCarta.className = "carta-inimiga";

    let cartaBase = bancoDeCartas.find(c => c.nome === nomeDaCartaHtml);
    if (!somentePrepararCampo && cartaBase) ultimaCartaOponente = cartaBase;

    let imagem = pacoteCarta.querySelector("img");
    imagem.removeAttribute("onclick");
    
    imagem.onclick = function() {
        let idSemPacoteLocal = idDoPacote.replace("pacote-", "");

        // ❄️ POÇÃO DE GELO (ALVO SIMPLES - SEU LADO CLICANDO NO INIMIGO)
        if (typeof modoGeloSimples !== 'undefined' && modoGeloSimples === true) {
            let pacoteAlvo = document.getElementById(idDoPacote);
            let pacotePocao = document.getElementById("pacote-" + idPocaoAtiva);
            let quemJogouGelo = pacotePocao && pacotePocao.parentElement ? pacotePocao.parentElement.id : "";
            let alvoEhJ1 = pacoteAlvo.closest("#campo-j1") !== null || pacoteAlvo.closest("#mao-j1") !== null;
            let alvoEhJ2 = pacoteAlvo.closest("#campo-j2") !== null || pacoteAlvo.closest("#mao-j2") !== null;

            if ((quemJogouGelo.includes("j1") && alvoEhJ1) || (quemJogouGelo.includes("j2") && alvoEhJ2)) {
                return narrar("❌ Alvo inválido! A Poção de Gelo só pode ser usada em cartas do OPONENTE.");
            }

            pacoteAlvo.classList.add("congelada");

            let idAlvo = idDoPacote.replace("pacote-", "");
            duracaoGelo[idAlvo] = 3; // Gelo Simples: duração menor que os efeitos em área

            if (pacotePocao) pacotePocao.remove();

            modoGeloSimples = false;
            idPocaoAtiva = null;
            narrar("❄️ Inimigo atingido e congelado pelo Gelo Simples!");
            return;
        }
        if (modoTraicao === true) { executarTraicao(idDoPacote); return; }
        else if (modoLadrao === true) resolverCliqueRouboLadrao(idDoPacote);
        else if (modoCuraInimigo === true) aplicarCuraInimiga(idDoPacote);
        else if (modoAlvoBarrilBarbaro === true || modoAlvoBarrilBarbaroInimigo === true) aplicarAlvoBarrilBarbaro(idDoPacote);
        else if (modoRouboGoblin === true) aplicarRouboDanoGoblin(idDoPacote); 
        else if (modoAlvoBarril === true) aplicarAlvoBarril(idDoPacote);
        else if (typeof modoEspecialBarrilGoblin !== 'undefined' && modoEspecialBarrilGoblin === true) aplicarAlvoBarril(idDoPacote, true);
        else if (typeof modoEspecialBumerskeleton !== 'undefined' && modoEspecialBumerskeleton === true) aplicarEspecialBumerskeletonAntesDeAtacar(idDoPacote);
        else if (modoAlvoCavaleiro === true) aplicarAlvoCavaleiro(idDoPacote);
        else if (modoTransformacaoIcaro === true && cliquePodeResolverAcaoPendente(idIcaroAtivo)) aplicarTransformacaoIcaro(idDoPacote);
        else if (modoAjusteThiago === true && cliquePodeResolverAcaoPendente(idThiagoAtivo)) aplicarAjusteThiago(idDoPacote);
        else if (modoParceriaSeparado === true) aplicarParceriaSeparado(idDoPacote);
        else if (modoPrenderNoTempo === true) aplicarPrenderNoTempo(idDoPacote);
        // 🧪 BRUXO (TRANSFORMAR 4)
        else if (typeof modoBruxoTransformar !== 'undefined' && modoBruxoTransformar === true) {
            let pacoteAlvo = document.getElementById(idDoPacote);
            let oBruxoEAliado = document.getElementById("pacote-" + idBruxoAtivo).closest("#campo-j1") !== null;
            let maoDoDonoDoBruxo = oBruxoEAliado ? "mao-j1" : "mao-j2";

            animarPocaoBruxo(idBruxoAtivo, idDoPacote.replace("pacote-", ""), "transformar");
            let totalTransformado = transformarFamiliaSlimeEmPocao(idDoPacote);
            gerarPocaoAleatoria(maoDoDonoDoBruxo); 
            
            modoBruxoTransformar = false;
            idBruxoAtivo = null;
            narrar(totalTransformado > 1
                ? `✨ ZAP! A família Slime inteira (${totalTransformado} cartas) virou uma única poção pequena!`
                : "✨ ZAP! A carta inimiga virou pó e destilou uma poção pequena na sua mão!");
            return; 
        }

        // 🔮 BRUXO (ROUBAR 6)
        else if (typeof modoBruxoRoubar !== 'undefined' && modoBruxoRoubar === true) {
            let pacoteAlvo = document.getElementById(idDoPacote);
            let pacoteBruxo = document.getElementById("pacote-" + idBruxoAtivo);

            if (!pacoteBruxo) return narrar("Erro: O Bruxo evaporou antes da hora!");

            let oBruxoEAliado = pacoteBruxo.closest("#campo-j1") !== null;
            let campoDoDonoDoBruxo = oBruxoEAliado ? document.getElementById("campo-j1") : document.getElementById("campo-j2");
            let maoDoDonoDoBruxo = oBruxoEAliado ? "mao-j1" : "mao-j2";

            let origemRouboBruxo = animarPocaoBruxo(idBruxoAtivo, idDoPacote.replace("pacote-", ""), "roubar");
            let cartaRoubadaBruxo = converterCartaRoubadaPeloBruxo(idDoPacote.replace("pacote-", ""), oBruxoEAliado); // rouba a carta, já 100% do novo dono
            animarCartaRoubadaBruxo(cartaRoubadaBruxo, origemRouboBruxo);
            animarBruxoVirandoPocao(idBruxoAtivo);
            pacoteBruxo.remove(); // Some com o bruxo
            gerarPocaoAleatoria(maoDoDonoDoBruxo); // Manda poção pra mão de quem roubou

            modoBruxoRoubar = false;
            idBruxoAtivo = null;
            narrar("🔮 Dominação Mental! Carta roubada, e o Bruxo recuou como poção!");
            return;
        }
        else if (typeof modoProtecaoBarrilInimigo !== 'undefined' && modoProtecaoBarrilInimigo === true) {
        if (vincularProtecaoBarril(idSemPacote, idBarrilProtetor)) {
            modoProtecaoBarrilInimigo = false;
            idBarrilProtetor = null;
        }
        return;
    } 
        else if (suportePreparado !== null) {
            equiparSuporte(idSemPacoteLocal);
        } else {
            receberAtaque("vida-" + idSemPacoteLocal, idDoPacote);
        }
    };
    
    let divAcoes = pacoteCarta.querySelector("div[id^='acoes-']");
    if (divAcoes) divAcoes.style.display = "block";
   
    if (!somentePrepararCampo) {
        let cartaParaPassiva = { nome: nomeDaCartaHtml, passivaAtivada: false };
        if (typeof verificarPassivaNecromante === "function") verificarPassivaNecromante(cartaParaPassiva, false);
    }

    atualizarTodosUnidoes();
}

function criarHTMLCarta(carta, funcaoJogar, classeCss, ehAliado) {
    // Última proteção da interface: mesmo que uma carta venha de cópia, roubo ou
    // transformação com um valor antigo inválido, nunca renderiza vida abaixo de zero.
    let vidaNumericaSegura = Number(carta.vida);
    let vidaExibida = Number.isFinite(vidaNumericaSegura) ? Math.max(0, vidaNumericaSegura) : 0;
    let imagemDaCarta = typeof window.caminhoImagemRpg === "function"
        ? window.caminhoImagemRpg(carta.img)
        : carta.img;
    // 🩹 CORREÇÃO: os dois botões apareciam em QUALQUER Curandeiro, dos dois lados — deixando
    // curar o time errado sem querer. Agora só aparece o botão do lado certo da carta.
    let btnCura = (carta.nome === 'Curandeiro' && ehAliado) ? `<button onclick="iniciarCura('${carta.idUnico}')" style="background-color: green; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Curar 💚</button>` : '';
    let btnCuraInimigo = (carta.nome === 'Curandeiro' && !ehAliado) ? `<button onclick="iniciarCuraInimigo('${carta.idUnico}')" style="background-color: green; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Curar Oponente 💚</button>` : '';
    let btnEspecial = (carta.nome === 'Poção de Gelo' ||carta.nome === 'Bruxo' || carta.nome === 'Necromante' || carta.nome === 'Ork' || carta.nome === 'Curandeiro' || carta.nome === 'Ctrl C' || carta.nome === 'Ctrl V' || carta.nome === 'Cavaleiro das Trevas' || carta.nome === 'Goblin' || carta.nome === 'Trio de Goblin' || carta.nome === 'Barril de Goblin' || carta.nome === 'Guerreiro' || carta.nome === 'Barril de Bárbaro' || carta.nome === 'Barril'|| carta.nome === 'Bumerskeleton' || carta.nome === 'Mensageiro' || carta.nome === 'Criador' || carta.nome === 'Separado' || carta.nome === 'Separadois' || carta.nome === 'Viajante do Tempo' || carta.nome === 'Incendiário' || carta.nome === 'Mago') ? `<button onclick="usarHabilidade('${carta.nome}', '${carta.idUnico}', this)" style="background-color: purple; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Especial 🔮</button>` : '';
    let btnLadrao = (carta.nome === 'Ladrão') ? `<button onclick="usarPassivaLadrao('${carta.idUnico}', this)" style="background-color: #f1c40f; color: black; font-weight: bold; width: 100%; margin-bottom: 2px; cursor: pointer;">Passiva 💰</button>` : '';
    let btnCtrlC = (carta.nome === 'Ctrl C' || carta.nome === 'Ctrl V') ? `<button onclick="usarPassivaCtrlC('${carta.idUnico}', this)" style="background-color: #34495e; color: white; font-weight: bold; width: 100%; margin-bottom: 2px; cursor: pointer;">Passiva 📋</button>` : '';
    // 👥 Sempre disponível (não é uso único) — deixa trocar a parceira quantas vezes quiser.
    let btnTrocarParceiro = (carta.nome === 'Separado' || carta.nome === 'Separadois') ? `<button onclick="trocarParceiroSeparado('${carta.idUnico}', ${ehAliado})" style="background-color: #16a085; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Trocar Parceiro 👥</button>` : '';
    // ⏳ Sempre visível — a função interna já recusa se essa carta já tiver usado a Passiva.
    let btnViajarNoTempo = (carta.nome === 'Viajante do Tempo') ? `<button onclick="usarPassivaViajante('${carta.idUnico}', this)" style="background-color: #8e44ad; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Viajar no Tempo ⏳</button>` : '';

    // 🔥 O Incendiário não tem o botão normal de Atacar — no lugar dele entra o botão
    // "Jogar Pólvora", que só acende o ciclo quando houver alvo na arena inimiga.
    let btnAtacarAliado = (carta.nome === 'Incendiário')
        ? `<button class="btn-polvora-incendiario" onclick="iniciarAtaqueIncendiario('${carta.idUnico}', false)" style="padding: 5px; background-color: #b34700; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Jogar Pólvora 🔥</button>`
        : `<button onclick="iniciarAtaque('${carta.nome}', '${carta.idUnico}')" style="padding: 5px; width: 100%; margin-bottom: 2px; cursor: pointer;">Atacar ⚔️</button>`;
    let btnAtacarInimigo = (carta.nome === 'Incendiário')
        ? `<button class="btn-polvora-incendiario" onclick="iniciarAtaqueIncendiario('${carta.idUnico}', true)" style="padding: 5px; background-color: #b34700; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Jogar Pólvora 🔥</button>`
        : `<button onclick="inimigoAtacar('${carta.idUnico}')" style="padding: 5px; background-color: darkred; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Atacar ⚔️</button>`;

    let botoes = ehAliado ? `
        ${btnCtrlC}
        ${btnCura}
        ${btnAtacarAliado}
        ${btnEspecial}
        ${btnLadrao}
        ${btnTrocarParceiro}
        ${btnViajarNoTempo}
    ` : `
        ${btnCtrlC}
        ${btnCuraInimigo}
        ${btnAtacarInimigo}
        ${btnEspecial}
        ${btnLadrao}
        ${btnTrocarParceiro}
        ${btnViajarNoTempo}
    `;

    return `
        <div id="pacote-${carta.idUnico}" class="${classeCss}">
            <span class="nome-carta">${carta.nome}</span>
            <img src="${imagemDaCarta}" alt="${carta.nome}" onclick="${funcaoJogar}('pacote-${carta.idUnico}')">
            
            <div class="status-container">
                <span class="status-vida">❤️ <span id="vida-${carta.idUnico}">${vidaExibida}</span></span>
                <span class="status-ataque">⚔️ <span id="dano-${carta.idUnico}">${carta.dano}</span></span>
            </div>

            <div id="acoes-${carta.idUnico}" style="display: none; margin-top: 10px; width: 100%;">${botoes}</div>
        </div>
    `;
}

function iniciarAtaque(nomeCarta, idUnico) {
    if (barrilBarbaroEmAnimacao) return narrar("🪵 O Barril de Bárbaro ainda está rolando!");
    nomeCarta = obterNomeEfetivoCarta(idUnico, nomeCarta);
    if (cartaSilenciadaPeloEcto(idUnico)) {
        nomeCarta = "";
        ultimaCartaJogador = null;
    }
    modoAlvoBarril = false; // 🚀 Cancela qualquer mira do barril se clicar noutro ataque

    // ❄️ TRAVA DE ATAQUE (SEU LADO)
    let pacoteCarta = document.getElementById("pacote-" + idUnico);
    if (pacoteCarta && pacoteCarta.classList.contains("congelada")) {
        narrar("❄️ Esta carta está congelada e não pode atacar nesta rodada!");
        return; // Cancela a execução do ataque
    }

    // 👥 No Especial dividido, qualquer integrante pode abrir a sequência. Depois que um
    // deles atacou, ele não pode ocupar também o segundo ataque: o jogo espera o parceiro.
    let idSequenciaSeparado = obterSeparadaoDivididoAtivo(idUnico);
    if (idSequenciaSeparado
        && (separadaoAtacantesNaSequencia[idSequenciaSeparado] || []).includes(idUnico)) {
        let outroId = idUnico === idSequenciaSeparado ? parceriaSeparado[idSequenciaSeparado] : idSequenciaSeparado;
        let outroPacote = document.getElementById("pacote-" + outroId);
        let outroNome = outroPacote?.querySelector(".nome-carta")?.innerText?.trim() || "a outra carta da dupla";
        return narrar(`👥 Esta carta já atacou nesta sequência. Agora ataque com ${outroNome}.`);
    }
    let sequenciaPendenteJogador = obterSequenciaSeparadoPendenteDoLado("j1");
    if (sequenciaPendenteJogador && idUnico !== sequenciaPendenteJogador.idObrigatorio) {
        let outroPacote = document.getElementById("pacote-" + sequenciaPendenteJogador.idObrigatorio);
        let outroNome = outroPacote?.querySelector(".nome-carta")?.innerText?.trim() || "a outra carta da dupla";
        return narrar(`👥 Termine o Especial dividido primeiro: agora é a vez de ${outroNome}.`);
    }

    // 👥 SEPARADO/SEPARADOIS — se já tem parceira viva, não ataca pelo próprio botão:
    // só ataca "puxado" junto quando a PARCEIRA atacar. EXCEÇÃO: durante a habilidade do
    // dado 6 (ataque dividido), ele pode atacar sozinho normalmente por essa vez.
    if ((nomeCarta === 'Separado' || nomeCarta === 'Separadois') && typeof parceriaSeparado !== 'undefined') {
        let emModoDividido = typeof separadaoDividido !== 'undefined' && separadaoDividido[idUnico] > 0;
        let idParceira = parceriaSeparado[idUnico];
        let pacoteParceira = idParceira ? document.getElementById("pacote-" + idParceira) : null;
        if (pacoteParceira && !emModoDividido) {
            let nomeParceira = pacoteParceira.querySelector(".nome-carta").innerText.trim();
            return narrar(`👥 ${nomeCarta} está juntado com ${nomeParceira}! Ataque com ${nomeParceira} pra elas atacarem juntas.`);
        }
    }

    if (suportePreparado !== null) {
        equiparSuporte(idUnico);
        return; 
    }

    // 🩹 CORREÇÃO: se uma Traição está em andamento, o clique no botão Atacar
    // deve escolher a VÍTIMA (parceira do traidor), não disparar um ataque normal!
    if (modoTraicao === true) {
        executarTraicao("pacote-" + idUnico);
        return;
    }

    if (turnoAtivo !== 1) return narrar("Ainda não é o seu turno de atacar!");

    let cartaAtacante = bancoDeCartas.find(c => c.nome === nomeCarta);
    if (cartaAtacante) ultimaCartaJogador = cartaAtacante;
    else if (!cartaSilenciadaPeloEcto(idUnico) && pacoteCarta?.dataset.inimigoEspecial === "ecto") {
        ultimaCartaJogador = { id: "ecto", nome: "Ecto", vida: 2, dano: 3, img: "ecto-provisorio.svg" };
    }
    else if (!cartaSilenciadaPeloEcto(idUnico) && pacoteCarta?.dataset.inimigoEspecial === "fraguer") {
        ultimaCartaJogador = { id: "fraguer", nome: "Fraguer", vida: 4, dano: 1, img: "fraguer-provisorio.svg" };
    }
    else if (!cartaSilenciadaPeloEcto(idUnico) && pacoteCarta?.dataset.inimigoEspecial === "fraguer-fundido") {
        ultimaCartaJogador = { id: "fraguer-fundido", nome: "Fraguer Fundido", vida: 2, dano: 8, img: "fraguer-fundido-provisorio.svg" };
    }
    else if (!cartaSilenciadaPeloEcto(idUnico) && pacoteCarta?.dataset.inimigoEspecial === "spiritista") {
        ultimaCartaJogador = { id: "spiritista", nome: "Spiritista", vida: 10, dano: 1, img: "spiritista-provisorio.svg" };
    }
    else if (!cartaSilenciadaPeloEcto(idUnico) && pacoteCarta?.dataset.inimigoEspecial === "sete-negativo") {
        ultimaCartaJogador = { id: "sete-negativo", nome: "7 Negativo", vida: 5, dano: 0, img: "sete-negativo-provisorio.svg" };
    }
    
    let campoInimigo = document.getElementById("campo-j2");
    let inimigosNoCampo = Array.from(campoInimigo.getElementsByClassName("carta-inimiga"));
    if (inimigosNoCampo.length === 0) return narrar("Não há inimigos no campo para atacar!");

    let danoBase = parseFloat(document.getElementById("dano-" + idUnico).innerText);
    let vidaAtual = parseFloat(document.getElementById("vida-" + idUnico).innerText);
    danoPreparado = danoBase;
    ultimoIdQueAtacou = idUnico;

    // Depois de conquistar Fogo ou Gelo, todo ataque normal do Bumerskeleton
    // passa pelo mesmo lançamento do Especial. Não exige novo clique no botão roxo.
    if (nomeCarta === "Bumerskeleton" && especialFixoBumerskeleton[idUnico]) {
        modoAtaque = false;
        modoAtaqueInimigo = false;
        modoEspecialBumerskeleton = true;
        idBumerskeletonEspecialAtivo = idUnico;
        return narrar(`🪃 Especial fixo de ${especialFixoBumerskeleton[idUnico] === 3 ? "FOGO" : "GELO"} ativo! Escolha o alvo do bumerangue.`);
    }

    // 🪵 BARRIL DE BÁRBAROS (Preparar Impacto)
    if (nomeCarta === 'Barril de Bárbaro') {
        modoAlvoBarrilBarbaro = true;
        idBarrilAtivo = idUnico;
        return narrar("🪵 Barril de Bárbaros ativado! Clique em uma carta inimiga para causar 3 de dano de impacto!");
    }
    // 📦 ATIVAÇÃO DO BARRIL (SEU LADO)
    if (nomeCarta.includes('Barril de Goblin')) {
        modoAlvoBarril = true; 
        idBarrilAtivo = idUnico;
        return narrar("📦 Você ativou o Barril! Clique na carta do OPONENTE que vai receber os goblins!");
    }

    if (nomeCarta === 'Trio de Goblin') {
        let goblinsVivos = unidadesVivasTrios[idUnico] || quantidadeUnidadesDoTrio(vidaAtual, configuracaoDoTrio(nomeCarta));
        if (goblinsVivos === 3) narrar(`⚔️ O Trio de Goblin está completo e ataca com ${danoPreparado} de dano!`);
        else if (goblinsVivos === 2) narrar(`⚔️ Um Goblin caiu! Os dois restantes atacam com ${danoPreparado} de dano.`);
        else narrar(`⚔️ Restou apenas um Goblin, que ataca com ${danoPreparado} de dano.`);
    }

    // 👊 TRIO DE BÁRBAROS — cada Bárbaro representa 3 pontos de vida.
    // O dano diminui conforme cada integrante do trio cai: 3 → 2 → 1.
    if (nomeCarta === 'Trio de Bárbaros') {
        let barbarosVivos = unidadesVivasTrios[idUnico] || quantidadeUnidadesDoTrio(vidaAtual, configuracaoDoTrio(nomeCarta));
        if (barbarosVivos === 3) narrar(`⚔️ O Trio de Bárbaros está completo e ataca com ${danoPreparado} de dano!`);
        else if (barbarosVivos === 2) narrar(`⚔️ Um Bárbaro caiu! Os dois restantes atacam com ${danoPreparado} de dano.`);
        else narrar(`⚔️ Restou apenas um Bárbaro, que ataca com ${danoPreparado} de dano.`);
    }

    let ageComoGoblin = (nomeCarta === 'Goblin') || (nomeCarta === 'Trio de Goblin' && vidaAtual <= 2);
    if (ageComoGoblin) {
        let nomeTexto = (nomeCarta === 'Trio de Goblin') ? 'Último Goblin do Trio' : 'Goblin';
        if (!goblinJaAtacouNesteTurno[idUnico]) {
            goblinJaAtacouNesteTurno[idUnico] = true;
            let dado = Math.floor(Math.random() * 6) + 1;
            document.getElementById("dado-tela").innerText = "🎲 " + dado;
            if (dado === 2) {
                // 🤖 Se for o bot jogando, pula o pop-up (ele travaria esperando clique humano)
                // e sempre escolhe o 2º caminho: 2 de dano agora + 1 ataque extra de graça.
                let ehDecisaoDoBot = (typeof window !== "undefined" && window.__rpgBotJogando === true);
                let escolha = ehDecisaoDoBot ? false : confirm(`🎲 PASSIVA DO ${nomeTexto.toUpperCase()}! Você tirou 2 no dado!\n\n[ OK ] = Dar ${danoBase * 2} de dano de uma só vez neste alvo.\n[ CANCELAR ] = Dar apenas ${danoBase} de dano agora e ganhar um Ataque Extra livre.`);
                // 🩹 CORREÇÃO: os dois caminhos tinham o dano fixo em 4 e 2, ignorando o dano
                // ATUAL do Goblin (que muda com Besta/Auvex/Allsforms etc.). Agora usa danoBase.
                if (escolha) { danoPreparado = danoBase * 2; goblinAtaquesGanhos[idUnico] = false; narrar(`🎲 O ${nomeTexto} concentrou força! Causará ${danoPreparado} de dano num golpe único e passará a vez!`); } 
                else {
                    goblinAtaquesGanhos[idUnico] = true;
                    danoPreparado = danoBase;
                    ativarEfeitoVelocidade(idUnico);
                    narrar(`🎲 O ${nomeTexto} ativou a agilidade! Dará ${danoPreparado} de dano agora e terá direito a mais um ataque!`);
                }
            } else { goblinAtaquesGanhos[idUnico] = false; narrar(`🎲 O ${nomeTexto} tirou ${dado}. Apenas um ataque normal de ${danoPreparado} de dano.`); }
        }
    }

    if (nomeCarta === 'Arqueiro') {
        let dado = Math.floor(Math.random() * 6) + 1;
        document.getElementById("dado-tela").innerText = "🎲 " + dado;
        if (dado >= 1 && dado <= 3) { danoPreparado += 1; narrar(`🎯 Arqueiro tirou ${dado}. Dano +1 (Total: ${danoPreparado})!`); } 
        else if (dado >= 4 && dado <= 6) { danoPreparado += 3; narrar(`🎯 Arqueiro atirador de elite (${dado})! Dano +3 (Total: ${danoPreparado})!`); }
    }

    if (nomeCarta === 'Mensageiro' && typeof mensageirosEmArea !== 'undefined' && mensageirosEmArea[idUnico]) {
        narrar(`🌪️ O Mensageiro disparou em ÁREA! Causando 2 de dano a TODOS os inimigos!`);
        inimigosNoCampo.forEach(pacoteInimigo => aplicarDanoAtaqueArea(pacoteInimigo.id, 2, false));
        passarTurno();
        if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
        return; // Retorna para não continuar e pedir clique do mouse
    }

    if (nomeCarta === 'Cavaleiro das Trevas') {
        modoAlvoCavaleiro = true;
        idCavaleiroAtivo = idUnico;
        narrar("⚔️ Clique na carta inimiga que será o ALVO PRINCIPAL do Cavaleiro das Trevas (os vizinhos dela também serão atingidos)!");
        return;
    }
    
    modoAtaque = true; 
    let danoConjunto = danoPreparado + obterSeparadosQueAcompanhamAtaque(idUnico, "j1")
        .reduce((total, parceiro) => total + parceiro.dano, 0);
    narrar(`Você preparou um ataque de ${danoConjunto} de dano! Clique no inimigo que deseja acertar.`);
}

function receberAtaque(idVidaAlvo, idPacoteAlvo) {
    if (modoAtaque === true) {
        let pacoteAlvo = document.getElementById(idPacoteAlvo);
        let nomeAlvoExibido = pacoteAlvo.querySelector(".nome-carta").innerText;
        let idPuro = idPacoteAlvo.replace("pacote-", "");
        let nomeAlvo = obterNomeEfetivoCarta(idPuro, nomeAlvoExibido);

        // 🐴 CAVALO DE TRÓIA: não tem vida, não pode ser atacado.
        if (nomeAlvo.trim() === 'Cavalo de Tróia') {
            return narrar("🐴 O Cavalo de Tróia não pode ser atacado! Escolha outra carta.");
        }

        // 🦇 VAMPI7: abaixo de 3 de vida só fica intangível enquanto ainda tiver aliados.
        // Quando é a última carta do time, materializa para a partida conseguir terminar.
        if (nomeAlvo.trim() === 'Vampi7') {
            if (vampi7EstaIntangivel(pacoteAlvo)) {
                return narrar("🦇 O Vampi7 está intangível enquanto possui aliados! Escolha outra carta.");
            }
        }

        // 👻 O Ecto toca o alvo antes de qualquer defesa. Além de apagar a
        // habilidade do Barril atingido, ele atravessa a proteção de outro Barril,
        // assim como já atravessa os escudos azul e de suporte.
        let ectoIgnoraProtecao = atacanteAtualEh("Ecto");
        if (ectoIgnoraProtecao) aplicarToqueEctoAntesDoDano(idPuro);

        // 🛡️ VERIFICAÇÃO DO BARRIL GUARDA-COSTAS (Alvo Único)
        let idDoBarrilQueProtege = cartasProtegidas[idPuro];
        if (idDoBarrilQueProtege && String(idDoBarrilQueProtege) === String(idPuro)) {
            delete cartasProtegidas[idPuro]; // 🩹 segurança: desfaz qualquer auto-proteção travada
            idDoBarrilQueProtege = null;
        }
        let atacanteIgnoraEscudo = atacanteAtualEh("Cavaleiro das Trevas") || ectoIgnoraProtecao;

        if (idDoBarrilQueProtege && !atacanteIgnoraEscudo) {
            let barrilAindaExiste = document.getElementById("pacote-" + idDoBarrilQueProtege);
            if (barrilAindaExiste) {
                return narrar("🛡️ BLOQUEADO! Esta carta está sob a proteção de um Barril! Você DEVE destruir o Barril protetor primeiro!");
            } else {
                delete cartasProtegidas[idPuro]; // Barril já morreu, quebra o vínculo.
            }
        }

        let parceirosSeparado = obterSeparadosQueAcompanhamAtaque(ultimoIdQueAtacou, "j1");
        let danoGolpeConjunto = danoPreparado
            + parceirosSeparado.reduce((total, parceiro) => total + parceiro.dano, 0);

        // 👻 O Ecto apaga primeiro a habilidade e qualquer escudo aplicado à
        // carta. Por isso seu golpe atravessa tanto o escudo do Guerreiro
        // quanto o concedido pelo suporte Escudo.
        if (!ectoIgnoraProtecao) aplicarToqueEctoAntesDoDano(idPuro);

        // 🛡️ BLOQUEIO DO GUERREIRO
        if (escudoGuerreiro[idPuro] && danoGolpeConjunto > 0) {
            narrar(`🛡️ BLANG! O escudo da carta inimiga bloqueou o ataque e QUEBROU!`);
            delete escudoGuerreiro[idPuro];
            quebrarVisualEscudo(idPuro);
            modoAtaque = false; 
            danoPreparado = 0; 
            passarTurno(); 
            return; 
        }

        let idSeparadoDivididoAntesDoGolpe = obterSeparadaoDivididoAtivo(ultimoIdQueAtacou);
        if (idSeparadoDivididoAntesDoGolpe) {
            animarAtaqueDivididoSeparado(idSeparadoDivididoAntesDoGolpe, ultimoIdQueAtacou, idPacoteAlvo);
        }
        parceirosSeparado.forEach(parceiro =>
            animarAtaqueConjuntoSeparado(parceiro.id, parceiro.idParceiro || ultimoIdQueAtacou, idPacoteAlvo));

        let textoVida = document.getElementById(idVidaAlvo);
        // 🩹 CORREÇÃO: era parseInt, que truncava vida fracionária (ex: 0.75 virava 0) — o jogo
        // tem cartas com valores quebrados (Barril de Goblin, fogo do Bumerskeleton -0.25...),
        // e isso fazia o cálculo do dano sair errado ao atacar essas cartas.
        // 🩹 CORREÇÃO: nunca deixa a vida mostrar número negativo — trava em 0.
        let vidaAtual = Math.max(0, parseFloat(textoVida.innerText) - danoGolpeConjunto);
        let vidaAntesDoGolpe = parseFloat(textoVida.innerText);
        textoVida.innerText = vidaAtual;
        sincronizarDanoDoTrio(idPuro, vidaAntesDoGolpe, vidaAtual);
        
        try {
            if (atacanteAtualEh("Bumerskeleton")) {
                if (typeof executarChainBumerangue === "function") {
                    executarChainBumerangue(ultimoIdQueAtacou, idPuro, "campo-j2");
                } else {
                    narrar("⚠️ A função do ricochete não foi encontrada!");
                }
            }
        } catch (e) {
            console.error("Erro ao ativar bumerangue: ", e);
        }

        if (vidaAtual <= 0) {
            let nomeExibido = pacoteAlvo.querySelector(".nome-carta").innerText;
            let nomeDestaCarta = obterNomeEfetivoCarta(idPuro, nomeExibido);
            if (nomeDestaCarta !== nomeExibido) {
                narrar(`O ${nomeExibido} foi destruído, ativando a passiva copiada de ${nomeDestaCarta}!`);
            }

            narrar("BUM! O alvo inimigo foi DESTRUÍDO!");
            registrarMorte(nomeDestaCarta, "j2");
            guardarOrigemTransformacaoOrk(nomeDestaCarta, idPuro, pacoteAlvo);
            pacoteAlvo.remove();

            ativarPassivasAoMorrer(
                nomeDestaCarta,
                idPuro,
                "campo-j2",
                undefined,
                "O Barril inimigo quebrou!"
            );
        } else {
            narrar("Pow! O alvo tomou " + danoGolpeConjunto + " de dano!");
        }
        if (parceirosSeparado.length > 0) {
            let bonus = danoGolpeConjunto - danoPreparado;
            narrar(`👥 A parceria somou ${bonus} de dano ao golpe (${danoGolpeConjunto} no total)!`);
        }

        // 🦇 VAMPI7 — ataca junto de qualquer carta do mesmo time que atacar.
        dispararVampi7JuntoDoAtaque(ultimoIdQueAtacou, idPacoteAlvo);
        dispararSeteNegativoJuntoDoAtaque(ultimoIdQueAtacou, idPacoteAlvo);
        // 🛸 PORTABLE — ataca junto enquanto a bateria durar.
        dispararPortableJuntoDoAtaque(ultimoIdQueAtacou, idPacoteAlvo);

        modoAtaque = false; 
        danoPreparado = 0; 

        passarTurno();
    } else {
        narrar("Você precisa clicar no botão 'Atacar' primeiro!");
    }

    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
}

function inimigoAtacar(idUnico) {
    if (barrilBarbaroEmAnimacao) return;
    modoAlvoBarril = false;        // 🚀 Desbloqueia o ataque normal do oponente
    modoAlvoBarrilInimigo = false;

    // ❄️ TRAVA DE ATAQUE (LADO DO INIMIGO)
    let pacoteCarta = document.getElementById("pacote-" + idUnico);
    if (pacoteCarta && pacoteCarta.classList.contains("congelada")) {
        narrar("❄️ O oponente tentou atacar, mas a carta está CONGELADA!");
        return; // Cancela o ataque do oponente
    }

    let idSequenciaSeparadoInimigo = obterSeparadaoDivididoAtivo(idUnico);
    if (idSequenciaSeparadoInimigo
        && (separadaoAtacantesNaSequencia[idSequenciaSeparadoInimigo] || []).includes(idUnico)) {
        return narrar("👥 Esta carta da dupla inimiga já atacou. Agora falta a outra.");
    }
    let sequenciaPendenteInimigo = obterSequenciaSeparadoPendenteDoLado("j2");
    if (sequenciaPendenteInimigo && idUnico !== sequenciaPendenteInimigo.idObrigatorio) {
        return narrar("👥 O oponente precisa concluir o ataque com a outra carta da dupla.");
    }

    if (suportePreparado !== null) {
        equiparSuporte(idUnico);
        return;
    }

    // 🩹 CORREÇÃO: idem para o botão Atacar do lado do oponente
    if (modoTraicao === true) {
        executarTraicao("pacote-" + idUnico);
        return;
    }

    if (turnoAtivo !== 2) return narrar("Ainda não é o turno do Oponente atacar!");
    let pacoteInimigo = document.getElementById("pacote-" + idUnico);
    let nomeCartaExibida = pacoteInimigo.querySelector(".nome-carta").innerText;
    let nomeCartaInimiga = obterNomeEfetivoCarta(idUnico, nomeCartaExibida);
    if (cartaSilenciadaPeloEcto(idUnico)) {
        nomeCartaInimiga = "";
        ultimaCartaOponente = null;
    }
    let cartaAtacanteInimigo = bancoDeCartas.find(c => c.nome === nomeCartaInimiga);
    if (cartaAtacanteInimigo) ultimaCartaOponente = cartaAtacanteInimigo;
    else if (!cartaSilenciadaPeloEcto(idUnico) && pacoteInimigo?.dataset.inimigoEspecial === "ecto") {
        ultimaCartaOponente = { id: "ecto", nome: "Ecto", vida: 2, dano: 3, img: "ecto-provisorio.svg" };
    }
    else if (!cartaSilenciadaPeloEcto(idUnico) && pacoteInimigo?.dataset.inimigoEspecial === "fraguer") {
        ultimaCartaOponente = { id: "fraguer", nome: "Fraguer", vida: 4, dano: 1, img: "fraguer-provisorio.svg" };
    }
    else if (!cartaSilenciadaPeloEcto(idUnico) && pacoteInimigo?.dataset.inimigoEspecial === "fraguer-fundido") {
        ultimaCartaOponente = { id: "fraguer-fundido", nome: "Fraguer Fundido", vida: 2, dano: 8, img: "fraguer-fundido-provisorio.svg" };
    }
    else if (!cartaSilenciadaPeloEcto(idUnico) && pacoteInimigo?.dataset.inimigoEspecial === "spiritista") {
        ultimaCartaOponente = { id: "spiritista", nome: "Spiritista", vida: 10, dano: 1, img: "spiritista-provisorio.svg" };
    }
    else if (!cartaSilenciadaPeloEcto(idUnico) && pacoteInimigo?.dataset.inimigoEspecial === "sete-negativo") {
        ultimaCartaOponente = { id: "sete-negativo", nome: "7 Negativo", vida: 5, dano: 0, img: "sete-negativo-provisorio.svg" };
    }

    // 👥 SEPARADO/SEPARADOIS (inimigo) — mesma trava: só ataca puxado pela parceira, exceto
    // durante a habilidade do dado 6 (ataque dividido).
    if ((nomeCartaInimiga === 'Separado' || nomeCartaInimiga === 'Separadois') && typeof parceriaSeparado !== 'undefined') {
        let emModoDividido = typeof separadaoDividido !== 'undefined' && separadaoDividido[idUnico] > 0;
        let idParceira = parceriaSeparado[idUnico];
        let pacoteParceira = idParceira ? document.getElementById("pacote-" + idParceira) : null;
        if (pacoteParceira && !emModoDividido) {
            let nomeParceira = pacoteParceira.querySelector(".nome-carta").innerText.trim();
            return narrar(`👥 O ${nomeCartaInimiga} do oponente está juntado com ${nomeParceira}! Só ataca junto quando ela atacar.`);
        }
    }

    let campoAliado = document.getElementById("campo-j1");
    let aliadosNoCampo = Array.from(campoAliado.getElementsByClassName("carta-aliada"));
    if (aliadosNoCampo.length === 0) return narrar("Você não tem cartas no campo para o oponente atacar!");

    let danoLido = parseFloat(document.getElementById("dano-" + idUnico).innerText);
    let vidaAtual = parseFloat(document.getElementById("vida-" + idUnico).innerText);
    danoInimigoPreparado = danoLido;
    ultimoIdQueAtacou = idUnico;

    if (nomeCartaInimiga === "Bumerskeleton" && especialFixoBumerskeleton[idUnico]) {
        modoAtaque = false;
        modoAtaqueInimigo = false;
        modoEspecialBumerskeleton = true;
        idBumerskeletonEspecialAtivo = idUnico;
        return narrar(`🪃 O Bumerskeleton do oponente atacará com ${especialFixoBumerskeleton[idUnico] === 3 ? "FOGO" : "GELO"} fixo. Escolha o alvo.`);
    }

    // 🪵 BARRIL DE BÁRBAROS (Ataque de Impacto do Oponente)
    if (nomeCartaInimiga.includes('Barril de Bárbaro')) {
        modoAlvoBarrilBarbaroInimigo = true;
        idBarrilAtivo = idUnico;
        narrar("🪵 O Oponente preparou o impacto do Barril de Bárbaros! Clique na SUA carta que receberá 3 de dano.");
        if (aliadosNoCampo.length === 1) {
            aplicarAlvoBarrilBarbaro(aliadosNoCampo[0].id);
        }
        return;
    }
    // 📦 ATIVAÇÃO DO BARRIL (LADO DO INIMIGO)
    if (nomeCartaInimiga.includes('Barril de Goblin')) {
        modoAlvoBarril = true; 
        idBarrilAtivo = idUnico;
        return narrar("📦 O Oponente ativou o Barril! Clique na SUA carta que vai receber os goblins!");
    }

    if (nomeCartaInimiga === 'Trio de Goblin') {
        let goblinsVivos = unidadesVivasTrios[idUnico] || quantidadeUnidadesDoTrio(vidaAtual, configuracaoDoTrio(nomeCartaInimiga));
        if (goblinsVivos === 3) narrar(`⚔️ O Trio de Goblin inimigo está completo e ataca com ${danoInimigoPreparado} de dano!`);
        else if (goblinsVivos === 2) narrar(`⚔️ Um Goblin inimigo caiu! Os dois restantes atacam com ${danoInimigoPreparado} de dano.`);
        else narrar(`⚔️ Restou um Goblin inimigo, que ataca com ${danoInimigoPreparado} de dano.`);
    }

    // 👊 Mesma regressão para o Trio de Bárbaros controlado pelo oponente/bot.
    if (nomeCartaInimiga === 'Trio de Bárbaros') {
        let barbarosVivos = unidadesVivasTrios[idUnico] || quantidadeUnidadesDoTrio(vidaAtual, configuracaoDoTrio(nomeCartaInimiga));
        if (barbarosVivos === 3) narrar(`⚔️ O Trio de Bárbaros inimigo está completo e ataca com ${danoInimigoPreparado} de dano!`);
        else if (barbarosVivos === 2) narrar(`⚔️ Um Bárbaro inimigo caiu! Os dois restantes atacam com ${danoInimigoPreparado} de dano.`);
        else narrar(`⚔️ Restou um Bárbaro inimigo, que ataca com ${danoInimigoPreparado} de dano.`);
    }

    let ageComoGoblin = (nomeCartaInimiga === 'Goblin') || (nomeCartaInimiga === 'Trio de Goblin' && vidaAtual <= 2);
    if (ageComoGoblin) {
        let nomeTexto = (nomeCartaInimiga === 'Trio de Goblin') ? 'Último Goblin do Trio inimigo' : 'Goblin inimigo';
        if (!goblinJaAtacouNesteTurno[idUnico]) {
            goblinJaAtacouNesteTurno[idUnico] = true;
            let dado = Math.floor(Math.random() * 6) + 1;
            document.getElementById("dado-tela").innerText = "🎲 " + dado;
            if (dado === 2) {
                let qtdAliados = aliadosNoCampo.length;
                // 🩹 CORREÇÃO: mesmo problema do lado do jogador — dano fixo em 4 e 2, ignorando
                // o dano ATUAL do Goblin (que muda com Besta/Auvex/Allsforms etc.).
                if (qtdAliados === 1) { danoInimigoPreparado = danoLido * 2; goblinAtaquesGanhos[idUnico] = false; narrar(`🎲 O ${nomeTexto} tirou 2 e concentrou ${danoInimigoPreparado} de dano brutal!`); } 
                else {
                    goblinAtaquesGanhos[idUnico] = true;
                    danoInimigoPreparado = danoLido;
                    ativarEfeitoVelocidade(idUnico);
                    narrar(`🎲 O ${nomeTexto} tirou 2! Atacará com ${danoInimigoPreparado} de dano e fará mais um ataque!`);
                }
            } else { goblinAtaquesGanhos[idUnico] = false; narrar(`🎲 O ${nomeTexto} tirou ${dado}. Ataque normal.`); }
        }
    }

    if (nomeCartaInimiga === 'Arqueiro') {
        let dado = Math.floor(Math.random() * 6) + 1;
        document.getElementById("dado-tela").innerText = "🎲 " + dado;
        if (dado >= 1 && dado <= 3) { danoInimigoPreparado += 1; } 
        else if (dado >= 4 && dado <= 6) { danoInimigoPreparado += 3; }
    }
    
    if (nomeCartaInimiga === 'Mensageiro' && typeof mensageirosEmArea !== 'undefined' && mensageirosEmArea[idUnico]) {
        narrar(`🌪️ O Mensageiro Inimigo disparou em ÁREA! Causando 2 de dano a TODAS as suas cartas!`);
        aliadosNoCampo.forEach(pacoteAliado => aplicarDanoAtaqueArea(pacoteAliado.id, 2, true));
        passarTurno();
        if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
        return;
    }

    if (nomeCartaInimiga === 'Cavaleiro das Trevas') {
        modoAlvoCavaleiroInimigo = true;
        idCavaleiroAtivo = idUnico;
        narrar("⚔️ O Oponente mirou o Cavaleiro das Trevas! Clique na SUA carta que será o ALVO PRINCIPAL (os vizinhos dela também serão atingidos)!");
        return;
    }
    
    modoAtaqueInimigo = true; 
    if (aliadosNoCampo.length === 1) aplicarDanoInimigo(aliadosNoCampo[0].id);
    else {
        let danoConjunto = danoInimigoPreparado + obterSeparadosQueAcompanhamAtaque(idUnico, "j2")
            .reduce((total, parceiro) => total + parceiro.dano, 0);
        narrar(`O Oponente preparou um ataque de ${danoConjunto} de dano! Clique na SUA carta que vai receber o ataque.`);
    }
}

function aplicarDanoInimigo(idPacoteAlvo) {
    let pacoteAlvo = document.getElementById(idPacoteAlvo);
    let idPuro = idPacoteAlvo.replace("pacote-", "");
    let nomeAlvoExibido = pacoteAlvo.querySelector(".nome-carta").innerText;
    let nomeAlvo = obterNomeEfetivoCarta(idPuro, nomeAlvoExibido);

    // 🐴 CAVALO DE TRÓIA: não tem vida, não pode ser atacado.
    if (nomeAlvo.trim() === 'Cavalo de Tróia') {
        return narrar("🐴 O Cavalo de Tróia inimigo não pode ser atacado! Escolha outra carta.");
    }

    // 🦇 A mesma exceção vale para o Vampi7 do inimigo: sozinho ele deixa de ser
    // intangível mesmo abaixo de 3 de vida, evitando uma batalha impossível de encerrar.
    if (nomeAlvo.trim() === 'Vampi7') {
        if (vampi7EstaIntangivel(pacoteAlvo)) {
            return narrar("🦇 O Vampi7 inimigo está intangível enquanto possui aliados! Escolha outra carta.");
        }
    }

    // 👻 Mesma ordem no ataque inimigo: o Ecto apaga a habilidade antes da
    // defesa e atravessa a proteção de um segundo Barril.
    let ectoIgnoraProtecao = atacanteAtualEh("Ecto");
    if (ectoIgnoraProtecao) aplicarToqueEctoAntesDoDano(idPuro);

    // 🛡️ VERIFICAÇÃO DO BARRIL GUARDA-COSTAS
    let idDoBarrilQueProtege = cartasProtegidas[idPuro];
    if (idDoBarrilQueProtege && String(idDoBarrilQueProtege) === String(idPuro)) {
        delete cartasProtegidas[idPuro]; // 🩹 segurança: desfaz qualquer auto-proteção travada
        idDoBarrilQueProtege = null;
    }
    let atacanteIgnoraEscudo = atacanteAtualEh("Cavaleiro das Trevas") || ectoIgnoraProtecao;

    if (idDoBarrilQueProtege && !atacanteIgnoraEscudo) {
        let barrilAindaExiste = document.getElementById("pacote-" + idDoBarrilQueProtege);
        if (barrilAindaExiste) {
            return narrar("🛡️ SEU ESCUDO AGIU! Esta carta está sob proteção. O Oponente DEVE atacar o seu Barril protetor primeiro!");
        } else {
            delete cartasProtegidas[idPuro];
        }
    }

    let parceirosSeparado = obterSeparadosQueAcompanhamAtaque(ultimoIdQueAtacou, "j2");
    let danoGolpeConjunto = danoInimigoPreparado
        + parceirosSeparado.reduce((total, parceiro) => total + parceiro.dano, 0);

    // 👻 Mesma regra no ataque do oponente: o toque do Ecto remove o escudo
    // antes do cálculo, então o dano não é bloqueado.
    if (!ectoIgnoraProtecao) aplicarToqueEctoAntesDoDano(idPuro);

    // 🛡️ BLOQUEIO DO GUERREIRO
    if (escudoGuerreiro[idPuro] && danoGolpeConjunto > 0) {
        narrar(`🛡️ BLANG! Sua carta defendeu o ataque inimigo, mas o escudo QUEBROU!`);
        delete escudoGuerreiro[idPuro];
        quebrarVisualEscudo(idPuro);
        modoAtaqueInimigo = false; 
        danoInimigoPreparado = 0;
        passarTurno(); 
        return; 
    }

    let idSeparadoDivididoAntesDoGolpeInimigo = obterSeparadaoDivididoAtivo(ultimoIdQueAtacou);
    if (idSeparadoDivididoAntesDoGolpeInimigo) {
        animarAtaqueDivididoSeparado(idSeparadoDivididoAntesDoGolpeInimigo, ultimoIdQueAtacou, idPacoteAlvo);
    }
    parceirosSeparado.forEach(parceiro =>
        animarAtaqueConjuntoSeparado(parceiro.id, parceiro.idParceiro || ultimoIdQueAtacou, idPacoteAlvo));

    let idVida = idPacoteAlvo.replace("pacote-", "vida-");
    let textoVida = document.getElementById(idVida);
    // 🩹 CORREÇÃO: nunca deixa a vida mostrar número negativo — trava em 0.
    let vidaAtual = Math.max(0, parseFloat(textoVida.innerText) - danoGolpeConjunto);
    let vidaAntesDoGolpe = parseFloat(textoVida.innerText);
    textoVida.innerText = vidaAtual;
    sincronizarDanoDoTrio(idPuro, vidaAntesDoGolpe, vidaAtual);

    // 🪃 COLOQUE ESTE BLOCO AQUI: Ricochete do Bumerskeleton do Inimigo
    try {
        if (atacanteAtualEh("Bumerskeleton")) {
            if (typeof executarChainBumerangue === "function") {
                executarChainBumerangue(ultimoIdQueAtacou, idPuro, "campo-j1");
            }
        }
    } catch (e) {
        console.error("Erro ao ativar bumerangue oponente: ", e);
    }

    if (vidaAtual <= 0) {
        let nomeExibido = pacoteAlvo.querySelector(".nome-carta").innerText;
        let nomeDestaCarta = obterNomeEfetivoCarta(idPuro, nomeExibido);
        if (nomeDestaCarta !== nomeExibido) {
            narrar(`Seu ${nomeExibido} foi destruído, ativando a passiva copiada de ${nomeDestaCarta}!`);
        }

        narrar("Sua carta foi DESTRUÍDA pelo oponente!");
        registrarMorte(nomeDestaCarta, "j1");
        guardarOrigemTransformacaoOrk(nomeDestaCarta, idPuro, pacoteAlvo);
        pacoteAlvo.remove();

        ativarPassivasAoMorrer(
            nomeDestaCarta,
            idPuro,
            "campo-j1",
            undefined,
            "Seu Barril quebrou!"
        );
    } else {
        narrar(`Sua carta sofreu ${danoGolpeConjunto} de dano!`);
    }
    if (parceirosSeparado.length > 0) {
        let bonus = danoGolpeConjunto - danoInimigoPreparado;
        narrar(`👥 A parceria do oponente somou ${bonus} de dano ao golpe (${danoGolpeConjunto} no total)!`);
    }

    // 🦇 VAMPI7 — ataca junto de qualquer carta do mesmo time que atacar.
    dispararVampi7JuntoDoAtaque(ultimoIdQueAtacou, idPacoteAlvo);
    dispararSeteNegativoJuntoDoAtaque(ultimoIdQueAtacou, idPacoteAlvo);
    // 🛸 PORTABLE — ataca junto enquanto a bateria durar.
    dispararPortableJuntoDoAtaque(ultimoIdQueAtacou, idPacoteAlvo);

    modoAtaqueInimigo = false; 
    danoInimigoPreparado = 0;

    passarTurno();

    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
}

// 🤝 UNIDÃO — desenha pequenos caminhos de energia saindo das cartas do time e
// convergindo no Unidão sempre que a parcela de dano copiada realmente muda.
function animarForcaReunidaUnidao(pacoteUnidao, fontesAliadas, novoBonus) {
    if (!pacoteUnidao) return;
    let rectDestino = pacoteUnidao.getBoundingClientRect();
    let destinoX = rectDestino.left + rectDestino.width / 2;
    let destinoY = rectDestino.top + rectDestino.height / 2;
    let fontes = (fontesAliadas || []).filter(p => p && p.isConnected).slice(-6);

    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("energia-reunida-unidao");
    svg.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);
    fontes.forEach((fonte, indice) => {
        let rectFonte = fonte.getBoundingClientRect();
        let inicioX = rectFonte.left + rectFonte.width / 2;
        let inicioY = rectFonte.top + rectFonte.height / 2;
        let meioX = (inicioX + destinoX) / 2;
        let meioY = Math.min(inicioY, destinoY) - 34 - indice * 3;
        let caminho = document.createElementNS("http://www.w3.org/2000/svg", "path");
        caminho.setAttribute("d", `M ${inicioX} ${inicioY} Q ${meioX} ${meioY} ${destinoX} ${destinoY}`);
        caminho.style.setProperty("--atraso-uniao", (indice * 70) + "ms");
        svg.appendChild(caminho);
    });

    let nucleo = document.createElement("div");
    nucleo.className = "nucleo-forca-unidao";
    nucleo.style.left = destinoX + "px";
    nucleo.style.top = destinoY + "px";
    nucleo.innerHTML = `<span>🤝</span><b>+${novoBonus}</b><i></i><i></i><i></i>`;

    document.body.appendChild(svg);
    document.body.appendChild(nucleo);
    pacoteUnidao.classList.remove("unidao-recebendo-forca");
    void pacoteUnidao.offsetWidth;
    pacoteUnidao.classList.add("unidao-recebendo-forca");

    setTimeout(() => {
        svg.remove();
        nucleo.remove();
        if (pacoteUnidao.isConnected) pacoteUnidao.classList.remove("unidao-recebendo-forca");
    }, 1450);
}

// 👥 Mantém um vínculo fino e discreto entre o Separado/Separadois e sua parceira.
// Os caminhos existentes só têm as coordenadas atualizadas, evitando recriar elementos
// sem necessidade dentro do observador da arena.
function sincronizarVinculosSeparado() {
    let camada = document.getElementById("camada-vinculos-separado");
    if (!camada) {
        camada = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        camada.id = "camada-vinculos-separado";
        camada.classList.add("camada-vinculos-separado");
        document.body.appendChild(camada);
    }
    camada.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);

    let desejados = new Set();
    Object.entries(parceriaSeparado || {}).forEach(([idSeparado, idParceira]) => {
        let separado = document.getElementById("pacote-" + idSeparado);
        let parceira = document.getElementById("pacote-" + idParceira);
        if (!separado || !parceira) return;

        let chave = idSeparado + "--" + idParceira;
        desejados.add(chave);
        let grupo = Array.from(camada.querySelectorAll("g[data-vinculo]")).find(g => g.dataset.vinculo === chave);
        if (!grupo) {
            grupo = document.createElementNS("http://www.w3.org/2000/svg", "g");
            grupo.dataset.vinculo = chave;
            let base = document.createElementNS("http://www.w3.org/2000/svg", "path");
            base.classList.add("vinculo-separado-base");
            let brilho = document.createElementNS("http://www.w3.org/2000/svg", "path");
            brilho.classList.add("vinculo-separado-brilho");
            grupo.appendChild(base);
            grupo.appendChild(brilho);
            camada.appendChild(grupo);
        }

        let a = separado.getBoundingClientRect();
        let b = parceira.getBoundingClientRect();
        let x1 = a.left + a.width / 2;
        let y1 = a.top + a.height / 2;
        let x2 = b.left + b.width / 2;
        let y2 = b.top + b.height / 2;
        let curva = `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 22} ${x2} ${y2}`;
        grupo.querySelectorAll("path").forEach(path => path.setAttribute("d", curva));
    });

    Array.from(camada.querySelectorAll("g[data-vinculo]")).forEach(grupo => {
        if (!desejados.has(grupo.dataset.vinculo)) grupo.remove();
    });
}

function criarEcoAtaqueSeparado(pacoteOrigem, pacoteAlvo, classeExtra, atraso) {
    if (!pacoteOrigem || !pacoteAlvo) return null;
    let origem = pacoteOrigem.getBoundingClientRect();
    let alvo = pacoteAlvo.getBoundingClientRect();
    let eco = document.createElement("div");
    eco.className = "eco-ataque-separado " + (classeExtra || "");
    eco.style.setProperty("--separado-inicio-x", (origem.left + origem.width / 2) + "px");
    eco.style.setProperty("--separado-inicio-y", (origem.top + origem.height / 2) + "px");
    eco.style.setProperty("--separado-meio-x", ((origem.left + origem.width / 2 + alvo.left + alvo.width / 2) / 2) + "px");
    eco.style.setProperty("--separado-meio-y", (Math.min(origem.top + origem.height / 2, alvo.top + alvo.height / 2) - 38) + "px");
    eco.style.setProperty("--separado-fim-x", (alvo.left + alvo.width / 2) + "px");
    eco.style.setProperty("--separado-fim-y", (alvo.top + alvo.height / 2) + "px");
    eco.style.animationDelay = (atraso || 0) + "ms";
    let img = pacoteOrigem.querySelector("img");
    eco.innerHTML = img && img.src ? `<img src="${img.src}" alt="">` : "<span>👥</span>";
    document.body.appendChild(eco);
    setTimeout(() => eco.remove(), 1150 + (atraso || 0));
    return eco;
}

// Ataque normal em parceria: as duas imagens espectrais avançam para o mesmo alvo.
function animarAtaqueConjuntoSeparado(idSeparado, idParceira, idPacoteAlvo) {
    let separado = document.getElementById("pacote-" + idSeparado);
    let parceira = document.getElementById("pacote-" + idParceira);
    let alvo = document.getElementById(idPacoteAlvo);
    if (!separado || !parceira || !alvo) return;

    criarEcoAtaqueSeparado(parceira, alvo, "eco-parceira-separado", 0);
    criarEcoAtaqueSeparado(separado, alvo, "eco-dono-separado", 100);
    separado.classList.add("separado-atacando-junto");
    parceira.classList.add("separado-atacando-junto");
    alvo.classList.add("impacto-dupla-separado");
    setTimeout(() => {
        if (separado.isConnected) separado.classList.remove("separado-atacando-junto");
        if (parceira.isConnected) parceira.classList.remove("separado-atacando-junto");
        if (alvo.isConnected) alvo.classList.remove("impacto-dupla-separado");
    }, 1050);
}

// Especial: mostra o Separadão se abrindo em duas partes antes de cada integrante
// escolher um alvo diferente.
function animarAtivacaoDivisaoSeparado(idSeparado, idParceira) {
    let separado = document.getElementById("pacote-" + idSeparado);
    let parceira = document.getElementById("pacote-" + idParceira);
    if (!separado || !parceira) return;
    let rect = separado.getBoundingClientRect();
    let sinal = document.createElement("div");
    sinal.className = "sinal-divisao-separadao";
    sinal.style.left = (rect.left + rect.width / 2) + "px";
    sinal.style.top = (rect.top + rect.height / 2) + "px";
    let img = separado.querySelector("img");
    let src = img && img.src ? img.src : "";
    sinal.innerHTML = `<i class="metade-separadao metade-um"${src ? ` style="--imagem-separadao:url('${src}')"` : ""}></i><i class="metade-separadao metade-dois"${src ? ` style="--imagem-separadao:url('${src}')"` : ""}></i><b>2 ALVOS</b>`;
    document.body.appendChild(sinal);
    separado.classList.add("separadao-preparando-divisao");
    parceira.classList.add("separadao-preparando-divisao");
    setTimeout(() => {
        sinal.remove();
        if (separado.isConnected) separado.classList.remove("separadao-preparando-divisao");
        if (parceira.isConnected) parceira.classList.remove("separadao-preparando-divisao");
    }, 1450);
}

function animarAtaqueDivididoSeparado(idSeparado, idAtacante, idPacoteAlvo) {
    let atacante = document.getElementById("pacote-" + idAtacante);
    let alvo = document.getElementById(idPacoteAlvo);
    if (!atacante || !alvo) return;
    let classe = idAtacante === idSeparado ? "eco-metade-esquerda" : "eco-metade-direita";
    criarEcoAtaqueSeparado(atacante, alvo, "eco-ataque-dividido " + classe, 0);
    alvo.classList.add("impacto-metade-separadao");
    setTimeout(() => {
        if (alvo.isConnected) alvo.classList.remove("impacto-metade-separadao");
    }, 900);
}

function animarReuniaoSeparado(idSeparado) {
    let separado = document.getElementById("pacote-" + idSeparado);
    let idParceira = parceriaSeparado[idSeparado];
    let parceira = document.getElementById("pacote-" + idParceira);
    [separado, parceira].forEach(pacote => {
        if (!pacote) return;
        pacote.classList.remove("separadao-reunindo");
        void pacote.offsetWidth;
        pacote.classList.add("separadao-reunindo");
        setTimeout(() => {
            if (pacote.isConnected) pacote.classList.remove("separadao-reunindo");
        }, 1000);
    });
}

function atualizarTodosUnidoes() {
    let campoJ1 = document.getElementById("campo-j1");
    let campoJ2 = document.getElementById("campo-j2");
    if (campoJ1) atualizarUnidoesNoCampo(campoJ1);
    if (campoJ2) atualizarUnidoesNoCampo(campoJ2);
}

function atualizarUnidoesNoCampo(campoHTML) {
    let todasAsCartas = Array.from(campoHTML.querySelectorAll("div[id^='pacote-']"));

    // 🩹 CORREÇÃO: o Ctrl C/V que copia a passiva do Unidão NUNCA muda o nome exibido na
    // tela (continua "Ctrl C"/"Ctrl V") — a identidade copiada fica só no objeto ctrlV[idUnico].
    // A checagem antiga só olhava o nome exibido (e ainda procurava por "Ctrl V (Unidão)", uma
    // string que não é usada em lugar nenhum do jogo), então o Ctrl C nunca recebia o bônus do
    // Unidão mesmo depois de copiar a passiva dele. Agora também conta quem copiou "Unidão".
    let ehUnidao = function (pacote) {
        let idUnico = pacote.id.replace("pacote-", "");
        let nome = pacote.querySelector(".nome-carta").innerText;
        return obterNomeEfetivoCarta(idUnico, nome) === "Unidão";
    };

    let unidoes = todasAsCartas.filter(ehUnidao);
    let outrasCartas = todasAsCartas.filter(pacote => !ehUnidao(pacote));

    // 1. Acha o MAIOR dano entre as outras cartas
    let maiorDano = 0;
    outrasCartas.forEach(pacote => {
        let idUnico = pacote.id.replace("pacote-", "");
        let spanDano = document.getElementById("dano-" + idUnico);
        if (spanDano) {
            // 🩹 CORREÇÃO: era parseInt, que truncava dano fracionário (ex: 2.5 virava 2) —
            // o jogo tem várias cartas com dano quebrado (Curandeiro +0.5, Bumerskeleton -0.25...)
            let dano = parseFloat(spanDano.innerText) || 0;
            if (dano > maiorDano) maiorDano = dano;
        }
    });

    // 2. Atualiza somente a parcela variável da Passiva do Unidão.
    // O valor mostrado na tela também pode conter melhorias permanentes (Auvex, Besta,
    // bônus do Curandeiro, Ctrl C/V etc.). A versão antiga sempre fazia `1 + maiorDano`
    // e apagava essas melhorias. Agora removemos o bônus variável anterior, preservamos
    // o dano próprio já modificado e somamos o novo maior dano aliado.
    unidoes.forEach(pacote => {
        let idUnico = pacote.id.replace("pacote-", "");
        let spanDano = document.getElementById("dano-" + idUnico);
        if (cartaSilenciadaPeloEcto(idUnico)) {
            bonusUnidao[idUnico] = 0;
            return;
        }
        
        if (spanDano) {
            let danoAtual = parseFloat(spanDano.innerText) || 0;
            let bonusVariavelAnterior = bonusUnidao[idUnico] || 0;
            let danoProprioModificado = Math.max(0, danoAtual - bonusVariavelAnterior);
            let novoDano = danoProprioModificado + maiorDano;

            if (novoDano !== danoAtual) {
                spanDano.innerText = novoDano;
                mostrarEfeitoAtaque(idUnico);
            }
            if (maiorDano !== bonusVariavelAnterior) {
                animarForcaReunidaUnidao(pacote, outrasCartas, maiorDano);
            }
            bonusUnidao[idUnico] = maiorDano;
        }
    });
}
// 🛡️ Versão de aplicarDanoDireto usada especificamente por ATAQUES EM ÁREA
// (Cavaleiro das Trevas, Mensageiro em Modo Área, impacto do Barril). Ao contrário de
// aplicarDanoDireto (usada por poções e habilidades, que sempre ignoram o escudo), esta
// função CHECA o escudo do Guerreiro pra cada alvo individualmente: se aquele alvo
// específico estiver escudado, o golpe dele é anulado e o escudo quebra — mas os OUTROS
// alvos da mesma área continuam recebendo dano normalmente.
function ehPacoteVampi7(pacote) {
    if (!pacote || !pacote.id || !pacote.id.startsWith("pacote-")) return false;
    let nomeEl = pacote.querySelector(".nome-carta");
    if (!nomeEl) return false;
    let idPuro = pacote.id.replace("pacote-", "");
    return obterNomeEfetivoCarta(idPuro, nomeEl.innerText.trim()) === "Vampi7";
}

function vampi7EstaSozinho(pacote) {
    if (!ehPacoteVampi7(pacote)) return false;
    let campo = pacote.closest("#campo-j1, #campo-j2");
    if (!campo) return false;
    return !Array.from(campo.querySelectorAll(":scope > div[id^='pacote-']"))
        .some(outraCarta => outraCarta !== pacote);
}

// Abaixo de 3 de vida, o Vampi7 fica intangível apenas se houver pelo menos outra
// carta do time em campo. Sozinho, ele materializa para poder lutar e ser derrotado.
function vampi7EstaIntangivel(pacote) {
    if (!ehPacoteVampi7(pacote)) return false;

    let idVampi = pacote.id.replace("pacote-", "");
    let vidaEl = document.getElementById("vida-" + idVampi);
    let vidaAtual = vidaEl ? (parseFloat(vidaEl.innerText) || 0) : 0;
    return vidaAtual < 3 && !vampi7EstaSozinho(pacote);
}
window.vampi7EstaIntangivel = vampi7EstaIntangivel;

// A névoa também serve como informação de jogo: ela só aparece enquanto a
// intangibilidade realmente estiver protegendo o Vampi7.
function sincronizarVisuaisVampi7() {
    document.querySelectorAll("#campo-j1 div[id^='pacote-'], #campo-j2 div[id^='pacote-']").forEach(pacote => {
        if (!ehPacoteVampi7(pacote)
            || pacote.classList.contains("vampi7-ataque-em-curso")
            || pacote.classList.contains("vampi7-materializando")) return;

        let idVampi = pacote.id.replace("pacote-", "");
        let sozinho = vampi7EstaSozinho(pacote);
        let danoEl = document.getElementById("dano-" + idVampi);

        // O ponto de dano é um bônus condicional. Marcamos o estado antes de alterar
        // o texto para o observador ao vivo nunca somar ou retirar duas vezes.
        if (sozinho && !bonusVampi7Sozinho[idVampi]) {
            bonusVampi7Sozinho[idVampi] = true;
            if (danoEl) danoEl.innerText = (parseFloat(danoEl.innerText) || 0) + 1;
            if (typeof mostrarEfeitoAtaque === "function") mostrarEfeitoAtaque(idVampi);
        } else if (!sozinho && bonusVampi7Sozinho[idVampi]) {
            delete bonusVampi7Sozinho[idVampi];
            if (danoEl) danoEl.innerText = Math.max(0, (parseFloat(danoEl.innerText) || 0) - 1);
            if (typeof mostrarEfeitoPerdaAtaque === "function") mostrarEfeitoPerdaAtaque(idVampi);
        }

        let intangivel = vampi7EstaIntangivel(pacote);
        let nevoaExistente = pacote.querySelector(":scope > .nevoa-intangivel-vampi7");

        pacote.classList.toggle("vampi7-intangivel", !!intangivel);
        pacote.classList.toggle("vampi7-materializado", !intangivel);

        if (intangivel && !nevoaExistente) {
            let nevoa = document.createElement("div");
            nevoa.className = "nevoa-intangivel-vampi7";
            nevoa.setAttribute("aria-hidden", "true");
            nevoa.innerHTML = "<i></i><i></i><i></i><span>🦇</span>";
            pacote.appendChild(nevoa);
        } else if (!intangivel && nevoaExistente) {
            nevoaExistente.remove();
        }
    });

    // Remove somente registros órfãos. Uma transformação de Ctrl redefine os atributos
    // da carta por conta própria, então aqui não mexemos no dano de quem deixou de ser Vampi7.
    Object.keys(bonusVampi7Sozinho).forEach(idVampi => {
        let pacote = document.getElementById("pacote-" + idVampi);
        if (!pacote || !ehPacoteVampi7(pacote)) delete bonusVampi7Sozinho[idVampi];
    });
}

function animarMaterializacaoVampi7(pacoteVampi) {
    if (!pacoteVampi || !pacoteVampi.isConnected) return;

    pacoteVampi.classList.remove("vampi7-intangivel", "vampi7-ataque-em-curso", "vampi7-materializando");
    void pacoteVampi.offsetWidth;
    pacoteVampi.classList.add("vampi7-materializado", "vampi7-materializando");

    let nevoa = pacoteVampi.querySelector(":scope > .nevoa-intangivel-vampi7");
    if (nevoa) nevoa.classList.add("nevoa-sendo-absorvida");

    let olhos = document.createElement("div");
    olhos.className = "olhos-materializacao-vampi7";
    olhos.setAttribute("aria-hidden", "true");
    olhos.innerHTML = "<i></i><i></i>";
    pacoteVampi.appendChild(olhos);

    setTimeout(() => {
        if (nevoa && nevoa.parentNode) nevoa.remove();
        if (olhos.parentNode) olhos.remove();
        pacoteVampi.classList.remove("vampi7-materializando");
        sincronizarVisuaisVampi7();
    }, 1150);
}

// O morcego e a energia usam posições fixas guardadas antes do dano. Assim a animação
// continua até o fim mesmo quando o golpe principal já removeu o alvo da arena.
function animarAtaqueVampi7(pacoteVampi, pacoteAlvo, indice, aoRetornar) {
    if (!pacoteVampi) {
        if (typeof aoRetornar === "function") aoRetornar();
        return;
    }

    let origem = pacoteVampi.getBoundingClientRect();
    let destino;
    if (pacoteAlvo) {
        destino = pacoteAlvo.getBoundingClientRect();
    } else {
        let campoOposto = pacoteVampi.closest("#campo-j1")
            ? document.getElementById("campo-j2")
            : document.getElementById("campo-j1");
        destino = campoOposto ? campoOposto.getBoundingClientRect() : origem;
    }

    let atraso = Math.min(indice * 90, 270);
    let inicioX = origem.left + origem.width / 2;
    let inicioY = origem.top + origem.height * 0.42;
    let fimX = destino.left + destino.width / 2;
    let fimY = destino.top + destino.height * 0.46;
    let arcoY = Math.min(inicioY, fimY) - 48;

    pacoteVampi.classList.add("vampi7-ataque-em-curso");

    let morcego = document.createElement("div");
    morcego.className = "morcego-ataque-vampi7";
    morcego.setAttribute("aria-hidden", "true");
    morcego.innerText = "🦇";
    morcego.style.setProperty("--vampi-inicio-x", inicioX + "px");
    morcego.style.setProperty("--vampi-inicio-y", inicioY + "px");
    morcego.style.setProperty("--vampi-meio-x", ((inicioX + fimX) / 2) + "px");
    morcego.style.setProperty("--vampi-meio-y", arcoY + "px");
    morcego.style.setProperty("--vampi-fim-x", fimX + "px");
    morcego.style.setProperty("--vampi-fim-y", fimY + "px");
    morcego.style.animationDelay = atraso + "ms";
    document.body.appendChild(morcego);

    setTimeout(() => {
        let mordida = document.createElement("div");
        mordida.className = "mordida-vampi7";
        mordida.setAttribute("aria-hidden", "true");
        mordida.style.left = fimX + "px";
        mordida.style.top = fimY + "px";
        mordida.innerHTML = "<i></i><i></i>";
        document.body.appendChild(mordida);
        setTimeout(() => mordida.remove(), 680);

        let energia = document.createElement("div");
        energia.className = "energia-roubada-vampi7";
        energia.setAttribute("aria-hidden", "true");
        energia.style.setProperty("--vampi-energia-inicio-x", fimX + "px");
        energia.style.setProperty("--vampi-energia-inicio-y", fimY + "px");
        energia.style.setProperty("--vampi-energia-fim-x", inicioX + "px");
        energia.style.setProperty("--vampi-energia-fim-y", inicioY + "px");
        document.body.appendChild(energia);
        setTimeout(() => energia.remove(), 760);
    }, 470 + atraso);

    setTimeout(() => {
        morcego.remove();
        if (typeof aoRetornar === "function") aoRetornar();
    }, 1120 + atraso);
}

// 🦇 VAMPI7 — sempre que QUALQUER carta do mesmo dono ataca, todo Vampi7 desse time
// ataca junto no MESMO alvo (sem precisar de parceira fixa, ao contrário do Separado) e
// ganha 1 de vida por ter atacado, mesmo que o dano dela ainda seja 0.
function dispararVampi7JuntoDoAtaque(idAtacante, idPacoteAlvo) {
    let pacoteAtacante = document.getElementById("pacote-" + idAtacante);
    if (!pacoteAtacante) return;

    let campoDoAtacanteId = pacoteAtacante.closest("#campo-j1") ? "campo-j1" : "campo-j2";
    let classeMesmoTime = (campoDoAtacanteId === "campo-j1") ? "carta-aliada" : "carta-inimiga";
    let campoDoAtacante = document.getElementById(campoDoAtacanteId);
    if (!campoDoAtacante) return;

    let ehAtaqueDoLadoInimigo = (campoDoAtacanteId === "campo-j2"); // mesma convenção de aplicarDanoAtaqueArea

    let vampiros = Array.from(campoDoAtacante.getElementsByClassName(classeMesmoTime)).filter(pacote => {
        let nomeEl = pacote.querySelector(".nome-carta");
        let idP = pacote.id.replace("pacote-", "");
        return nomeEl && obterNomeEfetivoCarta(idP, nomeEl.innerText.trim()) === "Vampi7" && pacote.id !== "pacote-" + idAtacante && !cartaSilenciadaPeloEcto(idP);
    });
    if (vampiros.length === 0) return;

    vampiros.forEach((pacoteVampi, indice) => {
        let idVampi = pacoteVampi.id.replace("pacote-", "");
        let pacoteAlvo = document.getElementById(idPacoteAlvo);
        let alvoAindaExiste = !!pacoteAlvo;

        let txtDanoVampi = document.getElementById("dano-" + idVampi);
        let danoVampi = txtDanoVampi ? parseFloat(txtDanoVampi.innerText) || 0 : 0;
        let txtVidaVampi = document.getElementById("vida-" + idVampi);
        let vidaAntes = txtVidaVampi ? (parseFloat(txtVidaVampi.innerText) || 0) : 0;
        let vidaDepois = vidaAntes + 1;

        animarAtaqueVampi7(pacoteVampi, pacoteAlvo, indice, () => {
            if (!pacoteVampi.isConnected) return;
            if (typeof mostrarEfeitoVida === "function") mostrarEfeitoVida(idVampi, "ganhou");

            if (vidaAntes < 3 && vidaDepois >= 3) {
                animarMaterializacaoVampi7(pacoteVampi);
            } else {
                pacoteVampi.classList.remove("vampi7-ataque-em-curso");
                sincronizarVisuaisVampi7();
            }
        });

        if (danoVampi > 0 && alvoAindaExiste) {
            aplicarDanoAtaqueArea(idPacoteAlvo, danoVampi, ehAtaqueDoLadoInimigo);
        }

        // 🦇 A cura acontece SEMPRE que ela ataca junto, mesmo se o alvo já tiver morrido
        // com o golpe principal antes dela — "ao atacar" não depende do alvo sobreviver.
        if (txtVidaVampi) {
            txtVidaVampi.innerText = vidaDepois;
        }

        narrar(`🦇 Vampi7 atacou junto${(danoVampi > 0 && alvoAindaExiste) ? ` (${danoVampi} de dano no mesmo alvo)` : ""} e recuperou 1 de vida!`);
    });
}

// ➖ 7 NEGATIVO — acompanha os ataques do time como o Vampi7. Ele começa com
// dano 0, rouba até 1 de ataque do alvo a cada investida e, nos ataques
// seguintes, usa normalmente todo o dano que já acumulou.
function dispararSeteNegativoJuntoDoAtaque(idAtacante, idPacoteAlvo) {
    let pacoteAtacante = document.getElementById("pacote-" + idAtacante);
    let pacoteAlvo = document.getElementById(idPacoteAlvo);
    if (!pacoteAtacante || !pacoteAlvo || typeof window.rpgRoubarDanoSeteNegativo !== "function") return;

    let campo = pacoteAtacante.closest("#campo-j1") || pacoteAtacante.closest("#campo-j2");
    if (!campo) return;
    let setes = Array.from(campo.querySelectorAll(":scope > [data-inimigo-especial='sete-negativo']"))
        .filter(pacote => {
            let id = pacote.id.replace("pacote-", "");
            return id !== idAtacante && !cartaSilenciadaPeloEcto(id);
        });

    if (setes.length === 0) return;

    // Todos participam do mesmo ataque. Por isso cada 7 Negativo consulta o
    // dano que o alvo possuía no começo da ação: o CTRL copiado não pode
    // consumir o ponto e impedir o 7 Negativo original de também evoluir.
    let idAlvo = String(idPacoteAlvo).replace("pacote-", "");
    let txtDanoAlvo = document.getElementById("dano-" + idAlvo);
    let danoAlvoNoInicio = txtDanoAlvo ? Math.max(0, parseFloat(txtDanoAlvo.innerText) || 0) : 0;
    let ataquesAcumulados = setes.map(pacote => {
        let idSete = pacote.id.replace("pacote-", "");
        let txtDanoSete = document.getElementById("dano-" + idSete);
        return {
            pacote,
            idSete,
            dano: txtDanoSete ? Math.max(0, parseFloat(txtDanoSete.innerText) || 0) : 0
        };
    });

    // Primeiro registra o roubo de todos. Assim todos recebem seu ponto mesmo
    // se o dano acumulado de um deles destruir o alvo logo depois.
    ataquesAcumulados.forEach((sete, indice) => {
        if (!sete.pacote.isConnected) return;
        window.rpgRoubarDanoSeteNegativo(
            sete.idSete,
            idPacoteAlvo,
            indice === ataquesAcumulados.length - 1,
            danoAlvoNoInicio,
            indice
        );
    });

    let ehAtaqueDoLadoInimigo = campo.id === "campo-j2";
    ataquesAcumulados.forEach(sete => {
        if (sete.dano <= 0 || !sete.pacote.isConnected || !document.getElementById(idPacoteAlvo)) return;
        aplicarDanoAtaqueArea(idPacoteAlvo, sete.dano, ehAtaqueDoLadoInimigo);
    });
}

// 🛸 Um feixe fino sai da parte central do drone e chega ao mesmo alvo do aliado.
// A posição do alvo pode vir previamente guardada para ataques que removem a carta antes
// dos acompanhantes entrarem em ação, como o Cavaleiro das Trevas.
function animarFeixePortable(pacotePortable, pacoteAlvo, indice, retanguloAlvoSalvo) {
    if (!pacotePortable) return;

    let origem = pacotePortable.getBoundingClientRect();
    let destino = pacoteAlvo ? pacoteAlvo.getBoundingClientRect() : retanguloAlvoSalvo;
    if (!destino) {
        let campoOposto = pacotePortable.closest("#campo-j1")
            ? document.getElementById("campo-j2")
            : document.getElementById("campo-j1");
        destino = campoOposto ? campoOposto.getBoundingClientRect() : origem;
    }

    let inicioX = origem.left + origem.width / 2;
    let inicioY = origem.top + origem.height * 0.46;
    let fimX = destino.left + destino.width / 2;
    let fimY = destino.top + destino.height * 0.48;
    let distancia = Math.hypot(fimX - inicioX, fimY - inicioY);
    let angulo = Math.atan2(fimY - inicioY, fimX - inicioX) * 180 / Math.PI;
    let atraso = Math.min((indice || 0) * 85, 255);

    pacotePortable.classList.remove("portable-disparando");
    void pacotePortable.offsetWidth;
    pacotePortable.classList.add("portable-disparando");

    let feixe = document.createElement("div");
    feixe.className = "feixe-luz-portable";
    feixe.setAttribute("aria-hidden", "true");
    feixe.style.left = inicioX + "px";
    feixe.style.top = inicioY + "px";
    feixe.style.width = distancia + "px";
    feixe.style.setProperty("--portable-angulo", angulo + "deg");
    feixe.style.animationDelay = atraso + "ms";
    document.body.appendChild(feixe);

    setTimeout(() => {
        let impacto = document.createElement("div");
        impacto.className = "impacto-feixe-portable";
        impacto.setAttribute("aria-hidden", "true");
        impacto.style.left = fimX + "px";
        impacto.style.top = fimY + "px";
        impacto.innerHTML = "<i></i><i></i><i></i><i></i>";
        document.body.appendChild(impacto);
        setTimeout(() => impacto.remove(), 620);
    }, 310 + atraso);

    setTimeout(() => {
        feixe.remove();
        if (pacotePortable.isConnected) pacotePortable.classList.remove("portable-disparando");
    }, 820 + atraso);
}

// Quando a bateria acaba, o original é removido da partida imediatamente e somente este
// eco visual cai. Portanto o Portable não continua sendo contado como tropa durante a queda.
function animarQuedaEQuebraPortable(pacotePortable) {
    if (!pacotePortable) return;

    let rect = pacotePortable.getBoundingClientRect();
    let eco = pacotePortable.cloneNode(true);
    eco.removeAttribute("id");
    eco.querySelectorAll("[id]").forEach(elemento => elemento.removeAttribute("id"));
    eco.querySelectorAll("button").forEach(botao => botao.remove());
    eco.querySelectorAll("[onclick]").forEach(elemento => elemento.removeAttribute("onclick"));
    eco.className = pacotePortable.className + " eco-portable-caindo";
    eco.style.left = rect.left + "px";
    eco.style.top = rect.top + "px";
    eco.style.width = rect.width + "px";
    eco.style.height = rect.height + "px";

    let rachaduras = document.createElement("div");
    rachaduras.className = "rachaduras-portable";
    rachaduras.innerHTML = "<i></i><i></i><i></i>";
    eco.appendChild(rachaduras);
    document.body.appendChild(eco);

    let impactoX = rect.left + rect.width / 2;
    let impactoY = Math.min(window.innerHeight - 25, rect.bottom + 72);
    setTimeout(() => {
        let poeira = document.createElement("div");
        poeira.className = "impacto-queda-portable";
        poeira.style.left = impactoX + "px";
        poeira.style.top = impactoY + "px";
        poeira.setAttribute("aria-hidden", "true");
        document.body.appendChild(poeira);
        setTimeout(() => poeira.remove(), 680);

        for (let i = 0; i < 8; i++) {
            let pedaco = document.createElement("i");
            pedaco.className = "pedaco-portable-quebrado";
            pedaco.style.left = impactoX + "px";
            pedaco.style.top = impactoY + "px";
            pedaco.style.setProperty("--portable-pedaco-x", ((i - 3.5) * 12) + "px");
            pedaco.style.setProperty("--portable-pedaco-y", (-18 - (i % 3) * 9) + "px");
            pedaco.style.setProperty("--portable-pedaco-rotacao", (70 + i * 53) + "deg");
            pedaco.style.setProperty("--portable-pedaco-rotacao-final", (119 + i * 90) + "deg");
            document.body.appendChild(pedaco);
            setTimeout(() => pedaco.remove(), 760);
        }
    }, 610);

    setTimeout(() => eco.remove(), 1180);
}

// 🛸 PORTABLE — enquanto a bateria durar (2 rodadas = 4 passagens de turno, contadas em
// portableDuracao), sempre que QUALQUER carta do mesmo dono ataca, todo Portable desse time
// ataca junto no MESMO alvo — igual ao Vampi7, mas com prazo de validade em vez de ser permanente.
function dispararPortableJuntoDoAtaque(idAtacante, idPacoteAlvo, retanguloAlvoSalvo) {
    let pacoteAtacante = document.getElementById("pacote-" + idAtacante);
    if (!pacoteAtacante) return;

    let campoDoAtacanteId = pacoteAtacante.closest("#campo-j1") ? "campo-j1" : "campo-j2";
    let classeMesmoTime = (campoDoAtacanteId === "campo-j1") ? "carta-aliada" : "carta-inimiga";
    let campoDoAtacante = document.getElementById(campoDoAtacanteId);
    if (!campoDoAtacante) return;

    let ehAtaqueDoLadoInimigo = (campoDoAtacanteId === "campo-j2");

    let portables = Array.from(campoDoAtacante.getElementsByClassName(classeMesmoTime)).filter(pacote => {
        let nomeEl = pacote.querySelector(".nome-carta");
        let idP = pacote.id.replace("pacote-", "");
        return nomeEl && obterNomeEfetivoCarta(idP, nomeEl.innerText.trim()) === "Portable" && pacote.id !== "pacote-" + idAtacante && portableDuracao[idP] > 0 && !cartaSilenciadaPeloEcto(idP);
    });
    if (portables.length === 0) return;

    portables.forEach((pacotePortable, indice) => {
        let idPortable = pacotePortable.id.replace("pacote-", "");
        let pacoteAlvo = document.getElementById(idPacoteAlvo);
        let alvoAindaExiste = !!pacoteAlvo;

        let txtDanoPortable = document.getElementById("dano-" + idPortable);
        let danoPortable = txtDanoPortable ? parseFloat(txtDanoPortable.innerText) || 0 : 0;
        animarFeixePortable(pacotePortable, pacoteAlvo, indice, retanguloAlvoSalvo);
        if (danoPortable > 0 && alvoAindaExiste) {
            aplicarDanoAtaqueArea(idPacoteAlvo, danoPortable, ehAtaqueDoLadoInimigo);
        }

        narrar(`🛸 Portable atacou junto${(danoPortable > 0 && alvoAindaExiste) ? ` (${danoPortable} de dano no mesmo alvo)` : ""}!`);
    });
}

// 💀 CEMITÉRIO — registra uma carta morta (nome de exibição + lado) pra Reviverta poder
// trazer ela de volta depois. Formas temporárias retornam à identidade original da carta:
// Ícaro e Thiago, por exemplo, entram no cemitério e revivem como Criador.
function registrarMorte(nomeCarta, lado, dadosEspeciais) {
    if (!nomeCarta || (lado !== "j1" && lado !== "j2")) return;

    let nomeNormalizado = String(nomeCarta).trim();
    if (nomeNormalizado === "Ícaro" || nomeNormalizado === "Icaro" || nomeNormalizado === "Thiago") {
        nomeNormalizado = "Criador";
    }

    nomeCarta = nomeNormalizado;
    let base = bancoDeCartas.find(c => c.nome === nomeCarta);
    // As divisões do Slime não entram separadamente no cemitério. O modo inimigo
    // chama esta opção somente quando a família inteira é derrotada.
    if (!base && nomeCarta === "Slime" && dadosEspeciais && dadosEspeciais.familiaSlimeCompleta) {
        cemiterio[lado].push({
            id: "slime",
            nome: "Slime",
            img: "slime-provisorio.svg",
            vida: 10,
            dano: 1,
            inimigoEspecial: "slime",
            estagioSlime: 0
        });
        return;
    }
    if (!base && nomeCarta === "Zumbi") {
        cemiterio[lado].push({
            id: "zumbi",
            nome: "Zumbi",
            img: "zumbi-provisorio.svg",
            vida: 4,
            dano: 2,
            inimigoEspecial: "zumbi"
        });
        return;
    }
    if (!base && nomeCarta === "Aicer") {
        cemiterio[lado].push({
            id: "aicer",
            nome: "Aicer",
            img: "aicer-provisorio.svg",
            vida: 3,
            dano: 1,
            inimigoEspecial: "aicer"
        });
        return;
    }
    if (!base && nomeCarta === "Ecto") {
        cemiterio[lado].push({
            id: "ecto",
            nome: "Ecto",
            img: "ecto-provisorio.svg",
            vida: 2,
            dano: 3,
            inimigoEspecial: "ecto"
        });
        return;
    }
    if (!base && (nomeCarta === "Fraguer" || nomeCarta === "Fraguer Fundido")) {
        // A fusão volta ao cemitério como a carta-base; Reviverta sempre traz
        // atributos originais, e não os quatro corpos já fundidos.
        cemiterio[lado].push({
            id: "fraguer",
            nome: "Fraguer",
            img: "fraguer-provisorio.svg",
            vida: 4,
            dano: 1,
            inimigoEspecial: "fraguer"
        });
        return;
    }
    if (!base && nomeCarta === "Spiritista") {
        cemiterio[lado].push({
            id: "spiritista",
            nome: "Spiritista",
            img: "spiritista-provisorio.svg",
            vida: 10,
            dano: 1,
            inimigoEspecial: "spiritista"
        });
        return;
    }
    if (!base && nomeCarta === "7 Negativo") {
        cemiterio[lado].push({
            id: "sete-negativo",
            nome: "7 Negativo",
            img: "sete-negativo-provisorio.svg",
            vida: 5,
            dano: 0,
            inimigoEspecial: "sete-negativo"
        });
        return;
    }
    if (!base) return;
    cemiterio[lado].push({ id: base.id, nome: base.nome, img: base.img, vida: base.vida, dano: base.dano });
}

// Centraliza as passivas que acontecem quando uma carta MORRE. Antes cada tipo de dano
// repetia essa lógica por conta própria; impacto e ricochete só removiam a carta, então o
// Ork podia desaparecer sem criar os Goblins. Todo caminho de morte em campo chama isto.
function ativarPassivasAoMorrer(nomeCarta, idUnico, campoDestino, mensagemOrk, mensagemBarril) {
    // O pacote morto já foi removido; portanto somente Spiritistas que realmente
    // continuam vivos na arena recebem o crescimento desta morte.
    if (typeof window.rpgNotificarMorteAosSpiritistas === "function") {
        window.rpgNotificarMorteAosSpiritistas(nomeCarta, idUnico);
    }
    if (cartaSilenciadaPeloEcto(idUnico)) {
        // O observador da família Slime precisa enxergar esta marca depois que
        // o elemento sair do DOM para impedir o nascimento da fase seguinte.
        if (nomeCarta !== "Slime") delete cartasSilenciadasEcto[idUnico];
        return;
    }
    if (nomeCarta === "Ork") {
        let qtd = (typeof orkBuffado !== "undefined" && orkBuffado[idUnico]) ? 3 : 2;
        narrar(mensagemOrk || `💀 PASSIVA: O Ork morreu e invocou ${qtd} Goblins!`);
        let goblinsInvocados = [];
        for (let i = 0; i < qtd; i++) {
            goblinsInvocados.push(invocarToken("goblin", campoDestino));
        }
        animarTransformacaoOrk(idUnico, goblinsInvocados);
    }

    if (typeof processarMortePassivaBarril === "function") {
        processarMortePassivaBarril(nomeCarta, idUnico, campoDestino, mensagemBarril || "O Barril foi destruído!");
    }
}

function aplicarDanoAtaqueArea(idPacoteAlvo, dano, isInimigo) {
    let idPuro = idPacoteAlvo.replace("pacote-", "");
    if (typeof escudoGuerreiro !== 'undefined' && escudoGuerreiro[idPuro] && Number(dano) > 0) {
        narrar(`🛡️ BLANG! O escudo de uma das cartas bloqueou o golpe da área e QUEBROU!`);
        delete escudoGuerreiro[idPuro];
        quebrarVisualEscudo(idPuro);
        return;
    }
    aplicarDanoDireto(idPacoteAlvo, dano, isInimigo);
}

// 🛢️ PASSIVA BARRIL DE MADEIRA — rola o dado quando o Barril morre e decide se ele vira
// um Barril de Goblin (3) ou um Barril de Bárbaro (5), sempre "Sem Habilidade" (só a
// passiva). Compartilhada pelos 3 jeitos de uma carta morrer (ataque normal dos dois lados
// e aplicarDanoDireto, usada por poções/habilidades/ataques em área).
// 🔥 INCENDIÁRIO — botão "Jogar Pólvora" que dá o START do ciclo. Só deixa acender se
// existir pelo menos 1 carta inimiga na arena AGORA; senão a pólvora se perderia no
// vazio e o ciclo ficaria travado sem alvo pro resto da partida (era esse o bug de
// ele "atacar involuntariamente" com a arena vazia).
function iniciarAtaqueIncendiario(idIncendiario, isInimigo) {
    if (incendiarioCiclo[idIncendiario] !== undefined) return; // já está em ciclo, não deixa reiniciar

    let ladoInc = isInimigo ? "j2" : "j1";
    let ladoInimigo = ladoInc === "j1" ? "j2" : "j1";
    let classeInimiga = ladoInimigo === "j1" ? "carta-aliada" : "carta-inimiga";
    let campoInimigo = document.getElementById("campo-" + ladoInimigo);
    let temAlvo = campoInimigo && campoInimigo.getElementsByClassName(classeInimiga).length > 0;

    if (!temAlvo) {
        narrar("🔥 Ainda não há ninguém na arena inimiga! O Incendiário espera o momento certo pra jogar a pólvora.");
        return;
    }

    executarFaseIncendiario(idIncendiario, 1);
    incendiarioCiclo[idIncendiario] = 1; // guarda a ÚLTIMA fase executada (1); a próxima passagem de turno roda a fase 2

    let pacoteInc = document.getElementById("pacote-" + idIncendiario);
    let botao = pacoteInc && pacoteInc.querySelector(".btn-polvora-incendiario");
    if (botao) botao.style.display = "none"; // uso único pra começar o ciclo
}

// 🔥 INCENDIÁRIO — executa UMA fase do ciclo (1=joga pólvora, 2/3=queima metade do
// dano atual da carta em cada alvo marcado, 4=parado). Cada queimada consulta o
// ataque exibido naquele momento, acompanhando buffs e reduções ao vivo.
// Chamada tanto pelo botão "Jogar Pólvora" (fase 1)
// quanto a cada passagem de turno (fases seguintes).
function executarFaseIncendiario(idIncendiario, fase) {
    let pacoteInc = document.getElementById("pacote-" + idIncendiario);
    if (!pacoteInc) {
        delete incendiarioCiclo[idIncendiario];
        delete incendiarioAlvos[idIncendiario];
        delete incendiarioFasesVisuais[idIncendiario];
        sincronizarVisuaisIncendiario();
        return;
    }

    let ladoInc = pacoteInc.closest("#campo-j1") ? "j1" : "j2";
    let ladoInimigo = ladoInc === "j1" ? "j2" : "j1";
    let classeInimiga = ladoInimigo === "j1" ? "carta-aliada" : "carta-inimiga";
    let nomeInc = pacoteInc.querySelector(".nome-carta").innerText.trim();
    let rotuloInc = ladoInc === "j1" ? nomeInc : `${nomeInc} do oponente`;

    if (fase === 1) {
        let campoInimigo = document.getElementById("campo-" + ladoInimigo);
        let inimigos = campoInimigo ? Array.from(campoInimigo.getElementsByClassName(classeInimiga)).map(p => p.id) : [];
        incendiarioAlvos[idIncendiario] = inimigos;
        incendiarioFasesVisuais[idIncendiario] = 1;
        sincronizarVisuaisIncendiario();
        animarSalpicoPolvoraIncendiario(idIncendiario, inimigos);
        if (inimigos.length > 0) narrar(`🔥 ${rotuloInc} jogou pólvora em todas as cartas inimigas da arena!`);
    } else if (fase === 2 || fase === 3) {
        let alvos = incendiarioAlvos[idIncendiario] || [];
        let algumAtingido = false;
        let alvosQueimados = [];
        let elementoDanoIncendiario = document.getElementById("dano-" + idIncendiario);
        let danoAtualIncendiario = elementoDanoIncendiario
            ? parseFloat(elementoDanoIncendiario.innerText)
            : 0;
        if (!Number.isFinite(danoAtualIncendiario)) danoAtualIncendiario = 0;
        let danoPorQueimada = Math.max(0, danoAtualIncendiario) / 2;
        incendiarioFasesVisuais[idIncendiario] = fase;
        sincronizarVisuaisIncendiario();
        alvos.forEach(idAlvo => {
            if (document.getElementById(idAlvo)) {
                animarFogoIncendiario(idAlvo, fase === 2);
                aplicarDanoDireto(idAlvo, danoPorQueimada, ladoInimigo === "j2");
                algumAtingido = true;
                alvosQueimados.push(idAlvo);
            }
        });
        if (algumAtingido) {
            narrar(fase === 2
                ? `🔥 ${rotuloInc} acendeu a pólvora! ${danoPorQueimada} de dano em cada carta atingida (metade do seu ataque atual).`
                : `🔥 A pólvora do ${rotuloInc} continua queimando! Mais ${danoPorQueimada} de dano em cada carta atingida.`);
            atacarComSeparadosParceirosDaQueimada(idIncendiario, alvosQueimados, ladoInc);
        }
    } else if (fase === 4) {
        incendiarioFasesVisuais[idIncendiario] = 4;
        sincronizarVisuaisIncendiario();
    }
    // fase 4: parado, não faz nada — só espera o ciclo reiniciar.

    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
    sincronizarVisuaisIncendiario();
}

function processarMortePassivaBarril(nomeDestaCarta, idBarrilDestruido, campoDestino, mensagemBase) {
    if (nomeDestaCarta !== "Barril") return;

    let dadoBarril = Math.floor(Math.random() * 6) + 1;
    let cartaDaPassiva = dadoBarril === 3
        ? "Barril de Goblin"
        : (dadoBarril === 5 ? "Barril de Bárbaro" : null);

    // O Barril fosco quebra sobre todas as cartas que ele protegia. O vínculo é removido
    // imediatamente, mas o visual permanece tempo suficiente para as lascas aparecerem.
    Object.keys(cartasProtegidas).forEach(idProtegido => {
        if (String(cartasProtegidas[idProtegido]) !== String(idBarrilDestruido)) return;
        quebrarVisualProtecaoBarril(idProtegido, !!cartaDaPassiva);
        delete cartasProtegidas[idProtegido];
    });

    narrar(`💥 ${mensagemBase} Rolando dado da passiva: 🎲 ${dadoBarril}`);

    if (cartaDaPassiva) {
        setTimeout(() => {
            let mensagem = cartaDaPassiva === "Barril de Goblin"
                ? "📦 Um Barril de Goblins (Sem Hab.) surgiu dos destroços!"
                : "🪵 Um Barril de Bárbaro (Sem Hab.) surgiu dos destroços!";
            narrar(mensagem);
            let cartaLibertada = invocarTokenPeloNomeSemHabilidade(cartaDaPassiva, campoDestino);
            animarCartaSaindoDoBarril(cartaLibertada);
        }, 1500);
    } else {
        setTimeout(() => narrar("O Barril virou apenas lascas de madeira."), 1500);
    }
}

// 🐴 CAVALO DE TRÓIA — mantém um eco visual do cavalo por alguns instantes, abre a
// madeira e lança estilhaços exatamente para as cartas que receberão o dano em área.
// As coordenadas são guardadas antes do dano, então o efeito continua mesmo se um alvo morrer.
function animarEstilhacosCavaloTroia(pacoteCavalo, ladoInimigo) {
    if (!pacoteCavalo) return;
    let rectCavalo = pacoteCavalo.getBoundingClientRect();
    let origemX = rectCavalo.left + rectCavalo.width / 2;
    let origemY = rectCavalo.top + rectCavalo.height / 2;

    let eco = pacoteCavalo.cloneNode(true);
    eco.removeAttribute("id");
    eco.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
    eco.querySelectorAll("button").forEach(botao => botao.remove());
    eco.classList.add("eco-cavalo-troia-abrindo");
    eco.style.left = rectCavalo.left + "px";
    eco.style.top = rectCavalo.top + "px";
    eco.style.width = rectCavalo.width + "px";
    eco.style.height = rectCavalo.height + "px";
    eco.style.margin = "0";
    let rachaduras = document.createElement("div");
    rachaduras.className = "rachaduras-cavalo-troia";
    rachaduras.innerHTML = "<i></i><i></i><i></i><i></i>";
    eco.appendChild(rachaduras);
    document.body.appendChild(eco);

    let alvos = [];
    let campo = document.getElementById("campo-" + ladoInimigo);
    if (campo) {
        Array.from(campo.querySelectorAll("div[id^='pacote-']")).forEach(pacote => {
            let id = pacote.id.replace("pacote-", "");
            let nomeEl = pacote.querySelector(".nome-carta");
            let nome = obterNomeEfetivoCarta(id, nomeEl ? nomeEl.innerText.trim() : "");
            if (nome !== "Cavalo de Tróia" && document.getElementById("vida-" + id)) alvos.push(pacote);
        });
    }

    let mao = document.getElementById("mao-" + ladoInimigo);
    if (mao) {
        Array.from(mao.querySelectorAll("div[id^='pacote-']")).forEach(pacote => {
            let id = pacote.id.replace("pacote-", "");
            let info = bancoDeCartas
                .filter(c => id === c.id || id.startsWith(c.id + "_") || id.startsWith(c.id + "-"))
                .sort((a, b) => b.id.length - a.id.length)[0];
            if ((!info || !suportesReais.includes(info.id)) && document.getElementById("vida-" + id)) alvos.push(pacote);
        });
    }

    alvos.forEach((alvo, indice) => {
        let rectAlvo = alvo.getBoundingClientRect();
        let fimX = rectAlvo.left + rectAlvo.width / 2;
        let fimY = rectAlvo.top + rectAlvo.height / 2;

        for (let parte = 0; parte < 2; parte++) {
            let estilhaco = document.createElement("div");
            estilhaco.className = "estilhaco-cavalo-troia";
            estilhaco.style.setProperty("--troia-inicio-x", origemX + "px");
            estilhaco.style.setProperty("--troia-inicio-y", origemY + "px");
            estilhaco.style.setProperty("--troia-meio-x", ((origemX + fimX) / 2 + (parte ? 13 : -13)) + "px");
            estilhaco.style.setProperty("--troia-meio-y", (Math.min(origemY, fimY) - 34 - parte * 12) + "px");
            estilhaco.style.setProperty("--troia-fim-x", (fimX + (parte ? 9 : -9)) + "px");
            estilhaco.style.setProperty("--troia-fim-y", (fimY + (parte ? 4 : -4)) + "px");
            estilhaco.style.setProperty("--troia-rotacao", ((indice * 47 + parte * 105) % 240 + 90) + "deg");
            estilhaco.style.animationDelay = (170 + indice * 42 + parte * 65) + "ms";
            estilhaco.innerHTML = "<i></i>";
            document.body.appendChild(estilhaco);
            setTimeout(() => estilhaco.remove(), 1500 + indice * 42 + parte * 65);
        }

        let impacto = document.createElement("div");
        impacto.className = "impacto-estilhacos-troia";
        impacto.style.left = fimX + "px";
        impacto.style.top = fimY + "px";
        impacto.style.animationDelay = (650 + indice * 42) + "ms";
        impacto.innerHTML = "<i></i><i></i><i></i>";
        document.body.appendChild(impacto);
        setTimeout(() => impacto.remove(), 1650 + indice * 42);
    });

    setTimeout(() => eco.remove(), 1550);
}

// 🐴 Aplica dano do Cavalo de Tróia em TODAS as cartas de um lado — no campo, na mão e,
// no modo Ondas, também na reserva que ainda nem apareceu. Cartas no campo passam por
// aplicarDanoDireto (assim mantêm as passivas de morte, tipo Ork/Barril); cartas fora do
// campo só perdem vida e somem se chegarem a 0, pois ainda não entraram em batalha.
function aplicarDanoCavaloDeTroia(ladoInimigo, dano) {
    let campoInimigo = document.getElementById("campo-" + ladoInimigo);
    if (campoInimigo) {
        let cartasCampo = Array.from(campoInimigo.querySelectorAll("div[id^='pacote-']"));
        cartasCampo.forEach(pacote => {
            aplicarDanoDireto(pacote.id, dano, ladoInimigo === "j2");
        });
    }

    let maoInimiga = document.getElementById("mao-" + ladoInimigo);
    if (maoInimiga) {
        let cartasMao = Array.from(maoInimiga.querySelectorAll("div[id^='pacote-']"));
        cartasMao.forEach(pacote => {
            let idPuro = pacote.id.replace("pacote-", "");

            // 🧪 Só TROPAS levam dano — poções/itens de suporte (Fogueira, Besta, etc.) não são atingidos.
            // Usa o maior prefixo válido do banco de cartas (evita confundir "escudo_item" com "escudo",
            // ou "barril" com "barrilbarbaro"/"barrilgoblin").
            let infoCarta = bancoDeCartas
                .filter(c => idPuro === c.id || idPuro.startsWith(c.id + "_") || idPuro.startsWith(c.id + "-"))
                .sort((a, b) => b.id.length - a.id.length)[0];
            let ehSuporte = infoCarta && suportesReais.includes(infoCarta.id);
            if (ehSuporte) return;

            let txtVida = document.getElementById("vida-" + idPuro);
            if (!txtVida) return;
            // 🩹 CORREÇÃO: nunca deixa a vida mostrar número negativo — trava em 0.
            let vidaAtual = Math.max(0, parseFloat(txtVida.innerText) - dano);
            txtVida.innerText = vidaAtual;
            if (typeof mostrarEfeitoPerdaVida === "function") mostrarEfeitoPerdaVida(idPuro);
            if (vidaAtual <= 0) {
                let nomeCartaMao = pacote.querySelector(".nome-carta") ? pacote.querySelector(".nome-carta").innerText.trim() : "";
                registrarMorte(nomeCartaMao, ladoInimigo);
                pacote.remove();
            }
        });
    }

    let resultadoReserva = { atingidas: 0, eliminadas: 0 };
    if (ladoInimigo === "j2" && typeof window.rpgModoInimigoAplicarDanoReserva === "function") {
        resultadoReserva = window.rpgModoInimigoAplicarDanoReserva(dano) || resultadoReserva;
    }

    return {
        reservaAtingida: resultadoReserva.atingidas || 0,
        reservaEliminada: resultadoReserva.eliminadas || 0
    };
}

function aplicarDanoDireto(idPacoteAlvo, dano, isInimigo) {
    let idPuro = idPacoteAlvo.replace("pacote-", "");
    let txtVida = document.getElementById("vida-" + idPuro);
    if (!txtVida) return;

    // 🐴 CAVALO DE TRÓIA: não tem vida, não pode ser atacado (nem por ataques em área, poções ou habilidades).
    let pacoteCheck = document.getElementById(idPacoteAlvo);
    let nomeCheckExibido = pacoteCheck && pacoteCheck.querySelector(".nome-carta") ? pacoteCheck.querySelector(".nome-carta").innerText.trim() : "";
    let nomeCheck = obterNomeEfetivoCarta(idPuro, nomeCheckExibido);
    if (nomeCheck === 'Cavalo de Tróia') return;

    let vidaAntesDoGolpe = parseFloat(txtVida.innerText);
    let vidaAtual = Math.max(0, vidaAntesDoGolpe - dano);
    txtVida.innerText = vidaAtual;
    sincronizarDanoDoTrio(idPuro, vidaAntesDoGolpe, vidaAtual);

    if (vidaAtual <= 0) {
        let pacote = document.getElementById(idPacoteAlvo);
        if (!pacote) return;
        let nomeExibido = pacote.querySelector(".nome-carta").innerText;
        let nomeDestaCarta = obterNomeEfetivoCarta(idPuro, nomeExibido);
        // 🩹 CORREÇÃO: descobre o lado do Ork pela posição real dele no campo (igual já
        // era feito certo no roubo do Ladrão), em vez de confiar no parâmetro "isInimigo" —
        // ele não tem um significado consistente entre quem chama esta função, então usar
        // ele pra decidir o lado dos Goblins invocados dava resultado errado às vezes.
        let campoDestino = pacote.closest("#campo-j2") ? "campo-j2" : "campo-j1";
        registrarMorte(nomeDestaCarta, campoDestino === "campo-j2" ? "j2" : "j1");
        guardarOrigemTransformacaoOrk(nomeDestaCarta, idPuro, pacote);
        pacote.remove();
        
        ativarPassivasAoMorrer(nomeDestaCarta, idPuro, campoDestino);
    }
}
function obterCartasAdjacentes(idPacoteAlvo) {
    let pacote = document.getElementById(idPacoteAlvo);
    if (!pacote) return [];
    
    let campo = pacote.parentElement;
    let cartas = Array.from(campo.querySelectorAll("div[id^='pacote-']"));
    let index = cartas.indexOf(pacote);
    let adjacentes = [];
    
    if (index > 0) adjacentes.push(cartas[index - 1]);
    if (index < cartas.length - 1) adjacentes.push(cartas[index + 1]);
    
    return adjacentes;
}

// 🗡️ CAVALEIRO DAS TREVAS — aplica dano no alvo principal escolhido + seus vizinhos reais
// no campo (usa obterCartasAdjacentes, o mesmo helper que o Barril já usa pra isso).
// Atualiza o número da própria carta conforme aquilo que ela causará agora:
// 2 com um alvo, 3 com dois ou mais e 5 após despertar. Buffs externos são
// preservados separadamente e continuam somados ao valor natural.
function sincronizarDanoCavaleirosAoVivo() {
    let idsPresentes = new Set();

    document.querySelectorAll("#campo-j1 > div[id^='pacote-'], #campo-j2 > div[id^='pacote-']").forEach(pacote => {
        let nomeEl = pacote.querySelector(".nome-carta");
        if (!nomeEl || nomeEl.innerText.trim() !== "Cavaleiro das Trevas") return;

        let idCavaleiro = pacote.id.replace("pacote-", "");
        let danoEl = document.getElementById("dano-" + idCavaleiro);
        if (!danoEl) return;
        idsPresentes.add(idCavaleiro);

        let ehAliado = pacote.closest("#campo-j1") !== null;
        let campoAlvo = document.getElementById(ehAliado ? "campo-j2" : "campo-j1");
        let quantidadeAlvos = campoAlvo
            ? campoAlvo.querySelectorAll(":scope > div[id^='pacote-']").length
            : 0;
        let especialAtivo = typeof cavaleiroAtivado !== "undefined" && !!cavaleiroAtivado[idCavaleiro];
        let danoNatural = especialAtivo ? 5 : (quantidadeAlvos >= 2 ? 3 : 2);
        let danoAtual = parseFloat(danoEl.innerText);
        if (!Number.isFinite(danoAtual)) danoAtual = danoNatural;

        let estadoAnterior = danoCavaleirosAoVivo.get(idCavaleiro);
        let bonusExterno;
        if (!estadoAnterior) {
            // Antes da primeira sincronização a carta ainda mostra seu dano base 2.
            bonusExterno = danoAtual - (especialAtivo ? 5 : 2);
        } else if (estadoAnterior.especialAtivo !== especialAtivo) {
            // O especial escreve 5 diretamente na carta; esse salto é a nova forma
            // natural, não um buff extra que deveria ser somado outra vez.
            bonusExterno = danoAtual - danoNatural;
        } else {
            bonusExterno = estadoAnterior.bonusExterno;
            // Qualquer alteração que não veio desta projeção é Besta, Auvex,
            // Allsforms, Thiago ou outro modificador real de ataque.
            if (danoAtual !== estadoAnterior.danoExibido) {
                bonusExterno += danoAtual - estadoAnterior.danoExibido;
            }
        }

        let danoExibido = Math.max(0, danoNatural + bonusExterno);
        if (danoAtual !== danoExibido) danoEl.innerText = danoExibido;
        danoCavaleirosAoVivo.set(idCavaleiro, {
            bonusExterno,
            danoExibido,
            especialAtivo
        });
    });

    Array.from(danoCavaleirosAoVivo.keys()).forEach(idCavaleiro => {
        if (!idsPresentes.has(idCavaleiro)) danoCavaleirosAoVivo.delete(idCavaleiro);
    });
}

// O cálculo do golpe usa exatamente o valor que está aparecendo na carta.
function _calcularAtaqueCavaleiro(idCavaleiro, vizinhos) {
    sincronizarDanoCavaleirosAoVivo();
    let danoEl = document.getElementById("dano-" + idCavaleiro);
    let danoAtual = danoEl ? parseFloat(danoEl.innerText) : 2;
    if (!Number.isFinite(danoAtual)) danoAtual = 2;

    if (typeof cavaleiroAtivado !== 'undefined' && cavaleiroAtivado[idCavaleiro]) {
        return { danoArea: danoAtual, alvosMaximos: 3 };
    }
    if (vizinhos.length > 0) {
        return { danoArea: danoAtual, alvosMaximos: 2 };
    }
    return { danoArea: danoAtual, alvosMaximos: 1 };
}

// O Cavaleiro resolve o próprio ataque fora de receberAtaque/aplicarDanoInimigo.
// Por isso a parceria do Separado precisa ser chamada explicitamente aqui.
// O dano do Separado é lido no instante do golpe e somado no alvo principal.
function _dispararSeparadoJuntoDoCavaleiro(idCavaleiro, idPacoteAlvo, danoCavaleiro, cavaleiroInimigo) {
    let pacoteCavaleiro = document.getElementById("pacote-" + idCavaleiro);
    let pacoteAlvo = document.getElementById(idPacoteAlvo);
    if (!pacoteCavaleiro || !pacoteAlvo) return 0;

    let lado = cavaleiroInimigo ? "j2" : "j1";
    let parceiros = obterSeparadosQueAcompanhamAtaque(idCavaleiro, lado);
    let bonus = 0;
    parceiros.forEach(parceiro => {
        if (!document.getElementById(idPacoteAlvo)) return;
        animarAtaqueConjuntoSeparado(parceiro.id, parceiro.idParceiro || idCavaleiro, idPacoteAlvo);
        aplicarDanoAtaqueArea(idPacoteAlvo, parceiro.dano, cavaleiroInimigo);
        bonus += parceiro.dano;
    });
    if (bonus > 0) {
        narrar(`👥 A parceria atacou junto com o Cavaleiro das Trevas: +${bonus} no alvo principal (${danoCavaleiro + bonus} no total)!`);
    }
    return bonus;
}

function aplicarAlvoCavaleiro(idPacoteAlvo) {
    let pacoteAlvo = document.getElementById(idPacoteAlvo);
    if (!pacoteAlvo) return;

    let idCavaleiroQueAtacou = idCavaleiroAtivo;
    let retanguloAlvoOriginal = pacoteAlvo.getBoundingClientRect();

    let vizinhos = obterCartasAdjacentes(idPacoteAlvo);
    let { danoArea, alvosMaximos } = _calcularAtaqueCavaleiro(idCavaleiroAtivo, vizinhos);
    let alvos = [pacoteAlvo, ...vizinhos].slice(0, alvosMaximos);
    let especialAtivo = typeof cavaleiroAtivado !== "undefined" && !!cavaleiroAtivado[idCavaleiroAtivo];

    narrar(`⚔️ O Cavaleiro das Trevas focou ${alvos.length} inimigo(s) (alvo + vizinhos) causando ${danoArea} de dano em cada!`);
    animarAtaqueAreaCavaleiro(idCavaleiroAtivo, pacoteAlvo, alvos, especialAtivo);
    alvos.forEach(pacote => aplicarDanoAtaqueArea(pacote.id, danoArea, false));
    _dispararSeparadoJuntoDoCavaleiro(idCavaleiroQueAtacou, idPacoteAlvo, danoArea, false);

    // O Cavaleiro usa um caminho próprio de ataque em área e antes não avisava os
    // acompanhantes. Agora Vampi7 ganha vida e Portable dispara uma única vez no alvo central.
    dispararVampi7JuntoDoAtaque(idCavaleiroQueAtacou, idPacoteAlvo);
    dispararSeteNegativoJuntoDoAtaque(idCavaleiroQueAtacou, idPacoteAlvo);
    dispararPortableJuntoDoAtaque(idCavaleiroQueAtacou, idPacoteAlvo, retanguloAlvoOriginal);

    modoAlvoCavaleiro = false;
    idCavaleiroAtivo = null;
    passarTurno();
    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
}

function aplicarAlvoCavaleiroInimigo(idPacoteAlvo) {
    let pacoteAlvo = document.getElementById(idPacoteAlvo);
    if (!pacoteAlvo) return;

    let idCavaleiroQueAtacou = idCavaleiroAtivo;
    let retanguloAlvoOriginal = pacoteAlvo.getBoundingClientRect();

    let vizinhos = obterCartasAdjacentes(idPacoteAlvo);
    let { danoArea, alvosMaximos } = _calcularAtaqueCavaleiro(idCavaleiroAtivo, vizinhos);
    let alvos = [pacoteAlvo, ...vizinhos].slice(0, alvosMaximos);
    let especialAtivo = typeof cavaleiroAtivado !== "undefined" && !!cavaleiroAtivado[idCavaleiroAtivo];

    narrar(`⚔️ O Cavaleiro das Trevas inimigo focou ${alvos.length} de suas cartas (alvo + vizinhos) causando ${danoArea} de dano em cada!`);
    animarAtaqueAreaCavaleiro(idCavaleiroAtivo, pacoteAlvo, alvos, especialAtivo);
    alvos.forEach(pacote => aplicarDanoAtaqueArea(pacote.id, danoArea, true));
    _dispararSeparadoJuntoDoCavaleiro(idCavaleiroQueAtacou, idPacoteAlvo, danoArea, true);

    dispararVampi7JuntoDoAtaque(idCavaleiroQueAtacou, idPacoteAlvo);
    dispararSeteNegativoJuntoDoAtaque(idCavaleiroQueAtacou, idPacoteAlvo);
    dispararPortableJuntoDoAtaque(idCavaleiroQueAtacou, idPacoteAlvo, retanguloAlvoOriginal);

    modoAlvoCavaleiroInimigo = false;
    idCavaleiroAtivo = null;
    passarTurno();
    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
}


// ✨ Efeito do Ícaro: uma centelha de imaginação viaja até a carta escolhida.
// O efeito usa coordenadas fixas, então continua visível mesmo enquanto a carta antiga
// é substituída pela nova identidade.
function animarPoderCriacaoIcaro(idOrigem, pacoteAlvo) {
    if (!pacoteAlvo) return;

    let origem = document.getElementById("pacote-" + idOrigem);
    let rectOrigem = (origem || pacoteAlvo).getBoundingClientRect();
    let rectAlvo = pacoteAlvo.getBoundingClientRect();
    let inicioX = rectOrigem.left + rectOrigem.width / 2;
    let inicioY = rectOrigem.top + rectOrigem.height / 2;
    let fimX = rectAlvo.left + rectAlvo.width / 2;
    let fimY = rectAlvo.top + rectAlvo.height / 2;
    let mesmoAlvo = origem === pacoteAlvo;

    let energia = document.createElement("div");
    energia.className = "energia-criacao-icaro" + (mesmoAlvo ? " energia-criacao-propria" : "");
    energia.style.setProperty("--icaro-inicio-x", inicioX + "px");
    energia.style.setProperty("--icaro-inicio-y", inicioY + "px");
    energia.style.setProperty("--icaro-meio-x", ((inicioX + fimX) / 2 + (mesmoAlvo ? 52 : 0)) + "px");
    energia.style.setProperty("--icaro-meio-y", (Math.min(inicioY, fimY) - (mesmoAlvo ? 72 : 48)) + "px");
    energia.style.setProperty("--icaro-fim-x", fimX + "px");
    energia.style.setProperty("--icaro-fim-y", fimY + "px");
    energia.innerHTML = '<span class="nucleo-imaginacao">✦</span><i>✧</i><i>◌</i><i>✦</i>';
    document.body.appendChild(energia);

    if (origem) origem.classList.add("icaro-imaginando");
    pacoteAlvo.classList.add("alvo-imaginado-icaro");
    setTimeout(() => {
        energia.remove();
        if (origem && origem.isConnected) origem.classList.remove("icaro-imaginando");
        if (pacoteAlvo.isConnected) pacoteAlvo.classList.remove("alvo-imaginado-icaro");
    }, 1050);
}

// A nova carta aparece como um rascunho e ganha cor enquanto os traços se completam.
function animarRevelacaoIcaro(pacoteNovo) {
    if (!pacoteNovo) return;

    pacoteNovo.classList.add("carta-criada-por-icaro");
    let rascunho = document.createElement("div");
    rascunho.className = "rascunho-criacao-icaro";
    rascunho.innerHTML = '<span class="ideia-criacao">✦</span><i></i><i></i><i></i><i></i>';
    pacoteNovo.appendChild(rascunho);

    setTimeout(() => {
        rascunho.remove();
        if (pacoteNovo.isConnected) pacoteNovo.classList.remove("carta-criada-por-icaro");
    }, 1350);
}

// ✏️ Efeito do Thiago: o lápis vai exatamente ao atributo alterado. Para reduzir,
// a borracha passa pelo valor; para aumentar, o lápis redesenha e deixa um +1.
function animarAjusteThiago(idOrigem, idAlvo, atributo, aumentar) {
    let origem = document.getElementById("pacote-" + idOrigem);
    let pacoteAlvo = document.getElementById("pacote-" + idAlvo);
    let atributoEl = document.getElementById(atributo + "-" + idAlvo);
    if (!pacoteAlvo || !atributoEl) return;

    let rectOrigem = (origem || pacoteAlvo).getBoundingClientRect();
    let rectAtributo = atributoEl.getBoundingClientRect();
    let inicioX = rectOrigem.left + rectOrigem.width / 2;
    let inicioY = rectOrigem.top + rectOrigem.height / 2;
    let fimX = rectAtributo.left + rectAtributo.width / 2;
    let fimY = rectAtributo.top + rectAtributo.height / 2;
    let tipo = aumentar ? "desenhando" : "apagando";

    let lapis = document.createElement("div");
    lapis.className = "lapis-ajuste-thiago lapis-thiago-" + tipo;
    lapis.style.setProperty("--thiago-inicio-x", inicioX + "px");
    lapis.style.setProperty("--thiago-inicio-y", inicioY + "px");
    lapis.style.setProperty("--thiago-fim-x", fimX + "px");
    lapis.style.setProperty("--thiago-fim-y", fimY + "px");
    lapis.innerHTML = '<span>✏️</span>';

    let marca = document.createElement("div");
    marca.className = "marca-ajuste-thiago marca-thiago-" + tipo;
    marca.style.left = fimX + "px";
    marca.style.top = fimY + "px";
    marca.innerHTML = aumentar
        ? '<i class="traco-lapis-thiago"></i><b>+1</b>'
        : '<i class="po-borracha"></i><i class="po-borracha"></i><i class="po-borracha"></i><b>−1</b>';

    document.body.appendChild(lapis);
    document.body.appendChild(marca);
    if (origem) origem.classList.add("thiago-editando");
    pacoteAlvo.classList.add("alvo-edicao-thiago");

    setTimeout(() => {
        lapis.remove();
        marca.remove();
        if (origem && origem.isConnected) origem.classList.remove("thiago-editando");
        if (pacoteAlvo.isConnected) pacoteAlvo.classList.remove("alvo-edicao-thiago");
    }, 1250);
}

// 🎨 ÍCARO — transforma a carta clicada em outra TROPA sorteada aleatoriamente (nunca em
// suporte/poção, nunca no próprio "Criador"), mantendo a vida e o dano atuais dela.
// Recria a carta do zero (mesmo padrão que converterCartaRoubada usa pro Bruxo) pra ela
// realmente ganhar a passiva e a Habilidade da carta sorteada, não só o nome/imagem.
function identidadeTransformacaoIcaro(nome) {
    let nomeLimpo = (nome || "").replace(/\s*\(S\/Hab\)$/i, "").trim();
    if (nomeLimpo === "Ctrl C" || nomeLimpo === "Ctrl V") return "Ctrl";
    if (nomeLimpo === "Separado" || nomeLimpo === "Separadois") return "Separado";
    return nomeLimpo;
}

function limparCopiaCtrlTransformadaPorIcaro(idUnico) {
    if (typeof ctrlV === "undefined" || !ctrlV[idUnico]) return;

    let tinhaEscudoDaIdentidadeCopiada = typeof escudoGuerreiro !== "undefined" && !!escudoGuerreiro[idUnico];
    if (typeof limparFormaCriadorDoCtrl === "function") limparFormaCriadorDoCtrl(idUnico);
    if (typeof window.rpgDesvincularCtrlDeFamiliaEspecial === "function") {
        window.rpgDesvincularCtrlDeFamiliaEspecial(idUnico);
    }

    // A carta deixa de ser Ctrl de verdade. Portanto, nenhum estado da antiga
    // identidade copiada pode continuar agindo por trás da nova carta sorteada.
    delete ctrlV[idUnico];
    if (typeof cavalosDeTroiaAtivos !== "undefined") delete cavalosDeTroiaAtivos[idUnico];
    if (typeof portableDuracao !== "undefined") delete portableDuracao[idUnico];
    if (typeof incendiarioCiclo !== "undefined") delete incendiarioCiclo[idUnico];
    if (typeof incendiarioAlvos !== "undefined") delete incendiarioAlvos[idUnico];
    if (typeof incendiarioFasesVisuais !== "undefined") delete incendiarioFasesVisuais[idUnico];
    if (typeof parceriaSeparado !== "undefined") delete parceriaSeparado[idUnico];
    if (typeof separadaoDividido !== "undefined") delete separadaoDividido[idUnico];
    if (typeof separadaoAtacantesNaSequencia !== "undefined") delete separadaoAtacantesNaSequencia[idUnico];
    if (typeof especialFixoSeparado !== "undefined") delete especialFixoSeparado[idUnico];
    if (typeof bonusUnidao !== "undefined") delete bonusUnidao[idUnico];
    if (typeof alvosDoBarril !== "undefined") delete alvosDoBarril[idUnico];
    if (typeof barrilJaImpactou !== "undefined") delete barrilJaImpactou[idUnico];
    if (typeof viajantesJaUsaram !== "undefined") delete viajantesJaUsaram[idUnico];
    if (typeof especialFixoBumerskeleton !== "undefined") delete especialFixoBumerskeleton[idUnico];
    if (typeof recargaGeloBumerskeleton !== "undefined") delete recargaGeloBumerskeleton[idUnico];
    if (typeof bonusVampi7Sozinho !== "undefined") delete bonusVampi7Sozinho[idUnico];
    if (typeof alvosDoBumerangue !== "undefined") delete alvosDoBumerangue[idUnico];
    if (typeof trajetosVisuaisBumerangue !== "undefined") delete trajetosVisuaisBumerangue[idUnico];
    if (typeof goblinJaAtacouNesteTurno !== "undefined") delete goblinJaAtacouNesteTurno[idUnico];
    if (typeof goblinAtaquesGanhos !== "undefined") delete goblinAtaquesGanhos[idUnico];
    if (typeof splashBarbaroAtivo !== "undefined") delete splashBarbaroAtivo[idUnico];
    if (typeof escudoGuerreiro !== "undefined") delete escudoGuerreiro[idUnico];
    if (typeof unidadesVivasTrios !== "undefined") delete unidadesVivasTrios[idUnico];
    if (typeof ladraoUsosPorCarta !== "undefined") delete ladraoUsosPorCarta[idUnico];
    if (typeof ladroesQueJaRoubaram !== "undefined") delete ladroesQueJaRoubaram[idUnico];
    if (typeof orkBuffado !== "undefined") delete orkBuffado[idUnico];
    if (typeof cavaleiroAtivado !== "undefined") delete cavaleiroAtivado[idUnico];
    if (typeof window.mensageirosEmArea !== "undefined") delete window.mensageirosEmArea[idUnico];
    if (typeof danoCavaleirosAoVivo !== "undefined" && danoCavaleirosAoVivo.delete) danoCavaleirosAoVivo.delete(idUnico);
    if (typeof atributosAoVivo !== "undefined" && atributosAoVivo.delete) atributosAoVivo.delete(idUnico);

    // Se o Ctrl copiado estava agindo como Barril protetor, a transformação
    // liberta somente as cartas protegidas POR ele. Uma proteção recebida de
    // outro Barril continua ligada ao alvo transformado.
    if (typeof cartasProtegidas !== "undefined") {
        Object.keys(cartasProtegidas).forEach(idProtegido => {
            if (String(cartasProtegidas[idProtegido]) !== String(idUnico)) return;
            if (typeof quebrarVisualProtecaoBarril === "function") {
                quebrarVisualProtecaoBarril(idProtegido, false);
            }
            delete cartasProtegidas[idProtegido];
        });
    }
    if (typeof restaurarPosicaoBarril === "function") restaurarPosicaoBarril(idUnico);
    if (typeof sincronizarVisuaisProtecaoBarril === "function") sincronizarVisuaisProtecaoBarril();
    if (tinhaEscudoDaIdentidadeCopiada && typeof quebrarVisualEscudo === "function") quebrarVisualEscudo(idUnico);
    if (typeof sincronizarVisuaisIncendiario === "function") sincronizarVisuaisIncendiario();
    if (typeof window.rpgSincronizarFraguers === "function") window.rpgSincronizarFraguers();
}

function aplicarTransformacaoIcaro(idPacoteAlvo) {
    let pacoteAlvo = document.getElementById(idPacoteAlvo);
    if (!pacoteAlvo) return;

    let idUnico = idPacoteAlvo.replace("pacote-", "");
    let nomeAntigo = pacoteAlvo.querySelector(".nome-carta").innerText.trim();
    let nomeEfetivo = /^Ctrl [CV]$/.test(nomeAntigo)
        ? obterNomeEfetivoCarta(idUnico, nomeAntigo)
        : nomeAntigo;
    let identidadeAntiga = identidadeTransformacaoIcaro(nomeEfetivo);
    let identidadeFisicaAntiga = identidadeTransformacaoIcaro(nomeAntigo);
    let candidatas = bancoDeCartas.filter(c => !suportesReais.includes(c.id)
        && c.id !== "criador"
        // Um Ctrl copiando Unidão não pode sortear nem Unidão (poder atual),
        // nem Ctrl C/Ctrl V (a carta física que ele já era).
        && identidadeTransformacaoIcaro(c.nome) !== identidadeAntiga
        && identidadeTransformacaoIcaro(c.nome) !== identidadeFisicaAntiga);
    if (candidatas.length === 0) return;
    let novaCartaInfo = candidatas[Math.floor(Math.random() * candidatas.length)];

    let vidaEl = document.getElementById("vida-" + idUnico);
    let danoEl = document.getElementById("dano-" + idUnico);
    let vidaAtual = vidaEl ? vidaEl.innerText : novaCartaInfo.vida;
    let danoAtual = danoEl ? danoEl.innerText : novaCartaInfo.dano;
    let estavaCongelada = pacoteAlvo.classList.contains("congelada");
    let ehAliado = pacoteAlvo.closest("#campo-j1") !== null;

    animarPoderCriacaoIcaro(idIcaroAtivo, pacoteAlvo);

    // A família Slime representa uma única carta em diferentes corpos. Ícaro
    // apaga os irmãos e transforma o grupo inteiro em apenas uma carta nova.
    let transformacaoFamiliaSlime = typeof window.rpgPrepararTransformacaoFamiliaSlime === "function"
        ? window.rpgPrepararTransformacaoFamiliaSlime(idUnico)
        : null;

    limparCopiaCtrlTransformadaPorIcaro(idUnico);

    let cartaObj = { nome: novaCartaInfo.nome, idUnico: idUnico, img: novaCartaInfo.img, vida: vidaAtual, dano: danoAtual };
    let classeCss = ehAliado ? "carta-aliada" : "carta-inimiga";
    let funcaoJogar = ehAliado ? "jogarCarta" : "jogarCartaInimigo";
    let html = criarHTMLCarta(cartaObj, funcaoJogar, classeCss, ehAliado);

    let temp = document.createElement("div");
    temp.innerHTML = html.trim();
    let novoElemento = temp.firstElementChild;

    // Insere no MESMO lugar da carta antiga (preserva a ordem no campo, importante pra
    // habilidades que dependem de vizinhos, tipo Cavaleiro das Trevas e Barril).
    pacoteAlvo.parentElement.insertBefore(novoElemento, pacoteAlvo);
    pacoteAlvo.remove();

    if (estavaCongelada) novoElemento.classList.add("congelada");

    // "Liga" a carta de verdade — ataque, habilidade, tudo já funcionando com a nova identidade.
    if (ehAliado) jogarCarta("pacote-" + idUnico);
    else jogarCartaInimigo("pacote-" + idUnico);
    if (cartaSilenciadaPeloEcto(idUnico)) aplicarInterfaceSilencioEcto(idUnico);

    if (transformacaoFamiliaSlime && typeof window.rpgConcluirTransformacaoFamiliaSlime === "function") {
        window.rpgConcluirTransformacaoFamiliaSlime();
    }

    // As funções acima podem reposicionar a carta; busca novamente o elemento definitivo.
    animarRevelacaoIcaro(document.getElementById("pacote-" + idUnico));

    narrar(transformacaoFamiliaSlime && transformacaoFamiliaSlime.quantidade > 1
        ? `🎨 ÍCARO transformou a família Slime inteira (${transformacaoFamiliaSlime.quantidade} cartas) em uma única carta: ${novaCartaInfo.nome}! A nova carta manteve a vida (${vidaAtual}) e o dano (${danoAtual}) do Slime escolhido.`
        : `🎨 ÍCARO transformou ${nomeAntigo} em ${novaCartaInfo.nome}! Vida (${vidaAtual}) e dano (${danoAtual}) continuam os mesmos — e agora ela tem a passiva e a Habilidade de ${novaCartaInfo.nome}.`);

    modoTransformacaoIcaro = false;
    idIcaroAtivo = null;
    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
}

// ⚖️ THIAGO — ajusta em ±1 a vida OU o dano da carta clicada (jogador escolhe os dois na hora).
function aplicarAjusteThiago(idPacoteAlvo) {
    let pacoteAlvo = document.getElementById(idPacoteAlvo);
    if (!pacoteAlvo) return;
    let idPuro = idPacoteAlvo.replace("pacote-", "");

    // 🤖 Se for o BOT decidindo (não um humano jogando, nem mesmo o Jogador 2 manual no
    // PvP local), pula os pop-ups de confirm() — eles travariam esperando um clique que
    // nunca vem — e sempre enfraquece o alvo tirando 1 de DANO (o alvo já é a maior
    // ameaça escolhida em botResolverEscolhaPendente).
    let ehDecisaoDoBot = (typeof window !== "undefined" && window.__rpgBotJogando === true);
    let ajustarVida, aumentar;
    if (ehDecisaoDoBot) {
        ajustarVida = false;
        aumentar = false;
    } else {
        ajustarVida = confirm("Qual atributo ajustar?\n\n[ OK ] = VIDA\n[ CANCELAR ] = DANO");
        aumentar = confirm("Aumentar ou diminuir em 1?\n\n[ OK ] = Aumentar (+1)\n[ CANCELAR ] = Diminuir (-1)");
    }

    let isInimigo = pacoteAlvo.closest("#campo-j2") !== null;

    // Registra as posições antes do ajuste, pois diminuir a vida pode eliminar a carta.
    animarAjusteThiago(idThiagoAtivo, idPuro, ajustarVida ? "vida" : "dano", aumentar);

    if (ajustarVida) {
        // Reaproveita aplicarDanoDireto: dano negativo cura (+1 vida), dano positivo tira 1 de vida.
        aplicarDanoDireto(idPacoteAlvo, aumentar ? -1 : 1, isInimigo);
        narrar(`⚖️ THIAGO ${aumentar ? "aumentou" : "diminuiu"} 1 de VIDA da carta escolhida!`);
        // Vida não é recalculada automaticamente por nada, então aqui pode atualizar à vontade.
        if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
    } else {
        let txtDano = document.getElementById("dano-" + idPuro);
        if (txtDano) {
            let novoDano = parseFloat(txtDano.innerText) + (aumentar ? 1 : -1);
            txtDano.innerText = novoDano;
        }
        narrar(`⚖️ THIAGO ${aumentar ? "aumentou" : "diminuiu"} 1 de DANO da carta escolhida!`);
        // 🩹 NÃO chama atualizarTodosUnidoes() aqui: se o alvo for um Unidão, essa função
        // recalcula o dano dele automaticamente (1 + maior dano do time) e apagaria na hora
        // o ajuste manual do Thiago. Deixando de fora, o ±1 realmente fica valendo.
    }

    modoAjusteThiago = false;
    idThiagoAtivo = null;
}

// 👥 Botão "Trocar Parceiro" — sempre disponível, pode ser clicado quantas vezes quiser.
function trocarParceiroSeparado(idUnico, ehAliado) {
    let pacoteSeparado = document.getElementById("pacote-" + idUnico);
    if (!pacoteSeparado) return;

    let lado = ehAliado ? "j1" : "j2";
    let classeCss = ehAliado ? "carta-aliada" : "carta-inimiga";
    let outrosAliados = Array.from(document.getElementById("campo-" + lado).getElementsByClassName(classeCss))
        .filter(p => p.id !== "pacote-" + idUnico);

    if (outrosAliados.length === 0) {
        return narrar("❌ Não tem nenhuma outra carta do seu time em campo pra virar parceira agora.");
    }

    modoParceriaSeparado = true;
    idSeparadoParceriaAtivo = idUnico;
    narrar(`👥 Escolha a nova carta parceira — clique em outra carta do seu time em campo.`);
}

// 👥 Busca reversa: dado o ID de quem atacou, acha o Separado/Separadois que tem ESSA
// carta como parceira (se houver). Usado porque agora é o ataque da PARCEIRA que arrasta
// o Separado junto — não o contrário.
function encontrarSeparadoParceiroDe(idCartaQueAtacou) {
    if (typeof parceriaSeparado === 'undefined') return null;
    for (let idSep in parceriaSeparado) {
        if (parceriaSeparado[idSep] === idCartaQueAtacou) return idSep;
    }
    return null;
}

// Uma carta pode ter mais de um Separado ligado a ela e os vínculos podem formar
// correntes. Ex.: Separado A -> Separado B -> Guerreiro. Quando o Guerreiro ataca,
// B acompanha e, como B também atacou, A acompanha B. Cada carta entra uma única
// vez no golpe, mesmo quando existem vários ramos de parceria.
function obterSeparadosQueAcompanhamAtaque(idAtacante, lado) {
    let pacoteAtacante = document.getElementById("pacote-" + idAtacante);
    if (!pacoteAtacante?.closest("#campo-" + lado)) return [];

    let encontrados = [];
    let idsIncluidos = new Set([idAtacante]);
    let fila = [idAtacante];

    while (fila.length > 0) {
        let idParceiroQueAtacou = fila.shift();

        Object.keys(parceriaSeparado || {}).forEach(idSeparado => {
            if (parceriaSeparado[idSeparado] !== idParceiroQueAtacou
                || idsIncluidos.has(idSeparado)
                || separadaoDividido[idSeparado] > 0) return;

            let pacoteSeparado = document.getElementById("pacote-" + idSeparado);
            if (!pacoteSeparado?.closest("#campo-" + lado)
                || pacoteSeparado.classList.contains("congelada")
                || cartaSilenciadaPeloEcto(idSeparado)) return;

            let dano = parseFloat(document.getElementById("dano-" + idSeparado)?.innerText) || 0;
            let nome = pacoteSeparado.querySelector(".nome-carta")?.innerText?.trim() || "Separado";
            idsIncluidos.add(idSeparado);
            encontrados.push({
                id: idSeparado,
                idParceiro: idParceiroQueAtacou,
                dano: Math.max(0, dano),
                nome
            });
            fila.push(idSeparado);
        });
    }

    return encontrados;
}

// Cada fase de dano do Incendiário conta como ataque para seus parceiros.
// O Separado acerta uma carta que foi queimada e ainda está viva.
function atacarComSeparadosParceirosDaQueimada(idIncendiario, alvosQueimados, ladoInc) {
    let ladoAlvo = ladoInc === "j1" ? "j2" : "j1";
    let pacoteInc = document.getElementById("pacote-" + idIncendiario);
    if (!pacoteInc?.closest("#campo-" + ladoInc)) return;

    obterSeparadosQueAcompanhamAtaque(idIncendiario, ladoInc).forEach(parceiro => {
        let idAlvo = alvosQueimados.find(id => document.getElementById(id)?.closest("#campo-" + ladoAlvo));
        if (!idAlvo) return;

        animarAtaqueConjuntoSeparado(parceiro.id, parceiro.idParceiro || idIncendiario, idAlvo);
        aplicarDanoAtaqueArea(idAlvo, parceiro.dano, ladoAlvo === "j2");
        narrar(`👥 ${parceiro.nome} atacou uma das cartas queimadas pelo Incendiário, causando ${parceiro.dano} de dano!`);
    });
}

function parceiraDoSeparadoEhIncendiario(idSeparado) {
    let idParceira = parceriaSeparado[idSeparado];
    let visitados = new Set([idSeparado]);

    // Se o Separado estiver ligado a outro Separado, acompanha a corrente até a
    // carta principal. Assim uma corrente ligada ao Incendiário também é puxada
    // automaticamente por cada fase da queimada.
    while (idParceira && parceriaSeparado[idParceira] && !visitados.has(idParceira)) {
        visitados.add(idParceira);
        idParceira = parceriaSeparado[idParceira];
    }

    let pacoteParceira = idParceira ? document.getElementById("pacote-" + idParceira) : null;
    let nomeExibido = pacoteParceira?.querySelector(".nome-carta")?.innerText?.trim();
    return !!pacoteParceira && obterNomeEfetivoCarta(idParceira, nomeExibido) === "Incendiário";
}

// Evita A -> B -> A. Uma corrente circular não teria uma carta principal para
// apertar Atacar e também poderia fazer o mesmo Separado entrar mais de uma vez.
function parceriaSeparadoCriariaCiclo(idSeparado, idNovoParceiro) {
    let atual = idNovoParceiro;
    let visitados = new Set();

    while (atual && !visitados.has(atual)) {
        if (atual === idSeparado) return true;
        visitados.add(atual);
        atual = parceriaSeparado[atual];
    }
    return false;
}

// 👥 SEPARADO/SEPARADOIS — resolve o clique de quem vira parceira.
function aplicarParceriaSeparado(idPacoteAlvo) {
    let idPuro = idPacoteAlvo.replace("pacote-", "");
    if (idPuro === idSeparadoParceriaAtivo) {
        return narrar("❌ Escolha outra carta — ela não pode ser parceira dela mesma!");
    }

    let pacoteSeparado = document.getElementById("pacote-" + idSeparadoParceriaAtivo);
    let pacoteClicado = document.getElementById(idPacoteAlvo);
    if (!pacoteSeparado || !pacoteClicado) return;

    let ladoSeparado = pacoteSeparado.closest("#campo-j1") ? "j1" : "j2";
    let ladoClicado = pacoteClicado.closest("#campo-j1") ? "j1" : "j2";
    if (ladoClicado !== ladoSeparado) {
        return narrar("❌ Alvo inválido! A parceira precisa ser uma carta do MESMO time.");
    }

    let idSeparado = idSeparadoParceriaAtivo;
    if (parceriaSeparadoCriariaCiclo(idSeparado, idPuro)) {
        return narrar("❌ Essa ligação fecharia um círculo entre os Separados. Escolha uma corrente que termine em outra carta.");
    }
    parceriaSeparado[idSeparado] = idPuro;
    // Se esta carta já conquistou o Especial permanente, trocar de parceira não o apaga:
    // a nova dupla já fica pronta para atacar alvos diferentes.
    if (especialFixoSeparado[idSeparado] === true && !parceiraDoSeparadoEhIncendiario(idSeparado)) {
        separadaoDividido[idSeparado] = 2;
        separadaoAtacantesNaSequencia[idSeparado] = [];
    } else {
        delete separadaoDividido[idSeparado];
        delete separadaoAtacantesNaSequencia[idSeparado];
    }
    let nomeParceira = pacoteClicado.querySelector(".nome-carta").innerText.trim();
    narrar(`👥 Parceria formada com ${nomeParceira}! A partir de agora, elas atacam juntas o mesmo alvo.`);
    sincronizarVinculosSeparado();

    modoParceriaSeparado = false;
    idSeparadoParceriaAtivo = null;
}

// 👥 Recarrega, no início de cada turno, os dois ataques do Especial permanente.
// A contagem separada ainda é temporária (2 → 1 → 0), mas a conquista guardada em
// especialFixoSeparado nunca é consumida quando a rodada termina.
function prepararEspeciaisFixosSeparadoDoTurno() {
    if (typeof especialFixoSeparado === "undefined" || typeof separadaoDividido === "undefined") return;

    let ladoAtual = turnoAtivo === 1 ? "j1" : "j2";
    let campoAtual = document.getElementById("campo-" + ladoAtual);
    if (!campoAtual) return;

    Object.keys(especialFixoSeparado).forEach(idSeparado => {
        if (especialFixoSeparado[idSeparado] !== true) return;

        let pacoteSeparado = document.getElementById("pacote-" + idSeparado);
        if (!pacoteSeparado || pacoteSeparado.parentElement !== campoAtual) return;

        // Limpa qualquer contagem incompleta antiga antes de preparar a nova rodada.
        delete separadaoDividido[idSeparado];
        delete separadaoAtacantesNaSequencia[idSeparado];

        let idParceira = parceriaSeparado[idSeparado];
        let pacoteParceira = idParceira ? document.getElementById("pacote-" + idParceira) : null;
        if (!pacoteParceira || pacoteParceira.parentElement !== campoAtual) return;

        // A queimada já puxa o ataque da dupla; não espera um clique manual
        // no Incendiário, que não possui esse botão após jogar a pólvora.
        if (parceiraDoSeparadoEhIncendiario(idSeparado)) return;

        separadaoDividido[idSeparado] = 2;
        separadaoAtacantesNaSequencia[idSeparado] = [];

        // O botão não precisa voltar: depois de conquistado, o efeito já é automático.
        let botaoEspecial = pacoteSeparado.querySelector("button[onclick*='usarHabilidade']");
        if (botaoEspecial) botaoEspecial.style.display = "none";
    });
}

// Descobre se o ataque que ACABOU de acontecer faz parte da sequência dividida — seja
// porque quem atacou é o próprio Separado, seja porque é a parceira dele.
function obterSeparadaoDivididoAtivo(idAtacante) {
    if (typeof separadaoDividido === 'undefined') return null;
    if (separadaoDividido[idAtacante] > 0) return idAtacante;
    return Object.keys(parceriaSeparado).find(idSeparado =>
        parceriaSeparado[idSeparado] === idAtacante && separadaoDividido[idSeparado] > 0) || null;
}

function obterSequenciaSeparadoPendenteDoLado(lado) {
    if (typeof separadaoDividido === "undefined" || typeof separadaoAtacantesNaSequencia === "undefined") return null;

    for (let idSeparado of Object.keys(separadaoDividido)) {
        let atacantes = separadaoAtacantesNaSequencia[idSeparado] || [];
        let pacoteSeparado = document.getElementById("pacote-" + idSeparado);
        if (separadaoDividido[idSeparado] !== 1
            || atacantes.length !== 1
            || !pacoteSeparado?.closest("#campo-" + lado)) continue;

        let primeiro = atacantes[0];
        let idObrigatorio = primeiro === idSeparado ? parceriaSeparado[idSeparado] : idSeparado;
        if (!idObrigatorio || !document.getElementById("pacote-" + idObrigatorio)) {
            delete separadaoDividido[idSeparado];
            delete separadaoAtacantesNaSequencia[idSeparado];
            continue;
        }
        return {
            idSeparado,
            idObrigatorio
        };
    }
    return null;
}

// Registra um ataque da dupla sem impor quem deve começar. Retorna "aguardando" quando
// falta o outro integrante, "concluido" no segundo ataque e null fora dessa sequência.
function finalizarAtaqueSeparadoDividido(idAtacante, ehInimigo) {
    let idSeparado = obterSeparadaoDivididoAtivo(idAtacante);
    if (!idSeparado) return null;

    let atacantes = separadaoAtacantesNaSequencia[idSeparado] || [];
    if (!atacantes.includes(idAtacante)) atacantes.push(idAtacante);
    separadaoAtacantesNaSequencia[idSeparado] = atacantes;
    separadaoDividido[idSeparado] = Math.max(0, 2 - atacantes.length);

    if (separadaoDividido[idSeparado] > 0) {
        let outroId = idAtacante === idSeparado ? parceriaSeparado[idSeparado] : idSeparado;
        let outroPacote = document.getElementById("pacote-" + outroId);
        let outroNome = outroPacote?.querySelector(".nome-carta")?.innerText?.trim() || "a outra carta da dupla";
        narrar(ehInimigo
            ? `👥 ${outroNome} ainda vai realizar o segundo ataque da dupla inimiga.`
            : `👥 Primeiro ataque concluído! Agora ataque com ${outroNome} e escolha o outro alvo.`);
        return "aguardando";
    } else {
        animarReuniaoSeparado(idSeparado);
        delete separadaoDividido[idSeparado];
        delete separadaoAtacantesNaSequencia[idSeparado];
        return "concluido";
    }
}


// Cria o relógio usado pelos dois efeitos do Viajante. Os ponteiros são elementos
// separados para poderem girar ao contrário ou parar de repente no especial.
function criarRelogioDoViajante(classeExtra) {
    let relogio = document.createElement("div");
    relogio.className = "relogio-do-viajante " + (classeExtra || "");
    relogio.innerHTML = `
        <span class="marca-tempo marca-tempo-12"></span>
        <span class="marca-tempo marca-tempo-3"></span>
        <span class="marca-tempo marca-tempo-6"></span>
        <span class="marca-tempo marca-tempo-9"></span>
        <i class="ponteiro-tempo ponteiro-hora"></i>
        <i class="ponteiro-tempo ponteiro-minuto"></i>
        <b class="pino-relogio-temporal"></b>
    `;
    return relogio;
}

// Passiva: o relógio aparece sobre o próprio Viajante e gira ao contrário, como
// se ele estivesse rebobinando a rodada do time inteiro.
function animarVoltaNoTempo(idViajante) {
    let pacote = document.getElementById("pacote-" + idViajante);
    if (!pacote) return;

    let rect = pacote.getBoundingClientRect();
    let efeito = document.createElement("div");
    efeito.className = "efeito-volta-no-tempo";
    efeito.style.left = (rect.left + rect.width / 2) + "px";
    efeito.style.top = (rect.top + Math.min(58, rect.height * 0.28)) + "px";
    efeito.innerHTML = '<i class="anel-temporal"></i><i class="anel-temporal"></i>';
    efeito.appendChild(criarRelogioDoViajante("relogio-rebobinando"));
    document.body.appendChild(efeito);

    pacote.classList.add("viajante-rebobinando-tempo");
    setTimeout(() => {
        efeito.remove();
        if (pacote.isConnected) pacote.classList.remove("viajante-rebobinando-tempo");
    }, 1750);
}

// Especial: a carta verdadeira sai da batalha na mesma hora, preservando a regra do jogo.
// Um eco visual sem IDs fica por alguns instantes, preso dentro do relógio, até desaparecer.
function animarCartaPresaNoTempo(pacoteAlvo) {
    if (!pacoteAlvo) return;

    let rect = pacoteAlvo.getBoundingClientRect();
    let eco = pacoteAlvo.cloneNode(true);
    eco.removeAttribute("id");
    eco.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
    eco.querySelectorAll("button").forEach(botao => {
        botao.disabled = true;
        botao.removeAttribute("onclick");
    });
    eco.classList.add("eco-carta-presa-no-tempo");
    eco.style.left = rect.left + "px";
    eco.style.top = rect.top + "px";
    eco.style.width = rect.width + "px";
    eco.style.height = rect.height + "px";
    eco.style.margin = "0";
    eco.appendChild(criarRelogioDoViajante("relogio-prendendo-tempo"));

    let distorcao = document.createElement("div");
    distorcao.className = "distorcao-prisao-temporal";
    distorcao.style.left = (rect.left + rect.width / 2) + "px";
    distorcao.style.top = (rect.top + rect.height / 2) + "px";

    document.body.appendChild(eco);
    document.body.appendChild(distorcao);
    setTimeout(() => {
        eco.remove();
        distorcao.remove();
    }, 1850);
}

// ⏳ VIAJANTE DO TEMPO — Passiva (uso único): reseta TODAS as habilidades/passivas de uso
// único já gastas nas duas mesas (o botão "Especial" reaparece pra quem já usou), sem
// mexer em vida, dano ou posição de nenhuma carta.
function usarPassivaViajante(idUnico, botaoClicado) {
    if (cartaSilenciadaPeloEcto(idUnico)) {
        return narrar("👻 Este Viajante perdeu a Passiva para o Ecto e não pode voltar no tempo.");
    }
    if (viajantesJaUsaram[idUnico]) {
        return narrar("⏳ Este Viajante do Tempo já usou a Passiva dele!");
    }

    let pacoteViajante = document.getElementById("pacote-" + idUnico);
    let lado = (pacoteViajante && pacoteViajante.closest("#campo-j1")) ? "j1" : "j2";

    animarVoltaNoTempo(idUnico);

    let campo = document.getElementById("campo-" + lado);
    let necromantesReativados = 0;
    if (campo) {
        // Jogar Pólvora não é apenas um botão: existe um ciclo interno que
        // continuava marcado como ativo mesmo após o tempo voltar. Limpamos o
        // ciclo e seus alvos antigos para o próximo clique começar novamente
        // pela fase 1 e marcar as cartas que estiverem na arena naquele momento.
        Array.from(campo.querySelectorAll(".btn-polvora-incendiario")).forEach(btnPolvora => {
            let pacoteIncendiario = btnPolvora.closest("div[id^='pacote-']");
            if (!pacoteIncendiario) return;
            let idIncendiario = pacoteIncendiario.id.replace("pacote-", "");
            delete incendiarioCiclo[idIncendiario];
            delete incendiarioAlvos[idIncendiario];
            delete incendiarioFasesVisuais[idIncendiario];
        });
        sincronizarVisuaisIncendiario();

        Array.from(campo.querySelectorAll("button")).forEach(btn => {
            if (btn.style.display === "none") btn.style.display = "";
        });

        // O bot também precisa esquecer, por carta, as tentativas devolvidas
        // pela viagem. Se já houver um roubo aguardando alvo, ele ainda precisa
        // ser concluído antes de outro começar.
        if (typeof window.rpgBotReativarPassivasAposViagem === "function") {
            window.rpgBotReativarPassivasAposViagem(lado);
        }

        // Restaura também os estados internos das Passivas. Algumas são
        // automáticas, outras dependem do próximo ataque e outras perderam o
        // próprio botão durante uma transformação do Ctrl.
        Array.from(campo.querySelectorAll(":scope > div[id^='pacote-']")).forEach(pacote => {
            let idCarta = pacote.id.replace("pacote-", "");
            // O toque do Ecto é permanente: nem a viagem no tempo devolve a
            // Passiva ou o Especial removido daquela identidade.
            if (cartaSilenciadaPeloEcto(idCarta)) {
                aplicarInterfaceSilencioEcto(idCarta);
                return;
            }
            let nomeExibido = pacote.querySelector(".nome-carta")?.innerText.trim() || "";
            let nomeEfetivo = obterNomeEfetivoCarta(idCarta, nomeExibido);

            // Cada Ladrão (inclusive um Ctrl copiando Ladrão) recupera somente
            // a própria tentativa. Um não altera o estado dos demais.
            if (nomeEfetivo === "Ladrão") delete ladraoUsosPorCarta[idCarta];

            // Goblin e o último integrante do Trio poderão rolar novamente a
            // Passiva no próximo ataque liberado pela viagem no tempo.
            delete goblinJaAtacouNesteTurno[idCarta];
            delete goblinAtaquesGanhos[idCarta];

            if (nomeEfetivo === "Portable") {
                portableDuracao[idCarta] = 4;
            }
            if (nomeEfetivo.includes("Barril de Goblin")) {
                delete barrilJaImpactou[idCarta];
            }

            // Depois de copiar, o Ctrl troca todo o bloco de ações e o botão
            // Passiva desaparece. A viagem recria esse botão para permitir uma
            // nova cópia da última carta usada pelo adversário.
            if ((nomeExibido === "Ctrl C" || nomeExibido === "Ctrl V")
                && !pacote.querySelector("button[onclick*='usarPassivaCtrlC']")) {
                let acoesCtrl = pacote.querySelector("div[id^='acoes-']");
                if (acoesCtrl) {
                    acoesCtrl.insertAdjacentHTML(
                        "beforeend",
                        `<button onclick="usarPassivaCtrlC('${idCarta}', this)" style="background-color: #34495e; color: white; font-weight: bold; width: 100%; margin-bottom: 2px; cursor: pointer;">Passiva 📋</button>`
                    );
                }
            }

            // A Passiva do Necromante não tem botão: ela precisa ser executada
            // novamente. Isso também alcança Ctrl C/V copiando Necromante.
            if (nomeEfetivo !== "Necromante" || typeof verificarPassivaNecromante !== "function") return;

            verificarPassivaNecromante({ nome: "Necromante", passivaAtivada: false }, lado === "j1");
            necromantesReativados++;
        });
    }

    viajantesJaUsaram[idUnico] = true;
    if (botaoClicado) botaoClicado.style.display = "none"; // essa própria Passiva é uso único

    // Uma viagem não restaura outra viagem já gasta: isso impediria dois
    // Viajantes de devolverem a Passiva um do outro para sempre.
    if (campo) {
        Array.from(campo.querySelectorAll("button[onclick*='usarPassivaViajante']")).forEach(btnViajar => {
            let pacote = btnViajar.closest("div[id^='pacote-']");
            let idDono = pacote ? pacote.id.replace("pacote-", "") : "";
            if (viajantesJaUsaram[idDono]) btnViajar.style.display = "none";
        });
    }

    let mensagemNecromante = necromantesReativados > 0
        ? ` A Passiva ${necromantesReativados === 1 ? "do Necromante foi reativada e invocou 2 novas cartas" : `dos ${necromantesReativados} Necromantes foi reativada e invocou ${necromantesReativados * 2} novas cartas`}.`
        : "";
    narrar(`⏳ O tempo voltou! Todas as Habilidades, Passivas e Especiais já usados no time ${lado === "j1" ? "aliado" : "do oponente"} estão disponíveis de novo (vida e dano de ninguém mudaram).${mensagemNecromante}`);
    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
}

// ⏳ Habilidade do Viajante do Tempo (dado 1) — resolve o clique na carta inimiga que
// fica presa em um momento do tempo e SOME da batalha.
function aplicarPrenderNoTempo(idPacoteAlvo) {
    let pacoteViajante = document.getElementById("pacote-" + idPrenderNoTempoAtivo);
    let pacoteClicado = document.getElementById(idPacoteAlvo);
    if (!pacoteViajante || !pacoteClicado) return;

    let ladoViajante = pacoteViajante.closest("#campo-j1") ? "j1" : "j2";
    let ladoClicado = pacoteClicado.closest("#campo-j1") ? "j1" : "j2";
    if (ladoClicado === ladoViajante) {
        return narrar("❌ Alvo inválido! Escolha uma carta INIMIGA pra prender no tempo.");
    }

    let idPuro = idPacoteAlvo.replace("pacote-", "");
    let nomeAlvo = pacoteClicado.querySelector(".nome-carta").innerText.trim();

    let idsFamiliaSlime = typeof window.rpgObterIdsFamiliaSlime === "function"
        ? window.rpgObterIdsFamiliaSlime(idPuro)
        : [];

    if (idsFamiliaSlime.length > 0 && typeof window.rpgApagarFamiliaSlime === "function") {
        idsFamiliaSlime.forEach(idSlime => {
            let pacoteSlime = document.getElementById("pacote-" + idSlime);
            if (pacoteSlime) animarCartaPresaNoTempo(pacoteSlime);
        });
        let totalApagado = window.rpgApagarFamiliaSlime(idPuro);
        narrar(`⏳ A linha temporal da família Slime foi apagada: ${totalApagado} ${totalApagado === 1 ? "carta sumiu" : "cartas sumiram"} sem gerar novas divisões!`);
    } else {
        animarCartaPresaNoTempo(pacoteClicado);
        pacoteClicado.remove(); // ela desaparece da batalha — presa em outro momento do tempo
        narrar(`⏳ ${nomeAlvo} ficou PRESA em um momento do tempo e SUMIU da batalha!`);
    }

    modoPrenderNoTempo = false;
    idPrenderNoTempoAtivo = null;
}

function aplicarAlvoBarril(idPacoteAlvo, viaEspecial) {
    let pacoteAlvo = document.getElementById(idPacoteAlvo);
    let pacoteBarril = document.getElementById("pacote-" + idBarrilAtivo);
    
    // 👇 SE ALGO CORRER MAL, DESLIGA A MIRA PARA NÃO ENCRAVAR O JOGO!
    if (!pacoteAlvo || !pacoteBarril) {
        modoAlvoBarril = false;
        modoAlvoBarrilInimigo = false;
        return;
    }
    // Descobre de qual lado está o Barril e de qual lado está o Alvo
    let ladoBarril = pacoteBarril.closest("#campo-j1") ? "j1" : "j2";
    let ladoAlvo = pacoteAlvo.closest("#campo-j1") ? "j1" : "j2";

    // Impede o Barril de atacar as cartas do próprio time
    if (ladoBarril === ladoAlvo) {
        return narrar("❌ Escolha uma carta do campo oposto para o Barril atacar!");
    }

    // Quando o Especial já lança o Barril, o botão Atacar não foi usado. Ainda
    // assim este impacto é o primeiro ataque da carta e deve contar para Velux.
    ultimoIdQueAtacou = idBarrilAtivo;

    let nomeAlvo = pacoteAlvo.querySelector(".nome-carta").innerText;
    let isInimigoParaOJogo = (ladoAlvo === "j2"); 

    // Desliga a mira
    modoAlvoBarril = false;
    modoAlvoBarrilInimigo = false;

    let idBarrilPuro = idBarrilAtivo;
    let idAlvoPuro = idPacoteAlvo.replace("pacote-", "");
    
    let barrilAindaNaoLancado = !barrilJaImpactou[idBarrilPuro];
    alvosDoBarril[idBarrilPuro] = idAlvoPuro;
    if (barrilAindaNaoLancado) {
        animarLancamentoBarrilGoblin(idBarrilPuro, idAlvoPuro);
        narrar(`🎯 Os Goblins do Barril focaram-se em [${nomeAlvo}]!`);
    } else {
        // Depois do primeiro lançamento (inclusive no segundo uso da Velux),
        // apenas os goblins vivos e seu vínculo de dano periódico mudam de alvo.
        sincronizarMarcadoresBarrilGoblin();
        narrar(`👣 Os Goblins do Barril migraram para [${nomeAlvo}]! O Barril não foi lançado novamente.`);
    }

    // LÊ O DANO EXTRA (BUFFS DA BESTA, UNIDÃO, ETC)
    let txtDanoBarril = document.getElementById("dano-" + idBarrilPuro);
    let buffDano = txtDanoBarril ? parseFloat(txtDanoBarril.innerText) : 0;

    // DANO DE IMPACTO
    if (barrilAindaNaoLancado) {
        barrilJaImpactou[idBarrilPuro] = true;

        // 🎯 Carta atacada: 1 de impacto + o dano atual do Barril (0,75 base dos 3 goblins,
        // ou mais se estiver com Besta/Unidão) = 1,75 no caso padrão.
        let danoAlvoPrincipal = 1 + buffDano;
        aplicarDanoAtaqueArea(idPacoteAlvo, danoAlvoPrincipal, isInimigoParaOJogo);
        narrar(`💥 BUM! O impacto do Barril causou ${danoAlvoPrincipal} de dano na carta atacada!`);

        // 🩸 Vizinhos: impacto fixo de 1, sem escalar com o dano do Barril.
        let danoImpactoVizinhos = 1;
        let vizinhos = obterCartasAdjacentes(idPacoteAlvo);
        vizinhos.forEach(vizinho => {
            aplicarDanoAtaqueArea(vizinho.id, danoImpactoVizinhos, isInimigoParaOJogo);
        });
        if (vizinhos.length > 0) narrar(`💥 O impacto também atingiu as cartas vizinhas, causando ${danoImpactoVizinhos} de dano em cada!`);

        // 🦇 VAMPI7 — esse impacto conta como um ataque de verdade também.
        dispararVampi7JuntoDoAtaque(idBarrilPuro, idPacoteAlvo);
        dispararSeteNegativoJuntoDoAtaque(idBarrilPuro, idPacoteAlvo);
        // 🛸 PORTABLE — ataca junto enquanto a bateria durar.
        dispararPortableJuntoDoAtaque(idBarrilPuro, idPacoteAlvo);
    }

    idBarrilAtivo = null;

    if (viaEspecial) {
        modoEspecialBarrilGoblin = false;
        usarHabilidade('Barril de Goblin', idBarrilPuro, null);
    }
    passarTurnoSeForVezDaCarta(idBarrilPuro);
}

// 🧪 RECUPERIDA — o frasco cai de cima da carta; no impacto, o coração que já
// existia no jogo sobe normalmente. A cura numérica continua acontecendo na hora.
function animarRecuperidaCaindo(idAlvo, aoImpactar) {
    let alvo = document.getElementById("pacote-" + idAlvo);
    if (!alvo) {
        if (typeof aoImpactar === "function") aoImpactar();
        return;
    }
    let rect = alvo.getBoundingClientRect();
    let centroX = rect.left + rect.width / 2;
    let impactoY = rect.top + Math.min(rect.height * .38, 90);

    let frasco = document.createElement("div");
    frasco.className = "recuperida-caindo";
    frasco.style.setProperty("--recuperida-x", centroX + "px");
    frasco.style.setProperty("--recuperida-inicio-y", (rect.top - 82) + "px");
    frasco.style.setProperty("--recuperida-impacto-y", impactoY + "px");
    frasco.innerHTML = '<span>🧪</span><i></i><i></i><i></i>';

    let brilho = document.createElement("div");
    brilho.className = "impacto-recuperida";
    brilho.style.left = centroX + "px";
    brilho.style.top = impactoY + "px";
    brilho.innerHTML = "<i></i><i></i><i></i><b>+</b>";

    document.body.appendChild(frasco);
    document.body.appendChild(brilho);
    setTimeout(() => {
        alvo.classList.add("carta-recebendo-recuperida");
        if (typeof aoImpactar === "function") aoImpactar();
    }, 610);
    setTimeout(() => {
        frasco.remove();
        brilho.remove();
        if (alvo.isConnected) alvo.classList.remove("carta-recebendo-recuperida");
    }, 1350);
}

// 🧪 TRAIÇÃO — primeiro a poção viaja da mão até o futuro traidor e deixa nele
// uma marca púrpura curta, indicando que falta escolher a vítima aliada.
function animarPocaoTraicao(idItem, idAlvo) {
    let item = document.getElementById("pacote-" + idItem);
    let alvo = document.getElementById("pacote-" + idAlvo);
    if (!alvo) return;
    let origem = (item || alvo).getBoundingClientRect();
    let destino = alvo.getBoundingClientRect();
    let inicioX = origem.left + origem.width / 2;
    let inicioY = item ? origem.top + origem.height / 2 : destino.top - 70;
    let fimX = destino.left + destino.width / 2;
    let fimY = destino.top + destino.height * .38;

    let pocao = document.createElement("div");
    pocao.className = "pocao-traicao-lancada";
    pocao.style.setProperty("--traicao-inicio-x", inicioX + "px");
    pocao.style.setProperty("--traicao-inicio-y", inicioY + "px");
    pocao.style.setProperty("--traicao-meio-x", ((inicioX + fimX) / 2) + "px");
    pocao.style.setProperty("--traicao-meio-y", (Math.min(inicioY, fimY) - 48) + "px");
    pocao.style.setProperty("--traicao-fim-x", fimX + "px");
    pocao.style.setProperty("--traicao-fim-y", fimY + "px");
    pocao.innerHTML = '<span>🧪</span><i></i><i></i>';

    let marca = document.createElement("div");
    marca.className = "marca-pocao-traicao";
    marca.style.left = fimX + "px";
    marca.style.top = fimY + "px";
    marca.innerHTML = "<span>🗡️</span><i></i>";

    document.body.appendChild(pocao);
    document.body.appendChild(marca);
    alvo.classList.add("carta-marcada-pela-traicao");
    setTimeout(() => {
        pocao.remove();
        marca.remove();
        if (alvo.isConnected) alvo.classList.remove("carta-marcada-pela-traicao");
    }, 1450);
}

// A carta traidora avança como uma sombra e a adaga entra por trás da vítima.
// Tudo é fixo na tela, então o golpe continua visível mesmo se o dano destruir a carta.
function animarFacadaTraicao(idCartaTraidora, idCartaVitima) {
    let traidor = document.getElementById("pacote-" + idCartaTraidora);
    let vitima = document.getElementById("pacote-" + idCartaVitima);
    if (!traidor || !vitima) return;
    let origem = traidor.getBoundingClientRect();
    let destino = vitima.getBoundingClientRect();
    let inicioX = origem.left + origem.width / 2;
    let inicioY = origem.top + origem.height / 2;
    let fimX = destino.left + destino.width / 2;
    let fimY = destino.top + destino.height / 2;

    let sombra = document.createElement("div");
    sombra.className = "sombra-traidor-atacando";
    sombra.style.setProperty("--facada-inicio-x", inicioX + "px");
    sombra.style.setProperty("--facada-inicio-y", inicioY + "px");
    sombra.style.setProperty("--facada-fim-x", (fimX - 28) + "px");
    sombra.style.setProperty("--facada-fim-y", fimY + "px");
    let imagem = traidor.querySelector("img");
    sombra.innerHTML = imagem && imagem.src ? `<img src="${imagem.src}" alt="">` : "<span>🥷</span>";

    let adaga = document.createElement("div");
    adaga.className = "adaga-facada-nas-costas";
    adaga.style.left = fimX + "px";
    adaga.style.top = fimY + "px";
    adaga.innerHTML = '<span>🗡️</span><i></i><i></i><b>!</b>';

    document.body.appendChild(sombra);
    document.body.appendChild(adaga);
    traidor.classList.add("carta-traidora-avancando");
    vitima.classList.add("vitima-facada-costas");
    setTimeout(() => {
        sombra.remove();
        adaga.remove();
        if (traidor.isConnected) traidor.classList.remove("carta-traidora-avancando");
        if (vitima.isConnected) vitima.classList.remove("vitima-facada-costas");
    }, 1300);
}

// ⚡ AUVEX — um raio curto cai exatamente sobre a tropa que recebeu o +1 permanente.
// O elemento fica preso à tela (e não altera o tamanho/posição da carta) e é removido
// assim que a animação termina.
function animarRaioAuvex(idAlvo) {
    let pacoteAlvo = document.getElementById("pacote-" + idAlvo) || document.getElementById(idAlvo);
    if (!pacoteAlvo) return;

    let rect = pacoteAlvo.getBoundingClientRect();
    let centroX = rect.left + rect.width / 2;
    let impactoY = rect.top + Math.min(rect.height * 0.42, 72);
    let inicioY = Math.max(4, impactoY - 145);

    let raio = document.createElement("div");
    raio.className = "raio-auvex-caindo";
    raio.setAttribute("aria-hidden", "true");
    raio.style.left = centroX + "px";
    raio.style.top = inicioY + "px";
    raio.style.setProperty("--auvex-queda", (impactoY - inicioY) + "px");
    raio.innerHTML = "<span>⚡</span>";

    let impacto = document.createElement("div");
    impacto.className = "impacto-raio-auvex";
    impacto.setAttribute("aria-hidden", "true");
    impacto.style.left = centroX + "px";
    impacto.style.top = impactoY + "px";
    impacto.innerHTML = "<i></i><i></i><i></i><i></i>";

    document.body.appendChild(raio);
    document.body.appendChild(impacto);

    pacoteAlvo.classList.remove("auvex-impactada");
    void pacoteAlvo.offsetWidth;
    pacoteAlvo.classList.add("auvex-impactada");

    // A espada aparece no instante do impacto, ligando visualmente o raio ao +1 de dano.
    setTimeout(() => mostrarEfeitoAtaque(idAlvo), 330);

    setTimeout(() => {
        raio.remove();
        impacto.remove();
        if (pacoteAlvo.isConnected) pacoteAlvo.classList.remove("auvex-impactada");
    }, 1050);
}

function equiparSuporte(idAlvo) {
    if (!suportePreparado) return; 

    let pacoteAlvo = document.getElementById("pacote-" + idAlvo);
    if (!pacoteAlvo) return;
    
    let nomeAlvo = pacoteAlvo.querySelector(".nome-carta").innerText.trim();
    let danoElemento = document.getElementById("dano-" + idAlvo);
    let danoAtual = 0;
    if (danoElemento) danoAtual = parseFloat(danoElemento.innerText);

    // --- REGRA DO ESCUDO ---
    if (suportePreparado === 'Escudo') {
        let itemNaMaoEscudo = document.getElementById("pacote-" + idItemNaMao);
        if (!itemNaMaoEscudo) return;

        let quemJogouEscudo = itemNaMaoEscudo.parentElement ? itemNaMaoEscudo.parentElement.id : "";
        let alvoNoCampo1Escudo = pacoteAlvo.closest("#campo-j1") !== null;
        let alvoNoCampo2Escudo = pacoteAlvo.closest("#campo-j2") !== null;

        if ((quemJogouEscudo.includes("j1") && !alvoNoCampo1Escudo) || (quemJogouEscudo.includes("j2") && !alvoNoCampo2Escudo)) {
            return narrar("❌ Alvo inválido! O Escudo só pode ser usado em cartas ALIADAS.");
        }

        // Não pode em suporte/poção — só em tropas de verdade.
        let infoAlvoEscudo = bancoDeCartas
            .filter(c => idAlvo === c.id || idAlvo.startsWith(c.id + "_") || idAlvo.startsWith(c.id + "-"))
            .sort((a, b) => b.id.length - a.id.length)[0];
        if (infoAlvoEscudo && suportesReais.includes(infoAlvoEscudo.id)) {
            return narrar("❌ Alvo inválido! O Escudo só pode ser usado em tropas, não em suportes/poções.");
        }

        escudoGuerreiro[idAlvo] = true; // reaproveita o mesmo mecanismo de bloqueio do Guerreiro
        ativarVisualEscudo(idAlvo);

        itemNaMaoEscudo.remove();

        narrar(`🛡️ [${nomeAlvo}] recebeu um Escudo! Ela vai ignorar completamente o próximo ataque que sofrer.`);
        suportePreparado = null;
    }

    // --- REGRA DA BESTA ---
    if (suportePreparado === 'Besta') {
        let itemNaMaoBesta = document.getElementById("pacote-" + idItemNaMao);
        if (!itemNaMaoBesta) return;

        let quemJogouBesta = itemNaMaoBesta.parentElement ? itemNaMaoBesta.parentElement.id : "";
        let alvoNoCampo1Besta = pacoteAlvo.closest("#campo-j1") !== null;
        let alvoNoCampo2Besta = pacoteAlvo.closest("#campo-j2") !== null;

        if ((quemJogouBesta.includes("j1") && !alvoNoCampo1Besta) || (quemJogouBesta.includes("j2") && !alvoNoCampo2Besta)) {
            return narrar("❌ Alvo inválido! A Besta só pode ser equipada em cartas ALIADAS.");
        }

        let bonus = (nomeAlvo === 'Arqueiro') ? 2 : 1;
        if (danoElemento) danoElemento.innerText = danoAtual + bonus;
        
        itemNaMaoBesta.remove();

        // 🚨 EFEITO DE GANHO DE ATAQUE AQUI:
            mostrarEfeitoAtaque(idAlvo);
        
        narrar(`🏹 A Besta foi equipada em [${nomeAlvo}]! O dano base subiu para ${danoAtual + bonus}.`);
        suportePreparado = null;
    }

    // --- REGRA DA AUVEX ---
    if (suportePreparado === 'Auvex') {
        let itemNaMaoAuvex = document.getElementById("pacote-" + idItemNaMao);
        if (!itemNaMaoAuvex) return;

        let quemJogouAuvex = itemNaMaoAuvex.parentElement ? itemNaMaoAuvex.parentElement.id : "";
        let alvoNoCampo1Auvex = pacoteAlvo.closest("#campo-j1") !== null;
        let alvoNoCampo2Auvex = pacoteAlvo.closest("#campo-j2") !== null;

        if ((quemJogouAuvex.includes("j1") && !alvoNoCampo1Auvex) || (quemJogouAuvex.includes("j2") && !alvoNoCampo2Auvex)) {
            return narrar("❌ Alvo inválido! A Auvex só pode ser equipada em cartas ALIADAS.");
        }

        if (danoElemento) danoElemento.innerText = danoAtual + 1;

        itemNaMaoAuvex.remove();

        animarRaioAuvex(idAlvo);

        narrar(`⚡ Auvex equipada em [${nomeAlvo}]! O dano subiu pra ${danoAtual + 1}, de forma PERMANENTE.`);
        suportePreparado = null;
    }

    // --- REGRA DA VELUX ---
    if (suportePreparado === 'Velux') {
        let itemNaMaoVelux = document.getElementById("pacote-" + idItemNaMao);
        if (!itemNaMaoVelux) return;

        let quemJogouVelux = itemNaMaoVelux.parentElement ? itemNaMaoVelux.parentElement.id : "";
        let alvoNoCampo1Velux = pacoteAlvo.closest("#campo-j1") !== null;
        let alvoNoCampo2Velux = pacoteAlvo.closest("#campo-j2") !== null;

        if ((quemJogouVelux.includes("j1") && !alvoNoCampo1Velux) || (quemJogouVelux.includes("j2") && !alvoNoCampo2Velux)) {
            return narrar("❌ Alvo inválido! A poção Velux só pode ser usada em cartas ALIADAS.");
        }

        pocaoVeluxAtiva[idAlvo] = true;
        ativarEfeitoVelocidade(idAlvo);
        
        itemNaMaoVelux.remove();
        
        narrar(`⚡ Poção Velux derramada sobre [${nomeAlvo}]! Segundo ataque liberado imediatamente!`);
        suportePreparado = null;
    }

    // --- REGRA DA ADIV ---
    if (suportePreparado === 'Adiv') {
        let itemNaMaoAdiv = document.getElementById("pacote-" + idItemNaMao);
        if (!itemNaMaoAdiv) return;

        let quemJogouAdiv = itemNaMaoAdiv.parentElement ? itemNaMaoAdiv.parentElement.id : "";
        let alvoNoCampo1Adiv = pacoteAlvo.closest("#campo-j1") !== null;
        let alvoNoCampo2Adiv = pacoteAlvo.closest("#campo-j2") !== null;

        // Ofensiva: só pode mirar no lado OPOSTO de quem jogou a poção
        if ((quemJogouAdiv.includes("j1") && alvoNoCampo1Adiv) || (quemJogouAdiv.includes("j2") && alvoNoCampo2Adiv)) {
            return narrar("❌ Alvo inválido! A poção Adiv só pode ser usada em cartas INIMIGAS.");
        }

        itemNaMaoAdiv.remove();

        // 🚨 NOVO EFEITO AQUI: Coração partido caindo da carta alvo!
        mostrarEfeitoPerdaVida(idAlvo);
        
        narrar(`🧪 Splash! A poção Adiv foi atirada em [${nomeAlvo}], causando 1 de dano direto!`);
        
        let isInimigo = pacoteAlvo.closest("#campo-j2") !== null;
        aplicarDanoDireto("pacote-" + idAlvo, 1, isInimigo);
        suportePreparado = null;
    }

   // --- REGRA DA RECUPERIDA ---
    if (suportePreparado === 'Recuperida') {
        let itemNaMao = document.getElementById("pacote-" + idItemNaMao);
        if (!itemNaMao) return;
        
        let quemJogou = itemNaMao.parentElement ? itemNaMao.parentElement.id : "";
        let alvoNoCampo1 = pacoteAlvo.closest("#campo-j1") !== null;
        let alvoNoCampo2 = pacoteAlvo.closest("#campo-j2") !== null;
        
        if ((quemJogou.includes("j1") && !alvoNoCampo1) || (quemJogou.includes("j2") && !alvoNoCampo2)) {
            return narrar("❌ Alvo inválido! A poção Recuperida só pode ser usada em cartas ALIADAS.");
        }
        
        animarRecuperidaCaindo(idAlvo, () => {
            if (document.getElementById("pacote-" + idAlvo)) mostrarEfeitoVida(idAlvo, "ganhou");
        });
        itemNaMao.remove();
        
        let txtVida = document.getElementById("vida-" + idAlvo);
        if (txtVida) {
            let vidaAtual = parseFloat(txtVida.innerText);
            txtVida.innerText = vidaAtual + 1;
            
            narrar(`🧪 Glup glup! A poção Recuperida curou 1 de vida de [${nomeAlvo}]!`);
        }
        suportePreparado = null;
    }

    // --- REGRA DA PLUS LIFE ---
    if (suportePreparado === 'PlusLife') {
        let itemNaMaoPlusLife = document.getElementById("pacote-" + idItemNaMao);
        if (!itemNaMaoPlusLife) return;

        let quemJogouPlusLife = itemNaMaoPlusLife.parentElement ? itemNaMaoPlusLife.parentElement.id : "";
        let alvoNoCampo1PlusLife = pacoteAlvo.closest("#campo-j1") !== null;
        let alvoNoCampo2PlusLife = pacoteAlvo.closest("#campo-j2") !== null;

        if ((quemJogouPlusLife.includes("j1") && !alvoNoCampo1PlusLife) || (quemJogouPlusLife.includes("j2") && !alvoNoCampo2PlusLife)) {
            return narrar("❌ Alvo inválido! A Plus Life só pode ser usada em cartas ALIADAS.");
        }

        itemNaMaoPlusLife.remove();

        let txtVidaPlusLife = document.getElementById("vida-" + idAlvo);
        if (txtVidaPlusLife) {
            let vidaAtualPlusLife = parseFloat(txtVidaPlusLife.innerText);
            txtVidaPlusLife.innerText = vidaAtualPlusLife + 2;

            // 💚 PLUS LIFE: mostra exatamente os 2 corações correspondentes ao bônus de +2.
            mostrarEfeitoVida(idAlvo, "plus-life");

            narrar(`💚 Plus Life usada! [${nomeAlvo}] ganhou 2 de vida.`);
        }
        suportePreparado = null;
    }

    // --- REGRA DA TRAIÇÃO (PASSO 1: Escolher o Traidor) ---
    if (suportePreparado === 'Traicao') {
        let itemNaMao = document.getElementById("pacote-" + idItemNaMao);
        if (!itemNaMao) return;

        let quemJogou = itemNaMao.parentElement ? itemNaMao.parentElement.id : "";
        let alvoNoCampo1 = pacoteAlvo.closest("#campo-j1") !== null;
        let alvoNoCampo2 = pacoteAlvo.closest("#campo-j2") !== null;

        // Se a poção saiu da tua mão (j1), só podes atirar num inimigo (j2)
        if (quemJogou.includes("j1") && !alvoNoCampo2) {
            return narrar("❌ Alvo inválido! Deves atirar a Poção da Traição numa carta do INIMIGO.");
        }
        // Se a poção saiu da mão do oponente (j2), ele só pode atirar numa carta TUA (j1)
        if (quemJogou.includes("j2") && !alvoNoCampo1) {
            return narrar("❌ Alvo inválido! O Oponente deve atirar a Poção da Traição numa carta SUA.");
        }

        modoTraicao = true;
        idTraidor = idAlvo;
        
        narrar(`🗡️ [${nomeAlvo}] bebeu a Poção da Traição! Agora CLICA num parceiro dele para sofrer o ataque!`);
        animarPocaoTraicao(idItemNaMao, idAlvo);
        itemNaMao.remove();
        suportePreparado = null; // Limpa para evitar bugs no próximo clique
    }
}

function ativarSuporte(nomeOriginal, idItem) {
    suportePreparado = nomeOriginal;
    idItemNaMao = idItem;
    
    if (nomeOriginal === 'Besta') {
        narrar(`⚡ AÇÃO RÁPIDA: Besta engatilhada! Clique na IMAGEM de uma tropa na arena.`);
    } else if (nomeOriginal === 'Auvex') {
        narrar(`⚡ Auvex engatilhada! Clique na imagem de uma tropa ALIADA pra ela ganhar +1 de ataque PERMANENTE.`);
    } else if (nomeOriginal === 'Velux') {
        narrar(`✨ Poção Velux preparada! Pode ser usada a qualquer momento!`);
    } else if (nomeOriginal === 'Adiv') {
        narrar(`🧪 Splash! Poção Adiv engatilhada! Clique em QUALQUER carta na arena para tirar 1 de vida.`);
    } else if (nomeOriginal === 'Recuperida') {
        narrar(`🧪 MODO CURA: Poção Recuperida engatilhada! Clique na imagem de uma criatura ALIADA para curar 1 de vida.`);
    } else if (nomeOriginal === 'PlusLife') {
        narrar(`💚 Plus Life engatilhada! Clique na imagem de uma criatura ALIADA para ela ganhar 2 de vida.`);
    } else if (nomeOriginal === 'Traicao') {
        narrar(`🧪 Poção da Traição engatilhada! Clique em uma carta INIMIGA para ela se voltar contra o próprio time.`);
    } else if (nomeOriginal === 'Escudo') {
        narrar(`🛡️ Escudo preparado! Clique numa carta ALIADA que não seja suporte/poção — ela fica imune ao próximo ataque que sofrer.`);
    }
}

// 💀 REVIVERTA — em vez de clicar num alvo em campo (como as outras poções), abre o
// cemitério dos dois lados como miniaturas clicáveis. A carta escolhida (sua ou do
// oponente) volta com os atributos ORIGINAIS de fábrica, direto pra mão de quem usou.
function usarReviverta(idItem, ehAliado) {
    if (cemiterio.j1.length === 0 && cemiterio.j2.length === 0) {
        return narrar("💀 Ainda não há nenhuma carta morta pra reviver!");
    }
    revivertaPendente = { idItem, ehAliado };
    mostrarCemiterioReviverta(idItem, ehAliado);
}

function mostrarCemiterioReviverta(idItem, ehAliado) {
    let antigo = document.getElementById("overlay-cemiterio");
    if (antigo) antigo.remove();

    let overlay = document.createElement("div");
    overlay.id = "overlay-cemiterio";
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; padding:20px; box-sizing:border-box; overflow:auto; font-family:'Georgia', serif;";

    let titulo = document.createElement("h2");
    titulo.innerText = "💀 Reviverta — escolha uma carta pra trazer de volta";
    titulo.style.cssText = "color: var(--borda-ouro, #d4af37); text-align:center; margin:0;";
    overlay.appendChild(titulo);

    function criarColuna(rotulo, lado) {
        let col = document.createElement("div");
        col.style.cssText = "display:flex; flex-direction:column; align-items:center; gap:10px; width:100%; max-width:700px;";

        let h = document.createElement("h3");
        h.innerText = rotulo;
        h.style.cssText = "color: var(--borda-ouro, #d4af37); margin: 5px 0;";
        col.appendChild(h);

        let linha = document.createElement("div");
        linha.style.cssText = "display:flex; flex-wrap:wrap; gap:10px; justify-content:center; width:100%;";

        if (cemiterio[lado].length === 0) {
            let vazio = document.createElement("p");
            vazio.innerText = "Nenhuma carta morta aqui ainda.";
            vazio.style.cssText = "color:#ccc; font-style:italic;";
            linha.appendChild(vazio);
        } else {
            cemiterio[lado].forEach((carta, index) => {
                let mini = document.createElement("div");
                mini.style.cssText = "width:100px; background: var(--bg-carta, #f4eedb); border:3px solid var(--borda-carta, #8c6d4f); border-radius:8px; padding:6px; text-align:center; cursor:pointer;";
                mini.innerHTML = `
                    <div style="font-size:0.75rem; font-weight:bold; color:#2c2520; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${carta.nome}</div>
                    <img src="${carta.img}" style="width:100%; height:60px; object-fit:contain; border-radius:4px;">
                    <div style="font-size:0.75rem; color:#2c2520; margin-top:3px;">❤️${carta.vida} ⚔️${carta.dano}</div>
                `;
                mini.onclick = function () {
                    reviverCartaDoCemiterio(lado, index, idItem, ehAliado);
                };
                linha.appendChild(mini);
            });
        }

        col.appendChild(linha);
        return col;
    }

    overlay.appendChild(criarColuna("💀 Cemitério Aliado", ehAliado ? "j1" : "j2"));
    overlay.appendChild(criarColuna("💀 Cemitério Inimigo", ehAliado ? "j2" : "j1"));

    let btnCancelar = document.createElement("button");
    btnCancelar.innerText = "Cancelar";
    btnCancelar.onclick = function () { revivertaPendente = null; overlay.remove(); };
    overlay.appendChild(btnCancelar);

    document.body.appendChild(overlay);
}

// ✨ REVIVERTA — a carta nasce no lugar correto da mão, mas visualmente desce do céu.
// A animação usa a própria carta, então continua correta caso o bot a mova para o campo
// durante a chegada e nunca cria um segundo pacote que possa ser clicado ou atacado.
function animarChegadaReviverta(pacoteRevivido) {
    if (!pacoteRevivido) return;

    pacoteRevivido.classList.remove("carta-revivida-descendo");

    let luz = document.createElement("div");
    luz.className = "luz-chegada-reviverta";
    luz.setAttribute("aria-hidden", "true");
    luz.innerHTML = "<span></span><i></i><i></i><i></i><i></i><i></i><i></i>";
    pacoteRevivido.appendChild(luz);

    void pacoteRevivido.offsetWidth;
    pacoteRevivido.classList.add("carta-revivida-descendo");

    setTimeout(() => {
        if (luz.parentNode) luz.remove();
        if (pacoteRevivido.isConnected) pacoteRevivido.classList.remove("carta-revivida-descendo");
    }, 1450);
}

function reviverCartaDoCemiterio(lado, index, idItem, ehAliado) {
    let dadosCarta = cemiterio[lado][index];
    if (!dadosCarta) return;

    cemiterio[lado].splice(index, 1);

    let idMaoHTML = ehAliado ? "mao-j1" : "mao-j2";
    let funcaoJogar = ehAliado ? "jogarCarta" : "jogarCartaInimigo";
    let classeCss = ehAliado ? "carta-aliada" : "carta-inimiga-espera";

    // 🩹 CORREÇÃO: o ID precisa conter "inimigo" quando vai pra mão do oponente — é assim que
    // o resto do jogo (equiparSuporte, etc.) sabe de quem é a carta. Sem isso, suportes revividos
    // pro lado do bot davam "Ação inválida" na hora de usar.
    let idUnico = dadosCarta.id + (ehAliado ? "-revivida-" : "-inimigo-revivida-") + Math.floor(Math.random() * 100000);
    let novaCarta = { ...dadosCarta, idUnico: idUnico };

    let htmlDaCarta = criarHTMLCarta(novaCarta, funcaoJogar, classeCss, ehAliado);
    let divMao = document.getElementById(idMaoHTML);
    if (divMao) divMao.insertAdjacentHTML('beforeend', htmlDaCarta);

    let pacoteItem = document.getElementById("pacote-" + idItem);
    if (pacoteItem) pacoteItem.remove();

    let overlay = document.getElementById("overlay-cemiterio");
    if (overlay) overlay.remove();
    revivertaPendente = null;

    let pacoteRevivido = document.getElementById("pacote-" + idUnico);
    if (pacoteRevivido && dadosCarta.inimigoEspecial === "slime"
        && typeof window.rpgRegistrarSlimeRevivido === "function") {
        window.rpgRegistrarSlimeRevivido(idUnico, ehAliado);
    }
    if (pacoteRevivido && dadosCarta.inimigoEspecial === "zumbi"
        && typeof window.rpgRegistrarZumbi === "function") {
        window.rpgRegistrarZumbi(idUnico, ehAliado);
    }
    if (pacoteRevivido && dadosCarta.inimigoEspecial === "aicer"
        && typeof window.rpgRegistrarAicer === "function") {
        window.rpgRegistrarAicer(idUnico, ehAliado);
    }
    if (pacoteRevivido && dadosCarta.inimigoEspecial === "ecto"
        && typeof window.rpgRegistrarEcto === "function") {
        window.rpgRegistrarEcto(idUnico, ehAliado);
    }
    if (pacoteRevivido && dadosCarta.inimigoEspecial === "fraguer"
        && typeof window.rpgRegistrarFraguer === "function") {
        window.rpgRegistrarFraguer(idUnico, ehAliado, false);
    }
    if (pacoteRevivido && dadosCarta.inimigoEspecial === "spiritista"
        && typeof window.rpgRegistrarSpiritista === "function") {
        window.rpgRegistrarSpiritista(idUnico, ehAliado);
    }
    if (pacoteRevivido && dadosCarta.inimigoEspecial === "sete-negativo"
        && typeof window.rpgRegistrarSeteNegativo === "function") {
        window.rpgRegistrarSeteNegativo(idUnico, ehAliado);
    }
    if (pacoteRevivido) requestAnimationFrame(() => animarChegadaReviverta(pacoteRevivido));

    narrar(`✨ Reviverta! [${dadosCarta.nome}] voltou dos mortos com os atributos originais (❤️${dadosCarta.vida} ⚔️${dadosCarta.dano}) e foi para a mão ${ehAliado ? "aliada" : "do oponente"}.`);
}

// 🃏 CRACKER — mostra a Mão e o Campo do ADVERSÁRIO como miniaturas clicáveis. Rouba a carta
// escolhida direto pra sua própria mão: se veio do campo, reseta pros atributos originais de
// fábrica (ela "recomeça do zero" pra você); se veio da mão, mantém como estava.
function usarCracker(idItem, ehAliado) {
    let ladoOponente = ehAliado ? "j2" : "j1";
    let temAlvoMao = document.querySelectorAll(`#mao-${ladoOponente} div[id^='pacote-']`).length > 0;
    let temAlvoCampo = document.querySelectorAll(`#campo-${ladoOponente} div[id^='pacote-']`).length > 0;

    if (!temAlvoMao && !temAlvoCampo) {
        return narrar("🃏 O adversário não tem nenhuma carta na mão nem em campo pra roubar!");
    }

    crackerPendente = { idItem, ehAliado };
    mostrarRouboCracker(idItem, ehAliado);
}

function mostrarRouboCracker(idItem, ehAliado) {
    let antigo = document.getElementById("overlay-cracker");
    if (antigo) antigo.remove();

    let ladoOponente = ehAliado ? "j2" : "j1";

    let overlay = document.createElement("div");
    overlay.id = "overlay-cracker";
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; padding:20px; box-sizing:border-box; overflow:auto; font-family:'Georgia', serif;";

    let titulo = document.createElement("h2");
    titulo.innerText = "🃏 Cracker — escolha uma carta do adversário pra roubar";
    titulo.style.cssText = "color: var(--borda-ouro, #d4af37); text-align:center; margin:0;";
    overlay.appendChild(titulo);

    function extrairDadosCarta(pacote) {
        let idPuro = pacote.id.replace("pacote-", "");
        let nomeEl = pacote.querySelector(".nome-carta");
        let imgEl = pacote.querySelector("img");
        let vidaEl = document.getElementById("vida-" + idPuro);
        let danoEl = document.getElementById("dano-" + idPuro);
        return {
            nome: nomeEl ? nomeEl.innerText.trim() : "",
            img: imgEl ? imgEl.getAttribute("src") : "",
            vida: vidaEl ? vidaEl.innerText : "0",
            dano: danoEl ? danoEl.innerText : "0",
        };
    }

    function criarColuna(rotulo, seletor, origem) {
        let col = document.createElement("div");
        col.style.cssText = "display:flex; flex-direction:column; align-items:center; gap:10px; width:100%; max-width:700px;";

        let h = document.createElement("h3");
        h.innerText = rotulo;
        h.style.cssText = "color: var(--borda-ouro, #d4af37); margin: 5px 0;";
        col.appendChild(h);

        let linha = document.createElement("div");
        linha.style.cssText = "display:flex; flex-wrap:wrap; gap:10px; justify-content:center; width:100%;";

        let pacotes = Array.from(document.querySelectorAll(seletor));
        if (pacotes.length === 0) {
            let vazio = document.createElement("p");
            vazio.innerText = "Nenhuma carta aqui.";
            vazio.style.cssText = "color:#ccc; font-style:italic;";
            linha.appendChild(vazio);
        } else {
            pacotes.forEach(pacote => {
                let dados = extrairDadosCarta(pacote);
                let mini = document.createElement("div");
                mini.style.cssText = "width:100px; background: var(--bg-carta, #f4eedb); border:3px solid var(--borda-carta, #8c6d4f); border-radius:8px; padding:6px; text-align:center; cursor:pointer;";
                mini.innerHTML = `
                    <div style="font-size:0.75rem; font-weight:bold; color:#2c2520; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${dados.nome}</div>
                    <img src="${dados.img}" style="width:100%; height:60px; object-fit:contain; border-radius:4px;">
                    <div style="font-size:0.75rem; color:#2c2520; margin-top:3px;">❤️${dados.vida} ⚔️${dados.dano}</div>
                `;
                mini.onclick = function () {
                    roubarCartaCracker(pacote.id, origem, idItem, ehAliado);
                };
                linha.appendChild(mini);
            });
        }

        col.appendChild(linha);
        return col;
    }

    overlay.appendChild(criarColuna("✋ Mão do Adversário", `#mao-${ladoOponente} div[id^='pacote-']`, "mao"));
    overlay.appendChild(criarColuna("⚔️ Campo do Adversário", `#campo-${ladoOponente} div[id^='pacote-']`, "campo"));

    let btnCancelar = document.createElement("button");
    btnCancelar.innerText = "Cancelar";
    btnCancelar.onclick = function () { crackerPendente = null; overlay.remove(); };
    overlay.appendChild(btnCancelar);

    document.body.appendChild(overlay);
}

// 🦠 CRACKER — cria uma cópia apenas visual no lugar exato da carta infectada.
// O pacote verdadeiro pode ser removido imediatamente sem interromper o vírus ou o teleporte.
function prepararInfeccaoCracker(pacoteOriginal) {
    if (!pacoteOriginal) return null;

    let rect = pacoteOriginal.getBoundingClientRect();
    let eco = pacoteOriginal.cloneNode(true);
    eco.removeAttribute("id");
    eco.querySelectorAll("[id]").forEach(elemento => elemento.removeAttribute("id"));
    eco.querySelectorAll("button").forEach(botao => botao.remove());
    eco.querySelectorAll("[onclick]").forEach(elemento => elemento.removeAttribute("onclick"));
    eco.className = pacoteOriginal.className + " eco-carta-infectada-cracker";
    eco.style.left = rect.left + "px";
    eco.style.top = rect.top + "px";
    eco.style.width = rect.width + "px";
    eco.style.height = rect.height + "px";

    let virus = document.createElement("div");
    virus.className = "virus-visual-cracker";
    virus.setAttribute("aria-hidden", "true");
    virus.innerHTML = "<b>☣</b><span>0 1 0 1</span><i></i><i></i><i></i><i></i><i></i><i></i>";
    eco.appendChild(virus);
    document.body.appendChild(eco);

    return { eco, rect };
}

function animarTeleporteCracker(dadosOrigem, pacoteRoubado) {
    if (!dadosOrigem || !dadosOrigem.eco || !pacoteRoubado) {
        if (pacoteRoubado) pacoteRoubado.classList.remove("cracker-destino-oculto");
        return;
    }

    let eco = dadosOrigem.eco;
    let origem = dadosOrigem.rect;
    let destino = pacoteRoubado.getBoundingClientRect();
    let origemX = origem.left + origem.width / 2;
    let origemY = origem.top + origem.height / 2;
    let destinoX = destino.left + destino.width / 2;
    let destinoY = destino.top + destino.height / 2;

    eco.style.setProperty("--cracker-teleporte-x", (destinoX - origemX) + "px");
    eco.style.setProperty("--cracker-teleporte-y", (destinoY - origemY) + "px");
    eco.style.setProperty("--cracker-escala-x", (destino.width / Math.max(origem.width, 1)));
    eco.style.setProperty("--cracker-escala-y", (destino.height / Math.max(origem.height, 1)));
    eco.classList.add("cracker-teleportando");

    setTimeout(() => {
        eco.remove();
        if (!pacoteRoubado.isConnected) return;

        pacoteRoubado.classList.remove("cracker-destino-oculto");
        pacoteRoubado.classList.add("carta-reaparecendo-cracker");

        let virusDestino = document.createElement("div");
        virusDestino.className = "virus-visual-cracker virus-cracker-no-destino";
        virusDestino.setAttribute("aria-hidden", "true");
        virusDestino.innerHTML = "<b>☣</b><span>0 1</span><i></i><i></i><i></i><i></i>";
        pacoteRoubado.appendChild(virusDestino);

        setTimeout(() => {
            if (virusDestino.parentNode) virusDestino.remove();
            if (pacoteRoubado.isConnected) pacoteRoubado.classList.remove("carta-reaparecendo-cracker");
        }, 920);
    }, 1050);
}

// Quando o Cracker escolhe um Slime, captura todos os integrantes ainda vivos
// daquela família. Eles preservam vida, dano e estágio atuais e continuam ligados:
// a próxima divisão só nasce depois que todos os sobreviventes capturados morrerem.
function roubarFamiliaSlimeCracker(idPacoteDomOriginal, idItem, ehAliado) {
    let idPuroEscolhido = idPacoteDomOriginal.replace("pacote-", "");
    if (typeof window.rpgPrepararRouboFamiliaSlime !== "function") return false;

    let transferencia = window.rpgPrepararRouboFamiliaSlime(idPuroEscolhido);
    if (!transferencia || !transferencia.membros || transferencia.membros.length === 0) return false;

    let membros = transferencia.membros.map(idAntigo => {
        let pacote = document.getElementById("pacote-" + idAntigo);
        if (!pacote) return null;
        let nomeEl = pacote.querySelector(".nome-carta");
        let imgEl = pacote.querySelector("img");
        let vidaEl = document.getElementById("vida-" + idAntigo);
        let danoEl = document.getElementById("dano-" + idAntigo);
        return {
            idAntigo,
            pacote,
            nome: nomeEl ? nomeEl.innerText.trim() : "Slime",
            img: imgEl ? imgEl.getAttribute("src") : "slime-provisorio.svg",
            vida: vidaEl ? vidaEl.innerText : "1",
            dano: danoEl ? danoEl.innerText : "1",
            animacao: prepararInfeccaoCracker(pacote)
        };
    }).filter(Boolean);

    if (membros.length === 0) return false;

    membros.forEach(membro => membro.pacote.remove());

    let idMaoHTML = ehAliado ? "mao-j1" : "mao-j2";
    let funcaoJogar = ehAliado ? "jogarCarta" : "jogarCartaInimigo";
    let classeCss = ehAliado ? "carta-aliada" : "carta-inimiga-espera";
    let divMao = document.getElementById(idMaoHTML);
    let novosIds = [];

    membros.forEach((membro, indice) => {
        let idUnico = "slime-roubado-" + Date.now() + "-" + indice + "-" + Math.floor(Math.random() * 10000);
        let novaCarta = {
            id: "slime",
            idUnico,
            nome: membro.nome,
            img: membro.img,
            vida: membro.vida,
            dano: membro.dano
        };
        if (divMao) divMao.insertAdjacentHTML("beforeend", criarHTMLCarta(novaCarta, funcaoJogar, classeCss, ehAliado));
        let pacoteRoubado = document.getElementById("pacote-" + idUnico);
        if (pacoteRoubado) {
            pacoteRoubado.classList.add("cracker-destino-oculto");
            novosIds.push(idUnico);
            requestAnimationFrame(() => animarTeleporteCracker(membro.animacao, pacoteRoubado));
        }
    });

    if (typeof window.rpgRegistrarFamiliaSlimeRoubada === "function") {
        window.rpgRegistrarFamiliaSlimeRoubada(novosIds, ehAliado, transferencia.estagio);
    }

    let pacoteItem = document.getElementById("pacote-" + idItem);
    if (pacoteItem) pacoteItem.remove();
    let overlay = document.getElementById("overlay-cracker");
    if (overlay) overlay.remove();
    crackerPendente = null;

    narrar(`🦠 Cracker capturou a família Slime inteira! ${novosIds.length} ${novosIds.length === 1 ? "integrante foi roubado" : "integrantes foram roubados"} e mantiveram o estágio atual.`);
    return true;
}

function roubarCartaCracker(idPacoteDomOriginal, origem, idItem, ehAliado) {
    let pacoteOriginal = document.getElementById(idPacoteDomOriginal);
    if (!pacoteOriginal) return;

    if (pacoteOriginal.dataset.inimigoEspecial === "slime"
        && roubarFamiliaSlimeCracker(idPacoteDomOriginal, idItem, ehAliado)) {
        return;
    }

    let idPuro = idPacoteDomOriginal.replace("pacote-", "");
    // As cartas inimigas especiais precisam levar sua passiva junto com o
    // roubo. O Slime usa o fluxo de família acima; aqui preservamos os dados
    // necessários para religar o Esqueleto depois que o Cracker trocar seu ID.
    let familiaEsqueletoRoubado = pacoteOriginal.dataset.inimigoEspecial === "esqueleto"
        ? pacoteOriginal.dataset.esqueletoFamilia
        : null;
    let roubouZumbi = pacoteOriginal.dataset.inimigoEspecial === "zumbi";
    let roubouAicer = pacoteOriginal.dataset.inimigoEspecial === "aicer";
    let roubouEcto = pacoteOriginal.dataset.inimigoEspecial === "ecto";
    let roubouFraguer = pacoteOriginal.dataset.inimigoEspecial === "fraguer";
    let roubouFraguerFundido = pacoteOriginal.dataset.inimigoEspecial === "fraguer-fundido";
    let roubouSpiritista = pacoteOriginal.dataset.inimigoEspecial === "spiritista";
    let roubouSeteNegativo = pacoteOriginal.dataset.inimigoEspecial === "sete-negativo";
    let idOriginalEsqueleto = pacoteOriginal.dataset.esqueletoId || idPuro;
    let nomeCarta = pacoteOriginal.querySelector(".nome-carta").innerText.trim();
    let vidaAtual = document.getElementById("vida-" + idPuro) ? document.getElementById("vida-" + idPuro).innerText : "0";
    let danoAtual = document.getElementById("dano-" + idPuro) ? document.getElementById("dano-" + idPuro).innerText : "0";
    let imgAtual = pacoteOriginal.querySelector("img") ? pacoteOriginal.querySelector("img").getAttribute("src") : "";

    let base = bancoDeCartas.find(c => c.nome === nomeCarta);

    let dadosNovaCarta;
    if (origem === "campo" && (base || roubouZumbi || roubouAicer || roubouEcto || roubouFraguer || roubouFraguerFundido || roubouSpiritista || roubouSeteNegativo)) {
        // 🃏 Roubada do CAMPO — reseta pros atributos originais de fábrica.
        dadosNovaCarta = roubouZumbi
            ? { id: "zumbi", nome: "Zumbi", img: "zumbi-provisorio.svg", vida: 4, dano: 2 }
            : roubouAicer
                ? { id: "aicer", nome: "Aicer", img: "aicer-provisorio.svg", vida: 3, dano: 1 }
                : roubouEcto
                    ? { id: "ecto", nome: "Ecto", img: "ecto-provisorio.svg", vida: 2, dano: 3 }
                    : roubouFraguer
                        ? { id: "fraguer", nome: "Fraguer", img: "fraguer-provisorio.svg", vida: 4, dano: 1 }
                        : roubouFraguerFundido
                            ? { id: "fraguer-fundido", nome: "Fraguer Fundido", img: "fraguer-fundido-provisorio.svg", vida: 2, dano: 8 }
                            : roubouSpiritista
                                ? { id: "spiritista", nome: "Spiritista", img: "spiritista-provisorio.svg", vida: 10, dano: 1 }
                                : roubouSeteNegativo
                                    ? { id: "sete-negativo", nome: "7 Negativo", img: "sete-negativo-provisorio.svg", vida: 5, dano: 0 }
                                    : { id: base.id, nome: base.nome, img: base.img, vida: base.vida, dano: base.dano };
    } else {
        // ✋ Roubada da MÃO — mantém como estava.
        dadosNovaCarta = { id: base ? base.id : idPuro, nome: nomeCarta, img: imgAtual, vida: vidaAtual, dano: danoAtual };
    }

    let dadosAnimacaoCracker = prepararInfeccaoCracker(pacoteOriginal);
    pacoteOriginal.remove();

    let idMaoHTML = ehAliado ? "mao-j1" : "mao-j2";
    let funcaoJogar = ehAliado ? "jogarCarta" : "jogarCartaInimigo";
    let classeCss = ehAliado ? "carta-aliada" : "carta-inimiga-espera";

    // 🩹 CORREÇÃO: mesma marcação de lado no ID (ver comentário na Reviverta).
    let idUnico = dadosNovaCarta.id + (ehAliado ? "-roubada-" : "-inimigo-roubada-") + Math.floor(Math.random() * 100000);
    let novaCarta = { ...dadosNovaCarta, idUnico: idUnico };

    let htmlDaCarta = criarHTMLCarta(novaCarta, funcaoJogar, classeCss, ehAliado);
    let divMao = document.getElementById(idMaoHTML);
    if (divMao) divMao.insertAdjacentHTML('beforeend', htmlDaCarta);

    let pacoteRoubado = document.getElementById("pacote-" + idUnico);
    if (pacoteRoubado) pacoteRoubado.classList.add("cracker-destino-oculto");

    if (pacoteRoubado && familiaEsqueletoRoubado !== null
        && typeof window.rpgRestaurarEsqueletoRoubado === "function") {
        window.rpgRestaurarEsqueletoRoubado(
            idUnico,
            ehAliado,
            familiaEsqueletoRoubado,
            idOriginalEsqueleto
        );
    }
    if (pacoteRoubado && roubouZumbi && typeof window.rpgRegistrarZumbi === "function") {
        window.rpgRegistrarZumbi(idUnico, ehAliado);
    }
    if (pacoteRoubado && roubouAicer && typeof window.rpgRegistrarAicer === "function") {
        window.rpgRegistrarAicer(idUnico, ehAliado);
    }
    if (pacoteRoubado && roubouEcto && typeof window.rpgRegistrarEcto === "function") {
        window.rpgRegistrarEcto(idUnico, ehAliado);
    }
    if (pacoteRoubado && (roubouFraguer || roubouFraguerFundido)
        && typeof window.rpgRegistrarFraguer === "function") {
        window.rpgRegistrarFraguer(idUnico, ehAliado, roubouFraguerFundido);
    }
    if (pacoteRoubado && roubouSpiritista && typeof window.rpgRegistrarSpiritista === "function") {
        window.rpgRegistrarSpiritista(idUnico, ehAliado);
    }
    if (pacoteRoubado && roubouSeteNegativo && typeof window.rpgRegistrarSeteNegativo === "function") {
        window.rpgRegistrarSeteNegativo(idUnico, ehAliado);
    }

    let pacoteItem = document.getElementById("pacote-" + idItem);
    if (pacoteItem) pacoteItem.remove();

    let overlay = document.getElementById("overlay-cracker");
    if (overlay) overlay.remove();
    crackerPendente = null;

    if (pacoteRoubado) requestAnimationFrame(() => animarTeleporteCracker(dadosAnimacaoCracker, pacoteRoubado));

    narrar(`🃏 Cracker! [${nomeCarta}] foi roubado(a) do ${origem === "campo" ? "campo" : "mão"} do adversário${origem === "campo" ? ", voltando com os atributos originais," : ""} e foi pra mão ${ehAliado ? "aliada" : "do oponente"}!`);

    // 🤖 Se o jogador roubou a única carta que o bot tinha em campo, ele ficaria sem
    // alvo para atacar durante o próprio turno. O bot pode reagir colocando UMA tropa da mão,
    // sem ganhar um turno completo nem atacar fora de hora. No modo PvP local esta função
    // não existe, portanto o segundo jogador continua totalmente manual.
    if (ehAliado && origem === "campo") {
        let campoDoBot = document.getElementById("campo-j2");
        let campoFicouVazio = campoDoBot && campoDoBot.querySelectorAll("div[id^='pacote-']").length === 0;
        if (campoFicouVazio && typeof window.botReporCampoAposCracker === "function") {
            setTimeout(() => window.botReporCampoAposCracker(), 500);
        }
    }
}

// 💥 ALLSFORMS — dá +3 de dano pra TODAS as tropas do próprio time já em campo (suportes/poções
// que estejam ali, tipo Cavalo de Tróia/Fogueira, não contam), durando 1 rodada (2 passagens de
// turno). Não precisa escolher alvo, então é resolvido na hora — sem tela nem clique nenhum.
function usarAllsforms(idItem, ehAliado) {
    let ladoProprio = ehAliado ? "j1" : "j2";
    let campoProprio = document.getElementById("campo-" + ladoProprio);
    let classeCss = ehAliado ? "carta-aliada" : "carta-inimiga";

    let tropas = campoProprio ? Array.from(campoProprio.getElementsByClassName(classeCss)).filter(pacote => {
        let idPuro = pacote.id.replace("pacote-", "");
        let infoCarta = bancoDeCartas
            .filter(c => idPuro === c.id || idPuro.startsWith(c.id + "_") || idPuro.startsWith(c.id + "-"))
            .sort((a, b) => b.id.length - a.id.length)[0];
        let ehSuporte = infoCarta && suportesReais.includes(infoCarta.id);
        return !ehSuporte;
    }) : [];

    if (tropas.length === 0) {
        return narrar("💥 Allsforms não encontrou nenhuma tropa em campo pra buffar!");
    }

    tropas.forEach(pacote => {
        let idPuro = pacote.id.replace("pacote-", "");
        let txtDano = document.getElementById("dano-" + idPuro);
        if (!txtDano) return;
        let danoAtual = parseFloat(txtDano.innerText) || 0;
        txtDano.innerText = danoAtual + 3;

        if (!buffsAllsforms[idPuro]) buffsAllsforms[idPuro] = [];
        buffsAllsforms[idPuro].push({ bonus: 3, restam: 2 }); // 1 rodada = 2 passagens de turno

        // ⚔️ ALLSFORMS: três espadas, uma para cada ponto do bônus de +3.
        // As posições são fixas para os ícones não nascerem em cima uns dos outros.
        [60, 72, 84].forEach((posicaoX, indice) => {
            setTimeout(() => mostrarEfeitoAtaque(idPuro, posicaoX), indice * 120);
        });
    });

    let pacoteItem = document.getElementById("pacote-" + idItem);
    if (pacoteItem) pacoteItem.remove();

    narrar(`💥 Allsforms! Todas as tropas ${ehAliado ? "aliadas" : "do oponente"} em campo ganharam +3 de dano por 1 rodada!`);
}

// 🪞 DUPLIQUETION — cria uma CÓPIA de uma carta ESCOLHIDA PELO PRÓPRIO DONO (mão ou campo,
// nunca do adversário), com metade da vida e do dano atuais (mantém fração, ex: 3 vira 1.5).
// A carta original continua no lugar, intacta — só nasce uma cópia nova na sua mão.
// 🧪 Diz se um pacote em tela (mão ou campo) é um suporte/poção (Besta, Escudo, Vampi7 etc.)
// em vez de uma tropa de verdade — usado pra filtrar quem pode ser alvo de coisas como
// Allsforms e Dupliquetion.
function ehPacoteSuporte(pacote) {
    let idPuro = pacote.id.replace("pacote-", "");
    let infoCarta = bancoDeCartas
        .filter(c => idPuro === c.id || idPuro.startsWith(c.id + "_") || idPuro.startsWith(c.id + "-"))
        .sort((a, b) => b.id.length - a.id.length)[0];
    return !!(infoCarta && suportesReais.includes(infoCarta.id));
}

function usarDupliquetion(idItem, ehAliado) {
    let ladoProprio = ehAliado ? "j1" : "j2";
    let temAlvoMao = Array.from(document.querySelectorAll(`#mao-${ladoProprio} div[id^='pacote-']`))
        .filter(p => p.id !== "pacote-" + idItem && !ehPacoteSuporte(p)).length > 0;
    let temAlvoCampo = Array.from(document.querySelectorAll(`#campo-${ladoProprio} div[id^='pacote-']`))
        .filter(p => !ehPacoteSuporte(p)).length > 0;

    if (!temAlvoMao && !temAlvoCampo) {
        return narrar("🪞 Você ainda não tem nenhuma TROPA pra copiar (suportes/poções não podem ser copiados)!");
    }

    dupliquetionPendente = { idItem, ehAliado };
    mostrarDupliquetion(idItem, ehAliado);
}

function mostrarDupliquetion(idItem, ehAliado) {
    let antigo = document.getElementById("overlay-dupliquetion");
    if (antigo) antigo.remove();

    let ladoProprio = ehAliado ? "j1" : "j2";

    let overlay = document.createElement("div");
    overlay.id = "overlay-dupliquetion";
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; padding:20px; box-sizing:border-box; overflow:auto; font-family:'Georgia', serif;";

    let titulo = document.createElement("h2");
    titulo.innerText = "🪞 Dupliquetion — escolha uma carta SUA pra copiar";
    titulo.style.cssText = "color: var(--borda-ouro, #d4af37); text-align:center; margin:0;";
    overlay.appendChild(titulo);

    function extrairDadosCarta(pacote) {
        let idPuro = pacote.id.replace("pacote-", "");
        let nomeEl = pacote.querySelector(".nome-carta");
        let imgEl = pacote.querySelector("img");
        let vidaEl = document.getElementById("vida-" + idPuro);
        let danoEl = document.getElementById("dano-" + idPuro);
        return {
            nome: nomeEl ? nomeEl.innerText.trim() : "",
            img: imgEl ? imgEl.getAttribute("src") : "",
            vida: vidaEl ? vidaEl.innerText : "0",
            dano: danoEl ? danoEl.innerText : "0",
        };
    }

    function criarColuna(rotulo, pacotes) {
        let col = document.createElement("div");
        col.style.cssText = "display:flex; flex-direction:column; align-items:center; gap:10px; width:100%; max-width:700px;";

        let h = document.createElement("h3");
        h.innerText = rotulo;
        h.style.cssText = "color: var(--borda-ouro, #d4af37); margin: 5px 0;";
        col.appendChild(h);

        let linha = document.createElement("div");
        linha.style.cssText = "display:flex; flex-wrap:wrap; gap:10px; justify-content:center; width:100%;";

        if (pacotes.length === 0) {
            let vazio = document.createElement("p");
            vazio.innerText = "Nenhuma carta aqui.";
            vazio.style.cssText = "color:#ccc; font-style:italic;";
            linha.appendChild(vazio);
        } else {
            pacotes.forEach(pacote => {
                let dados = extrairDadosCarta(pacote);
                let mini = document.createElement("div");
                mini.style.cssText = "width:100px; background: var(--bg-carta, #f4eedb); border:3px solid var(--borda-carta, #8c6d4f); border-radius:8px; padding:6px; text-align:center; cursor:pointer;";
                mini.innerHTML = `
                    <div style="font-size:0.75rem; font-weight:bold; color:#2c2520; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${dados.nome}</div>
                    <img src="${dados.img}" style="width:100%; height:60px; object-fit:contain; border-radius:4px;">
                    <div style="font-size:0.75rem; color:#2c2520; margin-top:3px;">❤️${dados.vida} ⚔️${dados.dano}</div>
                `;
                mini.onclick = function () {
                    copiarCartaDupliquetion(pacote.id, idItem, ehAliado);
                };
                linha.appendChild(mini);
            });
        }

        col.appendChild(linha);
        return col;
    }

    let pacotesMao = Array.from(document.querySelectorAll(`#mao-${ladoProprio} div[id^='pacote-']`))
        .filter(p => p.id !== "pacote-" + idItem && !ehPacoteSuporte(p));
    let pacotesCampo = Array.from(document.querySelectorAll(`#campo-${ladoProprio} div[id^='pacote-']`))
        .filter(p => !ehPacoteSuporte(p));

    overlay.appendChild(criarColuna("✋ Sua Mão", pacotesMao));
    overlay.appendChild(criarColuna("⚔️ Seu Campo", pacotesCampo));

    let btnCancelar = document.createElement("button");
    btnCancelar.innerText = "Cancelar";
    btnCancelar.onclick = function () { dupliquetionPendente = null; overlay.remove(); };
    overlay.appendChild(btnCancelar);

    document.body.appendChild(overlay);
}

// 🪞 DUPLIQUETION — guarda uma silhueta visual da carta antes de a nova cópia alterar
// o espaço da mão. IDs, botões e cliques são retirados para o eco nunca interferir no jogo.
function prepararEcoDupliquetion(pacoteOriginal) {
    if (!pacoteOriginal) return null;

    let rect = pacoteOriginal.getBoundingClientRect();
    let eco = pacoteOriginal.cloneNode(true);
    eco.removeAttribute("id");
    eco.querySelectorAll("[id]").forEach(elemento => elemento.removeAttribute("id"));
    eco.querySelectorAll("button").forEach(botao => botao.remove());
    eco.querySelectorAll("[onclick]").forEach(elemento => elemento.removeAttribute("onclick"));
    eco.className = pacoteOriginal.className + " eco-magico-dupliquetion";
    eco.style.left = rect.left + "px";
    eco.style.top = rect.top + "px";
    eco.style.width = rect.width + "px";
    eco.style.height = rect.height + "px";

    let magia = document.createElement("div");
    magia.className = "magia-dupliquetion";
    magia.setAttribute("aria-hidden", "true");
    magia.innerHTML = "<b>✦</b><i></i><i></i><i></i><i></i>";
    eco.appendChild(magia);
    document.body.appendChild(eco);

    return { eco, rect };
}

function animarCopiaDupliquetion(dadosEco, pacoteCopia) {
    if (!dadosEco || !dadosEco.eco || !pacoteCopia) {
        if (pacoteCopia) pacoteCopia.classList.remove("dupliquetion-destino-oculto");
        return;
    }

    let eco = dadosEco.eco;
    let origem = dadosEco.rect;
    let destino = pacoteCopia.getBoundingClientRect();
    let origemX = origem.left + origem.width / 2;
    let origemY = origem.top + origem.height / 2;
    let destinoX = destino.left + destino.width / 2;
    let destinoY = destino.top + destino.height / 2;

    pacoteCopia.classList.add("dupliquetion-destino-oculto");
    eco.style.setProperty("--dupliquetion-x", (destinoX - origemX) + "px");
    eco.style.setProperty("--dupliquetion-y", (destinoY - origemY) + "px");
    eco.style.setProperty("--dupliquetion-escala-x", destino.width / Math.max(origem.width, 1));
    eco.style.setProperty("--dupliquetion-escala-y", destino.height / Math.max(origem.height, 1));

    requestAnimationFrame(() => eco.classList.add("dupliquetion-viajando"));

    setTimeout(() => {
        eco.remove();
        if (!pacoteCopia.isConnected) return;

        pacoteCopia.classList.remove("dupliquetion-destino-oculto");
        pacoteCopia.classList.add("carta-materializando-dupliquetion");

        let brilho = document.createElement("div");
        brilho.className = "brilho-chegada-dupliquetion";
        brilho.setAttribute("aria-hidden", "true");
        brilho.innerHTML = "<b>✦</b><i></i><i></i><i></i><i></i>";
        pacoteCopia.appendChild(brilho);

        setTimeout(() => {
            if (brilho.parentNode) brilho.remove();
            if (pacoteCopia.isConnected) pacoteCopia.classList.remove("carta-materializando-dupliquetion");
        }, 880);
    }, 940);
}

function copiarCartaDupliquetion(idPacoteOriginal, idItem, ehAliado) {
    let pacoteOriginal = document.getElementById(idPacoteOriginal);
    if (!pacoteOriginal) return;

    let dadosAnimacaoDupliquetion = prepararEcoDupliquetion(pacoteOriginal);

    let idPuro = idPacoteOriginal.replace("pacote-", "");
    let nomeCarta = pacoteOriginal.querySelector(".nome-carta").innerText.trim();
    let vidaAtual = parseFloat(document.getElementById("vida-" + idPuro) ? document.getElementById("vida-" + idPuro).innerText : 0) || 0;
    let danoAtual = parseFloat(document.getElementById("dano-" + idPuro) ? document.getElementById("dano-" + idPuro).innerText : 0) || 0;
    let imgAtual = pacoteOriginal.querySelector("img") ? pacoteOriginal.querySelector("img").getAttribute("src") : "";

    let base = bancoDeCartas.find(c => c.nome === nomeCarta);
    let idBase = base ? base.id
        : pacoteOriginal.dataset.inimigoEspecial === "zumbi" ? "zumbi"
            : pacoteOriginal.dataset.inimigoEspecial === "aicer" ? "aicer"
                : pacoteOriginal.dataset.inimigoEspecial === "ecto" ? "ecto"
                    : pacoteOriginal.dataset.inimigoEspecial === "fraguer" ? "fraguer"
                        : pacoteOriginal.dataset.inimigoEspecial === "fraguer-fundido" ? "fraguer-fundido"
                            : pacoteOriginal.dataset.inimigoEspecial === "spiritista" ? "spiritista"
                                : pacoteOriginal.dataset.inimigoEspecial === "sete-negativo" ? "sete-negativo"
                                    : idPuro;

    let vidaCopia = vidaAtual / 2;
    let danoCopia = danoAtual / 2;

    let idMaoHTML = ehAliado ? "mao-j1" : "mao-j2";
    let funcaoJogar = ehAliado ? "jogarCarta" : "jogarCartaInimigo";
    let classeCss = ehAliado ? "carta-aliada" : "carta-inimiga-espera";

    // 🩹 CORREÇÃO: mesma marcação de lado no ID (ver comentário na Reviverta).
    let idUnico = idBase + (ehAliado ? "-copia-" : "-inimigo-copia-") + Math.floor(Math.random() * 100000);
    let novaCarta = { id: idBase, nome: nomeCarta, img: imgAtual, vida: vidaCopia, dano: danoCopia, idUnico: idUnico };

    let htmlDaCarta = criarHTMLCarta(novaCarta, funcaoJogar, classeCss, ehAliado);
    let divMao = document.getElementById(idMaoHTML);
    if (divMao) divMao.insertAdjacentHTML('beforeend', htmlDaCarta);

    let pacoteCopia = document.getElementById("pacote-" + idUnico);
    let copiouSlime = pacoteOriginal.dataset.inimigoEspecial === "slime";
    if (pacoteCopia && copiouSlime && typeof window.rpgRegistrarCopiaSlime === "function") {
        window.rpgRegistrarCopiaSlime(idUnico, ehAliado, idPuro);
    }
    let copiouZumbi = pacoteOriginal.dataset.inimigoEspecial === "zumbi";
    if (pacoteCopia && copiouZumbi && typeof window.rpgRegistrarZumbi === "function") {
        window.rpgRegistrarZumbi(idUnico, ehAliado);
    }
    let copiouAicer = pacoteOriginal.dataset.inimigoEspecial === "aicer";
    if (pacoteCopia && copiouAicer && typeof window.rpgRegistrarAicer === "function") {
        window.rpgRegistrarAicer(idUnico, ehAliado);
    }
    let copiouEcto = pacoteOriginal.dataset.inimigoEspecial === "ecto";
    if (pacoteCopia && copiouEcto && typeof window.rpgRegistrarEcto === "function") {
        window.rpgRegistrarEcto(idUnico, ehAliado);
    }
    let copiouFraguer = pacoteOriginal.dataset.inimigoEspecial === "fraguer";
    let copiouFraguerFundido = pacoteOriginal.dataset.inimigoEspecial === "fraguer-fundido";
    if (pacoteCopia && (copiouFraguer || copiouFraguerFundido)
        && typeof window.rpgRegistrarFraguer === "function") {
        window.rpgRegistrarFraguer(idUnico, ehAliado, copiouFraguerFundido);
    }
    let copiouSpiritista = pacoteOriginal.dataset.inimigoEspecial === "spiritista";
    if (pacoteCopia && copiouSpiritista && typeof window.rpgRegistrarSpiritista === "function") {
        window.rpgRegistrarSpiritista(idUnico, ehAliado);
    }
    let copiouSeteNegativo = pacoteOriginal.dataset.inimigoEspecial === "sete-negativo";
    if (pacoteCopia && copiouSeteNegativo && typeof window.rpgRegistrarSeteNegativo === "function") {
        window.rpgRegistrarSeteNegativo(idUnico, ehAliado);
    }
    if (pacoteCopia) pacoteCopia.classList.add("dupliquetion-destino-oculto");

    let pacoteItem = document.getElementById("pacote-" + idItem);
    if (pacoteItem) pacoteItem.remove();

    let overlay = document.getElementById("overlay-dupliquetion");
    if (overlay) overlay.remove();
    dupliquetionPendente = null;

    if (pacoteCopia) requestAnimationFrame(() => animarCopiaDupliquetion(dadosAnimacaoDupliquetion, pacoteCopia));
    else if (dadosAnimacaoDupliquetion && dadosAnimacaoDupliquetion.eco) dadosAnimacaoDupliquetion.eco.remove();

    narrar(copiouSlime
        ? `🪞 Dupliquetion! O Slime foi clonado com metade dos atributos (❤️${vidaCopia} ⚔️${danoCopia}) e a cópia iniciou uma família independente na mão ${ehAliado ? "aliada" : "do oponente"}!`
        : `🪞 Dupliquetion! Uma cópia de [${nomeCarta}] nasceu com metade da vida e do dano (❤️${vidaCopia} ⚔️${danoCopia}) na mão ${ehAliado ? "aliada" : "do oponente"}!`);
}
function executarTraicao(idAlvoPacote) {
    let pacoteTraidor = document.getElementById("pacote-" + idTraidor);
    let pacoteVitima = document.getElementById(idAlvoPacote);
    
    if (!pacoteTraidor || !pacoteVitima) {
        modoTraicao = false;
        idTraidor = null;
        return;
    }
    
    let idVitima = idAlvoPacote.replace("pacote-", "");
    if (idTraidor === idVitima) return narrar("❌ O traidor não pode esfaquear a si mesmo! Escolha outra carta do lado dele.");

    // Descobre em qual lado da arena cada um está (j1 ou j2)
    let ladoTraidor = pacoteTraidor.closest("#campo-j1") ? "j1" : "j2";
    let ladoVitima = pacoteVitima.closest("#campo-j1") ? "j1" : "j2";
    
    // A vítima TEM que ser parceira do traidor
    if (ladoTraidor !== ladoVitima) {
        return narrar("❌ O alvo precisa ser um ALIADO do traidor (estar do mesmo lado da arena)!");
    }

    let nomeTraidor = pacoteTraidor.querySelector(".nome-carta").innerText.trim();
    let nomeVitima = pacoteVitima.querySelector(".nome-carta").innerText.trim();
    
    let danoElemento = document.getElementById("dano-" + idTraidor);
    let danoDoTraidor = danoElemento ? parseFloat(danoElemento.innerText) : 0;
    
    let traicaoEncerraTurno = ehVezDaCarta(idTraidor);
    narrar(`🗡️ TRAIÇÃO! [${nomeTraidor}] esfaqueou seu próprio parceiro [${nomeVitima}] causando ${danoDoTraidor} de dano! ${traicaoEncerraTurno ? "Turno encerrado!" : "Ação livre concluída sem alterar a vez atual!"}`);
    
    // Aplica o dano
    let isInimigo = (ladoVitima === "j2");
    animarFacadaTraicao(idTraidor, idVitima);
    aplicarDanoDireto(idAlvoPacote, danoDoTraidor, isInimigo);

    // Finaliza e desliga o modo traição
    let idTraidorQueAtacou = idTraidor;
    modoTraicao = false;
    idTraidor = null;

    // Fora do turno, a poção resolve como ação livre sem trocar a vez atual.
    passarTurnoSeForVezDaCarta(idTraidorQueAtacou);
}
// 🪵 Faz uma cópia visual do Barril rolar até o alvo. O impacto e a transformação reais
// só são liberados quando ele chega, para a animação e a regra do jogo acontecerem juntas.
function animarBarrilBarbaroRolando(idBarril, idPacoteAlvo, aoImpactar) {
    let pacoteBarril = document.getElementById("pacote-" + idBarril);
    let pacoteAlvo = document.getElementById(idPacoteAlvo);
    if (!pacoteBarril || !pacoteAlvo) {
        if (typeof aoImpactar === "function") aoImpactar();
        return;
    }

    let origem = obterCentroVisual(pacoteBarril);
    let destino = obterCentroVisual(pacoteAlvo);
    if (!origem || !destino) {
        if (typeof aoImpactar === "function") aoImpactar();
        return;
    }

    pacoteBarril.classList.add("barril-barbaro-partindo");

    let barrilVisual = document.createElement("span");
    barrilVisual.className = "barril-barbaro-rolando";
    barrilVisual.setAttribute("aria-hidden", "true");
    barrilVisual.style.left = origem.x + "px";
    barrilVisual.style.top = origem.y + "px";
    barrilVisual.style.setProperty("--barril-barbaro-x", (destino.x - origem.x) + "px");
    barrilVisual.style.setProperty("--barril-barbaro-y", (destino.y - origem.y) + "px");
    barrilVisual.style.setProperty("--barril-barbaro-meio-x", ((destino.x - origem.x) / 2) + "px");
    barrilVisual.style.setProperty("--barril-barbaro-meio-y", ((destino.y - origem.y) / 2 - 32) + "px");

    let imagemOriginal = pacoteBarril.querySelector("img");
    if (imagemOriginal) {
        let imagem = document.createElement("img");
        imagem.src = imagemOriginal.src;
        imagem.alt = "";
        barrilVisual.appendChild(imagem);
    } else {
        barrilVisual.textContent = "🛢️";
    }
    document.body.appendChild(barrilVisual);

    setTimeout(() => {
        let impacto = document.createElement("span");
        impacto.className = "impacto-barril-barbaro";
        impacto.setAttribute("aria-hidden", "true");
        impacto.style.left = destino.x + "px";
        impacto.style.top = destino.y + "px";

        for (let i = 0; i < 7; i++) {
            let fumaca = document.createElement("b");
            fumaca.className = "fumaca-barril-barbaro";
            fumaca.style.setProperty("--fumaca-barbaro-x", (((i % 4) - 1.5) * 25) + "px");
            fumaca.style.setProperty("--fumaca-barbaro-y", (-22 - (i % 3) * 17) + "px");
            fumaca.style.setProperty("--fumaca-barbaro-atraso", (i * 0.035) + "s");
            impacto.appendChild(fumaca);
        }

        for (let i = 0; i < 6; i++) {
            let lasca = document.createElement("i");
            lasca.className = "lasca-barril-barbaro";
            lasca.style.setProperty("--lasca-barbaro-x", (((i % 3) - 1) * 34) + "px");
            lasca.style.setProperty("--lasca-barbaro-y", (i < 3 ? -31 - i * 5 : 22 + (i - 3) * 7) + "px");
            lasca.style.setProperty("--lasca-barbaro-giro", ((i * 63) - 120) + "deg");
            impacto.appendChild(lasca);
        }

        let barbaroVisual = document.createElement("span");
        barbaroVisual.className = "barbaro-saindo-do-impacto";
        let barbaroBase = bancoDeCartas.find(carta => carta.nome === "Bárbaro");
        let imagemBarbaro = document.createElement("img");
        imagemBarbaro.src = barbaroBase ? barbaroBase.img : caminhoImagemRpg("barbaro.png");
        imagemBarbaro.alt = "";
        barbaroVisual.appendChild(imagemBarbaro);
        impacto.appendChild(barbaroVisual);

        document.body.appendChild(impacto);
        setTimeout(() => { if (impacto.parentNode) impacto.remove(); }, 1250);

        let alvoAtual = document.getElementById(idPacoteAlvo);
        if (alvoAtual) {
            alvoAtual.classList.remove("impactado-pelo-barril-barbaro");
            void alvoAtual.offsetWidth;
            alvoAtual.classList.add("impactado-pelo-barril-barbaro");
            setTimeout(() => {
                if (alvoAtual.isConnected) alvoAtual.classList.remove("impactado-pelo-barril-barbaro");
            }, 720);
        }

        if (typeof aoImpactar === "function") aoImpactar();
    }, 700);

    setTimeout(() => { if (barrilVisual.parentNode) barrilVisual.remove(); }, 850);
}

// Reconstrói a carta como um Bárbaro de verdade. Assim ela recebe a imagem, os botões
// e os cliques normais da nova forma, sem recuperar a vida perdida pelo Barril.
function transformarBarrilBarbaroEmBarbaro(idUnico, ehAliado) {
    let pacoteAntigo = document.getElementById("pacote-" + idUnico);
    let barbaroBase = bancoDeCartas.find(c => c.nome === "Bárbaro");
    if (!pacoteAntigo || !barbaroBase || !pacoteAntigo.parentElement) return null;

    let vidaEl = document.getElementById("vida-" + idUnico);
    let vidaAntesDaTransformacao = vidaEl ? parseFloat(vidaEl.innerText) : 2;
    if (!Number.isFinite(vidaAntesDaTransformacao)) vidaAntesDaTransformacao = 2;

    // O Bárbaro tem no máximo 2 de vida ao nascer, mas nunca cura o dano que o Barril já tomou.
    let vidaDoBarbaro = Math.max(0, Math.min(2, vidaAntesDaTransformacao));
    let cartaBarbaro = {
        ...barbaroBase,
        idUnico: idUnico,
        vida: vidaDoBarbaro,
        dano: 2
    };

    let html = criarHTMLCarta(
        cartaBarbaro,
        ehAliado ? "jogarCarta" : "jogarCartaInimigo",
        ehAliado ? "carta-aliada" : "carta-inimiga",
        ehAliado
    );
    let temp = document.createElement("div");
    temp.innerHTML = html.trim();
    let pacoteNovo = temp.firstElementChild;
    let estavaCongelado = pacoteAntigo.classList.contains("congelada");

    pacoteAntigo.parentElement.insertBefore(pacoteNovo, pacoteAntigo);
    pacoteAntigo.remove();

    if (estavaCongelado) pacoteNovo.classList.add("congelada");

    // Se Ctrl C/V copiou o Barril, a cópia também termina ao sair o Bárbaro.
    if (typeof ctrlV !== "undefined" && ctrlV[idUnico]) delete ctrlV[idUnico];

    // Prepara os controles da arena sem contar a transformação como uma nova invocação.
    if (ehAliado) jogarCarta("pacote-" + idUnico, true);
    else jogarCartaInimigo("pacote-" + idUnico, true);

    pacoteNovo.classList.add("barbaro-revelado-do-barril");
    setTimeout(() => {
        if (pacoteNovo.isConnected) pacoteNovo.classList.remove("barbaro-revelado-do-barril");
    }, 1050);

    return pacoteNovo;
}

function aplicarAlvoBarrilBarbaro(idPacoteAlvo) {
    if (barrilBarbaroEmAnimacao) return;

    let pacoteAlvo = document.getElementById(idPacoteAlvo);
    let pacoteBarril = document.getElementById("pacote-" + idBarrilAtivo);
    if (!pacoteAlvo || !pacoteBarril) {
        modoAlvoBarrilBarbaro = false;
        modoAlvoBarrilBarbaroInimigo = false;
        idBarrilAtivo = null;
        return;
    }

    let barrilEhAliado = !!pacoteBarril.closest("#campo-j1");
    let alvoEhAliado = !!pacoteAlvo.closest("#campo-j1");
    if (barrilEhAliado === alvoEhAliado) {
        return narrar("❌ O Barril de Bárbaro precisa atingir uma carta do campo oposto!");
    }

    let idBarrilQueAtacou = idBarrilAtivo;
    let splashAtivo = !!splashBarbaroAtivo[idBarrilQueAtacou];
    modoAlvoBarrilBarbaro = false;
    modoAlvoBarrilBarbaroInimigo = false;
    barrilBarbaroEmAnimacao = true;

    animarBarrilBarbaroRolando(idBarrilQueAtacou, idPacoteAlvo, () => {
        concluirImpactoBarrilBarbaro(idPacoteAlvo, idBarrilQueAtacou, barrilEhAliado, splashAtivo);
    });
}

function concluirImpactoBarrilBarbaro(idPacoteAlvo, idBarrilQueAtacou, ehBarrilAliado, splashAtivo) {
    let pacoteAlvo = document.getElementById(idPacoteAlvo);
    let pacoteBarrilAtivo = document.getElementById("pacote-" + idBarrilQueAtacou);
    if (!pacoteAlvo || !pacoteBarrilAtivo) {
        barrilBarbaroEmAnimacao = false;
        delete splashBarbaroAtivo[idBarrilQueAtacou];
        idBarrilAtivo = null;
        narrar("🪵 O impacto do Barril de Bárbaro foi interrompido.");
        return;
    }

    let idSemPacoteAlvo = idPacoteAlvo.replace("pacote-", "");
    let txtVidaAlvo = document.getElementById("vida-" + idSemPacoteAlvo);
    if (!txtVidaAlvo) {
        barrilBarbaroEmAnimacao = false;
        return;
    }

    let textoNarracao = ehBarrilAliado ? "🪵 Seu Barril atingiu o alvo!" : "🪵 O Barril Inimigo atingiu sua carta!";

    // 1. Dano de Impacto Fixo (3 de Dano)
    // 🩹 CORREÇÃO: nunca deixa a vida mostrar número negativo — trava em 0.
    let vidaAtual = Math.max(0, parseFloat(txtVidaAlvo.innerText) - 3);
    txtVidaAlvo.innerText = vidaAtual;

    if (vidaAtual <= 0) {
        textoNarracao += " O alvo principal foi esmagado!";
        let nomeAlvoExibido = pacoteAlvo.querySelector(".nome-carta").innerText.trim();
        let nomeAlvoBarrilBarbaro = obterNomeEfetivoCarta(idSemPacoteAlvo, nomeAlvoExibido);
        let ladoAlvoBarrilBarbaro = pacoteAlvo.closest("#campo-j1") ? "j1" : "j2";
        registrarMorte(nomeAlvoBarrilBarbaro, ladoAlvoBarrilBarbaro);
        guardarOrigemTransformacaoOrk(nomeAlvoBarrilBarbaro, idSemPacoteAlvo, pacoteAlvo);
        pacoteAlvo.remove();
        ativarPassivasAoMorrer(
            nomeAlvoBarrilBarbaro,
            idSemPacoteAlvo,
            "campo-" + ladoAlvoBarrilBarbaro
        );
    } else {
        textoNarracao += " Causando 3 de dano direto.";
    }

    // 2. Dano Splash (Se o Especial rodou 5 antes, só pra ESTE Barril específico)
    if (splashAtivo) {
        textoNarracao += " 💥 Splash! As cartas ao lado sofreram 1 de dano!";
        let vizinhos = [];
        if (pacoteAlvo.previousElementSibling) vizinhos.push(pacoteAlvo.previousElementSibling);
        if (pacoteAlvo.nextElementSibling) vizinhos.push(pacoteAlvo.nextElementSibling);

        vizinhos.forEach(vizinho => {
            if (vizinho.id && vizinho.id.includes("pacote-")) {
                let txtVidaVizinho = document.getElementById("vida-" + vizinho.id.replace("pacote-", ""));
                if (txtVidaVizinho) {
                    // 🩹 CORREÇÃO: nunca deixa a vida mostrar número negativo — trava em 0.
                    let vidaViz = Math.max(0, parseFloat(txtVidaVizinho.innerText) - 1);
                    txtVidaVizinho.innerText = vidaViz;
                    if (vidaViz <= 0) {
                        let idVizinhoBarril = vizinho.id.replace("pacote-", "");
                        let nomeVizinhoExibido = vizinho.querySelector(".nome-carta") ? vizinho.querySelector(".nome-carta").innerText.trim() : "";
                        let nomeVizinhoBarril = obterNomeEfetivoCarta(idVizinhoBarril, nomeVizinhoExibido);
                        let ladoVizinhoBarril = vizinho.closest("#campo-j1") ? "j1" : "j2";
                        registrarMorte(nomeVizinhoBarril, ladoVizinhoBarril);
                        guardarOrigemTransformacaoOrk(nomeVizinhoBarril, idVizinhoBarril, vizinho);
                        vizinho.remove();
                        ativarPassivasAoMorrer(
                            nomeVizinhoBarril,
                            idVizinhoBarril,
                            "campo-" + ladoVizinhoBarril
                        );
                    }
                }
            }
        });
    }

    textoNarracao += " E um Bárbaro saiu de dentro do Barril!";
    narrar(textoNarracao);

    // 🦇 VAMPI7 — o impacto do Barril de Bárbaro também conta como um ataque de verdade.
    dispararVampi7JuntoDoAtaque(idBarrilQueAtacou, idPacoteAlvo);
    dispararSeteNegativoJuntoDoAtaque(idBarrilQueAtacou, idPacoteAlvo);
    // 🛸 PORTABLE — ataca junto enquanto a bateria durar.
    dispararPortableJuntoDoAtaque(idBarrilQueAtacou, idPacoteAlvo);

    // 3. Transformação real: preserva a vida restante e recria a carta como Bárbaro 2/2.
    transformarBarrilBarbaroEmBarbaro(idBarrilQueAtacou, ehBarrilAliado);

    // 4. Limpa as variáveis e passa a vez
    modoAlvoBarrilBarbaro = false;
    modoAlvoBarrilBarbaroInimigo = false;
    delete splashBarbaroAtivo[idBarrilQueAtacou];
    idBarrilAtivo = null;
    barrilBarbaroEmAnimacao = false;

    passarTurno();
    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
}
// Função auxiliar para gerar poção aleatória

function gerarPocaoAleatoria(idMao) {
    // Busca Inteligente das Poções
    let todasPocoes = bancoDeCartas.filter(c => {
        let n = c.nome.toLowerCase();
        return n.includes("Poção de Gelo") || n.includes("velux") || n.includes("veluz") || n.includes("adiv") || n.includes("recuperida") || n.includes("pocaotraicao");
    });

    if (todasPocoes.length > 0) {
        let dadosPocao = todasPocoes[Math.floor(Math.random() * todasPocoes.length)];
        let novoIdPocao = "pocao-" + Math.floor(Math.random() * 100000); 
        let cartaPocaoNova = { ...dadosPocao, idUnico: novoIdPocao };
        
        let maoDestino = document.getElementById(idMao);
        if (maoDestino) {
            let ehAliado = idMao.includes("j1");
            let funcaoClick = ehAliado ? 'jogarCarta' : 'jogarCartaInimigo'; 
            
            // 🚀 CORREÇÃO: Aplica a classe normal do seu jogo para manter os 140px!
            let classeNormal = ehAliado ? 'carta-aliada' : 'carta-inimiga-espera';
            
            maoDestino.insertAdjacentHTML('beforeend', criarHTMLCarta(cartaPocaoNova, funcaoClick, classeNormal, ehAliado));
        }
    } else {
        narrar("Erro crítico: Nenhuma poção foi encontrada no banco de dados!");
    }
}
// ====== MOTOR DO BUMERANGUE ======
// 🪃 BUMERSKELETON — chamada quando o Especial foi clicado ANTES de atacar: o clique no
// inimigo aqui faz o papel do ataque normal (dano base + ricochete nos outros) e, assim
// que a cadeia termina, já rola a habilidade especial nela.
function aplicarEspecialBumerskeletonAntesDeAtacar(idPacoteAlvo) {
    let idBume = idBumerskeletonEspecialAtivo;
    modoEspecialBumerskeleton = false;
    idBumerskeletonEspecialAtivo = null;

    let pacoteBume = document.getElementById("pacote-" + idBume);
    let pacoteAlvo = document.getElementById(idPacoteAlvo);
    if (!pacoteBume || !pacoteAlvo) return;

    let ladoBume = pacoteBume.closest("#campo-j1") ? "j1" : "j2";
    let ladoAlvo = pacoteAlvo.closest("#campo-j1") ? "j1" : "j2";
    if (ladoBume === ladoAlvo) return narrar("❌ Escolha uma carta do campo OPOSTO para o bumerangue acertar!");

    // O lançamento pelo Especial substitui o ataque normal, que costuma definir
    // este ID. Sem ele, passarTurno() não reconhece o segundo ataque da Velux.
    ultimoIdQueAtacou = idBume;

    let idAlvoPuro = idPacoteAlvo.replace("pacote-", "");
    let txtDanoBume = document.getElementById("dano-" + idBume);
    let danoBase = txtDanoBume ? parseFloat(txtDanoBume.innerText) : 0;
    let txtVidaAlvo = document.getElementById("vida-" + idAlvoPuro);
    if (!txtVidaAlvo) return;

    let nomeAlvo = pacoteAlvo.querySelector(".nome-carta").innerText;
    let isInimigoParaOJogo = (ladoAlvo === "j2");
    let campoAlvoId = (ladoAlvo === "j1") ? "campo-j1" : "campo-j2";

    aplicarDanoAtaqueArea(idPacoteAlvo, danoBase, isInimigoParaOJogo);
    narrar(`🪃 O bumerangue acertou [${nomeAlvo}] causando ${danoBase} de dano!`);

    // 🦇 VAMPI7 — o golpe inicial do bumerangue também conta como um ataque de verdade.
    dispararVampi7JuntoDoAtaque(idBume, idPacoteAlvo);
    dispararSeteNegativoJuntoDoAtaque(idBume, idPacoteAlvo);
    // 🛸 PORTABLE — ataca junto enquanto a bateria durar.
    dispararPortableJuntoDoAtaque(idBume, idPacoteAlvo);

    // Se o alvo já morreu com o golpe inicial, a cadeia continua nos outros normalmente.
    executarChainBumerangue(idBume, idAlvoPuro, campoAlvoId, () => {
        if (!bumerangueAindaTemDono(idBume)) {
            delete alvosDoBumerangue[idBume];
            delete trajetosVisuaisBumerangue[idBume];
            if (turnoAtivo === (ladoBume === "j1" ? 1 : 2)) passarTurno();
            return;
        }
        usarHabilidade("Bumerskeleton", idBume, null);
    });
}

function executarChainBumerangue(idBumerskeleton, idPrimeiroAlvo, campoAlvoId, aoConcluir) {
    try {
        if (!bumerangueAindaTemDono(idBumerskeleton)) {
            if (typeof aoConcluir === "function") aoConcluir();
            return;
        }
        if (typeof alvosDoBumerangue === 'undefined') {
            return narrar("⚠️ Erro: As variáveis do bumerangue estão faltando no topo do main.js!");
        }
        alvosDoBumerangue[idBumerskeleton] = [idPrimeiroAlvo];
        let pontoVisualAnterior = iniciarTrajetoVisualBumerangue(idBumerskeleton, idPrimeiroAlvo);

        let campo = document.getElementById(campoAlvoId);
        if (!campo) { if (typeof aoConcluir === "function") aoConcluir(); return; }

        let classeCartas = (campoAlvoId === "campo-j2") ? "carta-inimiga" : "carta-aliada";
        let outrasCartas = Array.from(campo.getElementsByClassName(classeCartas));

        let delay = 600; 
        let indexDano = 1; 

        outrasCartas.forEach(pacote => {
            let idOutroAlvo = pacote.id.replace("pacote-", "");

            if (idOutroAlvo === idPrimeiroAlvo) return;

            // Salva o dano para o ricochete
            let danoDestaBatida = 3; 
            if (typeof tabelaDanoBumerangue !== 'undefined') {
                danoDestaBatida = tabelaDanoBumerangue[indexDano] || 4;
            }

            let origemDesteRicochete = pontoVisualAnterior;
            pontoVisualAnterior = registrarRicocheteVisualBumerangue(
                idBumerskeleton,
                origemDesteRicochete,
                pacote,
                Math.max(0, (delay - 180) / 1000)
            );

            setTimeout(() => {
                // Um ricochete agendado não pode continuar atacando depois que
                // o Bumerskeleton morreu ou foi transformado em outra carta.
                if (!bumerangueAindaTemDono(idBumerskeleton)) return;
                let txtVida = document.getElementById("vida-" + idOutroAlvo);
                let nomeAlvo = pacote.querySelector(".nome-carta").innerText;
                
                if (txtVida) {
                    let vidaAtual = parseFloat(txtVida.innerText);
                    // 🩹 CORREÇÃO: nunca deixa a vida mostrar número negativo — trava em 0.
                    let novaVida = Math.max(0, vidaAtual - danoDestaBatida);
                    txtVida.innerText = novaVida;
                    sincronizarDanoDoTrio(idOutroAlvo, vidaAtual, novaVida);
                    
                    alvosDoBumerangue[idBumerskeleton].push(idOutroAlvo);

                    if (typeof mostrarEfeitoPerdaVida === "function") mostrarEfeitoPerdaVida(idOutroAlvo);
                    narrar(`🪃 O bumerangue ricocheteou em [${nomeAlvo}] e causou ${danoDestaBatida} de Dano!`);

                    if (novaVida <= 0) {
                        let nomeEfetivoAlvo = obterNomeEfetivoCarta(idOutroAlvo, nomeAlvo);
                        narrar(`BUM! [${nomeAlvo}] foi destruído pelo ricochete!`);
                        registrarMorte(nomeEfetivoAlvo, campoAlvoId === "campo-j2" ? "j2" : "j1");
                        guardarOrigemTransformacaoOrk(nomeEfetivoAlvo, idOutroAlvo, pacote);
                        pacote.remove();
                        ativarPassivasAoMorrer(nomeEfetivoAlvo, idOutroAlvo, campoAlvoId);
                    }
                }
            }, delay);
            
            delay += 600;
            indexDano++;
        });

        // ⏳ Só avisa que a cadeia terminou depois do último ricochete de verdade ter acontecido.
        if (typeof aoConcluir === "function") {
            setTimeout(aoConcluir, delay + 200);
        }
    } catch (erro) {
        console.error("Erro no ricochete: ", erro);
    }
}
function mostrarEfeitoVida(idCarta, tipo) {
    // Busca a carta na tela. Tenta procurar pelo "pacote-id", se não achar, tenta só pelo "id" direto.
    let carta = document.getElementById("pacote-" + idCarta) || document.getElementById(idCarta);
    
    if (!carta) return; // Se a carta não estiver visível (ex: já morreu), aborta o efeito

    // Função interna que cria um único coração
    function gerarCoracao(atraso, posicaoXForcada) {
        let coracao = document.createElement("div");
        coracao.innerText = "❤️";
        coracao.classList.add("efeito-coracao");
        
        // Joga um pouquinho para a esquerda ou direita aleatoriamente (entre 15% e 35% da carta)
        // Isso faz o coração nascer mais ou menos em cima do ícone da vida, e não no meio da carta.
        let posicaoX = Number.isFinite(posicaoXForcada) ? posicaoXForcada : Math.random() * 20 + 15;
        coracao.style.left = posicaoX + "%";
        
        // Define se ele espera um pouquinho antes de subir (para o efeito de "recuperou" vida)
        coracao.style.animationDelay = atraso + "s";

        carta.appendChild(coracao);

        // O coração se auto-destrói do HTML após a animação acabar (1.2s de animação + o atraso)
        setTimeout(() => {
            if (coracao.parentNode) {
                coracao.remove();
            }
        }, 1200 + (atraso * 1000));
    }

    // Aplica o efeito baseado no que você pediu:
    if (tipo === "ganhou") {
        // Sobe 1 coração imediato
        gerarCoracao(0);
        
    } else if (tipo === "recuperou") {
        // Sobe 3 corações em cascata (um após o outro)
        gerarCoracao(0);
        gerarCoracao(0.2);
        gerarCoracao(0.4);
    } else if (tipo === "plus-life") {
        // Dois corações separados e levemente alternados, representando o bônus exato de +2.
        gerarCoracao(0, 20);
        gerarCoracao(0.14, 35);
    }
}
function mostrarEfeitoPerdaVida(idCarta) {
    let carta = document.getElementById("pacote-" + idCarta) || document.getElementById(idCarta);
    if (!carta) return;

    let coracao = document.createElement("div");
    coracao.innerText = "🖤"; // Você pode trocar por "🖤" se preferir!
    coracao.classList.add("efeito-perda-vida");
    
    // Posição aleatória perto do centro-esquerda
    let posicaoX = Math.random() * 20 + 15;
    coracao.style.left = posicaoX + "%";

    carta.appendChild(coracao);

    // Auto-destrói após 1.2 segundos
    setTimeout(() => {
        if (coracao.parentNode) {
            coracao.remove();
        }
    }, 1200);
}
function mostrarEfeitoAtaque(idCarta, posicaoXForcada) {
    let carta = document.getElementById("pacote-" + idCarta) || document.getElementById(idCarta);
    if (!carta) return;

    let espada = document.createElement("div");
    espada.innerText = "⚔️"; 
    espada.classList.add("efeito-ataque");
    
    // 🚨 Diferença: Joga mais para a DIREITA (entre 65% e 85%), onde fica o status de ataque!
    let posicaoX = Number.isFinite(posicaoXForcada) ? posicaoXForcada : Math.random() * 20 + 65; 
    espada.style.left = posicaoX + "%";

    carta.appendChild(espada);

    // Auto-destrói após 1.2 segundos
    setTimeout(() => {
        if (espada.parentNode) {
            espada.remove();
        }
    }, 1200);
}
function mostrarEfeitoPerdaAtaque(idCarta) {
    let carta = document.getElementById("pacote-" + idCarta) || document.getElementById(idCarta);
    if (!carta) return;

    let espada = document.createElement("div");
    espada.innerText = "⚔️"; 
    espada.classList.add("efeito-perda-ataque");
    
    // Fica do lado DIREITO, na direção do ícone de ataque
    let posicaoX = Math.random() * 20 + 65;
    espada.style.left = posicaoX + "%";

    carta.appendChild(espada);

    // Auto-destrói
    setTimeout(() => {
        if (espada.parentNode) {
            espada.remove();
        }
    }, 1200);
}

// 🛡️ Efeito discreto compartilhado pelo Guerreiro e pelo suporte Escudo.
// O estado real continua em escudoGuerreiro; estas funções cuidam apenas do visual.
function criarHTMLVisualEscudo() {
    return `<div class="visual-escudo-ativo" aria-hidden="true"><span class="icone-escudo-fosco"></span></div>`;
}

function localizarCartaDoEscudo(idCarta) {
    let idPuro = String(idCarta).replace("pacote-", "");
    return document.getElementById("pacote-" + idPuro);
}

function ativarVisualEscudo(idCarta) {
    let carta = localizarCartaDoEscudo(idCarta);
    if (!carta) return;

    carta.classList.add("com-escudo-ativo");

    let visual = carta.querySelector(":scope > .visual-escudo-ativo");
    if (!visual) carta.insertAdjacentHTML("afterbegin", criarHTMLVisualEscudo());
}

function quebrarVisualEscudo(idCarta) {
    let carta = localizarCartaDoEscudo(idCarta);
    if (!carta) return;

    carta.classList.remove("com-escudo-ativo");

    let visual = carta.querySelector(":scope > .visual-escudo-ativo");
    if (!visual) {
        carta.insertAdjacentHTML("afterbegin", criarHTMLVisualEscudo());
        visual = carta.querySelector(":scope > .visual-escudo-ativo");
    }

    visual.classList.add("escudo-quebrando");

    [
        [-34, -30, -38], [34, -28, 42], [-42, 16, -65],
        [39, 22, 58], [0, 42, 12]
    ].forEach(([x, y, giro], indice) => {
        let fragmento = document.createElement("span");
        fragmento.className = "fragmento-escudo";
        fragmento.textContent = indice % 2 === 0 ? "◆" : "◢";
        fragmento.style.setProperty("--escudo-x", x + "px");
        fragmento.style.setProperty("--escudo-y", y + "px");
        fragmento.style.setProperty("--escudo-giro", giro + "deg");
        visual.appendChild(fragmento);
    });

    setTimeout(() => {
        if (visual.parentNode) visual.remove();
    }, 650);
}

function sincronizarVisuaisEscudo() {
    document.querySelectorAll("[id^='pacote-']").forEach(carta => {
        let idCarta = carta.id.replace("pacote-", "");
        if (escudoGuerreiro[idCarta]) ativarVisualEscudo(idCarta);
    });
}

// 🛢️ BARRIL PROTETOR — a carta real do Barril permanece na fileira. A protegida recebe
// somente a aura marrom; o visual de quebra continua preparado, mas fica oculto até quebrar.
function posicionarBarrilSobreCartaProtegida(idCarta, idBarril) {
    let idCartaPuro = String(idCarta).replace("pacote-", "");
    let idBarrilPuro = String(idBarril).replace("pacote-", "");
    let carta = document.getElementById("pacote-" + idCartaPuro);
    let barril = document.getElementById("pacote-" + idBarrilPuro);
    if (!carta || !barril || carta === barril) return;

    let campo = carta.closest("#campo-j1, #campo-j2");
    if (!campo || barril.closest("#campo-j1, #campo-j2") !== campo) return;

    barril.classList.add("barril-empilhado-sobre-carta");
    barril.dataset.cartaProtegida = idCartaPuro;

    let auraClicavel = barril.querySelector(":scope > .aura-barril-empilhado");
    if (!auraClicavel) {
        auraClicavel = document.createElement("span");
        auraClicavel.className = "aura-barril-empilhado";
        auraClicavel.setAttribute("role", "button");
        auraClicavel.setAttribute("aria-label", "Barril protetor");
        auraClicavel.title = "Barril protetor — clique para selecionar";
        auraClicavel.innerHTML = "<i></i>";
        auraClicavel.onclick = function(evento) {
            evento.stopPropagation();
            let imagemOriginal = barril.querySelector("img, .imagem-carta");
            if (imagemOriginal) imagemOriginal.click();
        };
        barril.appendChild(auraClicavel);
    }

    // Ao receber position:absolute, o Barril deixa de ocupar um espaço na fileira. A leitura
    // abaixo já usa a posição nova da carta protegida para centralizar a pilha corretamente.
    let retanguloCampo = campo.getBoundingClientRect();
    let retanguloCarta = carta.getBoundingClientRect();
    let larguraBarril = barril.offsetWidth || retanguloCarta.width;
    let esquerda = retanguloCarta.left - retanguloCampo.left + campo.scrollLeft
        + (retanguloCarta.width - larguraBarril) / 2;
    let topo = retanguloCarta.top - retanguloCampo.top + campo.scrollTop - 7;

    barril.style.left = esquerda + "px";
    barril.style.top = topo + "px";
}

function restaurarPosicaoBarril(idBarril) {
    let barril = document.getElementById("pacote-" + String(idBarril).replace("pacote-", ""));
    if (!barril) return;
    barril.classList.remove("barril-empilhado-sobre-carta");
    barril.removeAttribute("data-carta-protegida");
    barril.style.removeProperty("left");
    barril.style.removeProperty("top");
    let auraClicavel = barril.querySelector(":scope > .aura-barril-empilhado");
    if (auraClicavel) auraClicavel.remove();
}

function ativarVisualProtecaoBarril(idCarta, idBarril) {
    let carta = document.getElementById("pacote-" + String(idCarta).replace("pacote-", ""));
    if (!carta) return;

    carta.classList.add("com-protecao-barril");
    let visual = carta.querySelector(":scope > .visual-protecao-barril");
    if (!visual) {
        visual = document.createElement("div");
        visual.className = "visual-protecao-barril";
        visual.setAttribute("aria-hidden", "true");
        visual.innerHTML = '<span class="icone-barril-fosco"><i></i></span>';
        carta.insertAdjacentElement("afterbegin", visual);
    }
    visual.dataset.barrilId = String(idBarril);
    // Garante o formato original: Barril visível ao lado das cartas, sem nada sobre o alvo.
    restaurarPosicaoBarril(idBarril);
}

function quebrarVisualProtecaoBarril(idCarta, passivaAtivada) {
    let carta = document.getElementById("pacote-" + String(idCarta).replace("pacote-", ""));
    if (!carta) return;

    carta.classList.remove("com-protecao-barril");
    carta.classList.add("carta-liberta-do-barril");

    let visual = carta.querySelector(":scope > .visual-protecao-barril");
    if (!visual) {
        ativarVisualProtecaoBarril(idCarta, "quebrando");
        visual = carta.querySelector(":scope > .visual-protecao-barril");
        carta.classList.remove("com-protecao-barril");
    }
    if (!visual) return;

    visual.classList.add("barril-protecao-quebrando");
    if (passivaAtivada) visual.classList.add("barril-passiva-ativada");

    [
        [-45, -35, -70], [43, -32, 64], [-54, 2, -105],
        [52, 10, 92], [-30, 43, 38], [31, 45, -42], [2, -51, 18]
    ].forEach(([x, y, giro], indice) => {
        let lasca = document.createElement("span");
        lasca.className = "lasca-protecao-barril lasca-barril-" + (indice % 3);
        lasca.style.setProperty("--lasca-barril-x", x + "px");
        lasca.style.setProperty("--lasca-barril-y", y + "px");
        lasca.style.setProperty("--lasca-barril-giro", giro + "deg");
        visual.appendChild(lasca);
    });

    setTimeout(() => {
        carta.classList.remove("carta-liberta-do-barril");
        if (visual.parentNode) visual.remove();
    }, 900);
}

function animarCartaSaindoDoBarril(carta) {
    if (!carta) return;

    carta.classList.remove("carta-saindo-da-passiva-barril");
    void carta.offsetWidth;
    carta.classList.add("carta-saindo-da-passiva-barril");

    let casca = document.createElement("span");
    casca.className = "casca-passiva-barril";
    casca.setAttribute("aria-hidden", "true");
    casca.innerHTML = '<i class="metade-barril metade-barril-esquerda"></i><i class="metade-barril metade-barril-direita"></i>';
    carta.appendChild(casca);

    setTimeout(() => {
        carta.classList.remove("carta-saindo-da-passiva-barril");
        if (casca.parentNode) casca.remove();
    }, 1100);
}

function sincronizarVisuaisProtecaoBarril() {
    document.querySelectorAll(".visual-protecao-barril").forEach(visual => {
        if (visual.classList.contains("barril-protecao-quebrando")) return;
        let carta = visual.parentElement;
        let idCarta = carta && carta.id ? carta.id.replace("pacote-", "") : "";
        let idBarril = cartasProtegidas[idCarta];
        let vinculoValido = idBarril
            && String(idBarril) === String(visual.dataset.barrilId)
            && document.getElementById("pacote-" + idBarril);
        if (!vinculoValido) {
            if (carta) carta.classList.remove("com-protecao-barril");
            visual.remove();
        }
    });

    Object.entries(cartasProtegidas).forEach(([idCarta, idBarril]) => {
        if (String(idCarta) === String(idBarril)) {
            delete cartasProtegidas[idCarta];
            restaurarPosicaoBarril(idBarril);
            return;
        }
        let barrilExiste = document.getElementById("pacote-" + idBarril);
        let cartaExiste = document.getElementById("pacote-" + idCarta);
        if (barrilExiste && cartaExiste) {
            ativarVisualProtecaoBarril(idCarta, idBarril);
        } else {
            restaurarPosicaoBarril(idBarril);
            delete cartasProtegidas[idCarta];
        }
    });

    // Se um vínculo foi trocado ou a carta protegida saiu do campo, devolve o Barril
    // sobrevivente à fileira normal em vez de deixá-lo preso no ar.
    document.querySelectorAll(".barril-empilhado-sobre-carta").forEach(barril => {
        let idBarril = barril.id.replace("pacote-", "");
        let idCarta = barril.dataset.cartaProtegida || "";
        if (!idCarta || String(cartasProtegidas[idCarta]) !== String(idBarril)) {
            restaurarPosicaoBarril(idBarril);
        }
    });
}

function sincronizarVisuaisVenenoMago() {
    Object.values(venenosMago).forEach(efeito => {
        let alvo = document.getElementById("pacote-" + efeito.idAlvo);
        if (alvo) alvo.classList.add("envenenada");
    });
}

window.onload = function() {
    // A nova tela inicial decide quando a partida começa e qual modo será usado.
    // Mantém o início automático antigo como segurança caso menu.js não esteja carregado.
    if (typeof window.inicializarTelaInicioRpg === "function") window.inicializarTelaInicioRpg();
    else iniciarJogo();
    sincronizarVisuaisEscudo();
    sincronizarVisuaisVenenoMago();
    sincronizarVisuaisIncendiario();
    sincronizarVisuaisGeloBumerskeleton();
    sincronizarMarcadoresBarrilGoblin();
    sincronizarVisuaisProtecaoBarril();
    sincronizarVinculosSeparado();
    sincronizarVisuaisVampi7();
    sincronizarAtributosAoVivo();

    window.addEventListener("resize", sincronizarVisuaisProtecaoBarril);
    window.addEventListener("resize", sincronizarVinculosSeparado);
    document.addEventListener("scroll", sincronizarVisuaisProtecaoBarril, true);
    document.addEventListener("scroll", sincronizarVinculosSeparado, true);

    // Se uma carta protegida/envenenada/marcada for recriada ou movida, o visual reaparece nela.
    new MutationObserver(() => {
        removerVoosSemBumerskeleton();
        sincronizarVisuaisEscudo();
        sincronizarVisuaisVenenoMago();
        sincronizarVisuaisIncendiario();
        sincronizarVisuaisGeloBumerskeleton();
        sincronizarMarcadoresBarrilGoblin();
        sincronizarVisuaisProtecaoBarril();
        sincronizarVinculosSeparado();
        sincronizarVisuaisVampi7();
    }).observe(document.body, {
        childList: true,
        subtree: true
    });

    // Vida e ataque são a fonte real do combate. O observador agenda apenas uma
    // atualização por quadro, mesmo quando uma habilidade altera várias cartas.
    new MutationObserver(agendarSincronizacaoAtributosAoVivo).observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true
    });
};
