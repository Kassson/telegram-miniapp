// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    tg.expand();
    
    const tgUser = tg.initDataUnsafe?.user;
    if (tgUser) {
        checkUser(tgUser.id);
    }
    
    updateDates();
    loadTheme();
});

// ==================== ТЕМА ====================
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const toggle = document.getElementById('themeToggle');
    toggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const toggle = document.getElementById('themeToggle');
    toggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

// ==================== АУТЕНТИФИКАЦИЯ ====================
async function checkUser(tgId) {
    try {
        const result = await callApi('getUser', { tgId: String(tgId) });
        if (result && result.userId) {
            currentUser = result;
            currentLobbyId = result.lobbyId;
            isAdmin = result.role === 'admin' || result.role === 'super_admin';
            showApp();
        }
    } catch(error) {
        console.error('Check user error:', error);
    }
}

async function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    if (!groupName) {
        showToast('Введите название пространства');
        return;
    }
    
    const tgId = tg.initDataUnsafe?.user?.id;
    if (!tgId) {
        showToast('Ошибка авторизации');
        return;
    }
    
    try {
        const result = await callApi('createL
