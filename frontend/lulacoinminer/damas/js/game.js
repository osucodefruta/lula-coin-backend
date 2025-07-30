// Este arquivo contém toda a lógica do jogo de damas, incluindo as regras
// e a comunicação em tempo real com o servidor via Socket.IO.

document.addEventListener('DOMContentLoaded', () => {

    // --- CONSTANTES E ESTADO GLOBAL ---
    const API_BASE_URL = 'https://lula-coin-backend.onrender.com'; // URL do seu servidor backend.

    // --- CONEXÃO COM O SERVIDOR SOCKET.IO ---
    // Estabelece a conexão em tempo real com o servidor.
    // 'io()' é uma função da biblioteca Socket.IO que importamos no HTML.
    const socket = io(API_BASE_URL);

    // Seleciona todos os elementos da interface que vamos manipular.
    const boardElement = document.getElementById('board');
    // ... (todas as outras seleções de elementos: status, chat, modais, etc.)

    // Variáveis para guardar o estado do jogo no cliente (navegador).
    let boardState = null;      // O array 8x8 que representa o tabuleiro.
    let playerColor = null;     // 'red' ou 'black'. Definido pelo servidor.
    let currentPlayer = null;   // A cor do jogador que tem a vez.
    let selectedPiece = null;   // O elemento da peça que o jogador selecionou.
    let validMoves = [];        // Um array com os movimentos válidos para a peça selecionada.
    
    // Pega o ID do jogo da URL (ex: /damas/index.html?gameId=XYZ)
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('gameId');
    const token = localStorage.getItem('token');


    // --- COMUNICAÇÃO COM O SERVIDOR VIA SOCKET.IO ---
    
    // 1. EVENTOS EMITIDOS PELO CLIENTE (Ações do Jogador -> Servidor)

    // Se não tiver gameId ou token, volta para o jogo principal.
    if (!gameId || !token) {
        alert("Erro: Jogo ou sessão inválida.");
        window.location.href = '../index.html';
        return;
    }

    // EMITIR 'joinGame': Assim que a página carrega, o cliente se identifica para o servidor,
    // informando em qual sala de jogo quer entrar e quem ele é (através do token).
    socket.emit('joinGame', { gameId, token });

    // 2. EVENTOS RECEBIDOS DO SERVIDOR (Servidor -> Atualizações para o Jogador)

    // OUVIR 'connect': Evento padrão do Socket.IO que confirma que a conexão foi estabelecida.
    socket.on('connect', () => {
        console.log('Conectado ao servidor com ID de socket:', socket.id);
    });

    // OUVIR 'error': Recebe mensagens de erro do servidor.
    socket.on('error', (message) => {
        alert(`Erro do servidor: ${message}`);
        window.location.href = '../index.html';
    });

    // OUVIR 'gameUpdate': Evento mais importante. O servidor envia o estado completo do jogo.
    // Isso acontece quando o jogo começa, ou após cada jogada.
    socket.on('gameUpdate', (gameState) => {
        // Atualiza as variáveis locais com os dados recebidos.
        boardState = gameState.board;
        currentPlayer = gameState.currentPlayer;
        playerColor = gameState.playerColor === 'player1' ? 'red' : 'black';

        // Atualiza a interface visual para refletir o novo estado do jogo.
        renderBoard();
        renderPieces();
        updatePlayerInfo(gameState);
        updateTurnIndicator();
    });

    // OUVIR 'moveMade': O servidor informa que uma jogada foi feita. Apenas atualiza o tabuleiro.
    socket.on('moveMade', (newState) => {
        boardState = newState.board;
        currentPlayer = newState.currentPlayer;
        renderBoard();
        renderPieces();
        updateTurnIndicator();
    });

    // OUVIR 'gameOver': O servidor declara o fim do jogo.
    socket.on('gameOver', ({ winner, message, lcoReward }) => {
        // Mostra o modal de fim de jogo com a mensagem de vitória/derrota.
        document.getElementById('game-over-title').textContent = winner === playerColor ? "Você Venceu!" : "Você Perdeu!";
        document.getElementById('game-over-message').textContent = message;
        document.getElementById('lco-reward-message').textContent = `Você ganhou ${lcoReward} LCO!`;
        document.getElementById('game-over-modal').style.display = 'flex';
    });
    
    // ... (outros listeners como 'chatMessage', 'opponentDisconnected', etc.)

    // --- LÓGICA DO JOGO DE DAMAS ---

    // Função para renderizar o tabuleiro (as casas claras e escuras).
    function renderBoard() {
        boardElement.innerHTML = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = document.createElement('div');
                square.classList.add('square', (r + c) % 2 === 0 ? 'light' : 'dark');
                square.dataset.row = r;
                square.dataset.col = c;
                boardElement.appendChild(square);
            }
        }
    }

    // Função para renderizar as peças sobre o tabuleiro.
    function renderPieces() {
        // Primeiro, remove todas as peças antigas.
        document.querySelectorAll('.piece').forEach(p => p.remove());
        // Depois, cria as peças novas com base no 'boardState'.
        boardState.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell) { // Se a célula não for nula, existe uma peça.
                    const piece = document.createElement('div');
                    piece.classList.add('piece', cell.color);
                    if (cell.isKing) piece.classList.add('king');
                    
                    // Adiciona o evento de clique APENAS se a peça for do jogador da vez.
                    if (cell.color === playerColor && currentPlayer === playerColor) {
                        piece.addEventListener('click', onPieceClick);
                    }
                    
                    const square = boardElement.children[r * 8 + c];
                    square.appendChild(piece);
                }
            });
        });
    }

    // Função chamada quando o jogador clica em uma de suas peças.
    function onPieceClick(event) {
        // ... (lógica para selecionar a peça, remover destaques antigos, etc.) ...

        // Calcula os movimentos válidos para a peça clicada.
        validMoves = getValidMoves(row, col, pieceData.color, pieceData.isKing);
        // Destaca as casas no tabuleiro onde a peça pode se mover.
        highlightValidMoves();
    }
    
    // Função chamada quando o jogador clica em uma casa válida para mover a peça.
    function onValidMoveClick(event) {
        const targetRow = parseInt(event.currentTarget.dataset.row);
        const targetCol = parseInt(event.currentTarget.dataset.col);

        // EMITIR 'makeMove': Envia a jogada para o servidor para validação e processamento.
        socket.emit('makeMove', {
            gameId,
            from: { row: selectedPiece.row, col: selectedPiece.col },
            to: { row: targetRow, col: targetCol }
        });

        // Limpa a seleção e os destaques após a jogada ser enviada.
        clearHighlights();
    }

    // Função que contém as regras para calcular os movimentos possíveis.
    function getValidMoves(row, col, color, isKing) {
        // ... (lógica complexa que verifica diagonais, saltos sobre oponentes, etc.)
        // Retorna um array de objetos, ex: [{row: 4, col: 3, isCapture: true}, ...]
    }

    // --- FUNÇÕES DE INTERFACE (UI) ---

    function updateTurnIndicator() {
        // Mostra ou esconde o indicador "É a sua vez!".
    }
    
    function updatePlayerInfo(gameState) {
        // Atualiza os nomes e peças capturadas.
    }

    function clearHighlights() {
        // Remove todos os destaques de seleção e movimentos válidos.
    }

    // ... (outras funções de UI, chat, etc.) ...
    
    // --- PONTO DE ENTRADA ---
    // A lógica começa aqui, mas a maior parte da inicialização acontece quando
    // o servidor envia o primeiro 'gameUpdate'.
});
