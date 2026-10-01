let orkBuffado = {}; 
let modoCura = false;
let idCurandeiroAtivo = "";
let buffCuraCurandeiro = 0;       
let modoAtaqueCurandeiro = false;  
let modoCuraInimigo = false;
let idCurandeiroAtivoInimigo = "";
let buffCuraCurandeiroInimigo = 0;
let modoAtaqueCurandeiroInimigo = false;
let modoLadrao = false;
let faseLadrao = 0; 
let tipoRouboLadrao = ""; 
let ladroesQueJaRoubaram = {}; 
let idLadraoRouboAtivo = null;
let cavaleiroAtivado = {}; // Guarda quais Cavaleiros conseguiram o bônus permanente
window.mensageirosEmArea = window.mensageirosEmArea || {};

function animarTransferenciaLadrao(idOrigem, idDestino, tipo, etapa) {
    let origem = document.getElementById("pacote-" + idOrigem);
    let destino = document.getElementById("pacote-" + idDestino);
    if (!origem || !destino) return;

    let retanguloOrigem = origem.getBoundingClientRect();
    let retanguloDestino = destino.getBoundingClientRect();
    let inicioX = retanguloOrigem.left + retanguloOrigem.width / 2;
    let inicioY = retanguloOrigem.top + retanguloOrigem.height * 0.42;
    let fimX = retanguloDestino.left + retanguloDestino.width / 2;
    let fimY = retanguloDestino.top + retanguloDestino.height * 0.42;
    let distanciaX = fimX - inicioX;
    let distanciaY = fimY - inicioY;
    let mesmaCarta = origem === destino;

    let item = document.createElement("span");
    item.className = "item-transferido-ladrao ladrao-item-" + tipo + " ladrao-etapa-" + etapa;
    item.textContent = tipo === "vida" ? "♥" : "⚔";
    item.dataset.valor = etapa === "roubo" ? "-1" : "+1";
    item.setAttribute("aria-hidden", "true");
    item.style.left = inicioX + "px";
    item.style.top = inicioY + "px";
    item.style.setProperty("--ladrao-x", distanciaX + "px");
    item.style.setProperty("--ladrao-y", distanciaY + "px");
    item.style.setProperty("--ladrao-meio-x", (mesmaCarta ? 42 : distanciaX / 2) + "px");
    item.style.setProperty("--ladrao-meio-y", (mesmaCarta ? -72 : distanciaY / 2 - 54) + "px");
    document.body.appendChild(item);

    let classeOrigem = etapa === "roubo" ? "alvo-sendo-roubado" : "ladrao-entregando-roubo";
    origem.classList.remove(classeOrigem);
    void origem.offsetWidth;
    origem.classList.add(classeOrigem);

    setTimeout(() => {
        if (!destino.isConnected) return;
        destino.classList.remove("recebendo-item-ladrao", "recebendo-vida-ladrao", "recebendo-dano-ladrao");
        void destino.offsetWidth;
        destino.classList.add("recebendo-item-ladrao", "recebendo-" + tipo + "-ladrao");
    }, 570);

    setTimeout(() => {
        item.remove();
        if (origem.isConnected) origem.classList.remove(classeOrigem);
        if (destino.isConnected) {
            destino.classList.remove("recebendo-item-ladrao", "recebendo-vida-ladrao", "recebendo-dano-ladrao");
        }
    }, 1050);
}

function animarFrascoCurandeiro(idOrigem, idDestino, tipo) {
    let origem = document.getElementById("pacote-" + idOrigem);
    let destino = document.getElementById("pacote-" + idDestino);
    if (!origem || !destino) return;

    let retanguloOrigem = origem.getBoundingClientRect();
    let retanguloDestino = destino.getBoundingClientRect();
    let inicioX = retanguloOrigem.left + retanguloOrigem.width / 2;
    let inicioY = retanguloOrigem.top + retanguloOrigem.height / 2;
    let distanciaX = (retanguloDestino.left + retanguloDestino.width / 2) - inicioX;
    let distanciaY = (retanguloDestino.top + retanguloDestino.height / 2) - inicioY;
    let sobreSiMesmo = idOrigem === idDestino;

    let frasco = document.createElement("span");
    frasco.className = "frasco-curandeiro-lancado " + (tipo === "ataque" ? "frasco-buff-ataque" : "frasco-cura");
    frasco.textContent = "🧪";
    frasco.dataset.simbolo = tipo === "ataque" ? "+1" : "+";
    frasco.setAttribute("aria-hidden", "true");
    frasco.style.left = inicioX + "px";
    frasco.style.top = inicioY + "px";
    frasco.style.setProperty("--cura-x", distanciaX + "px");
    frasco.style.setProperty("--cura-y", distanciaY + "px");
    frasco.style.setProperty("--cura-meio-x", (sobreSiMesmo ? 32 : distanciaX / 2) + "px");
    frasco.style.setProperty("--cura-meio-y", (sobreSiMesmo ? -62 : distanciaY / 2 - 48) + "px");
    document.body.appendChild(frasco);

    frasco.addEventListener("animationend", () => frasco.remove(), { once: true });
    setTimeout(() => {
        if (frasco.parentNode) frasco.remove();
    }, 1350);
}

function animarInvocacaoNecromante(idCarta, atraso) {
    setTimeout(() => {
        let cartaInvocada = document.getElementById("pacote-" + idCarta);
        if (!cartaInvocada) return;

        let retangulo = cartaInvocada.getBoundingClientRect();
        let terra = document.createElement("span");
        terra.className = "terra-invocacao-necromante";
        terra.setAttribute("aria-hidden", "true");
        terra.style.left = (retangulo.left + retangulo.width / 2) + "px";
        terra.style.top = (retangulo.bottom - 9) + "px";
        terra.style.width = Math.max(86, retangulo.width * 0.82) + "px";
        document.body.appendChild(terra);

        cartaInvocada.classList.remove("invocada-pelo-necromante");
        void cartaInvocada.offsetWidth;
        cartaInvocada.classList.add("invocada-pelo-necromante");

        cartaInvocada.addEventListener("animationend", () => {
            cartaInvocada.classList.remove("invocada-pelo-necromante");
        }, { once: true });

        setTimeout(() => {
            cartaInvocada.classList.remove("invocada-pelo-necromante");
            if (terra.parentNode) terra.remove();
        }, 1250);
    }, atraso || 0);
}

function iniciarCura(idUnicoCurandeiro) {
    modoCura = true;
    idCurandeiroAtivo = idUnicoCurandeiro;
    narrar("💚 Modo Cura Ativado! Clique em uma de suas cartas no campo para curá-la.");
}

function calcularCuraSegura(idPuro, nomeCarta) {
    let txtVida = document.getElementById("vida-" + idPuro);
    let vidaAtual = txtVida ? parseFloat(txtVida.innerText) : 0;
    if (!Number.isFinite(vidaAtual)) vidaAtual = 0;

    let cartaOriginal = bancoDeCartas.find(c => c.nome === nomeCarta);
    let maxVida = cartaOriginal ? Number(cartaOriginal.vida) : vidaAtual;

    // O Ctrl mantém o próprio nome na tela, mas sua vida máxima passa a ser a
    // da forma copiada (-1). Usar a vida original de Ctrl C/Ctrl V (1) fazia
    // uma cura reduzir, por exemplo, uma cópia com 4 de vida para apenas 1.
    let dadosCopia = typeof ctrlV !== "undefined" ? ctrlV[idPuro] : null;
    if (dadosCopia) {
        let maxCopia = Number(dadosCopia.vidaMaximaCopia);
        if (!Number.isFinite(maxCopia)) {
            let cartaCopiada = bancoDeCartas.find(c => c.nome === dadosCopia.nomeOriginal);
            maxCopia = cartaCopiada ? Math.max(1, Number(cartaCopiada.vida) - 1) : vidaAtual;
        }
        maxVida = maxCopia;
    }

    if (!Number.isFinite(maxVida) || maxVida < 0) maxVida = vidaAtual;
    let valorCura = maxVida / 2;

    // Bônus externos podem deixar qualquer carta acima da vida cadastrada.
    // A cura respeita o teto conhecido, mas jamais transforma recuperação em dano.
    let tetoSeguro = Math.max(maxVida, vidaAtual);
    let novaVida = Math.max(vidaAtual, Math.min(tetoSeguro, vidaAtual + valorCura));
    let curaAplicada = Math.max(0, novaVida - vidaAtual);

    return { txtVida, vidaAtual, maxVida, valorCura, novaVida, curaAplicada };
}

function aplicarCuraAliada(idDoPacote) {
    let idPuro = idDoPacote.replace("pacote-", "");
    let nomeCarta = document.getElementById(idDoPacote).querySelector(".nome-carta").innerText;
    let cura = calcularCuraSegura(idPuro, nomeCarta);
    if (!cura.txtVida) return;
    cura.txtVida.innerText = cura.novaVida;
    animarFrascoCurandeiro(idCurandeiroAtivo, idPuro, "cura");

    // 🚨 EFEITO DE VIDA AQUI: Como foi uma cura, usamos "recuperou" (sobe 3 corações)
    if (cura.curaAplicada > 0) mostrarEfeitoVida(idPuro, "recuperou");

    let msgBuff = "";
    if (buffCuraCurandeiro > 0) {
        let txtDano = document.getElementById("dano-" + idPuro);
        let danoAtual = parseFloat(txtDano.innerText);
        txtDano.innerText = danoAtual + buffCuraCurandeiro;

        // 🚨 EFEITO AQUI: Sobe a espadinha!
        mostrarEfeitoAtaque(idPuro);

        msgBuff = ` e recebeu +${buffCuraCurandeiro} de ataque permanentemente!`;
        buffCuraCurandeiro = 0; 
    }

    let encerraTurno = typeof ehVezDaCarta === "function" && ehVezDaCarta(idCurandeiroAtivo);
    let textoCura = cura.curaAplicada > 0
        ? `recuperou +${Number(cura.curaAplicada.toFixed(2))} de vida`
        : "já estava no seu limite de vida e não perdeu nenhum ponto";
    narrar(`💚 ${nomeCarta} ${textoCura}${msgBuff}.${encerraTurno ? " Como você curou no seu turno, ele acabou." : " A cura foi usada como ação livre fora do turno."}`);
    
    modoCura = false;
    let idCurandeiroQueCurou = idCurandeiroAtivo;
    idCurandeiroAtivo = "";
    if (typeof passarTurnoSeForVezDaCarta === "function") passarTurnoSeForVezDaCarta(idCurandeiroQueCurou);

    atualizarTodosUnidoes();
}

function iniciarCuraInimigo(idUnicoCurandeiro) {
    modoCuraInimigo = true;
    idCurandeiroAtivoInimigo = idUnicoCurandeiro;
    narrar("💚 Modo Cura Ativado! O Oponente deve clicar numa carta dele para curar.");
}

function aplicarCuraInimiga(idDoPacote) {
    let idPuro = idDoPacote.replace("pacote-", "");
    let nomeCarta = document.getElementById(idDoPacote).querySelector(".nome-carta").innerText;
    let cura = calcularCuraSegura(idPuro, nomeCarta);
    if (!cura.txtVida) return;
    cura.txtVida.innerText = cura.novaVida;
    animarFrascoCurandeiro(idCurandeiroAtivoInimigo, idPuro, "cura");

    // 🚨 EFEITO DE VIDA AQUI: Como foi uma cura, usamos "recuperou" (sobe 3 corações)
    if (cura.curaAplicada > 0) mostrarEfeitoVida(idPuro, "recuperou");

    let msgBuff = "";
    if (buffCuraCurandeiroInimigo > 0) {
        let txtDano = document.getElementById("dano-" + idPuro);
        let danoAtual = parseFloat(txtDano.innerText);
        txtDano.innerText = danoAtual + buffCuraCurandeiroInimigo;

        // 🚨 EFEITO AQUI: Sobe a espadinha!
        mostrarEfeitoAtaque(idPuro);

        msgBuff = ` e recebeu +${buffCuraCurandeiroInimigo} de ataque permanentemente!`;
        buffCuraCurandeiroInimigo = 0; 
    }

    let encerraTurno = typeof ehVezDaCarta === "function" && ehVezDaCarta(idCurandeiroAtivoInimigo);
    let textoCura = cura.curaAplicada > 0
        ? `recuperou +${Number(cura.curaAplicada.toFixed(2))} de vida`
        : "já estava no seu limite de vida e não perdeu nenhum ponto";
    narrar(`💚 ${nomeCarta} do Oponente ${textoCura}${msgBuff}.${encerraTurno ? " Como a cura ocorreu no turno dele, a vez acabou." : " A cura foi usada como ação livre fora do turno."}`);
    
    modoCuraInimigo = false;
    let idCurandeiroQueCurou = idCurandeiroAtivoInimigo;
    idCurandeiroAtivoInimigo = "";
    if (typeof passarTurnoSeForVezDaCarta === "function") passarTurnoSeForVezDaCarta(idCurandeiroQueCurou);

    atualizarTodosUnidoes();
}

function cartaTemEspecialCopiavelCtrl(nomeCarta) {
    if (!nomeCarta) return false;

    return nomeCarta === "Poção de Gelo"
        || nomeCarta === "Gelo"
        || nomeCarta === "Pocaogelo"
        || nomeCarta === "Bruxo"
        || nomeCarta === "Necromante"
        || nomeCarta === "Ork"
        || nomeCarta === "Curandeiro"
        || nomeCarta === "Cavaleiro das Trevas"
        || nomeCarta === "Goblin"
        || nomeCarta === "Trio de Goblin"
        || nomeCarta.includes("Barril de Goblin")
        || nomeCarta === "Guerreiro"
        || nomeCarta.includes("Barril de Bárbaro")
        || nomeCarta === "Barril"
        || nomeCarta === "Bumerskeleton"
        || nomeCarta === "Mensageiro"
        || nomeCarta === "Criador"
        || nomeCarta === "Separado"
        || nomeCarta === "Separadois"
        || nomeCarta === "Viajante do Tempo"
        || nomeCarta === "Incendiário"
        || nomeCarta === "Mago";
}

function ctrlCopiouCriador(idUnico) {
    return typeof ctrlV !== "undefined"
        && ctrlV[idUnico]
        && ctrlV[idUnico].nomeOriginal === "Criador";
}

function mostrarFormaCriadorNoCtrl(idUnico, forma) {
    let pacote = document.getElementById("pacote-" + idUnico);
    if (!pacote) return;

    pacote.classList.remove("ctrl-forma-icaro-rpg", "ctrl-forma-thiago-rpg");
    pacote.classList.add(forma === "Ícaro" ? "ctrl-forma-icaro-rpg" : "ctrl-forma-thiago-rpg");

    let selo = pacote.querySelector(".selo-forma-criador-ctrl-rpg");
    if (!selo) {
        selo = document.createElement("span");
        selo.className = "selo-forma-criador-ctrl-rpg";
        pacote.appendChild(selo);
    }
    selo.innerText = forma.toUpperCase();
    selo.title = `Forma copiada do Criador: ${forma}`;
}

function limparFormaCriadorDoCtrl(idUnico) {
    let pacote = document.getElementById("pacote-" + idUnico);
    if (!pacote) return;
    pacote.classList.remove("ctrl-forma-icaro-rpg", "ctrl-forma-thiago-rpg");
    let selo = pacote.querySelector(".selo-forma-criador-ctrl-rpg");
    if (selo) selo.remove();
}

function rolarEspecialDeDanoCtrl(nomeCtrl, idUnico, nomeCopiado, atraso) {
    setTimeout(() => {
        let dadoBonus = Math.floor(Math.random() * 6) + 1;
        let dadoTela = document.getElementById("dado-tela");

        if (dadoTela) {
            dadoTela.style.animation = "none";
            setTimeout(() => dadoTela.style.animation = "", 10);
            dadoTela.innerText = "🎲 " + dadoBonus;
        }

        if (dadoBonus === 3) {
            let elemDano = document.getElementById("dano-" + idUnico);
            if (!elemDano) return;
            let danoAtual = parseFloat(elemDano.innerText) || 0;
            elemDano.innerText = danoAtual + 1;
            mostrarEfeitoAtaque(idUnico);
            if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
            narrar(`🎯 O Especial do ${nomeCtrl} tirou 3! Como [${nomeCopiado}] não possui Especial, o Ctrl ganhou +1 de Dano permanentemente!`);
        } else {
            narrar(`🎲 O Especial do ${nomeCtrl} tirou ${dadoBonus}. Como precisava tirar 3, não ganhou o +1 de Dano.`);
        }
    }, atraso);
}

function usarHabilidade(nome, idUnico, botao, aoConcluir) {
    // 🆕 aoConcluir: callback opcional chamado com (sucesso: boolean) quando o resultado do
    // dado desta habilidade for conhecido (pode ser na hora ou depois de um setTimeout).
    // Usado pelo Ctrl C/V pra saber se a habilidade copiada deu certo antes de rolar o bônus.
    let notificar = function (sucesso) { if (typeof aoConcluir === "function") aoConcluir(sucesso); };
    let dadoTela = document.getElementById("dado-tela");
    if (typeof cartaSilenciadaPeloEcto === "function" && cartaSilenciadaPeloEcto(idUnico)) {
        narrar("👻 O Ecto removeu permanentemente a habilidade desta carta. Ela só pode usar o ataque comum.");
        notificar(false);
        return;
    }

    /// 🎭 CRIADOR (ÍCARO / THIAGO) — 2 usos únicos em sequência:
    /// 1º clique: rola o dado e vira Ícaro (1-3) ou Thiago (4-6).
    /// 2º clique: ativa o poder da forma escolhida (lê o nome ATUAL na carta, não o "nome"
    /// recebido aqui, que sempre chega como "Criador" porque é o valor fixo do onclick).
    if (nome === 'Criador') {
        let pacoteCriador = document.getElementById('pacote-' + idUnico);
        if (!pacoteCriador) return;
        let elemNomeCriador = pacoteCriador.querySelector('.nome-carta');
        let ehCriadorCopiadoPeloCtrl = ctrlCopiouCriador(idUnico);
        // O Ctrl mantém seu próprio nome visível. A forma sorteada do Criador fica
        // guardada no estado da cópia para o segundo clique no Especial.
        let nomeAtual = ehCriadorCopiadoPeloCtrl
            ? (ctrlV[idUnico].formaCriador || 'Criador')
            : (elemNomeCriador ? elemNomeCriador.innerText.trim() : 'Criador');

        if (nomeAtual === 'Criador') {
            // FASE 1: ainda não se transformou.
            let dado = Math.floor(Math.random() * 6) + 1;
            document.getElementById("dado-tela").innerText = "🎲 " + dado;

            let elemVida = document.getElementById('vida-' + idUnico);
            let elemDano = document.getElementById('dano-' + idUnico);

            if (dado <= 3) {
                if (ehCriadorCopiadoPeloCtrl) {
                    ctrlV[idUnico].formaCriador = 'Ícaro';
                    if (elemVida) elemVida.innerText = 2;
                    if (elemDano) elemDano.innerText = 2;
                    mostrarFormaCriadorNoCtrl(idUnico, 'Ícaro');
                    narrar(`🎲 Tirou ${dado}! O Ctrl assumiu a forma copiada de ÍCARO (2 de vida e 2 de dano). Clique em Especial de novo para transformar uma carta.`);
                } else {
                    elemNomeCriador.innerText = 'Ícaro';
                    if (elemVida) elemVida.innerText = 3;
                    if (elemDano) elemDano.innerText = 3;
                    narrar(`🎲 Tirou ${dado}! O Criador se tornou ÍCARO! Clique em Especial de novo pra usar o poder dele: transformar qualquer carta em outra.`);
                }
            } else {
                if (ehCriadorCopiadoPeloCtrl) {
                    ctrlV[idUnico].formaCriador = 'Thiago';
                    if (elemVida) elemVida.innerText = 3;
                    if (elemDano) elemDano.innerText = 1;
                    mostrarFormaCriadorNoCtrl(idUnico, 'Thiago');
                    narrar(`🎲 Tirou ${dado}! O Ctrl assumiu a forma copiada de THIAGO (3 de vida e 1 de dano). Clique em Especial de novo para ajustar ±1 atributo.`);
                } else {
                    elemNomeCriador.innerText = 'Thiago';
                    if (elemVida) elemVida.innerText = 4;
                    if (elemDano) elemDano.innerText = 2;
                    narrar(`🎲 Tirou ${dado}! O Criador se tornou THIAGO! Clique em Especial de novo pra usar o poder dele: ajustar ±1 um atributo de qualquer carta.`);
                }
            }
            // 🚨 NÃO esconde o botão — ele ainda tem o 2º uso (o poder da forma escolhida).
            // A transformação é apenas a primeira metade do Especial do Criador; o Ctrl
            // não rola bônus próprio aqui e conserva o botão para concluir o poder.
            if (!ehCriadorCopiadoPeloCtrl) notificar(true);
            return;
        }

        if (nomeAtual === 'Ícaro') {
            modoTransformacaoIcaro = true;
            idIcaroAtivo = idUnico;
            narrar("🎨 ÍCARO ativado! Clique em qualquer carta em jogo (sua ou do oponente) pra transformá-la em outra tropa aleatória, mantendo a vida e o dano dela.");
            if (botao) botao.style.display = 'none';
            return;
        }

        if (nomeAtual === 'Thiago') {
            modoAjusteThiago = true;
            idThiagoAtivo = idUnico;
            narrar("⚖️ THIAGO ativado! Clique em qualquer carta em jogo pra ajustar vida ou dano dela em ±1.");
            if (botao) botao.style.display = 'none';
            return;
        }
    }

    /// 🔥 HABILIDADE: INCENDIÁRIO (dado 4 = faz os turnos 1, 2 e 3 numa jogada só)
    if (nome === 'Incendiário') {
        let dado = Math.floor(Math.random() * 6) + 1;
        document.getElementById("dado-tela").innerText = "🎲 " + dado;
        if (botao) botao.style.display = 'none'; // uso único

        if (dado === 4) {
            narrar("🎲 Tirou 4! O Incendiário jogou a pólvora e queimou as 2 rodadas inteiras nessa mesma jogada!");
            executarFaseIncendiario(idUnico, 1); // joga a pólvora
            executarFaseIncendiario(idUnico, 2); // 1ª queimada
            executarFaseIncendiario(idUnico, 3); // 2ª queimada — os turnos 1, 2 e 3 viram 1 turno só
            incendiarioCiclo[idUnico] = 3; // guarda a ÚLTIMA fase executada (3); próxima passagem = fase 4 (parado), depois disso reinicia normal (sem o especial)
            notificar(true);
        } else {
            narrar(`🎲 Tirou ${dado}. Não deu 4 — a habilidade não ativou dessa vez.`);
            notificar(false);
        }
        return;
    }

    /// ⏳ HABILIDADE: VIAJANTE DO TEMPO (dado 1 = prende uma carta inimiga no tempo)
    if (nome === 'Viajante do Tempo') {
        let dado = Math.floor(Math.random() * 6) + 1;
        document.getElementById("dado-tela").innerText = "🎲 " + dado;
        if (botao) botao.style.display = 'none'; // uso único

        if (dado === 1) {
            modoPrenderNoTempo = true;
            idPrenderNoTempoAtivo = idUnico;
            narrar("🎲 Tirou 1! Clique numa carta INIMIGA pra prendê-la em um momento do tempo — ela vai sumir da batalha!");
            notificar(true);
        } else {
            narrar(`🎲 Tirou ${dado}. Não deu 1 — a habilidade não ativou dessa vez.`);
            notificar(false);
        }
        return;
    }

    /// 👥 HABILIDADE: SEPARADO / SEPARADOIS (dado 6 = ataque dividido em 2 alvos)
    if (nome === 'Separado' || nome === 'Separadois') {
        let idParceira = typeof parceriaSeparado !== 'undefined' ? parceriaSeparado[idUnico] : null;
        let parceiraViva = idParceira && document.getElementById('pacote-' + idParceira);

        if (!parceiraViva) {
            if (botao) botao.style.display = 'none';
            notificar(false);
            return narrar(`❌ ${nome} não tem uma parceira viva em campo pra usar essa habilidade!`);
        }

        let especialJaFixo = typeof especialFixoSeparado !== 'undefined'
            && especialFixoSeparado[idUnico] === true;
        let dado = especialJaFixo ? 6 : (Math.floor(Math.random() * 6) + 1);
        document.getElementById("dado-tela").innerText = "🎲 " + dado;
        if (botao) botao.style.display = 'none'; // uso único, vale a tentativa mesmo se não der 6

        if (dado === 6) {
            if (!especialJaFixo && typeof especialFixoSeparado !== 'undefined') {
                especialFixoSeparado[idUnico] = true;
            }
            if (typeof parceiraDoSeparadoEhIncendiario === "function"
                && parceiraDoSeparadoEhIncendiario(idUnico)) {
                // O Incendiário ataca automaticamente nas queimadas. Não abrir
                // uma sequência manual que ficaria presa esperando o botão dele.
                delete separadaoDividido[idUnico];
                delete separadaoAtacantesNaSequencia[idUnico];
                narrar(`👥 O Especial permanente de ${nome} foi conquistado! Com o Incendiário, seu ataque acompanha automaticamente uma das cartas queimadas.`);
                notificar(true);
                return;
            }
            separadaoDividido[idUnico] = 2; // faltam 2 ataques: o do Separado e o da parceira
            separadaoAtacantesNaSequencia[idUnico] = [];
            if (typeof animarAtivacaoDivisaoSeparado === "function") {
                animarAtivacaoDivisaoSeparado(idUnico, idParceira);
            }
            let inicioMensagem = especialJaFixo
                ? `👥 O Especial permanente de ${nome} já está ativo!`
                : `🎲 Tirou 6! O Especial de ${nome} agora é permanente!`;
            narrar(`${inicioMensagem} A partir de agora, em TODAS as rodadas, você pode começar por ${nome} OU pela parceira. Depois, ataque com a outra carta em outro alvo — não será preciso usar o Especial nem rolar o dado novamente.`);
            notificar(true);
        } else {
            narrar(`🎲 Tirou ${dado}. Não deu 6 — a habilidade não ativou dessa vez.`);
            notificar(false);
        }
        return;
    }

    /// 🪵 HABILIDADE ESPECIAL: BARRIL DE BÁRBARO
    if (nome.includes('Barril de Bárbaro')) { // 🔥 CORREÇÃO: Estava nomeCarta, agora é só 'nome'
        let dado = Math.floor(Math.random() * 6) + 1;
        document.getElementById("dado-tela").innerText = "🎲 " + dado;
        
        if (dado === 5) {
            splashBarbaroAtivo[idUnico] = true;
            narrar("🎲 O dado rolou 5! O próximo impacto causará +1 de dano nas cartas vizinhas!");
        } else {
            splashBarbaroAtivo[idUnico] = false; 
            narrar(`🎲 O dado rolou ${dado}. Sem dano em área, mas o impacto de 3 de dano continua preparado!`);
        }
        
        // Esconde o botão roxo após usar a habilidade única
        if (botao) botao.style.display = 'none';
        notificar(dado === 5);
        return;
    }
    // 🛡️ HABILIDADE ESPECIAL: BARRIL (Criar Vínculo de Guarda-Costas)
    if (nome === 'Barril') {
        // O dono precisa ser descoberto pela posição REAL da carta. Cartas trazidas pelo
        // Necromante recebem IDs "necro_...", sem a palavra "inimigo", mesmo quando são do
        // P2; usar o ID fazia o Barril do bot proteger uma carta do jogador e criava um loop.
        let pacoteBarril = document.getElementById("pacote-" + idUnico);
        let barrilEhDoInimigo = pacoteBarril
            ? !!pacoteBarril.closest('#campo-j2, #mao-j2')
            : idUnico.includes("inimigo"); // fallback apenas se a carta já tiver saído da tela

        if (barrilEhDoInimigo) {
            modoProtecaoBarrilInimigo = true;
            idBarrilProtetor = idUnico;
            narrar("🛡️ MODO ESCUDO INIMIGO: Clique em uma carta do OPONENTE para o Barril proteger!");
        } else {
            // Se o ID não tem "inimigo", é o seu Barril (P1)
            modoProtecaoBarril = true;
            idBarrilProtetor = idUnico;
            narrar("🛡️ MODO ESCUDO ALIADO: Clique em uma de SUAS cartas para o Barril proteger!");
        }
        
        if (botao) botao.style.display = 'none'; // Some com o botão após o uso
        notificar(true); // não tem dado — sempre "ativa"
        return;
    }
    // 🧪 HABILIDADE ESPECIAL: BRUXO (Polimorfia e Controle Mental)
    if (nome === 'Bruxo') {
        if (botao) botao.style.display = 'none'; // Some com o botão
        
        let dado = Math.floor(Math.random() * 6) + 1;
        let dadoTela = document.getElementById("dado-tela");
        
        // Efeito visual do dado
        dadoTela.style.animation = 'none';
        setTimeout(() => dadoTela.style.animation = '', 10);
        dadoTela.innerText = "🎲 " + dado;

        setTimeout(() => {
            // 🚀 SALVA O ID DO BRUXO ATIVO ANTES DE ENTRAR NOS MODOS
            idBruxoAtivo = idUnico; 

            if (dado === 4) {
                modoBruxoTransformar = true;
                narrar("🧪 O Bruxo tirou 4! Clique em uma carta INIMIGA para transformá-la em Poção!");
                notificar(true);
            } else if (dado === 6) {
                modoBruxoRoubar = true;
                narrar("🔮 O Bruxo tirou 6! Clique em uma carta INIMIGA para ROUBÁ-LA!");
                notificar(true);
            } else {
                narrar(`🎲 O Bruxo rolou ${dado}. A magia falhou e ele virou poção!`);
                
                // Pega o bruxo correto e o lado dele para gerar a poção
                let pacoteBruxo = document.getElementById("pacote-" + idUnico);
                if (pacoteBruxo) {
                    let oBruxoEAliado = pacoteBruxo.closest("#campo-j1") !== null;
                    let maoDestino = oBruxoEAliado ? "mao-j1" : "mao-j2";
                    if (typeof animarBruxoVirandoPocao === "function") animarBruxoVirandoPocao(idUnico);
                    gerarPocaoAleatoria(maoDestino); // Cria a poção
                    pacoteBruxo.remove(); // Remove o Bruxo do campo
                }
                
                idBruxoAtivo = null; // Reseta o uso
                notificar(false);
            }
        }, 1000);
        
        return;
    }
    // ❄️ IMPEDIR CARTAS CONGELADAS DE USAR ESPECIAL
    let pacoteDono = document.getElementById("pacote-" + idUnico);
    if (pacoteDono && pacoteDono.classList.contains("congelada")) {
        narrar("❄️ Esta carta está congelada e não pode usar habilidades!");
        notificar(false);
        return;
    }

    // ❄️ EFEITO DA POÇÃO DE GELO
    if (nome === 'Poção de Gelo' || nome === 'Gelo' || nome === 'Pocaogelo' || idUnico.includes("pocaogelo")) {
        let dado = Math.floor(Math.random() * 6) + 1; // Rola o dado de 1 a 6
        let ladoPocaoGelo = typeof obterLadoRealDaCarta === "function" ? obterLadoRealDaCarta(idUnico) : null;
        narrar(`🧪 Você usou a Poção de Gelo! O dado rolou: ${dado}`);

        if (dado === 5) {
            narrar("❄️ NEVASCA! Todas as cartas inimigas (campo e mão) foram congeladas por 1 rodada a mais!");
            
            let pacotePocao = document.getElementById("pacote-" + idUnico);
            let aPocaoEAliada = true;
            
            if (pacotePocao) {
                aPocaoEAliada = pacotePocao.closest("#campo-j1") !== null || pacotePocao.closest("#mao-j1") !== null;
            }
            
            // Descobre quem é o inimigo para mirar nele
            let idCampoInimigo = aPocaoEAliada ? "campo-j2" : "campo-j1";
            let idMaoInimiga = aPocaoEAliada ? "mao-j2" : "mao-j1";
            
            // 🎯 A MÁGICA AQUI: Seleciona apenas as CARTAS ([id^="pacote-"]) dentro da mão e do campo do inimigo
            let cartasInimigas = document.querySelectorAll(`#${idCampoInimigo} [id^="pacote-"], #${idMaoInimiga} [id^="pacote-"]`);
            
            if (cartasInimigas.length === 0) {
                narrar("💨 A nevasca soprou, mas não havia cartas inimigas para congelar!");
            } else {
                // Congela cada uma das cartas individualmente
                cartasInimigas.forEach(pacoteCard => {
                    // Extrai o ID único da carta removendo o prefixo "pacote-"
                    let idCarta = pacoteCard.id.replace("pacote-", "");
                    
                    // Antes eram 3 passagens; +2 equivale a uma rodada completa a mais.
                    duracaoGelo[idCarta] = 5;
                    
                    // Aplica o visual de gelo direto na carta!
                    pacoteCard.classList.add("congelada");
                });
                
                narrar(`❄️ Sucesso! A nevasca congelou todas as ${cartasInimigas.length} carta(s) do oponente!`);
            }
            
            if (pacotePocao) pacotePocao.remove();
            idPocaoAtiva = null;
            modoGeloSimples = false;
        } else {
            // Qualquer outro dado ativa o Alvo Simples
            narrar("❄️ Gelo Simples ativado! Clique em uma carta do OPONENTE (campo ou mão) para congelar.");
            modoGeloSimples = true;
            idPocaoAtiva = idUnico;
        }
        
        if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
        if (dado === 5 && ladoPocaoGelo && typeof passarTurnoSeForVezDoLado === "function") {
            passarTurnoSeForVezDoLado(ladoPocaoGelo);
        }
        notificar(true); // Gelo sempre "funciona" de algum jeito (nevasca ou alvo simples)
        return;
    }
    if (nome === 'Necromante') {
        let resultadoDado = Math.floor(Math.random() * 6) + 1;
        
        dadoTela.style.animation = 'none';
        setTimeout(() => dadoTela.style.animation = '', 10);
        dadoTela.innerText = "🎲 " + resultadoDado;

        let ehAliado = botao.closest('#campo-j1') || botao.closest('#mao-j1') || botao.closest('.carta-aliada'); 
        
        let idMao = ehAliado ? "mao-j1" : "mao-j2";
        let idCampo = ehAliado ? "campo-j1" : "campo-j2";
        
        let maoHTML = document.getElementById(idMao);
        let campoHTML = document.getElementById(idCampo);

        if (resultadoDado >= 3 && resultadoDado <= 5) {
            // LÓGICA INFALÍVEL: Pega as cartas direto do HTML da mão (elas têm o ID começando com pacote-necro_)
            let cartasInvocadasNoHTML = Array.from(maoHTML.querySelectorAll('div[id^="pacote-necro_"]'));

            if (cartasInvocadasNoHTML.length > 0) {
                let danoExtra = 0;

                cartasInvocadasNoHTML.forEach(pacoteCarta => {
                    // Move a carta fisicamente para a arena
                    campoHTML.appendChild(pacoteCarta);
                    
                    // Libera os botões de ação dela
                    let divAcoes = pacoteCarta.querySelector("div[id^='acoes-']");
                    if (divAcoes) divAcoes.style.display = "block";
                    
                    // Ajusta a classe para aliado ou inimigo
                    pacoteCarta.className = ehAliado ? "carta-aliada" : "carta-inimiga";
                    
                    // Lê o dano da carta direto da tela
                    let idDaCarta = pacoteCarta.id.replace("pacote-", "");
                    let elemDano = document.getElementById("dano-" + idDaCarta);
                    if (elemDano) {
                        danoExtra += parseFloat(elemDano.innerText);
                    }

                    // A invocação direta pulava o clique normal de "jogar carta" e deixava a
                    // imagem com o comportamento antigo da mão. Ativamos o modo de batalha
                    // agora; isso também dispara corretamente a passiva de outro Necromante.
                    if (ehAliado) jogarCarta(pacoteCarta.id);
                    else jogarCartaInimigo(pacoteCarta.id);
                });

                let danoTotal = 1 + danoExtra;
                narrar(`🔮 SUCESSO! Dado: ${resultadoDado}. As cartas saltaram da mão para a arena! Causaram ${danoTotal} de dano!`);
            } else {
                narrar(`🔮 SUCESSO! Dado: ${resultadoDado}. Porém as cartas invocadas já não estão na mão! Causou 1 de dano.`);
            }
            notificar(true);
        } else {
            narrar(`❌ FALHOU! O dado deu ${resultadoDado}. As cartas continuam na mão.`);
            notificar(false);
        }
        
        botao.style.display = "none"; 
        if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
        return; // SEM PASSAR O TURNO!
    }
    
    if (nome === 'Ork') {
        let resultadoDado = Math.floor(Math.random() * 6) + 1;
        
        dadoTela.style.animation = 'none';
        setTimeout(() => dadoTela.style.animation = '', 10);
        dadoTela.innerText = "🎲 " + resultadoDado;

        if (resultadoDado === 1) {
            orkBuffado[idUnico] = true; 
            narrar(`🔮 SUCESSO! Dado: 1. O Ork entrou em fúria! Se morrer, invocará 3 Goblins.`);
        } else {
            narrar(`❌ FALHOU! Dado: ${resultadoDado}. O Ork não se enfureceu.`);
        }
        
        botao.style.display = "none"; 
        notificar(resultadoDado === 1);
        return; // SEM PASSAR O TURNO!
    }
    
    if (nome === 'Curandeiro') {
        let ehAliado = botao.closest('#campo-j1') || botao.closest('#mao-j1') || botao.closest('.carta-aliada');
        
        // 🩹 CORREÇÃO: era 2 dados independentes (um pro +1 dano, outro pro bônus de cura),
        // mas a carta descreve os dois efeitos como consequência do MESMO resultado —
        // dava pra ganhar o bônus de cura sem ganhar o +1 de dano, o que não devia acontecer.
        let dado = Math.floor(Math.random() * 6) + 1;

        dadoTela.style.animation = 'none';
        setTimeout(() => dadoTela.style.animation = '', 10);
        dadoTela.innerText = "🎲 " + dado;

        let ehImpar = (dado % 2 !== 0);
        let deuBuff = (dado === 1 || dado === 3);

        let msgDano = "";
        if (ehImpar) {
            let spanDano = document.getElementById("dano-" + idUnico);
            let danoAtual = parseFloat(spanDano.innerText);
            spanDano.innerText = danoAtual + 1;
            animarFrascoCurandeiro(idUnico, idUnico, "ataque");
            msgDano = ehAliado ? "💥 Dado ÍMPAR! Seu Curandeiro ganhou +1 de Ataque." : "💥 Dado ÍMPAR! O Curandeiro Inimigo ganhou +1 de Ataque.";
        } else {
            msgDano = "❌ Dado foi PAR (sem ganho de ataque, sem bônus de cura).";
        }

        let msgBuff = "";
        if (deuBuff) {
            if (ehAliado) buffCuraCurandeiro = 0.5;
            else buffCuraCurandeiroInimigo = 0.5;
            msgBuff = "✨ Dado foi 1 ou 3! A próxima cura dará +0.5 de bônus.";
        }

        narrar(`🔮 Habilidade Curandeiro: ${msgDano} ${msgBuff}`);
        botao.style.display = "none";
        notificar(ehImpar);
        return; // SEM PASSAR O TURNO!
    }

    if (nome === "Ctrl C" || nome === "Ctrl V") {
        let dadosCopia = ctrlV[idUnico];
        if (!dadosCopia) return narrar("Erro: Não encontrei os dados da carta copiada!");
        let nomeCopiado = dadosCopia.nomeOriginal;

        // O Criador possui duas etapas. Na primeira, o Ctrl sorteia Ícaro/Thiago e
        // precisa manter o botão para usar o poder da forma no segundo clique.
        let primeiraEtapaCriador = nomeCopiado === "Criador" && !dadosCopia.formaCriador;
        if (!primeiraEtapaCriador && botao) botao.style.display = "none";

        // Cartas sem Especial ainda deixam o Ctrl usar o próprio Especial:
        // ele rola o dado e ganha +1 de dano permanente se tirar exatamente 3.
        if (!cartaTemEspecialCopiavelCtrl(nomeCopiado)) {
            narrar(`🔮 [${nomeCopiado}] não possui Especial. O ${nome} usará o próprio Especial e precisa tirar 3 para ganhar +1 de Dano.`);
            rolarEspecialDeDanoCtrl(nome, idUnico, nomeCopiado, 900);
            return;
        }

        narrar(`🔮 O ${nome} ativou a habilidade copiada de [${nomeCopiado}]!`);
        
        // 🩹 CORREÇÃO: o dado bônus (+1 dano no 3) só deveria rolar SE a habilidade copiada
        // tiver dado certo — antes ele rolava sempre, mesmo quando a cópia falhava.
        usarHabilidade(nomeCopiado, idUnico, botao, function (sucessoCopiado) {
            if (!sucessoCopiado) {
                narrar(`❌ A habilidade copiada de [${nomeCopiado}] não deu certo — sem chance de dado bônus desta vez.`);
                return;
            }

            // Depois de 1.5s (dá tempo de ler o resultado da habilidade copiada), rola o dado extra
            setTimeout(() => {
                let dadoBonus = Math.floor(Math.random() * 6) + 1;
                let dadoTela = document.getElementById("dado-tela");
                
                dadoTela.style.animation = 'none';
                setTimeout(() => dadoTela.style.animation = '', 10);
                dadoTela.innerText = "🎲 " + dadoBonus;
                
                if (dadoBonus === 3) {
                    let elemDano = document.getElementById("dano-" + idUnico);
                    let danoAtual = parseInt(elemDano.innerText);
                    elemDano.innerText = danoAtual + 1;

                    // 🚨 EFEITO AQUI: Sobe a espadinha!
                    mostrarEfeitoAtaque(idUnico);

                    narrar(`🎯 A habilidade copiada deu certo, e o dado bônus do ${nome} tirou 3! Ganhou +1 de Dano permanentemente!`);
                } else {
                    narrar(`🎲 A habilidade copiada deu certo, mas o dado bônus do ${nome} tirou ${dadoBonus}. Sem bônus de dano extra.`);
                }
            }, 1500);
        });
        
        return; // SEM PASSAR O TURNO!
    }

    // --- HABILIDADE DO CAVALEIRO DAS TREVAS ---
    if (nome === 'Cavaleiro das Trevas') {
        let ehAliado = botao.closest(".carta-aliada") !== null;
        
        if (cavaleiroAtivado[idUnico]) {
            notificar(false);
            return narrar("A habilidade deste Cavaleiro já está ativada com poder máximo!");
        }
        
        botao.style.display = "none"; // Some com o botão pra não clicar de novo
        
        narrar("Rolando o dado para despertar o Cavaleiro (precisa de 5)...");
        
        setTimeout(() => {
            let dado = Math.floor(Math.random() * 6) + 1;
            document.getElementById("dado-tela").innerText = "🎲 " + dado;
            
            if (dado === 5) {
                cavaleiroAtivado[idUnico] = true;
                let elemDano = document.getElementById("dano-" + idUnico);
                if (elemDano) elemDano.innerText = "5"; 
                narrar("MÁXIMO PODER! O Cavaleiro das Trevas despertou e agora dá 5 de dano em até 3 cartas!");
            } else {
                narrar(`Tirou ${dado}. A habilidade falhou.`);
            }
            
            if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
            notificar(dado === 5);
        }, 1200);
        return; // SEM PASSAR O TURNO!
    }
    
    // --- REGRA DO TRIO DE GOBLIN ---
    if (nome === "Trio de Goblin") {
        let vidaAtual = parseFloat(document.getElementById("vida-" + idUnico).innerText);
        if (vidaAtual > 2) {
            notificar(false);
            return narrar("❌ O Trio de Goblin só pode usar a habilidade especial quando restar apenas 1 Goblin (2 ou menos de vida)!");
        } else {
            narrar("🔥 Restou apenas um! O último do Trio ativou a habilidade do Goblin!");
            nome = "Goblin"; // Truque: Muda o nome para Goblin, assim o código dele cai direto no bloco do Goblin logo abaixo!
        }
    }

    // --- HABILIDADE DO GOBLIN ---
    if (nome === 'Goblin') {
        let dado = Math.floor(Math.random() * 6) + 1;
        document.getElementById("dado-tela").innerText = "🎲 " + dado;

        if (dado === 1 || dado === 2) {
            narrar(`💰 SUCESSO! Dado: ${dado}. O Goblin preparou o roubo! Clique em uma carta INIMIGA na arena para roubar 1 de DANO.`);
            modoRouboGoblin = true;
            faseRouboGoblin = 1;
            idGoblinLadrao = idUnico; // Guarda qual Goblin ativou o roubo (define o "lado" da habilidade)
        } else {
            narrar(`❌ FALHOU! Tirou ${dado}. O Goblin tentou roubar, mas tropeçou e foi pego.`);
        }

        botao.style.display = "none";
        notificar(dado === 1 || dado === 2);
        return; // Habilidade não passa o turno!
    }
    // --- HABILIDADE DO GUERREIRO ---
    if (nome === 'Guerreiro') {
        let dado = Math.floor(Math.random() * 6) + 1; // Rola o dado de 1 a 6
        
        let dadoTela = document.getElementById("dado-tela");
        dadoTela.style.animation = 'none';
        setTimeout(() => dadoTela.style.animation = '', 10);
        dadoTela.innerText = "🎲 " + dado;
        
        if (dado >= 1 && dado <= 4) {
            escudoGuerreiro[idUnico] = true;
            ativarVisualEscudo(idUnico);
            narrar(`🛡️ SUCESSO! O Guerreiro rolou ${dado} e ergueu o seu escudo impenetrável para esta rodada!`);
        } else {
            narrar(`🎲 FALHA... O Guerreiro rolou ${dado} e o escudo encravou.`);
        }
        
        // Bloqueia o botão para ser de Uso Único
        botao.style.display = "none";
        notificar(dado >= 1 && dado <= 4);
        return; // Ação rápida, não passa o turno!
    }
    // --- HABILIDADE: MAGO (VENENO) ---
    if (nome === 'Mago') {
        let pacoteMago = document.getElementById("pacote-" + idUnico);
        if (!pacoteMago) { notificar(false); return; }

        let ehAliadoMago = pacoteMago.closest("#campo-j1") !== null;
        let campoOposto = document.getElementById(ehAliadoMago ? "campo-j2" : "campo-j1");
        let classeOposta = ehAliadoMago ? ".carta-inimiga" : ".carta-aliada";
        if (!campoOposto || campoOposto.querySelectorAll(classeOposta).length === 0) {
            notificar(false);
            return narrar("☠️ Não há nenhuma carta no campo oposto para envenenar!");
        }

        let dado = Math.floor(Math.random() * 6) + 1;
        dadoTela.style.animation = 'none';
        setTimeout(() => dadoTela.style.animation = '', 10);
        dadoTela.innerText = "🎲 " + dado;
        if (botao) botao.style.display = "none";

        let sucesso = dado === 1 || dado === 4 || dado === 6;
        if (sucesso) {
            modoAlvoVenenoMago = true;
            idMagoVenenoAtivo = idUnico;
            narrar(`☠️ SUCESSO! O Mago tirou ${dado}. Clique numa carta do campo oposto para envenená-la por 2 rodadas!`);
        } else {
            modoAlvoVenenoMago = false;
            idMagoVenenoAtivo = null;
            narrar(`🎲 FALHA! O Mago tirou ${dado} e o veneno não foi lançado.`);
        }

        notificar(sucesso);
        return; // A habilidade é rápida: depois de escolher o alvo, o Mago ainda pode atacar.
    }

    // --- HABILIDADE: BARRIL DE GOBLINS ---
    if (nome.includes('Barril de Goblin')) { // 🚀 .includes FAZ O CTRL V FUNCIONAR!
        let idAlvo = alvosDoBarril[idUnico];
        if (!idAlvo) {
            // 📦 Ainda não atacou nesta rodada — deixa ativar o Especial já escolhendo o alvo:
            // o clique no inimigo vai aplicar o impacto normal E rolar esta habilidade em seguida.
            let pacoteBarril = document.getElementById("pacote-" + idUnico);
            if (!pacoteBarril) { notificar(false); return; }
            let ehAliadoBarril = pacoteBarril.closest("#campo-j1") !== null;
            modoEspecialBarrilGoblin = true;
            idBarrilAtivo = idUnico;
            if (botao) botao.style.display = "none";
            return narrar("📦 Clique na carta do OPONENTE pra focar os goblins nela e já rolar a habilidade!");
        }

        // 🚀 LÊ O DANO EXTRA (BUFFS DA BESTA, UNIDÃO, ETC)
        let txtDano = document.getElementById("dano-" + idUnico);
        let buffDano = txtDano ? parseFloat(txtDano.innerText) : 0;

        let dado = Math.floor(Math.random() * 6) + 1;
        
        let dadoTela = document.getElementById("dado-tela");
        dadoTela.style.animation = 'none';
        setTimeout(() => dadoTela.style.animation = '', 10);
        dadoTela.innerText = "🎲 " + dado;
        
        if (dado === 3) {
            // ➕ Só o BÔNUS (0,5) — os vizinhos já levaram o impacto base (1) na passiva.
            // Total nos vizinhos: 1 (base) + 0,5 (bônus) = 1,5, como esperado.
            let danoHabilidade = 0.5 + buffDano;
            
            let vizinhos = obterCartasAdjacentes("pacote-" + idAlvo);
            vizinhos.forEach(vizinho => {
                let isInimigo = vizinho.closest("#campo-j2") !== null;
                aplicarDanoDireto(vizinho.id, danoHabilidade, isInimigo);
            });
            narrar(`🎲 SUCESSO! Tirou 3! O Barril causou +${danoHabilidade} de dano extra nos vizinhos do alvo focado!`);
        } else {
            narrar(`🎲 FALHA! Tirou ${dado}. A habilidade não ativou.`);
        }
        
        if (botao) botao.style.display = "none";
        notificar(dado === 3);
        return; 
    }

if (nome === "Bumerskeleton") { 
        // 1. Verifica se o Bumerskeleton já atacou nesta rodada
        if (!alvosDoBumerangue[idUnico] || alvosDoBumerangue[idUnico].length === 0) {
            // 🪃 Ainda não atacou nesta rodada — deixa ativar o Especial já escolhendo o alvo:
            // o clique no inimigo vai lançar o bumerangue (com ricochete) E já rolar a habilidade.
            let pacoteBume = document.getElementById("pacote-" + idUnico);
            if (!pacoteBume) { notificar(false); return; }
            let ehAliadoBume = pacoteBume.closest("#campo-j1") !== null;
            modoEspecialBumerskeleton = true;
            idBumerskeletonEspecialAtivo = idUnico;
            if (botao) botao.style.display = "none";
            return narrar("🪃 Clique numa carta inimiga pra lançar o bumerangue nela e já rolar a habilidade!");
        }

        // 🚨 A MÁGICA AQUI: Esconde o botão roxo! A chance é gasta na hora!
        if (botao) botao.style.display = "none";

        let alvosAtingidos = alvosDoBumerangue[idUnico]; 

        // Depois que este Bumerskeleton consegue Fogo ou Gelo pela primeira vez,
        // esse passa a ser o Especial fixo dele pelo restante da partida.
        let especialJaDefinido = typeof especialFixoBumerskeleton !== "undefined"
            ? especialFixoBumerskeleton[idUnico]
            : null;
        let dado = especialJaDefinido || (Math.floor(Math.random() * 6) + 1);

        // O gelo continua sendo o poder fixo, mas só congela a cada dois
        // lançamentos do próprio Bumerskeleton. No intervalo, o bumerangue
        // causa normalmente seu dano e seus ricochetes.
        if (especialJaDefinido === 5 && recargaGeloBumerskeleton[idUnico] !== 1) {
            recargaGeloBumerskeleton[idUnico] = 1;
            narrar("🪃 O gelo fixo está recarregando neste ataque; o próximo lançamento voltará a congelar.");
            delete alvosDoBumerangue[idUnico];
            if (typeof trajetosVisuaisBumerangue !== "undefined") delete trajetosVisuaisBumerangue[idUnico];
            notificar(false);
            if (typeof passarTurnoSeForVezDaCarta === "function") passarTurnoSeForVezDaCarta(idUnico);
            return;
        }
        if (especialJaDefinido === 5) recargaGeloBumerskeleton[idUnico] = 0;
        
        // Efeito visual no dado da tela
        let dadoTela = document.getElementById("dado-tela");
        if (dadoTela) {
            dadoTela.style.animation = 'none';
            setTimeout(() => dadoTela.style.animation = '', 10);
            dadoTela.innerText = "🎲 " + dado;
        }

        narrar(especialJaDefinido
            ? `🪃 O Bumerskeleton repetiu seu Especial fixo: ${dado === 3 ? "FOGO" : "GELO"}!`
            : `🎲 Bumerskeleton rolou o dado e tirou: ${dado}!`);

        if (dado === 1) {
            // EFEITO 1: BUMERANGUE VOLTA
            if (typeof animarRetornoBumerangue === "function") animarRetornoBumerangue(idUnico);
            let primeiroAlvo = alvosAtingidos[0]; 
            let pacoteAlvo = document.getElementById("pacote-" + primeiroAlvo);
            
            if (pacoteAlvo) {
                // Descobre qual é o próximo dano da escala 
                let danoDoRetorno = tabelaDanoBumerangue[alvosAtingidos.length] || 4; 
                
                if (typeof mostrarEfeitoPerdaVida === "function") mostrarEfeitoPerdaVida(primeiroAlvo);
                let alvoEhInimigo = pacoteAlvo.closest("#campo-j2") !== null;
                aplicarDanoDireto("pacote-" + primeiroAlvo, danoDoRetorno, alvoEhInimigo);
                
                narrar(`🪃 O bumerangue fez a curva! Retornou dando ${danoDoRetorno} de DANO na primeira carta! ROLANDO DADO DE NOVO...`);
                
                // Rola o dado de novo imediatamente após 2 segundos!
                setTimeout(() => {
                    usarHabilidade(nome, idUnico, null); // "null" para o botão não dar erro no retorno
                }, 2000);
            } else {
                narrar("🪃 O bumerangue voltou, mas o primeiro alvo já estava destruído!");
                delete alvosDoBumerangue[idUnico];
                if (typeof trajetosVisuaisBumerangue !== "undefined") delete trajetosVisuaisBumerangue[idUnico];
                notificar(false);
                if (typeof passarTurnoSeForVezDaCarta === "function") passarTurnoSeForVezDaCarta(idUnico);
                return;
            }
            notificar(true);

        } else if (dado === 3) {
            // EFEITO 3: FOGO EM TODOS
            if (!especialJaDefinido && typeof especialFixoBumerskeleton !== "undefined") {
                especialFixoBumerskeleton[idUnico] = 3;
                narrar("🔥 O FOGO se tornou o Especial fixo deste Bumerskeleton!");
            }
            alvosAtingidos.forEach(idAlvo => {
                let pacoteAlvoFogo = document.getElementById("pacote-" + idAlvo);
                if (pacoteAlvoFogo) {
                    if (typeof ativarFogoVisualBumerskeleton === "function") ativarFogoVisualBumerskeleton(idAlvo);
                    if (typeof mostrarEfeitoPerdaVida === "function") mostrarEfeitoPerdaVida(idAlvo);
                    let alvoEhInimigo = pacoteAlvoFogo.closest("#campo-j2") !== null;
                    aplicarDanoDireto("pacote-" + idAlvo, 0.25, alvoEhInimigo);
                }
            });
            narrar(`🔥 FOGO! O rastro do bumerangue incendiou TODAS as cartas atingidas (-0.25 de vida)!`);
            delete alvosDoBumerangue[idUnico];
            if (typeof trajetosVisuaisBumerangue !== "undefined") delete trajetosVisuaisBumerangue[idUnico];
            notificar(true);
            if (typeof passarTurnoSeForVezDaCarta === "function") passarTurnoSeForVezDaCarta(idUnico);

       } else if (dado === 5) {
            // GELO EM TODOS
            if (!especialJaDefinido && typeof especialFixoBumerskeleton !== "undefined") {
                especialFixoBumerskeleton[idUnico] = 5;
                recargaGeloBumerskeleton[idUnico] = 0;
                narrar("❄️ O GELO se tornou o Especial fixo deste Bumerskeleton!");
            }
            alvosAtingidos.forEach(idAlvo => {
                let pacote = document.getElementById("pacote-" + idAlvo);
                if (pacote) {
                    let vidaAlvo = document.getElementById("vida-" + idAlvo);
                    if (!vidaAlvo || parseFloat(vidaAlvo.innerText) <= 0) {
                        let alvoEhInimigo = pacote.closest("#campo-j2") !== null;
                        aplicarDanoDireto("pacote-" + idAlvo, 0, alvoEhInimigo);
                        return;
                    }
                    pacote.classList.add("congelada"); 
                    pacote.style.filter = "hue-rotate(180deg) brightness(1.2)"; 
                    
                    if (typeof duracaoGelo !== 'undefined') {
                        duracaoGelo[idAlvo] = 5; // antes 3; +2 passagens = +1 rodada completa
                    }
                    if (typeof ativarGeloVisualBumerskeleton === "function") ativarGeloVisualBumerskeleton(idAlvo);
                }
            });
            narrar(`❄️ GELO ABSOLUTO! Todas as cartas no trajeto do bumerangue foram CONGELADAS!`);
            delete alvosDoBumerangue[idUnico];
            if (typeof trajetosVisuaisBumerangue !== "undefined") delete trajetosVisuaisBumerangue[idUnico];
            notificar(true);
            if (typeof passarTurnoSeForVezDaCarta === "function") passarTurnoSeForVezDaCarta(idUnico);
            
        } else {
            // 🚨 MENSAGEM DE FALHA: Se não cair 1, 3 ou 5
            narrar(`💀 Falhou! O dado tirou ${dado} (não foi 1, 3 ou 5). O bumerangue caiu e a chance foi perdida!`);
            delete alvosDoBumerangue[idUnico];
            if (typeof trajetosVisuaisBumerangue !== "undefined") delete trajetosVisuaisBumerangue[idUnico];
            notificar(false);
            if (typeof passarTurnoSeForVezDaCarta === "function") passarTurnoSeForVezDaCarta(idUnico);
        }
    }
    if (nome === "Mensageiro") {
        if (botao) botao.style.display = "none";

        let dado = Math.floor(Math.random() * 6) + 1;
        
        let dadoTela = document.getElementById("dado-tela");
        if (dadoTela) {
            dadoTela.style.animation = 'none';
            setTimeout(() => dadoTela.style.animation = '', 10);
            dadoTela.innerText = "🎲 " + dado;
        }

        narrar(`🎲 Mensageiro rolou o dado e tirou: ${dado}!`);

        if (dado === 6) {
            narrar("🌪️ SUCESSO! O Mensageiro ativou seu Modo Área! Seus ataques normais agora causam 2 de dano a TODOS!");
            
            // Liga o modo área para ESTA carta específica
            window.mensageirosEmArea[idUnico] = true;
            
            // Atualiza o visual do texto da carta para o jogador lembrar!
            let txtDano = document.getElementById("dano-" + idUnico);
            if (txtDano) {
                txtDano.innerText = "2"; 
                txtDano.style.color = "#9b59b6"; // Muda a cor do dano para roxo para indicar a mudança
            }
        } else {
            narrar(`💀 Falhou! O dado tirou ${dado}. O Mensageiro continua com ataques normais.`);
        }
        notificar(dado === 6);
    }
}

// --- PASSIVA DO NECROMANTE (CORREÇÃO DE ERRO) ---
function verificarPassivaNecromante(carta, ehAliado) {
    // Verifica se a carta que acabou de entrar no campo é o Necromante
    if (carta.nome === "Necromante" && !carta.passivaAtivada) {
        narrar("💀 O Necromante entrou na arena com sua aura sombria!");
        carta.passivaAtivada = true;
        let maoArray = ehAliado ? maoJ1 : maoJ2; 
        let idMaoHTML = ehAliado ? "mao-j1" : "mao-j2";
        let funcaoJogar = ehAliado ? "jogarCarta" : "jogarCartaInimigo";
        let classeCss = ehAliado ? "carta-aliada" : "carta-inimiga-espera"; 
        
        let divMao = document.getElementById(idMaoHTML);

        // 🩹 CORREÇÃO: essa lista era uma cópia separada e congelada da lista real de
        // suportes/poções (suportesReais, em main.js) — nunca foi atualizada com nenhuma
        // das cartas novas (Vampi7, Portable, Plus Life, Reviverta, Cracker, Allsforms,
        // Dupliquetion, Auvex), então o Necromante podia invocar qualquer uma delas como
        // se fosse tropa. Agora usa a lista global de verdade, então nunca mais desatualiza.
        let listaDeSuportes = (typeof suportesReais !== 'undefined') ? suportesReais : [
            "besta", "recuperida", "velux", "pocaotraicao", 
            "adiv", "pocaogelo", "escudo_item", "cavalotroia", "fogueira"
        ];

        let bancoDeTropas = bancoDeCartas.filter(c => !listaDeSuportes.includes(c.id));

        for (let i = 0; i < 2; i++) {
            let indexSorteado = Math.floor(Math.random() * bancoDeTropas.length);
            let cartaSorteada = bancoDeTropas[indexSorteado];

            let novaCarta = {
                ...cartaSorteada, 
                idUnico: 'necro_' + Math.random().toString(36).substr(2, 9),
                invocadaPor: 'Necromante' 
            };

            // 🚨 NOVIDADE AQUI: A carta recebe 2 turnos de bloqueio (O seu e o do oponente = 1 rodada completa)
            bloqueioNecro[novaCarta.idUnico] = 2; 

            let htmlDaCarta = criarHTMLCarta(novaCarta, funcaoJogar, classeCss, ehAliado);
            if (divMao) {
                divMao.insertAdjacentHTML('beforeend', htmlDaCarta);
                // As duas cartas surgem em sequência, como se fossem desenterradas.
                animarInvocacaoNecromante(novaCarta.idUnico, i * 170);
            }
        }
    }
}

function usarPassivaLadrao(idUnico, botao) {
    if (typeof cartaSilenciadaPeloEcto === "function" && cartaSilenciadaPeloEcto(idUnico)) {
        return narrar("👻 Esta carta perdeu a Passiva para o Ecto.");
    }
    // Cada cópia do Ladrão tem a própria tentativa. Antes a trava era por lado:
    // usar um Ladrão bloqueava todos os outros Ladrões do mesmo time.
    if (typeof ladraoUsosPorCarta !== 'undefined' && ladraoUsosPorCarta[idUnico]) {
        return narrar("❌ Este Ladrão já usou a passiva neste turno! Escolha outro Ladrão ou espere o próximo turno.");
    }

    // 🩹 CORREÇÃO: era 'ladroesQueJaRoubaram[idUnico]' — uma trava que nunca era resetada
    // e travava a passiva pro resto do jogo depois do 1º uso. Passiva é "usa quando quiser",
    // então só bloqueamos se já tiver um roubo NESTE EXATO MOMENTO aguardando alvo.
    if (modoLadrao) {
        return narrar("❌ Já tem um roubo do Ladrão em andamento! Escolha o alvo antes de usar de novo.");
    }

    if (typeof ladraoUsosPorCarta !== 'undefined') ladraoUsosPorCarta[idUnico] = true;

    let dadoTela = document.getElementById("dado-tela");
    let resultadoDado = Math.floor(Math.random() * 6) + 1;

    dadoTela.style.animation = 'none';
    setTimeout(() => dadoTela.style.animation = '', 10);
    dadoTela.innerText = "🎲 " + resultadoDado;

    if (resultadoDado === 1 || resultadoDado === 3) {
        modoLadrao = true;
        faseLadrao = 1;
        tipoRouboLadrao = "vida";
        idLadraoRouboAtivo = idUnico;
        narrar(`💰 Ladrão tirou ${resultadoDado}! Clique em uma carta INIMIGA do campo para roubar 1 de VIDA.`);
    } else if (resultadoDado === 4 || resultadoDado === 6) {
        modoLadrao = true;
        faseLadrao = 1;
        tipoRouboLadrao = "dano";
        idLadraoRouboAtivo = idUnico;
        narrar(`💰 Ladrão tirou ${resultadoDado}! Clique em uma carta INIMIGA do campo para roubar 1 de DANO.`);
    } else {
        idLadraoRouboAtivo = null;
        narrar(`❌ O Ladrão rolou ${resultadoDado}. O plano de roubo falhou e a chance foi gasta!`);
    }
}

// O dono do roubo é definido pela posição REAL do Ladrão, não por turnoAtivo.
// Isso permite controlar o lado inimigo numa partida local sem inverter vítima e aliado.
function obterLadoLadraoRouboAtivo() {
    let ladrao = idLadraoRouboAtivo
        ? document.getElementById("pacote-" + idLadraoRouboAtivo)
        : null;
    if (ladrao?.closest("#campo-j1")) return "j1";
    if (ladrao?.closest("#campo-j2")) return "j2";
    return null;
}

function obterAcaoRouboLadraoNoLado(ladoAlvo) {
    if (!modoLadrao) return null;
    let ladoLadrao = obterLadoLadraoRouboAtivo();
    if (!ladoLadrao) return null;
    if (faseLadrao === 1 && ladoAlvo !== ladoLadrao) return "roubo-prejuizo";
    if (faseLadrao === 2 && ladoAlvo === ladoLadrao) return "roubo-beneficio";
    return null;
}

function resolverCliqueRouboLadrao(idPacoteAlvo) {
    if (!modoLadrao) return false;

    let alvo = document.getElementById(idPacoteAlvo);
    let ladoAlvo = alvo?.closest("#campo-j1")
        ? "j1"
        : (alvo?.closest("#campo-j2") ? "j2" : null);
    let ladoLadrao = obterLadoLadraoRouboAtivo();

    if (!ladoAlvo || !ladoLadrao) {
        narrar("❌ O roubo do Ladrão só pode escolher cartas que estejam no campo.");
        return true;
    }

    let acao = obterAcaoRouboLadraoNoLado(ladoAlvo);
    if (acao === "roubo-prejuizo") aplicarRouboPrejuizo(idPacoteAlvo);
    else if (acao === "roubo-beneficio") aplicarRouboBeneficio(idPacoteAlvo);
    else {
        narrar(faseLadrao === 1
            ? "❌ Escolha uma carta do time ADVERSÁRIO ao Ladrão para roubar."
            : "❌ Agora entregue o que foi roubado a uma carta do MESMO time do Ladrão.");
    }
    return true;
}

function aplicarRouboPrejuizo(idPacoteAlvo) {
    let idPuro = idPacoteAlvo.replace("pacote-", "");

    // O objeto roubado sai visualmente da vítima e vai até o Ladrão.
    // A animação é criada antes do dano para continuar visível mesmo se a vítima morrer.
    animarTransferenciaLadrao(idPuro, idLadraoRouboAtivo, tipoRouboLadrao, "roubo");
    
    if (tipoRouboLadrao === "vida") {
        let txtVida = document.getElementById("vida-" + idPuro);
        let vidaAtual = parseFloat(txtVida.innerText);
        // 🩹 CORREÇÃO: nunca deixa a vida mostrar número negativo — trava em 0.
        txtVida.innerText = Math.max(0, vidaAtual - 1);

        // 🚨 NOVO EFEITO AQUI: Coração partido caindo da carta alvo!
        mostrarEfeitoPerdaVida(idPuro);
        
        narrar("💰 Alvo surrupiado! Agora clique em uma carta SUA na arena para entregar +1 de VIDA.");
        
        if (vidaAtual - 1 <= 0) {
            let pacote = document.getElementById(idPacoteAlvo);
            let nomeExibido = pacote.querySelector(".nome-carta").innerText;
            let nomeDestaCarta = (typeof obterNomeEfetivoCarta === "function")
                ? obterNomeEfetivoCarta(idPuro, nomeExibido)
                : nomeExibido;
            let campoAlvo = pacote.closest("#campo-j2") ? "campo-j2" : "campo-j1";
            if (typeof registrarMorte === "function") registrarMorte(nomeDestaCarta, campoAlvo === "campo-j2" ? "j2" : "j1");
            pacote.remove();
            if (typeof ativarPassivasAoMorrer === "function") {
                ativarPassivasAoMorrer(
                    nomeDestaCarta,
                    idPuro,
                    campoAlvo,
                    undefined,
                    "O Barril morreu devido ao roubo!"
                );
            }
        }
    } else if (tipoRouboLadrao === "dano") {
        let txtDano = document.getElementById("dano-" + idPuro);
        let danoAtual = parseFloat(txtDano.innerText);
        txtDano.innerText = Math.max(0, danoAtual - 1); 

        // 🚨 EFEITO AQUI: A espada cai na carta que sofreu o roubo!
        mostrarEfeitoPerdaAtaque(idPuro);

        narrar("💰 Alvo surrupiado! Agora clique em uma carta SUA na arena para entregar +1 de DANO.");
    }
    
    faseLadrao = 2; 

    atualizarTodosUnidoes();
}

function aplicarRouboBeneficio(idPacoteAliado) {
    let idPuro = idPacoteAliado.replace("pacote-", "");
    let nomeCarta = document.getElementById(idPacoteAliado).querySelector(".nome-carta").innerText;

    // Na segunda etapa, o Ladrão entrega o coração ou a espada ao aliado escolhido.
    animarTransferenciaLadrao(idLadraoRouboAtivo, idPuro, tipoRouboLadrao, "entrega");
    
    if (tipoRouboLadrao === "vida") {
        let txtVida = document.getElementById("vida-" + idPuro);
        let vidaAtual = parseFloat(txtVida.innerText);
        txtVida.innerText = vidaAtual + 1;

// 🚨 EFEITO DE VIDA AQUI: Sobe 1 coração só, pois ganhou pouca vida
        setTimeout(() => {
            if (document.getElementById("pacote-" + idPuro)) mostrarEfeitoVida(idPuro, "ganhou");
        }, 590);

        narrar(`💰 Sucesso total! +1 de VIDA transferido para ${nomeCarta}. Agora você pode Atacar ou Curar!`);
    } else if (tipoRouboLadrao === "dano") {
        let txtDano = document.getElementById("dano-" + idPuro);
        let danoAtual = parseFloat(txtDano.innerText);
        txtDano.innerText = danoAtual + 1;

        // 🚨 EFEITO AQUI: Sobe a espadinha!
        setTimeout(() => {
            if (document.getElementById("pacote-" + idPuro)) mostrarEfeitoAtaque(idPuro);
        }, 590);

        narrar(`💰 Sucesso total! +1 de DANO transferido para ${nomeCarta}. Agora você pode Atacar ou Curar!`);
    }

    modoLadrao = false;
    faseLadrao = 0;
    tipoRouboLadrao = "";
    idLadraoRouboAtivo = null;

    atualizarTodosUnidoes();
}
function aplicarRouboDanoGoblin(idPacoteAlvo) {
    let pacoteClicado = document.getElementById(idPacoteAlvo);
    if (!pacoteClicado || !idGoblinLadrao) return;

    let pacoteGoblin = document.getElementById("pacote-" + idGoblinLadrao);
    if (!pacoteGoblin) {
        modoRouboGoblin = false;
        idGoblinLadrao = null;
        faseRouboGoblin = 1;
        return;
    }

    // O "lado" do Goblin decide quem é inimigo e quem é aliado nesta habilidade —
    // assim funciona certo tanto se for o SEU Goblin quanto o do oponente.
    let goblinEhJ1 = pacoteGoblin.closest("#campo-j1") !== null;
    let cliqueEhJ1 = pacoteClicado.closest("#campo-j1") !== null;
    let idPuroClicado = idPacoteAlvo.replace("pacote-", "");

    // --- FASE 1: escolher a carta INIMIGA que perde 1 de dano ---
    if (faseRouboGoblin === 1) {
        if (cliqueEhJ1 === goblinEhJ1) {
            return narrar("❌ Alvo inválido! Clique numa carta INIMIGA na arena para roubar 1 de DANO.");
        }

        let txtDanoAlvo = document.getElementById("dano-" + idPuroClicado);
        if (!txtDanoAlvo) return;
        let danoAtualAlvo = parseFloat(txtDanoAlvo.innerText);

        if (danoAtualAlvo <= 0) {
            narrar("Essa carta já tem 0 de dano! O Goblin não conseguiu roubar nada.");
            modoRouboGoblin = false;
            idGoblinLadrao = null;
            faseRouboGoblin = 1;
            if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
            return;
        }

        txtDanoAlvo.innerText = danoAtualAlvo - 1;
        mostrarEfeitoPerdaAtaque(idPuroClicado);

        faseRouboGoblin = 2; // agora espera o clique na carta aliada que vai receber
        narrar("💰 Roubou 1 de dano! Agora clique numa carta ALIADA (do time do Goblin) para entregar o ponto roubado.");
        return; // continua com modoRouboGoblin === true, esperando a 2ª escolha
    }

    // --- FASE 2: escolher a carta ALIADA (do time do Goblin) que recebe o dano roubado ---
    if (cliqueEhJ1 !== goblinEhJ1) {
        return narrar("❌ Alvo inválido! Escolha uma carta do TIME DO GOBLIN para receber o dano roubado.");
    }

    let txtDanoReceptor = document.getElementById("dano-" + idPuroClicado);
    if (txtDanoReceptor) {
        txtDanoReceptor.innerText = parseFloat(txtDanoReceptor.innerText) + 1;
        mostrarEfeitoAtaque(idPuroClicado);
    }

    narrar("💰 Roubo concluído! O ponto de dano foi entregue à carta escolhida!");

    modoRouboGoblin = false;
    idGoblinLadrao = null;
    faseRouboGoblin = 1;

    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
}

function usarPassivaCtrlC(idUnico, botao) {
    if (typeof cartaSilenciadaPeloEcto === "function" && cartaSilenciadaPeloEcto(idUnico)) {
        return narrar("👻 Este Ctrl perdeu a Passiva para o Ecto e não pode copiar outra carta.");
    }
    let pacote = document.getElementById("pacote-" + idUnico);
    if (!pacote) return;
    let ehAliado = pacote.classList.contains("carta-aliada");
    
    let nomeDaCartaAtual = pacote.querySelector(".nome-carta").innerText; 
    let cartaAlvo = ehAliado ? ultimaCartaOponente : ultimaCartaJogador;
    
    if (!cartaAlvo) {
        return narrar("Nenhuma carta válida foi jogada pelo oponente ainda para ser copiada!");
    }

    // A viagem no tempo pode devolver a Passiva do Ctrl. Antes da nova cópia,
    // desligamos os estados pertencentes à identidade copiada anteriormente,
    // sem remover a própria carta nem alterar os atributos que a nova cópia
    // substituirá logo abaixo.
    if (ctrlV[idUnico]) {
        limparFormaCriadorDoCtrl(idUnico);
        if (typeof window.rpgDesvincularCtrlDeFamiliaEspecial === "function") {
            window.rpgDesvincularCtrlDeFamiliaEspecial(idUnico);
        }
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
        if (typeof orkBuffado !== "undefined") delete orkBuffado[idUnico];
        if (typeof cavaleiroAtivado !== "undefined") delete cavaleiroAtivado[idUnico];
        if (typeof window.mensageirosEmArea !== "undefined") delete window.mensageirosEmArea[idUnico];
        if (typeof sincronizarVisuaisIncendiario === "function") sincronizarVisuaisIncendiario();
    }
    
    let copiandoSlime = cartaAlvo.nome === "Slime";
    let copiandoSeteNegativo = cartaAlvo.nome === "7 Negativo";
    // Ao copiar qualquer forma do Slime, o Ctrl usa como base o Slime grande
    // (10/1) e mantém sua redução normal de 1 ponto: a família começa em 9/1.
    let novaVida = copiandoSlime ? 9 : Math.max(1, cartaAlvo.vida - 1);
    let novoDano = copiandoSlime ? 1 : copiandoSeteNegativo ? 0 : Math.max(1, cartaAlvo.dano - 1);
    
    document.getElementById("vida-" + idUnico).innerText = novaVida;
    document.getElementById("dano-" + idUnico).innerText = novoDano;
    
    ctrlV[idUnico] = {
        nomeOriginal: cartaAlvo.nome,
        ehAliado: ehAliado,
        vidaMaximaCopia: novaVida
    };

    if (copiandoSlime && typeof window.rpgRegistrarCtrlComoSlime === "function") {
        window.rpgRegistrarCtrlComoSlime(idUnico, ehAliado);
    }
    if (cartaAlvo.nome === "Esqueleto" && typeof window.rpgRegistrarCtrlComoEsqueleto === "function") {
        window.rpgRegistrarCtrlComoEsqueleto(idUnico, ehAliado);
    }
    if (cartaAlvo.nome === "Zumbi" && typeof window.rpgRegistrarZumbi === "function") {
        window.rpgRegistrarZumbi(idUnico, ehAliado);
    }
    if (cartaAlvo.nome === "Aicer" && typeof window.rpgRegistrarAicer === "function") {
        window.rpgRegistrarAicer(idUnico, ehAliado);
    }
    if (cartaAlvo.nome === "Ecto" && typeof window.rpgRegistrarEcto === "function") {
        window.rpgRegistrarEcto(idUnico, ehAliado);
    }
    if ((cartaAlvo.nome === "Fraguer" || cartaAlvo.nome === "Fraguer Fundido")
        && typeof window.rpgRegistrarFraguer === "function") {
        window.rpgRegistrarFraguer(idUnico, ehAliado, cartaAlvo.nome === "Fraguer Fundido");
    }
    if (cartaAlvo.nome === "Spiritista" && typeof window.rpgRegistrarSpiritista === "function") {
        window.rpgRegistrarSpiritista(idUnico, ehAliado);
    }
    if (copiandoSeteNegativo && typeof window.rpgRegistrarSeteNegativo === "function") {
        window.rpgRegistrarSeteNegativo(idUnico, ehAliado);
    }

    if (typeof animarMetamorfoseCtrl === "function") {
        animarMetamorfoseCtrl(idUnico, cartaAlvo.nome, ehAliado);
    }
    
    narrar(copiandoSlime
        ? `📋 Cópia concluída! O ${nomeDaCartaAtual} ganhou a passiva do Slime e iniciou uma nova família com 9 de vida e 1 de dano.`
        : `📋 Cópia concluída! Seu ${nomeDaCartaAtual} copiou [${cartaAlvo.nome}] com atributos reduzidos em 1.`);
    // Passivas de entrada/ciclo precisam ser ligadas no momento da cópia, pois o Ctrl já
    // estava no campo quando ganhou a nova identidade.
    if (cartaAlvo.nome === "Necromante") {
        narrar(`✨ PASSIVA COPIADA! O ${nomeDaCartaAtual} forçou a magia do Necromante e invocou 2 tropas da sua mão!`);
        verificarPassivaNecromante({nome: "Necromante", passivaAtivada: false}, ehAliado);
    }
    if (cartaAlvo.nome === "Cavalo de Tróia") {
        cavalosDeTroiaAtivos[idUnico] = 4;
        narrar(`🐴 PASSIVA COPIADA! O ${nomeDaCartaAtual} vai se abrir em 2 rodadas e causar 1 de dano em todas as cartas inimigas.`);
    }
    if (cartaAlvo.nome === "Portable") {
        portableDuracao[idUnico] = 4;
        narrar(`🛸 PASSIVA COPIADA! Por 2 rodadas, o ${nomeDaCartaAtual} atacará junto das outras cartas do seu time.`);
    }
    if (cartaAlvo.nome === "Separado" || cartaAlvo.nome === "Separadois") {
        let lado = ehAliado ? "j1" : "j2";
        let classe = ehAliado ? "carta-aliada" : "carta-inimiga";
        let outrosAliados = Array.from(document.getElementById("campo-" + lado).getElementsByClassName(classe))
            .filter(p => p.id !== "pacote-" + idUnico);
        if (outrosAliados.length > 0) {
            modoParceriaSeparado = true;
            idSeparadoParceriaAtivo = idUnico;
            narrar(`👥 PASSIVA COPIADA! Escolha outra carta do mesmo time para formar a parceria do ${nomeDaCartaAtual}.`);
        }
    }
    
    let divAcoes = pacote.querySelector("div[id^='acoes-']");
    
    let botaoAtaque;
    if (cartaAlvo.nome === "Incendiário") {
        botaoAtaque = `<button class="btn-polvora-incendiario" onclick="iniciarAtaqueIncendiario('${idUnico}', ${!ehAliado})" style="padding: 5px; background-color: #b34700; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Jogar Pólvora 🔥</button>`;
        narrar(`🔥 PASSIVA COPIADA! O ${nomeDaCartaAtual} agora pode jogar pólvora e seguir o ciclo do Incendiário.`);
    } else {
        botaoAtaque = ehAliado ?
            `<button onclick="iniciarAtaque('${cartaAlvo.nome}', '${idUnico}')" style="padding: 5px; width: 100%; margin-bottom: 2px; cursor: pointer;">Atacar ⚔️</button>` :
            `<button onclick="inimigoAtacar('${idUnico}')" style="padding: 5px; background-color: darkred; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Atacar ⚔️</button>`;
    }
    
    // Mesmo copiando uma carta sem Especial (inclusive o Slime), o Ctrl mantém
    // o próprio Especial de rolar o dado em busca do +1 de dano.
    let btnEspecial = `<button onclick="usarHabilidade('${nomeDaCartaAtual}', '${idUnico}', this)" style="background-color: purple; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Especial 🔮</button>`;
    
    let botoesExtras = [];
    if (cartaAlvo.nome === "Curandeiro") {
        botoesExtras.push(ehAliado ?
            `<button onclick="iniciarCura('${idUnico}')" style="background-color: green; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Curar 💚</button>` : 
            `<button onclick="iniciarCuraInimigo('${idUnico}')" style="background-color: green; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Curar Oponente 💚</button>`);
    }
    if (cartaAlvo.nome === "Ladrão") {
        botoesExtras.push(`<button onclick="usarPassivaLadrao('${idUnico}', this)" style="background-color: gold; font-weight: bold; width: 100%; margin-bottom: 2px; cursor: pointer;">Passiva 💰</button>`);
    }
    if (cartaAlvo.nome === "Separado" || cartaAlvo.nome === "Separadois") {
        botoesExtras.push(`<button onclick="trocarParceiroSeparado('${idUnico}', ${ehAliado})" style="background-color: #16a085; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Trocar Parceiro 👥</button>`);
    }
    if (cartaAlvo.nome === "Viajante do Tempo") {
        botoesExtras.push(`<button onclick="usarPassivaViajante('${idUnico}', this)" style="background-color: #8e44ad; color: white; width: 100%; margin-bottom: 2px; cursor: pointer;">Viajar no Tempo ⏳</button>`);
    }

    divAcoes.innerHTML = `
        ${botaoAtaque}
        ${btnEspecial}
        ${botoesExtras.join("")}
    `;

    // 🩹 CORREÇÃO: faltava recalcular o bônus do Unidão na hora — sem isso, um Ctrl C que
    // acabou de copiar o Unidão ficava com o dano errado até alguma OUTRA ação disparar
    // atualizarTodosUnidoes() por conta própria.
    if (typeof atualizarTodosUnidoes === "function") atualizarTodosUnidoes();
}
