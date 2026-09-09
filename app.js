// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ app.js загружен!');
    
    // Инициализация Telegram WebApp
    if (tg) {
        tg.expand();
        const tgUser = tg.initDataUnsafe?.user;
        if (tgUser) {
            console.log('👤 Пользователь Telegram:', tgUser);
            // Заполняем поля регистрации
            document.getElementById('regFirstName').value = tgUser.first_name || '';
            document.getElementById('regLastName').value = tgUser.last_name || '';
            document.getElementById('regNickname').value = tgUser.username ? '@' + tgUser.username : '';
        }
    }
    
    loadTheme();
    checkUserFromTelegram();
});

// ==================== ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ ====================
async function checkUserFromTelegram() {
    if (!tg) return;
    
    const tgUser = tg.initDataUnsafe?.user;
    if (!tgUser) return;
    
    try {
        const result = await callApi('getUser', { tgId: String(tgUser.id) });
        if (result && result.userId) {
            currentUser = result;
            currentLobbyId = result.lobbyId;
            isAdmin = result.role === 'admin' || result.role === 'super_admin';
            
            document.getElementById('registerPage').classList.remove('active');
            document.getElementById('actionPage').classList.add('active');
            
            document.getElementById('userDisplayName').textContent = result.fullName;
            document.getElementById('userDisplayNickname').textContent = result.nickname || result.tgUsername || '@user';
            document.getElementById('userAvatar').textContent = result.fullName.charAt(0).toUpperCase();
        }
    } catch(error) {
        console.error('Check user error:', error);
    }
}

// ==================== ТЕМА ====================
function toggleTheme() {
    console.log('🔄 Переключение темы');
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButtons(newTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButtons(savedTheme);
}

function updateThemeButtons(theme) {
    const icon = theme === 'dark' ? '☀️' : '🌙';
    document.querySelectorAll('.theme-toggle, .theme-toggle-small').forEach(el => {
        el.textContent = icon;
    });
}

// ==================== РЕГИСТРАЦИЯ ====================
function registerUser() {
    console.log('✅ registerUser вызвана!');
    
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const nickname = document.getElementById('regNickname').value.trim();
    
    console.log('Имя:', firstName, 'Фамилия:', lastName);
    
    if (!firstName || !lastName) {
        alert('Пожалуйста, введите имя и фамилию');
        return;
    }
    
    registeredUser = {
        firstName: firstName,
        lastName: lastName,
        nickname: nickname || '@user'
    };
    
    // Переключаем страницы
    document.getElementById('registerPage').classList.remove('active');
    document.getElementById('actionPage').classList.add('active');
    
    // Обновляем отображение
    document.getElementById('userDisplayName').textContent = firstName + ' ' + lastName;
    document.getElementById('userDisplayNickname').textContent = nickname || '@user';
    document.getElementById('userAvatar').textContent = firstName.charAt(0).toUpperCase();
    
    console.log('✅ Переход на экран выбора действия');
}

// ==================== СОЗДАНИЕ / ПРИСОЕДИНЕНИЕ ====================
function showCreateGroup() {
    console.log('✅ showCreateGroup вызвана');
    document.getElementById('createGroupModal').classList.add('active');
}

function showJoinGroup() {
    console.log('✅ showJoinGroup вызвана');
    document.getElementById('joinGroupModal').classList.add('active');
}

async function createGroup() {
    console.log('✅ createGroup вызвана');
    const groupName = document.getElementById('groupName').value.trim();
    if (!groupName) {
        showToast('Введите название пространства');
        return;
    }
    
    const tgId = tg?.initDataUnsafe?.user?.id || '123456789';
    
    try {
        const result = await callApi('createLobby', {
            creatorId: 'user_' + tgId,
            lobbyName: groupName
        });
        
        if (result && result.lobbyId) {
            closeModal('createGroupModal');
            
            const fullName = registeredUser ? 
                registeredUser.firstName + ' ' + registeredUser.lastName : 
                'Пользователь';
            
            const joinResult = await callApi('joinLobby', {
                tgId: String(tgId),
                fullName: fullName,
                inviteCode: result.inviteCode
            });
            
            if (joinResult.success) {
                currentLobbyId = result.lobbyId;
                currentUser = {
                    userId: joinResult.userId,
                    lobbyId: result.lobbyId,
                    role: 'super_admin',
                    fullName: fullName
                };
                isAdmin = true;
                showInviteCode(result.inviteCode);
                showApp();
                showToast('✅ Пространство создано!');
            }
        }
    } catch(error) {
        showToast('❌ Ошибка: ' + error.message);
    }
}

async function joinGroup() {
    console.log('✅ joinGroup вызвана');
    const inviteCode = document.getElementById('inviteCode').value.trim();
    if (!inviteCode) {
        showToast('Введите код приглашения');
        return;
    }
    
    const tgId = tg?.initDataUnsafe?.user?.id || '123456789';
    
    try {
        const fullName = registeredUser ? 
            registeredUser.firstName + ' ' + registeredUser.lastName : 
            'Пользователь';
        
        const result = await callApi('joinLobby', {
            tgId: String(tgId),
            fullName: fullName,
            inviteCode: inviteCode
        });
        
        if (result.success) {
            closeModal('joinGroupModal');
            currentLobbyId = result.lobbyId;
            currentUser = {
                userId: result.userId,
                lobbyId: result.lobbyId,
                role: result.role,
                fullName: fullName
            };
            isAdmin = result.role === 'admin' || result.role === 'super_admin';
            showApp();
            showToast('✅ Добро пожаловать в пространство!');
        } else {
            showToast('❌ ' + (result.error || 'Ошибка присоединения'));
        }
    } catch(error) {
        showToast('❌ Ошибка: ' + error.message);
    }
}

function showInviteCode(code) {
    document.getElementById('inviteCodeDisplay').textContent = code;
    document.getElementById('inviteCodeModal').classList.add('active');
}

function copyInviteCode() {
    const code = document.getElementById('inviteCodeDisplay').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('📋 Код скопирован!');
    });
}

// ==================== ГЛАВНОЕ ПРИЛОЖЕНИЕ ====================
function showApp() {
    console.log('✅ showApp вызвана');
    document.getElementById('actionPage').classList.remove('active');
    document.getElementById('appPage').classList.add('active');
    
    document.getElementById('groupNameDisplay').textContent = 'Workspaces';
    document.getElementById('userNameDisplay').textContent = currentUser?.fullName || 'Пользователь';
    document.getElementById('userNicknameDisplay').textContent = currentUser?.nickname || '';
    
    if (isAdmin) {
        document.getElementById('adminTab').style.display = 'flex';
        document.getElementById('userRoleBadge').textContent = 'Админ';
        document.getElementById('userRoleBadge').classList.add('admin');
    }
    
    updateDates();
    loadTodaySchedule();
    loadTomorrowSchedule();
    loadWeekSchedule();
    loadHomework();
    loadChatMessages();
    if (isAdmin) {
        loadAdminPanel();
    }
}

// ==================== API ВЫЗОВЫ ====================
async function callApi(action, params) {
    const cacheKey = action + JSON.stringify(params);
    
    if (appCache[cacheKey]) {
        console.log('✅ Использую кэш для:', action);
        return appCache[cacheKey];
    }
    
    try {
        console.log('📡 Запрос к API:', action);
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, params })
        });
        const data = await response.json();
        appCache[cacheKey] = data;
        
        setTimeout(() => { delete appCache[cacheKey]; }, 300000);
        return data;
    } catch(error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

// ==================== УПРАВЛЕНИЕ ТАБАМИ ====================
function switchTab(tab) {
    console.log('🔄 Переключение на вкладку:', tab);
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add('active');
    
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panelId = `tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
    document.getElementById(panelId)?.classList.add('active');
    
    switch(tab) {
        case 'today': loadTodaySchedule(); break;
        case 'tomorrow': loadTomorrowSchedule(); break;
        case 'week': loadWeekSchedule(); break;
        case 'homework': loadHomework(); break;
        case 'chat': loadChatMessages(); break;
        case 'admin': if (isAdmin) loadAdminPanel(); break;
    }
}

// ==================== РАСПИСАНИЕ ====================
function updateDates() {
    const now = new Date();
    const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    
    const todayEl = document.getElementById('todayDate');
    const todayWeekdayEl = document.getElementById('todayWeekday');
    if (todayEl) todayEl.textContent = now.toLocaleDateString('ru-RU');
    if (todayWeekdayEl) todayWeekdayEl.textContent = weekdays[now.getDay()];
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowEl = document.getElementById('tomorrowDate');
    const tomorrowWeekdayEl = document.getElementById('tomorrowWeekday');
    if (tomorrowEl) tomorrowEl.textContent = tomorrow.toLocaleDateString('ru-RU');
    if (tomorrowWeekdayEl) tomorrowWeekdayEl.textContent = weekdays[tomorrow.getDay()];
}

async function loadTodaySchedule() {
    const container = document.getElementById('todaySchedule');
    if (!container) return;
    
    const cacheKey = 'today_' + currentLobbyId;
    
    if (scheduleCache[cacheKey]) {
        container.innerHTML = scheduleCache[cacheKey];
        return;
    }
    
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const result = await callApi('getSchedule', {
            lobbyId: currentLobbyId,
            dayOffset: 0
        });
        
        if (!result || !Array.isArray(result) || result.length === 0) {
            const html = '<div class="empty-state"><div class="icon">📭</div><h3>Нет уроков</h3></div>';
            scheduleCache[cacheKey] = html;
            container.innerHTML = html;
            return;
        }
        
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        let html = '';
        result.forEach((lesson) => {
            const [hours, minutes] = lesson.time.split(':').map(Number);
            const lessonTime = hours * 60 + minutes;
            const endTime = lessonTime + 45;
            
            let status = 'future';
            let statusLabel = '🟢 Будущий';
            let statusClass = 'future';
            
            if (currentTime >= lessonTime && currentTime < endTime) {
                status = 'current';
                statusLabel = '🔴 Идёт';
                statusClass = 'current';
            } else if (currentTime >= endTime) {
                status = 'past';
                statusLabel = '✅ Прошёл';
                statusClass = 'past';
            }
            
            html += `
                <div class="lesson-item ${status === 'current' ? 'current' : status === 'future' ? 'future' : ''}">
                    <div class="lesson-time">${lesson.time}</div>
                    <div class="lesson-info">
                        <div class="lesson-subject">${lesson.subject}</div>
                        <div class="lesson-cabinet">Каб. ${lesson.cabinet || '-'}</div>
                        ${lesson.isReplaced ? '<div style="font-size:11px;color:var(--warning);">🔄 Замена</div>' : ''}
                    </div>
                    <span class="lesson-status ${statusClass}">${statusLabel}</span>
                </div>
            `;
        });
        
        scheduleCache[cacheKey] = html;
        container.innerHTML = html;
        
    } catch(error) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    }
}

async function loadTomorrowSchedule() {
    const container = document.getElementById('tomorrowSchedule');
    if (!container) return;
    
    const cacheKey = 'tomorrow_' + currentLobbyId;
    
    if (scheduleCache[cacheKey]) {
        container.innerHTML = scheduleCache[cacheKey];
        return;
    }
    
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const result = await callApi('getSchedule', {
            lobbyId: currentLobbyId,
            dayOffset: 1
        });
        
        if (!result || !Array.isArray(result) || result.length === 0) {
            const html = '<div class="empty-state"><div class="icon">📭</div><h3>Нет уроков</h3></div>';
            scheduleCache[cacheKey] = html;
            container.innerHTML = html;
            return;
        }
        
        let html = '';
        result.forEach(lesson => {
            html += `
                <div class="lesson-item">
                    <div class="lesson-time">${lesson.time}</div>
                    <div class="lesson-info">
                        <div class="lesson-subject">${lesson.subject}</div>
                        <div class="lesson-cabinet">Каб. ${lesson.cabinet || '-'}</div>
                    </div>
                </div>
            `;
        });
        
        scheduleCache[cacheKey] = html;
        container.innerHTML = html;
        
    } catch(error) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    }
}

function changeWeek(delta) {
    currentWeekOffset += delta;
    document.getElementById('weekLabel').textContent = 
        currentWeekOffset === 0 ? 'Текущая неделя' :
        currentWeekOffset > 0 ? `+${currentWeekOffset} неделя` :
        `${currentWeekOffset} неделя`;
    loadWeekSchedule();
}

async function loadWeekSchedule() {
    const container = document.getElementById('weekSchedule');
    if (!container) return;
    
    const cacheKey = 'week_' + currentLobbyId + '_' + currentWeekOffset;
    
    if (scheduleCache[cacheKey]) {
        container.innerHTML = scheduleCache[cacheKey];
        return;
    }
    
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const weekdaysFull = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1 + currentWeekOffset * 7);
        
        let html = '';
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            
            const dayOffset = (i - (now.getDay() === 0 ? 7 : now.getDay()) + 1) + currentWeekOffset * 7;
            const result = await callApi('getSchedule', {
                lobbyId: currentLobbyId,
                dayOffset: dayOffset
            });
            
            const isWeekend = i >= 5;
            
            html += `
                <div class="day-card" style="${isWeekend ? 'opacity:0.6;' : ''}">
                    <div class="day-card-header">
                        <span class="day-card-title">${weekdaysFull[i]}</span>
                        <span class="day-card-date">${date.toLocaleDateString('ru-RU')}</span>
                        ${isAdmin ? `<button class="btn btn-sm btn-outline" onclick="window.showToast('✏️ Редактирование в разработке')">✏️</button>` : ''}
                    </div>
                    ${result && result.length > 0 ? 
                        result.map(l => `
                            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid var(--border-color);">
                                <span>${l.time} - ${l.subject}</span>
                                <span style="color:var(--text-secondary);">каб. ${l.cabinet || '-'}</span>
                            </div>
                        `).join('') :
                        '<div style="color:var(--text-secondary);font-size:13px;padding:4px 0;">Нет уроков</div>'
                    }
                </div>
            `;
        }
        
        scheduleCache[cacheKey] = html;
        container.innerHTML = html;
        
    } catch(error) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    }
}

// ==================== ДОМАШНЕЕ ЗАДАНИЕ ====================
async function loadHomework() {
    const container = document.getElementById('homeworkContent');
    if (!container) return;
    
    const cacheKey = 'homework_' + currentLobbyId;
    
    if (homeworkCache[cacheKey]) {
        container.innerHTML = homeworkCache[cacheKey];
        return;
    }
    
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const result = await callApi('getHomework', { lobbyId: currentLobbyId });
        
        if (!result || !Array.isArray(result) || result.length === 0) {
            const html = `
                <div class="empty-state">
                    <div class="icon">📝</div>
                    <h3>Нет домашнего задания</h3>
                    ${isAdmin ? `<button class="btn btn-primary" style="margin-top:12px;" onclick="window.showAddHomework()">➕ Добавить ДЗ</button>` : ''}
                </div>
            `;
            homeworkCache[cacheKey] = html;
            container.innerHTML = html;
            return;
        }
        
        let html = '';
        if (isAdmin) {
            html += `<button class="btn btn-primary btn-full" style="margin-bottom:12px;" onclick="window.showAddHomework()">➕ Добавить ДЗ</button>`;
        }
        
        result.forEach(hw => {
            const done = hw.progress ? hw.progress.filter(p => p.isDone).length : 0;
            const total = hw.progress ? hw.progress.length : 0;
            const isDone = hw.progress ? hw.progress.some(p => p.userId === currentUser?.userId && p.isDone) : false;
            
            html += `
                <div class="card">
                    <div class="homework-item">
                        <div class="homework-header">
                            <span class="homework-subject">${hw.subject}</span>
                            <span class="badge ${isDone ? 'badge-success' : 'badge-warning'}">
                                ${isDone ? '✅ Выполнено' : '⏳ Ожидает'}
                            </span>
                        </div>
                        <div class="homework-desc">${hw.description}</div>
                        <div class="homework-meta">
                            <span>📅 до ${hw.dueDate || 'Не указан'}</span>
                            <span>👥 ${done}/${total} отметок</span>
                        </div>
                        <div class="homework-actions">
                            ${!isDone ? 
                                `<button class="btn btn-success btn-sm" onclick="window.markHomeworkDone('${hw.id}')">✅ Отметить</button>` :
                                `<span style="color:var(--success);font-size:13px;">✅ Вы выполнили</span>`
                            }
                            ${isAdmin ? `
                                <button class="btn btn-warning btn-sm" onclick="window.showToast('✏️ Редактирование в разработке')">✏️</button>
                                <button class="btn btn-danger btn-sm" onclick="window.deleteHomework('${hw.id}')">🗑️</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        homeworkCache[cacheKey] = html;
        container.innerHTML = html;
        
    } catch(error) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    }
}

async function markHomeworkDone(homeworkId) {
    const result = await callApi('markHomeworkDone', {
        lobbyId: currentLobbyId,
        homeworkId: homeworkId,
        userId: currentUser.userId
    });
    
    if (result.success) {
        showToast('✅ ДЗ отмечено как выполненное!');
        homeworkCache = {};
        loadHomework();
    } else {
        showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
    }
}

function showAddHomework() {
    const modal = document.getElementById('editModal');
    const content = document.getElementById('editModalContent');
    if (!modal || !content) return;
    
    content.innerHTML = `
        <h3 class="modal-title">📝 Добавить ДЗ</h3>
        <div class="form-group">
            <label>Предмет</label>
            <input type="text" id="hwSubject" class="form-input" placeholder="Математика">
        </div>
        <div class="form-group">
            <label>Задание</label>
            <textarea id="hwDescription" class="form-input" rows="3" placeholder="Описание задания"></textarea>
        </div>
        <div class="form-group">
            <label>Срок (дата)</label>
            <input type="date" id="hwDueDate" class="form-input">
        </div>
        <button class="btn btn-primary btn-full" onclick="window.addHomework()">➕ Добавить</button>
    `;
    
    modal.classList.add('active');
}

async function addHomework() {
    const subject = document.getElementById('hwSubject').value.trim();
    const description = document.getElementById('hwDescription').value.trim();
    const dueDate = document.getElementById('hwDueDate').value;
    
    if (!subject || !description) {
        showToast('Заполните все поля');
        return;
    }
    
    const result = await callApi('addHomework', {
        lobbyId: currentLobbyId,
        subject: subject,
        description: description,
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        adminId: currentUser.userId
    });
    
    if (result.success) {
        showToast('✅ ДЗ добавлено!');
        closeModal('editModal');
        homeworkCache = {};
        loadHomework();
    } else {
        showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
    }
}

async function deleteHomework(homeworkId) {
    if (!confirm('Удалить это ДЗ?')) return;
    homeworkCache = {};
    showToast('🗑️ ДЗ удалено');
    loadHomework();
}

// ==================== TOAST УВЕДОМЛЕНИЯ ====================
function showToast(message) {
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

// ==================== ЗАГРУЗКА ЧАТА И АДМИНКИ ====================
async function loadChatMessages() {
    const container = document.getElementById('chatMessages');
    if (container) {
        container.innerHTML = '<div class="empty-state"><div class="icon">💬</div><h3>Загрузка чата...</h3></div>';
    }
}

async function sendMessage() {
    showToast('💬 Чат загружается...');
}

async function loadAdminPanel() {
    const container = document.getElementById('adminContent');
    if (container) {
        container.innerHTML = '<div class="empty-state"><div class="icon">⚙️</div><h3>Загрузка админ-панели...</h3></div>';
    }
}
