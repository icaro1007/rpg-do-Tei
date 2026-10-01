/* ========================================================================== 
   MENU.JS — Progressão, coleção, baús, loja e modos do RPG do T&Í
   ========================================================================== */

window.rpgModoAtual = "menu";

const RPG_CHAVE_PROGRESSO = "rpg-do-tei-progresso-v2";
const RPG_PONTOS_VITORIA = 10;
const RPG_PONTOS_DERROTA = 5;
const RPG_LIMITE_PONTOS = 2026;
const RPG_LIMITE_BAUS_DIA = 4;
const RPG_CARTAS_INICIAIS = ["guerreiro", "barbaro", "mago", "escudo_item"];
const RPG_COPIAS_EXTRAS_PARA_TROCA = 3;
// Temporário para os testes: todas as cartas entram no sorteio de qualquer
// modo de batalha. A coleção, os pontos e os desbloqueios salvos não são alterados.
const RPG_TESTE_TODAS_CARTAS_NAS_BATALHAS = true;

// Valores provisórios: ficam centralizados aqui para serem balanceados depois.
const RPG_PRECOS_LOJA = {
    cartaEraAtual: 90,
    cartaOutraEra: 130,
    bauEraAtual: 220,
    bauOutraEra: 340,
    bauEraFutura: 460,
    bauSupremo: 1600
};

const RPG_GRUPOS_VARIANTES = {
    ctrlc: {
        principal: "ctrlc",
        ids: ["ctrlc", "ctrlv"],
        nome: "Ctrl C / Ctrl V",
        descricao: "Duas formas da mesma gosma metamorfa. Elas copiam a passiva da última carta usada pelo oponente, recebendo a cópia com vida e dano reduzidos em 1. Se a carta copiada não tiver Especial, podem rolar o dado: ao tirar 3, ganham +1 de dano. Ao desbloquear esta carta, as duas formas entram no sorteio das batalhas."
    },
    separado: {
        principal: "separado",
        ids: ["separado", "separado2"],
        nome: "Separado / Separadois",
        descricao: "Duas formas da mesma carta de parceria. Ela escolhe uma carta aliada e passa a atacar junto dela. Ao tirar 6, o especial se torna permanente: em todas as rodadas seguintes, cada integrante da dupla pode atacar um alvo diferente, começando por qualquer uma das duas. Ao desbloquear esta carta, as duas formas entram no sorteio das batalhas."
    }
};

const RPG_VARIANTE_PARA_PRINCIPAL = Object.values(RPG_GRUPOS_VARIANTES).reduce((mapa, grupo) => {
    grupo.ids.forEach(id => { mapa[id] = grupo.principal; });
    return mapa;
}, {});

const RPG_ERAS = {
    medieval: {
        nome: "Era Medieval",
        icone: "🏰",
        inicio: 0,
        fim: 1452,
        texto: "A era das tropas, fortalezas, magia antiga e combates corpo a corpo."
    },
    moderna: {
        nome: "Era Moderna",
        icone: "⚙️",
        inicio: 1453,
        fim: 1788,
        texto: "Estratégia, invenções, pólvora e cartas que alteram o rumo da batalha."
    },
    contemporanea: {
        nome: "Era Contemporânea",
        icone: "💻",
        inicio: 1789,
        fim: 2026,
        texto: "Tecnologia, manipulação do tempo, cópias e poderes capazes de mudar as regras."
    }
};

// A coleção começa com 4 tipos. Algumas cartas são garantidas na trilha;
// as outras são descobertas em baús ou na loja. Os suportes foram divididos
// entre as eras na proporção mais equilibrada possível: 6, 6 e 5.
const RPG_ORDEM_CARTAS_ERAS = {
    medieval: [
        "guerreiro", "barbaro", "mago", "escudo_item", "arqueiro", "goblin",
        "curandeiro", "ork", "necromante", "cavaleiro", "besta", "cavalotroia",
        "fogueira", "recuperida", "velux"
    ],
    moderna: [
        "ladrao", "triogoblin", "bruxo", "barril", "barrilbarbaro", "barrilgoblin",
        "mensageiro", "incendiario", "triobarbaros", "pocaotraicao", "adiv",
        "pocaogelo", "plus_life", "reviverta", "allsforms"
    ],
    contemporanea: [
        "unidao", "ctrlc", "ctrlv", "Bumerskeleton", "viajante", "criador",
        "separado", "separado2", "vampi7", "portable", "cracker",
        "dupliquetion", "auvex"
    ]
};

const RPG_MARCOS_ERAS = {
    medieval: [
        { pontos: 0, tipo: "inicio", titulo: "Coleção inicial", detalhe: "Guerreiro, Bárbaro, Mago e Escudo" },
        { pontos: 20, tipo: "carta", carta: "arqueiro" },
        { pontos: 60, tipo: "bau", quantidade: 1 },
        { pontos: 120, tipo: "moedas", quantidade: 60 },
        { pontos: 200, tipo: "carta", carta: "goblin" },
        { pontos: 300, tipo: "bau", quantidade: 1 },
        { pontos: 420, tipo: "moedas", quantidade: 90 },
        { pontos: 560, tipo: "carta", carta: "curandeiro" },
        { pontos: 720, tipo: "bau", quantidade: 1 },
        { pontos: 900, tipo: "moedas", quantidade: 140 },
        { pontos: 1080, tipo: "carta", carta: "cavaleiro" },
        { pontos: 1220, tipo: "bau", quantidade: 2 },
        { pontos: 1350, tipo: "moedas", quantidade: 220 },
        { pontos: 1453, tipo: "era", titulo: "Era Moderna" }
    ],
    moderna: [
        { pontos: 1453, tipo: "inicio", titulo: "Era Moderna", detalhe: "Novas cartas disponíveis nos baús e na loja" },
        { pontos: 1490, tipo: "bau", quantidade: 1 },
        { pontos: 1530, tipo: "moedas", quantidade: 100 },
        { pontos: 1570, tipo: "carta", carta: "barril" },
        { pontos: 1610, tipo: "bau", quantidade: 1 },
        { pontos: 1650, tipo: "carta", carta: "pocaotraicao", suporte: true },
        { pontos: 1690, tipo: "moedas", quantidade: 140 },
        { pontos: 1730, tipo: "carta", carta: "incendiario" },
        { pontos: 1760, tipo: "bau", quantidade: 2 },
        { pontos: 1789, tipo: "era", titulo: "Era Contemporânea" }
    ],
    contemporanea: [
        { pontos: 1789, tipo: "inicio", titulo: "Era Contemporânea", detalhe: "Tecnologia e controle das regras" },
        { pontos: 1820, tipo: "bau", quantidade: 1 },
        { pontos: 1850, tipo: "moedas", quantidade: 160 },
        { pontos: 1880, tipo: "carta", carta: "ctrlc" },
        { pontos: 1910, tipo: "bau", quantidade: 1 },
        { pontos: 1940, tipo: "carta", carta: "cracker", suporte: true },
        { pontos: 1970, tipo: "moedas", quantidade: 220 },
        { pontos: 2000, tipo: "carta", carta: "viajante" },
        { pontos: 2026, tipo: "fim", titulo: "Jornada concluída" }
    ]
};

const RPG_DESCRICOES_CARTAS = {
    guerreiro: "Pode levantar um escudo que anula completamente o próximo ataque recebido.",
    barbaro: "Tropa direta e resistente, sem habilidade especial. Usa vida e dano para pressionar o campo.",
    arqueiro: "Ao atacar, rola o dado: resultados de 1 a 3 concedem +1 de dano; de 4 a 6 concedem +3.",
    goblin: "Na passiva, ao tirar 2, ganha dano dobrado. No especial, ao tirar 1 ou 2, rouba 1 ponto de dano de uma carta do oponente.",
    ork: "Quando é derrotado, transforma-se em dois Goblins que continuam lutando no mesmo lado da arena.",
    curandeiro: "Cura uma carta aliada. Seu especial também pode fortalecer o próprio ataque.",
    necromante: "Ao entrar em campo, invoca duas cartas aleatórias para reforçar o lado do seu dono.",
    cavaleiro: "Seus golpes atingem o alvo principal e cartas próximas. O especial libera uma arma de área ainda maior.",
    triogoblin: "Três Goblins atacam como uma equipe. Ao perder unidades, sua vida e seu dano diminuem.",
    barril: "Protege uma carta aliada como guarda-costas. Ao quebrar, sua passiva pode transformá-lo em um Barril de Goblins ao tirar 3 ou em um Barril de Bárbaro ao tirar 5.",
    barrilbarbaro: "Rola contra um alvo, causa o ataque do barril e depois se quebra, revelando um Bárbaro 2/2.",
    barrilgoblin: "É lançado sobre um alvo e o vincula a três Goblins, que causam dano periódico até serem derrotados.",
    besta: "Concede +1 de ataque por 1 rodada. Quando equipada no Arqueiro, concede +2 de ataque por 1 rodada.",
    cavalotroia: "Não pode ser atacado. Após 2 rodadas, desaparece e causa 1 de dano a todas as cartas inimigas.",
    ladrao: "Rouba vida ou ataque de uma carta inimiga e entrega o atributo retirado a uma carta aliada.",
    bruxo: "Usa poções mágicas para transformar uma carta inimiga ou roubá-la para o próprio lado.",
    mensageiro: "Se tirar 6 no especial, entra em Modo Área e seus ataques passam a causar 2 de dano a todos os inimigos.",
    criador: "Ícaro transforma uma carta em outra; Thiago pode apagar ou desenhar 1 ponto de um atributo.",
    separado: "Escolhe uma parceira e passa a atacar junto dela. Ao tirar 6, o especial fica permanente: a dupla pode atacar dois alvos diferentes em todas as rodadas, começando por qualquer integrante.",
    separado2: "Forma dupla com outra carta e acompanha seus ataques. Ao tirar 6, o ataque dividido fica permanente e pode começar por qualquer integrante; também pode trocar de parceira.",
    incendiario: "Espalha pólvora nos inimigos. Seu ataque atual é dividido igualmente entre duas queimadas; se ganhar ou perder ataque, o dano de cada fogo acompanha a mudança.",
    mago: "Em resultados 1, 4 ou 6, envenena um alvo: ele sofre 0,5 de dano extra por 2 rodadas.",
    triobarbaros: "Três Bárbaros com 3 de vida cada atacam em equipe com dano regressivo: 3, depois 2 e por fim 1.",
    escudo_item: "Entrega a uma tropa aliada um escudo que bloqueia completamente o próximo ataque.",
    fogueira: "Permanece acesa por um período e, ao final do efeito, recupera 1 de vida de todas as tropas aliadas.",
    recuperida: "Poção de cura que concede +1 de vida permanentemente a uma carta aliada.",
    velux: "Concede velocidade a uma carta, permitindo que ela ataque duas vezes na rodada.",
    pocaotraicao: "Faz uma carta inimiga atacar pelas costas uma carta do próprio time.",
    unidao: "Reúne a força dos aliados e adiciona ao seu dano o maior ataque encontrado no próprio campo.",
    ctrlc: "Copia a passiva da última carta usada pelo oponente, mas recebe a cópia com vida e dano reduzidos em 1. Se ela não possuir Especial, tirar 3 no dado concede +1 de dano.",
    ctrlv: "Assim como o Ctrl C, assume a passiva da última carta inimiga usada com redução de 1 nos atributos. Se ela não possuir Especial, tirar 3 no dado concede +1 de dano.",
    Bumerskeleton: "Lança um bumerangue em sequência. O especial pode fazê-lo voltar, incendiar ou congelar os alvos.",
    viajante: "Rebobina o próprio time, restaurando Habilidades, Especiais e Passivas já usadas sem alterar vida ou dano. Sua própria viagem continua sendo de uso único. O especial pode prender uma carta inimiga no tempo.",
    pocaogelo: "Congela uma carta por 1 rodada. Se tirar 5, congela todas as cartas do inimigo.",
    adiv: "Poção ofensiva que remove imediatamente 1 ponto de vida de uma carta escolhida.",
    vampi7: "Ataca junto das tropas aliadas e absorve vida. Com menos de 3 de vida fica intangível enquanto possui aliados. Se for a última carta do time, perde a intangibilidade e recebe +1 de ataque enquanto estiver sozinho.",
    portable: "Por 2 rodadas, dispara junto de qualquer ataque aliado. Quando a bateria termina, cai e sai do campo.",
    plus_life: "Aprimoramento de resistência que concede +2 de vida permanentemente a uma carta aliada.",
    reviverta: "Escolhe uma carta do cemitério e a traz de volta para a mão com os atributos originais.",
    cracker: "Infecta e rouba uma carta adversária. Cartas retiradas do campo voltam com os atributos originais.",
    allsforms: "Todas as tropas do próprio lado recebem +3 de ataque durante 1 rodada.",
    dupliquetion: "Cria na própria mão uma cópia da tropa escolhida com metade da vida e metade do dano atuais.",
    auvex: "Um aprimoramento elétrico que concede +1 de ataque permanente a uma tropa aliada."
};

let rpgProgresso = carregarProgressoRpg();
let rpgCatalogo = [];
let rpgFiltroEra = "todas";
let rpgPartidaPremiada = false;
let rpgObservadorVitoria = null;
let rpgTimerVitoria = null;
let rpgUltimoFocoCarta = null;
let rpgBauAbrindo = false;
let rpgTrocaPendente = null;

function dataLocalRpg() {
    let agora = new Date();
    let ano = agora.getFullYear();
    let mes = String(agora.getMonth() + 1).padStart(2, "0");
    let dia = String(agora.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function progressoInicialRpg() {
    return {
        pontos: 0,
        vitorias: 0,
        derrotas: 0,
        baus: 0,
        moedas: 0,
        colecao: { guerreiro: 1, barbaro: 1, mago: 1, escudo_item: 1 },
        recompensasRecebidas: [],
        dataBaus: dataLocalRpg(),
        bausGanhosHoje: 0,
        comprasLoja: {}
    };
}

function carregarProgressoRpg() {
    let padrao = progressoInicialRpg();
    try {
        let salvo = JSON.parse(localStorage.getItem(RPG_CHAVE_PROGRESSO));
        if (!salvo || typeof salvo !== "object") return padrao;
        let progresso = {
            ...padrao,
            ...salvo,
            pontos: Math.min(RPG_LIMITE_PONTOS, Math.max(0, Number(salvo.pontos) || 0)),
            vitorias: Math.max(0, Number(salvo.vitorias) || 0),
            derrotas: Math.max(0, Number(salvo.derrotas) || 0),
            baus: Math.max(0, Number(salvo.baus) || 0),
            moedas: Math.max(0, Number(salvo.moedas) || 0),
            colecao: { ...padrao.colecao, ...(salvo.colecao || {}) },
            recompensasRecebidas: Array.isArray(salvo.recompensasRecebidas) ? salvo.recompensasRecebidas : [],
            comprasLoja: salvo.comprasLoja && typeof salvo.comprasLoja === "object" ? salvo.comprasLoja : {}
        };
        if (progresso.dataBaus !== dataLocalRpg()) {
            progresso.dataBaus = dataLocalRpg();
            progresso.bausGanhosHoje = 0;
        }
        RPG_CARTAS_INICIAIS.forEach(id => {
            if (!progresso.colecao[id]) progresso.colecao[id] = 1;
        });
        normalizarColecaoVariantesRpg(progresso.colecao);
        return progresso;
    } catch (erro) {
        return padrao;
    }
}

function salvarProgressoRpg() {
    try {
        localStorage.setItem(RPG_CHAVE_PROGRESSO, JSON.stringify(rpgProgresso));
    } catch (erro) {
        console.warn("Não foi possível salvar o progresso local.", erro);
    }
}

function idColecaoCanonicoRpg(idCarta) {
    return RPG_VARIANTE_PARA_PRINCIPAL[idCarta] || idCarta;
}

function grupoVariantesRpg(idCarta) {
    return RPG_GRUPOS_VARIANTES[idColecaoCanonicoRpg(idCarta)] || null;
}

function normalizarColecaoVariantesRpg(colecao) {
    Object.values(RPG_GRUPOS_VARIANTES).forEach(grupo => {
        let maiorQuantidade = Math.max(0, ...grupo.ids.map(id => Number(colecao[id]) || 0));
        if (maiorQuantidade > 0) colecao[grupo.principal] = maiorQuantidade;
        grupo.ids.forEach(id => {
            if (id !== grupo.principal) delete colecao[id];
        });
    });
}

function cartasUnicasPorColecaoRpg(cartas) {
    let vistos = new Set();
    return cartas.filter(carta => {
        let canonico = idColecaoCanonicoRpg(carta.id);
        if (vistos.has(canonico)) return false;
        vistos.add(canonico);
        return true;
    });
}

function nomeCartaExibicaoRpg(cartaOuId) {
    let id = typeof cartaOuId === "string" ? cartaOuId : cartaOuId.id;
    let grupo = grupoVariantesRpg(id);
    if (grupo) return grupo.nome;
    let carta = typeof cartaOuId === "string" ? rpgCatalogo.find(item => item.id === id) : cartaOuId;
    return carta?.nome || "Carta";
}

function atualizarLimiteDiarioRpg() {
    let hoje = dataLocalRpg();
    if (rpgProgresso.dataBaus === hoje) return;
    rpgProgresso.dataBaus = hoje;
    rpgProgresso.bausGanhosHoje = 0;
    salvarProgressoRpg();
}

function eraDaCartaRpg(idCarta) {
    return Object.keys(RPG_ORDEM_CARTAS_ERAS).find(era => RPG_ORDEM_CARTAS_ERAS[era].includes(idCarta)) || "contemporanea";
}

function obterEraAtualRpg(pontos = rpgProgresso.pontos) {
    if (pontos >= RPG_ERAS.contemporanea.inicio) return "contemporanea";
    if (pontos >= RPG_ERAS.moderna.inicio) return "moderna";
    return "medieval";
}

function indiceEraRpg(era) {
    return ["medieval", "moderna", "contemporanea"].indexOf(era);
}

function montarCatalogoRpg() {
    let pontosGarantidos = {};
    Object.values(RPG_MARCOS_ERAS).flat().forEach(marco => {
        if (marco.tipo === "carta") pontosGarantidos[marco.carta] = marco.pontos;
    });

    rpgCatalogo = bancoDeCartas.map(carta => {
        let suporte = typeof suportesReais !== "undefined" && suportesReais.includes(carta.id);
        return {
            ...carta,
            era: eraDaCartaRpg(carta.id),
            pontos: pontosGarantidos[carta.id] ?? null,
            tipo: suporte ? "Suporte / Poção" : "Tropa",
            descricao: RPG_DESCRICOES_CARTAS[carta.id] || "Carta tática com efeito próprio durante a batalha."
        };
    }).sort((a, b) => {
        let era = indiceEraRpg(a.era) - indiceEraRpg(b.era);
        if (era !== 0) return era;
        return RPG_ORDEM_CARTAS_ERAS[a.era].indexOf(a.id) - RPG_ORDEM_CARTAS_ERAS[b.era].indexOf(b.id);
    });
}

function quantidadeCartaRpg(idCarta) {
    let canonico = idColecaoCanonicoRpg(idCarta);
    return Math.max(0, Number(rpgProgresso.colecao[canonico]) || 0);
}

function adicionarCartaColecaoRpg(idCarta, quantidade = 1) {
    let canonico = idColecaoCanonicoRpg(idCarta);
    rpgProgresso.colecao[canonico] = quantidadeCartaRpg(canonico) + quantidade;
}

function marcoChaveRpg(era, marco) {
    return `${era}:${marco.pontos}:${marco.tipo}:${marco.carta || marco.titulo || marco.quantidade || "recompensa"}`;
}

function sincronizarRecompensasGarantidasRpg() {
    Object.entries(RPG_MARCOS_ERAS).forEach(([era, marcos]) => {
        let garantidasDaEra = marcos.filter(marco => marco.tipo === "carta").map(marco => marco.carta);
        marcos.forEach(marco => {
            let chave = marcoChaveRpg(era, marco);
            if (marco.pontos > rpgProgresso.pontos || rpgProgresso.recompensasRecebidas.includes(chave)) return;

            if (marco.tipo === "carta") {
                // Se a carta do marco veio antes num baú ou na loja, entrega outra carta
                // garantida ainda ausente. Assim o marco nunca desperdiça a "carta nova".
                let idPremio = quantidadeCartaRpg(marco.carta) === 0
                    ? marco.carta
                    : garantidasDaEra.find(id => quantidadeCartaRpg(id) === 0);
                adicionarCartaColecaoRpg(idPremio || marco.carta, 1);
            } else if (marco.tipo === "moedas") {
                rpgProgresso.moedas += marco.quantidade;
            } else if (marco.tipo === "bau") {
                // Baús da trilha não consomem o limite de 4 baús ganhos por vitórias no dia.
                rpgProgresso.baus += marco.quantidade || 1;
            }
            rpgProgresso.recompensasRecebidas.push(chave);
        });
    });
    salvarProgressoRpg();
}

function obterProximoMarcoRpg() {
    return Object.values(RPG_MARCOS_ERAS).flat()
        .filter(marco => marco.pontos > rpgProgresso.pontos)
        .sort((a, b) => a.pontos - b.pontos)[0] || null;
}

function tituloMarcoRpg(marco) {
    if (!marco) return "Trilha completa";
    if (marco.tipo === "carta") {
        let carta = rpgCatalogo.find(item => item.id === marco.carta);
        return carta ? nomeCartaExibicaoRpg(carta) : "Nova carta";
    }
    if (marco.tipo === "moedas") return `${marco.quantidade} moedas`;
    if (marco.tipo === "bau") return `${marco.quantidade || 1} ${(marco.quantidade || 1) === 1 ? "baú" : "baús"}`;
    return marco.titulo || "Nova recompensa";
}

function atualizarResumoMenuRpg() {
    atualizarLimiteDiarioRpg();
    sincronizarRecompensasGarantidasRpg();
    let eraId = obterEraAtualRpg();
    let era = RPG_ERAS[eraId];
    let proximo = obterProximoMarcoRpg();
    let marcosPassados = Object.values(RPG_MARCOS_ERAS).flat()
        .filter(marco => marco.pontos <= rpgProgresso.pontos)
        .sort((a, b) => b.pontos - a.pontos);
    let inicioFaixa = marcosPassados[0]?.pontos || 0;
    let tamanhoFaixa = proximo ? Math.max(1, proximo.pontos - inicioFaixa) : 1;
    let progressoFaixa = proximo ? Math.min(100, ((rpgProgresso.pontos - inicioFaixa) / tamanhoFaixa) * 100) : 100;
    let restantesHoje = Math.max(0, RPG_LIMITE_BAUS_DIA - rpgProgresso.bausGanhosHoje);

    document.getElementById("menu-pontos").textContent = rpgProgresso.pontos;
    document.getElementById("menu-moedas").textContent = rpgProgresso.moedas;
    document.getElementById("menu-titulo-era").textContent = era.nome;
    document.getElementById("menu-pontos-atuais").textContent = rpgProgresso.pontos + " pontos";
    document.getElementById("menu-pontos-meta").textContent = proximo ? `Próxima: ${proximo.pontos}` : "Trilha completa";
    document.getElementById("menu-proxima-recompensa").textContent = proximo
        ? `Próxima recompensa: ${tituloMarcoRpg(proximo)}, aos ${proximo.pontos} pontos.`
        : "Todas as recompensas configuradas foram alcançadas.";

    let barra = document.getElementById("menu-barra-progresso");
    barra.style.width = progressoFaixa + "%";
    barra.parentElement.setAttribute("aria-valuenow", String(Math.round(progressoFaixa)));

    document.querySelectorAll(".portal-era").forEach(portal => portal.classList.remove("portal-ativo"));
    document.querySelector(".portal-" + eraId)?.classList.add("portal-ativo");

    document.getElementById("cofre-quantidade-baus").textContent = rpgProgresso.baus;
    document.getElementById("texto-limite-baus-rpg").textContent = restantesHoje > 0
        ? `Você ainda pode conquistar ${restantesHoje} baú(s) hoje.`
        : "O limite de 4 baús de vitória de hoje foi alcançado.";

    let btnBau = document.getElementById("btn-abrir-bau");
    btnBau.disabled = rpgProgresso.baus <= 0;
    btnBau.textContent = rpgProgresso.baus > 0 ? "Abrir um baú" : "Nenhum baú disponível";
    renderizarSlotsBausRpg(restantesHoje);
}

function renderizarSlotsBausRpg(restantesHoje) {
    let slots = document.querySelectorAll(".slot-bau-rpg");
    let preenchidos = Math.min(4, rpgProgresso.baus);
    let extras = Math.max(0, rpgProgresso.baus - 4);

    slots.forEach((slot, indice) => {
        let possuiBau = indice < preenchidos;
        slot.disabled = !possuiBau;
        slot.classList.toggle("slot-bau-preenchido", possuiBau);
        slot.querySelector("small").textContent = possuiBau ? "ABRIR" : "VAZIO";
        slot.setAttribute("aria-label", possuiBau
            ? `Abrir baú do espaço ${indice + 1}`
            : `Espaço de baú ${indice + 1} vazio`);
    });

    let resumo = document.getElementById("texto-baus-inicio-rpg");
    if (!resumo) return;
    let guardados = extras > 0 ? ` Mais ${extras} guardado(s) no cofre.` : "";
    resumo.textContent = `${preenchidos}/4 espaços ocupados. Você ainda pode conquistar ${restantesHoje} hoje.${guardados}`;
}

function iconeMarcoRpg(marco) {
    if (marco.tipo === "carta") return marco.suporte ? "🧪" : "🃏";
    if (marco.tipo === "moedas") return "🪙";
    if (marco.tipo === "bau") return "📦";
    if (marco.tipo === "era") return "🚪";
    if (marco.tipo === "fim") return "🏆";
    return "⚔️";
}

function renderizarLinhaDoTempoRpg() {
    let linha = document.getElementById("linha-tempo-eras");
    linha.innerHTML = "";

    Object.entries(RPG_ERAS).forEach(([eraId, era], indiceEra) => {
        let bloco = document.createElement("article");
        bloco.className = "bloco-era-rpg era-" + eraId;
        let cartasEra = cartasUnicasPorColecaoRpg(rpgCatalogo.filter(carta => carta.era === eraId));
        let liberadas = cartasEra.filter(carta => quantidadeCartaRpg(carta.id) > 0).length;

        bloco.innerHTML = `
            <header>
                <span class="icone-bloco-era">${era.icone}</span>
                <div><small>ERA ${indiceEra + 1}</small><h3>${era.nome}</h3><p>${era.texto}</p></div>
                <strong>${liberadas}/${cartasEra.length}</strong>
            </header>
            <div class="trilha-recompensas-era"></div>
        `;

        let trilha = bloco.querySelector(".trilha-recompensas-era");
        RPG_MARCOS_ERAS[eraId].forEach(marco => {
            let recebido = marco.pontos <= rpgProgresso.pontos;
            let carta = marco.carta ? rpgCatalogo.find(item => item.id === marco.carta) : null;
            let item = document.createElement("div");
            item.className = "marco-carta-era" + (recebido ? " marco-liberado" : " marco-bloqueado");
            item.innerHTML = `
                <span class="ponto-linha-era">${recebido ? "✓" : "🔒"}</span>
                ${carta ? `<img src="${carta.img}" alt="">` : `<span class="icone-premio-era">${iconeMarcoRpg(marco)}</span>`}
                <strong>${carta ? nomeCartaExibicaoRpg(carta) : tituloMarcoRpg(marco)}</strong>
                <small>${marco.pontos} pts${marco.suporte ? " · suporte" : ""}</small>
            `;
            trilha.appendChild(item);
        });
        linha.appendChild(bloco);
    });
}

function renderizarColecaoRpg() {
    let termo = document.getElementById("busca-cartas-rpg").value.trim().toLocaleLowerCase("pt-BR");
    let catalogoVisual = cartasUnicasPorColecaoRpg(rpgCatalogo);
    let filtradas = catalogoVisual.filter(carta => {
        let combinaEra = rpgFiltroEra === "todas" || carta.era === rpgFiltroEra;
        let grupo = grupoVariantesRpg(carta.id);
        let variantes = grupo
            ? grupo.ids.map(id => rpgCatalogo.find(item => item.id === id)).filter(Boolean)
            : [carta];
        let textoBusca = [
            nomeCartaExibicaoRpg(carta),
            grupo?.descricao || carta.descricao,
            ...variantes.flatMap(variante => [variante.nome, variante.descricao])
        ].join(" ").toLocaleLowerCase("pt-BR");
        let combinaBusca = !termo || textoBusca.includes(termo);
        return combinaEra && combinaBusca;
    });

    let grade = document.getElementById("grade-colecao-rpg");
    grade.innerHTML = "";

    filtradas.forEach(carta => {
        let quantidade = quantidadeCartaRpg(carta.id);
        let liberada = quantidade > 0;
        let grupo = grupoVariantesRpg(carta.id);
        let nomeExibicao = nomeCartaExibicaoRpg(carta);
        let descricao = grupo?.descricao || carta.descricao;
        let item = document.createElement("article");
        item.className = "carta-colecao-rpg" + (liberada ? " carta-colecao-liberada" : " carta-colecao-bloqueada");
        item.tabIndex = 0;
        item.setAttribute("role", "button");
        item.setAttribute("aria-label", `Abrir detalhes de ${nomeExibicao}`);
        let requisito = carta.pontos !== null ? `${carta.pontos} pts` : "Baú ou loja";
        item.innerHTML = `
            <div class="imagem-carta-colecao">
                <img src="${carta.img}" alt="Ilustração da carta ${nomeExibicao}">
                ${grupo ? `<span class="selo-variacoes-carta-rpg">2 variações</span>` : ""}
                ${liberada ? `<span class="selo-carta-liberada">x${quantidade}</span>` : `<span class="selo-carta-bloqueada">🔒 ${requisito}</span>`}
            </div>
            <div class="conteudo-carta-colecao">
                <div class="topo-carta-colecao"><span>${RPG_ERAS[carta.era].nome.replace("Era ", "")}</span><small>${carta.tipo}</small></div>
                <h3>${nomeExibicao}</h3>
                ${carta.tipo === "Tropa" ? `<div class="atributos-carta-colecao"><span>❤️ ${carta.vida}</span><span>⚔️ ${carta.dano}</span></div>` : ""}
                <p>${descricao}</p>
                <span class="acao-detalhes-carta-rpg">Ver carta completa</span>
            </div>
        `;
        item.addEventListener("click", () => abrirDetalhesCartaRpg(carta.id, item));
        item.addEventListener("keydown", evento => {
            if (evento.key !== "Enter" && evento.key !== " ") return;
            evento.preventDefault();
            abrirDetalhesCartaRpg(carta.id, item);
        });
        grade.appendChild(item);
    });

    let possuidas = catalogoVisual.filter(carta => quantidadeCartaRpg(carta.id) > 0).length;
    document.getElementById("resultado-colecao-rpg").textContent = `${filtradas.length} carta(s) encontrada(s) · ${possuidas}/${catalogoVisual.length} possuídas`;
}

function abrirDetalhesCartaRpg(idCarta, elementoOrigem = null) {
    let canonico = idColecaoCanonicoRpg(idCarta);
    let carta = rpgCatalogo.find(item => item.id === canonico);
    if (!carta) return;

    let grupo = grupoVariantesRpg(canonico);
    let variantes = grupo
        ? grupo.ids.map(id => rpgCatalogo.find(item => item.id === id)).filter(Boolean)
        : [carta];
    let quantidade = quantidadeCartaRpg(canonico);
    let liberada = quantidade > 0;
    let requisito = carta.pontos !== null ? `Desbloqueio garantido aos ${carta.pontos} pontos.` : "Pode ser encontrada em baús ou na loja.";
    let nomeExibicao = nomeCartaExibicaoRpg(carta);
    let descricao = grupo?.descricao || carta.descricao;
    let modal = document.getElementById("modal-carta-rpg");
    let conteudo = document.getElementById("conteudo-modal-carta-rpg");

    rpgUltimoFocoCarta = elementoOrigem || document.activeElement;
    conteudo.innerHTML = `
        <header class="cabecalho-modal-carta-rpg">
            <span>${RPG_ERAS[carta.era].nome} · ${carta.tipo}</span>
            <h2 id="titulo-modal-carta-rpg">${nomeExibicao}</h2>
            <p class="estado-modal-carta-rpg ${liberada ? "estado-liberado-rpg" : "estado-bloqueado-rpg"}">
                ${liberada ? `✓ Desbloqueada · x${quantidade} na coleção` : `🔒 Ainda bloqueada · ${requisito}`}
            </p>
        </header>
        <div class="corpo-modal-carta-rpg">
            <div class="variantes-modal-carta-rpg ${variantes.length > 1 ? "possui-duas-variantes-rpg" : ""}">
                ${variantes.map(variante => `
                    <figure>
                        <img src="${variante.img}" alt="Carta ${variante.nome}">
                        ${variantes.length > 1 ? `<figcaption>${variante.nome}</figcaption>` : ""}
                    </figure>
                `).join("")}
            </div>
            <div class="descricao-modal-carta-rpg">
                ${carta.tipo === "Tropa" ? `
                    <div class="atributos-modal-carta-rpg">
                        ${variantes.map(variante => `
                            <div>
                                ${variantes.length > 1 ? `<small>${variante.nome}</small>` : ""}
                                <span>❤️ ${variante.vida} de vida</span>
                                <span>⚔️ ${variante.dano} de dano</span>
                            </div>
                        `).join("")}
                    </div>
                ` : ""}
                <span class="rotulo-descricao-modal-rpg">COMO FUNCIONA</span>
                <p>${descricao}</p>
                ${grupo ? `<div class="aviso-variantes-modal-rpg">Um único desbloqueio libera as duas variações. Elas contam como uma só carta na coleção, nos baús e na loja.</div>` : ""}
                ${liberada ? "" : `<small class="requisito-modal-carta-rpg">${requisito}</small>`}
            </div>
        </div>
    `;
    modal.hidden = false;
    document.body.classList.add("modal-carta-aberto-rpg");
    document.getElementById("fechar-modal-carta-rpg").focus();
}

function fecharDetalhesCartaRpg() {
    let modal = document.getElementById("modal-carta-rpg");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("modal-carta-aberto-rpg");
    if (rpgUltimoFocoCarta && typeof rpgUltimoFocoCarta.focus === "function") rpgUltimoFocoCarta.focus();
    rpgUltimoFocoCarta = null;
}

function cartasPermitidasNaEraRpg() {
    let eraAtual = obterEraAtualRpg();
    let limite = indiceEraRpg(eraAtual);
    return cartasUnicasPorColecaoRpg(rpgCatalogo.filter(carta => indiceEraRpg(carta.era) <= limite));
}

function escolherAleatorioRpg(lista) {
    return lista.length ? lista[Math.floor(Math.random() * lista.length)] : null;
}

function mostrarMensagemBauRpg(texto) {
    ["mensagem-bau-rpg", "mensagem-baus-inicio-rpg"].forEach(id => {
        let elemento = document.getElementById(id);
        if (elemento) elemento.textContent = texto;
    });
}

function textoPremioBauRpg(premio) {
    return premio?.texto || "O baú foi aberto!";
}

function mostrarAberturaBauRpg(premio, { supremo = false, era = null } = {}) {
    document.querySelector(".abertura-bau-rpg")?.remove();
    rpgBauAbrindo = true;

    let overlay = document.createElement("div");
    overlay.className = `abertura-bau-rpg${supremo ? " abertura-bau-supremo-rpg" : ""}`;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "titulo-premio-bau-rpg");

    let nomeEra = era && RPG_ERAS[era]
        ? RPG_ERAS[era].nome.toUpperCase()
        : supremo ? "BAÚ SUPREMO" : RPG_ERAS[obterEraAtualRpg()].nome.toUpperCase();
    let visualPremio = premio.tipo === "carta"
        ? `<img src="${premio.imagem}" alt="Carta ${premio.titulo}">`
        : `<span class="icone-premio-bau-rpg" aria-hidden="true">${premio.icone || "🪙"}</span>`;

    overlay.innerHTML = `
        <div class="palco-abertura-bau-rpg">
            <button type="button" class="btn-pular-bau-rpg" aria-label="Pular animação do baú">Pular</button>
            <span class="etiqueta-abertura-bau-rpg">${nomeEra}</span>
            <div class="luz-abertura-bau-rpg" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
            <div class="bau-animado-rpg" aria-hidden="true">
                <img src="fotos/bau-recompensa.png" alt="">
                <span class="feixe-bau-rpg"></span>
            </div>
            <article class="premio-revelado-bau-rpg">
                <small>${premio.etiqueta}</small>
                <div class="visual-premio-bau-rpg">${visualPremio}</div>
                <h2 id="titulo-premio-bau-rpg">${premio.titulo}</h2>
                <p>${premio.descricao}</p>
                <button type="button" class="btn-continuar-bau-rpg">Continuar</button>
            </article>
        </div>
    `;

    let revelou = false;
    let timers = [];
    let btnPular = overlay.querySelector(".btn-pular-bau-rpg");
    let btnContinuar = overlay.querySelector(".btn-continuar-bau-rpg");

    function revelarPremio() {
        if (revelou) return;
        revelou = true;
        timers.forEach(clearTimeout);
        overlay.classList.add("bau-estourou-rpg", "premio-visivel-rpg");
        btnPular.hidden = true;
        setTimeout(() => btnContinuar.focus(), 80);
    }

    function fecharAbertura() {
        if (!revelou) return revelarPremio();
        overlay.classList.add("abertura-bau-saindo-rpg");
        document.body.classList.remove("modal-bau-aberto-rpg");
        rpgBauAbrindo = false;
        setTimeout(() => overlay.remove(), 240);
    }

    btnPular.addEventListener("click", revelarPremio);
    btnContinuar.addEventListener("click", fecharAbertura);
    overlay.addEventListener("click", evento => {
        if (evento.target === overlay && revelou) fecharAbertura();
    });
    overlay.addEventListener("keydown", evento => {
        if (evento.key === "Escape") fecharAbertura();
    });

    document.body.appendChild(overlay);
    document.body.classList.add("modal-bau-aberto-rpg");
    btnPular.focus();
    requestAnimationFrame(() => overlay.classList.add("bau-entrou-rpg"));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        revelarPremio();
    } else {
        timers.push(setTimeout(() => overlay.classList.add("bau-prestes-abrir-rpg"), 560));
        timers.push(setTimeout(revelarPremio, 1220));
    }
}

function concederPremioBauRpg({ era = null, supremo = false } = {}) {
    let permitidas = supremo
        ? [...rpgCatalogo]
        : era
            ? rpgCatalogo.filter(carta => carta.era === era)
            : cartasPermitidasNaEraRpg();
    permitidas = cartasUnicasPorColecaoRpg(permitidas);
    let novas = permitidas.filter(carta => quantidadeCartaRpg(carta.id) === 0);
    let repetidas = permitidas.filter(carta => quantidadeCartaRpg(carta.id) > 0);
    let sorteio = Math.random();

    if (sorteio < (supremo ? 0.3 : 0.4) || (novas.length === 0 && repetidas.length === 0)) {
        let minimo = supremo ? 350 : 45;
        let variacao = supremo ? 451 : 56;
        let moedas = minimo + Math.floor(Math.random() * variacao);
        rpgProgresso.moedas += moedas;
        return {
            tipo: "moedas",
            icone: "🪙",
            etiqueta: "MOEDAS",
            titulo: `${moedas} moedas`,
            descricao: "As moedas foram adicionadas ao seu saldo.",
            texto: `🪙 O baú trouxe ${moedas} moedas!`
        };
    }

    if (sorteio < (supremo ? 0.72 : 0.75) && novas.length > 0) {
        let carta = escolherAleatorioRpg(novas);
        adicionarCartaColecaoRpg(carta.id, 1);
        return {
            tipo: "carta",
            imagem: carta.img,
            etiqueta: "NOVA CARTA",
            titulo: nomeCartaExibicaoRpg(carta),
            descricao: "Ela foi desbloqueada e adicionada à sua coleção.",
            texto: `✨ Nova carta: ${nomeCartaExibicaoRpg(carta)}!`
        };
    }

    let carta = escolherAleatorioRpg(repetidas.length ? repetidas : novas);
    if (!carta) {
        let moedas = supremo ? 500 : 60;
        rpgProgresso.moedas += moedas;
        return {
            tipo: "moedas",
            icone: "🪙",
            etiqueta: "MOEDAS",
            titulo: `${moedas} moedas`,
            descricao: "As moedas foram adicionadas ao seu saldo.",
            texto: `🪙 O baú trouxe ${moedas} moedas!`
        };
    }

    let quantidade = supremo ? 2 : 1;
    adicionarCartaColecaoRpg(carta.id, quantidade);
    let total = quantidadeCartaRpg(carta.id);
    let ehNova = total === quantidade;
    return {
        tipo: "carta",
        imagem: carta.img,
        etiqueta: ehNova ? "NOVA CARTA" : quantidade > 1 ? `+${quantidade} CÓPIAS` : "CARTA REPETIDA",
        titulo: nomeCartaExibicaoRpg(carta),
        descricao: ehNova
            ? "Ela foi desbloqueada e adicionada à sua coleção."
            : `Agora você possui ${total} cópia(s) desta carta.`,
        texto: ehNova
            ? `✨ Nova carta: ${nomeCartaExibicaoRpg(carta)}!`
            : `🃏 ${quantidade} cópia(s) de ${nomeCartaExibicaoRpg(carta)}! Agora está x${total}.`
    };
}

function abrirBauRpg(evento) {
    let slotClicado = evento?.currentTarget?.classList?.contains("slot-bau-rpg")
        ? evento.currentTarget
        : null;
    if (rpgProgresso.baus <= 0) {
        mostrarMensagemBauRpg("Vença uma partida 1v1 para conquistar seu próximo baú.");
        return;
    }
    if (rpgBauAbrindo) return;

    rpgProgresso.baus--;
    let premio = concederPremioBauRpg();

    salvarProgressoRpg();
    atualizarResumoMenuRpg();
    renderizarColecaoRpg();
    renderizarLojaRpg();
    mostrarMensagemBauRpg(textoPremioBauRpg(premio));

    let bau = slotClicado || document.querySelector(".bau-principal-rpg");
    let classeAnimacao = slotClicado ? "slot-bau-abrindo" : "bau-abrindo";
    bau.classList.remove(classeAnimacao);
    void bau.offsetWidth;
    bau.classList.add(classeAnimacao);
    mostrarAberturaBauRpg(premio);
}

function hashRpg(texto) {
    let valor = 2166136261;
    for (let i = 0; i < texto.length; i++) {
        valor ^= texto.charCodeAt(i);
        valor = Math.imul(valor, 16777619);
    }
    return valor >>> 0;
}

function ofertasLojaRpg() {
    let data = dataLocalRpg();
    let eraAtual = obterEraAtualRpg();
    let cartasPossuidas = cartasUnicasPorColecaoRpg(rpgCatalogo)
        .filter(carta => quantidadeCartaRpg(carta.id) > 0)
        .map(carta => ({ carta, ordem: hashRpg(data + ":carta:" + carta.id) }))
        .sort((a, b) => a.ordem - b.ordem);
    let cartaDoDia = cartasPossuidas[0]?.carta || rpgCatalogo.find(carta => carta.id === "guerreiro");
    let precoCarta = cartaDoDia.era === eraAtual
        ? RPG_PRECOS_LOJA.cartaEraAtual
        : RPG_PRECOS_LOJA.cartaOutraEra;

    let ofertas = [
        {
            id: "presente-diario",
            tipo: "gratis",
            etiqueta: "GRÁTIS UMA VEZ POR DIA",
            titulo: "Presente diário",
            descricao: "Pode trazer moedas ou um baú.",
            icone: "🎁",
            preco: 0
        },
        {
            id: `carta-${cartaDoDia.id}`,
            tipo: "carta",
            etiqueta: "CARTA JÁ DESCOBERTA",
            titulo: nomeCartaExibicaoRpg(cartaDoDia),
            descricao: `Mais 1 cópia · na coleção: x${quantidadeCartaRpg(cartaDoDia.id)}`,
            carta: cartaDoDia,
            preco: precoCarta
        }
    ];

    Object.keys(RPG_ERAS).forEach(era => {
        let distancia = indiceEraRpg(era) - indiceEraRpg(eraAtual);
        let preco = distancia === 0
            ? RPG_PRECOS_LOJA.bauEraAtual
            : distancia > 0
                ? RPG_PRECOS_LOJA.bauEraFutura
                : RPG_PRECOS_LOJA.bauOutraEra;
        ofertas.push({
            id: `bau-${era}`,
            tipo: "bau-era",
            era,
            etiqueta: RPG_ERAS[era].nome,
            titulo: `Baú ${RPG_ERAS[era].nome.replace("Era ", "")}`,
            descricao: distancia === 0 ? "Baú da sua era · preço reduzido" : "Pode trazer cartas desta era",
            imagem: "fotos/bau-recompensa.png",
            preco
        });
    });

    ofertas.push({
        id: "bau-supremo",
        tipo: "bau-supremo",
        etiqueta: "QUALQUER ERA",
        titulo: "Baú Supremo",
        descricao: "Pode trazer qualquer carta ou uma grande quantidade de moedas.",
        imagem: "fotos/bau-recompensa.png",
        preco: RPG_PRECOS_LOJA.bauSupremo
    });
    return ofertas;
}

function registrarCompraLojaRpg(idOferta) {
    let data = dataLocalRpg();
    let comprasHoje = rpgProgresso.comprasLoja[data] || [];
    rpgProgresso.comprasLoja[data] = [...comprasHoje, idOferta];
}

function comprarOfertaLojaRpg(oferta) {
    let data = dataLocalRpg();
    let comprasHoje = rpgProgresso.comprasLoja[data] || [];
    let mensagem = document.getElementById("mensagem-loja-rpg");
    if (comprasHoje.includes(oferta.id)) {
        mensagem.textContent = "Essa oferta já foi resgatada hoje.";
        return;
    }
    if (oferta.preco > 0 && rpgProgresso.moedas < oferta.preco) {
        mensagem.textContent = "Moedas insuficientes. Abra baús para conseguir mais.";
        return;
    }

    let textoResultado = "";
    let premioBau = null;
    if (oferta.tipo === "gratis") {
        let resultadoGratis = hashRpg(data + ":presente") % 2;
        if (resultadoGratis === 0) {
            let moedas = 55 + (hashRpg(data + ":moedas") % 46);
            rpgProgresso.moedas += moedas;
            textoResultado = `🎁 O presente trouxe ${moedas} moedas!`;
        } else {
            rpgProgresso.baus++;
            textoResultado = "🎁 O presente trouxe 1 baú! Ele foi colocado nos espaços da tela inicial.";
        }
    } else {
        rpgProgresso.moedas -= oferta.preco;
        if (oferta.tipo === "carta") {
            adicionarCartaColecaoRpg(oferta.carta.id, 1);
            textoResultado = `🃏 Você comprou mais 1 cópia de ${nomeCartaExibicaoRpg(oferta.carta)}.`;
        } else if (oferta.tipo === "bau-era") {
            premioBau = concederPremioBauRpg({ era: oferta.era });
            textoResultado = `📦 ${oferta.titulo} aberto: ${textoPremioBauRpg(premioBau)}`;
        } else if (oferta.tipo === "bau-supremo") {
            premioBau = concederPremioBauRpg({ supremo: true });
            textoResultado = `👑 Baú Supremo aberto: ${textoPremioBauRpg(premioBau)}`;
        }
    }

    registrarCompraLojaRpg(oferta.id);
    salvarProgressoRpg();
    atualizarResumoMenuRpg();
    renderizarColecaoRpg();
    renderizarLojaRpg();
    document.getElementById("mensagem-loja-rpg").textContent = textoResultado;
    if (premioBau) {
        mostrarAberturaBauRpg(premioBau, {
            era: oferta.era || null,
            supremo: oferta.tipo === "bau-supremo"
        });
    }
}

function renderizarLojaRpg() {
    let grade = document.getElementById("grade-loja-rpg");
    if (!grade) return;
    let data = dataLocalRpg();
    let comprasHoje = rpgProgresso.comprasLoja[data] || [];
    grade.innerHTML = "";

    ofertasLojaRpg().forEach(ofertaLoja => {
        let comprada = comprasHoje.includes(ofertaLoja.id);
        let oferta = document.createElement("article");
        oferta.className = `oferta-loja-rpg oferta-${ofertaLoja.tipo}-rpg${ofertaLoja.era ? ` loja-era-${ofertaLoja.era}` : ""}${comprada ? " oferta-comprada-rpg" : ""}`;
        let visual = ofertaLoja.carta
            ? `<img src="${ofertaLoja.carta.img}" alt="Carta ${ofertaLoja.carta.nome}">`
            : ofertaLoja.imagem
                ? `<img src="${ofertaLoja.imagem}" alt="">`
                : `<span class="icone-oferta-loja-rpg" aria-hidden="true">${ofertaLoja.icone}</span>`;
        oferta.innerHTML = `
            <span class="era-oferta-rpg">${ofertaLoja.etiqueta}</span>
            ${visual}
            <h3>${ofertaLoja.titulo}</h3>
            <p>${ofertaLoja.descricao}</p>
            <button type="button" ${comprada ? "disabled" : ""}>${comprada ? "Resgatado" : ofertaLoja.preco === 0 ? "Resgatar grátis" : `🪙 ${ofertaLoja.preco}`}</button>
        `;
        oferta.querySelector("button").addEventListener("click", () => comprarOfertaLojaRpg(ofertaLoja));
        grade.appendChild(oferta);
    });
    renderizarTrocasRepetidasRpg();
}

function novasCartasParaTrocaRpg() {
    return cartasUnicasPorColecaoRpg(cartasPermitidasNaEraRpg())
        .filter(carta => quantidadeCartaRpg(carta.id) === 0);
}

function fecharEscolhaTrocaRpg() {
    let modal = document.querySelector(".modal-troca-rpg");
    let focoAnterior = rpgTrocaPendente?.focoAnterior;
    if (modal) modal.remove();
    document.body.classList.remove("modal-troca-aberto-rpg");
    rpgTrocaPendente = null;
    if (focoAnterior && typeof focoAnterior.focus === "function" && document.body.contains(focoAnterior)) {
        focoAnterior.focus();
    }
}

function confirmarTrocaRepetidasRpg(idCartaNova) {
    if (!rpgTrocaPendente) return;
    let { idCartaOrigem } = rpgTrocaPendente;
    let mensagem = document.getElementById("mensagem-troca-rpg");
    let quantidadeAtual = quantidadeCartaRpg(idCartaOrigem);
    let nova = novasCartasParaTrocaRpg().find(carta => idColecaoCanonicoRpg(carta.id) === idColecaoCanonicoRpg(idCartaNova));

    if (quantidadeAtual < RPG_COPIAS_EXTRAS_PARA_TROCA + 1) {
        fecharEscolhaTrocaRpg();
        mensagem.textContent = `Você precisa manter 1 carta e juntar ${RPG_COPIAS_EXTRAS_PARA_TROCA} cópias extras.`;
        return;
    }
    if (!nova) {
        fecharEscolhaTrocaRpg();
        mensagem.textContent = "Essa carta não está mais disponível para a troca. Escolha novamente.";
        renderizarTrocasRepetidasRpg();
        return;
    }

    let origem = rpgCatalogo.find(carta => carta.id === idCartaOrigem);
    let idCanonicoOrigem = idColecaoCanonicoRpg(idCartaOrigem);
    rpgProgresso.colecao[idCanonicoOrigem] = quantidadeAtual - RPG_COPIAS_EXTRAS_PARA_TROCA;
    adicionarCartaColecaoRpg(nova.id, 1);
    fecharEscolhaTrocaRpg();
    salvarProgressoRpg();
    atualizarResumoMenuRpg();
    renderizarColecaoRpg();
    renderizarLojaRpg();
    document.getElementById("mensagem-troca-rpg").textContent = `✨ Você escolheu ${nomeCartaExibicaoRpg(nova)}! ${RPG_COPIAS_EXTRAS_PARA_TROCA} cópias extras de ${nomeCartaExibicaoRpg(origem)} foram usadas na troca.`;
}

function abrirEscolhaTrocaRpg(idCartaOrigem, focoAnterior = document.activeElement) {
    let mensagem = document.getElementById("mensagem-troca-rpg");
    let quantidadeAtual = quantidadeCartaRpg(idCartaOrigem);
    if (quantidadeAtual < RPG_COPIAS_EXTRAS_PARA_TROCA + 1) {
        mensagem.textContent = `Você precisa manter 1 carta e juntar ${RPG_COPIAS_EXTRAS_PARA_TROCA} cópias extras.`;
        return;
    }

    let novasPossiveis = novasCartasParaTrocaRpg();
    if (novasPossiveis.length === 0) {
        mensagem.textContent = "Você já descobriu todas as cartas disponíveis nas eras alcançadas.";
        return;
    }

    let origem = rpgCatalogo.find(carta => carta.id === idCartaOrigem);
    fecharEscolhaTrocaRpg();
    rpgTrocaPendente = { idCartaOrigem, focoAnterior, idCartaNova: null };

    let modal = document.createElement("div");
    modal.className = "modal-troca-rpg";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "titulo-escolha-troca-rpg");
    modal.innerHTML = `
        <article class="modal-troca-conteudo-rpg">
            <button type="button" class="fechar-modal-troca-rpg" aria-label="Cancelar troca">×</button>
            <span class="etiqueta-menu">TROCA DE CARTAS</span>
            <h2 id="titulo-escolha-troca-rpg">Escolha sua nova carta</h2>
            <p class="resumo-troca-rpg">Você entregará ${RPG_COPIAS_EXTRAS_PARA_TROCA} cópias extras de <strong>${nomeCartaExibicaoRpg(origem)}</strong>. A cópia principal continuará na coleção.</p>
            <div class="opcoes-troca-rpg" role="listbox" aria-label="Cartas disponíveis para receber"></div>
            <p class="selecao-troca-rpg" aria-live="polite">Selecione uma carta para continuar.</p>
            <div class="acoes-modal-troca-rpg">
                <button type="button" class="cancelar-troca-rpg">Cancelar</button>
                <button type="button" class="confirmar-troca-rpg" disabled>Confirmar troca</button>
            </div>
        </article>
    `;

    let grade = modal.querySelector(".opcoes-troca-rpg");
    let confirmar = modal.querySelector(".confirmar-troca-rpg");
    let textoSelecao = modal.querySelector(".selecao-troca-rpg");
    novasPossiveis.forEach(carta => {
        let opcao = document.createElement("button");
        opcao.type = "button";
        opcao.className = "opcao-troca-rpg";
        opcao.setAttribute("role", "option");
        opcao.setAttribute("aria-selected", "false");
        opcao.innerHTML = `
            <img src="${carta.img}" alt="">
            <strong>${nomeCartaExibicaoRpg(carta)}</strong>
            <small>${RPG_ERAS[carta.era]?.nome || carta.era}</small>
            <span>Escolher</span>
        `;
        opcao.addEventListener("click", () => {
            modal.querySelectorAll(".opcao-troca-rpg").forEach(item => {
                let selecionada = item === opcao;
                item.classList.toggle("selecionada", selecionada);
                item.setAttribute("aria-selected", String(selecionada));
            });
            rpgTrocaPendente.idCartaNova = carta.id;
            textoSelecao.textContent = `${nomeCartaExibicaoRpg(carta)} será adicionada à sua coleção.`;
            confirmar.disabled = false;
        });
        grade.appendChild(opcao);
    });

    modal.querySelector(".fechar-modal-troca-rpg").addEventListener("click", fecharEscolhaTrocaRpg);
    modal.querySelector(".cancelar-troca-rpg").addEventListener("click", fecharEscolhaTrocaRpg);
    confirmar.addEventListener("click", () => {
        if (rpgTrocaPendente?.idCartaNova) confirmarTrocaRepetidasRpg(rpgTrocaPendente.idCartaNova);
    });
    modal.addEventListener("click", evento => {
        if (evento.target === modal) fecharEscolhaTrocaRpg();
    });
    modal.addEventListener("keydown", evento => {
        if (evento.key === "Escape") fecharEscolhaTrocaRpg();
    });

    document.body.appendChild(modal);
    document.body.classList.add("modal-troca-aberto-rpg");
    modal.querySelector(".opcao-troca-rpg").focus();
}

function renderizarTrocasRepetidasRpg() {
    let lista = document.getElementById("lista-trocas-rpg");
    if (!lista) return;
    let elegiveis = cartasUnicasPorColecaoRpg(rpgCatalogo).filter(carta => quantidadeCartaRpg(carta.id) >= RPG_COPIAS_EXTRAS_PARA_TROCA + 1);
    let existemNovas = cartasPermitidasNaEraRpg().some(carta => quantidadeCartaRpg(carta.id) === 0);
    lista.innerHTML = "";

    if (elegiveis.length === 0 || !existemNovas) {
        let vazio = document.createElement("p");
        vazio.className = "troca-repetidas-vazia-rpg";
        vazio.textContent = !existemNovas
            ? "Todas as cartas disponíveis já foram descobertas."
            : `Nenhuma carta possui ${RPG_COPIAS_EXTRAS_PARA_TROCA} cópias extras ainda.`;
        lista.appendChild(vazio);
        return;
    }

    elegiveis.forEach(carta => {
        let item = document.createElement("article");
        item.innerHTML = `
            <img src="${carta.img}" alt="Carta ${nomeCartaExibicaoRpg(carta)}">
            <div><strong>${nomeCartaExibicaoRpg(carta)}</strong><small>x${quantidadeCartaRpg(carta.id)} na coleção</small></div>
            <button type="button">Trocar ${RPG_COPIAS_EXTRAS_PARA_TROCA}</button>
        `;
        item.querySelector("button").addEventListener("click", evento => abrirEscolhaTrocaRpg(carta.id, evento.currentTarget));
        lista.appendChild(item);
    });
}

function abrirPaginaMenuRpg(pagina) {
    document.querySelectorAll(".pagina-menu-rpg").forEach(secao => {
        let ativa = secao.dataset.pagina === pagina;
        secao.hidden = !ativa;
        secao.classList.toggle("pagina-menu-ativa", ativa);
    });
    document.querySelectorAll(".navegacao-menu-rpg button[data-pagina-alvo]").forEach(botao => {
        botao.classList.toggle("nav-menu-ativo", botao.dataset.paginaAlvo === pagina);
    });
    if (pagina === "eras") renderizarLinhaDoTempoRpg();
    if (pagina === "cartas") renderizarColecaoRpg();
    if (pagina === "loja") renderizarLojaRpg();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function iniciarPartidaPeloMenuRpg(modo) {
    if (modo === "pve-dupla") return;
    window.rpgModoAtual = modo;
    rpgPartidaPremiada = false;

    document.getElementById("tela-inicio-rpg").hidden = true;
    let arena = document.getElementById("container-principal");
    arena.classList.remove("arena-oculta");
    arena.setAttribute("aria-hidden", "false");
    document.body.classList.remove("tela-inicio-ativa");

    let nomes = {
        pvp: "Player vs Player",
        "pve-solo": "Player vs Inimigo · 1v1",
        "pve-monstro-solo": "Invasão do Monstro · Ondas"
    };
    document.getElementById("nome-modo-partida").textContent = nomes[modo] || "Arena";
    iniciarJogo();
    instalarObservadorVitoriaRpg();
}

function quantidadeCartasDoLadoRpg(lado) {
    return document.querySelectorAll(`#campo-${lado} > div[id^='pacote-'], #mao-${lado} > div[id^='pacote-']`).length;
}

function instalarObservadorVitoriaRpg() {
    if (rpgObservadorVitoria) rpgObservadorVitoria.disconnect();
    rpgObservadorVitoria = new MutationObserver(() => {
        clearTimeout(rpgTimerVitoria);
        rpgTimerVitoria = setTimeout(verificarVitoriaRpg, 320);
    });
    ["campo-j1", "mao-j1", "campo-j2", "mao-j2"].forEach(id => {
        let alvo = document.getElementById(id);
        if (alvo) rpgObservadorVitoria.observe(alvo, { childList: true });
    });
}

function verificarVitoriaRpg() {
    if (rpgPartidaPremiada || typeof jogoIniciado === "undefined" || !jogoIniciado || faseAbertura) return;
    if (typeof window.rpgModoInimigoAtualizarEstado === "function") {
        window.rpgModoInimigoAtualizarEstado();
    }
    let cartasJ1 = quantidadeCartasDoLadoRpg("j1");
    let cartasJ2 = quantidadeCartasDoLadoRpg("j2");
    let monstroAindaTemCartas = typeof window.rpgModoInimigoAindaTemCartas === "function"
        && window.rpgModoInimigoOndasAtivo()
        && window.rpgModoInimigoAindaTemCartas();
    if (cartasJ1 > 0 && cartasJ2 === 0 && !monstroAindaTemCartas) registrarVitoriaRpg("j1");
    else if (cartasJ2 > 0 && cartasJ1 === 0) registrarVitoriaRpg("j2");
}

function registrarVitoriaRpg(ladoVencedor) {
    if (rpgPartidaPremiada) return;
    rpgPartidaPremiada = true;
    jogoIniciado = false;
    if (rpgObservadorVitoria) rpgObservadorVitoria.disconnect();

    atualizarLimiteDiarioRpg();
    let modoPontuado = window.rpgModoAtual === "pvp"
        || window.rpgModoAtual === "pve-solo"
        || window.rpgModoAtual === "pve-monstro-solo";
    let jogadorVenceu = ladoVencedor === "j1";
    let modoInvasao = window.rpgModoAtual === "pve-monstro-solo";
    let bauRecebido = false;
    let pontosAlterados = 0;
    let recompensaInvasao = modoInvasao
        && typeof window.rpgModoInimigoObterRecompensaTrofeus === "function"
        ? window.rpgModoInimigoObterRecompensaTrofeus(jogadorVenceu)
        : null;

    if (modoPontuado) {
        let pontosAntes = rpgProgresso.pontos;
        let ajustePontos = recompensaInvasao
            ? recompensaInvasao.valor
            : (jogadorVenceu ? RPG_PONTOS_VITORIA : -RPG_PONTOS_DERROTA);
        rpgProgresso.pontos = Math.min(
            RPG_LIMITE_PONTOS,
            Math.max(0, rpgProgresso.pontos + ajustePontos)
        );
        pontosAlterados = rpgProgresso.pontos - pontosAntes;

        if (jogadorVenceu) {
            rpgProgresso.vitorias++;
            if (rpgProgresso.bausGanhosHoje < RPG_LIMITE_BAUS_DIA) {
                rpgProgresso.baus++;
                rpgProgresso.bausGanhosHoje++;
                bauRecebido = true;
            }
        } else {
            rpgProgresso.derrotas++;
        }

        if (pontosAlterados > 0) sincronizarRecompensasGarantidasRpg();
    }
    salvarProgressoRpg();

    let nomeVencedor = window.rpgModoAtual === "pvp"
        ? (ladoVencedor === "j1" ? "Jogador 1" : "Jogador 2")
        : (ladoVencedor === "j1" ? "Você" : "O inimigo");
    let textoPontosVitoria = pontosAlterados > 0
        ? `+${pontosAlterados} pontos`
        : "Pontuação máxima de 2026 alcançada";
    let textoBau = jogadorVenceu
        ? (bauRecebido ? " Você também ganhou +1 baú." : " O limite diário de baús já foi alcançado.")
        : "";
    let recompensa = recompensaInvasao
        ? `${recompensaInvasao.valor >= 0 ? "+" : "−"}${Math.abs(recompensaInvasao.valor)} troféus por ${recompensaInvasao.motivo}. Pontuação atual: ${rpgProgresso.pontos}.${textoBau}`
        : (jogadorVenceu
            ? `${textoPontosVitoria}${bauRecebido ? " e +1 baú" : ". Limite diário de baús alcançado"}.`
            : `−5 pontos. Pontuação atual: ${rpgProgresso.pontos}.`);

    let overlay = document.createElement("div");
    overlay.className = "resultado-partida-rpg " + (jogadorVenceu ? "resultado-vitoria-rpg" : "resultado-derrota-rpg");
    overlay.innerHTML = `
        <div class="resultado-partida-conteudo">
            <span class="resultado-partida-icone">${jogadorVenceu ? "🏆" : "☠️"}</span>
            <small>${jogadorVenceu ? "VITÓRIA" : "DERROTA"}</small>
            <h2>${nomeVencedor} venceu!</h2>
            <p>${modoPontuado ? recompensa : "Este modo não altera o progresso."}</p>
            <button type="button" id="btn-resultado-menu-rpg">Voltar ao menu</button>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("btn-resultado-menu-rpg").addEventListener("click", () => location.reload());
}

function conectarEventosMenuRpg() {
    document.querySelectorAll("[data-pagina-alvo]").forEach(botao => {
        botao.addEventListener("click", () => abrirPaginaMenuRpg(botao.dataset.paginaAlvo));
    });
    document.querySelectorAll(".btn-jogar-modo[data-modo]").forEach(botao => {
        botao.addEventListener("click", () => iniciarPartidaPeloMenuRpg(botao.dataset.modo));
    });
    document.getElementById("btn-voltar-menu-rpg").addEventListener("click", () => location.reload());
    document.getElementById("btn-abrir-bau").addEventListener("click", abrirBauRpg);
    document.querySelectorAll(".slot-bau-rpg").forEach(slot => {
        slot.addEventListener("click", abrirBauRpg);
    });
    document.getElementById("busca-cartas-rpg").addEventListener("input", renderizarColecaoRpg);
    document.querySelectorAll(".filtro-era").forEach(botao => {
        botao.addEventListener("click", () => {
            rpgFiltroEra = botao.dataset.era;
            document.querySelectorAll(".filtro-era").forEach(item => item.classList.toggle("ativo", item === botao));
            renderizarColecaoRpg();
        });
    });
    document.getElementById("fechar-modal-carta-rpg").addEventListener("click", fecharDetalhesCartaRpg);
    document.getElementById("modal-carta-rpg").addEventListener("click", evento => {
        if (evento.target === evento.currentTarget) fecharDetalhesCartaRpg();
    });
    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") fecharDetalhesCartaRpg();
    });
}

function inicializarTelaInicioRpg() {
    montarCatalogoRpg();
    sincronizarRecompensasGarantidasRpg();
    conectarEventosMenuRpg();
    atualizarResumoMenuRpg();
    renderizarLinhaDoTempoRpg();
    renderizarColecaoRpg();
    renderizarLojaRpg();
    document.getElementById("tela-inicio-rpg").hidden = false;
    document.getElementById("container-principal").classList.add("arena-oculta");
    document.body.classList.add("tela-inicio-ativa");
}

window.inicializarTelaInicioRpg = inicializarTelaInicioRpg;
window.registrarVitoriaRpg = registrarVitoriaRpg;
window.obterIdsCartasDisponiveisRpg = function () {
    if (RPG_TESTE_TODAS_CARTAS_NAS_BATALHAS) {
        return bancoDeCartas.map(carta => carta.id);
    }
    return bancoDeCartas
        .filter(carta => quantidadeCartaRpg(carta.id) > 0)
        .map(carta => carta.id);
};
window.obterQuantidadeCartaRpg = quantidadeCartaRpg;
