// auth.js

// Definindo a URL base da sua API do backend no Render
// ESTA URL É CRÍTICA! Certifique-se de que está exata.
const API_BASE_URL = 'https://lula-coin-backend.onrender.com';

// Função para exibir mensagens na UI (assumindo que há um overlay de mensagem no index.htm)
// Esta função é vital para dar feedback ao usuário sobre o que está acontecendo.
function showOverlayMessage(message, type) {
    const overlayMessage = document.getElementById('overlay-message');
    const overlayMessageText = document.getElementById('overlay-message-text');
    const overlayMessageOkButton = document.getElementById('overlay-message-ok-button');

    if (overlayMessage && overlayMessageText && overlayMessageOkButton) {
        overlayMessageText.textContent = message;
        overlayMessage.style.display = 'flex'; // Mostra o overlay

        // Define a cor de fundo do overlay com base no tipo de mensagem
        if (type === 'error') {
            overlayMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        } else if (type === 'success') {
            overlayMessage.style.backgroundColor = 'rgba(0, 128, 0, 0.7)';
        } else {
            overlayMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // Padrão
        }

        // Oculta o overlay ao clicar no botão OK
        overlayMessageOkButton.onclick = () => {
            overlayMessage.style.display = 'none';
        };
    } else {
        console.warn('showOverlayMessage: Elementos do overlay de mensagem não encontrados. Mensagem:', message);
        alert(message); // Fallback para alert se os elementos não existirem
    }
}

// Função auxiliar para definir cookies (usada para armazenar o token e username)
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax"; // SameSite=Lax é recomendado para segurança
}

// Função auxiliar para obter cookies
function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Função auxiliar para apagar cookies
function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}


// Função para registrar um novo usuário
async function registrarUsuario(username, password) {
    try {
        console.log(`[AUTH] Tentando registrar: ${username} na URL: ${API_BASE_URL}/api/auth/register`);
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro desconhecido ao registrar usuário.');
        }

        const data = await response.json();
        console.log(`[AUTH] Registro bem-sucedido para ${username}:`, data);
        showOverlayMessage(data.message || 'Registro realizado com sucesso! Agora você pode fazer login.', 'success');
        return data;
    } catch (error) {
        console.error('[AUTH] Erro no registro:', error);
        showOverlayMessage(error.message || 'Não foi possível registrar a conta. Verifique os dados e tente novamente.', 'error');
        throw error;
    }
}

// Função para fazer login
async function loginUsuario(username, password) {
    try {
        console.log(`[AUTH] Tentando login: ${username} na URL: ${API_BASE_URL}/api/auth/login`);
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro desconhecido ao fazer login.');
        }

        const data = await response.json();
        console.log(`[AUTH] Login bem-sucedido para ${username}:`, data);
        return data;
    } catch (error) {
        console.error('[AUTH] Erro no login:', error);
        showOverlayMessage(error.message || 'Não foi possível fazer login. Verifique seu nome de usuário e senha.', 'error');
        throw error;
    }
}

// Lógica para lidar com os formulários e transição de tela
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const registerUsernameInput = document.getElementById('register-username');
    const registerPasswordInput = document.getElementById('register-password');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const authScreen = document.getElementById('auth-screen');
    const gameScreen = document.getElementById('game-screen');

    // Event listener para o formulário de login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginUsernameInput.value;
            const password = loginPasswordInput.value;

            try {
                const data = await loginUsuario(username, password);
                if (data && data.token) {
                    setCookie('userToken', data.token, 7); // Salva o token por 7 dias
                    setCookie('username', data.username, 7); // Salva o username
                    
                    // Se o login for bem-sucedido, tenta carregar os dados do jogo
                    if (typeof loadUserData === 'function') { // Verifica se loadUserData existe em game.js
                        loadUserData(); // Esta função transicionará para a tela do jogo
                    } else {
                        // Fallback se loadUserData não estiver disponível
                        authScreen.style.display = 'none';
                        gameScreen.style.display = 'flex'; // ou 'block'
                        console.warn('Função loadUserData não encontrada. Exibindo tela de jogo diretamente.');
                    }
                }
            } catch (error) {
                // Erro já tratado e exibido por loginUsuario
            }
        });
    }

    // Event listener para o formulário de registro
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = registerUsernameInput.value;
            const password = registerPasswordInput.value;

            try {
                await registrarUsuario(username, password);
                // Após o registro bem-sucedido, volta para a tela de login
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
                loginUsernameInput.value = username; // Preenche o username para facilitar o login
                loginPasswordInput.value = ''; // Limpa a senha
            } catch (error) {
                // Erro já tratado e exibido por registrarUsuario
            }
        });
    }

    // Event listeners para alternar entre formulários de login/registro
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        });
    }
});
