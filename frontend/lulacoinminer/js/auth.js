document.addEventListener('DOMContentLoaded', () => {
    // Se o usuário já está logado, manda ele para o jogo.
    if (localStorage.getItem('token')) {
        window.location.href = 'index.html';
        return; // Para a execução do script
    }

    // --- CONFIGURAÇÕES E CONSTANTES ---
    const API_BASE_URL = 'https://lula-coin-backend.onrender.com';
    
    // --- ELEMENTOS DO DOM ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const authMessage = document.getElementById('auth-message');

    // --- FUNÇÕES DE API ---
    const apiRequest = async (endpoint, method = 'GET', body = null) => {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Ocorreu um erro.');
            }
            return data;
        } catch (error) {
            showAuthMessage(error.message);
            return null;
        }
    };

    // --- FUNÇÕES DE AUTENTICAÇÃO ---
    const handleLogin = async () => {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        if (!username || !password) {
            return showAuthMessage('Preencha todos os campos.');
        }
        const data = await apiRequest('/api/auth/login', 'POST', { username, password });
        if (data && data.token) {
            localStorage.setItem('token', data.token);
            // Redireciona para a página do jogo após o login
            window.location.href = 'index.html';
        }
    };

    const handleRegister = async () => {
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        if (!username || !password) {
            return showAuthMessage('Preencha todos os campos.');
        }
        const data = await apiRequest('/api/auth/register', 'POST', { username, password });
        if (data) {
            showAuthMessage(data.message, 'lime');
            toggleForms();
        }
    };

    const showAuthMessage = (msg, color = 'var(--red-alert)') => {
        authMessage.textContent = msg;
        authMessage.style.color = color;
    };

    const toggleForms = () => {
        const loginDisplay = window.getComputedStyle(loginForm).display;
        loginForm.style.display = loginDisplay === 'none' ? 'block' : 'none';
        registerForm.style.display = loginDisplay === 'none' ? 'none' : 'block';
        authMessage.textContent = '';
    };

    // --- EVENT LISTENERS ---
    loginBtn.addEventListener('click', handleLogin);
    registerBtn.addEventListener('click', handleRegister);
    showRegisterLink.addEventListener('click', toggleForms);
    showLoginLink.addEventListener('click', toggleForms);
});
