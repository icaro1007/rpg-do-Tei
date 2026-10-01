// Todos os desenhos e este próprio arquivo ficam dentro de rpg-cards/fotos.
// Os demais arquivos podem continuar usando somente o nome da imagem: este
// resolvedor acrescenta a pasta uma única vez e preserva URLs já completas.
window.RPG_PASTA_IMAGENS = "fotos/";
window.caminhoImagemRpg = function (arquivo) {
    let caminho = String(arquivo || "").replace(/\\/g, "/");
    if (!caminho) return "";
    if (/^(?:data:|blob:|https?:\/\/|\/|\.\/fotos\/|fotos\/)/i.test(caminho)) return caminho;
    return window.RPG_PASTA_IMAGENS + caminho.replace(/^\.\//, "");
};

const bancoDeCartas = [
            // --- CARTAS DO LOTE 1 ---
            { id: "guerreiro", nome: "Guerreiro", vida: 5, dano: 1, img: "guerreiro.png", qtd: 4 },
            { id: "barbaro", nome: "Bárbaro", vida: 4, dano: 2, img: "barbaro.png", qtd: 3 },
            { id: "goblin", nome: "Goblin", vida: 4, dano: 2, img: "goblin.png", qtd: 3 },
            { id: "ladrao", nome: "Ladrão", vida: 5, dano: 0, img: "ladrão.png", qtd: 2 },
            { id: "necromante", nome: "Necromante", vida: 5, dano: 1, img: "necromante.png", qtd: 2 },
            { id: "ork", nome: "Ork", vida: 3, dano: 3, img: "ork.png", qtd: 2 },
            { id: "triogoblin", nome: "Trio de Goblin", vida: 6, dano: 2, img: "trio de goblin.png", qtd: 2 },
            { id: "unidao", nome: "Unidão", vida: 4, dano: 1, img: "unidão.png", qtd: 2 },
            { id: "cavaleiro", nome: "Cavaleiro das Trevas", vida: 4, dano: 2, img: "cavaleiro das trevas.png", qtd: 2 },
            { id: "curandeiro", nome: "Curandeiro", vida: 4, dano: 0, img: "curandeiro.png", qtd: 2 },
            { id: "ctrlc", nome: "Ctrl C", vida: 1, dano: 1, img: "ctrl c.png", qtd: 1 },
            { id: "ctrlv", nome: "Ctrl V", vida: 1, dano: 1, img: "ctrl v.png", qtd: 1 },

            // --- CARTAS DO LOTE 2 ---
            { id: "arqueiro", nome: "Arqueiro", vida: 3, dano: 2, img: "arqueiro.png", qtd: 3 },
            { id: "bruxo", nome: "Bruxo", vida: 4, dano: 0, img: "bruxo.png", qtd: 4 }, 
            { id: "barril", nome: "Barril", vida: 5, dano: 0, img: "barril.png", qtd: 3 },
            { id: "barrilbarbaro", nome: "Barril de Bárbaro", vida: 2, dano: 2, img: "barril de barbaro.png", qtd: 2 },
            { id: "barrilgoblin", nome: "Barril de Goblin", vida: 3, dano: 0.75, img: "barril de goblin.png", qtd: 2 },
            { id: "besta", nome: "Besta", vida: 0, dano: 0, img: "besta.png", qtd: 2 },
            { id: "velux", nome: "Velux", vida: 0, dano: 0, img: "velux.png", qtd: 2 }, 
            { id: "adiv", nome: "Adiv", vida: 0, dano: 0, img: "adiv.png", qtd: 2 }, 
            { id: "recuperida", nome: "Recuperida", vida: 0, dano: 0, img: "recuperida.png", qtd: 2 }, 
            { id: "pocaotraicao", nome: "Poção da Traição", vida: 0, dano: 0, img: "poção da traição.png", qtd: 2 },
            
            // --- CARTAS DO LOTE 3 ---
            { id: "pocaogelo", nome: "Poção de Gelo", vida: 0, dano: 0, img: "poção de gelo.png", qtd: 2 },
            { id: "Bumerskeleton", nome: "Bumerskeleton", vida: 3, dano: 1, img: "bumerskeleton.png", qtd: 2 }, 
            { id: "mensageiro", nome: "Mensageiro", vida: 2, dano: 3, img: "mensageiro.png", qtd: 2 },
            { id: "cavalotroia", nome: "Cavalo de Tróia", vida: 1, dano: 0, img: "cavalo de troia.png", qtd: 2 }, 
            { id: "criador", nome: "Criador", vida: 2, dano: 2, img: "criador.png", qtd: 2 },
            { id: "escudo_item", nome: "Escudo", vida: 0, dano: 0, img: "escudo.png", qtd: 2 },
            { id: "fogueira", nome: "Fogueira", vida: 0, dano: 0, img: "fogueira.png", qtd: 2 },
            { id: "separado", nome: "Separado", vida: 3, dano: 2, img: "separado.png", qtd: 1 },
            { id: "separado2", nome: "Separadois", vida: 3, dano: 2, img: "separado 2.png", qtd: 1 }, 
            { id: "viajante", nome: "Viajante do Tempo", vida: 4, dano: 1, img: "viajante do tempo.png", qtd: 2 },
            { id: "incendiario", nome: "Incendiário", vida: 4, dano: 2, img: "incendiário.png", qtd: 3 },

            // --- CARTAS DO LOTE 4 ---
            { id: "vampi7", nome: "Vampi7", vida: 0, dano: 0, img: "Vampi7.png", qtd: 2 },
            { id: "portable", nome: "Portable", vida: 2, dano: 1, img: "portable.png", qtd: 2 },
            { id: "plus_life", nome: "Plus Life", vida: 0, dano: 0, img: "plus_life.png", qtd: 2 },
            { id: "reviverta", nome: "Reviverta", vida: 0, dano: 0, img: "reviverta.png", qtd: 2 },
            { id: "cracker", nome: "Cracker", vida: 0, dano: 0, img: "cracker.png", qtd: 2 },
            { id: "allsforms", nome: "Allsforms", vida: 0, dano: 0, img: "allsforms.png", qtd: 2 },
            { id: "dupliquetion", nome: "Dupliquetion", vida: 0, dano: 0, img: "dupliquetion.png", qtd: 2 },
            { id: "auvex", nome: "Auvex", vida: 0, dano: 0, img: "auvex.png", qtd: 2 },
            { id: "mago", nome: "Mago", vida: 3, dano: 2, img: "mago.png", qtd: 4 },
            { id: "triobarbaros", nome: "Trio de Bárbaros", vida: 9, dano: 3, img: "trio de barbaro.png", qtd: 2 }
        ];

// Menu, loja, batalha e cópias passam a receber o endereço correto sem que
// cada uso individual precise conhecer a organização das pastas.
bancoDeCartas.forEach(carta => {
    carta.img = window.caminhoImagemRpg(carta.img);
});
