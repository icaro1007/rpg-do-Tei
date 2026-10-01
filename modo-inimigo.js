/* ========================================================================== 
   MODO INIMIGO POR ONDAS

   Os inimigos especiais são acrescentados aqui, carta por carta, sem misturar
   suas regras com as cartas normais do jogador.
   ========================================================================== */

(function () {
    const MODO_SOLO = "pve-monstro-solo";
    const ESTAGIOS_SLIME = [
        { quantidade: 1, vida: 10, dano: 1, nome: "Grande" },
        { quantidade: 2, vida: 4, dano: 2, nome: "Médio" },
        { quantidade: 3, vida: 2, dano: 3, nome: "Pequeno" },
        { quantidade: 4, vida: 1, dano: 4, nome: "Mínimo" }
    ];
    const LIMITE_ESQUELETOS = 5;
    let estado = null;
    let observadorCampo = null;
    let idPartida = 0;
    let proximaFamiliaSlime = 1;
    let proximoFragmentoSlime = 1;
    let familiasSlime = new Map();
    let origensVisuaisDivisaoSlime = new Map();
    let proximaFamiliaEsqueleto = 1;
    let proximoEsqueleto = 1;
    let familiasEsqueleto = new Map();
    let ataqueEsqueletoPendente = null;
    let crescimentosPendentesEsqueleto = new Map();
    let timerCrescimentoEsqueleto = null;
    let proximoZumbi = 1;
    let progressoZumbi = new Map(); // idZumbi -> { alvoId, golpes }
    let proximoAicer = 1;
    let alvosAicer = new Map(); // idAicer -> IDs distintos atacados no ciclo atual
    let proximoEcto = 1;
    let proximoFraguer = 1;
    let fundindoFraguers = false;
    let fraguersVisuaisPorLado = { j1: new Set(), j2: new Set() };
    let proximoSpiritista = 1;
    let origensAlmasSpiritista = new Map();
    let proximoSeteNegativo = 1;
    // Diferencia uma invocação (mão -> campo) de uma morte. Isso é importante
    // quando existem, ao mesmo tempo, um Ctrl copiando Esqueleto e outro
    // Esqueleto roubado pelo Cracker: cada um continua na própria família.
    let movimentacoesEsqueletoSemMorte = new Set();
    // Remoções causadas por roubo ou pelo Viajante não são mortes e, por isso,
    // não podem disparar uma nova divisão da família original.
    let remocoesSlimeSemDivisao = new Set();

    function modoAtivo() {
        return window.rpgModoAtual === MODO_SOLO;
    }

    function criarCartaSlime(familia, estagio, fragmento) {
        let atributos = ESTAGIOS_SLIME[estagio];
        return {
            id: "slime",
            nome: "Slime",
            vida: atributos.vida,
            dano: atributos.dano,
            img: "slime-provisorio.svg",
            qtd: 1,
            inimigoEspecial: "slime",
            familiaSlime: familia,
            estagioSlime: estagio,
            fragmentoSlime: fragmento,
            idUnico: `slime_monstro_${idPartida}_${familia}_e${estagio + 1}_f${fragmento}`
        };
    }

    function criarCartaEsqueleto(familia, ordem) {
        return {
            id: "esqueleto",
            nome: "Esqueleto",
            vida: 1,
            dano: 1,
            img: "esqueleto-provisorio.svg",
            qtd: 1,
            inimigoEspecial: "esqueleto",
            familiaEsqueleto: familia,
            ordemEsqueleto: ordem,
            idUnico: `esqueleto_monstro_${idPartida}_${familia}_${ordem}_${proximoEsqueleto++}`
        };
    }

    function criarCartaZumbi() {
        return {
            id: "zumbi",
            nome: "Zumbi",
            vida: 4,
            dano: 2,
            img: "zumbi-provisorio.svg",
            qtd: 1,
            inimigoEspecial: "zumbi",
            idUnico: `zumbi_monstro_${idPartida}_${proximoZumbi++}`
        };
    }

    function criarCartaAicer() {
        return {
            id: "aicer",
            nome: "Aicer",
            vida: 3,
            dano: 1,
            img: "aicer-provisorio.svg",
            qtd: 1,
            inimigoEspecial: "aicer",
            idUnico: `aicer_monstro_${idPartida}_${proximoAicer++}`
        };
    }

    function criarCartaEcto() {
        return {
            id: "ecto",
            nome: "Ecto",
            vida: 2,
            dano: 3,
            img: "ecto-provisorio.svg",
            qtd: 1,
            inimigoEspecial: "ecto",
            idUnico: `ecto_monstro_${idPartida}_${proximoEcto++}`
        };
    }

    function criarCartaFraguer(fundido = false) {
        return {
            id: fundido ? "fraguer-fundido" : "fraguer",
            nome: fundido ? "Fraguer Fundido" : "Fraguer",
            vida: fundido ? 2 : 4,
            dano: fundido ? 8 : 1,
            img: fundido ? "fraguer-fundido-provisorio.svg" : "fraguer-provisorio.svg",
            qtd: 1,
            inimigoEspecial: fundido ? "fraguer-fundido" : "fraguer",
            idUnico: `${fundido ? "fraguer_fundido" : "fraguer"}_monstro_${idPartida}_${proximoFraguer++}`
        };
    }

    function criarCartaSpiritista() {
        return {
            id: "spiritista",
            nome: "Spiritista",
            vida: 10,
            dano: 1,
            img: "spiritista-provisorio.svg",
            qtd: 1,
            inimigoEspecial: "spiritista",
            idUnico: `spiritista_monstro_${idPartida}_${proximoSpiritista++}`
        };
    }

    function criarCartaSeteNegativo() {
        return {
            id: "sete-negativo",
            nome: "7 Negativo",
            vida: 5,
            dano: 0,
            img: "sete-negativo-provisorio.svg",
            qtd: 1,
            inimigoEspecial: "sete-negativo",
            idUnico: `sete_negativo_monstro_${idPartida}_${proximoSeteNegativo++}`
        };
    }

    function criarBaralhoInimigo(total) {
        return Array.from({ length: total }, () => {
            // Todas as posições, inclusive a carta que abre a primeira onda,
            // são sorteadas igualmente entre os oito inimigos implementados.
            let sorteio = Math.floor(Math.random() * 8);
            if (sorteio === 0) {
                let familia = proximaFamiliaEsqueleto++;
                return {
                    ...criarCartaEsqueleto(familia, 1),
                    ladoEsqueleto: "j2",
                    contaComoCartaDaOnda: true
                };
            }

            if (sorteio === 1) {
                let familia = proximaFamiliaSlime++;
                return {
                    ...criarCartaSlime(familia, 0, 1),
                    ladoSlime: "j2",
                    contaComoCartaDaOnda: true
                };
            }

            if (sorteio === 2) return criarCartaZumbi();
            if (sorteio === 3) return criarCartaAicer();
            if (sorteio === 4) return criarCartaEcto();
            if (sorteio === 5) return criarCartaFraguer();
            if (sorteio === 6) return criarCartaSpiritista();
            return criarCartaSeteNegativo();
        });
    }

    function decorarPacoteSlime(carta) {
        if (!carta || carta.inimigoEspecial !== "slime") return;
        let pacote = document.getElementById("pacote-" + carta.idUnico);
        if (!pacote) return;

        pacote.dataset.inimigoEspecial = "slime";
        pacote.dataset.slimeFamilia = String(carta.familiaSlime);
        pacote.dataset.slimeEstagio = String(carta.estagioSlime);
        pacote.dataset.slimeId = carta.idUnico;
        pacote.classList.add("carta-slime-rpg", `slime-estagio-${carta.estagioSlime + 1}`);

        let selo = pacote.querySelector(".selo-estagio-slime-rpg");
        if (!selo) {
            selo = document.createElement("span");
            selo.className = "selo-estagio-slime-rpg";
            pacote.appendChild(selo);
        }
        selo.textContent = ESTAGIOS_SLIME[carta.estagioSlime].nome;

        let familia = familiasSlime.get(carta.familiaSlime);
        if (!familia) {
            let ladoDetectado = carta.ladoSlime
                || (pacote.closest("#campo-j1, #mao-j1") ? "j1" : "j2");
            familia = {
                estagio: carta.estagioSlime,
                vivos: new Set(),
                dividindo: false,
                lado: ladoDetectado,
                contaComoCartaDaOnda: carta.contaComoCartaDaOnda === true
            };
            familiasSlime.set(carta.familiaSlime, familia);
        }
        familia.estagio = carta.estagioSlime;
        familia.vivos.add(carta.idUnico);

        // Qualquer Ctrl usa o Slime grande (10/1) como referência. A redução
        // normal de 1 ponto do Ctrl é aplicada depois, resultando em 9/1.
        let referenciaCopia = {
            id: "slime",
            nome: "Slime",
            vida: 10,
            dano: 1,
            img: "slime-provisorio.svg"
        };
        if (familia.lado === "j1") ultimaCartaJogador = referenciaCopia;
        else ultimaCartaOponente = referenciaCopia;
    }

    function atualizarContadoresEsqueleto(familiaId) {
        let familia = familiasEsqueleto.get(familiaId);
        if (!familia) return;

        let vivos = Array.from(familia.vivos).filter(id => document.getElementById("pacote-" + id));
        familia.vivos = new Set(vivos);
        vivos.forEach(idUnico => {
            let pacote = document.getElementById("pacote-" + idUnico);
            if (!pacote) return;
            let selo = pacote.querySelector(".selo-grupo-esqueleto-rpg");
            if (!selo) {
                selo = document.createElement("span");
                selo.className = "selo-grupo-esqueleto-rpg";
                pacote.appendChild(selo);
            }
            selo.textContent = `${vivos.length}/${LIMITE_ESQUELETOS}`;
            selo.setAttribute("aria-label", `${vivos.length} Esqueletos vivos neste grupo`);
        });
    }

    function decorarPacoteEsqueleto(carta) {
        if (!carta || carta.inimigoEspecial !== "esqueleto") return;
        let pacote = document.getElementById("pacote-" + carta.idUnico);
        if (!pacote) return;

        pacote.dataset.inimigoEspecial = "esqueleto";
        pacote.dataset.esqueletoFamilia = String(carta.familiaEsqueleto);
        pacote.dataset.esqueletoId = carta.idUnico;
        pacote.classList.add("carta-esqueleto-rpg");

        let familia = familiasEsqueleto.get(carta.familiaEsqueleto);
        if (!familia) {
            familia = {
                vivos: new Set(),
                lado: carta.ladoEsqueleto || (pacote.closest("#campo-j1, #mao-j1") ? "j1" : "j2"),
                contaComoCartaDaOnda: carta.contaComoCartaDaOnda === true
            };
            familiasEsqueleto.set(carta.familiaEsqueleto, familia);
        }
        familia.vivos.add(carta.idUnico);
        atualizarContadoresEsqueleto(carta.familiaEsqueleto);

        let referenciaCopia = {
            id: "esqueleto",
            nome: "Esqueleto",
            vida: 1,
            dano: 1,
            img: "esqueleto-provisorio.svg"
        };
        if (familia.lado === "j1") ultimaCartaJogador = referenciaCopia;
        else ultimaCartaOponente = referenciaCopia;
    }

    function atualizarSeloZumbi(idUnico) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote || pacote.dataset.inimigoEspecial !== "zumbi") return;
        let progresso = progressoZumbi.get(idUnico) || { alvoId: null, golpes: 0 };
        let selo = pacote.querySelector(".selo-infeccao-zumbi-rpg");
        if (!selo) {
            selo = document.createElement("span");
            selo.className = "selo-infeccao-zumbi-rpg";
            pacote.appendChild(selo);
        }
        selo.textContent = `${progresso.golpes}/2`;
        selo.setAttribute("aria-label", `${progresso.golpes} de 2 ataques no mesmo alvo para infectar`);
    }

    function criarMarcaPersistenteZumbi(pacote) {
        if (!pacote || pacote.querySelector(":scope > .infeccao-visual-zumbi-rpg")) return;
        let visual = document.createElement("span");
        visual.className = "infeccao-visual-zumbi-rpg";
        visual.setAttribute("aria-hidden", "true");
        for (let indice = 0; indice < 3; indice++) visual.appendChild(document.createElement("i"));
        pacote.appendChild(visual);
    }

    function sincronizarMarcasVisuaisZumbi() {
        let marcados = new Set();
        progressoZumbi.forEach((progresso, idZumbi) => {
            if (!progresso || progresso.golpes !== 1 || !progresso.alvoId) return;
            let zumbi = document.getElementById("pacote-" + idZumbi);
            let alvo = document.getElementById("pacote-" + progresso.alvoId);
            let silenciado = typeof window.rpgCartaSilenciadaPeloEcto === "function"
                && window.rpgCartaSilenciadaPeloEcto(idZumbi);
            if (zumbi && alvo && zumbi.closest("#campo-j1, #campo-j2") && !silenciado) {
                marcados.add(progresso.alvoId);
            }
        });

        document.querySelectorAll(".infectada-zumbi-rpg").forEach(pacote => {
            let id = pacote.id.replace("pacote-", "");
            if (marcados.has(id)) return;
            pacote.classList.remove("infectada-zumbi-rpg");
            pacote.querySelector(":scope > .infeccao-visual-zumbi-rpg")?.remove();
        });
        marcados.forEach(id => {
            let pacote = document.getElementById("pacote-" + id);
            if (!pacote) return;
            pacote.classList.add("infectada-zumbi-rpg");
            criarMarcaPersistenteZumbi(pacote);
        });
    }

    function animarMordidaZumbi(pacoteAlvo) {
        if (!pacoteAlvo) return;
        pacoteAlvo.querySelector(":scope > .mordida-zumbi-rpg")?.remove();
        let mordida = document.createElement("span");
        mordida.className = "mordida-zumbi-rpg";
        mordida.setAttribute("aria-hidden", "true");
        for (let indice = 0; indice < 3; indice++) mordida.appendChild(document.createElement("i"));
        pacoteAlvo.appendChild(mordida);
        setTimeout(() => mordida.remove(), 850);
    }

    function prepararAnimacaoConversaoZumbi(idAlvo) {
        let pacotePrincipal = document.getElementById("pacote-" + idAlvo);
        if (!pacotePrincipal) return [];
        let ids = pacotePrincipal.dataset.inimigoEspecial === "slime"
            && typeof window.rpgObterIdsFamiliaSlime === "function"
            ? window.rpgObterIdsFamiliaSlime(idAlvo)
            : [idAlvo];

        return ids.map(id => {
            let pacote = document.getElementById("pacote-" + id);
            if (!pacote) return null;
            let retangulo = pacote.getBoundingClientRect();
            let fantasma = pacote.cloneNode(true);
            fantasma.removeAttribute("id");
            fantasma.querySelectorAll("[id]").forEach(elemento => elemento.removeAttribute("id"));
            fantasma.querySelectorAll("button").forEach(botao => botao.disabled = true);
            fantasma.classList.remove("marca-infeccao-zumbi-rpg", "infectada-zumbi-rpg");
            fantasma.classList.add("fantasma-conversao-zumbi-rpg");
            fantasma.querySelectorAll(".mordida-zumbi-rpg, .infeccao-visual-zumbi-rpg").forEach(elemento => elemento.remove());
            fantasma.setAttribute("aria-hidden", "true");
            fantasma.style.left = retangulo.left + "px";
            fantasma.style.top = retangulo.top + "px";
            fantasma.style.width = retangulo.width + "px";
            fantasma.style.height = retangulo.height + "px";
            return { id, fantasma, origem: retangulo };
        }).filter(Boolean);
    }

    function criarFumacaConversaoZumbi(retangulo) {
        if (!retangulo) return;
        let fumaca = document.createElement("span");
        fumaca.className = "fumaca-conversao-zumbi-rpg";
        fumaca.setAttribute("aria-hidden", "true");
        fumaca.style.left = (retangulo.left + retangulo.width / 2) + "px";
        fumaca.style.top = (retangulo.top + retangulo.height / 2) + "px";
        for (let indice = 0; indice < 7; indice++) {
            let particula = document.createElement("i");
            particula.style.setProperty("--fumaca-zumbi-x", `${(indice - 3) * 13}px`);
            particula.style.setProperty("--fumaca-zumbi-y", `${-18 - (indice % 3) * 12}px`);
            particula.style.animationDelay = `${indice * 38}ms`;
            fumaca.appendChild(particula);
        }
        document.body.appendChild(fumaca);
        setTimeout(() => fumaca.remove(), 1050);
    }

    function finalizarAnimacaoConversaoZumbi(animacoes) {
        (animacoes || []).forEach((animacao, indice) => {
            let pacoteNovo = document.getElementById("pacote-" + animacao.id);
            if (!pacoteNovo) return;
            let destino = pacoteNovo.getBoundingClientRect();
            animacao.fantasma.style.setProperty("--conversao-zumbi-x", (destino.left - animacao.origem.left) + "px");
            animacao.fantasma.style.setProperty("--conversao-zumbi-y", (destino.top - animacao.origem.top) + "px");
            animacao.fantasma.style.animationDelay = `${indice * 65}ms`;
            document.body.appendChild(animacao.fantasma);

            pacoteNovo.style.setProperty("--atraso-conversao-zumbi", `${indice * 65}ms`);
            pacoteNovo.classList.add("chegada-conversao-zumbi-rpg");
            setTimeout(() => criarFumacaConversaoZumbi(destino), 620 + indice * 65);
            setTimeout(() => {
                animacao.fantasma.remove();
                if (pacoteNovo.isConnected) {
                    pacoteNovo.classList.remove("chegada-conversao-zumbi-rpg");
                    pacoteNovo.style.removeProperty("--atraso-conversao-zumbi");
                }
            }, 1250 + indice * 65);
        });
    }

    function decorarPacoteZumbi(carta) {
        if (!carta || carta.inimigoEspecial !== "zumbi") return;
        let pacote = document.getElementById("pacote-" + carta.idUnico);
        if (!pacote) return;

        pacote.dataset.inimigoEspecial = "zumbi";
        pacote.dataset.zumbiId = carta.idUnico;
        pacote.classList.add("carta-zumbi-rpg");
        if (!progressoZumbi.has(carta.idUnico)) {
            progressoZumbi.set(carta.idUnico, { alvoId: null, golpes: 0 });
        }
        atualizarSeloZumbi(carta.idUnico);

        let referenciaCopia = {
            id: "zumbi",
            nome: "Zumbi",
            vida: 4,
            dano: 2,
            img: "zumbi-provisorio.svg"
        };
        if (pacote.closest("#campo-j1, #mao-j1")) ultimaCartaJogador = referenciaCopia;
        else ultimaCartaOponente = referenciaCopia;
    }

    function atualizarSeloAicer(idUnico) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote || pacote.dataset.inimigoEspecial !== "aicer") return;
        let quantidade = (alvosAicer.get(idUnico) || []).length;
        let selo = pacote.querySelector(".selo-passiva-aicer-rpg");
        if (!selo) {
            selo = document.createElement("span");
            selo.className = "selo-passiva-aicer-rpg";
            pacote.appendChild(selo);
        }
        selo.textContent = `${quantidade}/2`;
        selo.setAttribute("aria-label", `${quantidade} de 2 cartas diferentes atacadas`);
    }

    function decorarPacoteAicer(carta) {
        if (!carta || carta.inimigoEspecial !== "aicer") return;
        let pacote = document.getElementById("pacote-" + carta.idUnico);
        if (!pacote) return;

        pacote.dataset.inimigoEspecial = "aicer";
        pacote.dataset.aicerId = carta.idUnico;
        pacote.classList.add("carta-aicer-rpg");
        if (!alvosAicer.has(carta.idUnico)) alvosAicer.set(carta.idUnico, []);
        atualizarSeloAicer(carta.idUnico);

        let referenciaCopia = {
            id: "aicer",
            nome: "Aicer",
            vida: 3,
            dano: 1,
            img: "aicer-provisorio.svg"
        };
        if (pacote.closest("#campo-j1, #mao-j1")) ultimaCartaJogador = referenciaCopia;
        else ultimaCartaOponente = referenciaCopia;
    }

    function decorarPacoteEcto(carta) {
        if (!carta || carta.inimigoEspecial !== "ecto") return;
        let pacote = document.getElementById("pacote-" + carta.idUnico);
        if (!pacote) return;

        pacote.dataset.inimigoEspecial = "ecto";
        pacote.dataset.ectoId = carta.idUnico;
        pacote.classList.add("carta-ecto-rpg");

        let referenciaCopia = {
            id: "ecto",
            nome: "Ecto",
            vida: 2,
            dano: 3,
            img: "ecto-provisorio.svg"
        };
        if (pacote.closest("#campo-j1, #mao-j1")) ultimaCartaJogador = referenciaCopia;
        else ultimaCartaOponente = referenciaCopia;
    }

    function atualizarSeloFraguer(pacote, quantidade) {
        if (!pacote || pacote.dataset.inimigoEspecial !== "fraguer") return;
        let selo = pacote.querySelector(".selo-grupo-fraguer-rpg");
        if (!selo) {
            selo = document.createElement("span");
            selo.className = "selo-grupo-fraguer-rpg";
            pacote.appendChild(selo);
        }
        selo.textContent = `${quantidade}/4`;
        selo.setAttribute("aria-label", `${quantidade} Fraguers aliados em campo`);
    }

    function pulsarEnergiaFraguer(pacote) {
        if (!pacote?.isConnected) return;
        pacote.classList.remove("pulso-energia-fraguer-rpg");
        void pacote.offsetWidth;
        pacote.classList.add("pulso-energia-fraguer-rpg");
        setTimeout(() => pacote?.isConnected && pacote.classList.remove("pulso-energia-fraguer-rpg"), 820);
    }

    function definirIntensidadeFraguer(pacote, quantidade, silenciado) {
        pacote.classList.remove(
            "energia-fraguer-1-rpg", "energia-fraguer-2-rpg",
            "energia-fraguer-3-rpg", "energia-fraguer-4-rpg"
        );
        pacote.classList.add(`energia-fraguer-${silenciado ? 1 : Math.max(1, Math.min(4, quantidade))}-rpg`);
    }

    function criarRaioEntreFraguers(origem, destino, atraso) {
        if (!origem?.isConnected || !destino?.isConnected) return;
        let rectOrigem = origem.getBoundingClientRect();
        let rectDestino = destino.getBoundingClientRect();
        let x1 = rectOrigem.left + rectOrigem.width / 2;
        let y1 = rectOrigem.top + rectOrigem.height * .46;
        let x2 = rectDestino.left + rectDestino.width / 2;
        let y2 = rectDestino.top + rectDestino.height * .46;
        let distancia = Math.hypot(x2 - x1, y2 - y1);
        let angulo = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

        let raio = document.createElement("span");
        raio.className = "raio-conexao-fraguer-rpg";
        raio.setAttribute("aria-hidden", "true");
        raio.style.left = `${x1}px`;
        raio.style.top = `${y1}px`;
        raio.style.width = `${distancia}px`;
        raio.style.setProperty("--angulo-fraguer", `${angulo}deg`);
        raio.style.setProperty("--atraso-fraguer", `${atraso}ms`);
        document.body.appendChild(raio);
        setTimeout(() => raio.remove(), 920 + atraso);
    }

    function animarChegadaFraguer(novos, todos) {
        novos.forEach((novo, indiceNovo) => {
            let aliados = todos.filter(pacote => pacote !== novo);
            pulsarEnergiaFraguer(novo);
            aliados.forEach((aliado, indiceAliado) => {
                criarRaioEntreFraguers(novo, aliado, indiceAliado * 65 + indiceNovo * 40);
                pulsarEnergiaFraguer(aliado);
            });
        });
    }

    function animarFusaoFraguers(participantes) {
        if (!participantes.length) return;
        let medidas = participantes.map(pacote => pacote.getBoundingClientRect());
        let centroX = medidas.reduce((soma, rect) => soma + rect.left + rect.width / 2, 0) / medidas.length;
        let centroY = medidas.reduce((soma, rect) => soma + rect.top + rect.height * .45, 0) / medidas.length;

        let nucleo = document.createElement("span");
        nucleo.className = "nucleo-fusao-fraguer-rpg";
        nucleo.setAttribute("aria-hidden", "true");
        nucleo.style.left = `${centroX}px`;
        nucleo.style.top = `${centroY}px`;
        document.body.appendChild(nucleo);
        setTimeout(() => nucleo.remove(), 1250);

        participantes.forEach((pacote, indice) => {
            let rect = medidas[indice];
            let inicioX = rect.left + rect.width / 2;
            let inicioY = rect.top + rect.height * .45;
            let sombra = document.createElement("span");
            sombra.className = "sombra-fusao-fraguer-rpg";
            sombra.setAttribute("aria-hidden", "true");
            sombra.style.left = `${inicioX}px`;
            sombra.style.top = `${inicioY}px`;
            sombra.style.setProperty("--fusao-fraguer-x", `${centroX - inicioX}px`);
            sombra.style.setProperty("--fusao-fraguer-y", `${centroY - inicioY}px`);
            sombra.style.setProperty("--fusao-fraguer-giro", `${indice % 2 === 0 ? -22 : 22}deg`);
            let imagemOriginal = pacote.querySelector("img");
            if (imagemOriginal?.src) {
                let imagem = document.createElement("img");
                imagem.src = imagemOriginal.src;
                imagem.alt = "";
                sombra.appendChild(imagem);
            }
            document.body.appendChild(sombra);
            setTimeout(() => sombra.remove(), 980);
        });
    }

    function fundirFraguers(lado, fraguers) {
        if (fundindoFraguers || fraguers.length < 4) return false;
        let participantes = fraguers.slice(0, 4);
        // Se todos perderam a Passiva para o Ecto, não existe mais nenhum
        // Fraguer capaz de iniciar a fusão do grupo.
        let podeFundir = participantes.some(pacote => {
            let id = pacote.id.replace("pacote-", "");
            return !(typeof window.rpgCartaSilenciadaPeloEcto === "function" && window.rpgCartaSilenciadaPeloEcto(id));
        });
        if (!podeFundir) return false;

        let campo = document.getElementById("campo-" + lado);
        if (!campo) return false;
        fundindoFraguers = true;
        animarFusaoFraguers(participantes);
        let carta = criarCartaFraguer(true);
        let ehAliado = lado === "j1";
        let ancora = participantes[0];
        ancora.insertAdjacentHTML("beforebegin", criarHTMLCarta(
            carta,
            ehAliado ? "jogarCarta" : "jogarCartaInimigo",
            ehAliado ? "carta-aliada fusao-fraguer-rpg" : "carta-inimiga fusao-fraguer-rpg",
            ehAliado
        ));
        participantes.forEach(pacote => pacote.remove());
        if (ehAliado) jogarCarta("pacote-" + carta.idUnico, true);
        else jogarCartaInimigo("pacote-" + carta.idUnico, true);
        decorarPacoteFraguer(carta);
        narrar("⚡ FUSÃO FRAGUER! Os 4 Fraguers se uniram em um ser com 2 de vida e 8 de dano!");
        if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
        fundindoFraguers = false;
        return true;
    }

    function sincronizarFraguers() {
        if (fundindoFraguers) return;
        ["j1", "j2"].forEach(lado => {
            let campo = document.getElementById("campo-" + lado);
            if (!campo) return;
            let fraguers = Array.from(campo.querySelectorAll(":scope > [data-inimigo-especial='fraguer']"));
            let quantidade = fraguers.length;
            let idsAtuais = new Set(fraguers.map(pacote => pacote.id));
            let idsAnteriores = fraguersVisuaisPorLado[lado] || new Set();
            let novos = fraguers.filter(pacote => !idsAnteriores.has(pacote.id));
            fraguers.forEach(pacote => {
                let id = pacote.id.replace("pacote-", "");
                let danoEl = document.getElementById("dano-" + id);
                let bonusAnterior = Number(pacote.dataset.fraguerBonus) || 0;
                let silenciado = typeof window.rpgCartaSilenciadaPeloEcto === "function" && window.rpgCartaSilenciadaPeloEcto(id);
                let novoBonus = silenciado ? 0 : Math.max(0, quantidade - 1);
                if (danoEl && novoBonus !== bonusAnterior) {
                    let danoAtual = parseFloat(danoEl.innerText) || 0;
                    danoEl.innerText = Math.max(0, danoAtual - bonusAnterior + novoBonus);
                    if (novoBonus > bonusAnterior && typeof mostrarEfeitoAtaque === "function") mostrarEfeitoAtaque(id);
                    if (novoBonus < bonusAnterior && typeof mostrarEfeitoPerdaAtaque === "function") mostrarEfeitoPerdaAtaque(id);
                }
                pacote.dataset.fraguerBonus = String(novoBonus);
                definirIntensidadeFraguer(pacote, quantidade, silenciado);
                atualizarSeloFraguer(pacote, quantidade);
            });
            if (novos.length) animarChegadaFraguer(novos, fraguers);
            fraguersVisuaisPorLado[lado] = idsAtuais;
            if (quantidade >= 4) fundirFraguers(lado, fraguers);
        });
    }

    function decorarPacoteFraguer(carta) {
        if (!carta || (carta.inimigoEspecial !== "fraguer" && carta.inimigoEspecial !== "fraguer-fundido")) return;
        let pacote = document.getElementById("pacote-" + carta.idUnico);
        if (!pacote) return;
        let fundido = carta.inimigoEspecial === "fraguer-fundido";
        pacote.dataset.inimigoEspecial = carta.inimigoEspecial;
        pacote.dataset.fraguerId = carta.idUnico;
        pacote.classList.add(fundido ? "carta-fraguer-fundido-rpg" : "carta-fraguer-rpg");
        if (!fundido) atualizarSeloFraguer(pacote, 1);

        let referenciaCopia = {
            id: fundido ? "fraguer-fundido" : "fraguer",
            nome: fundido ? "Fraguer Fundido" : "Fraguer",
            vida: fundido ? 2 : 4,
            dano: fundido ? 8 : 1,
            img: fundido ? "fraguer-fundido-provisorio.svg" : "fraguer-provisorio.svg"
        };
        if (pacote.closest("#campo-j1, #mao-j1")) ultimaCartaJogador = referenciaCopia;
        else ultimaCartaOponente = referenciaCopia;
        sincronizarFraguers();
    }

    function decorarPacoteSpiritista(carta) {
        if (!carta || carta.inimigoEspecial !== "spiritista") return;
        let pacote = document.getElementById("pacote-" + carta.idUnico);
        if (!pacote) return;
        pacote.dataset.inimigoEspecial = "spiritista";
        pacote.dataset.spiritistaId = carta.idUnico;
        pacote.classList.add("carta-spiritista-rpg");

        let referenciaCopia = {
            id: "spiritista",
            nome: "Spiritista",
            vida: 10,
            dano: 1,
            img: "spiritista-provisorio.svg"
        };
        if (pacote.closest("#campo-j1, #mao-j1")) ultimaCartaJogador = referenciaCopia;
        else ultimaCartaOponente = referenciaCopia;
    }

    function decorarPacoteSeteNegativo(carta) {
        if (!carta || carta.inimigoEspecial !== "sete-negativo") return;
        let pacote = document.getElementById("pacote-" + carta.idUnico);
        if (!pacote) return;
        pacote.dataset.inimigoEspecial = "sete-negativo";
        pacote.dataset.seteNegativoId = carta.idUnico;
        pacote.classList.add("carta-sete-negativo-rpg");

        let referenciaCopia = {
            id: "sete-negativo",
            nome: "7 Negativo",
            vida: 5,
            dano: 0,
            img: "sete-negativo-provisorio.svg"
        };
        if (pacote.closest("#campo-j1, #mao-j1")) ultimaCartaJogador = referenciaCopia;
        else ultimaCartaOponente = referenciaCopia;
    }

    function decorarPacoteInimigoEspecial(carta) {
        decorarPacoteSlime(carta);
        decorarPacoteEsqueleto(carta);
        decorarPacoteZumbi(carta);
        decorarPacoteAicer(carta);
        decorarPacoteEcto(carta);
        decorarPacoteFraguer(carta);
        decorarPacoteSpiritista(carta);
        decorarPacoteSeteNegativo(carta);
    }

    function obterDadosEsqueleto(idUnico) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote || pacote.dataset.inimigoEspecial !== "esqueleto") return null;
        let familiaId = Number(pacote.dataset.esqueletoFamilia);
        let familia = familiasEsqueleto.get(familiaId);
        if (familia) {
            if (pacote.closest("#campo-j1, #mao-j1")) familia.lado = "j1";
            else if (pacote.closest("#campo-j2, #mao-j2")) familia.lado = "j2";
        }
        return familia ? { pacote, familiaId, familia } : null;
    }

    function marcarMovimentacaoEsqueleto(idUnico) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote || pacote.dataset.inimigoEspecial !== "esqueleto") return false;
        movimentacoesEsqueletoSemMorte.add(idUnico);
        return true;
    }

    function registrarCtrlComoEsqueleto(idUnico, ehAliado) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote) return false;
        let familiaId = proximaFamiliaEsqueleto++;
        decorarPacoteEsqueleto({
            ...criarCartaEsqueleto(familiaId, 1),
            idUnico,
            ladoEsqueleto: ehAliado ? "j1" : "j2",
            contaComoCartaDaOnda: false
        });
        return true;
    }

    // Antes de um Ctrl copiar uma nova carta, desfaz somente o vínculo dele
    // com uma família especial antiga. Os demais Slimes ou Esqueletos que já
    // nasceram continuam normalmente no campo.
    function desvincularCtrlDeFamiliaEspecial(idUnico) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote) return false;

        if (pacote.dataset.inimigoEspecial === "slime") {
            let familiaId = Number(pacote.dataset.slimeFamilia);
            let familia = familiasSlime.get(familiaId);
            if (familia) {
                familia.vivos.delete(idUnico);
                if (familia.vivos.size === 0) familiasSlime.delete(familiaId);
            }
            delete pacote.dataset.slimeFamilia;
            delete pacote.dataset.slimeEstagio;
            delete pacote.dataset.slimeId;
            pacote.classList.remove("carta-slime-rpg", "slime-estagio-1", "slime-estagio-2", "slime-estagio-3", "slime-estagio-4");
            pacote.querySelector(".selo-estagio-slime-rpg")?.remove();
        } else if (pacote.dataset.inimigoEspecial === "esqueleto") {
            let familiaId = Number(pacote.dataset.esqueletoFamilia);
            let familia = familiasEsqueleto.get(familiaId);
            if (familia) {
                familia.vivos.delete(idUnico);
                if (familia.vivos.size === 0) familiasEsqueleto.delete(familiaId);
                else atualizarContadoresEsqueleto(familiaId);
            }
            delete pacote.dataset.esqueletoFamilia;
            delete pacote.dataset.esqueletoId;
            pacote.classList.remove("carta-esqueleto-rpg");
            pacote.querySelector(".selo-grupo-esqueleto-rpg")?.remove();
        } else if (pacote.dataset.inimigoEspecial === "zumbi") {
            progressoZumbi.delete(idUnico);
            delete pacote.dataset.zumbiId;
            pacote.classList.remove("carta-zumbi-rpg");
            pacote.querySelector(".selo-infeccao-zumbi-rpg")?.remove();
        } else if (pacote.dataset.inimigoEspecial === "aicer") {
            alvosAicer.delete(idUnico);
            delete pacote.dataset.aicerId;
            pacote.classList.remove("carta-aicer-rpg");
            pacote.querySelector(".selo-passiva-aicer-rpg")?.remove();
        } else if (pacote.dataset.inimigoEspecial === "ecto") {
            delete pacote.dataset.ectoId;
            pacote.classList.remove("carta-ecto-rpg");
        } else if (pacote.dataset.inimigoEspecial === "fraguer" || pacote.dataset.inimigoEspecial === "fraguer-fundido") {
            delete pacote.dataset.fraguerId;
            delete pacote.dataset.fraguerBonus;
            pacote.classList.remove("carta-fraguer-rpg", "carta-fraguer-fundido-rpg");
            pacote.querySelector(".selo-grupo-fraguer-rpg")?.remove();
        } else if (pacote.dataset.inimigoEspecial === "spiritista") {
            delete pacote.dataset.spiritistaId;
            pacote.classList.remove("carta-spiritista-rpg");
        } else if (pacote.dataset.inimigoEspecial === "sete-negativo") {
            delete pacote.dataset.seteNegativoId;
            pacote.classList.remove("carta-sete-negativo-rpg");
        } else {
            return false;
        }

        delete pacote.dataset.inimigoEspecial;
        sincronizarMarcasVisuaisZumbi();
        sincronizarFraguers();
        atualizarPainel();
        return true;
    }

    function registrarZumbi(idUnico, ehAliado) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote) return false;
        progressoZumbi.set(idUnico, { alvoId: null, golpes: 0 });
        decorarPacoteZumbi({
            ...criarCartaZumbi(),
            idUnico,
            ladoZumbi: ehAliado ? "j1" : "j2"
        });
        return true;
    }

    function registrarAicer(idUnico, ehAliado) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote) return false;
        alvosAicer.set(idUnico, []);
        decorarPacoteAicer({
            ...criarCartaAicer(),
            idUnico,
            ladoAicer: ehAliado ? "j1" : "j2"
        });
        return true;
    }

    function registrarEcto(idUnico, ehAliado) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote) return false;
        decorarPacoteEcto({
            ...criarCartaEcto(),
            idUnico,
            ladoEcto: ehAliado ? "j1" : "j2"
        });
        return true;
    }

    function registrarFraguer(idUnico, ehAliado, fundido = false) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote) return false;
        decorarPacoteFraguer({
            ...criarCartaFraguer(fundido),
            idUnico,
            ladoFraguer: ehAliado ? "j1" : "j2"
        });
        return true;
    }

    function registrarSpiritista(idUnico, ehAliado) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote) return false;
        decorarPacoteSpiritista({
            ...criarCartaSpiritista(),
            idUnico,
            ladoSpiritista: ehAliado ? "j1" : "j2"
        });
        return true;
    }

    function registrarSeteNegativo(idUnico, ehAliado) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote) return false;
        decorarPacoteSeteNegativo({
            ...criarCartaSeteNegativo(),
            idUnico,
            ladoSeteNegativo: ehAliado ? "j1" : "j2"
        });
        return true;
    }

    function ehSeteNegativoAtivo(idUnico, lado) {
        let pacote = idUnico ? document.getElementById("pacote-" + idUnico) : null;
        if (!pacote || pacote.dataset.inimigoEspecial !== "sete-negativo") return false;
        if (typeof window.rpgCartaSilenciadaPeloEcto === "function" && window.rpgCartaSilenciadaPeloEcto(idUnico)) return false;
        return lado === "j1" ? pacote.closest("#campo-j1") !== null : pacote.closest("#campo-j2") !== null;
    }

    function animarRouboSeteNegativo(pacoteSete, pacoteAlvo, roubou, indice, retanguloAlvoSalvo) {
        if (!pacoteSete?.isConnected) return;
        let origem = pacoteSete.getBoundingClientRect();
        let destino = pacoteAlvo?.isConnected ? pacoteAlvo.getBoundingClientRect() : retanguloAlvoSalvo;
        if (!destino) {
            let campoOposto = pacoteSete.closest("#campo-j1")
                ? document.getElementById("campo-j2")
                : document.getElementById("campo-j1");
            destino = campoOposto?.getBoundingClientRect() || origem;
        }

        let atraso = Math.min(Math.max(0, Number(indice) || 0) * 85, 255);
        let inicioX = origem.left + origem.width / 2;
        let inicioY = origem.top + origem.height * .42;
        let fimX = destino.left + destino.width / 2;
        let fimY = destino.top + destino.height * .44;
        let meioX = (inicioX + fimX) / 2;
        let meioY = Math.min(inicioY, fimY) - 42;

        pacoteSete.classList.remove("sete-negativo-investida-rpg");
        void pacoteSete.offsetWidth;
        pacoteSete.classList.add("sete-negativo-investida-rpg");
        let sombra = document.createElement("span");
        sombra.className = "sombra-investida-sete-negativo-rpg";
        sombra.setAttribute("aria-hidden", "true");
        sombra.innerHTML = "<b>7</b><i></i><i></i><i></i>";
        sombra.style.setProperty("--sete-inicio-x", `${inicioX}px`);
        sombra.style.setProperty("--sete-inicio-y", `${inicioY}px`);
        sombra.style.setProperty("--sete-meio-x", `${meioX}px`);
        sombra.style.setProperty("--sete-meio-y", `${meioY}px`);
        sombra.style.setProperty("--sete-fim-x", `${fimX}px`);
        sombra.style.setProperty("--sete-fim-y", `${fimY}px`);
        sombra.style.animationDelay = `${atraso}ms`;
        document.body.appendChild(sombra);

        setTimeout(() => {
            if (pacoteAlvo?.isConnected) {
                pacoteAlvo.classList.remove("impacto-roubo-sete-negativo-rpg");
                void pacoteAlvo.offsetWidth;
                pacoteAlvo.classList.add("impacto-roubo-sete-negativo-rpg");
                setTimeout(() => pacoteAlvo?.isConnected && pacoteAlvo.classList.remove("impacto-roubo-sete-negativo-rpg"), 650);
            }

            let retorno = document.createElement("span");
            retorno.className = roubou ? "espada-roubada-sete-negativo-rpg" : "retorno-vazio-sete-negativo-rpg";
            retorno.setAttribute("aria-hidden", "true");
            if (roubou) retorno.textContent = "🗡️";
            else retorno.innerHTML = "<b>7</b>";
            retorno.style.setProperty("--sete-retorno-inicio-x", `${fimX}px`);
            retorno.style.setProperty("--sete-retorno-inicio-y", `${fimY}px`);
            retorno.style.setProperty("--sete-retorno-meio-x", `${meioX}px`);
            retorno.style.setProperty("--sete-retorno-meio-y", `${meioY}px`);
            retorno.style.setProperty("--sete-retorno-fim-x", `${inicioX}px`);
            retorno.style.setProperty("--sete-retorno-fim-y", `${inicioY}px`);
            document.body.appendChild(retorno);
            setTimeout(() => retorno.remove(), 760);
        }, 455 + atraso);

        setTimeout(() => {
            sombra.remove();
            if (!pacoteSete.isConnected) return;
            pacoteSete.classList.remove("sete-negativo-investida-rpg");
            if (!roubou) return;
            pacoteSete.classList.remove("sete-negativo-roubando-rpg");
            void pacoteSete.offsetWidth;
            pacoteSete.classList.add("sete-negativo-roubando-rpg");
            let idSete = pacoteSete.id.replace("pacote-", "");
            if (typeof mostrarEfeitoAtaque === "function") mostrarEfeitoAtaque(idSete);
            setTimeout(() => pacoteSete.isConnected && pacoteSete.classList.remove("sete-negativo-roubando-rpg"), 800);
        }, 1030 + atraso);
    }

    function roubarDanoSeteNegativo(idSete, idPacoteAlvo, narrarResultado = true, danoDisponivelNoInicio = null, indiceVisual = 0, retanguloAlvoSalvo = null) {
        let pacoteSete = document.getElementById("pacote-" + idSete);
        let idAlvo = String(idPacoteAlvo || "").replace("pacote-", "");
        let pacoteAlvo = document.getElementById("pacote-" + idAlvo);
        if (!pacoteSete || pacoteSete.dataset.inimigoEspecial !== "sete-negativo") return 0;
        if (typeof window.rpgCartaSilenciadaPeloEcto === "function" && window.rpgCartaSilenciadaPeloEcto(idSete)) return 0;

        let danoAlvo = pacoteAlvo ? document.getElementById("dano-" + idAlvo) : null;
        let danoSete = document.getElementById("dano-" + idSete);
        if (!danoSete) return 0;
        let atualAlvo = danoAlvo ? Math.max(0, parseFloat(danoAlvo.innerText) || 0) : 0;
        let referenciaRoubo = danoDisponivelNoInicio === null
            ? atualAlvo
            : Math.max(0, Number(danoDisponivelNoInicio) || 0);
        let quantidade = Math.min(1, referenciaRoubo);
        if (quantidade <= 0) {
            animarRouboSeteNegativo(pacoteSete, pacoteAlvo, false, indiceVisual, retanguloAlvoSalvo);
            if (narrarResultado) narrar("➖ O 7 Negativo atacou, mas o alvo não tinha dano para ser roubado.");
            return 0;
        }

        if (danoAlvo) danoAlvo.innerText = Math.max(0, atualAlvo - quantidade);
        danoSete.innerText = (parseFloat(danoSete.innerText) || 0) + quantidade;
        if (danoAlvo && typeof mostrarEfeitoPerdaAtaque === "function") mostrarEfeitoPerdaAtaque(idAlvo);
        animarRouboSeteNegativo(pacoteSete, pacoteAlvo, true, indiceVisual, retanguloAlvoSalvo);
        if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
        if (typeof window.rpgSincronizarFraguers === "function") window.rpgSincronizarFraguers();
        if (narrarResultado) narrar(`➖ O 7 Negativo roubou ${quantidade} de dano do alvo e adicionou ao próprio ataque!`);
        return quantidade;
    }

    function prepararAlmaSpiritista(idCartaMorta, pacoteCarta) {
        if (!idCartaMorta || !pacoteCarta?.isConnected) return false;
        let rect = pacoteCarta.getBoundingClientRect();
        origensAlmasSpiritista.set(String(idCartaMorta), {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height * .42
        });
        return true;
    }

    function animarAlmaParaSpiritista(origem, pacoteSpiritista, indice) {
        if (!origem || !pacoteSpiritista?.isConnected) return;
        let destino = pacoteSpiritista.getBoundingClientRect();
        let destinoX = destino.left + destino.width / 2;
        let destinoY = destino.top + destino.height * .4;
        let deslocamentoX = destinoX - origem.x;
        let deslocamentoY = destinoY - origem.y;

        let alma = document.createElement("span");
        alma.className = "alma-voando-spiritista-rpg";
        alma.setAttribute("aria-hidden", "true");
        alma.style.left = `${origem.x}px`;
        alma.style.top = `${origem.y}px`;
        alma.style.setProperty("--alma-spiritista-x", `${deslocamentoX}px`);
        alma.style.setProperty("--alma-spiritista-y", `${deslocamentoY}px`);
        alma.style.setProperty("--alma-spiritista-meio-x", `${deslocamentoX * .52}px`);
        alma.style.setProperty("--alma-spiritista-meio-y", `${deslocamentoY * .52 - 32 - indice * 7}px`);
        alma.style.setProperty("--alma-spiritista-atraso", `${indice * 70}ms`);
        for (let parte = 0; parte < 3; parte++) alma.appendChild(document.createElement("i"));
        document.body.appendChild(alma);
        setTimeout(() => alma.remove(), 1100 + indice * 70);
    }

    // É chamado somente pelo fluxo central de morte em campo. Como o pacote
    // destruído já saiu do DOM, um Spiritista que morreu não ganha o próprio bônus.
    function notificarMorteAosSpiritistas(nomeCartaMorta, idCartaMorta) {
        let fortalecidos = [];
        let origem = origensAlmasSpiritista.get(String(idCartaMorta || ""));
        origensAlmasSpiritista.delete(String(idCartaMorta || ""));
        ["j1", "j2"].forEach(lado => {
            let campo = document.getElementById("campo-" + lado);
            if (!campo) return;
            campo.querySelectorAll(":scope > [data-inimigo-especial='spiritista']").forEach(pacote => {
                let id = pacote.id.replace("pacote-", "");
                if (typeof window.rpgCartaSilenciadaPeloEcto === "function" && window.rpgCartaSilenciadaPeloEcto(id)) return;
                let dano = document.getElementById("dano-" + id);
                if (!dano) return;
                dano.innerText = (parseFloat(dano.innerText) || 0) + 1;
                let indice = fortalecidos.length;
                animarAlmaParaSpiritista(origem, pacote, indice);
                setTimeout(() => {
                    if (!pacote.isConnected) return;
                    pacote.classList.remove("spiritista-absorvendo-alma-rpg");
                    void pacote.offsetWidth;
                    pacote.classList.add("spiritista-absorvendo-alma-rpg");
                    if (typeof mostrarEfeitoAtaque === "function") mostrarEfeitoAtaque(id);
                    setTimeout(() => pacote.isConnected && pacote.classList.remove("spiritista-absorvendo-alma-rpg"), 850);
                }, origem ? 660 + indice * 70 : 0);
                fortalecidos.push(id);
            });
        });
        if (fortalecidos.length > 0) {
            narrar(`🔮 ${fortalecidos.length === 1 ? "O Spiritista absorveu" : "Os Spiritistas absorveram"} a energia de ${nomeCartaMorta || "uma carta"} e ganhou${fortalecidos.length === 1 ? "" : "ram"} +1 de dano!`);
        }
        return fortalecidos.length;
    }

    function restaurarEsqueletoRoubado(idUnico, novoDonoEhJ1, familiaId, idOriginal = idUnico) {
        let familiaOriginalId = Number(familiaId);
        let familiaOriginal = familiasEsqueleto.get(familiaOriginalId);
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!familiaOriginal || !pacote) return false;

        // O integrante roubado inicia uma formação própria do novo dono. Os
        // Esqueletos que ficaram no outro lado continuam na família original.
        // O Bruxo conserva o ID da carta, enquanto o Cracker cria um novo ID.
        // Removemos da formação antiga o ID que existia antes do roubo.
        familiaOriginal.vivos.delete(idOriginal);
        if (familiaOriginal.vivos.size === 0) familiasEsqueleto.delete(familiaOriginalId);
        else atualizarContadoresEsqueleto(familiaOriginalId);

        let novaFamiliaId = proximaFamiliaEsqueleto++;
        let novoLado = novoDonoEhJ1 ? "j1" : "j2";
        familiasEsqueleto.set(novaFamiliaId, {
            vivos: new Set(),
            lado: novoLado,
            contaComoCartaDaOnda: false
        });
        decorarPacoteEsqueleto({
            inimigoEspecial: "esqueleto",
            familiaEsqueleto: novaFamiliaId,
            idUnico,
            ladoEsqueleto: novoLado,
            contaComoCartaDaOnda: false
        });
        return true;
    }

    function membrosEsqueletoNoCampo(familiaId) {
        let familia = familiasEsqueleto.get(familiaId);
        if (!familia) return [];
        let campoId = "campo-" + familia.lado;
        return Array.from(familia.vivos).filter(id => {
            let pacote = document.getElementById("pacote-" + id);
            return pacote && pacote.closest("#" + campoId);
        });
    }

    function animarAtaqueColetivoEsqueleto(idsAtacantes, idPacoteAlvo) {
        let alvo = document.getElementById(idPacoteAlvo);
        if (!alvo) return;
        let destino = alvo.getBoundingClientRect();
        let destinoX = destino.left + destino.width / 2;
        let destinoY = destino.top + destino.height / 2;

        idsAtacantes.forEach((idUnico, indice) => {
            let pacote = document.getElementById("pacote-" + idUnico);
            if (!pacote) return;
            let origem = pacote.getBoundingClientRect();
            let golpe = document.createElement("span");
            golpe.className = "golpe-grupo-esqueleto-rpg";
            golpe.textContent = "💀";
            golpe.style.left = (origem.left + origem.width / 2) + "px";
            golpe.style.top = (origem.top + origem.height / 2) + "px";
            golpe.style.setProperty("--esqueleto-x", (destinoX - origem.left - origem.width / 2) + "px");
            golpe.style.setProperty("--esqueleto-y", (destinoY - origem.top - origem.height / 2) + "px");
            golpe.style.animationDelay = (indice * 45) + "ms";
            document.body.appendChild(golpe);
            pacote.classList.add("esqueleto-atacando-em-grupo");
            setTimeout(() => {
                golpe.remove();
                if (pacote.isConnected) pacote.classList.remove("esqueleto-atacando-em-grupo");
            }, 900 + indice * 45);
        });

        alvo.classList.remove("impacto-grupo-esqueleto-rpg");
        void alvo.offsetWidth;
        alvo.classList.add("impacto-grupo-esqueleto-rpg");
        setTimeout(() => {
            if (alvo.isConnected) alvo.classList.remove("impacto-grupo-esqueleto-rpg");
        }, 900);
    }

    function animarNascimentoNovoEsqueleto(pacote) {
        if (!pacote) return;
        let retangulo = pacote.getBoundingClientRect();
        let montagem = document.createElement("span");
        montagem.className = "montagem-nascimento-esqueleto-rpg";
        montagem.setAttribute("aria-hidden", "true");
        montagem.style.left = (retangulo.left + retangulo.width / 2) + "px";
        montagem.style.top = (retangulo.top + retangulo.height * .58) + "px";

        let terra = document.createElement("b");
        terra.className = "terra-abrindo-esqueleto-rpg";
        montagem.appendChild(terra);

        let partes = [
            { simbolo: "💀", tipo: "cranio", inicioX: -38, inicioY: 63, fimX: 0, fimY: -34, rotacao: 0 },
            { simbolo: "🦴", tipo: "tronco", inicioX: 31, inicioY: 72, fimX: 0, fimY: -3, rotacao: 90 },
            { simbolo: "🦴", tipo: "osso", inicioX: -47, inicioY: 70, fimX: -17, fimY: -7, rotacao: -42 },
            { simbolo: "🦴", tipo: "osso", inicioX: 45, inicioY: 66, fimX: 17, fimY: -7, rotacao: 42 },
            { simbolo: "🦴", tipo: "osso", inicioX: -25, inicioY: 79, fimX: -9, fimY: 23, rotacao: -18 },
            { simbolo: "🦴", tipo: "osso", inicioX: 22, inicioY: 82, fimX: 9, fimY: 23, rotacao: 18 }
        ];

        partes.forEach((parte, indice) => {
            let elemento = document.createElement("i");
            elemento.className = `parte-esqueleto-rpg parte-${parte.tipo}-esqueleto-rpg`;
            elemento.textContent = parte.simbolo;
            elemento.style.setProperty("--parte-inicio-x", `${parte.inicioX}px`);
            elemento.style.setProperty("--parte-inicio-y", `${parte.inicioY}px`);
            elemento.style.setProperty("--parte-fim-x", `${parte.fimX}px`);
            elemento.style.setProperty("--parte-fim-y", `${parte.fimY}px`);
            elemento.style.setProperty("--parte-rotacao", `${parte.rotacao}deg`);
            elemento.style.animationDelay = `${indice * 48}ms`;
            montagem.appendChild(elemento);
        });

        document.body.appendChild(montagem);
        setTimeout(() => montagem.remove(), 1450);
    }

    function invocarNovoEsqueleto(familiaId) {
        let familia = familiasEsqueleto.get(familiaId);
        if (!familia) return null;
        let membros = membrosEsqueletoNoCampo(familiaId);
        if (membros.length === 0 || membros.length >= LIMITE_ESQUELETOS) return null;

        let campo = document.getElementById("campo-" + familia.lado);
        if (!campo) return null;
        let carta = criarCartaEsqueleto(familiaId, familia.vivos.size + 1);
        carta.ladoEsqueleto = familia.lado;
        carta.contaComoCartaDaOnda = familia.contaComoCartaDaOnda;
        let ehAliado = familia.lado === "j1";
        campo.insertAdjacentHTML(
            "beforeend",
            criarHTMLCarta(carta, ehAliado ? "jogarCarta" : "jogarCartaInimigo", ehAliado ? "carta-aliada" : "carta-inimiga", ehAliado)
        );
        if (ehAliado) jogarCarta("pacote-" + carta.idUnico, true);
        else jogarCartaInimigo("pacote-" + carta.idUnico, true);
        decorarPacoteEsqueleto(carta);

        let pacote = document.getElementById("pacote-" + carta.idUnico);
        if (pacote) {
            pacote.classList.add("nascimento-esqueleto-rpg");
            animarNascimentoNovoEsqueleto(pacote);
        }
        setTimeout(() => {
            if (pacote && pacote.isConnected) pacote.classList.remove("nascimento-esqueleto-rpg");
        }, 1350);
        narrar(`💀 A tropa cresceu! Agora ${membros.length + 1} Esqueletos atacarão juntos.`);
        atualizarPainel();
        return pacote;
    }

    function registrarCtrlComoSlime(idUnico, ehAliado) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote) return false;

        let familiaId = proximaFamiliaSlime++;
        let cartaCtrlSlime = {
            ...criarCartaSlime(familiaId, 0, proximoFragmentoSlime++),
            idUnico,
            ladoSlime: ehAliado ? "j1" : "j2",
            contaComoCartaDaOnda: false
        };

        let vida = document.getElementById("vida-" + idUnico);
        let dano = document.getElementById("dano-" + idUnico);
        if (vida) vida.innerText = "9";
        if (dano) dano.innerText = "1";
        decorarPacoteSlime(cartaCtrlSlime);
        return true;
    }

    function registrarSlimeRevivido(idUnico, ehAliado) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote) return false;

        let familiaId = proximaFamiliaSlime++;
        decorarPacoteSlime({
            ...criarCartaSlime(familiaId, 0, proximoFragmentoSlime++),
            idUnico,
            ladoSlime: ehAliado ? "j1" : "j2",
            contaComoCartaDaOnda: false
        });
        return true;
    }

    function registrarCopiaSlime(idCopia, ehAliado, idOriginal) {
        let dadosOriginais = obterFamiliaDoSlime(idOriginal);
        let pacoteCopia = document.getElementById("pacote-" + idCopia);
        if (!dadosOriginais || !pacoteCopia) return false;

        let familiaId = proximaFamiliaSlime++;
        decorarPacoteSlime({
            ...criarCartaSlime(familiaId, dadosOriginais.familia.estagio, proximoFragmentoSlime++),
            idUnico: idCopia,
            ladoSlime: ehAliado ? "j1" : "j2",
            contaComoCartaDaOnda: false
        });
        return true;
    }

    function obterPacoteSlime(idUnico) {
        let pacote = document.getElementById("pacote-" + idUnico);
        return pacote && pacote.dataset.inimigoEspecial === "slime" ? pacote : null;
    }

    function obterFamiliaDoSlime(idUnico) {
        let pacote = obterPacoteSlime(idUnico);
        if (!pacote) return null;
        let familiaId = Number(pacote.dataset.slimeFamilia);
        let familia = familiasSlime.get(familiaId);
        return familia ? { pacote, familiaId, familia } : null;
    }

    function obterIdsFamiliaSlime(idUnico) {
        let dados = obterFamiliaDoSlime(idUnico);
        return dados ? Array.from(dados.familia.vivos) : [];
    }

    // O Cracker captura todos os integrantes ainda vivos da formação. O objeto
    // devolvido guarda o estágio para que os novos pacotes continuem a mesma família.
    function prepararRouboFamiliaSlime(idUnico) {
        let dados = obterFamiliaDoSlime(idUnico);
        if (!dados) return null;

        let membros = Array.from(dados.familia.vivos).filter(id => obterPacoteSlime(id));
        membros.forEach(id => remocoesSlimeSemDivisao.add(id));
        familiasSlime.delete(dados.familiaId);

        return {
            estagio: dados.familia.estagio,
            membros
        };
    }

    // Ícaro transforma a família conceitualmente em uma única carta nova. Os
    // irmãos somem sem dividir, mas o alvo clicado fica no DOM até main.js colocar
    // a nova carta exatamente na posição dele.
    function prepararTransformacaoFamiliaSlime(idUnico) {
        let dados = obterFamiliaDoSlime(idUnico);
        if (!dados) return null;

        let membros = Array.from(dados.familia.vivos);
        membros.forEach(id => remocoesSlimeSemDivisao.add(id));
        familiasSlime.delete(dados.familiaId);
        membros.forEach(id => {
            if (id === idUnico) return;
            let pacote = document.getElementById("pacote-" + id);
            if (pacote) pacote.remove();
        });

        return {
            quantidade: membros.length,
            estagio: dados.familia.estagio
        };
    }

    function concluirTransformacaoFamiliaSlime() {
        marcarProximaOndaSeNecessario();
        atualizarPainel();
    }

    function registrarFamiliaSlimeRoubada(idsUnicos, ehAliado, estagio) {
        let idsValidos = (idsUnicos || []).filter(id => document.getElementById("pacote-" + id));
        if (idsValidos.length === 0) return false;

        let familiaId = proximaFamiliaSlime++;
        let lado = ehAliado ? "j1" : "j2";
        familiasSlime.set(familiaId, {
            estagio,
            vivos: new Set(),
            dividindo: false,
            lado,
            contaComoCartaDaOnda: false
        });

        idsValidos.forEach(idUnico => {
            decorarPacoteSlime({
                ...criarCartaSlime(familiaId, estagio, proximoFragmentoSlime++),
                idUnico,
                ladoSlime: lado,
                contaComoCartaDaOnda: false
            });
        });

        marcarProximaOndaSeNecessario();
        atualizarPainel();
        return true;
    }

    // O Viajante apaga a linha temporal inteira. Nenhum dos pacotes removidos
    // é tratado como morto, logo a família não cria a próxima fase.
    function apagarFamiliaSlime(idUnico) {
        let dados = obterFamiliaDoSlime(idUnico);
        if (!dados) return 0;

        let ids = Array.from(dados.familia.vivos);
        ids.forEach(id => remocoesSlimeSemDivisao.add(id));
        familiasSlime.delete(dados.familiaId);
        ids.forEach(id => {
            let pacote = document.getElementById("pacote-" + id);
            if (pacote) pacote.remove();
        });

        marcarProximaOndaSeNecessario();
        implantarProximaOnda();
        atualizarPainel();
        return ids.length;
    }

    // Guarda a posição de cada Slime pouco antes da remoção. Quando dano em área
    // ou fogo elimina o grupo inteiro no mesmo ciclo, o MutationObserver só
    // atualiza a família depois de todas as remoções; por isso a decisão de
    // animar é tomada mais tarde, usando a última origem que foi registrada.
    function prepararAnimacaoDivisaoSlime(idUnico) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote || pacote.dataset.inimigoEspecial !== "slime") return false;

        let familiaId = Number(pacote.dataset.slimeFamilia);
        let familia = familiasSlime.get(familiaId);
        if (!familia || familia.dividindo || !familia.vivos.has(idUnico)) return false;
        if (familia.estagio + 1 >= ESTAGIOS_SLIME.length) return false;
        if (typeof window.rpgCartaSilenciadaPeloEcto === "function"
            && window.rpgCartaSilenciadaPeloEcto(idUnico)) return false;

        let retangulo = pacote.getBoundingClientRect();
        let fantasma = pacote.cloneNode(true);
        fantasma.removeAttribute("id");
        fantasma.querySelectorAll("[id]").forEach(elemento => elemento.removeAttribute("id"));
        fantasma.querySelectorAll("button").forEach(botao => botao.disabled = true);
        fantasma.classList.remove("nascimento-slime-rpg");
        fantasma.classList.add("divisao-slime-origem-rpg");
        fantasma.setAttribute("aria-hidden", "true");
        fantasma.style.left = retangulo.left + "px";
        fantasma.style.top = retangulo.top + "px";
        fantasma.style.width = retangulo.width + "px";
        fantasma.style.height = retangulo.height + "px";

        origensVisuaisDivisaoSlime.set(familiaId, {
            x: retangulo.left + retangulo.width / 2,
            y: retangulo.top + retangulo.height / 2,
            fantasma
        });
        return true;
    }

    function iniciarAnimacaoOrigemDivisaoSlime(familiaId) {
        let origem = origensVisuaisDivisaoSlime.get(familiaId);
        if (!origem || !origem.fantasma) return false;
        document.body.appendChild(origem.fantasma);
        setTimeout(() => origem.fantasma.remove(), 900);
        return true;
    }

    function invocarProximaFaseSlime(familiaId, estagio) {
        let atributos = ESTAGIOS_SLIME[estagio];
        let familia = familiasSlime.get(familiaId);
        if (!atributos || !familia) return false;
        let campo = document.getElementById("campo-" + familia.lado);
        if (!campo) return false;

        familia.estagio = estagio;
        familia.vivos = new Set();
        familia.dividindo = true;
        if (estado) estado.implantando = true;

        let origemVisual = origensVisuaisDivisaoSlime.get(familiaId);
        for (let fragmento = 1; fragmento <= atributos.quantidade; fragmento++) {
            let carta = criarCartaSlime(familiaId, estagio, proximoFragmentoSlime++);
            carta.ladoSlime = familia.lado;
            carta.contaComoCartaDaOnda = familia.contaComoCartaDaOnda;
            let ehAliado = familia.lado === "j1";
            let funcaoJogar = ehAliado ? "jogarCarta" : "jogarCartaInimigo";
            let classe = ehAliado ? "carta-aliada" : "carta-inimiga";
            campo.insertAdjacentHTML("beforeend", criarHTMLCarta(carta, funcaoJogar, classe, ehAliado));
            if (ehAliado) jogarCarta("pacote-" + carta.idUnico, true);
            else jogarCartaInimigo("pacote-" + carta.idUnico, true);
            decorarPacoteInimigoEspecial(carta);
            let pacote = document.getElementById("pacote-" + carta.idUnico);
            if (pacote) {
                pacote.style.setProperty("--atraso-slime", `${(fragmento - 1) * 100}ms`);
                if (origemVisual) {
                    let destino = pacote.getBoundingClientRect();
                    pacote.style.setProperty("--origem-slime-x", `${origemVisual.x - (destino.left + destino.width / 2)}px`);
                    pacote.style.setProperty("--origem-slime-y", `${origemVisual.y - (destino.top + destino.height / 2)}px`);
                }
                void pacote.offsetWidth;
                pacote.classList.add("nascimento-slime-rpg");
                setTimeout(() => {
                    if (!pacote.isConnected) return;
                    pacote.classList.remove("nascimento-slime-rpg");
                    pacote.style.removeProperty("--atraso-slime");
                    pacote.style.removeProperty("--origem-slime-x");
                    pacote.style.removeProperty("--origem-slime-y");
                }, 1450 + (fragmento - 1) * 100);
            }
        }

        setTimeout(() => {
            if (origensVisuaisDivisaoSlime.get(familiaId) === origemVisual) {
                origensVisuaisDivisaoSlime.delete(familiaId);
            }
        }, 1600);

        familia.dividindo = false;
        if (estado) estado.implantando = false;
        atualizarPainel();
        narrar(`🟢 Nova fase do Slime! Nasceram ${atributos.quantidade} unidades independentes, cada uma com ${atributos.vida} de vida e ${atributos.dano} de dano.`);
        return true;
    }

    function processarMortesSlime(mutacoes) {
        let familiasParaAvancar = new Set();
        let familiasSilenciadas = new Set();

        mutacoes.forEach(mutacao => {
            mutacao.removedNodes.forEach(no => {
                if (!(no instanceof HTMLElement) || !no.matches("[data-inimigo-especial='slime']")) return;
                // Se a carta apenas mudou de recipiente, ela continua viva.
                if (no.isConnected) return;

                let familiaId = Number(no.dataset.slimeFamilia);
                let idSlime = no.dataset.slimeId;
                if (remocoesSlimeSemDivisao.has(idSlime)) {
                    remocoesSlimeSemDivisao.delete(idSlime);
                    return;
                }
                let familia = familiasSlime.get(familiaId);
                if (!familia || familia.dividindo) return;

                if (typeof window.rpgCartaSilenciadaPeloEcto === "function"
                    && window.rpgCartaSilenciadaPeloEcto(idSlime)) {
                    familiasSilenciadas.add(familiaId);
                }

                familia.vivos.delete(idSlime);
                // Cada unidade é independente na batalha, mas a formação seguinte
                // só nasce quando todas as unidades da formação atual morrerem.
                if (familia.vivos.size === 0) familiasParaAvancar.add(familiaId);
            });
        });

        familiasParaAvancar.forEach(familiaId => {
            let familia = familiasSlime.get(familiaId);
            if (!familia) return;
            if (familiasSilenciadas.has(familiaId)) {
                let ladoDaFamilia = familia.lado;
                familiasSlime.delete(familiaId);
                origensVisuaisDivisaoSlime.delete(familiaId);
                if (typeof registrarMorte === "function") {
                    registrarMorte("Slime", ladoDaFamilia, { familiaSlimeCompleta: true });
                }
                narrar("👻 A família Slime perdeu a Passiva do Ecto e não conseguiu se dividir.");
                return;
            }
            let proximoEstagio = familia.estagio + 1;
            if (proximoEstagio < ESTAGIOS_SLIME.length) {
                iniciarAnimacaoOrigemDivisaoSlime(familiaId);
                invocarProximaFaseSlime(familiaId, proximoEstagio);
            } else {
                let ladoDaFamilia = familia.lado;
                familiasSlime.delete(familiaId);
                origensVisuaisDivisaoSlime.delete(familiaId);
                if (typeof registrarMorte === "function") {
                    registrarMorte("Slime", ladoDaFamilia, { familiaSlimeCompleta: true });
                }
                narrar("💥 A família de Slimes foi derrotada por completo!");
            }
        });
    }

    function processarMortesEsqueleto(mutacoes) {
        let familiasAlteradas = new Set();
        mutacoes.forEach(mutacao => {
            mutacao.removedNodes.forEach(no => {
                if (!(no instanceof HTMLElement) || !no.matches("[data-inimigo-especial='esqueleto']")) return;
                let idEsqueleto = no.dataset.esqueletoId;

                // jogarCarta usa appendChild para levar a MESMA carta da mão
                // ao campo. A marca explícita impede que essa remoção da mão
                // afete qualquer família, mesmo com várias formações ativas.
                if (movimentacoesEsqueletoSemMorte.has(idEsqueleto)) {
                    movimentacoesEsqueletoSemMorte.delete(idEsqueleto);
                    let cartaMovida = document.getElementById("pacote-" + idEsqueleto);
                    if (cartaMovida === no && no.isConnected) return;
                }
                // Mover da mão para o campo não é morte.
                if (no.isConnected) return;

                let familiaId = Number(no.dataset.esqueletoFamilia);
                let familia = familiasEsqueleto.get(familiaId);
                if (!familia) return;
                // O Bruxo reconstrói a carta com o mesmo ID no campo do novo
                // dono. Nesse caso o elemento antigo saiu, mas o Esqueleto vive.
                let substituto = document.getElementById("pacote-" + idEsqueleto);
                if (substituto && substituto !== no && substituto.dataset.inimigoEspecial === "esqueleto") return;
                familia.vivos.delete(idEsqueleto);
                familiasAlteradas.add(familiaId);
            });
        });

        familiasAlteradas.forEach(familiaId => {
            let familia = familiasEsqueleto.get(familiaId);
            if (!familia) return;
            if (familia.vivos.size === 0) {
                familiasEsqueleto.delete(familiaId);
                narrar("💥 O último Esqueleto do grupo foi derrotado!");
            } else {
                atualizarContadoresEsqueleto(familiaId);
            }
        });
    }

    function cartasNo(containerId) {
        let container = document.getElementById(containerId);
        if (!container) return 0;
        return container.querySelectorAll(":scope > div[id^='pacote-']").length;
    }

    function quantidadeAtiva() {
        return cartasNo("campo-j2") + cartasNo("mao-j2");
    }

    function existeFamiliaSlimeEmCombate() {
        return Array.from(familiasSlime.values()).some(familia =>
            familia.lado === "j2" && familia.contaComoCartaDaOnda
        );
    }

    function garantirPainelOndas() {
        let painel = document.getElementById("status-ondas-inimigo");
        if (painel || !modoAtivo()) return painel;

        painel = document.createElement("div");
        painel.id = "status-ondas-inimigo";
        painel.className = "status-ondas-inimigo";
        painel.setAttribute("aria-live", "polite");

        let barra = document.querySelector(".barra-partida-rpg");
        if (barra) barra.appendChild(painel);
        return painel;
    }

    function renderizarReserva() {
        let mao = document.getElementById("mao-j2");
        if (!mao || !estado) return;

        let anterior = mao.querySelector(".reserva-monstro-rpg");
        if (anterior && Number(anterior.dataset.quantidade) === estado.reserva.length) return;
        if (anterior) anterior.remove();

        let reserva = document.createElement("div");
        reserva.className = "reserva-monstro-rpg";
        reserva.dataset.quantidade = String(estado.reserva.length);
        reserva.setAttribute("aria-label", `${estado.reserva.length} cartas ainda estão na reserva do monstro`);

        let quantidadeCostas = Math.min(estado.reserva.length, 5);
        for (let indice = 0; indice < quantidadeCostas; indice++) {
            let costa = document.createElement("span");
            costa.className = "costa-carta-monstro-rpg";
            costa.setAttribute("aria-hidden", "true");
            reserva.appendChild(costa);
        }

        let texto = document.createElement("small");
        texto.textContent = estado.reserva.length === 1
            ? "1 inimigo na reserva"
            : `${estado.reserva.length} inimigos na reserva`;
        reserva.appendChild(texto);
        mao.appendChild(reserva);
    }

    function atualizarPainel() {
        if (!estado) return;
        let painel = garantirPainelOndas();
        if (painel) {
            let situacao = estado.proximaOndaPendente
                ? `Próxima onda: ${estado.tamanhoProxima}`
                : `${cartasNo("campo-j2")} em campo`;
            painel.innerHTML = `<small>INVASÃO DO MONSTRO</small><strong>Onda ${estado.onda}</strong><span>${situacao} · ${estado.reserva.length} na reserva</span>`;
        }
        renderizarReserva();
    }

    function obterRecompensaTrofeus(jogadorVenceu) {
        if (!estado) return null;

        // A recompensa não é acumulativa: vale apenas a melhor faixa atingida.
        // Concluir todas as ondas é o resultado máximo. Se o jogador cair antes,
        // a maior onda alcançada decide quanto ele ganha ou perde.
        if (jogadorVenceu) {
            return { valor: 10, motivo: "concluir a última onda" };
        }
        if (estado.onda >= 4) {
            return { valor: 5, motivo: "chegar à onda 4" };
        }
        if (estado.onda >= 3) {
            return { valor: 2, motivo: "chegar à onda 3" };
        }
        if (estado.onda === 2) {
            return { valor: -2, motivo: "ser derrotado na onda 2" };
        }
        return { valor: -5, motivo: "ser derrotado na onda 1" };
    }

    function marcarProximaOndaSeNecessario() {
        if (!estado || faseAbertura || estado.implantando || estado.proximaOndaPendente) return;
        // Um Slime grande, os 2 médios, os 3 pequenos e os 4 mínimos são
        // uma única carta da onda. A reserva só avança depois que a família
        // chega ao último estágio e todos os quatro Slimes finais morrem.
        if (existeFamiliaSlimeEmCombate()) {
            atualizarPainel();
            return;
        }
        if (quantidadeAtiva() > 0 || estado.reserva.length === 0) {
            atualizarPainel();
            return;
        }

        estado.onda += 1;
        estado.tamanhoProxima = Math.min(
            estado.reserva.length,
            estado.tamanhoUltimaOnda + estado.incremento
        );
        estado.tamanhoUltimaOnda = estado.tamanhoProxima;
        estado.proximaOndaPendente = true;
        atualizarPainel();

        if (typeof narrar === "function") {
            narrar(`🌊 Onda derrotada! No próximo turno do monstro entram ${estado.tamanhoProxima} inimigos.`);
        }
    }

    function implantarProximaOnda(forcarDuranteTurnoJogador = false) {
        marcarProximaOndaSeNecessario();
        if (!estado || !estado.proximaOndaPendente || (!forcarDuranteTurnoJogador && turnoAtivo !== 2) || !jogoIniciado) return false;

        let mao = document.getElementById("mao-j2");
        if (!mao) return false;

        estado.implantando = true;
        estado.proximaOndaPendente = false;
        let quantidade = Math.min(estado.tamanhoProxima, estado.reserva.length);
        let convocados = estado.reserva.splice(0, quantidade);

        convocados.forEach((carta, indice) => {
            mao.insertAdjacentHTML("beforeend", criarHTMLCarta(carta, "jogarCartaInimigo", "carta-inimiga-espera entrada-onda-monstro", false));
            jogarCartaInimigo("pacote-" + carta.idUnico);
            decorarPacoteInimigoEspecial(carta);
            let pacote = document.getElementById("pacote-" + carta.idUnico);
            if (pacote) {
                pacote.classList.add("entrada-onda-monstro");
                pacote.style.setProperty("--atraso-onda", `${indice * 90}ms`);
            }
        });

        estado.implantando = false;
        atualizarPainel();
        if (typeof narrar === "function") {
            narrar(`👹 Onda ${estado.onda}: o monstro colocou ${quantidade} ${quantidade === 1 ? "inimigo" : "inimigos"} em campo!`);
        }
        return true;
    }

    function reporCampoVazio() {
        if (!modoAtivo() || !estado || !jogoIniciado || faseAbertura) return false;
        if (cartasNo("campo-j2") > 0) return false;
        marcarProximaOndaSeNecessario();
        return implantarProximaOnda(true);
    }

    // O Cavalo de Tróia atinge o exército inteiro do monstro. As cartas que ainda
    // não apareceram existem apenas como objetos na reserva, então o dano precisa
    // ser persistido aqui para que elas entrem em uma onda futura já feridas.
    // Se uma carta de 1 de vida morrer na reserva, ela é retirada antes de aparecer.
    function aplicarDanoNaReserva(dano) {
        let valor = Number(dano);
        if (!modoAtivo() || !estado || !Number.isFinite(valor) || valor <= 0) {
            return { atingidas: 0, eliminadas: 0 };
        }

        let atingidas = 0;
        let eliminadas = 0;
        let idsEliminados = new Set();

        estado.reserva = estado.reserva.filter(carta => {
            let vidaAtual = Number(carta && carta.vida);
            if (!Number.isFinite(vidaAtual)) return true;

            atingidas++;
            carta.vida = Math.max(0, vidaAtual - valor);

            // deckJ2 mantém referências das cartas da reserva, mas sincronizamos
            // explicitamente para continuar correto mesmo se isso mudar depois.
            if (Array.isArray(deckJ2)) {
                let copiaNoDeck = deckJ2.find(item => item && item.idUnico === carta.idUnico);
                if (copiaNoDeck) copiaNoDeck.vida = carta.vida;
            }

            if (carta.vida > 0) return true;
            eliminadas++;
            idsEliminados.add(carta.idUnico);
            return false;
        });

        if (idsEliminados.size > 0 && Array.isArray(deckJ2)) {
            deckJ2 = deckJ2.filter(carta => !carta || !idsEliminados.has(carta.idUnico));
        }

        if (estado.proximaOndaPendente) {
            estado.tamanhoProxima = Math.min(estado.tamanhoProxima, estado.reserva.length);
            if (estado.reserva.length === 0) estado.proximaOndaPendente = false;
        }

        atualizarPainel();
        return { atingidas, eliminadas };
    }

    function prepararPartida() {
        if (!modoAtivo()) {
            estado = null;
            let painelAntigo = document.getElementById("status-ondas-inimigo");
            if (painelAntigo) painelAntigo.remove();
            return;
        }

        idPartida += 1;
        familiasSlime = new Map();
        origensVisuaisDivisaoSlime = new Map();
        familiasEsqueleto = new Map();
        progressoZumbi = new Map();
        sincronizarMarcasVisuaisZumbi();
        alvosAicer = new Map();
        crescimentosPendentesEsqueleto = new Map();
        movimentacoesEsqueletoSemMorte = new Set();
        remocoesSlimeSemDivisao = new Set();
        proximoFragmentoSlime = 1;
        proximoEsqueleto = 1;
        proximoZumbi = 1;
        proximoAicer = 1;
        proximoEcto = 1;
        proximoFraguer = 1;
        fundindoFraguers = false;
        fraguersVisuaisPorLado = { j1: new Set(), j2: new Set() };
        proximoSpiritista = 1;
        origensAlmasSpiritista = new Map();
        proximoSeteNegativo = 1;
        ataqueEsqueletoPendente = null;
        if (timerCrescimentoEsqueleto !== null) clearTimeout(timerCrescimentoEsqueleto);
        timerCrescimentoEsqueleto = null;
        let baralho = criarBaralhoInimigo(5);
        let primeiraCarta = baralho.shift();

        estado = {
            onda: 1,
            incremento: 1,
            tamanhoUltimaOnda: 1,
            tamanhoProxima: 1,
            proximaOndaPendente: false,
            implantando: false,
            reserva: baralho
        };

        maoJ2 = primeiraCarta ? [primeiraCarta] : [];
        deckJ2 = [...baralho];

        let mao = document.getElementById("mao-j2");
        mao.innerHTML = "<h3>Mão do Monstro</h3>";
        if (primeiraCarta) {
            mao.insertAdjacentHTML("beforeend", criarHTMLCarta(primeiraCarta, "jogarCartaInimigo", "carta-inimiga-espera", false));
            decorarPacoteInimigoEspecial(primeiraCarta);
        }

        atualizarPainel();

        if (observadorCampo) observadorCampo.disconnect();
        observadorCampo = new MutationObserver(mutacoes => {
            processarMortesSlime(mutacoes);
            processarMortesEsqueleto(mutacoes);
            sincronizarMarcasVisuaisZumbi();
            sincronizarFraguers();
            marcarProximaOndaSeNecessario();
            // A última morte pode ocorrer depois que o turno já virou para o
            // bot. Nesse caso, convoca a onda agora, antes de a IA agir.
            implantarProximaOnda();
            atualizarPainel();
        });
        // Campos e mãos são observados porque Reviverta, Cracker e Dupliquetion
        // podem criar famílias em qualquer lado antes de elas entrarem na arena.
        ["campo-j1", "campo-j2", "mao-j1", "mao-j2"].forEach(idArea => {
            let area = document.getElementById(idArea);
            if (area) observadorCampo.observe(area, { childList: true });
        });
    }

    function aindaTemInimigos() {
        if (!estado) return false;
        marcarProximaOndaSeNecessario();
        return existeFamiliaSlimeEmCombate()
            || quantidadeAtiva() > 0
            || estado.reserva.length > 0
            || estado.proximaOndaPendente;
    }

    function ehZumbiAtivo(idUnico, lado) {
        let pacote = idUnico ? document.getElementById("pacote-" + idUnico) : null;
        if (!pacote || pacote.dataset.inimigoEspecial !== "zumbi") return false;
        if (typeof window.rpgCartaSilenciadaPeloEcto === "function" && window.rpgCartaSilenciadaPeloEcto(idUnico)) return false;
        return lado === "j1"
            ? pacote.closest("#campo-j1") !== null
            : pacote.closest("#campo-j2") !== null;
    }

    // Cada Zumbi acompanha somente o último alvo atacado. Trocar de alvo reinicia
    // a contagem; acertar o mesmo sobrevivente pela segunda vez conclui a infecção.
    function concluirAtaqueZumbi(idZumbi, idPacoteAlvo, ladoZumbi) {
        if (!ehZumbiAtivo(idZumbi, ladoZumbi)) return false;
        let idAlvo = String(idPacoteAlvo || "").replace("pacote-", "");
        let pacoteAlvo = document.getElementById("pacote-" + idAlvo);
        let progresso = progressoZumbi.get(idZumbi) || { alvoId: null, golpes: 0 };

        // Uma carta destruída pelo golpe não pode ser infectada nem continuar marcada.
        if (!pacoteAlvo) {
            progressoZumbi.set(idZumbi, { alvoId: null, golpes: 0 });
            atualizarSeloZumbi(idZumbi);
            sincronizarMarcasVisuaisZumbi();
            return false;
        }

        if (progresso.alvoId === idAlvo) progresso.golpes += 1;
        else progresso = { alvoId: idAlvo, golpes: 1 };
        progressoZumbi.set(idZumbi, progresso);
        atualizarSeloZumbi(idZumbi);
        animarMordidaZumbi(pacoteAlvo);
        sincronizarMarcasVisuaisZumbi();

        pacoteAlvo.classList.remove("marca-infeccao-zumbi-rpg");
        void pacoteAlvo.offsetWidth;
        pacoteAlvo.classList.add("marca-infeccao-zumbi-rpg");
        setTimeout(() => pacoteAlvo.isConnected && pacoteAlvo.classList.remove("marca-infeccao-zumbi-rpg"), 900);

        if (progresso.golpes < 2) {
            narrar("🧟 Infecção iniciada! Se o Zumbi atacar esta mesma carta novamente, ela trocará de lado.");
            return true;
        }

        let animacoesConversao = prepararAnimacaoConversaoZumbi(idAlvo);
        progressoZumbi.set(idZumbi, { alvoId: null, golpes: 0 });
        atualizarSeloZumbi(idZumbi);
        sincronizarMarcasVisuaisZumbi();
        let novoDonoEhJ1 = ladoZumbi === "j1";
        let conversao = typeof window.rpgConverterVitimaZumbi === "function"
            ? window.rpgConverterVitimaZumbi(idAlvo, novoDonoEhJ1)
            : null;
        if (conversao) {
            finalizarAnimacaoConversaoZumbi(animacoesConversao);
            narrar(`🧟 INFECÇÃO COMPLETA! ${conversao.nome} agora luta no lado do Zumbi com metade da vida original.`);
        }
        return !!conversao;
    }

    function ehAicerAtivo(idUnico, lado) {
        let pacote = idUnico ? document.getElementById("pacote-" + idUnico) : null;
        if (!pacote || pacote.dataset.inimigoEspecial !== "aicer") return false;
        if (typeof window.rpgCartaSilenciadaPeloEcto === "function" && window.rpgCartaSilenciadaPeloEcto(idUnico)) return false;
        return lado === "j1"
            ? pacote.closest("#campo-j1") !== null
            : pacote.closest("#campo-j2") !== null;
    }

    function animarFragmentosAtaqueAicer(idAicer, pacoteAlvo) {
        let pacoteAicer = document.getElementById("pacote-" + idAicer);
        if (!pacoteAicer || !pacoteAlvo?.isConnected) return;

        let origem = pacoteAicer.getBoundingClientRect();
        let destino = pacoteAlvo.getBoundingClientRect();
        let inicioX = origem.left + origem.width / 2;
        let inicioY = origem.top + origem.height * .42;
        let fimX = destino.left + destino.width / 2;
        let fimY = destino.top + destino.height * .42;

        pacoteAicer.classList.remove("aicer-lancando-gelo-rpg");
        void pacoteAicer.offsetWidth;
        pacoteAicer.classList.add("aicer-lancando-gelo-rpg");
        pacoteAlvo.classList.remove("impacto-fragmentos-aicer-rpg");
        void pacoteAlvo.offsetWidth;

        [-16, 0, 16].forEach((desvio, indice) => {
            let fragmento = document.createElement("span");
            fragmento.className = "fragmento-ataque-aicer-rpg";
            fragmento.style.left = `${inicioX}px`;
            fragmento.style.top = `${inicioY}px`;
            fragmento.style.setProperty("--aicer-gelo-x", `${fimX - inicioX + desvio}px`);
            fragmento.style.setProperty("--aicer-gelo-y", `${fimY - inicioY + desvio * .22}px`);
            fragmento.style.setProperty("--aicer-gelo-meio-x", `${(fimX - inicioX + desvio) * .52}px`);
            fragmento.style.setProperty("--aicer-gelo-meio-y", `${(fimY - inicioY + desvio * .22) * .52}px`);
            fragmento.style.setProperty("--aicer-gelo-curva", `${(indice - 1) * 12}px`);
            fragmento.style.setProperty("--aicer-gelo-atraso", `${indice * 55}ms`);
            document.body.appendChild(fragmento);
            setTimeout(() => fragmento.remove(), 950);
        });

        setTimeout(() => {
            if (!pacoteAlvo.isConnected) return;
            pacoteAlvo.classList.add("impacto-fragmentos-aicer-rpg");
            setTimeout(() => pacoteAlvo?.isConnected && pacoteAlvo.classList.remove("impacto-fragmentos-aicer-rpg"), 620);
        }, 470);
        setTimeout(() => pacoteAicer?.isConnected && pacoteAicer.classList.remove("aicer-lancando-gelo-rpg"), 720);
    }

    function animarCongelamentoAicer(pacoteAlvo) {
        if (!pacoteAlvo?.isConnected) return;
        pacoteAlvo.querySelector(".congelamento-aicer-rpg")?.remove();

        let vemDoChao = Math.random() < .5;
        let efeito = document.createElement("span");
        efeito.className = `congelamento-aicer-rpg ${vemDoChao ? "origem-chao-aicer-rpg" : "origem-ceu-aicer-rpg"}`;
        efeito.setAttribute("aria-hidden", "true");

        let clarão = document.createElement("b");
        efeito.appendChild(clarão);
        for (let indice = 0; indice < 7; indice++) {
            let fragmento = document.createElement("i");
            let deslocamento = (indice - 3) * 5 + (Math.random() * 8 - 4);
            let altura = 34 + Math.random() * 64;
            fragmento.style.left = `${8 + indice * 14}%`;
            fragmento.style.setProperty("--gelo-aicer-x", `${deslocamento}px`);
            fragmento.style.setProperty("--gelo-aicer-y", `${vemDoChao ? -altura : altura}px`);
            fragmento.style.setProperty("--gelo-aicer-rotacao", `${(vemDoChao ? 0 : 180) - 32 + Math.random() * 64}deg`);
            fragmento.style.setProperty("--gelo-aicer-tamanho", `${.7 + Math.random() * .65}`);
            fragmento.style.setProperty("--gelo-aicer-atraso", `${indice * 38}ms`);
            efeito.appendChild(fragmento);
        }

        pacoteAlvo.appendChild(efeito);
        pacoteAlvo.classList.add("congelamento-forte-aicer-rpg");
        setTimeout(() => {
            efeito.remove();
            pacoteAlvo?.isConnected && pacoteAlvo.classList.remove("congelamento-forte-aicer-rpg");
        }, 1250);
    }

    function concluirAtaqueAicer(idAicer, idPacoteAlvo, ladoAicer) {
        if (!ehAicerAtivo(idAicer, ladoAicer)) return false;
        let idAlvo = String(idPacoteAlvo || "").replace("pacote-", "");
        let pacoteAlvo = document.getElementById("pacote-" + idAlvo);
        let alvos = alvosAicer.get(idAicer) || [];

        animarFragmentosAtaqueAicer(idAicer, pacoteAlvo);

        // Repetir o mesmo alvo não completa a Passiva: é preciso atingir duas
        // cartas diferentes. O selo deixa essa regra visível durante o teste.
        if (!alvos.includes(idAlvo)) alvos.push(idAlvo);
        alvosAicer.set(idAicer, alvos.slice(0, 2));
        atualizarSeloAicer(idAicer);

        if (alvos.length < 2) {
            narrar("🧊 Aicer marcou a primeira carta. Falta atacar um alvo diferente para sortear a paralisação.");
            return true;
        }

        let ladoAlvoEsperado = ladoAicer === "j1" ? "j2" : "j1";
        let candidatos = alvos.filter(id => {
            let pacote = document.getElementById("pacote-" + id);
            return pacote && pacote.closest("#campo-" + ladoAlvoEsperado);
        });
        alvosAicer.set(idAicer, []);
        atualizarSeloAicer(idAicer);

        if (candidatos.length === 0) {
            narrar("🧊 Aicer completou dois ataques, mas as duas cartas já tinham saído da arena.");
            return false;
        }

        let idParalisado = candidatos[Math.floor(Math.random() * candidatos.length)];
        let pacoteParalisado = document.getElementById("pacote-" + idParalisado);
        let nomeParalisado = pacoteParalisado?.querySelector(".nome-carta")?.innerText?.trim() || "A carta";
        pacoteParalisado.classList.add("congelada", "paralisada-pelo-aicer-rpg");
        animarCongelamentoAicer(pacoteParalisado);
        // Três passagens: a aplicação acontece depois da troca atual, bloqueia o
        // próximo turno do dono e termina antes do turno seguinte dele.
        duracaoGelo[idParalisado] = Math.max(Number(duracaoGelo[idParalisado]) || 0, 3);
        setTimeout(() => pacoteParalisado?.isConnected && pacoteParalisado.classList.remove("paralisada-pelo-aicer-rpg"), 950);
        narrar(`🧊 SORTEIO DO AICER! ${nomeParalisado} foi paralisada por 1 rodada.`);
        if (typeof verificarBloqueioTotalGelo === "function") verificarBloqueioTotalGelo(ladoAlvoEsperado);
        return true;
    }

    function ehEctoAtivo(idUnico, lado) {
        let pacote = idUnico ? document.getElementById("pacote-" + idUnico) : null;
        if (!pacote || pacote.dataset.inimigoEspecial !== "ecto") return false;
        if (typeof window.rpgCartaSilenciadaPeloEcto === "function" && window.rpgCartaSilenciadaPeloEcto(idUnico)) return false;
        return lado === "j1"
            ? pacote.closest("#campo-j1") !== null
            : pacote.closest("#campo-j2") !== null;
    }

    function concluirAtaqueEcto(idEcto, idPacoteAlvo, ladoEcto) {
        if (!ehEctoAtivo(idEcto, ladoEcto)) return false;
        let idAlvo = String(idPacoteAlvo || "").replace("pacote-", "");
        let pacoteAlvo = document.getElementById("pacote-" + idAlvo);
        if (!pacoteAlvo) return false; // uma carta destruída não precisa ser silenciada
        if (pacoteAlvo.dataset.ectoUltimoAtacante === idEcto) {
            delete pacoteAlvo.dataset.ectoUltimoAtacante;
            let nome = pacoteAlvo.querySelector(".nome-carta")?.innerText?.replace(/\s*\(S\/Hab\)\s*$/i, "").trim() || "A carta";
            narrar(`👻 TOQUE DO ECTO! ${nome} perdeu permanentemente sua Passiva e seu Especial.`);
            return true; // o motor principal já aplicou o toque antes do dano
        }

        let resultado = typeof window.rpgSilenciarCartaPeloEcto === "function"
            ? window.rpgSilenciarCartaPeloEcto(idAlvo)
            : null;
        if (!resultado) return false;
        narrar(resultado.jaEstavaSilenciada
            ? `👻 ${resultado.nome} já estava sem habilidade; o Ecto manteve o bloqueio permanente.`
            : `👻 TOQUE DO ECTO! ${resultado.nome} perdeu permanentemente sua Passiva e seu Especial.`);
        return true;
    }

    function concluirAtaqueEsqueleto(ataque) {
        let pendentes = crescimentosPendentesEsqueleto.get(ataque.familiaId) || 0;
        crescimentosPendentesEsqueleto.set(ataque.familiaId, pendentes + 1);

        // Um único processador guarda a CONTAGEM dos ataques. Assim dois golpes
        // da Velux não podem se fundir em apenas um nascimento por causa do atraso
        // da animação: duas conclusões sempre deixam dois crescimentos na fila.
        if (timerCrescimentoEsqueleto !== null) return;
        timerCrescimentoEsqueleto = setTimeout(() => {
            timerCrescimentoEsqueleto = null;
            let fila = Array.from(crescimentosPendentesEsqueleto.entries());
            crescimentosPendentesEsqueleto.clear();

            fila.forEach(([familiaId, quantidade]) => {
                let familia = familiasEsqueleto.get(familiaId);
                if (!familia || membrosEsqueletoNoCampo(familiaId).length === 0) return;
                for (let indice = 0; indice < quantidade; indice++) {
                    if (membrosEsqueletoNoCampo(familiaId).length >= LIMITE_ESQUELETOS) break;
                    invocarNovoEsqueleto(familiaId);
                }
                if (membrosEsqueletoNoCampo(familiaId).length >= LIMITE_ESQUELETOS) {
                    narrar(`💀 Formação máxima! Os ${LIMITE_ESQUELETOS} Esqueletos atacarão juntos.`);
                }
            });
        }, 520);
    }

    function prepararAtaqueEsqueleto(idUnico, lado) {
        let dados = obterDadosEsqueleto(idUnico);
        if (!modoAtivo() || !dados || dados.familia.lado !== lado) return null;
        if (typeof window.rpgCartaSilenciadaPeloEcto === "function" && window.rpgCartaSilenciadaPeloEcto(idUnico)) return null;
        let membros = membrosEsqueletoNoCampo(dados.familiaId).slice(0, LIMITE_ESQUELETOS);
        if (membros.length === 0) return null;
        return {
            familiaId: dados.familiaId,
            lado,
            atacantes: membros,
            dano: membros.length
        };
    }

    // Qualquer Esqueleto vivo pode liderar o ataque. O motor normal continua
    // escolhendo o alvo e encerrando o turno; apenas trocamos temporariamente o
    // dano do líder pela quantidade de integrantes que golpeará junto.
    const inimigoAtacarOriginal = window.inimigoAtacar;
    window.inimigoAtacar = function (idUnico) {
        let ataque = prepararAtaqueEsqueleto(idUnico, "j2");
        if (!ataque) return inimigoAtacarOriginal.apply(this, arguments);
        let danoEl = document.getElementById("dano-" + idUnico);
        let danoIndividual = danoEl ? danoEl.innerText : "1";
        ataqueEsqueletoPendente = ataque;
        if (danoEl) danoEl.innerText = String(ataque.dano);

        let resultado;
        try {
            resultado = inimigoAtacarOriginal.apply(this, arguments);
        } finally {
            if (danoEl && danoEl.isConnected) danoEl.innerText = danoIndividual;
            // Se o ataque foi recusado antes de entrar no modo de escolha de alvo
            // (congelado, turno errado ou arena vazia), não deixa a formação presa.
            if (ataqueEsqueletoPendente && !modoAtaqueInimigo) ataqueEsqueletoPendente = null;
        }
        return resultado;
    };

    const aplicarDanoInimigoOriginal = window.aplicarDanoInimigo;
    window.aplicarDanoInimigo = function (idPacoteAlvo) {
        let ataque = ataqueEsqueletoPendente;
        let idAtacante = typeof ultimoIdQueAtacou !== "undefined" ? ultimoIdQueAtacou : null;
        let ataqueZumbi = modoAtivo() && ehZumbiAtivo(idAtacante, "j2");
        let ataqueAicer = modoAtivo() && ehAicerAtivo(idAtacante, "j2");
        let ataqueEcto = modoAtivo() && ehEctoAtivo(idAtacante, "j2");
        let ataqueSeteNegativo = modoAtivo() && ehSeteNegativoAtivo(idAtacante, "j2");
        let danoAlvoAntesSete = ataqueSeteNegativo
            ? Math.max(0, parseFloat(document.getElementById("dano-" + String(idPacoteAlvo).replace("pacote-", ""))?.innerText) || 0)
            : 0;
        let retanguloAlvoSete = ataqueSeteNegativo
            ? document.getElementById(idPacoteAlvo)?.getBoundingClientRect()
            : null;
        if (!modoAtivo() || !ataque) {
            let resultadoComum = aplicarDanoInimigoOriginal.apply(this, arguments);
            if (ataqueZumbi && !modoAtaqueInimigo) concluirAtaqueZumbi(idAtacante, idPacoteAlvo, "j2");
            if (ataqueAicer && !modoAtaqueInimigo) concluirAtaqueAicer(idAtacante, idPacoteAlvo, "j2");
            if (ataqueEcto && !modoAtaqueInimigo) concluirAtaqueEcto(idAtacante, idPacoteAlvo, "j2");
            if (ataqueSeteNegativo && !modoAtaqueInimigo) roubarDanoSeteNegativo(idAtacante, idPacoteAlvo, true, danoAlvoAntesSete, 0, retanguloAlvoSete);
            return resultadoComum;
        }

        ataqueEsqueletoPendente = null;
        animarAtaqueColetivoEsqueleto(ataque.atacantes, idPacoteAlvo);
        // O valor já foi preparado pelo iniciar ataque, inclusive quando a IA
        // precisou aguardar o ciclo seguinte para escolher entre vários alvos.
        danoInimigoPreparado = ataque.dano;
        let resultado = aplicarDanoInimigoOriginal.apply(this, arguments);
        if (modoAtaqueInimigo) {
            // Alvo recusado (Vampi7 intangível, Barril protegendo etc.): mantém
            // a formação preparada para a IA escolher outro alvo válido.
            ataqueEsqueletoPendente = ataque;
        } else {
            concluirAtaqueEsqueleto(ataque);
        }
        return resultado;
    };

    // A mesma formação continua funcionando se um Esqueleto ou um Ctrl que o
    // copiou estiver no lado do jogador.
    const iniciarAtaqueOriginal = window.iniciarAtaque;
    window.iniciarAtaque = function (nomeCarta, idUnico) {
        let ataque = prepararAtaqueEsqueleto(idUnico, "j1");
        if (!ataque) return iniciarAtaqueOriginal.apply(this, arguments);
        let danoEl = document.getElementById("dano-" + idUnico);
        let danoIndividual = danoEl ? danoEl.innerText : "1";
        ataqueEsqueletoPendente = ataque;
        if (danoEl) danoEl.innerText = String(ataque.dano);

        let resultado;
        try {
            resultado = iniciarAtaqueOriginal.apply(this, arguments);
        } finally {
            if (danoEl && danoEl.isConnected) danoEl.innerText = danoIndividual;
            if (ataqueEsqueletoPendente && !modoAtaque) ataqueEsqueletoPendente = null;
        }
        return resultado;
    };

    const receberAtaqueOriginal = window.receberAtaque;
    window.receberAtaque = function (idVidaAlvo, idPacoteAlvo) {
        let ataque = ataqueEsqueletoPendente;
        let idAtacante = typeof ultimoIdQueAtacou !== "undefined" ? ultimoIdQueAtacou : null;
        let ataqueZumbi = modoAtivo() && ehZumbiAtivo(idAtacante, "j1");
        let ataqueAicer = modoAtivo() && ehAicerAtivo(idAtacante, "j1");
        let ataqueEcto = modoAtivo() && ehEctoAtivo(idAtacante, "j1");
        let ataqueSeteNegativo = modoAtivo() && ehSeteNegativoAtivo(idAtacante, "j1");
        let danoAlvoAntesSete = ataqueSeteNegativo
            ? Math.max(0, parseFloat(document.getElementById("dano-" + String(idPacoteAlvo).replace("pacote-", ""))?.innerText) || 0)
            : 0;
        let retanguloAlvoSete = ataqueSeteNegativo
            ? document.getElementById(idPacoteAlvo)?.getBoundingClientRect()
            : null;
        if (!modoAtivo() || !ataque || ataque.lado !== "j1") {
            let resultadoComum = receberAtaqueOriginal.apply(this, arguments);
            if (ataqueZumbi && !modoAtaque) concluirAtaqueZumbi(idAtacante, idPacoteAlvo, "j1");
            if (ataqueAicer && !modoAtaque) concluirAtaqueAicer(idAtacante, idPacoteAlvo, "j1");
            if (ataqueEcto && !modoAtaque) concluirAtaqueEcto(idAtacante, idPacoteAlvo, "j1");
            if (ataqueSeteNegativo && !modoAtaque) roubarDanoSeteNegativo(idAtacante, idPacoteAlvo, true, danoAlvoAntesSete, 0, retanguloAlvoSete);
            return resultadoComum;
        }

        ataqueEsqueletoPendente = null;
        animarAtaqueColetivoEsqueleto(ataque.atacantes, idPacoteAlvo);
        danoPreparado = ataque.dano;
        let resultado = receberAtaqueOriginal.apply(this, arguments);
        if (modoAtaque) ataqueEsqueletoPendente = ataque;
        else concluirAtaqueEsqueleto(ataque);
        return resultado;
    };

    const iniciarJogoOriginal = window.iniciarJogo;
    window.iniciarJogo = function (...args) {
        estado = null;
        if (observadorCampo) observadorCampo.disconnect();
        let resultado = iniciarJogoOriginal.apply(this, args);
        prepararPartida();
        return resultado;
    };

    const passarTurnoOriginal = window.passarTurno;
    window.passarTurno = function (...args) {
        marcarProximaOndaSeNecessario();
        let resultado = passarTurnoOriginal.apply(this, args);
        implantarProximaOnda();
        atualizarPainel();
        return resultado;
    };

    const rolarDadoOriginal = window.rolarDado;
    window.rolarDado = function (...args) {
        let resultado = rolarDadoOriginal.apply(this, args);
        // Se a carta inicial do monstro tiver sido roubada antes da iniciativa,
        // a nova onda precisa entrar mesmo quando o jogador vencer o dado.
        // Em caso de empate, jogoIniciado ainda será falso e nada será implantado.
        if (!reporCampoVazio()) {
            implantarProximaOnda();
        }
        return resultado;
    };

    window.rpgModoInimigoOndasAtivo = modoAtivo;
    window.rpgModoInimigoAindaTemCartas = aindaTemInimigos;
    window.rpgModoInimigoObterRecompensaTrofeus = obterRecompensaTrofeus;
    window.rpgModoInimigoAtualizarEstado = marcarProximaOndaSeNecessario;
    window.rpgModoInimigoImplantarOnda = implantarProximaOnda;
    window.rpgModoInimigoAplicarDanoReserva = aplicarDanoNaReserva;
    window.rpgRegistrarCtrlComoSlime = registrarCtrlComoSlime;
    window.rpgRegistrarCtrlComoEsqueleto = registrarCtrlComoEsqueleto;
    window.rpgRegistrarZumbi = registrarZumbi;
    window.rpgRegistrarAicer = registrarAicer;
    window.rpgRegistrarEcto = registrarEcto;
    window.rpgRegistrarFraguer = registrarFraguer;
    window.rpgSincronizarFraguers = sincronizarFraguers;
    window.rpgRegistrarSpiritista = registrarSpiritista;
    window.rpgPrepararAlmaSpiritista = prepararAlmaSpiritista;
    window.rpgNotificarMorteAosSpiritistas = notificarMorteAosSpiritistas;
    window.rpgRegistrarSeteNegativo = registrarSeteNegativo;
    window.rpgRoubarDanoSeteNegativo = roubarDanoSeteNegativo;
    window.rpgMarcarMovimentacaoEsqueleto = marcarMovimentacaoEsqueleto;
    window.rpgDesvincularCtrlDeFamiliaEspecial = desvincularCtrlDeFamiliaEspecial;
    window.rpgRestaurarEsqueletoRoubado = restaurarEsqueletoRoubado;
    window.rpgRegistrarSlimeRevivido = registrarSlimeRevivido;
    window.rpgRegistrarCopiaSlime = registrarCopiaSlime;
    window.rpgObterIdsFamiliaSlime = obterIdsFamiliaSlime;
    window.rpgPrepararRouboFamiliaSlime = prepararRouboFamiliaSlime;
    window.rpgRegistrarFamiliaSlimeRoubada = registrarFamiliaSlimeRoubada;
    window.rpgPrepararAnimacaoDivisaoSlime = prepararAnimacaoDivisaoSlime;
    window.rpgPrepararTransformacaoFamiliaSlime = prepararTransformacaoFamiliaSlime;
    window.rpgConcluirTransformacaoFamiliaSlime = concluirTransformacaoFamiliaSlime;
    window.rpgApagarFamiliaSlime = apagarFamiliaSlime;
    window.rpgModoInimigoReporCampoVazio = reporCampoVazio;
})();
