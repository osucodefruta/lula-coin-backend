// frontend/js/utils.js (ou frontend/utils.js)

// Função para exibir mensagens na tela (overlay)
function showOverlayMessage(message, type = 'info') {
    const overlay = document.getElementById('overlay-message');
    const text = document.getElementById('overlay-message-text');
    if (!overlay || !text) {
        console.error("Elementos 'overlay-message' ou 'overlay-message-text' não encontrados no DOM.");
        return;
    }

    text.textContent = message;
    overlay.className = 'overlay-message ' + type; // Adiciona classe 'info', 'success', 'error'
    overlay.style.display = 'flex';

    setTimeout(() => {
        overlay.style.display = 'none';
        overlay.className = 'overlay-message'; // Remove a classe de tipo
    }, 3000); // Mensagem some após 3 segundos
}

// Funções de utilidade para Cookies (mantidas caso sejam usadas)
// Embora seja preferível usar localStorage para tokens JWT,
// estas funções são incluídas caso o código as utilize em outros contextos.
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function deleteCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999;';
}
