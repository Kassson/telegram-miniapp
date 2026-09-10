// ============================================================
// APP.JS — ПОЛНАЯ ВЕРСИЯ С ИСПРАВЛЕНИЯМИ
// ============================================================

var AppTG = null;
var AppUser = null;
var AppLobbyId = null;
var AppLobbyName = null;
var AppInviteCode = null;
var AppIsAdmin = false;
var AppRegistered = null;
var WeekOffset = 0;
var AppMembers = [];
var banTimers = {};
var loadingCache = {};

// ============================================================
// УНИВЕРСАЛЬНОЕ ХРАНИЛИЩЕ
// ============================================================
var Storage = {
    cache: {},
    
    init: function(callback) {
        var self = this;
        try {
            var keys = ['user_fullname', 'user_nickname', 'lobby_id', 'lobby_name', 'invite_code', 'user_role', 'tg_id', 'theme'];
            for (var i = 0; i < keys.length; i++) {
                var val = localStorage.getItem(keys[i]);
                if (val) self.cache[keys[i]] = val;
            }
        } catch(e) {}
        
        if (AppTG && AppTG.CloudStorage) {
            var cloudKeys = ['user_fullname', 'user_nickname', 'lobby_id', 'lobby_name', 'invite_code', 'user_role', 'tg_id'];
            AppTG.CloudStorage.getItems(cloudKeys, function(err, values) {
                if (!err && values) {
                    for (var key in values) {
                        if (values[key]) {
                            self.cache[key] = values[key];
                            try { localStorage.setItem(key, values[key]); } catch(e) {}
                        }
                    }
                }
                if (callback) callback();
            });
        } else {
            if (callback) callback();
        }
    },
    
    get: function(key) { return this.cache[key] || null; },
    
    set: function(key, value) {
        this.cache[key] = value;
        try { localStorage.setItem(key, value); } catch(e) {}
        if (AppTG && AppTG.CloudStorage) {
            try { AppTG.CloudStorage.setItem(key, value, function(err) {}); } catch(e) {}
        }
    },
    
    remove: function(key) {
        delete this.cache[key];
        try { localStorage.removeItem(key); } catch(e) {}
        if (AppTG && AppTG.CloudStorage) {
            try { AppTG.CloudStorage.removeItem(key, function(err) {}); } catch(e) {}
        }
    }
};

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Приложение загружено!');
    
    clearAllInputs();
    
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            AppTG = window.Telegram.WebApp;
            AppTG.expand();
        }
    } catch(e) { console.log('Telegram не доступен'); }
    
    loadTheme();
    updateDates();
    
    Storage.init(function() {
        checkExistingSession();
    });
});

// ============================================================
// ОЧИСТКА ПОЛЕЙ ВВОДА
// ============================================================
function clearAllInputs() {
    var fields = ['regFirstName', 'regLastName', 'regNickname', 'groupName', 'inviteCode', 'editSubject', 'editCabinet'];
    for (var i = 0; i < fields.length; i++) {
        var el = document.getElementById(fields[i]);
        if (el) el.value = '';
    }
}

// ============================================================
// ПРОВЕРКА СУЩЕСТВУЮЩЕЙ СЕССИИ
// ============================================================
function checkExistingSession() {
    var savedName = Storage.get('user_fullname');
    var savedLobbyId = Storage.get('lobby_id');
    var savedInviteCode = Storage.get('invite_code');
    var savedLobbyName = Storage.get('lobby_name');
    var savedRole = Storage.get('user_role');
    var savedNickname = Storage.get('user_nickname');
    
    if (savedName && savedLobbyId && savedInviteCode) {
        AppLobbyId = savedLobbyId;
        AppLobbyName = savedLobbyName || 'Workspaces';
        AppInviteCode = savedInviteCode;
        
        var tgId = AppTG?.initDataUnsafe?.user?.id || Storage.get('tg_id');
        
        if (tgId) {
            callApi('getUser', { tgId: String(tgId) }).then(function(user) {
                if (user && user.userId) {
                    AppUser = user;
                    AppLobbyId = user.lobbyId;
                    AppIsAdmin = user.role === 'admin' || user.role === 'super_admin';
                    
                    Storage.set('lobby_id', user.lobbyId);
                    Storage.set('user_fullname', user.fullName);
                    Storage.set('user_nickname', user.nickname || '');
                    Storage.set('user_role', user.role);
                    Storage.set('tg_id', String(tgId));
                    
                    showMainApp();
                } else {
                    restoreLocalSession(savedName, savedNickname, savedRole);
                }
            }).catch(function() {
                restoreLocalSession(savedName, savedNickname, savedRole);
            });
        } else {
            restoreLocalSession(savedName, savedNickname, savedRole);
        }
    }
}

function restoreLocalSession(fullName, nickname, role) {
    AppUser = {
        userId: 'user_local',
        lobbyId: AppLobbyId,
        fullName: fullName,
        nickname: nickname || '',
        role: role || 'user'
    };
    AppIsAdmin = role === 'admin' || role === 'super_admin';
    showMainApp();
}

function showMainApp() {
    document.getElementById('registerPage').classList.remove('active');
    document.getElementById('actionPage').classList.remove('active');
    document.getElementById('appPage').classList.add('active');
    showApp();
}

// ============================================================
// ТЕМА
// ============================================================
function loadTheme() {
    var theme = Storage.get('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcons(theme);
}

function toggleTheme() {
    var html = document.documentElement;
    var current = html.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    Storage.set('theme', next);
    updateThemeIcons(next);
}

function updateThemeIcons(theme) {
    var icon = theme === 'dark' ? '☀️' : '🌙';
    // ВАЖНО: обновляем ТОЛЬКО .theme-toggle и .theme-toggle-small, НЕ трогаем .settings-btn
    var buttons = document.querySelectorAll('.theme-toggle, .theme-toggle-small');
    for (var i = 0; i < buttons.length; i++) {
        // Пропускаем кнопку настроек
        if (buttons[i].classList.contains('settings-btn')) continue;
        buttons[i].textContent = icon;
    }
    // Убеждаемся, что кнопка настроек всегда показывает шестерёнку
    var settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.textContent = '⚙️';
}

// ============================================================
// РЕГИСТРАЦИЯ С ПРОВЕРКОЙ NICKNAME
// ============================================================
function registerUser() {
    var firstName = document.getElementById('regFirstName').value.trim();
    var lastName = document.getElementById('regLastName').value.trim();
    var nickname = document.getElementById('regNickname').value.trim();
    
    if (!firstName || !lastName) {
        showToast('Введите имя и фамилию');
        return;
    }
    
    // Проверка формата никнейма
    if (nickname) {
        // Убираем @ если есть
        var cleanNick = nickname.replace('@', '');
        if (cleanNick.length < 3) {
            showToast('Никнейм должен быть минимум 3 символа');
            return;
        }
        nickname = '@' + cleanNick;
    }
    
    var fullName = firstName + ' ' + lastName;
    
    // Сохраняем
    Storage.set('user_fullname', fullName);
    Storage.set('user_nickname', nickname || '@user');
    
    var tgId = AppTG?.initDataUnsafe?.user?.id;
    if (tgId) Storage.set('tg_id', String(tgId));
    
    AppRegistered = {
        firstName: firstName,
        lastName: lastName,
        nickname: nickname || '@user'
    };
    
    document.getElementById('registerPage').classList.remove('active');
    document.getElementById('actionPage').classList.add('active');
    document.getElementById('userDisplayName').textContent = fullName;
    document.getElementById('userDisplayNickname').textContent = nickname || '@user';
    document.getElementById('userAvatar').textContent = firstName.charAt(0).toUpperCase();
}

// ============================================================
// НАСТРОЙКИ ПРОФИЛЯ С ПРОВЕРКОЙ NICKNAME
// ============================================================
function showSettings() {
    var modal = document.getElementById('editModal');
    var content = document.getElementById('editModalContent');
    
    var currentName = Storage.get('user_fullname') || '';
    var parts = currentName.split(' ');
    var firstName = parts[0] || '';
    var lastName = parts.slice(1).join(' ') || '';
    var nickname = Storage.get('user_nickname') || '';
    
    content.innerHTML = 
        '<h3 class="modal-title">⚙️ Настройки профиля</h3>' +
        '<div class="form-group"><label>Имя</label><input type="text" id="settingsFirstName" class="form-input" value="' + firstName + '"></div>' +
        '<div class="form-group"><label>Фамилия</label><input type="text" id="settingsLastName" class="form-input" value="' + lastName + '"></div>' +
        '<div class="form-group"><label>Telegram Nickname</label><input type="text" id="settingsNickname" class="form-input" value="' + nickname + '" placeholder="@username"></div>' +
        '<button class="btn btn-primary btn-full" onclick="saveSettings()">💾 Сохранить</button>';
    
    modal.classList.add('active');
}

function saveSettings() {
    var firstName = document.getElementById('settingsFirstName').value.trim();
    var lastName = document.getElementById('settingsLastName').value.trim();
    var nickname = document.getElementById('settingsNickname').value.trim();
    
    if (!firstName || !lastName) {
        showToast('Введите имя и фамилию');
        return;
    }
    
    // Очищаем ник от @
    if (nickname) {
        var cleanNick = nickname.replace('@', '');
        if (cleanNick.length < 3) {
            showToast('Никнейм должен быть минимум 3 символа');
            return;
        }
        nickname = '@' + cleanNick;
    }
    
    var fullName = firstName + ' ' + lastName;
    
    // Проверка уникальности nickname (если он изменился)
    var oldNickname = Storage.get('user_nickname');
    
    if (nickname && nickname !== oldNickname && AppLobbyId) {
        callApi('checkNickname', {
            lobbyId: AppLobbyId,
            nickname: nickname,
            userId: AppUser?.userId
        }).then(function(checkResult) {
            if (checkResult && checkResult.available === false) {
                showToast('❌ Этот никнейм уже занят');
                return;
            }
            applyProfileChanges(fullName, nickname);
        });
    } else {
        applyProfileChanges(fullName, nickname);
    }
}

function applyProfileChanges(fullName, nickname) {
    Storage.set('user_fullname', fullName);
    Storage.set('user_nickname', nickname || '@user');
    
    document.getElementById('userNameDisplay').textContent = fullName;
    document.getElementById('userNicknameDisplay').textContent = nickname || '';
    
    if (AppUser) {
        AppUser.fullName = fullName;
        AppUser.nickname = nickname;
    }
    
    if (AppUser?.userId && AppUser.userId !== 'user_local' && AppLobbyId) {
        callApi('updateUserProfile', {
            lobbyId: AppLobbyId,
            userId: AppUser.userId,
            fullName: fullName,
            nickname: nickname,
            tgUsername: nickname,
            adminId: AppUser.userId
        }).then(function(result) {
            if (result && result.success) {
                showToast('✅ Профиль сохранён!');
            } else {
                showToast('✅ Сохранено локально');
            }
            closeModal('editModal');
            loadingCache = {};
        });
    } else {
        closeModal('editModal');
        showToast('✅ Профиль сохранён!');
    }
}

// ============================================================
// ВЫХОД ИЗ ПРОСТРАНСТВА
// ============================================================
function leaveSpace() {
    if (!confirm('Вы уверены, что хотите покинуть пространство?')) return;
    
    Storage.remove('lobby_id');
    Storage.remove('lobby_name');
    Storage.remove('invite_code');
    Storage.remove('user_role');
    
    AppLobbyId = null;
    AppLobbyName = null;
    AppInviteCode = null;
    AppUser = null;
    AppIsAdmin = false;
    loadingCache = {};
    
    document.getElementById('appPage').classList.remove('active');
    document.getElementById('actionPage').classList.add('active');
    showToast('👋 Вы покинули пространство');
}

// ============================================================
// СОЗДАНИЕ / ПРИСОЕДИНЕНИЕ
// ============================================================
function showCreateGroup() {
    document.getElementById('groupName').value = '';
    document.getElementById('createGroupModal').classList.add('active');
}

function showJoinGroup() {
    document.getElementById('inviteCode').value = '';
    document.getElementById('joinGroupModal').classList.add('active');
}

function createGroup() {
    var name = document.getElementById('groupName').value.trim();
    if (!name) {
        showToast('Введите название');
        return;
    }
    
    var tgId = AppTG?.initDataUnsafe?.user?.id || Storage.get('tg_id') || '123456789';
    Storage.set('tg_id', String(tgId));
    
    showToast('⏳ Создание...');
    
    // ВАЖНО: Создаём лобби и сразу присоединяемся — но сервер проверяет, что пользователь ещё не в лобби
    callApi('createLobbyAndJoin', {
        creatorId: 'user_' + tgId,
        lobbyName: name,
        fullName: Storage.get('user_fullname') || 'Пользователь',
        tgId: String(tgId)
    }).then(function(result) {
        if (result && result.success && result.lobbyId) {
            closeModal('createGroupModal');
            
            AppLobbyId = result.lobbyId;
            AppLobbyName = name;
            AppInviteCode = result.inviteCode;
            
            Storage.set('invite_code', result.inviteCode);
            Storage.set('lobby_name', name);
            Storage.set('lobby_id', result.lobbyId);
            Storage.set('user_role', result.role);
            
            AppUser = {
                userId: result.userId,
                lobbyId: result.lobbyId,
                role: result.role,
                fullName: Storage.get('user_fullname') || 'Пользователь',
                nickname: Storage.get('user_nickname') || ''
            };
            AppIsAdmin = result.role === 'super_admin';
            
            loadingCache = {};
            showApp();
            showToast('✅ Пространство создано!');
            showInviteCode(result.inviteCode);
        } else {
            showToast('❌ ' + (result.error || 'Ошибка создания'));
        }
    }).catch(function(err) {
        showToast('❌ ' + err.message);
    });
}

function joinGroup() {
    var code = document.getElementById('inviteCode').value.trim();
    if (!code) {
        showToast('Введите код');
        return;
    }
    
    var tgId = AppTG?.initDataUnsafe?.user?.id || Storage.get('tg_id') || '123456789';
    Storage.set('tg_id', String(tgId));
    
    var fullName = Storage.get('user_fullname') || 'Пользователь';
    
    showToast('⏳ Присоединение...');
    
    callApi('joinLobby', {
        tgId: String(tgId),
        fullName: fullName,
        inviteCode: code
    }).then(function(result) {
        if (result.success) {
            closeModal('joinGroupModal');
            
            AppLobbyId = result.lobbyId;
            AppInviteCode = code;
            Storage.set('lobby_id', result.lobbyId);
            Storage.set('invite_code', code);
            Storage.set('user_role', result.role);
            
            callApi('getLobbyName', { lobbyId: result.lobbyId }).then(function(nameResult) {
                if (nameResult && nameResult.name) {
                    AppLobbyName = nameResult.name;
                    Storage.set('lobby_name', nameResult.name);
                }
            });
            
            AppUser = {
                userId: result.userId,
                lobbyId: result.lobbyId,
                role: result.role,
                fullName: fullName,
                nickname: Storage.get('user_nickname') || ''
            };
            AppIsAdmin = result.role === 'admin' || result.role === 'super_admin';
            loadingCache = {};
            showApp();
            showToast('✅ Добро пожаловать!');
        } else {
            showToast('❌ ' + (result.error || 'Ошибка'));
        }
    }).catch(function(err) {
        showToast('❌ ' + err.message);
    });
}

function showInviteCode(code) {
    var display = document.getElementById('inviteCodeDisplay');
    if (display) display.textContent = code;
    var modal = document.getElementById('inviteCodeModal');
    if (modal) modal.classList.add('active');
}

function copyInviteCode() {
    var code = document.getElementById('inviteCodeDisplay').textContent;
    navigator.clipboard.writeText(code).then(function() {
        showToast('📋 Код скопирован!');
    }).catch(function() {
        showToast('📋 Код: ' + code);
    });
}

// ============================================================
// ГЛАВНОЕ ПРИЛОЖЕНИЕ
// ============================================================
function showApp() {
    document.getElementById('actionPage').classList.remove('active');
    document.getElementById('appPage').classList.add('active');
    
    var groupNameDisplay = document.getElementById('groupNameDisplay');
    if (groupNameDisplay) {
        groupNameDisplay.textContent = AppLobbyName || AppUser?.lobbyId || 'Workspaces';
    }
    
    var inviteHeader = document.getElementById('inviteCodeDisplayHeader');
    if (inviteHeader && AppInviteCode) {
        inviteHeader.textContent = AppInviteCode;
    }
    
    var userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = AppUser?.fullName || 'Пользователь';
    }
    
    var userNicknameDisplay = document.getElementById('userNicknameDisplay');
    if (userNicknameDisplay) {
        userNicknameDisplay.textContent = AppUser?.nickname || '';
    }
    
    var adminTab = document.getElementById('adminTab');
    var scheduleEditorTab = document.getElementById('scheduleEditorTab');
    var badge = document.getElementById('userRoleBadge');
    
    if (AppIsAdmin) {
        if (adminTab) adminTab.style.display = 'flex';
        if (scheduleEditorTab) scheduleEditorTab.style.display = 'flex';
        if (badge) {
            if (AppUser?.role === 'super_admin') {
                badge.textContent = '👑 Главный админ';
                badge.classList.add('super_admin');
            } else {
                badge.textContent = 'Админ';
                badge.classList.add('admin');
            }
        }
    } else {
        if (adminTab) adminTab.style.display = 'none';
        if (scheduleEditorTab) scheduleEditorTab.style.display = 'none';
        if (badge) {
            badge.textContent = 'Участник';
            badge.classList.remove('admin', 'super_admin');
        }
    }
    
    updateDates();
    loadTodaySchedule();
    loadTomorrowSchedule();
    loadWeekSchedule();
    loadHomework();
    loadMembersCount();
    
    setTimeout(function() {
        loadingCache = {};
        loadTodaySchedule();
        loadTomorrowSchedule();
        loadWeekSchedule();
        loadHomework();
        loadMembersCount();
    }, 1500);
}

function loadMembersCount() {
    if (!AppLobbyId) return;
    
    callApi('getMembers', { lobbyId: AppLobbyId }).then(function(result) {
        if (result && Array.isArray(result)) {
            AppMembers = result;
            var badge = document.getElementById('membersBadge');
            if (badge) {
                badge.textContent = result.length;
                badge.classList.remove('hidden');
            }
        }
    });
}

// ============================================================
// API ВЫЗОВЫ
// ============================================================
function callApi(action, params) {
    return new Promise(function(resolve) {
        var cacheKey = action + '_' + JSON.stringify(params);
        
        if (loadingCache[cacheKey]) {
            var cacheEntry = loadingCache[cacheKey];
            if (Date.now() - cacheEntry.timestamp < 30000) {
                resolve(cacheEntry.data);
                return;
            }
        }
        
        executeRequest(action, params, 1, resolve);
    });
}

function executeRequest(action, params, attempt, resolve) {
    var callback = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    var url = window.CONFIG.API_URL + 
        '?action=' + action + 
        '&params=' + encodeURIComponent(JSON.stringify(params)) + 
        '&callback=' + callback;
    
    var timeoutId = setTimeout(function() {
        if (window[callback]) {
            delete window[callback];
            if (attempt < 3) {
                executeRequest(action, params, attempt + 1, resolve);
            } else {
                resolve({ success: false, error: 'timeout', _cached: true });
            }
        }
    }, 5000);
    
    window[callback] = function(data) {
        clearTimeout(timeoutId);
        delete window[callback];
        var cacheKey = action + '_' + JSON.stringify(params);
        loadingCache[cacheKey] = { data: data, timestamp: Date.now() };
        resolve(data);
    };
    
    var script = document.createElement('script');
    script.src = url;
    script.onerror = function() {
        clearTimeout(timeoutId);
        delete window[callback];
        if (attempt < 3) {
            setTimeout(function() {
                executeRequest(action, params, attempt + 1, resolve);
            }, 300);
        } else {
            resolve({ success: false, error: 'load_error', _cached: true });
        }
    };
    
    document.body.appendChild(script);
}

// ============================================================
// РАСПИСАНИЕ
// ============================================================
function updateDates() {
    var now = new Date();
    var weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    var todayEl = document.getElementById('todayDate');
    var todayWdEl = document.getElementById('todayWeekday');
    if (todayEl) todayEl.textContent = now.toLocaleDateString('ru-RU');
    if (todayWdEl) todayWdEl.textContent = weekdays[now.getDay()];
    
    var tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomEl = document.getElementById('tomorrowDate');
    var tomWdEl = document.getElementById('tomorrowWeekday');
    if (tomEl) tomEl.textContent = tomorrow.toLocaleDateString('ru-RU');
    if (tomWdEl) tomWdEl.textContent = weekdays[tomorrow.getDay()];
}

function loadTodaySchedule() {
    var container = document.getElementById('todaySchedule');
    if (!container) return;
    if (!AppLobbyId) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Нет данных</h3></div>';
        return;
    }
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    callApi('getSchedule', { lobbyId: AppLobbyId, dayOffset: 0 }).then(function(result) {
        if (!result || result._cached || !Array.isArray(result) || result.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Нет уроков</h3></div>';
            return;
        }
        var now = new Date();
        var currentTime = now.getHours() * 60 + now.getMinutes();
        var html = '';
        for (var i = 0; i < result.length; i++) {
            var lesson = result[i];
            var parts = lesson.time.split(':').map(Number);
            var lessonTime = parts[0] * 60 + parts[1];
            var endTime = lessonTime + 45;
            var status = 'future', label = '🟢 Будущий', cls = 'future';
            if (currentTime >= lessonTime && currentTime < endTime) {
                status = 'current'; label = '🔴 Идёт'; cls = 'current';
            } else if (currentTime >= endTime) {
                status = 'past'; label = '✅ Прошёл'; cls = 'past';
            }
            html += '<div class="lesson-item ' + (status === 'current' ? 'current' : status === 'future' ? 'future' : '') + '">';
            html += '<div class="lesson-time">' + lesson.time + '</div>';
            html += '<div class="lesson-info">';
            html += '<div class="lesson-subject">' + lesson.subject + '</div>';
            html += '<div class="lesson-cabinet">Каб. ' + (lesson.cabinet || '-') + '</div>';
            html += '</div>';
            html += '<span class="lesson-status ' + cls + '">' + label + '</span>';
            html += '</div>';
        }
        container.innerHTML = html;
    });
}

function loadTomorrowSchedule() {
    var container = document.getElementById('tomorrowSchedule');
    if (!container) return;
    if (!AppLobbyId) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Нет данных</h3></div>';
        return;
    }
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    callApi('getSchedule', { lobbyId: AppLobbyId, dayOffset: 1 }).then(function(result) {
        if (!result || result._cached || !Array.isArray(result) || result.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Нет уроков</h3></div>';
            return;
        }
        var html = '';
        for (var i = 0; i < result.length; i++) {
            var lesson = result[i];
            html += '<div class="lesson-item">';
            html += '<div class="lesson-time">' + lesson.time + '</div>';
            html += '<div class="lesson-info">';
            html += '<div class="lesson-subject">' + lesson.subject + '</div>';
            html += '<div class="lesson-cabinet">Каб. ' + (lesson.cabinet || '-') + '</div>';
            html += '</div></div>';
        }
        container.innerHTML = html;
    });
}

function changeWeek(delta) {
    WeekOffset += delta;
    document.getElementById('weekLabel').textContent = 
        WeekOffset === 0 ? 'Текущая неделя' :
        WeekOffset > 0 ? '+' + WeekOffset + ' неделя' :
        WeekOffset + ' неделя';
    loadWeekSchedule();
}

function loadWeekSchedule() {
    var container = document.getElementById('weekSchedule');
    if (!container) return;
    if (!AppLobbyId) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Нет данных</h3></div>';
        return;
    }
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    var dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    var now = new Date();
    var start = new Date(now);
    var dayOfWeek = now.getDay();
    var diffToMonday = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
    start.setDate(now.getDate() - diffToMonday + WeekOffset * 7);
    
    var results = new Array(7);
    var loaded = 0;
    
    for (var i = 0; i < 7; i++) {
        (function(index) {
            var date = new Date(start);
            date.setDate(date.getDate() + index);
            var offset = (index - diffToMonday) + WeekOffset * 7;
            
            callApi('getSchedule', { lobbyId: AppLobbyId, dayOffset: offset }).then(function(result) {
                results[index] = { result: result, date: date };
                loaded++;
                if (loaded === 7) {
                    var html = '';
                    for (var k = 0; k < 7; k++) {
                        var r = results[k];
                        var isWeekend = k >= 5;
                        html += '<div class="day-card" style="' + (isWeekend ? 'opacity:0.6;' : '') + '">';
                        html += '<div class="day-card-header">';
                        html += '<span class="day-card-title">' + dayNames[k] + '</span>';
                        html += '<span class="day-card-date">' + r.date.toLocaleDateString('ru-RU') + '</span>';
                        html += '</div>';
                        if (r.result && Array.isArray(r.result) && r.result.length > 0) {
                            for (var j = 0; j < r.result.length; j++) {
                                var l = r.result[j];
                                html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid var(--border-color);">';
                                html += '<span>' + l.time + ' - ' + l.subject + '</span>';
                                html += '<span style="color:var(--text-secondary);">каб. ' + (l.cabinet || '-') + '</span>';
                                html += '</div>';
                            }
                        } else {
                            html += '<div style="color:var(--text-secondary);font-size:13px;padding:4px 0;">Нет уроков</div>';
                        }
                        html += '</div>';
                    }
                    container.innerHTML = html;
                }
            });
        })(i);
    }
}

// ============================================================
// ДОМАШНЕЕ ЗАДАНИЕ
// ============================================================
function loadHomework() {
    var container = document.getElementById('homeworkContent');
    if (!container) return;
    if (!AppLobbyId) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📝</div><h3>Нет данных</h3></div>';
        return;
    }
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    callApi('getHomework', { lobbyId: AppLobbyId }).then(function(result) {
        if (!result || result._cached || !Array.isArray(result) || result.length === 0) {
            var html = '<div class="empty-state"><div class="icon">📝</div><h3>Нет домашнего задания</h3>';
            if (AppIsAdmin) {
                html += '<button class="btn btn-primary" style="margin-top:12px;" onclick="showAddHomework()">➕ Добавить ДЗ</button>';
            }
            html += '</div>';
            container.innerHTML = html;
            return;
        }
        var html = '';
        if (AppIsAdmin) {
            html += '<button class="btn btn-primary btn-full" style="margin-bottom:12px;" onclick="showAddHomework()">➕ Добавить ДЗ</button>';
        }
        for (var i = 0; i < result.length; i++) {
            var hw = result[i];
            var done = hw.progress ? hw.progress.filter(function(p) { return p.isDone; }).length : 0;
            var total = hw.progress ? hw.progress.length : 0;
            var isDone = hw.progress ? hw.progress.some(function(p) { return p.userId === AppUser?.userId && p.isDone; }) : false;
            html += '<div class="card">';
            html += '<div class="homework-item">';
            html += '<div class="homework-header">';
            html += '<span class="homework-subject">' + hw.subject + '</span>';
            html += '<span class="badge ' + (isDone ? 'badge-success' : 'badge-warning') + '">' + (isDone ? '✅ Выполнено' : '⏳ Ожидает') + '</span>';
            html += '</div>';
            html += '<div class="homework-desc">' + hw.description + '</div>';
            html += '<div class="homework-meta">';
            html += '<span>📅 до ' + (hw.dueDate || 'Не указан') + '</span>';
            html += '<span>👥 ' + done + '/' + total + ' отметок</span>';
            html += '</div>';
            html += '<div class="homework-actions">';
            if (!isDone) {
                html += '<button class="btn btn-success btn-sm" onclick="markHomeworkDone(\'' + hw.id + '\')">✅ Отметить</button>';
            } else {
                html += '<span style="color:var(--success);font-size:13px;">✅ Вы выполнили</span>';
            }
            if (AppIsAdmin) {
                html += '<button class="btn btn-danger btn-sm" onclick="deleteHomework(\'' + hw.id + '\')">🗑️</button>';
            }
            html += '</div></div></div>';
        }
        container.innerHTML = html;
    });
}

function markHomeworkDone(homeworkId) {
    if (!AppLobbyId || !AppUser) return;
    callApi('markHomeworkDone', {
        lobbyId: AppLobbyId, homeworkId: homeworkId, userId: AppUser.userId
    }).then(function(result) {
        if (result.success) {
            showToast('✅ ДЗ отмечено!');
            loadingCache = {};
            loadHomework();
        }
    });
}

function showAddHomework() {
    var content = document.getElementById('editModalContent');
    content.innerHTML = 
        '<h3 class="modal-title">📝 Добавить ДЗ</h3>' +
        '<div class="form-group"><label>Предмет</label><input type="text" id="hwSubject" class="form-input"></div>' +
        '<div class="form-group"><label>Задание</label><textarea id="hwDescription" class="form-input" rows="3"></textarea></div>' +
        '<div class="form-group"><label>Срок</label><input type="date" id="hwDueDate" class="form-input"></div>' +
        '<button class="btn btn-primary btn-full" onclick="addHomework()">➕ Добавить</button>';
    document.getElementById('editModal').classList.add('active');
}

function addHomework() {
    var subject = document.getElementById('hwSubject').value.trim();
    var description = document.getElementById('hwDescription').value.trim();
    var dueDate = document.getElementById('hwDueDate').value;
    if (!subject || !description) { showToast('Заполните все поля'); return; }
    
    callApi('addHomework', {
        lobbyId: AppLobbyId, subject: subject, description: description,
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        adminId: AppUser.userId
    }).then(function(result) {
        if (result.success) {
            showToast('✅ ДЗ добавлено!');
            closeModal('editModal');
            loadingCache = {};
            loadHomework();
        }
    });
}

function deleteHomework(homeworkId) {
    if (!confirm('Удалить это ДЗ?')) return;
    loadingCache = {};
    loadHomework();
}

// ============================================================
// УЧАСТНИКИ
// ============================================================
function loadMembers() {
    var container = document.getElementById('membersContent');
    if (!container) return;
    if (!AppLobbyId) {
        container.innerHTML = '<div class="empty-state"><div class="icon">👥</div><h3>Нет данных</h3></div>';
        return;
    }
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    callApi('getMembers', { lobbyId: AppLobbyId }).then(function(result) {
        if (!result || result._cached || !Array.isArray(result)) {
            container.innerHTML = '<div class="empty-state"><div class="icon">⏳</div><h3>Загрузка...</h3></div>';
            return;
        }
        var roleLabels = { 'super_admin': '👑 Главный админ', 'admin': '⚙️ Админ', 'user': '👤 Участник' };
        var html = '<div class="card"><h3>👥 Участники (' + result.length + ')</h3>';
        for (var i = 0; i < result.length; i++) {
            var member = result[i];
            var isSelf = member.userId === AppUser?.userId;
            var isBlocked = member.isBlocked || false;
            html += '<div class="member-item ' + (isBlocked ? 'blocked' : '') + '">';
            html += '<div class="member-info">';
            html += '<span class="member-name">' + member.fullName + '</span>';
            if (member.nickname) html += '<span class="member-nickname">' + member.nickname + '</span>';
            html += '<span class="member-role ' + (member.role === 'admin' || member.role === 'super_admin' ? member.role : '') + '">' + (roleLabels[member.role] || member.role) + '</span>';
            if (isBlocked) html += '<span class="badge badge-danger">🔒 Заблокирован</span>';
            if (isSelf) html += '<span class="badge badge-info">Вы</span>';
            html += '</div></div>';
        }
        html += '</div>';
        html += '<button class="btn btn-danger btn-full" style="margin-top:12px;" onclick="leaveSpace()">🚪 Покинуть пространство</button>';
        container.innerHTML = html;
    });
}

// ============================================================
// ЧАТ
// ============================================================
function loadChatMessages() {
    var container = document.getElementById('chatMessages');
    if (!container) return;
    if (!AppLobbyId) {
        container.innerHTML = '<div class="empty-state"><div class="icon">💬</div><h3>Нет данных</h3></div>';
        return;
    }
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    callApi('getChatMessages', { lobbyId: AppLobbyId, offset: 0, limit: 50 }).then(function(result) {
        if (!result || result._cached || !Array.isArray(result) || result.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">💬</div><h3>Нет сообщений</h3><p>Начните общение!</p></div>';
            return;
        }
        var html = '';
        var userId = AppUser?.userId;
        for (var i = 0; i < result.length; i++) {
            var msg = result[i];
            var isOwn = msg.userId === userId;
            html += '<div class="chat-message ' + (isOwn ? 'own' : 'other') + '">';
            if (!isOwn) html += '<div class="msg-sender">' + (msg.senderName || 'Пользователь') + '</div>';
            html += '<div>' + msg.text + '</div>';
            html += '<span class="msg-time">' + (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : '') + '</span>';
            html += '</div>';
        }
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    });
}

function sendMessage() {
    var input = document.getElementById('chatInput');
    var text = input?.value?.trim();
    if (!text || !AppLobbyId || !AppUser) return;
    
    callApi('sendChatMessage', {
        lobbyId: AppLobbyId,
        userId: AppUser.userId,
        senderName: AppUser.fullName || 'Пользователь',
        text: text,
        createdAt: new Date().toISOString()
    }).then(function(result) {
        if (result.success) {
            input.value = '';
            loadingCache = {};
            loadChatMessages();
        }
    });
}

// ============================================================
// АДМИН ПАНЕЛЬ
// ============================================================
function loadAdminPanel() {
    var container = document.getElementById('adminContent');
    if (!container) return;
    if (!AppLobbyId) {
        container.innerHTML = '<div class="empty-state"><div class="icon">⚙️</div><h3>Нет данных</h3></div>';
        return;
    }
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    callApi('getMembers', { lobbyId: AppLobbyId }).then(function(result) {
        if (!result || result._cached || !Array.isArray(result)) {
            container.innerHTML = '<div class="empty-state"><div class="icon">⏳</div><h3>Загрузка...</h3></div>';
            return;
        }
        
        var roleLabels = { 'super_admin': '👑 Главный админ', 'admin': '⚙️ Админ', 'user': '👤 Участник' };
        var html = '<div class="admin-section"><div class="admin-section-title">👥 Участники (' + result.length + ')</div><div class="card">';
        html += '<button class="btn btn-sm btn-primary" style="margin-bottom:12px;width:100%;" onclick="showInviteCode(\'' + (AppInviteCode || '') + '\')">📋 Код приглашения</button>';
        
        for (var i = 0; i < result.length; i++) {
            var member = result[i];
            var isSelf = member.userId === AppUser?.userId;
            var canManage = AppUser?.role === 'super_admin' || 
                           (AppUser?.role === 'admin' && member.role !== 'super_admin');
            var isBlocked = member.isBlocked || false;
            
            html += '<div class="member-item ' + (isBlocked ? 'blocked' : '') + '">';
            html += '<div class="member-info">';
            html += '<span class="member-name">' + member.fullName + '</span>';
            if (member.nickname) html += '<span class="member-nickname">' + member.nickname + '</span>';
            html += '<span class="member-role ' + (member.role === 'admin' || member.role === 'super_admin' ? member.role : '') + '">' + (roleLabels[member.role] || member.role) + '</span>';
            if (isBlocked) html += '<span class="badge badge-danger">🔒 Заблокирован</span>';
            if (isSelf) html += '<span class="badge badge-info">Вы</span>';
            html += '</div>';
            
            if (!isSelf && canManage) {
                html += '<div class="member-actions">';
                html += '<button class="btn btn-sm ' + (isBlocked ? 'btn-success' : 'btn-danger') + '" onclick="toggleUserBlock(\'' + member.userId + '\')">';
                html += isBlocked ? '🔓 Разблокировать' : '🔒 Заблокировать';
                html += '</button>';
                if (member.role !== 'admin' && member.role !== 'super_admin') {
                    html += '<button class="btn btn-sm btn-primary" onclick="makeAdmin(\'' + member.userId + '\')">👑 Назначить админом</button>';
                } else if (AppUser?.role === 'super_admin' && member.role === 'admin') {
                    html += '<button class="btn btn-sm btn-warning" onclick="removeAdmin(\'' + member.userId + '\')">⬇️ Снять с админа</button>';
                }
                html += '<button class="btn btn-sm btn-warning" onclick="showNicknameModal(\'' + member.userId + '\')">✏️</button>';
                html += '<button class="btn btn-sm btn-danger" onclick="kickUser(\'' + member.userId + '\')">🚫 Исключить</button>';
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div></div>';
        html += '<button class="btn btn-danger btn-full" style="margin-top:12px;" onclick="leaveSpace()">🚪 Покинуть пространство</button>';
        container.innerHTML = html;
    });
}

function toggleUserBlock(userId) {
    var member = AppMembers.find(function(m) { return m.userId === userId; });
    var isBlocked = member ? member.isBlocked : false;
    
    if (isBlocked) {
        callApi('toggleBlock', { lobbyId: AppLobbyId, userId: userId, adminId: AppUser.userId }).then(function(result) {
            if (result.success) {
                showToast('🔓 Пользователь разблокирован');
                delete banTimers[userId];
                loadingCache = {};
                loadAdminPanel();
                loadMembers();
            }
        });
    } else {
        showBanDurationModal(userId);
    }
}

function showBanDurationModal(userId) {
    var content = document.getElementById('editModalContent');
    content.innerHTML = 
        '<h3 class="modal-title">🔒 Блокировка пользователя</h3>' +
        '<div class="form-group"><label>Время блокировки</label><select id="banDuration" class="form-input">' +
        '<option value="5">5 минут</option><option value="15">15 минут</option><option value="30">30 минут</option>' +
        '<option value="60">1 час</option><option value="120">2 часа</option><option value="360">6 часов</option>' +
        '<option value="720">12 часов</option><option value="1440">24 часа</option><option value="0">Навсегда</option>' +
        '</select></div>' +
        '<button class="btn btn-danger btn-full" onclick="confirmBan(\'' + userId + '\')">🔒 Заблокировать</button>' +
        '<button class="btn btn-outline btn-full" style="margin-top:8px;" onclick="closeModal(\'editModal\')">Отмена</button>';
    document.getElementById('editModal').classList.add('active');
}

function confirmBan(userId) {
    var duration = parseInt(document.getElementById('banDuration').value);
    closeModal('editModal');
    
    callApi('toggleBlock', { lobbyId: AppLobbyId, userId: userId, adminId: AppUser.userId }).then(function(result) {
        if (result.success) {
            showToast('🔒 Пользователь заблокирован');
            if (duration > 0) {
                banTimers[userId] = Date.now() + duration * 60000;
                setTimeout(function() {
                    callApi('toggleBlock', { lobbyId: AppLobbyId, userId: userId, adminId: AppUser.userId }).then(function() {
                        delete banTimers[userId];
                        loadingCache = {};
                        loadAdminPanel();
                        loadMembers();
                    });
                }, duration * 60000);
            }
            loadingCache = {};
            loadAdminPanel();
            loadMembers();
        }
    });
}

function makeAdmin(userId) {
    if (!confirm('Назначить этого пользователя администратором?')) return;
    callApi('setRole', { lobbyId: AppLobbyId, userId: userId, role: 'admin', adminId: AppUser.userId }).then(function(result) {
        if (result.success) {
            showToast('👑 Пользователь назначен админом!');
            loadingCache = {};
            loadAdminPanel();
            loadMembers();
        }
    });
}

function removeAdmin(userId) {
    if (!confirm('Снять с пользователя права администратора?')) return;
    callApi('setRole', { lobbyId: AppLobbyId, userId: userId, role: 'user', adminId: AppUser.userId }).then(function(result) {
        if (result.success) {
            showToast('⬇️ Права сняты');
            loadingCache = {};
            loadAdminPanel();
            loadMembers();
        }
    });
}

function showNicknameModal(userId) {
    var content = document.getElementById('editModalContent');
    content.innerHTML = 
        '<h3 class="modal-title">✏️ Назначить никнейм</h3>' +
        '<div class="form-group"><label>Никнейм</label><input type="text" id="nicknameInput" class="form-input" placeholder="Например: Староста"></div>' +
        '<button class="btn btn-primary btn-full" onclick="setNickname(\'' + userId + '\')">💾 Сохранить</button>';
    document.getElementById('editModal').classList.add('active');
}

function setNickname(userId) {
    var nickname = document.getElementById('nicknameInput').value.trim();
    if (!nickname) { showToast('Введите никнейм'); return; }
    
    // Проверка уникальности
    callApi('checkNickname', {
        lobbyId: AppLobbyId,
        nickname: nickname,
        userId: userId
    }).then(function(checkResult) {
        if (checkResult && checkResult.available === false) {
            showToast('❌ Этот никнейм уже занят');
            return;
        }
        
        callApi('setNickname', { lobbyId: AppLobbyId, userId: userId, nickname: nickname, adminId: AppUser.userId }).then(function(result) {
            if (result.success) {
                showToast('✅ Никнейм назначен!');
                closeModal('editModal');
                loadingCache = {};
                loadAdminPanel();
                loadMembers();
            }
        });
    });
}

function kickUser(userId) {
    if (!confirm('Вы уверены, что хотите исключить этого пользователя?')) return;
    callApi('kickUser', { lobbyId: AppLobbyId, userId: userId, adminId: AppUser.userId }).then(function(result) {
        if (result.success) {
            showToast('🚫 Пользователь исключён');
            loadingCache = {};
            loadAdminPanel();
            loadMembers();
        }
    });
}

// ============================================================
// РЕДАКТОР РАСПИСАНИЯ
// ============================================================
function loadScheduleEditor() {
    var container = document.getElementById('scheduleEditorContent');
    if (!container) return;
    if (!AppLobbyId) {
        container.innerHTML = '<div class="schedule-editor-empty"><div class="icon">📭</div><p>Нет данных</p></div>';
        return;
    }
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    var weekdays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    var allLessons = [];
    var loaded = 0;
    
    for (var i = 0; i < weekdays.length; i++) {
        (function(index) {
            var day = weekdays[index];
            callApi('getScheduleByDay', { lobbyId: AppLobbyId, day: day }).then(function(result) {
                if (result && Array.isArray(result)) {
                    for (var j = 0; j < result.length; j++) {
                        allLessons.push({
                            day: day, time: result[j].time,
                            subject: result[j].subject, cabinet: result[j].cabinet || '-'
                        });
                    }
                }
                loaded++;
                if (loaded === weekdays.length) renderScheduleEditor(allLessons);
            });
        })(i);
    }
}

function renderScheduleEditor(lessons) {
    var container = document.getElementById('scheduleEditorContent');
    if (!container) return;
    if (lessons.length === 0) {
        container.innerHTML = '<div class="schedule-editor-empty"><div class="icon">📋</div><p>Расписание пусто</p></div>';
        return;
    }
    var html = '';
    for (var i = 0; i < lessons.length; i++) {
        var lesson = lessons[i];
        html += '<div class="schedule-editor-item">';
        html += '<div class="lesson-info">';
        html += '<span class="lesson-day">' + lesson.day + '</span>';
        html += '<span class="lesson-time">' + lesson.time + '</span>';
        html += '<span class="lesson-subject">' + lesson.subject + '</span>';
        html += '<span class="lesson-cabinet">каб. ' + lesson.cabinet + '</span>';
        html += '</div>';
        html += '<button class="delete-btn" onclick="deleteScheduleLesson(\'' + lesson.day + '\', \'' + lesson.time + '\')">✕</button>';
        html += '</div>';
    }
    container.innerHTML = html;
}

function addScheduleLesson() {
    var day = document.getElementById('editDay').value;
    var time = document.getElementById('editTime').value;
    var subject = document.getElementById('editSubject').value.trim();
    var cabinet = document.getElementById('editCabinet').value.trim();
    if (!subject) { showToast('Введите предмет'); return; }
    
    callApi('addScheduleLesson', {
        lobbyId: AppLobbyId, day: day, time: time,
        subject: subject, cabinet: cabinet || '-', adminId: AppUser.userId
    }).then(function(result) {
        if (result.success) {
            showToast('✅ Урок добавлен!');
            document.getElementById('editSubject').value = '';
            document.getElementById('editCabinet').value = '';
            loadingCache = {};
            loadScheduleEditor();
            loadTodaySchedule();
            loadTomorrowSchedule();
            loadWeekSchedule();
        }
    });
}

function deleteScheduleLesson(day, time) {
    if (!confirm('Удалить урок на ' + day + ' в ' + time + '?')) return;
    callApi('deleteScheduleLesson', { lobbyId: AppLobbyId, day: day, time: time, adminId: AppUser.userId }).then(function(result) {
        if (result.success) {
            showToast('🗑️ Урок удалён');
            loadingCache = {};
            loadScheduleEditor();
            loadTodaySchedule();
            loadTomorrowSchedule();
            loadWeekSchedule();
        }
    });
}

function clearAllSchedule() {
    if (!confirm('Очистить ВСЁ расписание?')) return;
    callApi('clearSchedule', { lobbyId: AppLobbyId, adminId: AppUser.userId }).then(function(result) {
        if (result.success) {
            showToast('🗑️ Расписание очищено');
            loadingCache = {};
            loadScheduleEditor();
        }
    });
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ
// ============================================================
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

function switchTab(tab) {
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    var activeTab = document.querySelector('.tab[data-tab="' + tab + '"]');
    if (activeTab) activeTab.classList.add('active');
    
    var panels = document.querySelectorAll('.tab-panel');
    for (var j = 0; j < panels.length; j++) panels[j].classList.remove('active');
    var panel = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (panel) panel.classList.add('active');
    
    if (tab === 'today') loadTodaySchedule();
    else if (tab === 'tomorrow') loadTomorrowSchedule();
    else if (tab === 'week') loadWeekSchedule();
    else if (tab === 'homework') loadHomework();
    else if (tab === 'members') loadMembers();
    else if (tab === 'chat') loadChatMessages();
    else if (tab === 'scheduleEditor' && AppIsAdmin) loadScheduleEditor();
    else if (tab === 'admin' && AppIsAdmin) loadAdminPanel();
}
