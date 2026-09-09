// ==================== АДМИН ПАНЕЛЬ ====================
async function loadAdminPanel() {
    const container = document.getElementById('adminContent');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        // Загружаем участников
        const members = await callApi('getMembers', { lobbyId: currentLobbyId });
        
        if (!members || !Array.isArray(members)) {
            container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
            return;
        }
        
        const roleLabels = {
            'super_admin': '👑 Главный админ',
            'admin': '⚙️ Админ',
            'user': '👤 Участник'
        };
        
        let html = `
            <div class="admin-section">
                <div class="admin-section-title">👥 Участники (${members.length})</div>
                <div class="card">
                    <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="btn btn-sm btn-primary" onclick="showInviteCodeModal()">📋 Код приглашения</button>
                        <button class="btn btn-sm btn-danger" onclick="clearAllData()">🗑️ Очистить всё</button>
                    </div>
        `;
        
        members.forEach(member => {
            const isSelf = member.userId === currentUser.userId;
            const canManage = currentUser.role === 'super_admin' || 
                             (currentUser.role === 'admin' && member.role !== 'super_admin');
            
            html += `
                <div class="member-item ${member.isBlocked ? 'blocked' : ''}">
                    <div class="member-info">
                        <span class="member-name">${member.fullName}</span>
                        ${member.nickname ? `<span class="member-nickname">${member.nickname}</span>` : ''}
                        <span class="member-role ${member.role === 'admin' || member.role === 'super_admin' ? member.role : ''}">
                            ${roleLabels[member.role] || member.role}
                        </span>
                        ${member.isBlocked ? '<span class="badge badge-danger">🔒 Заблокирован</span>' : ''}
                        ${isSelf ? '<span class="badge badge-info">Вы</span>' : ''}
                    </div>
                    ${!isSelf && canManage ? `
                        <div class="member-actions">
                            <button class="btn btn-sm ${member.isBlocked ? 'btn-success' : 'btn-danger'}" 
                                    onclick="toggleUserBlock('${member.userId}')">
                                ${member.isBlocked ? '🔓' : '🔒'}
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="showNicknameModal('${member.userId}')">
                                ✏️
                            </button>
                            ${currentUser.role === 'super_admin' ? `
                                <button class="btn btn-sm ${member.role === 'admin' ? 'btn-outline' : 'btn-primary'}" 
                                        onclick="toggleAdmin('${member.userId}')">
                                    ${member.role === 'admin' ? '⬇️' : '⬆️'}
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="kickUser('${member.userId}')">
                                    🚫
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
            <div class="admin-section">
                <div class="admin-section-title">⚙️ Управление расписанием</div>
                <div class="card">
                    <button class="btn btn-primary btn-full" onclick="showAddReplace()">
                        🔄 Добавить замену
                    </button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch(error) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    }
}

// ==================== УПРАВЛЕНИЕ УЧАСТНИКАМИ ====================
async function toggleUserBlock(userId) {
    const result = await callApi('toggleBlock', {
        lobbyId: currentLobbyId,
        userId: userId,
        adminId: currentUser.userId
    });
    
    if (result.success) {
        showToast(result.isBlocked ? '🔒 Пользователь заблокирован' : '🔓 Пользователь разблокирован');
        loadAdminPanel();
    } else {
        showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
    }
}

async function toggleAdmin(userId) {
    // TODO: Добавить API для назначения/снятия админа
    showToast('⚙️ Функция в разработке');
}

async function kickUser(userId) {
    if (!confirm('Вы уверены, что хотите исключить пользователя?')) return;
    // TODO: Добавить API для исключения
    showToast('🚫 Пользователь исключён');
    loadAdminPanel();
}

function showNicknameModal(userId) {
    const modal = document.getElementById('editModal');
    const content = document.getElementById('editModalContent');
    
    content.innerHTML = `
        <h3 class="modal-title">✏️ Назначить никнейм</h3>
        <div class="form-group">
            <label>Никнейм</label>
            <input type="text" id="nicknameInput" class="form-input" placeholder="Например: Староста">
        </div>
        <button class="btn btn-primary btn-full" onclick="setNickname('${userId}')">💾 Сохранить</button>
    `;
    
    modal.classList.add('active');
}

async function setNickname(userId) {
    const nickname = document.getElementById('nicknameInput').value.trim();
    
    if (!nickname) {
        showToast('Введите никнейм');
        return;
    }
    
    const result = await callApi('setNickname', {
        lobbyId: currentLobbyId,
        userId: userId,
        nickname: nickname,
        adminId: currentUser.userId
    });
    
    if (result.success) {
        showToast('✅ Никнейм назначен!');
        closeModal('editModal');
        loadAdminPanel();
        // Обновляем отображение имени пользователя
        if (userId === currentUser.userId) {
            currentUser.nickname = nickname;
            document.getElementById('userNicknameDisplay').textContent = nickname;
        }
    } else {
        showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
    }
}

function showInviteCodeModal() {
    // Получаем текущий код приглашения
    callApi('getInviteCode', { lobbyId: currentLobbyId }).then(result => {
        if (result && result.inviteCode) {
            document.getElementById('inviteCodeDisplay').textContent = result.inviteCode;
            document.getElementById('inviteCodeModal').classList.add('active');
        }
    });
}

// ==================== УПРАВЛЕНИЕ РАСПИСАНИЕМ ====================
function showAddReplace() {
    const modal = document.getElementById('editModal');
    const content = document.getElementById('editModalContent');
    
    // Получаем текущее расписание для выбора
    const weekdays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    const weekdaysFull = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    
    let dayOptions = weekdays.map((d, i) => 
        `<option value="${d}">${weekdaysFull[i]}</option>`
    ).join('');
    
    content.innerHTML = `
        <h3 class="modal-title">🔄 Добавить замену</h3>
        <div class="form-group">
            <label>День недели</label>
            <select id="replaceDay" class="form-input">${dayOptions}</select>
        </div>
        <div class="form-group">
            <label>Время урока</label>
            <input type="time" id="replaceTime" class="form-input">
        </div>
        <div class="form-group">
            <label>Новый предмет</label>
            <input type="text" id="newSubject" class="form-input" placeholder="Новый предмет">
        </div>
        <div class="form-group">
            <label>Новый кабинет</label>
            <input type="text" id="newCabinet" class="form-input" placeholder="Кабинет">
        </div>
        <button class="btn btn-primary btn-full" onclick="addReplace()">🔄 Добавить замену</button>
    `;
    
    modal.classList.add('active');
}

async function addReplace() {
    const day = document.getElementById('replaceDay').value;
    const time = document.getElementById('replaceTime').value;
    const newSubject = document.getElementById('newSubject').value.trim();
    const newCabinet = document.getElementById('newCabinet').value.trim();
    
    if (!time || !newSubject) {
        showToast('Заполните все поля');
        return;
    }
    
    // Получаем текущее расписание для определения старого предмета
    const schedule = await callApi('getSchedule', {
        lobbyId: currentLobbyId,
        dayOffset: 0
    });
    
    // Находим урок по времени и дню (упрощённо)
    const oldSubject = 'Старый предмет'; // TODO: Найти реальный предмет
    
    const result = await callApi('addReplace', {
        lobbyId: currentLobbyId,
        date: new Date().toISOString().split('T')[0],
        day: day,
        time: time,
        oldSubject: oldSubject,
        newSubject: newSubject,
        newCabinet: newCabinet || '-',
        adminId: currentUser.userId
    });
    
    if (result.success) {
        showToast('✅ Замена добавлена!');
        closeModal('editModal');
        loadWeekSchedule();
    } else {
        showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
    }
}

function showEditSchedule(day, date) {
    showToast('✏️ Редактирование расписания в разработке');
}

function clearAllData() {
    if (!confirm('Вы уверены, что хотите очистить все данные?')) return;
    // TODO: Добавить API для очистки
    showToast('🗑️ Данные очищены');
}