// DENTRO DE: /js/game.js

// Proteção: Se não houver token, redireciona para a página de login.
if (!localStorage.getItem('token')) {
    // CORREÇÃO: Usa o caminho absoluto para o login.
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // ... (constantes, estado do jogo, elementos do DOM) ...

    const apiRequest = async (endpoint, method = 'GET', body = null) => {
        // ... (código do apiRequest sem alterações) ...
    };

    const handleLogout = (force = false) => {
        // ... (lógica de logout) ...
        localStorage.removeItem('token');
        gameState = null;
        
        // CORREÇÃO: Redireciona para o caminho absoluto do login.
        window.location.href = '/login.html';
    };

    // ... (funções do jogo principal) ...

    async function checkMatchmakingStatus() {
        const statusResponse = await apiRequest('/api/damas/matchmaking/status');
        if (statusResponse && statusResponse.matchFound) {
            clearInterval(matchmakingInterval);
            damasMatchmakingStatus.textContent = 'Partida encontrada! Redirecionando...';
            // CORREÇÃO: Aponta para a PASTA /damas/ a partir da raiz.
            window.location.href = `/damas/?gameId=${statusResponse.gameId}`;
        }
    }
    
    // ... (resto do arquivo) ...

    // NO FINAL DO ARQUIVO, DENTRO DOS EVENT LISTENERS:
    goToFarmBtn.addEventListener('click', () => {
        // CORREÇÃO: Aponta para a PASTA /fazenda/ a partir da raiz.
        window.location.href = '/fazenda/';
    });
    
    // ... (resto dos event listeners) ...

    // O initializeGame deve ser chamado DENTRO do DOMContentLoaded
    initializeGame();
});
