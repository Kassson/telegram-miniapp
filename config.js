// ==================== КОНФИГУРАЦИЯ ====================
const CONFIG = {
    // URL вашего Google Apps Script (получен при развертывании)
    API_URL: 'https://script.google.com/macros/s/AKfycbx3W6c4e6AEzwVk7Ek8C7vqPJ0DfPsirDvAQ7D4JMc4KomULqz9Cs2youftBwr1F_Uw/exec',
    
    // Настройки уведомлений
    NOTIFICATIONS: {
        MORNING: '07:30',
        EVENING: '20:30',
        LESSON_REMIND: 10, // минут до урока
    },
    
    // Цвета статусов уроков
    COLORS: {
        CURRENT: '#FF6B6B',
        FUTURE: '#00B894',
        PAST: '#DFE6E9',
        REPLACED: '#FDCB6E'
    }
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let tg = window.Telegram.WebApp;
let currentUser = null;
let currentLobbyId = null;
let currentWeekOffset = 0;
let chatMessages = [];
let isAdmin = false;