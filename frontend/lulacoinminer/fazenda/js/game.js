// DENTRO DE: /fazenda/js/game.js

// ... (constantes e estado da fazenda) ...

const apiRequest = async (endpoint, method = 'GET', body = null) => {
    const token = localStorage.getItem('token');
    if (!token) { 
        alert("Sessão inválida. Por favor, faça o login novamente.");
        // CORREÇÃO: Usa o caminho absoluto para o login.
        window.location.href = '/login.html'; 
        return null; 
    }
    // ... (resto da função) ...
};

// ... (funções do jogo da fazenda) ...

// Na função de clique
window.addEventListener('click', async (event) => { 
    // ...
    const intersectsCasa = raycaster.intersectObjects(objetosClicaveis);
    if (intersectsCasa.length > 0) {
      // ...
      mostrarModalConfirmacao("Deseja voltar para a sala de mineração?", () => {
          // CORREÇÃO: Usa a raiz do site para voltar.
          window.location.href = '/';
      });
      return;
    }
    // ...
});

// Ponto de entrada do script
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('token')) {
        alert("Você precisa estar logado para jogar! Redirecionando...");
        // CORREÇÃO: Usa o caminho absoluto para o login.
        window.location.href = '/login.html';
        return;
    }
    loadInitialState();
    animate();
});
