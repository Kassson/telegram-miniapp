// ==================== КОНФИГУРАЦИЯ ====================
const CONFIG = {
    API_URL: 'https://corsproxy.io/?' + encodeURIComponent('https://script.google.com/macros/s/AKfycbx3W6c4e6AEzwVk7Ek8C7vqPJ0DfPsirDvAQ7D4JMc4KomULqz9Cs2youftBwr1F_Uw/exec'),
    
    NOTIFICATIONS: {
        MORNING: '07:30',
        EVENING: '20:30',
        LESSON_REMIND: 10,
    }
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
// Проверяем, что Telegram WebApp доступен
let tg = null;
try {
    tg = window.Telegram ? window.Telegram.WebApp : null;
} catch(e) {
    console.warn('Telegram WebApp не доступен, используется эмуляция');
}

let currentUser = null;
let currentLobbyId = null;
let currentWeekOffset = 0;
let isAdmin = false;
let registeredUser = null;
let appCache = {};
let scheduleCache = {};
let homeworkCache = {};
