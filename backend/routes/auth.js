// auth.js

// Certifique-se de que esta URL base está CORRETA para o seu backend no Render
const API_BASE_URL = 'https://lula-coin-backend.onrender.com';

// Função para exibir mensagens de erro/sucesso na UI (do script.js principal, ou onde você a definiu)
// Assumindo que showOverlayMessage é uma função global ou importada
// Se você não tiver esta função, pode substituí-la por console.error ou alert()
function showOverlayMessage(message, type) {
    const overlayMessage = document.getElementById('overlay-message');
    const overlayMessageText = document.getElementById('overlay-message-text');
    const overlayMessageOkButton = document.getElementById('overlay-message-ok-button');

    if (overlayMessage && overlayMessageText && overlayMessageOkButton) {
        overlayMessageText.textContent = message;
        overlayMessage.style.display = 'flex'; // Mostra o overlay

        // Oculta o overlay ao clicar no botão OK
        overlayMessageOkButton.onclick = () => {
            overlayMessage.style.display = 'none';
        };
    } else {
        console.warn('showOverlayMessage: Elementos do overlay de mensagem não encontrados. Mensagem:', message);
        alert(message); // Fallback para alert se os elementos não existirem
    }
}


// Função para registrar um novo usuário
async function registrarUsuario(username, password) {
    try {
        console.log(`[AUTH] Tentando registrar: ${username} na URL: ${API_BASE_URL}/api/auth/register`); // Log para depuração
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
        return data; // Deve conter o usuário registrado ou mensagem de sucesso
    } catch (error) {
        console.error('[AUTH] Erro no registro:', error);
        // Exibe a mensagem de erro para o usuário
        showOverlayMessage(error.message || 'Não foi possível registrar a conta. Tente novamente.', 'error');
        throw error;
    }
}

// Função para fazer login
async function loginUsuario(username, password) {
    try {
        console.log(`[AUTH] Tentando login: ${username} na URL: ${API_BASE_URL}/api/auth/login`); // Log para depuração
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
        return data; // Deve conter o token e informações do usuário
    } catch (error) {
        console.error('[AUTH] Erro no login:', error);
        // Exibe a mensagem de erro para o usuário
        showOverlayMessage(error.message || 'Não foi possível fazer login. Verifique seu nome de usuário e senha.', 'error');
        throw error;
    }
}

// Funções utilitárias (se estiverem neste arquivo)
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax"; // Adicionado SameSite=Lax
}

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

function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

// Se você tiver a lógica de UI do login/registro aqui, adapte conforme necessário.
// Exemplo (adapte para o seu HTML e eventos):
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
                    
                    // Atualiza a UI com os dados do usuário logado
                    if (typeof updateGameUI === 'function') { // Verifica se a função existe
                        updateGameUI(data); // Assume que `data` tem lulaCoins, level, etc.
                        updateMonitorText(data); // Se você tiver essa função em game.js
                    }

                    authScreen.style.display = 'none';
                    gameScreen.style.display = 'flex'; // ou 'block', 'grid' dependendo do seu layout
                    console.log('Login bem-sucedido. Jogo carregado.');
                }
            } catch (error) {
                // A mensagem de erro já é tratada por showOverlayMessage dentro de loginUsuario
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = registerUsernameInput.value;
            const password = registerPasswordInput.value;

            try {
                const data = await registrarUsuario(username, password);
                showOverlayMessage(data.message || 'Registro realizado com sucesso!', 'success');
                // Após o registro, pode redirecionar para a tela de login ou fazer login automático
                loginForm.style.display = 'block'; // Mostra o formulário de login
                registerForm.style.display = 'none'; // Esconde o de registro
            } catch (error) {
                // A mensagem de erro já é tratada por showOverlayMessage dentro de registrarUsuario
            }
        });
    }

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
