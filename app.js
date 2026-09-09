// ============================================================
// APP.JS — ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
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

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Приложение загружено!');
    
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            AppTG = window.Telegram.WebApp;
            AppTG.expand();
            var user = AppTG.initDataUnsafe?.user;
            if (user) {
                document.getElementById('regFirstName').value = user.first_name || '';
                document.getElementById('regLastName').value = user.last_name || '';
                document.getElementById('regNickname').value = user.username ? '@' + user.username : '';
            }
        }
    } catch(e) { console.log('Telegram не доступен'); }
    
    loadTheme();
    updateDates();
    loadSavedData();
    checkExistingSession();
});

// ============================================================
// ЗАГРУЗКА СОХРАНЁННЫХ ДАННЫХ
// ============================================================
function loadSavedData() {
    var savedName = localStorage.getItem('user_fullname');
    var savedNick = localStorage.getItem('user_nickname');
    var savedCode = localStorage.getItem('invite_code');
    var savedLobbyId = localStorage.getItem('lobby_id');
    var savedLobbyName = localStorage.getItem('lobby_name');
    
    if (savedName) {
        var parts = savedName.split(' ');
        document.getElementById('regFirstName').value = parts[0] || '';
        document.getElementById('regLastName').value = parts.slice(1).join(' ') || '';
    }
    if (savedNick) {
        document.getElementById('regNickname').value = savedNick;
    }
    if (savedCode) {
        AppInviteCode = savedCode;
    }
    if (savedLobbyId) {
        AppLobbyId = savedLobbyId;
    }
    if (savedLobbyName) {
        AppLobbyName = savedLobbyName;
    }
}

function checkExistingSession() {
    if (AppLobbyId && AppInviteCode) {
        // Пытаемся восстановить сессию
        var savedName = localStorage.getItem('user_fullname');
        if (savedName) {
            AppUser = {
                fullName: savedName,
                nickname: localStorage.getItem('user_nickname') || '',
                lobbyId: AppLobbyId
            };
            document.getElementById('registerPage').classList.remove('active');
            document.getElementById('actionPage').classList.remove('active');
            document.getElementById('appPage').classList.add('active');
            showApp();
        }
    }
}

// ============================================================
// ТЕМА
// ============================================================
function loadTheme() {
    var theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcons(theme);
}

function toggleTheme() {
    var html = document.documentElement;
    var current = html.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcons(next);
}

function updateThemeIcons(theme) {
    var icon = theme === 'dark' ? '☀️' : '🌙';
    var buttons = document.querySelectorAll('.theme-toggle, .theme-toggle-small');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].textContent = icon;
    }
}

// ============================================================
// РЕГИСТРАЦИЯ
// ============================================================
function registerUser() {
    var firstName = document.getElementById('regFirstName').value.trim();
    var lastName = document.getElementById('regLastName').value.trim();
    var nickname = document.getElementById('regNickname').value.trim();
    
    if (!firstName || !lastName) {
        showToast('Введите имя и фамилию');
        return;
    }
    
    AppRegistered = {
        firstName: firstName,
        lastName: lastName,
        nickname: nickname || '@user'
    };
    
    localStorage.setItem('user_fullname', firstName + ' ' + lastName);
    localStorage.setItem('user_nickname', nickname || '@user');
    
    document.getElementById('registerPage').classList.remove('active');
    document.getElementById('actionPage').classList.add('active');
    document.getElementById('userDisplayName').textContent = firstName + ' ' + lastName;
    document.getElementById('userDisplayNickname').textContent = nickname || '@user';
    document.getElementById('userAvatar').textContent = firstName.charAt(0).toUpperCase();
}

// ============================================================
// ВЫХОД ИЗ ПРОСТРАНСТВА
// ============================================================
function leaveSpace() {
    if (!confirm('Вы уверены, что хотите покинуть пространство?')) return;
    
    localStorage.removeItem('lobby_id');
    localStorage.removeItem('lobby_name');
    localStorage.removeItem('invite_code');
    AppLobbyId = null;
    AppLobbyName = null;
    AppInviteCode = null;
    AppUser = null;
    AppIsAdmin = false;
    
    document.getElementById('appPage').classList.remove('active');
    document.getElementById('actionPage').classList.add('active');
    showToast('👋 Вы покинули пространство');
}

// ============================================================
// СОЗДАНИЕ / ПРИСОЕДИНЕНИЕ
// ============================================================
function showCreateGroup() {
    document.getElementById('createGroupModal').classList.add('active');
}

function showJoinGroup() {
    document.getElementById('joinGroupModal').classList.add('active');
}

function createGroup() {
    var name = document.getElementById('groupName').value.trim();
    if (!name) {
        showToast('Введите название');
        return;
    }
    
    var tgId = AppTG?.initDataUnsafe?.user?.id || '123456789';
    showToast('⏳ Создание...');
    
    callApi('createLobby', {
        creatorId: 'user_' + tgId,
        lobbyName: name
    }).then(function(result) {
        console.log('createLobby ответ:', result);
        if (result && result.lobbyId) {
            closeModal('createGroupModal');
            AppInviteCode = result.inviteCode;
            AppLobbyName = name;
            localStorage.setItem('invite_code', result.inviteCode);
            localStorage.setItem('lobby_name', name);
            
            var fullName = AppRegistered ? 
                AppRegistered.firstName + ' ' + AppRegistered.lastName : 
                localStorage.getItem('user_fullname') || 'Пользователь';
            
            callApi('joinLobby', {
                tgId: String(tgId),
                fullName: fullName,
                inviteCode: result.inviteCode
            }).then(function(joinResult) {
                console.log('joinLobby ответ:', joinResult);
                if (joinResult.success) {
                    AppLobbyId = result.lobbyId;
                    localStorage.setItem('lobby_id', result.lobbyId);
                    
                    AppUser = {
                        userId: joinResult.userId,
                        lobbyId: result.lobbyId,
                        role: 'super_admin',
                        fullName: fullName,
                        nickname: localStorage.getItem('user_nickname') || ''
                    };
                    AppIsAdmin = true;
                    showApp();
                    showToast('✅ Пространство создано!');
                    showInviteCode(result.inviteCode);
                } else {
                    showToast('❌ ' + (joinResult.error || 'Ошибка присоединения'));
                }
            }).catch(function(err) {
                showToast('❌ ' + err.message);
            });
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
    
    var tgId = AppTG?.initDataUnsafe?.user?.id || '123456789';
    var fullName = AppRegistered ? 
        AppRegistered.firstName + ' ' + AppRegistered.lastName : 
        localStorage.getItem('user_fullname') || 'Пользователь';
    
    showToast('⏳ Присоединение...');
    
    callApi('joinLobby', {
        tgId: String(tgId),
        fullName: fullName,
        inviteCode: code
    }).then(function(result) {
        console.log('joinLobby ответ:', result);
        if (result.success) {
            closeModal('joinGroupModal');
            AppLobbyId = result.lobbyId;
            AppInviteCode = code;
            localStorage.setItem('lobby_id', result.lobbyId);
            localStorage.setItem('invite_code', code);
            
            // Получаем название лобби
            callApi('getLobbyName', { lobbyId: result.lobbyId }).then(function(nameResult) {
                if (nameResult && nameResult.name) {
                    AppLobbyName = nameResult.name;
                    localStorage.setItem('lobby_name', nameResult.name);
                }
            });
            
            AppUser = {
                userId: result.userId,
                lobbyId: result.lobbyId,
                role: result.role,
                fullName: fullName,
                nickname: localStorage.getItem('user_nickname') || ''
            };
            AppIsAdmin = result.role === 'admin' || result.role === 'super_admin';
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
    console.log('✅ showApp вызвана');
    
    document.getElementById('actionPage').classList.remove('active');
    document.getElementById('appPage').classList.add('active');
    
    // Название пространства
    var groupNameDisplay = document.getElementById('groupNameDisplay');
    if (groupNameDisplay) {
        groupNameDisplay.textContent = AppLobbyName || AppUser?.lobbyId || 'Workspaces';
    }
    
    // Код приглашения (рядом с названием)
    var inviteDisplay = document.getElementById('inviteCodeDisplay');
    if (inviteDisplay) {
        if (AppInviteCode) {
            inviteDisplay.textContent = AppInviteCode;
        } else if (AppUser?.lobbyId) {
            callApi('getInviteCode', { lobbyId: AppUser.lobbyId }).then(function(result) {
                if (result && result.inviteCode) {
                    AppInviteCode = result.inviteCode;
                    inviteDisplay.textContent = result.inviteCode;
                    localStorage.setItem('invite_code', result.inviteCode);
                }
            });
        }
    }
    
    // Имя пользователя
    var userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = AppUser?.fullName || 'Пользователь';
    }
    
    // Никнейм
    var userNicknameDisplay = document.getElementById('userNicknameDisplay');
    if (userNicknameDisplay) {
        userNicknameDisplay.textContent = AppUser?.nickname || '';
    }
    
    // Админ-вкладка
    if (AppIsAdmin) {
        var adminTab = document.getElementById('adminTab');
        if (adminTab) adminTab.style.display = 'flex';
        
        var badge = document.getElementById('userRoleBadge');
        if (badge) {
            badge.textContent = 'Админ';
            badge.classList.add('admin');
        }
    }
    
    updateDates();
    loadTodaySchedule();
    loadTomorrowSchedule();
    loadWeekSchedule();
    loadHomework();
    loadMembersCount();
}

// ============================================================
// ЗАГРУЗКА КОЛИЧЕСТВА УЧАСТНИКОВ
// ============================================================
function loadMembersCount() {
    if (!AppLobbyId) return;
    
    callApi('getMembers', { lobbyId: AppLobbyId }).then(function(result) {
        if (result && Array.isArray(result)) {
            AppMembers = result;
            var count = result.length;
            var badge = document.querySelector('.tab[data-tab="members"] .tab-badge');
            if (badge) {
                badge.textContent = count;
                badge.classList.remove('hidden');
            }
        }
    });
}

// ============================================================
// API ВЫЗОВЫ
// ============================================================
function callApi(action, params) {
    return new Promise(function(resolve, reject) {
        var callback = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        var url = window.CONFIG.API_URL + 
            '?action=' + action + 
            '&params=' + encodeURIComponent(JSON.stringify(params)) + 
            '&callback=' + callback;
        
        console.log('📡 Запрос:', url);
        
        window[callback] = function(data) {
            console.log('📡 Ответ:', data);
            delete window[callback];
            resolve(data);
        };
        
        var script = document.createElement('script');
        script.src = url;
        script.onerror = function() {
            console.error('❌ Ошибка загрузки скрипта');
            delete window[callback];
            reject(new Error('Ошибка запроса к серверу'));
        };
        
        setTimeout(function() {
            if (window[callback]) {
                console.error('❌ Таймаут');
                delete window[callback];
                reject(new Error('Таймаут'));
            }
        }, 15000);
        
        document.body.appendChild(script);
    });
}

// ============================================================
// РАСПИСАНИЕ
// ============================================================
function updateDates() {
    var now = new Date();
    var weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    document.getElementById('todayDate').textContent = now.toLocaleDateString('ru-RU');
    document.getElementById('todayWeekday').textContent = weekdays[now.getDay()];
    var tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('tomorrowDate').textContent = tomorrow.toLocaleDateString('ru-RU');
    document.getElementById('tomorrowWeekday').textContent = weekdays[tomorrow.getDay()];
}

function loadTodaySchedule() {
    var container = document.getElementById('todaySchedule');
    if (!AppLobbyId) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Нет данных</h3></div>';
        return;
    }
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    callApi('getSchedule', { lobbyId: AppLobbyId, dayOffset: 0 }).then(function(result) {
        if (!result || !Array.isArray(result) || result.length === 0) {
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
            var status = 'future';
            var label = '🟢 Будущий';
            var cls = 'future';
            if (currentTime >= lessonTime && currentTime < endTime) {
                status = 'current';
                label = '🔴 Идёт';
                cls = 'current';
            } else if (currentTime >= endTime) {
                status = 'past';
                label = '✅ Прошёл';
                cls = 'past';
            }
            html += '<div class="lesson-item ' + (status === 'current' ? 'current' : status === 'future' ? 'future' : '') + '">';
            html += '<div class="lesson-time">' + lesson.time + '</div>';
            html += '<div class="lesson-info">';
            html += '<div class="lesson-subject">' + lesson.subject + '</div>';
            html += '<div class="lesson-cabinet">Каб. ' + (lesson.cabinet || '-') + '</div>';
            if (lesson.isReplaced) {
                html += '<div style="font-size:11px;color:#FF9500;">🔄 Замена</div>';
            }
            html += '</div>';
            html += '<span class="lesson-status ' + cls + '">' + label + '</span>';
            html += '</div>';
        }
        container.innerHTML = html;
    }).catch(function(err) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    });
}

function loadTomorrowSchedule() {
    var container = document.getElementById('tomorrowSchedule');
    if (!AppLobbyId) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Нет данных</h3></div>';
        return;
    }
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    callApi('getSchedule', { lobbyId: AppLobbyId, dayOffset: 1 }).then(function(result) {
        if (!result || !Array.isArray(result) || result.length === 0) {
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
            html += '</div>';
            html += '</div>';
        }
        container.innerHTML = html;
    }).catch(function(err) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
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
    if (!AppLobbyId) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Нет данных</h3></div>';
        return;
    }
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    var weekdays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    var now = new Date();
    var start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1 + WeekOffset * 7);
    
    var html = '';
    var loaded = 0;
    var total = 7;
    
    // Правильный порядок дней недели
    var dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    
    for (var i = 0; i < 7; i++) {
        (function(index) {
            var date = new Date(start);
            date.setDate(date.getDate() + index);
            var offset = (index - (now.getDay() === 0 ? 7 : now.getDay()) + 1) + WeekOffset * 7;
            
            callApi('getSchedule', { lobbyId: AppLobbyId, dayOffset: offset }).then(function(result) {
                var isWeekend = index >= 5;
                html += '<div class="day-card" style="' + (isWeekend ? 'opacity:0.6;' : '') + '">';
                html += '<div class="day-card-header">';
                html += '<span class="day-card-title">' + dayNames[index] + '</span>';
                html += '<span class="day-card-date">' + date.toLocaleDateString('ru-RU') + '</span>';
                if (AppIsAdmin) {
                    html += '<button class="btn btn-sm btn-outline" onclick="showToast(\'✏️ Редактирование в разработке\')">✏️</button>';
                }
                html += '</div>';
                if (result && result.length > 0) {
                    for (var j = 0; j < result.length; j++) {
                        var l = result[j];
                        html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid #d2d2d7;">';
                        html += '<span>' + l.time + ' - ' + l.subject + '</span>';
                        html += '<span style="color:#86868b;">каб. ' + (l.cabinet || '-') + '</span>';
                        html += '</div>';
                    }
                } else {
                    html += '<div style="color:#86868b;font-size:13px;padding:4px 0;">Нет уроков</div>';
                }
                html += '</div>';
                loaded++;
                if (loaded === total) {
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
    if (!AppLobbyId) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📝</div><h3>Нет данных</h3></div>';
        return;
    }
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    callApi('getHomework', { lobbyId: AppLobbyId }).then(function(result) {
        if (!result || !Array.isArray(result) || result.length === 0) {
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
                html += '<button class="btn btn-success btn-sm" onclick="markHomeworkDone(\'' + hw.id + '\')">✅ Отметить</button>';
            } else {
                html += '<span style="color:#34c759;font-size:13px;">✅ Вы выполнили</span>';
            }
            if (AppIsAdmin) {
                html += '<button class="btn btn-warning btn-sm" onclick="showToast(\'✏️ Редактирование в разработке\')">✏️</button>';
                html += '<button class="btn btn-danger btn-sm" onclick="deleteHomework(\'' + hw.id + '\')">🗑️</button>';
            }
            html += '</div>';
            html += '</div>';
            html += '</div>';
        }
        container.innerHTML = html;
    }).catch(function(err) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    });
}

function markHomeworkDone(homeworkId) {
    if (!AppLobbyId || !AppUser) {
        showToast('❌ Ошибка: нет данных');
        return;
    }
    callApi('markHomeworkDone', {
        lobbyId: AppLobbyId,
        homeworkId: homeworkId,
        userId: AppUser.userId
    }).then(function(result) {
        if (result.success) {
            showToast('✅ ДЗ отмечено!');
            loadHomework();
        } else {
            showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
        }
    });
}

function showAddHomework() {
    var modal = document.getElementById('editModal');
    var content = document.getElementById('editModalContent');
    content.innerHTML = 
        '<h3 class="modal-title">📝 Добавить ДЗ</h3>' +
        '<div class="form-group"><label>Предмет</label><input type="text" id="hwSubject" class="form-input" placeholder="Математика"></div>' +
        '<div class="form-group"><label>Задание</label><textarea id="hwDescription" class="form-input" rows="3" placeholder="Описание"></textarea></div>' +
        '<div class="form-group"><label>Срок</label><input type="date" id="hwDueDate" class="form-input"></div>' +
        '<button class="btn btn-primary btn-full" onclick="addHomework()">➕ Добавить</button>';
    modal.classList.add('active');
}

function addHomework() {
    var subject = document.getElementById('hwSubject').value.trim();
    var description = document.getElementById('hwDescription').value.trim();
    var dueDate = document.getElementById('hwDueDate').value;
    if (!subject || !description) {
        showToast('Заполните все поля');
        return;
    }
    if (!AppLobbyId || !AppUser) {
        showToast('❌ Ошибка: нет данных');
        return;
    }
    callApi('addHomework', {
        lobbyId: AppLobbyId,
        subject: subject,
        description: description,
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        adminId: AppUser.userId
    }).then(function(result) {
        if (result.success) {
            showToast('✅ ДЗ добавлено!');
            closeModal('editModal');
            loadHomework();
        } else {
            showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
        }
    });
}

function deleteHomework(homeworkId) {
    if (!confirm('Удалить это ДЗ?')) return;
    showToast('🗑️ ДЗ удалено');
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
        if (!result || !Array.isArray(result)) {
            container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
            return;
        }
        
        var roleLabels = {
            'super_admin': '👑 Главный админ',
            'admin': '⚙️ Админ',
            'user': '👤 Участник'
        };
        
        var html = '<div class="card"><h3>👥 Участники (' + result.length + ')</h3>';
        
        for (var i = 0; i < result.length; i++) {
            var member = result[i];
            var isSelf = member.userId === AppUser?.userId;
            
            html += '<div class="member-item ' + (member.isBlocked ? 'blocked' : '') + '">';
            html += '<div class="member-info">';
            html += '<span class="member-name">' + member.fullName + '</span>';
            if (member.nickname) {
                html += '<span class="member-nickname">' + member.nickname + '</span>';
            }
            html += '<span class="member-role ' + (member.role === 'admin' || member.role === 'super_admin' ? member.role : '') + '">';
            html += roleLabels[member.role] || member.role;
            html += '</span>';
            if (member.isBlocked) {
                html += '<span class="badge badge-danger">🔒 Заблокирован</span>';
            }
            if (isSelf) {
                html += '<span class="badge badge-info">Вы</span>';
            }
            html += '</div>';
            html += '</div>';
        }
        
        html += '</div>';
        
        // Кнопка "Покинуть пространство"
        html += '<button class="btn btn-danger btn-full" style="margin-top:12px;" onclick="leaveSpace()">🚪 Покинуть пространство</button>';
        
        container.innerHTML = html;
    }).catch(function(err) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
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
        if (!result || !Array.isArray(result) || result.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">💬</div><h3>Нет сообщений</h3><p>Начните общение!</p></div>';
            return;
        }
        var html = '';
        var userId = AppUser?.userId;
        for (var i = 0; i < result.length; i++) {
            var msg = result[i];
            var isOwn = msg.userId === userId;
            html += '<div class="chat-message ' + (isOwn ? 'own' : 'other') + '">';
            if (!isOwn) {
                html += '<div class="msg-sender">' + (msg.senderName || 'Пользователь') + '</div>';
            }
            html += '<div>' + msg.text + '</div>';
            html += '<span class="msg-time">' + (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : '') + '</span>';
            html += '</div>';
        }
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }).catch(function(err) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    });
}

function sendMessage() {
    var input = document.getElementById('chatInput');
    var text = input?.value?.trim();
    if (!text) return;
    
    if (!AppLobbyId || !AppUser) {
        showToast('❌ Ошибка: нет данных');
        return;
    }
    
    var message = {
        lobbyId: AppLobbyId,
        userId: AppUser.userId,
        senderName: AppUser.fullName || 'Пользователь',
        text: text,
        createdAt: new Date().toISOString()
    };
    
    callApi('sendChatMessage', message).then(function(result) {
        if (result.success) {
            input.value = '';
            loadChatMessages();
        } else {
            showToast('❌ Ошибка отправки');
        }
    }).catch(function(err) {
        showToast('❌ ' + err.message);
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
        if (!result || !Array.isArray(result)) {
            container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
            return;
        }
        
        var roleLabels = {
            'super_admin': '👑 Главный админ',
            'admin': '⚙️ Админ',
            'user': '👤 Участник'
        };
        
        var html = '<div class="admin-section"><div class="admin-section-title">👥 Участники (' + result.length + ')</div><div class="card">';
        html += '<button class="btn btn-sm btn-primary" style="margin-bottom:12px;width:100%;" onclick="showInviteCode(\'' + (AppInviteCode || '') + '\')">📋 Код приглашения</button>';
        
        for (var i = 0; i < result.length; i++) {
            var member = result[i];
            var isSelf = member.userId === AppUser?.userId;
            var canManage = AppUser?.role === 'super_admin' || 
                           (AppUser?.role === 'admin' && member.role !== 'super_admin');
            
            html += '<div class="member-item ' + (member.isBlocked ? 'blocked' : '') + '">';
            html += '<div class="member-info">';
            html += '<span class="member-name">' + member.fullName + '</span>';
            if (member.nickname) {
                html += '<span class="member-nickname">' + member.nickname + '</span>';
            }
            html += '<span class="member-role ' + (member.role === 'admin' || member.role === 'super_admin' ? member.role : '') + '">';
            html += roleLabels[member.role] || member.role;
            html += '</span>';
            if (member.isBlocked) {
                html += '<span class="badge badge-danger">🔒 Заблокирован</span>';
            }
            if (isSelf) {
                html += '<span class="badge badge-info">Вы</span>';
            }
            html += '</div>';
            
            if (!isSelf && canManage) {
                html += '<div class="member-actions">';
                html += '<button class="btn btn-sm ' + (member.isBlocked ? 'btn-success' : 'btn-danger') + '" onclick="toggleUserBlock(\'' + member.userId + '\')">';
                html += member.isBlocked ? '🔓' : '🔒';
                html += '</button>';
                html += '<button class="btn btn-sm btn-warning" onclick="showNicknameModal(\'' + member.userId + '\')">✏️</button>';
                if (AppUser?.role === 'super_admin') {
                    html += '<button class="btn btn-sm btn-danger" onclick="kickUser(\'' + member.userId + '\')">🚫</button>';
                }
                html += '</div>';
            }
            html += '</div>';
        }
        
        html += '</div></div>';
        html += '<button class="btn btn-danger btn-full" style="margin-top:12px;" onclick="leaveSpace()">🚪 Покинуть пространство</button>';
        container.innerHTML = html;
    }).catch(function(err) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    });
}

function toggleUserBlock(userId) {
    callApi('toggleBlock', {
        lobbyId: AppLobbyId,
        userId: userId,
        adminId: AppUser.userId
    }).then(function(result) {
        if (result.success) {
            showToast(result.isBlocked ? '🔒 Пользователь заблокирован' : '🔓 Пользователь разблокирован');
            loadAdminPanel();
            loadMembers();
        } else {
            showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
        }
    });
}

function showNicknameModal(userId) {
    var modal = document.getElementById('editModal');
    var content = document.getElementById('editModalContent');
    content.innerHTML = 
        '<h3 class="modal-title">✏️ Назначить никнейм</h3>' +
        '<div class="form-group"><label>Никнейм</label><input type="text" id="nicknameInput" class="form-input" placeholder="Например: Староста"></div>' +
        '<button class="btn btn-primary btn-full" onclick="setNickname(\'' + userId + '\')">💾 Сохранить</button>';
    modal.classList.add('active');
}

function setNickname(userId) {
    var nickname = document.getElementById('nicknameInput').value.trim();
    if (!nickname) {
        showToast('Введите никнейм');
        return;
    }
    callApi('setNickname', {
        lobbyId: AppLobbyId,
        userId: userId,
        nickname: nickname,
        adminId: AppUser.userId
    }).then(function(result) {
        if (result.success) {
            showToast('✅ Никнейм назначен!');
            closeModal('editModal');
            loadAdminPanel();
            loadMembers();
            if (userId === AppUser?.userId) {
                AppUser.nickname = nickname;
                document.getElementById('userNicknameDisplay').textContent = nickname;
            }
        } else {
            showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
        }
    });
}

function kickUser(userId) {
    if (!confirm('Вы уверены?')) return;
    showToast('🚫 Функция в разработке');
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
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    var activeTab = document.querySelector('.tab[data-tab="' + tab + '"]');
    if (activeTab) activeTab.classList.add('active');
    
    var panels = document.querySelectorAll('.tab-panel');
    for (var j = 0; j < panels.length; j++) {
        panels[j].classList.remove('active');
    }
    var panel = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (panel) panel.classList.add('active');
    
    if (tab === 'today') loadTodaySchedule();
    else if (tab === 'tomorrow') loadTomorrowSchedule();
    else if (tab === 'week') loadWeekSchedule();
    else if (tab === 'homework') loadHomework();
    else if (tab === 'members') loadMembers();
    else if (tab === 'chat') loadChatMessages();
    else if (tab === 'admin' && AppIsAdmin) loadAdminPanel();
}
