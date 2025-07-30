// Este arquivo contém toda a lógica do jogo de damas, incluindo as regras
// e a comunicação em tempo real com o servidor via Socket.IO.

document.addEventListener('DOMContentLoaded', () => {

    // --- CONSTANTES E ESTADO GLOBAL ---
    const API_BASE_URL = 'https://lula-coin-backend.onrender.com'; // URL do seu servidor backend.

    // --- CONEXÃO COM O SERVIDOR SOCKET.IO ---
    const socket = io(API_BASE_URL);

    // --- SELEÇÃO DOS ELEMENTOS DO DOM ---
    // Seleciona todos os elementos da interface que vamos manipular.
    const boardElement = document.getElementById('board');
    const gameStatus = document.getElementById('game-status');
    const turnIndicator = document.getElementById('turn-indicator');
    const playerNameDisplay = document.getElementById('player-name');
    const opponentNameDisplay = document.getElementById('opponent-name');
    const gameOverModal = document.getElementById('game-over-modal');
    const backToMainBtn = document.getElementById('back-to-main-btn');
    const opponentDisconnectedModal = document.getElementById('opponent-disconnected-modal');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const forfeitBtn = document.getElementById('forfeit-btn');

    // --- ESTADO DO JOGO ---
    // Variáveis para guardar o estado do jogo no cliente (navegador).
    let boardState = null;      // O array 8x8 que representa o tabuleiro.
    let playerColor = null;     // 'red' ou 'black'. Definido pelo servidor.
    let currentPlayer = null;   // A cor do jogador que tem a vez.
    let selectedPiece = null;   // Objeto com dados da peça selecionada { row, col, element }.
    let validMoves = [];        // Um array com os movimentos válidos para a peça selecionada.
    
    // Pega o ID do jogo da URL e o token de autenticação.
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('gameId');
    const token = localStorage.getItem('token');

    // --- COMUNICAÇÃO COM O SERVIDOR VIA SOCKET.IO ---

    // Se não tiver gameId ou token, volta para o jogo principal.
    if (!gameId || !token) {
        alert("Erro: Jogo ou sessão inválida.");
        window.location.href = '/';
        return;
    }

    // EMITIR 'joinGame': Envia ao servidor o ID do jogo e o token para entrar na sala.
    socket.emit('joinGame', { gameId, token });

    // OUVIR 'connect': Confirma que a conexão foi estabelecida.
    socket.on('connect', () => console.log('Conectado ao servidor com ID:', socket.id));

    // OUVIR 'error': Recebe mensagens de erro do servidor.
    socket.on('error', (message) => {
        alert(`Erro do servidor: ${message}`);
        window.location.href = '/';
    });

    // OUVIR 'opponentJoined': Recebe o nome do oponente quando ele entra na sala.
    socket.on('opponentJoined', (opponentName) => {
        opponentNameDisplay.textContent = opponentName;
        gameStatus.textContent = "Oponente conectado! O jogo vai começar.";
    });

    // OUVIR 'gameUpdate': Evento principal que sincroniza o estado do jogo.
    socket.on('gameUpdate', (gameState) => {
        boardState = gameState.board;
        currentPlayer = gameState.currentPlayer;
        // Define a cor do jogador local ('red' ou 'black') com base na informação do servidor.
        playerColor = gameState.players.find(p => p.socketId === socket.id)?.color || playerColor;
        
        renderBoard(); // Redesenha o tabuleiro.
        renderPieces(); // Redesenha as peças.
        updatePlayerInfo(gameState.players); // Atualiza os nomes na tela.
        updateTurnIndicator(); // Atualiza o indicador de turno.
    });

    // OUVIR 'moveMade': Uma otimização para quando uma jogada acontece. Apenas atualiza o essencial.
    socket.on('moveMade', (newState) => {
        boardState = newState.board;
        currentPlayer = newState.currentPlayer;
        renderPieces(); // Apenas redesenha as peças, que é mais rápido.
        updateTurnIndicator();
    });

    // OUVIR 'gameOver': O servidor declara o fim do jogo.
    socket.on('gameOver', ({ winner, message, lcoReward }) => {
        document.getElementById('game-over-title').textContent = winner === playerColor ? "Você Venceu!" : "Você Perdeu!";
        document.getElementById('game-over-message').textContent = message;
        document.getElementById('lco-reward-message').textContent = `Você ganhou ${lcoReward} LCO!`;
        gameOverModal.style.display = 'flex';
    });

    // OUVIR 'opponentDisconnected': Lida com a desconexão do oponente.
    socket.on('opponentDisconnected', () => {
        opponentDisconnectedModal.style.display = 'flex';
        // Redireciona o jogador de volta após 3 segundos.
        setTimeout(() => { window.location.href = '/'; }, 3000);
    });

    // OUVIR 'chatMessage': Recebe uma mensagem de chat e a exibe na tela.
    socket.on('chatMessage', ({ sender, message }) => {
        const messageElement = document.createElement('p');
        messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Rola para a mensagem mais recente.
    });

    // --- LÓGICA DO JOGO DE DAMAS (REGRAS E MOVIMENTOS) ---

    // Função que calcula todos os movimentos válidos para uma peça.
    function getValidMoves(row, col, pieceColor, isKing) {
        const moves = [];
        const moveDir = (pieceColor === 'red') ? -1 : 1; // Vermelho sobe (-1), Preto desce (+1).
        const directions = isKing ? [-1, 1] : [moveDir]; // Dama (king) pode se mover em ambas as direções.

        // Itera sobre as direções possíveis.
        for (const dir of directions) {
            for (const side of [-1, 1]) { // Checa para a esquerda (-1) e direita (+1).
                const stepRow = row + dir;
                const stepCol = col + side;
                // Movimento simples (sem captura).
                if (boardState[stepRow]?.[stepCol] === null) {
                    moves.push({ row: stepRow, col: stepCol, isCapture: false });
                }
                // Movimento de captura.
                else if (boardState[stepRow]?.[stepCol] && boardState[stepRow][stepCol].color !== pieceColor) {
                    const jumpRow = row + dir * 2;
                    const jumpCol = col + side * 2;
                    if (boardState[jumpRow]?.[jumpCol] === null) {
                        moves.push({ row: jumpRow, col: jumpCol, isCapture: true, captured: { row: stepRow, col: stepCol } });
                    }
                }
            }
        }
        return moves;
    }

    // --- RENDERIZAÇÃO E INTERAÇÃO COM A INTERFACE ---

    // Desenha as casas do tabuleiro.
    function renderBoard() {
        boardElement.innerHTML = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = document.createElement('div');
                square.classList.add('square', (r + c) % 2 === 0 ? 'light' : 'dark');
                square.dataset.row = r;
                square.dataset.col = c;
                // Adiciona um listener para cliques em casas escuras (onde os movimentos acontecem).
                if ((r + c) % 2 !== 0) {
                    square.addEventListener('click', onValidMoveClick);
                }
                boardElement.appendChild(square);
            }
        }
    }

    // Desenha as peças no tabuleiro com base no 'boardState'.
    function renderPieces() {
        document.querySelectorAll('.piece').forEach(p => p.remove());
        if (!boardState) return;
        boardState.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell) {
                    const piece = document.createElement('div');
                    piece.classList.add('piece', cell.color);
                    if (cell.isKing) piece.classList.add('king');
                    if (cell.color === playerColor && currentPlayer === playerColor) {
                        piece.addEventListener('click', onPieceClick);
                    }
                    boardElement.children[r * 8 + c].appendChild(piece);
                }
            });
        });
    }
    
    // Função chamada quando uma peça é clicada.
    function onPieceClick(event) {
        event.stopPropagation(); // Impede que o clique "vaze" para a casa atrás da peça.
        clearHighlights();

        const piece = event.currentTarget;
        const square = piece.parentElement;
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const pieceData = boardState[row][col];

        selectedPiece = { row, col, element: piece };
        piece.classList.add('selected');

        validMoves = getValidMoves(row, col, pieceData.color, pieceData.isKing);
        highlightValidMoves();
    }
    
    // Função chamada quando uma casa válida (destacada) é clicada.
    function onValidMoveClick(event) {
        if (!selectedPiece) return; // Só funciona se uma peça estiver selecionada.

        const square = event.currentTarget;
        if (square.classList.contains('valid-move')) {
            const toRow = parseInt(square.dataset.row);
            const toCol = parseInt(square.dataset.col);

            // EMITIR 'makeMove': Envia a jogada para o servidor.
            socket.emit('makeMove', {
                gameId,
                from: { row: selectedPiece.row, col: selectedPiece.col },
                to: { row: toRow, col: toCol }
            });

            clearHighlights();
        }
    }

    // Destaca as casas no tabuleiro onde a peça pode se mover.
    function highlightValidMoves() {
        validMoves.forEach(move => {
            const square = boardElement.children[move.row * 8 + move.col];
            square.classList.add('valid-move');
        });
    }

    // Limpa todos os destaques de seleção e movimentos.
    function clearHighlights() {
        document.querySelectorAll('.piece.selected').forEach(p => p.classList.remove('selected'));
        document.querySelectorAll('.square.valid-move').forEach(s => s.classList.remove('valid-move'));
        selectedPiece = null;
        validMoves = [];
    }

    // Atualiza o indicador de turno na tela.
    function updateTurnIndicator() {
        turnIndicator.style.display = 'block';
        if (currentPlayer === playerColor) {
            turnIndicator.textContent = 'É a sua vez!';
            turnIndicator.style.backgroundColor = 'rgba(76, 175, 80, 0.8)'; // Verde
        } else {
            turnIndicator.textContent = 'Aguardando oponente...';
            turnIndicator.style.backgroundColor = 'rgba(244, 67, 54, 0.8)'; // Vermelho
        }
    }

    // Atualiza os nomes dos jogadores na tela.
    function updatePlayerInfo(players) {
        const me = players.find(p => p.color === playerColor);
        const opponent = players.find(p => p.color !== playerColor);
        if (me) playerNameDisplay.textContent = `${me.username} (Você)`;
        if (opponent) opponentNameDisplay.textContent = opponent.username;
    }

    // Lida com o envio de mensagens de chat.
    function sendChatMessage() {
        const message = chatInput.value;
        if (message.trim()) {
            // EMITIR 'chatMessage': Envia a mensagem para o servidor.
            socket.emit('chatMessage', { gameId, message });
            chatInput.value = '';
        }
    }

    // --- EVENT LISTENERS DA INTERFACE ---
    sendChatBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    forfeitBtn.addEventListener('click', () => {
        if (confirm("Você tem certeza que quer desistir da partida?")) {
            // EMITIR 'forfeit': Informa ao servidor que o jogador desistiu.
            socket.emit('forfeit', { gameId });
        }
    });

    backToMainBtn.addEventListener('click', () => {
        window.location.href = '/';
    });

});
