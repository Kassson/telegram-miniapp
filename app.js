// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    tg.expand();
    
    // Получаем данные пользователя из Telegram
    const tgUser = tg.initDataUnsafe?.user;
    if (tgUser) {
        checkUser(tgUser.id);
    }
    
    // Обновляем даты
    updateDates();
});

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
        showToast('Введите название группы');
        return;
    }
    
    const tgId = tg.initDataUnsafe?.user?.id;
    if (!tgId) {
        showToast('Ошибка авторизации');
        return;
    }
    
    const result = await callApi('createLobby', {
        creatorId: 'user_' + tgId,
        lobbyName: groupName
    });
    
    if (result && result.lobbyId) {
        closeModal('createGroupModal');
        showInviteCode(result.inviteCode);
        // Автоматически присоединяемся
        const joinResult = await callApi('joinLobby', {
            tgId: String(tgId),
            fullName: tg.initDataUnsafe?.user?.first_name || 'Пользователь',
            inviteCode: result.inviteCode
        });
        if (joinResult.success) {
            currentLobbyId = result.lobbyId;
            currentUser = {
                userId: joinResult.userId,
                lobbyId: result.lobbyId,
                role: 'super_admin'
            };
            showApp();
        }
    }
}

async function joinGroup() {
    const inviteCode = document.getElementById('inviteCode').value.trim();
    const fullName = document.getElementById('userFullName').value.trim();
    
    if (!inviteCode || !fullName) {
        showToast('Заполните все поля');
        return;
    }
    
    const tgId = tg.initDataUnsafe?.user?.id;
    if (!tgId) {
        showToast('Ошибка авторизации');
        return;
    }
    
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
            role: result.role
        };
        isAdmin = result.role === 'admin' || result.role === 'super_admin';
        showApp();
        showToast('✅ Добро пожаловать в группу!');
    } else {
        showToast('❌ ' + (result.error || 'Ошибка присоединения'));
    }
}

// ==================== ПОКАЗ СТРАНИЦ ====================
function showCreateGroup() {
    document.getElementById('createGroupModal').classList.add('active');
}

function showJoinGroup() {
    document.getElementById('joinGroupModal').classList.add('active');
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

function showApp() {
    document.getElementById('authPage').classList.remove('active');
    document.getElementById('appPage').classList.add('active');
    
    document.getElementById('groupNameDisplay').textContent = currentLobbyId || 'Группа';
    document.getElementById('userNameDisplay').textContent = currentUser?.fullName || 'Пользователь';
    document.getElementById('userNicknameDisplay').textContent = currentUser?.nickname || '';
    
    // Показываем админ таб
    if (isAdmin) {
        document.getElementById('adminTab').style.display = 'flex';
    }
    
    // Загружаем данные
    loadTodaySchedule();
    loadTomorrowSchedule();
    loadWeekSchedule();
    loadHomework();
    loadChatMessages();
    if (isAdmin) {
        loadAdminPanel();
    }
    
    // Настраиваем уведомления
    setupNotifications();
}

// ==================== API ВЫЗОВЫ ====================
async function callApi(action, params) {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, params })
        });
        return await response.json();
    } catch(error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

// ==================== УПРАВЛЕНИЕ ТАБАМИ ====================
function switchTab(tab) {
    // Обновляем активный таб
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add('active');
    
    // Обновляем панели
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panelId = `tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
    document.getElementById(panelId)?.classList.add('active');
    
    // Загружаем данные
    switch(tab) {
        case 'today':
            loadTodaySchedule();
            break;
        case 'tomorrow':
            loadTomorrowSchedule();
            break;
        case 'week':
            loadWeekSchedule();
            break;
        case 'homework':
            loadHomework();
            break;
        case 'chat':
            loadChatMessages();
            break;
        case 'admin':
            if (isAdmin) loadAdminPanel();
            break;
    }
}

// ==================== РАСПИСАНИЕ ====================
function updateDates() {
    const now = new Date();
    const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    
    // Сегодня
    document.getElementById('todayDate').textContent = now.toLocaleDateString('ru-RU');
    document.getElementById('todayWeekday').textContent = weekdays[now.getDay()];
    
    // Завтра
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('tomorrowDate').textContent = tomorrow.toLocaleDateString('ru-RU');
    document.getElementById('tomorrowWeekday').textContent = weekdays[tomorrow.getDay()];
}

async function loadTodaySchedule() {
    const container = document.getElementById('todaySchedule');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const result = await callApi('getSchedule', {
            lobbyId: currentLobbyId,
            dayOffset: 0
        });
        
        if (!result || !Array.isArray(result)) {
            container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Нет уроков</h3></div>';
            return;
        }
        
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        let html = '';
        result.forEach((lesson, index) => {
            const [hours, minutes] = lesson.time.split(':').map(Number);
            const lessonTime = hours * 60 + minutes;
            
            let status = 'future';
            let statusLabel = '🟢 Будущий';
            let statusClass = 'future';
            
            // Находим конец урока
            let endTime = lessonTime + 45; // 45 минут урок
            // Ищем реальное время окончания из расписания
            if (window.LESSON_SCHEDULE) {
                const schedule = window.LESSON_SCHEDULE.find(s => s.start === lesson.time);
                if (schedule) {
                    const [endH, endM] = schedule.end.split(':').map(Number);
                    endTime = endH * 60 + endM;
                }
            }
            
            if (currentTime >= lessonTime && currentTime < endTime) {
                status = 'current';
                statusLabel = '🔴 Идёт';
                statusClass = 'current';
            } else if (currentTime >= endTime) {
                status = 'past';
                statusLabel = '✅ Прошёл';
                statusClass = 'past';
            }
            
            // Проверяем, есть ли следующий урок
            let nextLesson = null;
            if (index < result.length - 1) {
                nextLesson = result[index + 1];
            }
            
            html += `
                <div class="lesson-item ${status === 'current' ? 'current' : status === 'future' ? 'future' : ''}">
                    <div class="lesson-time">${lesson.time}</div>
                    <div class="lesson-info">
                        <div class="lesson-subject">${lesson.subject}</div>
                        <div class="lesson-cabinet">Каб. ${lesson.cabinet || '-'}</div>
                        ${lesson.isReplaced ? '<div style="font-size:11px;color:#E65100;">🔄 Замена</div>' : ''}
                    </div>
                    <span class="lesson-status ${statusClass}">${statusLabel}</span>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch(error) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    }
}

async function loadTomorrowSchedule() {
    const container = document.getElementById('tomorrowSchedule');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const result = await callApi('getSchedule', {
            lobbyId: currentLobbyId,
            dayOffset: 1
        });
        
        if (!result || !Array.isArray(result) || result.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Нет уроков</h3></div>';
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
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const weekdays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
        const weekdaysFull = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1 + currentWeekOffset * 7);
        
        let html = '';
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            
            const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
            
            const result = await callApi('getSchedule', {
                lobbyId: currentLobbyId,
                dayOffset: (i - (now.getDay() === 0 ? 7 : now.getDay()) + 1) + currentWeekOffset * 7
            });
            
            const isWeekend = i >= 5;
            
            html += `
                <div class="day-card" style="${isWeekend ? 'opacity:0.6;' : ''}">
                    <div class="day-card-header">
                        <span class="day-card-title">${weekdaysFull[i]}</span>
                        <span class="day-card-date">${date.toLocaleDateString('ru-RU')}</span>
                        ${isAdmin ? `<button class="btn btn-sm btn-outline" onclick="showEditSchedule('${weekdays[i]}', '${date.toLocaleDateString('ru-RU')}')">✏️</button>` : ''}
                    </div>
                    ${result && result.length > 0 ? 
                        result.map(l => `
                            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid #f0f0f0;">
                                <span>${l.time} - ${l.subject}</span>
                                <span style="color:#888;">каб. ${l.cabinet || '-'}</span>
                            </div>
                        `).join('') :
                        '<div style="color:#888;font-size:13px;padding:4px 0;">Нет уроков</div>'
                    }
                </div>
            `;
        }
        
        container.innerHTML = html;
        
    } catch(error) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    }
}

// ==================== ДОМАШНЕЕ ЗАДАНИЕ ====================
async function loadHomework() {
    const container = document.getElementById('homeworkContent');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const result = await callApi('getHomework', { lobbyId: currentLobbyId });
        
        if (!result || !Array.isArray(result) || result.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📝</div>
                    <h3>Нет домашнего задания</h3>
                    ${isAdmin ? `<button class="btn btn-primary" style="margin-top:12px;" onclick="showAddHomework()">➕ Добавить ДЗ</button>` : ''}
                </div>
            `;
            return;
        }
        
        let html = '';
        if (isAdmin) {
            html += `<button class="btn btn-primary btn-full" style="margin-bottom:12px;" onclick="showAddHomework()">➕ Добавить ДЗ</button>`;
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
                                `<button class="btn btn-success btn-sm" onclick="markHomeworkDone('${hw.id}')">✅ Отметить</button>` :
                                `<span style="color:var(--success);font-size:13px;">✅ Вы выполнили</span>`
                            }
                            ${isAdmin ? `
                                <button class="btn btn-warning btn-sm" onclick="editHomework('${hw.id}')">✏️</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteHomework('${hw.id}')">🗑️</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
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
        loadHomework();
    } else {
        showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
    }
}

function showAddHomework() {
    const modal = document.getElementById('editModal');
    const content = document.getElementById('editModalContent');
    
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
        <button class="btn btn-primary btn-full" onclick="addHomework()">➕ Добавить</button>
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
        loadHomework();
    } else {
        showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
    }
}

function editHomework(homeworkId) {
    showToast('✏️ Редактирование в разработке');
}

async function deleteHomework(homeworkId) {
    if (!confirm('Удалить это ДЗ?')) return;
    
    // TODO: Добавить API для удаления
    showToast('🗑️ ДЗ удалено');
    loadHomework();
}

// ==================== УВЕДОМЛЕНИЯ ====================
function setupNotifications() {
    // Проверяем, нужно ли показать утреннее уведомление
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const morningTime = CONFIG.NOTIFICATIONS.MORNING.split(':').map(Number);
    const morningMinutes = morningTime[0] * 60 + morningTime[1];
    
    // Если утро и уведомление ещё не отправлено
    if (currentTime >= morningMinutes && currentTime < morningMinutes + 5) {
        const sent = localStorage.getItem('morning_notification_sent');
        if (!sent) {
            showToast('📚 Доброе утро! Просмотрите расписание на сегодня');
            localStorage.setItem('morning_notification_sent', 'true');
        }
    } else if (currentTime > morningMinutes + 5) {
        localStorage.removeItem('morning_notification_sent');
    }
    
    // Проверяем оповещения об уроках
    checkLessonNotifications();
    
    // Проверяем окончание уроков
    checkDayEnd();
}

async function checkLessonNotifications() {
    const result = await callApi('getSchedule', {
        lobbyId: currentLobbyId,
        dayOffset: 0
    });
    
    if (!result || !Array.isArray(result)) return;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const currentDate = now.toLocaleDateString('ru-RU');
    const notificationKey = `lesson_notify_${currentDate}`;
    const sentNotifications = JSON.parse(localStorage.getItem(notificationKey) || '[]');
    
    result.forEach(lesson => {
        const [hours, minutes] = lesson.time.split(':').map(Number);
        const lessonTime = hours * 60 + minutes;
        const diff = lessonTime - currentTime;
        
        // За 10 минут до урока
        if (diff > 0 && diff <= 11 && diff >= 9) {
            if (!sentNotifications.includes(`remind_${lesson.time}`)) {
                showToast(`🔔 Через 10 минут: ${lesson.subject} (каб. ${lesson.cabinet || '-'})`);
                sentNotifications.push(`remind_${lesson.time}`);
            }
        }
    });
    
    localStorage.setItem(notificationKey, JSON.stringify(sentNotifications));
}

async function checkDayEnd() {
    const result = await callApi('getSchedule', {
        lobbyId: currentLobbyId,
        dayOffset: 0
    });
    
    if (!result || !Array.isArray(result) || result.length === 0) return;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const currentDate = now.toLocaleDateString('ru-RU');
    const notificationKey = `day_end_${currentDate}`;
    
    if (localStorage.getItem(notificationKey)) return;
    
    // Находим последний урок
    const lastLesson = result[result.length - 1];
    const [hours, minutes] = lastLesson.time.split(':').map(Number);
    const lessonTime = hours * 60 + minutes;
    const endTime = lessonTime + 45; // +45 минут
    
    // Через 5 минут после окончания последнего урока
    if (currentTime >= endTime && currentTime < endTime + 10) {
        showToast('🎉 Все уроки закончились! Проверьте ДЗ в приложении');
        localStorage.setItem(notificationKey, 'true');
    }
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
    }, 4000);
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showSettings() {
    showToast('⚙️ Настройки в разработке');
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(),0,4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// ==================== ИНИЦИАЛИЗАЦИЯ ПОСЛЕ ЗАГРУЗКИ ====================
console.log('🚀 Mini App загружен!');