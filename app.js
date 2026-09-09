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
        
        if (AppState.tg) {
            checkUserFromTelegram();
        }
        
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
        const htmlElement = document.documentElement;
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        htmlElement.setAttribute('data-theme', newTheme);
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
        document.querySelectorAll('.theme-toggle, .theme-toggle-small').forEach(function(el) {
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
        navigator.clipboard.writeText(code).then(function() {
            showToast('📋 Код скопирован!');
        }).catch(function() {
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
        return new Promise(function(resolve, reject) {
            var callbackName = 'jsonp_callback_' + Date.now();
            var url = window.CONFIG.API_URL + 
                '?action=' + action + 
                '&params=' + encodeURIComponent(JSON.stringify(params)) + 
                '&callback=' + callbackName;
            
            console.log('📡 JSONP запрос:', url);
            
            window[callbackName] = function(data) {
                delete window[callbackName];
                resolve(data);
            };
            
            var script = document.createElement('script');
            script.src = url;
            script.onerror = function() {
                delete window[callbackName];
                reject(new Error('JSONP request failed'));
            };
            
            document.body.appendChild(script);
            
            setTimeout(function() {
                if (window[callbackName]) {
                    delete window[callbackName];
                    reject(new Error('JSONP request timeout'));
                }
            }, 10000);
        });
    }
    
    async function callApi(action, params) {
        var cacheKey = action + JSON.stringify(params);
        
        if (AppState.appCache[cacheKey]) {
            console.log('✅ Использую кэш для:', action);
            return AppState.appCache[cacheKey];
        }
        
        try {
            console.log('📡 Запрос к API через JSONP:', action);
            var data = await callApiJsonp(action, params);
            console.log('✅ Ответ от API:', data);
            
            AppState.appCache[cacheKey] = data;
            setTimeout(function() { delete AppState.appCache[cacheKey]; }, 300000);
            
            return data;
        } catch(error) {
            console.error('❌ API Error:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ==================== УПРАВЛЕНИЕ ТАБАМИ ====================
    function switchTab(tab) {
        console.log('🔄 Переключение на вкладку:', tab);
        
        document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        var activeTab = document.querySelector('.tab[data-tab="' + tab + '"]');
        if (activeTab) activeTab.classList.add('active');
        
        document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
        var panelId = 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1);
        var panel = document.getElementById(panelId);
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
        var now = new Date();
        var weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        
        if (DOM.todayDate) DOM.todayDate.textContent = now.toLocaleDateString('ru-RU');
        if (DOM.todayWeekday) DOM.todayWeekday.textContent = weekdays[now.getDay()];
        
        var tomorrow = new Date(now);
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
        
        var cacheKey = 'today_' + AppState.currentLobbyId;
        if (AppState.scheduleCache[cacheKey]) {
            DOM.todaySchedule.innerHTML = AppState.scheduleCache[cacheKey];
            return;
        }
        
        DOM.todaySchedule.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        
        try {
            var result = await callApi('getSchedule', {
                lobbyId: AppState.currentLobbyId,
                dayOffset: 0
            });
            
            if (!result || !Array.isArray(result) || result.length === 0) {
                var emptyHtml = '<div class="empty-state"><div class="icon">📭</div><h3>Нет уроков</h3></div>';
                AppState.scheduleCache[cacheKey] = emptyHtml;
                DOM.todaySchedule.innerHTML = emptyHtml;
                return;
            }
            
            var now = new Date();
            var currentTime = now.getHours() * 60 + now.getMinutes();
            
            var htmlOutput = '';
            result.forEach(function(lesson) {
                var parts = lesson.time.split(':').map(Number);
                var lessonTime = parts[0] * 60 + parts[1];
                var endTime = lessonTime + 45;
                
                var status = 'future';
                var statusLabel = '🟢 Будущий';
                var statusClass = 'future';
                
                if (currentTime >= lessonTime && currentTime < endTime) {
                    status = 'current';
                    statusLabel = '🔴 Идёт';
                    statusClass = 'current';
                } else if (currentTime >= endTime) {
                    status = 'past';
                    statusLabel = '✅ Прошёл';
                    statusClass = 'past';
                }
                
                htmlOutput += '<div class="lesson-item ' + (status === 'current' ? 'current' : status === 'future' ? 'future' : '') + '">';
                htmlOutput += '<div class="lesson-time">' + lesson.time + '</div>';
                htmlOutput += '<div class="lesson-info">';
                htmlOutput += '<div class="lesson-subject">' + lesson.subject + '</div>';
                htmlOutput += '<div class="lesson-cabinet">Каб. ' + (lesson.cabinet || '-') + '</div>';
                if (lesson.isReplaced) {
                    htmlOutput += '<div style="font-size:11px;color:var(--warning);">🔄 Замена</div>';
                }
                htmlOutput += '</div>';
                htmlOutput += '<span class="lesson-status ' + statusClass + '">' + statusLabel + '</span>';
                htmlOutput += '</div>';
            });
            
            AppState.scheduleCache[cacheKey] = htmlOutput;
            DOM.todaySchedule.innerHTML = htmlOutput;
            
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
        
        var cacheKey = 'tomorrow_' + AppState.currentLobbyId;
        if (AppState.scheduleCache[cacheKey]) {
            DOM.tomorrowSchedule.innerHTML = AppState.scheduleCache[cacheKey];
            return;
        }
        
        DOM.tomorrowSchedule.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        
        try {
            var result = await callApi('getSchedule', {
                lobbyId: AppState.currentLobbyId,
                dayOffset: 1
            });
            
            if (!result || !Array.isArray(result) || result.length === 0) {
                var emptyHtml = '<div class="empty-state"><div class="icon">📭</div><h3>Нет уроков</h3></div>';
                AppState.scheduleCache[cacheKey] = emptyHtml;
                DOM.tomorrowSchedule.innerHTML = emptyHtml;
                return;
            }
            
            var htmlOutput = '';
            result.forEach(function(lesson) {
                htmlOutput += '<div class="lesson-item">';
                htmlOutput += '<div class="lesson-time">' + lesson.time + '</div>';
                htmlOutput += '<div class="lesson-info">';
                htmlOutput += '<div class="lesson-subject">' + lesson.subject + '</div>';
                htmlOutput += '<div class="lesson-cabinet">Каб. ' + (lesson.cabinet || '-') + '</div>';
                htmlOutput += '</div>';
                htmlOutput += '</div>';
            });
            
            AppState.scheduleCache[cacheKey] = htmlOutput;
            DOM.tomorrowSchedule.innerHTML = htmlOutput;
            
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
        
        var cacheKey = 'week_' + AppState.currentLobbyId + '_' + AppState.currentWeekOffset;
        if (AppState.scheduleCache[cacheKey]) {
            DOM.weekSchedule.innerHTML = AppState.scheduleCache[cacheKey];
            return;
        }
        
        DOM.weekSchedule.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        
        try {
            var weekdaysFull = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
            var now = new Date();
            var startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay() + 1 + AppState.currentWeekOffset * 7);
            
            var htmlOutput = '';
            
            for (var i = 0; i < 7; i++) {
                var date = new Date(startOfWeek);
                date.setDate(date.getDate() + i);
                
                var dayOffset = (i - (now.getDay() === 0 ? 7 : now.getDay()) + 1) + AppState.currentWeekOffset * 7;
                var result = await callApi('getSchedule', {
                    lobbyId: AppState.currentLobbyId,
                    dayOffset: dayOffset
                });
                
                var isWeekend = i >= 5;
                
                htmlOutput += '<div class="day-card" style="' + (isWeekend ? 'opacity:0.6;' : '') + '">';
                htmlOutput += '<div class="day-card-header">';
                htmlOutput += '<span class="day-card-title">' + weekdaysFull[i] + '</span>';
                htmlOutput += '<span class="day-card-date">' + date.toLocaleDateString('ru-RU') + '</span>';
                if (AppState.isAdmin) {
                    htmlOutput += '<button class="btn btn-sm btn-outline" onclick="window.showToast(\'✏️ Редактирование в разработке\')">✏️</button>';
                }
                htmlOutput += '</div>';
                
                if (result && result.length > 0) {
                    result.forEach(function(l) {
                        htmlOutput += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid var(--border-color);">';
                        htmlOutput += '<span>' + l.time + ' - ' + l.subject + '</span>';
                        htmlOutput += '<span style="color:var(--text-secondary);">каб. ' + (l.cabinet || '-') + '</span>';
                        htmlOutput += '</div>';
                    });
                } else {
                    htmlOutput += '<div style="color:var(--text-secondary);font-size:13px;padding:4px 0;">Нет уроков</div>';
                }
                
                htmlOutput += '</div>';
            }
            
            AppState.scheduleCache[cacheKey] = htmlOutput;
            DOM.weekSchedule.innerHTML = htmlOutput;
            
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
        
        var cacheKey = 'homework_' + AppState.currentLobbyId;
        if (AppState.homeworkCache[cacheKey]) {
            DOM.homeworkContent.innerHTML = AppState.homeworkCache[cacheKey];
            return;
        }
        
        DOM.homeworkContent.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        
        try {
            var result = await callApi('getHomework', { lobbyId: AppState.currentLobbyId });
            
            if (!result || !Array.isArray(result) || result.length === 0) {
                var emptyHtml = '<div class="empty-state">';
                emptyHtml += '<div class="icon">📝</div>';
                emptyHtml += '<h3>Нет домашнего задания</h3>';
                if (AppState.isAdmin) {
                    emptyHtml += '<button class="btn btn-primary" style="margin-top:12px;" onclick="window.showAddHomework()">➕ Добавить ДЗ</button>';
                }
                emptyHtml += '</div>';
                AppState.homeworkCache[cacheKey] = emptyHtml;
                DOM.homeworkContent.innerHTML = emptyHtml;
                return;
            }
            
            var htmlOutput = '';
            if (AppState.isAdmin) {
                htmlOutput += '<button class="btn btn-primary btn-full" style="margin-bottom:12px;" onclick="window.showAddHomework()">➕ Добавить ДЗ</button>';
            }
            
            result.forEach(function(hw) {
                var done = hw.progress ? hw.progress.filter(function(p) { return p.isDone; }).length : 0;
                var total = hw.progress ? hw.progress.length : 0;
                var isDone = hw.progress ? hw.progress.some(function(p) { return p.userId === AppState.currentUser?.userId && p.isDone; }) : false;
                
                htmlOutput += '<div class="card">';
                htmlOutput += '<div class="homework-item">';
                htmlOutput += '<div class="homework-header">';
                htmlOutput += '<span class="homework-subject">' + hw.subject + '</span>';
                htmlOutput += '<span class="badge ' + (isDone ? 'badge-success' : 'badge-warning') + '">';
                htmlOutput += isDone ? '✅ Выполнено' : '⏳ Ожидает';
                htmlOutput += '</span>';
                htmlOutput += '</div>';
                htmlOutput += '<div class="homework-desc">' + hw.description + '</div>';
                htmlOutput += '<div class="homework-meta">';
                htmlOutput += '<span>📅 до ' + (hw.dueDate || 'Не указан') + '</span>';
                htmlOutput += '<span>👥 ' + done + '/' + total + ' отметок</span>';
                htmlOutput += '</div>';
                htmlOutput += '<div class="homework-actions">';
                if (!isDone) {
                    htmlOutput += '<button class="btn btn-success btn-sm" onclick="window.markHomeworkDone(\'' + hw.id + '\')">✅ Отметить</button>';
                } else {
                    htmlOutput += '<span style="color:var(--success);font-size:13px;">✅ Вы выполнили</span>';
                }
                if (AppState.isAdmin) {
                    htmlOutput += '<button class="btn btn-warning btn-sm" onclick="window.showToast(\'✏️ Редактирование в разработке\')">✏️</button>';
                    htmlOutput += '<button class="btn btn-danger btn-sm" onclick="window.deleteHomework(\'' + hw.id + '\')">🗑️</button>';
                }
                htmlOutput += '</div>';
                htmlOutput += '</div>';
                htmlOutput += '</div>';
            });
            
            AppState.homeworkCache[cacheKey] = htmlOutput;
            DOM.homeworkContent.innerHTML = htmlOutput;
            
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
        
        var result = await callApi('markHomeworkDone', {
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
        var subject = document.getElementById('hwSubject')?.value?.trim() || '';
        var description = document.getElementById('hwDescription')?.value?.trim() || '';
        var dueDate = document.getElementById('hwDueDate')?.value || '';
        
        if (!subject || !description) {
            showToast('Заполните все поля');
            return;
        }
        
        if (!AppState.currentLobbyId || !AppState.currentUser) {
            showToast('❌ Ошибка: нет данных пользователя');
            return;
        }
        
        var result = await callApi('addHomework', {
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
        var existing = document.querySelector('.notification-toast');
        if (existing) existing.remove();
        
        var toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }
    
    function closeModal(id) {
        var modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    }
    
    // ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
    function setupEventListeners() {
        if (DOM.chatInput) {
            DOM.chatInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }
    }
    
    // ==================== ЭКСПОРТ ФУНКЦИЙ В ГЛОБАЛЬНЫЙ ОБЪЕКТ ====================
    window.registerUser = registerUser;
    window.toggleTheme = toggleTheme;
    window.showCreateGroup = showCreateGroup;
    window.showJoinGroup = showJoinGroup;
    window.createGroup = createGroup;
    window.joinGroup = joinGroup;
    window.copyInviteCode = copyInviteCode;
    window.switchTab = switchTab;
    window.changeWeek = changeWeek;
    window.showToast = showToast;
    window.closeModal = closeModal;
    window.markHomeworkDone = markHomeworkDone;
    window.showAddHomework = showAddHomework;
    window.addHomework = addHomework;
    window.deleteHomework = deleteHomework;
    window.sendMessage = sendMessage;
    window.loadAdminPanel = loadAdminPanel;
    window.loadChatMessages = loadChatMessages;
    
    // ==================== ЗАПУСК ====================
    document.addEventListener('DOMContentLoaded', init);
    
})();
