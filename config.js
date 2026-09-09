// ==================== КОНФИГУРАЦИЯ ====================
const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbx3W6c4e6AEzwVk7Ek8C7vqPJ0DfPsirDvAQ7D4JMc4KomULqz9Cs2youftBwr1F_Uw/exec',
    
    NOTIFICATIONS: {
        MORNING: '07:30',
        EVENING: '20:30',
        LESSON_REMIND: 10,
    },
    
    COLORS: {
        CURRENT: '#FF6B6B',
        FUTURE: '#00B894',
        PAST: '#DFE6E9',
        REPLACED: '#FDCB6E'
    }
};

let tg = window.Telegram.WebApp;
let currentUser = null;
let currentLobbyId = null;
let currentWeekOffset = 0;
let chatMessages = [];
let isAdmin = false;
