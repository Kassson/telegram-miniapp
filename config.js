// ==================== КОНФИГУРАЦИЯ ====================
const CONFIG = {
    // Используем JSONP для обхода CORS
    API_URL: 'https://script.google.com/macros/s/AKfycbx3W6c4e6AEzwVk7Ek8C7vqPJ0DfPsirDvAQ7D4JMc4KomULqz9Cs2youftBwr1F_Uw/exec',
    
    NOTIFICATIONS: {
        MORNING: '07:30',
        EVENING: '20:30',
        LESSON_REMIND: 10,
    }
};

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
// Функция для проверки, запущено ли приложение в Telegram
function isTelegramWebApp() {
    try {
        return window.Telegram && window.Telegram.WebApp;
    } catch(e) {
        return false;
    }
}

// Получение данных пользователя из Telegram
function getTelegramUser() {
    try {
        if (isTelegramWebApp()) {
            return window.Telegram.WebApp.initDataUnsafe?.user || null;
        }
    } catch(e) {
        console.warn('Ошибка получения пользователя Telegram:', e);
    }
    return null;
}
