// This script handles user authentication (login and registration).
document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTS AND ELEMENTS ---
    const API_BASE_URL = '[https://lula-coin-backend.onrender.com](https://lula-coin-backend.onrender.com)';
    const authContainer = document.getElementById('auth-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const authMessage = document.getElementById('auth-message');

    // --- API REQUEST FUNCTION ---
    /**
     * Sends a request to the API.
     * @param {string} endpoint - The API endpoint to call.
     * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
     * @param {object|null} body - The request body for POST requests.
     * @returns {Promise<object|null>} The JSON response from the API or null on error.
     */
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

    // --- AUTHENTICATION LOGIC ---
    /**
     * Handles the user login process.
     */
    const handleLogin = async () => {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        if (!username || !password) {
            return showAuthMessage('Preencha todos os campos.');
        }
        const data = await apiRequest('/api/auth/login', 'POST', { username, password });
        if (data && data.token) {
            localStorage.setItem('token', data.token);
            // Redirect to the main application page using an absolute path.
            window.location.href = '/'; 
        }
    };

    /**
     * Handles the user registration process.
     */
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
    
    /**
     * Displays a message in the authentication form area.
     * @param {string} msg - The message to display.
     * @param {string} color - The color of the message text.
     */
    const showAuthMessage = (msg, color = 'var(--red-alert)') => {
        authMessage.textContent = msg;
        authMessage.style.color = color;
    };

    /**
     * Toggles visibility between the login and registration forms.
     */
    const toggleForms = () => {
        const isLoginVisible = window.getComputedStyle(loginForm).display !== 'none';
        loginForm.style.display = isLoginVisible ? 'none' : 'block';
        registerForm.style.display = isLoginVisible ? 'block' : 'none';
        authMessage.textContent = '';
    };

    // --- EVENT LISTENERS ---
    loginBtn.addEventListener('click', handleLogin);
    registerBtn.addEventListener('click', handleRegister);
    showRegisterLink.addEventListener('click', toggleForms);
    showLoginLink.addEventListener('click', toggleForms);

    // Redirect if already logged in
    if (localStorage.getItem('token')) {
        window.location.href = '/';
    }
});

