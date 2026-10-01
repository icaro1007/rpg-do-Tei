/* ==========================================================================
   BOT.JS — IA do Oponente (Jogador 2)
   --------------------------------------------------------------------------
   Este arquivo NÃO modifica main.js/habilidades.js/cartas.js.
   Ele só "escuta" quando o turno vira do Oponente (turnoAtivo === 2) e
   chama exatamente as mesmas funções que um clique do mouse chamaria.

   Pra jogar SEM o bot: não inclua esta tag <script> no index.html.
   Pra jogar COM o bot: inclua <script src="bot.js"></script> depois de main.js.
   ========================================================================== */

(function () {
    const BOT_DELAY_ACAO = 3000;   // pausa entre ações do bot (ms) — dá tempo de clicar no seu Especial
    const BOT_DELAY_INICIO = 2400; // pausa antes do bot começar a jogar no turno dele
    const MAX_ACOES_POR_TURNO = 40; // trava de segurança contra loop infinito

    let botJogando = false;
    let timerCicloBot = null;
    let observadorCampoVazio = null;
    let reposicaoCampoAgendada = null;
    function setBotJogando(valor) {
        botJogando = valor;
        // 🌐 Exposto globalmente pra main.js saber quando é o BOT (e não um humano jogando
        // de Jogador 2 no PvP local) que está tomando a decisão de um pop-up como o do Thiago.
        window.__rpgBotJogando = valor;
    }
    let acoesNesteTurno = 0;
    let ladroesUsadosNesteTurno = {}; // idUnico -> true; cada Ladrão do bot tenta uma vez

    function cancelarCicloBotAgendado() {
        if (timerCicloBot !== null) clearTimeout(timerCicloBot);
        timerCicloBot = null;
    }

    function agendarCicloBot(atraso) {
        if (!estaVezDoBot()) return false;
        cancelarCicloBotAgendado();
        timerCicloBot = setTimeout(() => {
            timerCicloBot = null;
            botCicloDeTurno();
        }, atraso);
        return true;
    }

    // -------------------------------------------------------------------
    // UTILITÁRIOS DE LEITURA DO TABULEIRO
    // -------------------------------------------------------------------
    function modoControladoPeloBot() {
        // No PvP local, o segundo lado continua sendo controlado por uma pessoa.
        // Quando a nova tela inicial está presente, a IA só assume modos contra inimigos.
        if (typeof window.rpgModoAtual !== "undefined"
            && window.rpgModoAtual !== "pve-solo"
            && window.rpgModoAtual !== "pve-monstro-solo"
            && window.rpgModoAtual !== "pve-dupla") return false;
        return true;
    }

    function estaVezDoBot() {
        if (!modoControladoPeloBot()) return false;
        return typeof turnoAtivo !== "undefined" && turnoAtivo === 2 &&
               typeof jogoIniciado !== "undefined" && jogoIniciado === true;
    }

    function idsNoContainer(containerId, classe) {
        let el = document.getElementById(containerId);
        if (!el) return [];
        return Array.from(el.getElementsByClassName(classe))
            .map(c => c.id.replace("pacote-", ""))
            // 🐴 O Cavalo de Tróia não pode ser atacado (nem escolhido como alvo de nada) —
            // tirando ele daqui de uma vez, nenhuma lógica do bot chega perto de tentar mirar nele.
            .filter(idUnico => nomeDaCarta(idUnico) !== "Cavalo de Tróia");
    }

    function idsNaMao(maoId) {
        let mao = document.getElementById(maoId);
        if (!mao) return [];
        return Array.from(mao.children)
            .filter(el => el.id && el.id.startsWith("pacote-"))
            .map(el => el.id.replace("pacote-", ""));
    }

    function nomeDaCarta(idUnico) {
        let el = document.querySelector('#pacote-' + cssEscape(idUnico) + ' .nome-carta');
        let nomeExibido = el ? el.innerText.trim() : "";
        return (typeof obterNomeEfetivoCarta === "function")
            ? obterNomeEfetivoCarta(idUnico, nomeExibido)
            : nomeExibido;
    }

    function vidaDaCarta(idUnico) {
        let el = document.getElementById("vida-" + idUnico);
        return el ? parseFloat(el.innerText) : null;
    }

    function danoDaCarta(idUnico) {
        let el = document.getElementById("dano-" + idUnico);
        return el ? parseFloat(el.innerText) : null;
    }

    function estaCongelada(idUnico) {
        let el = document.getElementById("pacote-" + idUnico);
        return el ? el.classList.contains("congelada") : false;
    }

    function cssEscape(str) {
        return (window.CSS && CSS.escape) ? CSS.escape(str) : str.replace(/([^\w-])/g, '\\$1');
    }

    // Acha o id "base" (do bancoDeCartas) a partir do id único de uma instância.
    // Não dá pra usar split("_")[0] ingenuamente porque alguns ids-base já têm "_"
    // (ex: "escudo_item"), e tokens gerados em runtime (ex: "necro_xxxx") não batem
    // com nenhum id-base — nesse caso retornamos null de propósito (tratado como tropa).
    function idBaseDaCarta(idCarta) {
        if (typeof bancoDeCartas === "undefined") return null;
        let candidatos = bancoDeCartas
            .map(c => c.id)
            .filter(id => idCarta === id || idCarta.startsWith(id + "_") || idCarta.startsWith(id + "-"));
        if (candidatos.length === 0) return null;
        return candidatos.reduce((a, b) => (b.length > a.length ? b : a));
    }

    // Simula o clique na IMAGEM de uma carta.
    // Se a carta JÁ foi jogada uma vez, ela tem um onclick "de batalha" anexado
    // (é isso que checa suporte/traição/gelo/ataque pendente) — precisamos disparar
    // ESSE handler, não a função de "jogar carta da mão" de novo.
    function simularCliqueImagem(idUnico) {
        let el = document.getElementById("pacote-" + idUnico);
        if (!el) return false;
        let img = el.querySelector("img");
        if (!img) return false;
        window.__rpgCliqueAutomaticoBot = true;
        try {
            if (typeof img.onclick === "function") {
                img.onclick(); // dispara o handler de batalha já anexado à carta
            } else {
                // Carta ainda não foi jogada nenhuma vez (só acontece pra alvo ainda na mão)
                let ehJ1 = el.closest("#campo-j1") !== null || el.closest("#mao-j1") !== null;
                if (ehJ1) jogarCarta("pacote-" + idUnico);
                else jogarCartaInimigo("pacote-" + idUnico);
            }
        } catch (e) {
            console.warn("[BOT] erro ao simular clique em", idUnico, e);
        } finally {
            window.__rpgCliqueAutomaticoBot = false;
        }
        return true;
    }

    function cartaPertenceAoBot(idUnico) {
        let id = String(idUnico ?? "").replace("pacote-", "");
        let pacote = id ? document.getElementById("pacote-" + id) : null;
        return !!pacote?.closest("#campo-j2, #mao-j2");
    }

    // -------------------------------------------------------------------
    // HEURÍSTICAS DE ESCOLHA DE ALVO
    // -------------------------------------------------------------------
    function maiorAmeaca(ids) {
        return ids.reduce((melhor, id) => {
            let d = danoDaCarta(id) || 0;
            let melhorD = melhor !== null ? (danoDaCarta(melhor) || 0) : -1;
            return d > melhorD ? id : melhor;
        }, null);
    }

    function alvoMaisFragil(ids) {
        return ids.reduce((melhor, id) => {
            let v = vidaDaCarta(id);
            if (v === null) return melhor;
            let melhorV = melhor !== null ? vidaDaCarta(melhor) : Infinity;
            return v < melhorV ? id : melhor;
        }, null);
    }

    // Diz se uma carta em campo pode ser alvo de ataque de verdade. O Vampi7 abaixo de
    // 3 só é recusado enquanto tiver aliados; se estiver sozinho, vira um alvo válido.
    function alvoEhAtacavel(id) {
        let nome = nomeDaCarta(id);
        if (nome === "Cavalo de Tróia") return false;
        if (nome === "Vampi7") {
            let pacote = document.getElementById("pacote-" + id);
            return !(typeof window.vampi7EstaIntangivel === "function" && window.vampi7EstaIntangivel(pacote));
        }
        return true;
    }

    // 🩹 CORREÇÃO: "aliadoMaisFerido" usava a mesma lógica de "menor vida absoluta" do
    // alvoMaisFragil (pra ataque) — mas pra CURA isso é errado: uma carta como o Vampi7
    // sempre tem 0 de vida MÁXIMA (não está "ferida", já está no teto dela), então sempre
    // "ganhava" a comparação e o Curandeiro ficava tentando curar ela pra sempre, sem
    // sobrar chance pra quem de fato precisava. Agora usa o DÉFICIT (vidaMax - vidaAtual)
    // e ignora quem não tem vida máxima pra curar ou já está cheia.
    function aliadoMaisFerido(ids) {
        let melhor = null;
        let melhorDeficit = 0;
        ids.forEach(id => {
            let idBase = idBaseDaCarta(id);
            let info = (typeof bancoDeCartas !== "undefined" && idBase) ? bancoDeCartas.find(c => c.id === idBase) : null;
            let vidaMax = info ? info.vida : null;
            let vidaAtual = vidaDaCarta(id);
            if (vidaMax === null || vidaAtual === null || vidaMax <= 0) return; // sem vida máxima pra curar
            let deficit = vidaMax - vidaAtual;
            if (deficit > melhorDeficit) {
                melhorDeficit = deficit;
                melhor = id;
            }
        });
        return melhor;
    }

    // 💀 Escolhe a melhor carta pra Reviverta trazer de volta, olhando os DOIS cemitérios
    // (não importa de qual time ela morreu — ela volta pra mão de quem usou a poção).
    // Critério simples: maior soma de vida + dano original.
    function escolherMelhorCartaCemiterio() {
        if (typeof cemiterio === "undefined") return null;
        let melhor = null;
        ["j1", "j2"].forEach(lado => {
            cemiterio[lado].forEach((carta, index) => {
                let score = (parseFloat(carta.vida) || 0) + (parseFloat(carta.dano) || 0);
                if (!melhor || score > melhor.score) melhor = { lado, index, score };
            });
        });
        return melhor;
    }

    // 🃏 Escolhe a melhor carta do jogador (mão OU campo) pro Cracker roubar. O bot sempre
    // rouba do jogador (campo-j1 / mao-j1), já que é o adversário dele. Critério simples:
    // maior soma de vida + dano no estado atual (o que já é visível na miniatura).
    function escolherMelhorCartaRoubar() {
        let candidatos = [];
        idsNaMao("mao-j1").forEach(id => candidatos.push({ idPacote: "pacote-" + id, origem: "mao" }));
        idsNoContainer("campo-j1", "carta-aliada").forEach(id => candidatos.push({ idPacote: "pacote-" + id, origem: "campo" }));
        if (candidatos.length === 0) return null;

        let melhor = null;
        candidatos.forEach(c => {
            let idPuro = c.idPacote.replace("pacote-", "");
            let vida = vidaDaCarta(idPuro) || 0;
            let dano = danoDaCarta(idPuro) || 0;
            let score = vida + dano;
            if (!melhor || score > melhor.score) melhor = { idPacote: c.idPacote, origem: c.origem, score };
        });
        return melhor;
    }

    // 🪞 Escolhe a melhor carta PRÓPRIA do bot (mão, excluindo a Dupliquetion em uso, ou campo)
    // pra Dupliquetion copiar. Suportes/poções não entram — só tropas de verdade. Mesmo
    // critério: maior soma de vida + dano no estado atual.
    function escolherMelhorCartaParaCopiar(idItemExcluir) {
        let candidatos = [];
        idsNaMao("mao-j2").filter(id => id !== idItemExcluir).forEach(id => {
            let pacote = document.getElementById("pacote-" + id);
            if (pacote && typeof ehPacoteSuporte === "function" && !ehPacoteSuporte(pacote)) candidatos.push("pacote-" + id);
        });
        idsNoContainer("campo-j2", "carta-inimiga").forEach(id => {
            let pacote = document.getElementById("pacote-" + id);
            if (pacote && typeof ehPacoteSuporte === "function" && !ehPacoteSuporte(pacote)) candidatos.push("pacote-" + id);
        });
        if (candidatos.length === 0) return null;

        let melhor = null;
        candidatos.forEach(idPacote => {
            let idPuro = idPacote.replace("pacote-", "");
            let vida = vidaDaCarta(idPuro) || 0;
            let dano = danoDaCarta(idPuro) || 0;
            let score = vida + dano;
            if (!melhor || score > melhor.score) melhor = { idPacote, score };
        });
        return melhor;
    }

    // -------------------------------------------------------------------
    // FASE 1 — RESOLVER QUALQUER ESCOLHA DE ALVO PENDENTE
    // (suporte engatilhado, traição em andamento, gelo, barril, ataque aguardando alvo)
    // -------------------------------------------------------------------
    function botResolverEscolhaPendente() {
        // --- 💀 Reviverta do bot aguardando escolha no cemitério (a do jogador ele não mexe) ---
        if (typeof revivertaPendente !== "undefined" && revivertaPendente !== null && revivertaPendente.ehAliado === false) {
            let escolha = escolherMelhorCartaCemiterio();
            if (!escolha) return false;
            reviverCartaDoCemiterio(escolha.lado, escolha.index, revivertaPendente.idItem, false);
            return true;
        }

        // --- 🃏 Cracker do bot aguardando escolha de qual carta roubar (a do jogador ele não mexe) ---
        if (typeof crackerPendente !== "undefined" && crackerPendente !== null && crackerPendente.ehAliado === false) {
            let escolha = escolherMelhorCartaRoubar();
            if (!escolha) return false;
            roubarCartaCracker(escolha.idPacote, escolha.origem, crackerPendente.idItem, false);
            return true;
        }

        // --- 🪞 Dupliquetion do bot aguardando escolha de qual carta própria copiar ---
        if (typeof dupliquetionPendente !== "undefined" && dupliquetionPendente !== null && dupliquetionPendente.ehAliado === false) {
            let escolha = escolherMelhorCartaParaCopiar(dupliquetionPendente.idItem);
            if (!escolha) return false;
            copiarCartaDupliquetion(escolha.idPacote, dupliquetionPendente.idItem, false);
            return true;
        }

        // --- Suporte/poção engatilhado (Besta, Velux, Adiv, Recuperida, Traição-passo1) ---
        if (typeof suportePreparado !== "undefined" && suportePreparado !== null && cartaPertenceAoBot(idItemNaMao)) {
            let tipo = suportePreparado;
            let ofensivo = (tipo === "Adiv" || tipo === "Traicao");
            let candidatos = ofensivo
                ? idsNoContainer("campo-j1", "carta-aliada")
                : idsNoContainer("campo-j2", "carta-inimiga");
            if (candidatos.length === 0) return false;

            let alvo;
            if (tipo === "Adiv") alvo = alvoMaisFragil(candidatos);
            else if (tipo === "Traicao") alvo = maiorAmeaca(candidatos);
            else if (tipo === "Recuperida") alvo = aliadoMaisFerido(candidatos);
            else if (tipo === "Besta") {
                let arqueiro = candidatos.find(id => nomeDaCarta(id) === "Arqueiro");
                alvo = arqueiro || maiorAmeaca(candidatos);
            } else alvo = maiorAmeaca(candidatos); // Velux e afins

            if (!alvo) return false;
            simularCliqueImagem(alvo);
            return true;
        }

        // --- Traição já com traidor escolhido, falta escolher o parceiro-vítima ---
        if (typeof modoTraicao !== "undefined" && modoTraicao === true && cartaPertenceAoBot(idTraidor)) {
            let traidorEl = document.getElementById("pacote-" + idTraidor);
            if (!traidorEl) return false;
            let ehJ1 = traidorEl.closest("#campo-j1") !== null;
            let candidatos = idsNoContainer(ehJ1 ? "campo-j1" : "campo-j2", ehJ1 ? "carta-aliada" : "carta-inimiga")
                .filter(id => id !== idTraidor);
            if (candidatos.length === 0) return false;
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- Poção de Gelo (alvo simples) aguardando escolha ---
        if (typeof modoGeloSimples !== "undefined" && modoGeloSimples === true && cartaPertenceAoBot(idPocaoAtiva)) {
            let pocao = document.getElementById("pacote-" + idPocaoAtiva);
            let jogadaPeloBot = pocao && pocao.parentElement && pocao.parentElement.id.includes("j2");
            // Observação: mirar em cartas ainda na MÃO do adversário não funciona corretamente
            // no jogo hoje (a carta nunca foi "jogada", então não tem o clique de batalha anexado).
            // Por segurança, o bot só mira cartas que já estão em CAMPO.
            let candidatos = jogadaPeloBot
                ? idsNoContainer("campo-j1", "carta-aliada")
                : idsNoContainer("campo-j2", "carta-inimiga");
            if (candidatos.length === 0) return false;
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- ☠️ Mago aguardando a escolha de quem receberá o veneno ---
        if (typeof modoAlvoVenenoMago !== "undefined" && modoAlvoVenenoMago === true && cartaPertenceAoBot(idMagoVenenoAtivo)) {
            let magoEl = document.getElementById("pacote-" + idMagoVenenoAtivo);
            if (!magoEl) return false;
            let ehJ1 = magoEl.closest("#campo-j1") !== null;
            let candidatos = idsNoContainer(ehJ1 ? "campo-j2" : "campo-j1", ehJ1 ? "carta-inimiga" : "carta-aliada");
            if (candidatos.length === 0) return false;
            aplicarAlvoVenenoMago("pacote-" + maiorAmeaca(candidatos));
            return true;
        }

        // --- Barril de Goblin aguardando alvo ---
        if (typeof modoAlvoBarril !== "undefined" && modoAlvoBarril === true && cartaPertenceAoBot(idBarrilAtivo)) {
            let barrilEl = document.getElementById("pacote-" + idBarrilAtivo);
            if (!barrilEl) return false;
            let ehJ1 = barrilEl.closest("#campo-j1") !== null;
            let candidatos = idsNoContainer(ehJ1 ? "campo-j2" : "campo-j1", ehJ1 ? "carta-inimiga" : "carta-aliada");
            if (candidatos.length === 0) return false;
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- Barril de Bárbaro (impacto) do lado do bot aguardando alvo ---
        if (typeof modoAlvoBarrilBarbaroInimigo !== "undefined" && modoAlvoBarrilBarbaroInimigo === true) {
            let candidatos = idsNoContainer("campo-j1", "carta-aliada");
            if (candidatos.length === 0) return false;
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- Cavaleiro das Trevas do bot aguardando o alvo principal (vizinhos levam junto) ---
        if (typeof modoAlvoCavaleiroInimigo !== "undefined" && modoAlvoCavaleiroInimigo === true) {
            let candidatos = idsNoContainer("campo-j1", "carta-aliada");
            if (candidatos.length === 0) return false;
            // Foca a maior ameaça: ela e os vizinhos dela vão levar o dano em área.
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- 👥 Separado/Separadois do bot aguardando escolha de parceira ---
        if (typeof modoParceriaSeparado !== "undefined" && modoParceriaSeparado === true && cartaPertenceAoBot(idSeparadoParceriaAtivo)) {
            let candidatos = idsNoContainer("campo-j2", "carta-inimiga")
                .filter(id => "pacote-" + id !== "pacote-" + idSeparadoParceriaAtivo);
            if (candidatos.length === 0) return false;
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- 💚 Curandeiro do bot aguardando escolha de quem curar (prioriza o mais ferido) ---
        if (typeof modoCuraInimigo !== "undefined" && modoCuraInimigo === true) {
            let candidatos = idsNoContainer("campo-j2", "carta-inimiga");
            if (candidatos.length === 0) return false;
            let alvo = aliadoMaisFerido(candidatos);
            if (!alvo) {
                // 🩹 Segurança: se por algum motivo ninguém tem déficit de vida pra curar,
                // cancela o modo em vez de deixar "modoCuraInimigo" pendurado pra sempre.
                modoCuraInimigo = false;
                return false;
            }
            simularCliqueImagem(alvo);
            return true;
        }

        // --- 💰 Ladrão do bot aguardando alvo (fase 1: rouba do inimigo; fase 2: entrega o
        // bônus pra uma carta do próprio time) ---
        if (typeof modoLadrao !== "undefined" && modoLadrao === true && cartaPertenceAoBot(idLadraoRouboAtivo)) {
            if (typeof faseLadrao !== "undefined" && faseLadrao === 2) {
                let candidatos = idsNoContainer("campo-j2", "carta-inimiga");
                if (candidatos.length === 0) return false;
                simularCliqueImagem(maiorAmeaca(candidatos));
                return true;
            }
            let candidatos = idsNoContainer("campo-j1", "carta-aliada");
            if (candidatos.length === 0) return false;
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- 🩸 Goblin do bot aguardando escolha de alvo (roubo tem 2 fases: de quem
        // rouba e pra quem entrega) ---
        if (typeof modoRouboGoblin !== "undefined" && modoRouboGoblin === true && cartaPertenceAoBot(idGoblinLadrao)) {
            let goblinEl = document.getElementById("pacote-" + idGoblinLadrao);
            if (!goblinEl) return false;
            let ehJ1 = goblinEl.closest("#campo-j1") !== null;

            if (typeof faseRouboGoblin !== "undefined" && faseRouboGoblin === 2) {
                // Fase 2: entrega o dano roubado pra uma carta do MESMO time do Goblin.
                let candidatos = idsNoContainer(ehJ1 ? "campo-j1" : "campo-j2", ehJ1 ? "carta-aliada" : "carta-inimiga")
                    .filter(id => id !== idGoblinLadrao);
                if (candidatos.length === 0) return false;
                simularCliqueImagem(maiorAmeaca(candidatos));
                return true;
            }

            // Fase 1: rouba 1 de dano de uma carta INIMIGA.
            let candidatos = idsNoContainer(ehJ1 ? "campo-j2" : "campo-j1", ehJ1 ? "carta-inimiga" : "carta-aliada");
            if (candidatos.length === 0) return false;
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- 🎨 Ícaro do bot aguardando alvo (mira a maior ameaça do time do jogador) ---
        if (typeof modoTransformacaoIcaro !== "undefined" && modoTransformacaoIcaro === true && cartaPertenceAoBot(idIcaroAtivo)) {
            let candidatos = idsNoContainer("campo-j1", "carta-aliada");
            if (candidatos.length === 0) return false;
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- ⚖️ Thiago do bot aguardando alvo (enfraquece a maior ameaça do jogador) ---
        if (typeof modoAjusteThiago !== "undefined" && modoAjusteThiago === true && cartaPertenceAoBot(idThiagoAtivo)) {
            let candidatos = idsNoContainer("campo-j1", "carta-aliada");
            if (candidatos.length === 0) return false;
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- ⏳ Viajante do Tempo do bot aguardando escolha de quem prender ---
        if (typeof modoPrenderNoTempo !== "undefined" && modoPrenderNoTempo === true && cartaPertenceAoBot(idPrenderNoTempoAtivo)) {
            let vjEl = document.getElementById("pacote-" + idPrenderNoTempoAtivo);
            if (!vjEl) return false;
            let ehJ1 = vjEl.closest("#campo-j1") !== null;
            let candidatos = idsNoContainer(ehJ1 ? "campo-j2" : "campo-j1", ehJ1 ? "carta-inimiga" : "carta-aliada");
            if (candidatos.length === 0) return false;
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- 🔮 Bruxo do bot aguardando escolha de alvo (transformar ou roubar) ---
        if (((typeof modoBruxoTransformar !== "undefined" && modoBruxoTransformar === true) ||
            (typeof modoBruxoRoubar !== "undefined" && modoBruxoRoubar === true)) && cartaPertenceAoBot(idBruxoAtivo)) {
            let bxEl = document.getElementById("pacote-" + idBruxoAtivo);
            if (!bxEl) return false;
            let ehJ1 = bxEl.closest("#campo-j1") !== null;
            let candidatos = idsNoContainer(ehJ1 ? "campo-j2" : "campo-j1", ehJ1 ? "carta-inimiga" : "carta-aliada");
            if (candidatos.length === 0) return false;
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- 🛡️ Barril do bot aguardando escolha de quem proteger (protege o mais frágil) ---
        if (typeof modoProtecaoBarrilInimigo !== "undefined" && modoProtecaoBarrilInimigo === true) {
            let candidatos = idsNoContainer("campo-j2", "carta-inimiga")
                .filter(id => typeof podeVincularProtecaoBarril === "function"
                    ? podeVincularProtecaoBarril(id, idBarrilProtetor)
                    : id !== idBarrilProtetor);
            if (candidatos.length === 0) {
                modoProtecaoBarrilInimigo = false;
                idBarrilProtetor = null;
                return false;
            }
            simularCliqueImagem(alvoMaisFragil(candidatos));
            return true;
        }

        // --- 📦 Barril de Goblin: Especial usado ANTES de atacar, aguardando alvo ---
        if (typeof modoEspecialBarrilGoblin !== "undefined" && modoEspecialBarrilGoblin === true && cartaPertenceAoBot(idBarrilAtivo)) {
            let barrilEl = document.getElementById("pacote-" + idBarrilAtivo);
            if (!barrilEl) return false;
            let ehJ1 = barrilEl.closest("#campo-j1") !== null;
            let candidatos = idsNoContainer(ehJ1 ? "campo-j2" : "campo-j1", ehJ1 ? "carta-inimiga" : "carta-aliada");
            if (candidatos.length === 0) return false;
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- 🪃 Bumerskeleton: Especial usado ANTES de atacar, aguardando alvo ---
        if (typeof modoEspecialBumerskeleton !== "undefined" && modoEspecialBumerskeleton === true && cartaPertenceAoBot(idBumerskeletonEspecialAtivo)) {
            let bumeEl = document.getElementById("pacote-" + idBumerskeletonEspecialAtivo);
            if (!bumeEl) return false;
            let ehJ1 = bumeEl.closest("#campo-j1") !== null;
            let candidatos = idsNoContainer(ehJ1 ? "campo-j2" : "campo-j1", ehJ1 ? "carta-inimiga" : "carta-aliada");
            if (candidatos.length === 0) return false;
            simularCliqueImagem(maiorAmeaca(candidatos));
            return true;
        }

        // --- Ataque do bot aguardando escolha de alvo (mais de 1 carta no seu campo) ---
        if (typeof modoAtaqueInimigo !== "undefined" && modoAtaqueInimigo === true) {
            let candidatos = idsNoContainer("campo-j1", "carta-aliada")
                .filter(alvoEhAtacavel); // tira Cavalo de Tróia e somente o Vampi7 que ainda está intangível
            if (candidatos.length === 0) return false;
            // prioriza finalizar quem já está fraco; senão ataca a maior ameaça
            let matavel = candidatos.filter(id => {
                let v = vidaDaCarta(id);
                return v !== null && typeof danoInimigoPreparado !== "undefined" && v <= danoInimigoPreparado;
            });
            let alvo = matavel.length > 0 ? maiorAmeaca(matavel) : alvoMaisFragil(candidatos);

            // 🛡️ Percorre toda a cadeia de Barris. Se A protege B e B protege C,
            // o bot deve atacar A primeiro, não insistir em B (que também está protegido).
            // O Ecto é a exceção: seu toque atravessa a proteção e pode manter o alvo
            // estratégico originalmente escolhido.
            let ectoIgnoraProtecao = typeof atacanteAtualEh === "function" && atacanteAtualEh("Ecto");
            let visitadosNaProtecao = new Set();
            while (!ectoIgnoraProtecao
                && typeof cartasProtegidas !== "undefined"
                && cartasProtegidas[alvo]
                && !visitadosNaProtecao.has(alvo)) {
                visitadosNaProtecao.add(alvo);
                let idBarrilProtetor = cartasProtegidas[alvo];
                let barrilAindaExiste = document.getElementById("pacote-" + idBarrilProtetor);
                let pacoteAlvo = document.getElementById("pacote-" + alvo);
                let campoDoAlvo = pacoteAlvo && pacoteAlvo.closest("#campo-j1, #campo-j2");
                let campoDoBarril = barrilAindaExiste && barrilAindaExiste.closest("#campo-j1, #campo-j2");

                // Vínculo válido só existe entre cartas do mesmo time. Se algum estado antigo
                // ou habilidade defeituosa cruzar os lados, desfaz o vínculo em vez de mandar
                // o bot clicar numa carta do próprio campo para sempre.
                if (barrilAindaExiste && campoDoAlvo && campoDoBarril
                    && campoDoAlvo === campoDoBarril
                    && !visitadosNaProtecao.has(idBarrilProtetor)) {
                    alvo = idBarrilProtetor;
                } else {
                    delete cartasProtegidas[alvo];
                    break;
                }
            }

            simularCliqueImagem(alvo);
            return true;
        }

        return false;
    }

    // -------------------------------------------------------------------
    // FASE 2 — JOGAR CARTAS DA MÃO (ações livres, não custam o turno)
    // -------------------------------------------------------------------
    function suporteTemAlvoDisponivel(nomeCarta) {
        let nome = nomeCarta.toLowerCase();
        // Adiv e Traição só podem mirar em cartas que já estejam no CAMPO do jogador —
        // se o campo dele ainda estiver vazio (ex: turno 1, bot começando), não tem alvo ainda.
        if (nome.includes("adiv") || nome.includes("traição") || nome.includes("traicao")) {
            return idsNoContainer("campo-j1", "carta-aliada").length > 0;
        }
        // Gelo Simples (quando não cai 5) também só congela cartas em CAMPO — ver nota em
        // botResolverEscolhaPendente. A nevasca (dado 5) não precisa de alvo, então tentar
        // vale a pena mesmo com o campo vazio (1/6 de chance por tentativa de vir a calhar,
        // mas evitamos a espera desnecessária se já sabemos que não tem alvo em campo).
        if (nome.includes("gelo")) {
            return idsNoContainer("campo-j1", "carta-aliada").length > 0;
        }
        // Reviverta só vale a pena jogar se existir pelo menos 1 carta morta em algum dos cemitérios.
        if (nome.includes("reviverta")) {
            return typeof cemiterio !== "undefined" && (cemiterio.j1.length > 0 || cemiterio.j2.length > 0);
        }
        // Cracker só vale a pena jogar se o jogador tiver ao menos 1 carta na mão OU em campo.
        if (nome.includes("cracker")) {
            return idsNaMao("mao-j1").length > 0 || idsNoContainer("campo-j1", "carta-aliada").length > 0;
        }
        // Allsforms só vale a pena jogar se o próprio bot tiver ao menos 1 tropa em campo pra buffar.
        if (nome.includes("allsforms")) {
            return idsNoContainer("campo-j2", "carta-inimiga").length > 0;
        }
        // Dupliquetion precisa de ao menos 1 TROPA própria (mão, além dela mesma, ou campo) pra
        // copiar — suportes/poções não contam como alvo válido.
        if (nome.includes("dupliquetion")) {
            if (typeof ehPacoteSuporte !== "function") return true;
            let temNaMao = idsNaMao("mao-j2").some(id => {
                let pacote = document.getElementById("pacote-" + id);
                return pacote && !ehPacoteSuporte(pacote) && nomeDaCarta(id) !== "Dupliquetion";
            });
            let temNoCampo = idsNoContainer("campo-j2", "carta-inimiga").some(id => {
                let pacote = document.getElementById("pacote-" + id);
                return pacote && !ehPacoteSuporte(pacote);
            });
            return temNaMao || temNoCampo;
        }
        return true; // demais suportes (Besta/Velux/Recuperida) sempre têm alvo válido nesta altura
    }

    function cartaEstaFatigada(idUnico) {
        // Tokens do Necromante ficam bloqueados por algumas rodadas antes de poderem ser jogados
        return typeof bloqueioNecro !== "undefined" && bloqueioNecro[idUnico] && bloqueioNecro[idUnico] > 0;
    }

    function cartaDaMaoEhTropa(idUnico) {
        let pacote = document.getElementById("pacote-" + idUnico);
        if (!pacote) return false;

        // Slime, Esqueleto e os próximos monstros não fazem parte do banco
        // normal, mas continuam sendo tropas válidas.
        if (pacote.dataset.inimigoEspecial) return true;

        let idBase = idBaseDaCarta(idUnico);
        let info = (typeof bancoDeCartas !== "undefined" && idBase)
            ? bancoDeCartas.find(c => c.id === idBase)
            : null;

        // As cartas invocadas pelo Necromante usam IDs "necro_...", que não
        // revelam a carta-base. Nesse caso, encontra a tropa pelo nome visível.
        if (!info && typeof bancoDeCartas !== "undefined") {
            let nomeVisivel = nomeDaCarta(idUnico);
            info = bancoDeCartas.find(c => c.nome === nomeVisivel) || null;
        }

        if (info && typeof suportesReais !== "undefined") {
            return !suportesReais.includes(info.id);
        }
        if (typeof ehPacoteSuporte === "function") return !ehPacoteSuporte(pacote);
        return true;
    }

    function botJogarCartasDaMao() {
        let idsMao = idsNaMao("mao-j2")
            .filter(id => !cartaEstaFatigada(id))
            .filter(id => !estaCongelada(id));
        if (idsMao.length === 0) return false;

        // Prioriza colocar TROPAS em campo primeiro (presença no tabuleiro é quase sempre bom)
        let candidatosSuporte = [];
        for (let idCarta of idsMao) {
            if (cartaDaMaoEhTropa(idCarta)) {
                jogarCartaInimigo("pacote-" + idCarta);
                return true;
            }
            candidatosSuporte.push(idCarta);
        }

        // Só sobraram suportes/poções na mão — joga o primeiro que já tenha alvo válido agora
        for (let idCarta of candidatosSuporte) {
            let nome = nomeDaCarta(idCarta);
            if (suporteTemAlvoDisponivel(nome)) {
                jogarCartaInimigo("pacote-" + idCarta);
                return true;
            }
        }
        // Nenhum suporte restante tem alvo válido ainda (ex: Adiv/Traição sem campo do jogador
        // ocupado) — segura na mão por enquanto, tenta de novo em turnos futuros.
        return false;
    }

    // Reposição de emergência: qualquer efeito que roube, apague ou transforme a última
    // tropa do bot provoca a entrada imediata de outra carta, sem conceder um ataque fora
    // do turno. No modo de ondas, a própria reserva do monstro decide o tamanho da onda.
    function botGarantirCartaNoCampo(motivo) {
        if (!modoControladoPeloBot()) return false;
        if (typeof jogoIniciado === "undefined" || jogoIniciado !== true) return false;
        if (typeof faseAbertura !== "undefined" && faseAbertura === true) return false;

        let campoBot = document.getElementById("campo-j2");
        if (!campoBot || idsNoContainer("campo-j2", "carta-inimiga").length > 0) return false;

        let candidatos = idsNaMao("mao-j2")
            .filter(id => !cartaEstaFatigada(id))
            .filter(id => !estaCongelada(id))
            .filter(cartaDaMaoEhTropa);

        if (candidatos.length === 0) {
            if (window.rpgModoAtual === "pve-monstro-solo"
                && typeof window.rpgModoInimigoReporCampoVazio === "function") {
                return window.rpgModoInimigoReporCampoVazio();
            }
            return false;
        }

        let escolhida = maiorAmeaca(candidatos) || candidatos[0];
        jogarCartaInimigo("pacote-" + escolhida);
        narrar(`🤖 O campo do bot ficou vazio${motivo ? ` por causa de ${motivo}` : ""}! Ele colocou [${nomeDaCarta(escolhida)}] da mão para você continuar tendo um alvo.`);
        return true;
    }

    function botReporCampoAposCracker() {
        return botGarantirCartaNoCampo("Cracker");
    }

    window.botReporCampoAposCracker = botReporCampoAposCracker;
    window.botGarantirCartaNoCampo = botGarantirCartaNoCampo;

    function instalarObservadorCampoVazio() {
        let campoBot = document.getElementById("campo-j2");
        if (!campoBot) return;
        if (observadorCampoVazio) observadorCampoVazio.disconnect();

        observadorCampoVazio = new MutationObserver(() => {
            if (reposicaoCampoAgendada !== null) clearTimeout(reposicaoCampoAgendada);
            reposicaoCampoAgendada = setTimeout(() => {
                reposicaoCampoAgendada = null;
                botGarantirCartaNoCampo("um efeito");
            }, 180);
        });
        observadorCampoVazio.observe(campoBot, { childList: true });
    }

    // -------------------------------------------------------------------
    // FASE 2.5 — INCENDIÁRIO (acende a pólvora assim que houver alvo na arena)
    // -------------------------------------------------------------------
    function botIncendiario() {
        let parados = idsNoContainer("campo-j2", "carta-inimiga")
            .filter(id => nomeDaCarta(id) === "Incendiário")
            .filter(id => !estaCongelada(id))
            .filter(id => typeof incendiarioCiclo !== "undefined" && incendiarioCiclo[id] === undefined);
        if (parados.length === 0) return false;

        let inimigosNoCampo = idsNoContainer("campo-j1", "carta-aliada");
        if (inimigosNoCampo.length === 0) return false; // ainda sem alvo, bot espera

        try {
            iniciarAtaqueIncendiario(parados[0], true);
        } catch (e) {
            console.warn("[BOT] erro ao acender o Incendiário:", e);
            return false;
        }
        return true;
    }

    // Lê o nome de habilidade GRAVADO no onclick do botão (ex: usarHabilidade('Criador', ...)).
    // Precisa ser assim (e não o nome exibido na carta) porque cartas como o Criador mudam
    // o texto exibido pra "Ícaro"/"Thiago" mas o botão continua chamando usarHabilidade
    // com o nome original "Criador" — usar o nome exibido faria o dado de despacho da
    // habilidade não reconhecer a carta e a chamada não fazer nada.
    function nomeHabilidadeDoBotao(btn) {
        let attr = btn.getAttribute("onclick") || "";
        let m = attr.match(/usarHabilidade\('([^']+)'/);
        return m ? m[1] : null;
    }

    // -------------------------------------------------------------------
    // FASE 2.7 — USAR ESPECIAIS (o bot clica no botão "Especial 🔮" das
    // próprias cartas que ainda não usaram; a maioria não gasta o turno, e
    // qualquer alvo que precisem escolher é resolvido no próximo ciclo por
    // botResolverEscolhaPendente). Cura é a exceção: ela ENCERRA o turno,
    // então só vale a pena quando tem alguém realmente ferido pra curar.
    // -------------------------------------------------------------------
    function botUsarEspeciais() {
        // Uma carta congelada continua mostrando seus botões, mas não pode usar
        // Passiva, Especial, cura nem qualquer outra ação. Sem este filtro, a IA
        // clicava no mesmo botão a cada ciclo, recebia a recusa de usar habilidade
        // e imediatamente tentava de novo, deixando o turno preso.
        let idsComCarta = idsNoContainer("campo-j2", "carta-inimiga")
            .filter(id => !estaCongelada(id));

        // 💰 Ladrão: rola o dado da Passiva pra tentar abrir uma chance de roubo (o alvo,
        // quando abre, é resolvido depois em botResolverEscolhaPendente). É "usa quando
        // quiser" no jogo, mas limitamos a 1 tentativa por turno pro bot não ficar girando
        // essa passiva o turno inteiro em vez de atacar.
        for (let id of idsComCarta) {
            if (nomeDaCarta(id) !== "Ladrão" || ladroesUsadosNesteTurno[id]) continue;
            if (typeof modoLadrao !== "undefined" && modoLadrao === true) continue; // termina o roubo atual antes do próximo Ladrão
            let btnLadrao = document.querySelector('#pacote-' + cssEscape(id) + ' button[onclick*="usarPassivaLadrao"]');
            if (!btnLadrao || btnLadrao.style.display === "none") continue;
            ladroesUsadosNesteTurno[id] = true;
            try {
                usarPassivaLadrao(id, btnLadrao);
            } catch (e) {
                console.warn("[BOT] erro na Passiva do Ladrão:", e);
                continue;
            }
            return true;
        }

        // ⏳ Viajante do Tempo (Passiva "Viajar no Tempo"): só vale usar se tiver algum
        // botão realmente escondido no time pra reaproveitar — senão é desperdiçar à toa.
        for (let id of idsComCarta) {
            if (nomeDaCarta(id) !== "Viajante do Tempo") continue;
            let btnViajar = document.querySelector('#pacote-' + cssEscape(id) + ' button[onclick*="usarPassivaViajante"]');
            if (!btnViajar || btnViajar.style.display === "none") continue;
            let campoProprio = document.getElementById("campo-j2");
            let temBotaoEscondido = campoProprio && Array.from(campoProprio.querySelectorAll("button")).some(b => b !== btnViajar && b.style.display === "none");
            if (!temBotaoEscondido) continue;
            try {
                usarPassivaViajante(id, btnViajar);
            } catch (e) {
                console.warn("[BOT] erro na Passiva do Viajante do Tempo:", e);
                continue;
            }
            return true;
        }

        // 📋 Ctrl C / Ctrl V: precisam copiar a Passiva de uma carta antes do Especial
        // fazer qualquer sentido — sem isso, o Especial só dá erro ("dados da carta
        // copiada" não encontrados).
        for (let id of idsComCarta) {
            if (nomeDaCarta(id) !== "Ctrl C" && nomeDaCarta(id) !== "Ctrl V") continue;
            let btnPassiva = document.querySelector('#pacote-' + cssEscape(id) + ' button[onclick*="usarPassivaCtrlC"]');
            if (!btnPassiva || btnPassiva.style.display === "none") continue;
            try {
                usarPassivaCtrlC(id, btnPassiva);
            } catch (e) {
                console.warn("[BOT] erro na Passiva do Ctrl:", e);
                continue;
            }
            return true;
        }

        // 💚 Curandeiro: "Curar Oponente 💚" é uma ação separada do Especial e ENCERRA o
        // turno, então só vale clicar quando tem alguém do time realmente ferido.
        for (let id of idsComCarta) {
            if (nomeDaCarta(id) !== "Curandeiro") continue;
            let btnCurar = document.querySelector('#pacote-' + cssEscape(id) + ' button[onclick*="iniciarCuraInimigo"]');
            if (!btnCurar || btnCurar.style.display === "none") continue;
            let aliados = idsComCarta.filter(outroId => outroId !== id);
            let algumFerido = aliados.some(outroId => {
                let idBase = idBaseDaCarta(outroId);
                let info = (typeof bancoDeCartas !== "undefined" && idBase) ? bancoDeCartas.find(c => c.id === idBase) : null;
                let vidaMax = info ? info.vida : null;
                let vidaAtual = vidaDaCarta(outroId);
                return vidaMax !== null && vidaAtual !== null && vidaAtual < vidaMax;
            });
            if (!algumFerido) continue; // guarda a cura pra quando fizer falta de verdade
            try {
                iniciarCuraInimigo(id);
            } catch (e) {
                console.warn("[BOT] erro ao iniciar cura:", e);
                continue;
            }
            return true;
        }

        let candidatos = idsComCarta.filter(id => {
            let btn = document.querySelector('#pacote-' + cssEscape(id) + ' button[onclick*="usarHabilidade"]');
            return btn && btn.style.display !== "none";
        });
        if (candidatos.length === 0) return false;

        for (let id of candidatos) {
            let nomeExibido = nomeDaCarta(id);
            let btn = document.querySelector('#pacote-' + cssEscape(id) + ' button[onclick*="usarHabilidade"]');
            if (!btn) continue;
            let nomeParaChamar = nomeHabilidadeDoBotao(btn) || nomeExibido;

            // Sem alvo, o Mago guardará o uso único para depois e o bot seguirá outra ação.
            if (nomeParaChamar === "Mago" && idsNoContainer("campo-j1", "carta-aliada").length === 0) continue;

            // 👹 Trio de Goblin só pode usar a habilidade quando restar 1 goblin (vida ≤ 2).
            if (nomeExibido === "Trio de Goblin") {
                let vida = vidaDaCarta(id);
                if (vida === null || vida > 2) continue;
            }

            try {
                usarHabilidade(nomeParaChamar, id, btn);
            } catch (e) {
                console.warn("[BOT] erro ao usar Especial de", nomeExibido, e);
                continue;
            }
            return true; // uma ação por ciclo — dá tempo do "modo" pendente ser resolvido depois
        }
        return false;
    }

    // -------------------------------------------------------------------
    // FASE 3 — ATACAR (só UMA ação de ataque encerra o turno)
    // -------------------------------------------------------------------
    function botAtacar() {
        let tropasProntas = idsNoContainer("campo-j2", "carta-inimiga")
            .filter(id => !estaCongelada(id))
            // Durante o ataque dividido, quem já atacou sai da lista. Assim o bot
            // obrigatoriamente usa o outro integrante, independentemente de quem começou.
            .filter(id => {
                if (typeof obterSeparadaoDivididoAtivo !== "function"
                    || typeof separadaoAtacantesNaSequencia === "undefined") return true;
                let idSeparado = obterSeparadaoDivididoAtivo(id);
                return !idSeparado || !(separadaoAtacantesNaSequencia[idSeparado] || []).includes(id);
            })
            // O Incendiário (inclusive um Ctrl que o copiou) combate pelo ciclo da pólvora,
            // não pelo ataque comum.
            .filter(id => nomeDaCarta(id) !== "Incendiário")
            // 👥 Antes de conquistar o Especial, o Separado com parceira viva só ataca
            // puxado por ela. Depois do primeiro 6, separadaoDividido é recarregado a cada
            // turno e o bot também pode escolher o próprio Separado como atacante.
            .filter(id => {
                if (typeof parceriaSeparado === "undefined") return true;
                let nome = nomeDaCarta(id);
                if (nome !== "Separado" && nome !== "Separadois") return true;
                if (typeof separadaoDividido !== "undefined" && separadaoDividido[id] > 0) return true;
                let idParceira = parceriaSeparado[id];
                return !(idParceira && document.getElementById("pacote-" + idParceira));
            });

        // Se uma metade da dupla já atacou, nenhuma terceira carta pode encerrar o turno
        // no lugar dela: o próximo atacante do bot precisa ser exatamente a outra metade.
        if (typeof separadaoDividido !== "undefined" && typeof separadaoAtacantesNaSequencia !== "undefined") {
            let idSeparadoPendente = Object.keys(separadaoDividido).find(idSeparado => {
                let pacote = document.getElementById("pacote-" + idSeparado);
                return separadaoDividido[idSeparado] === 1
                    && pacote?.closest("#campo-j2")
                    && (separadaoAtacantesNaSequencia[idSeparado] || []).length === 1;
            });
            if (idSeparadoPendente) {
                let primeiro = separadaoAtacantesNaSequencia[idSeparadoPendente][0];
                let idObrigatorio = primeiro === idSeparadoPendente
                    ? parceriaSeparado[idSeparadoPendente]
                    : idSeparadoPendente;
                tropasProntas = tropasProntas.filter(id => id === idObrigatorio);
            }
        }
        if (tropasProntas.length === 0) return false;

        let inimigosNoCampo = idsNoContainer("campo-j1", "carta-aliada");
        if (inimigosNoCampo.length === 0) return false; // ninguém pra atacar ainda

        // Prioriza a tropa que consegue MATAR alguém agora
        let melhorEscolha = null;
        for (let idTropa of tropasProntas) {
            let dano = danoDaCarta(idTropa) || 0;
            let podeMatar = inimigosNoCampo.some(idAlvo => {
                let v = vidaDaCarta(idAlvo);
                return v !== null && v <= dano;
            });
            if (podeMatar) { melhorEscolha = idTropa; break; }
        }
        // Senão, ataca com a tropa de maior dano
        if (!melhorEscolha) melhorEscolha = maiorAmeaca(tropasProntas) || tropasProntas[0];

        try {
            inimigoAtacar(melhorEscolha);
        } catch (e) {
            console.warn("[BOT] erro ao atacar com", melhorEscolha, e);
            return false;
        }
        return true;
    }

    // -------------------------------------------------------------------
    // LOOP PRINCIPAL DO TURNO DO BOT
    // -------------------------------------------------------------------
    function botCicloDeTurno() {
        if (!estaVezDoBot()) {
            cancelarCicloBotAgendado();
            setBotJogando(false);
            acoesNesteTurno = 0;
            ladroesUsadosNesteTurno = {};
            return;
        }

        acoesNesteTurno++;
        if (acoesNesteTurno > MAX_ACOES_POR_TURNO) {
            console.warn("[BOT] limite de ações atingido, forçando passar o turno.");
            try { passarTurno(); } catch (e) { /* nada a fazer */ }
            setBotJogando(false); acoesNesteTurno = 0; ladroesUsadosNesteTurno = {};
            return;
        }

        try {
            if (botResolverEscolhaPendente()) { agendarCicloBot(BOT_DELAY_ACAO); return; }
            // A reserva fechada continua sendo controlada pelo sistema de ondas, mas
            // cartas normais criadas por Necromante, Reviverta, Dupliquetion e outros
            // efeitos ficam na mão real e precisam poder ser jogadas pela IA.
            if (botJogarCartasDaMao()) {
                agendarCicloBot(BOT_DELAY_ACAO);
                return;
            }
            if (botIncendiario())             { agendarCicloBot(BOT_DELAY_ACAO); return; }
            if (botUsarEspeciais())           { agendarCicloBot(BOT_DELAY_ACAO); return; }
            if (botAtacar())                  { agendarCicloBot(BOT_DELAY_ACAO); return; }
        } catch (e) {
            console.error("[BOT] erro no ciclo de turno:", e);
        }

        // Não sobrou nenhuma ação válida — garante que o turno não trave
        if (typeof turnoAtivo !== "undefined" && turnoAtivo === 2) {
            try { passarTurno(); } catch (e) { /* nada a fazer */ }
        }
        setBotJogando(false);
        cancelarCicloBotAgendado();
        acoesNesteTurno = 0;
        ladroesUsadosNesteTurno = {};
    }

    function verificarEIniciarBot() {
        if (!estaVezDoBot()) {
            // A troca para o turno do jogador também encerra oficialmente o ciclo
            // anterior da IA. Assim os limites e travas nunca vazam para a próxima vez.
            if (botJogando || timerCicloBot !== null) {
                cancelarCicloBotAgendado();
                setBotJogando(false);
                acoesNesteTurno = 0;
                ladroesUsadosNesteTurno = {};
            }
            return;
        }

        if (!botJogando) {
            setBotJogando(true);
            acoesNesteTurno = 0;
            ladroesUsadosNesteTurno = {};
        }

        // Mesmo que uma reposição fora do turno tenha deixado botJogando=true,
        // nunca permite que a vez do bot exista sem uma próxima ação agendada.
        if (timerCicloBot === null) agendarCicloBot(BOT_DELAY_INICIO);
    }

    // -------------------------------------------------------------------
    // FASE DE ABERTURA — escolhe automaticamente a tropa de abertura do bot
    // -------------------------------------------------------------------
    function botEscolherCartaAbertura() {
        if (typeof window.rpgModoAtual !== "undefined"
            && window.rpgModoAtual !== "pve-solo"
            && window.rpgModoAtual !== "pve-monstro-solo"
            && window.rpgModoAtual !== "pve-dupla") return;
        if (typeof faseAbertura === "undefined" || faseAbertura !== true) return;
        if (typeof aberturaEscolhaJ2 !== "undefined" && aberturaEscolhaJ2 !== null) return; // já escolheu

        let idsMao = idsNaMao("mao-j2");
        let candidatosTropa = idsMao.filter(function (id) {
            let pacote = document.getElementById("pacote-" + id);
            // Qualquer carta criada pelo modo inimigo é uma tropa válida para
            // abrir a partida, mesmo não existindo em bancoDeCartas.
            if (pacote && pacote.dataset.inimigoEspecial) return true;
            let idBase = idBaseDaCarta(id);
            let info = (typeof bancoDeCartas !== "undefined" && idBase) ? bancoDeCartas.find(c => c.id === idBase) : null;
            return info && !(typeof suportesReais !== "undefined" && suportesReais.includes(info.id));
        });
        if (candidatosTropa.length === 0) return;

        let escolhido = maiorAmeaca(candidatosTropa) || candidatosTropa[0];
        try {
            jogarCartaInimigo("pacote-" + escolhido);
        } catch (e) {
            console.warn("[BOT] erro ao escolher carta de abertura:", e);
        }
    }

    // -------------------------------------------------------------------
    // GANCHOS: escuta passarTurno() e rolarDado() sem alterar main.js
    // -------------------------------------------------------------------
    function instalarGanchos() {
        if (typeof window.passarTurno === "function" && !window.passarTurno.__botHooked) {
            let original = window.passarTurno;
            window.passarTurno = function (...args) {
                let r = original.apply(this, args);
                // Quando a fadiga de uma carta do Necromante acaba justamente na
                // troca para o jogador, não haverá nova mutação no campo para acordar
                // o observador. Fazemos aqui uma nova tentativa de reposição, evitando
                // que o jogador receba a vez sem ter nenhuma carta para atacar.
                if (window.rpgModoAtual === "pve-monstro-solo") {
                    botGarantirCartaNoCampo();
                }
                verificarEIniciarBot();
                return r;
            };
            window.passarTurno.__botHooked = true;
        }
        if (typeof window.rolarDado === "function" && !window.rolarDado.__botHooked) {
            let original = window.rolarDado;
            window.rolarDado = function (...args) {
                let r = original.apply(this, args);
                verificarEIniciarBot();
                return r;
            };
            window.rolarDado.__botHooked = true;
        }
        if (typeof window.onFaseAberturaPronta !== "function") {
            window.onFaseAberturaPronta = function () {
                setTimeout(botEscolherCartaAbertura, BOT_DELAY_INICIO);
            };
        }
    }

    // O contador local do Ladrão pertence à IA e não é visível em main.js.
    // A viagem do tempo do lado do bot também precisa liberar essa tentativa.
    window.rpgBotReativarPassivasAposViagem = function (lado) {
        if (lado === "j2") ladroesUsadosNesteTurno = {};
    };

    // main.js/habilidades.js/cartas.js já devem ter carregado antes deste arquivo,
    // mas instalamos de novo no load só por segurança.
    instalarGanchos();
    instalarObservadorCampoVazio();
    window.addEventListener("load", instalarGanchos);
    window.addEventListener("load", instalarObservadorCampoVazio);

    // Rede de segurança contra disputas entre animações, reposição de campo e
    // troca de turno. Não executa ações; apenas repõe um agendamento ausente.
    setInterval(verificarEIniciarBot, 1000);

    console.log("[BOT] Sistema de IA do Oponente carregado. O bot assume o turno 2 automaticamente.");
})();
