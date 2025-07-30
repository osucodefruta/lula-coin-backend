// DENTRO DE: /js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // Se o usuário já está logado, manda ele para a página principal.
    if (localStorage.getItem('token')) {
        // CORREÇÃO: Usa a raiz do site para a página principal.
        window.location.href = '/'; 
        return;
    }

    const API_BASE_URL = 'https://lula-coin-backend.onrender.com';
    
    // ... (seleção de elementos DOM) ...
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    // ... etc ...

    const apiRequest = async (endpoint, method = 'GET', body = null) => {
        // ... (código da função apiRequest sem alterações) ...
    };

    const handleLogin = async () => {
        // ... (lógica do handleLogin) ...
        const data = await apiRequest('/api/auth/login', 'POST', { username, password });
        if (data && data.token) {
            localStorage.setItem('token', data.token);
            // CORREÇÃO: Redireciona para a raiz do site (jogo principal).
            window.location.href = '/'; 
        }
    };

    // ... (resto do arquivo sem alterações) ...
});
