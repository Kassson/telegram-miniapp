// ==================== ПРИЛОЖЕНИЕ ====================
(function() {
    'use strict';
    
    // ==================== СОСТОЯНИЕ ПРИЛОЖЕНИЯ ====================
    const AppState = {
        tg: null,
        currentUser: null,
        currentLobbyId: null,
        currentWeekOffset: 0,
        isAdmin: false,
        registeredUser: null,
        appCache: {},
        scheduleCache: {},
        homeworkCache: {}
    };
    
    // ==================== DOM ЭЛЕМЕНТЫ ====================
    const DOM = {};
    
    function cacheDomElements() {
        DOM.registerPage = document.getElementById('registerPage');
        DOM.actionPage = document.getElementById('actionPage');
        DOM.appPage = document.getElementById('appPage');
        DOM.regFirstName = document.getElementById('regFirstName');
        DOM.regLastName = document.getElementById('regLastName');
        DOM.regNickname = document.getElementById('regNickname');
        DOM.userDisplayName = document.getElementById('userDisplayName');
        DOM.userDisplayNickname = document.getElementById('userDisplayNickname');
        DOM.userAvatar = document.getElementById('userAvatar');
        DOM.userNameDisplay = document.getElementById('userNameDisplay');
        DOM.userNicknameDisplay = document.getElementById('userNicknameDisplay');
        DOM.userRoleBadge = document.getElementById('userRoleBadge');
        DOM.adminTab = document.getElementById('adminTab');
        DOM.groupNameDisplay = document.getElementById('groupNameDisplay');
        DOM.todaySchedule = document.getElementById('todaySchedule');
        DOM.tomorrowSchedule = document.getElementById('tomorrowSchedule');
        DOM.weekSchedule = document.getElementById('weekSchedule');
        DOM.homeworkContent = document.getElementById('homeworkContent');
        DOM.chatMessages = document.getElementById('chatMessages');
        DOM.adminContent = document.getElementById('adminContent');
        DOM.inviteCodeDisplay = document.getElementById('inviteCodeDisplay');
        DOM.inviteCodeModal = document.getElementById('inviteCodeModal');
        DOM.createGroupModal = document.getElementById('createGroupModal');
        DOM.joinGroupModal = document.getElementById('joinGroupModal');
        DOM.editModal = document.getElementById('editModal');
        DOM.editModalContent = document.getElementById('editModalContent');
        DOM.chatInput = document.getElementById('chatInput');
        DOM.groupName = document.getElementById('groupName');
        DOM.inviteCode = document.getElementById('inviteCode');
        DOM.weekLabel = document.getElementById('weekLabel');
        DOM.todayDate = document.getElementById('todayDate');
        DOM.todayWeekday = document.getElementById('todayWeekday');
        DOM.tomorrowDate = document.getElementById('tomorrowDate');
        DOM.tomorrowWeekday = document.getElementById('tomorrowWeekday');
    }
    
    // ==================== ИНИЦИАЛИЗАЦИЯ ====================
    function init() {
        console.log('✅ Приложение загружено!');
        
        cacheDomElements();
        loadTheme();
        initTelegram();
        
        // Проверяем пользователя
        if (AppState.tg) {
            checkUserFromTelegram();
        }
        
        // Навешиваем обработчики событий
        setupEventListeners();
    }
    
    // ==================== TELEGRAM ====================
    function initTelegram() {
        try {
            if (window.Telegram && window.Telegram.WebApp) {
                AppState.tg = window.Telegram.WebApp;
                AppState.tg.expand();
                
                const tgUser = AppState.tg.initDataUnsafe?.user;
                if (tgUser) {
                    console.log('👤 Пользователь Telegram:', tgUser);
                    if (DOM.regFirstName) DOM.regFirstName.value = tgUser.first_name || '';
                    if (DOM.regLastName) DOM.regLastName.value = tgUser.last_name || '';
                    if (DOM.regNickname) DOM.regNickname.value = tgUser.username ? '@' + tgUser.username : '';
                }
            } else {
                console.warn('⚠️ Telegram WebApp не доступен, эмуляция');
                // Эмуляция для браузера
                AppState.tg = {
                    expand: function() { console.log('Telegram WebApp expanded (emulated)'); },
                    initDataUnsafe: { 
                        user: { 
                            id: 123456789, 
                            first_name: 'Тест', 
                            last_name: 'Пользователь', 
                            username: 'testuser' 
                        } 
                    }
                };
            }
        } catch(e) {
            console.warn('⚠️ Ошибка инициализации Telegram:', e);
            AppState.tg = {
                expand: function() {},
                initDataUnsafe: { user: { id: 123456789, first_name: 'Тест', last_name: 'Пользователь' } }
            };
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
            if (el) el.textContent = icon;
        });
    }
    
    // ==================== РЕГИСТРАЦИЯ ====================
    function registerUser() {
        console.log('✅ registerUser вызвана!');
        
        const firstName = DOM.regFirstName?.value?.trim() || '';
        const lastName = DOM.regLastName?.value?.trim() || '';
        const nickname = DOM.regNickname?.value?.trim() || '';
        
        if (!firstName || !lastName) {
            showToast('Пожалуйста, введите имя и фамилию');
            return;
        }
        
        AppState.registeredUser = {
            firstName: firstName,
            lastName: lastName,
            nickname: nickname || '@user'
        };
        
        if (DOM.registerPage) DOM.registerPage.classList.remove('active');
        if (DOM.actionPage) DOM.actionPage.classList.add('active');
        
        if (DOM.userDisplayName) DOM.userDisplayName.textContent = firstName + ' ' + lastName;
        if (DOM.userDisplayNickname) DOM.userDisplayNickname.textContent = nickname || '@user';
        if (DOM.userAvatar) DOM.userAvatar.textContent = firstName.charAt(0).toUpperCase();
        
        console.log('✅ Переход на экран выбора действия');
    }
    
    // ==================== ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ ====================
    async function checkUserFromTelegram() {
        if (!AppState.tg) return;
        
        const tgUser = AppState.tg.initDataUnsafe?.user;
        if (!tgUser) return;
        
        try {
            const result = await callApi('getUser', { tgId: String(tgUser.id) });
            console.log('📡 Результат getUser:', result);
            
            if (result && result.userId) {
                AppState.currentUser = result;
                AppState.currentLobbyId = result.lobbyId;
                AppState.isAdmin = result.role === 'admin' || result.role === 'super_admin';
                
                if (DOM.registerPage) DOM.registerPage.classList.remove('active');
                if (DOM.actionPage) DOM.actionPage.classList.add('active');
                
                if (DOM.userDisplayName) DOM.userDisplayName.textContent = result.fullName;
                if (DOM.userDisplayNickname) DOM.userDisplayNickname.textContent = result.nickname || result.tgUsername || '@user';
                if (DOM.userAvatar) DOM.userAvatar.textContent = result.fullName.charAt(0).toUpperCase();
            }
        } catch(error) {
            console.error('Check user error:', error);
        }
    }
    
    // ==================== СОЗДАНИЕ / ПРИСОЕДИНЕНИЕ ====================
    function showCreateGroup() {
        console.log('✅ showCreateGroup вызвана');
        if (DOM.createGroupModal) DOM.createGroupModal.classList.add('active');
    }
    
    function showJoinGroup() {
        console.log('✅ showJoinGroup вызвана');
        if (DOM.joinGroupModal) DOM.joinGroupModal.classList.add('active');
    }
    
    async function createGroup() {
        console.log('✅ createGroup вызвана');
        const groupName = DOM.groupName?.value?.trim() || '';
        if (!groupName) {
            showToast('Введите название пространства');
            return;
        }
        
        const tgId = AppState.tg?.initDataUnsafe?.user?.id || '123456789';
        
        try {
            const result = await callApi('createLobby', {
                creatorId: 'user_' + tgId,
                lobbyName: groupName
            });
            
            console.log('📡 Результат createLobby:', result);
            
            if (result && result.lobbyId) {
                closeModal('createGroupModal');
                
                const fullName = AppState.registeredUser ? 
                    AppState.registeredUser.firstName + ' ' + AppState.registeredUser.lastName : 
                    'Пользователь';
                
                const joinResult = await callApi('joinLobby', {
                    tgId: String(tgId),
                    fullName: fullName,
                    inviteCode: result.inviteCode
                });
                
                console.log('📡 Результат joinLobby:', joinResult);
                
                if (joinResult.success) {
                    AppState.currentLobbyId = result.lobbyId;
                    AppState.currentUser = {
                        userId: joinResult.userId,
                        lobbyId: result.lobbyId,
                        role: 'super_admin',
                        fullName: fullName
                    };
                    AppState.isAdmin = true;
                    showInviteCode(result.inviteCode);
                    showApp();
                    showToast('✅ Пространство создано!');
                } else {
                    showToast('❌ ' + (joinResult.error || 'Ошибка присоединения'));
                }
            } else {
                showToast('❌ ' + (result.error || 'Ошибка создания'));
            }
        } catch(error) {
            console.error('Create group error:', error);
            showToast('❌ Ошибка: ' + error.message);
        }
    }
    
    async function joinGroup() {
        console.log('✅ joinGroup вызвана');
        const inviteCode = DOM.inviteCode?.value?.trim() || '';
        if (!inviteCode) {
            showToast('Введите код приглашения');
            return;
        }
        
        const tgId = AppState.tg?.initDataUnsafe?.user?.id || '123456789';
        
        try {
            const fullName = AppState.registeredUser ? 
                AppState.registeredUser.firstName + ' ' + AppState.registeredUser.lastName : 
                'Пользователь';
            
            const result = await callApi('joinLobby', {
                tgId: String(tgId),
                fullName: fullName,
                inviteCode: inviteCode
            });
            
            console.log('📡 Результат joinLobby:', result);
            
            if (result.success) {
                closeModal('joinGroupModal');
                AppState.currentLobbyId = result.lobbyId;
                AppState.currentUser = {
                    userId: result.userId,
                    lobbyId: result.lobbyId,
                    role: result.role,
                    fullName: fullName
                };
                AppState.isAdmin = result.role === 'admin' || result.role === 'super_admin';
                showApp();
                showToast('✅ Добро пожаловать в пространство!');
            } else {
                showToast('❌ ' + (result.error || 'Ошибка присоединения'));
            }
        } catch(error) {
            console.error('Join group error:', error);
            showToast('❌ Ошибка: ' + error.message);
        }
    }
    
    function showInviteCode(code) {
        if (DOM.inviteCodeDisplay) DOM.inviteCodeDisplay.textContent = code;
        if (DOM.inviteCodeModal) DOM.inviteCodeModal.classList.add('active');
    }
    
    function copyInviteCode() {
        const code = DOM.inviteCodeDisplay?.textContent || '';
        navigator.clipboard.writeText(code).then(() => {
            showToast('📋 Код скопирован!');
        }).catch(() => {
            showToast('📋 Код: ' + code);
        });
    }
    
    // ==================== ГЛАВНОЕ ПРИЛОЖЕНИЕ ====================
    function showApp() {
        console.log('✅ showApp вызвана');
        
        if (DOM.actionPage) DOM.actionPage.classList.remove('active');
        if (DOM.appPage) DOM.appPage.classList.add('active');
        
        if (DOM.groupNameDisplay) DOM.groupNameDisplay.textContent = 'Workspaces';
        if (DOM.userNameDisplay) DOM.userNameDisplay.textContent = AppState.currentUser?.fullName || 'Пользователь';
        if (DOM.userNicknameDisplay) DOM.userNicknameDisplay.textContent = AppState.currentUser?.nickname || '';
        
        if (AppState.isAdmin) {
            if (DOM.adminTab) DOM.adminTab.style.display = 'flex';
            if (DOM.userRoleBadge) {
                DOM.userRoleBadge.textContent = 'Админ';
                DOM.userRoleBadge.classList.add('admin');
            }
        }
        
        updateDates();
        loadTodaySchedule();
        loadTomorrowSchedule();
        loadWeekSchedule();
        loadHomework();
        loadChatMessages();
        if (AppState.isAdmin) {
            loadAdminPanel();
        }
    }
    
    // ==================== API ВЫЗОВЫ (JSONP) ====================
    function callApiJsonp(action, params) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Date.now();
            const url = window.CONFIG.API_URL + 
                '?action=' + action + 
                '&params=' + encodeURIComponent(JSON.stringify(params)) + 
                '&callback=' + callbackName;
            
            console.log('📡 JSONP запрос:', url);
            
            window[callbackName] = function(data) {
                delete window[callbackName];
                resolve(data);
            };
            
            const script = document.createElement('script');
            script.src = url;
            script.onerror = function() {
                delete window[callbackName];
                reject(new Error('JSONP request failed'));
            };
            
            document.body.appendChild(script);
            
            // Таймаут на случай, если скрипт не загрузился
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    reject(new Error('JSONP request timeout'));
                }
            }, 10000);
        });
    }
    
    async function callApi(action, params) {
        const cacheKey = action + JSON.stringify(params);
        
        if (AppState.appCache[cacheKey]) {
            console.log('✅ Использую кэш для:', action);
            return AppState.appCache[cacheKey];
        }
        
        try {
            console.log('📡 Запрос к API через JSONP:', action);
            const data = await callApiJsonp(action, params);
            console.log('✅ Ответ от API:', data);
            
            AppState.appCache[cacheKey] = data;
            setTimeout(() => { delete AppState.appCache[cacheKey]; }, 300000);
            
            return data;
        } catch(error) {
            console.error('❌ API Error:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ==================== УПРАВЛЕНИЕ ТАБАМИ ====================
    function switchTab(tab) {
        console.log('🔄 Переключение на вкладку:', tab);
        
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        const activeTab = document.querySelector(`.tab[data-tab="${tab}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const panelId = 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1);
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.add('active');
        
        switch(tab) {
            case 'today': loadTodaySchedule(); break;
            case 'tomorrow': loadTomorrowSchedule(); break;
            case 'week': loadWeekSchedule(); break;
            case 'homework': loadHomework(); break;
            case 'chat': loadChatMessages(); break;
            case 'admin': if (AppState.isAdmin) loadAdminPanel(); break;
        }
    }
    
    // ==================== РАСПИСАНИЕ ====================
    function updateDates() {
        const now = new Date();
        const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        
        if (DOM.todayDate) DOM.todayDate.textContent = now.toLocaleDateString('ru-RU');
        if (DOM.todayWeekday) DOM.todayWeekday.textContent = weekdays[now.getDay()];
        
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (DOM.tomorrowDate) DOM.tomorrowDate.textContent = tomorrow.toLocaleDateString('ru-RU');
        if (DOM.tomorrowWeekday) DOM.tomorrowWeekday.textContent = weekdays[tomorrow.getDay()];
    }
    
    async function loadTodaySchedule() {
        if (!DOM.todaySchedule) return;
        if (!AppState.currentLobbyId) {
            DOM.todaySchedule.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Нет данных</h3></div>';
            return;
        }
        
        const cacheKey = 'today_' + AppState.currentLobbyId;
        if (AppState.scheduleCache[cacheKey]) {
            DOM.todaySchedule.innerHTML = AppState.scheduleCache[cacheKey];
            return;
        }
        
        DOM.todaySchedule.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        
        try {
            const result = await callApi('getSchedule', {
                lobbyId: AppState.currentLobbyId,
                dayOffset: 0
            });
            
            if (!result || !Array.isArray(result) || result.length === 0) {
                const html = '<div class="empty-state"><div class="icon">📭</div><h3>Нет уроков</h3></div>';
                AppState.scheduleCache[cacheKey] = html;
                DOM.todaySchedule.innerHTML = html;
                return;
            }
            
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            let html = '';
            result.forEach(function(lesson) {
                const parts = lesson.time.split(':').map(Number);
                const lessonTime = parts[0] * 60 + parts[1];
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
                
                html += '<div class="lesson-item ' + (status === 'current' ? 'current' : status === 'future' ? 'future' : '') + '">';
                html += '<div class="lesson-time">' + lesson.time + '</div>';
                html += '<div class="lesson-info">';
                html += '<div class="lesson-subject">' + lesson.subject + '</div>';
                html += '<div class="lesson-cabinet">Каб. ' + (lesson.cabinet || '-') + '</div>';
                if (lesson.isReplaced) {
                    html += '<div style="font-size:11px;color:var(--warning);">🔄 Замена</div>';
                }
                html += '</div>';
                html += '<span class="lesson-status ' + statusClass + '">' + statusLabel + '</span>';
                html += '</div>';
            });
            
            AppState.scheduleCache[cacheKey] = html;
            DOM.todaySchedule.innerHTML = html;
            
        } catch(error) {
            console.error('Load today schedule error:', error);
            DOM.todaySchedule.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
        }
    }
    
    async function loadTomorrowSchedule() {
        if (!DOM.tomorrowSchedule) return;
        if (!AppState.currentLobbyId) {
            DOM.tomorrowSchedule.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Нет данных</h3></div>';
            return;
        }
        
        const cacheKey = 'tomorrow_' + AppState.currentLobbyId;
        if (AppState.scheduleCache[cacheKey]) {
            DOM.tomorrowSchedule.innerHTML = AppState.scheduleCache[cacheKey];
            return;
        }
        
        DOM.tomorrowSchedule.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        
        try {
            const result = await callApi('getSchedule', {
                lobbyId: AppState.currentLobbyId,
                dayOffset: 1
            });
            
            if (!result || !Array.isArray(result) || result.length === 0) {
                const html = '<div class="empty-state"><div class="icon">📭</div><h3>Нет уроков</h3></div>';
                AppState.scheduleCache[cacheKey] = html;
                DOM.tomorrowSchedule.innerHTML = html;
                return;
            }
            
            let html = '';
            result.forEach(function(lesson) {
                html += '<div class="lesson-item">';
                html += '<div class="lesson-time">' + lesson.time + '</div>';
                html += '<div class="lesson-info">';
                html += '<div class="lesson-subject">' + lesson.subject + '</div>';
                html += '<div class="lesson-cabinet">Каб. ' + (lesson.cabinet || '-') + '</div>';
                html += '</div>';
                html += '</div>';
            });
            
            AppState.scheduleCache[cacheKey] = html;
            DOM.tomorrowSchedule.innerHTML = html;
            
        } catch(error) {
            console.error('Load tomorrow schedule error:', error);
            DOM.tomorrowSchedule.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
        }
    }
    
    function changeWeek(delta) {
        AppState.currentWeekOffset += delta;
        if (DOM.weekLabel) {
            DOM.weekLabel.textContent = 
                AppState.currentWeekOffset === 0 ? 'Текущая неделя' :
                AppState.currentWeekOffset > 0 ? '+' + AppState.currentWeekOffset + ' неделя' :
                AppState.currentWeekOffset + ' неделя';
        }
        loadWeekSchedule();
    }
    
    async function loadWeekSchedule() {
        if (!DOM.weekSchedule) return;
        if (!AppState.currentLobbyId) {
            DOM.weekSchedule.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Нет данных</h3></div>';
            return;
        }
        
        const cacheKey = 'week_' + AppState.currentLobbyId + '_' + AppState.currentWeekOffset;
        if (AppState.scheduleCache[cacheKey]) {
            DOM.weekSchedule.innerHTML = AppState.scheduleCache[cacheKey];
            return;
        }
        
        DOM.weekSchedule.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        
        try {
            const weekdaysFull = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay() + 1 + AppState.currentWeekOffset * 7);
            
            let html = '';
            
            for (let i = 0; i < 7; i++) {
                const date = new Date(startOfWeek);
                date.setDate(date.getDate() + i);
                
                const dayOffset = (i - (now.getDay() === 0 ? 7 : now.getDay()) + 1) + AppState.currentWeekOffset * 7;
                const result = await callApi('getSchedule', {
                    lobbyId: AppState.currentLobbyId,
                    dayOffset: dayOffset
                });
                
                const isWeekend = i >= 5;
                
                html += '<div class="day-card" style="' + (isWeekend ? 'opacity:0.6;' : '') + '">';
                html += '<div class="day-card-header">';
                html += '<span class="day-card-title">' + weekdaysFull[i] + '</span>';
                html += '<span class="day-card-date">' + date.toLocaleDateString('ru-RU') + '</span>';
                if (AppState.isAdmin) {
                    html += '<button class="btn btn-sm btn-outline" onclick="window.showToast(\'✏️ Редактирование в разработке\')">✏️</button>';
                }
                html += '</div>';
                
                if (result && result.length > 0) {
                    result.forEach(function(l) {
                        html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid var(--border-color);">';
                        html += '<span>' + l.time + ' - ' + l.subject + '</span>';
                        html += '<span style="color:var(--text-secondary);">каб. ' + (l.cabinet || '-') + '</span>';
                        html += '</div>';
                    });
                } else {
                    html += '<div style="color:var(--text-secondary);font-size:13px;padding:4px 0;">Нет уроков</div>';
                }
                
                html += '</div>';
            }
            
            AppState.scheduleCache[cacheKey] = html;
            DOM.weekSchedule.innerHTML = html;
            
        } catch(error) {
            console.error('Load week schedule error:', error);
            DOM.weekSchedule.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
        }
    }
    
    // ==================== ДОМАШНЕЕ ЗАДАНИЕ ====================
    async function loadHomework() {
        if (!DOM.homeworkContent) return;
        if (!AppState.currentLobbyId) {
            DOM.homeworkContent.innerHTML = '<div class="empty-state"><div class="icon">📝</div><h3>Нет данных</h3></div>';
            return;
        }
        
        const cacheKey = 'homework_' + AppState.currentLobbyId;
        if (AppState.homeworkCache[cacheKey]) {
            DOM.homeworkContent.innerHTML = AppState.homeworkCache[cacheKey];
            return;
        }
        
        DOM.homeworkContent.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        
        try {
            const result = await callApi('getHomework', { lobbyId: AppState.currentLobbyId });
            
            if (!result || !Array.isArray(result) || result.length === 0) {
                var html = '<div class="empty-state">';
                html += '<div class="icon">📝</div>';
                html += '<h3>Нет домашнего задания</h3>';
                if (AppState.isAdmin) {
                    html += '<button class="btn btn-primary" style="margin-top:12px;" onclick="window.showAddHomework()">➕ Добавить ДЗ</button>';
                }
                html += '</div>';
                AppState.homeworkCache[cacheKey] = html;
                DOM.homeworkContent.innerHTML = html;
                return;
            }
            
            let html = '';
            if (AppState.isAdmin) {
                html += '<button class="btn btn-primary btn-full" style="margin-bottom:12px;" onclick="window.showAddHomework()">➕ Добавить ДЗ</button>';
            }
            
            result.forEach(function(hw) {
                const done = hw.progress ? hw.progress.filter(function(p) { return p.isDone; }).length : 0;
                const total = hw.progress ? hw.progress.length : 0;
                const isDone = hw.progress ? hw.progress.some(function(p) { return p.userId === AppState.currentUser?.userId && p.isDone; }) : false;
                
                html += '<div class="card">';
                html += '<div class="homework-item">';
                html += '<div class="homework-header">';
                html += '<span class="homework-subject">' + hw.subject + '</span>';
                html += '<span class="badge ' + (isDone ? 'badge-success' : 'badge-warning') + '">';
                html += isDone ? '✅ Выполнено' : '⏳ Ожидает';
                html += '</span>';
                html += '</div>';
                html += '<div class="homework-desc">' + hw.description + '</div>';
                html += '<div class="homework-meta">';
                html += '<span>📅 до ' + (hw.dueDate || 'Не указан') + '</span>';
                html += '<span>👥 ' + done + '/' + total + ' отметок</span>';
                html += '</div>';
                html += '<div class="homework-actions">';
                if (!isDone) {
                    html += '<button class="btn btn-success btn-sm" onclick="window.markHomeworkDone(\'' + hw.id + '\')">✅ Отметить</button>';
                } else {
                    html += '<span style="color:var(--success);font-size:13px;">✅ Вы выполнили</span>';
                }
                if (AppState.isAdmin) {
                    html += '<button class="btn btn-warning btn-sm" onclick="window.showToast(\'✏️ Редактирование в разработке\')">✏️</button>';
                    html += '<button class="btn btn-danger btn-sm" onclick="window.deleteHomework(\'' + hw.id + '\')">🗑️</button>';
                }
                html += '</div>';
                html += '</div>';
                html += '</div>';
            });
            
            AppState.homeworkCache[cacheKey] = html;
            DOM.homeworkContent.innerHTML = html;
            
        } catch(error) {
            console.error('Load homework error:', error);
            DOM.homeworkContent.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
        }
    }
    
    async function markHomeworkDone(homeworkId) {
        if (!AppState.currentLobbyId || !AppState.currentUser) {
            showToast('❌ Ошибка: нет данных пользователя');
            return;
        }
        
        const result = await callApi('markHomeworkDone', {
            lobbyId: AppState.currentLobbyId,
            homeworkId: homeworkId,
            userId: AppState.currentUser.userId
        });
        
        if (result.success) {
            showToast('✅ ДЗ отмечено как выполненное!');
            AppState.homeworkCache = {};
            loadHomework();
        } else {
            showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
        }
    }
    
    function showAddHomework() {
        if (!DOM.editModal || !DOM.editModalContent) return;
        
        DOM.editModalContent.innerHTML = 
            '<h3 class="modal-title">📝 Добавить ДЗ</h3>' +
            '<div class="form-group">' +
            '<label>Предмет</label>' +
            '<input type="text" id="hwSubject" class="form-input" placeholder="Математика">' +
            '</div>' +
            '<div class="form-group">' +
            '<label>Задание</label>' +
            '<textarea id="hwDescription" class="form-input" rows="3" placeholder="Описание задания"></textarea>' +
            '</div>' +
            '<div class="form-group">' +
            '<label>Срок (дата)</label>' +
            '<input type="date" id="hwDueDate" class="form-input">' +
            '</div>' +
            '<button class="btn btn-primary btn-full" onclick="window.addHomework()">➕ Добавить</button>';
        
        DOM.editModal.classList.add('active');
    }
    
    async function addHomework() {
        const subject = document.getElementById('hwSubject')?.value?.trim() || '';
        const description = document.getElementById('hwDescription')?.value?.trim() || '';
        const dueDate = document.getElementById('hwDueDate')?.value || '';
        
        if (!subject || !description) {
            showToast('Заполните все поля');
            return;
        }
        
        if (!AppState.currentLobbyId || !AppState.currentUser) {
            showToast('❌ Ошибка: нет данных пользователя');
            return;
        }
        
        const result = await callApi('addHomework', {
            lobbyId: AppState.currentLobbyId,
            subject: subject,
            description: description,
            dueDate: dueDate || new Date().toISOString().split('T')[0],
            adminId: AppState.currentUser.userId
        });
        
        if (result.success) {
            showToast('✅ ДЗ добавлено!');
            closeModal('editModal');
            AppState.homeworkCache = {};
            loadHomework();
        } else {
            showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
        }
    }
    
    async function deleteHomework(homeworkId) {
        if (!confirm('Удалить это ДЗ?')) return;
        AppState.homeworkCache = {};
        showToast('🗑️ ДЗ удалено');
        loadHomework();
    }
    
    // ==================== ЧАТ ====================
    async function loadChatMessages() {
        if (!DOM.chatMessages) return;
        DOM.chatMessages.innerHTML = '<div class="empty-state"><div class="icon">💬</div><h3>Загрузка чата...</h3></div>';
    }
    
    function sendMessage() {
        showToast('💬 Чат загружается...');
    }
    
    // ==================== АДМИН ====================
    async function loadAdminPanel() {
        if (!DOM.adminContent) return;
        DOM.adminContent.innerHTML = '<div class="empty-state"><div class="icon">⚙️</div><h3>Загрузка админ-панели...</h3></div>';
    }
    
    // ==================== ВСПОМОГАТЕЛЬНЫЕ ====================
    function showToast(message) {
        const existing = document.querySelector('.notification-toast');
        if (existing) existing.remove
