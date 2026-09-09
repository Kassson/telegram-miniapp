// ==================== АДМИН ПАНЕЛЬ ====================
async function loadAdminPanel() {
    const container = document.getElementById('adminContent');
    if (!container) return;
    
    try {
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
                    <button class="btn btn-sm btn-primary" style="margin-bottom:12px;width:100%;" onclick="window.showInviteCodeModal()">📋 Код приглашения</button>
        `;
        
        members.forEach(member => {
            const isSelf = member.userId === currentUser?.userId;
            const canManage = currentUser?.role === 'super_admin' || 
                             (currentUser?.role === 'admin' && member.role !== 'super_admin');
            
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
                            <button class="btn btn-sm ${member.isBlocked ? 'btn-success' : 'btn-danger'}" onclick="window.toggleUserBlock('${member.userId}')">
                                ${member.isBlocked ? '🔓' : '🔒'}
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="window.showNicknameModal('${member.userId}')">✏️</button>
                            ${currentUser?.role === 'super_admin' ? `<button class="btn btn-sm btn-danger" onclick="window.kickUser('${member.userId}')">🚫</button>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        html += `</div></div>`;
        container.innerHTML = html;
        
    } catch(error) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    }
}

async function toggleUserBlock(userId) {
    const result = await callApi('toggleBlock', {
        lobbyId: currentLobbyId,
        userId: userId,
        adminId: currentUser?.userId
    });
    if (result.success) {
        showToast(result.isBlocked ? '🔒 Пользователь заблокирован' : '🔓 Пользователь разблокирован');
        loadAdminPanel();
    } else {
        showToast('❌ Ошибка');
    }
}

function showNicknameModal(userId) {
    const modal = document.getElementById('editModal');
    const content = document.getElementById('editModalContent');
    if (!modal || !content) return;
    
    content.innerHTML = `
        <h3 class="modal-title">✏️ Назначить никнейм</h3>
        <div class="form-group">
            <label>Никнейм</label>
            <input type="text" id="nicknameInput" class="form-input" placeholder="Например: Староста">
        </div>
        <button class="btn btn-primary btn-full" onclick="window.setNickname('${userId}')">💾 Сохранить</button>
    `;
    modal.classList.add('active');
}

async function setNickname(userId) {
    const nickname = document.getElementById('nicknameInput').value.trim();
    if (!nickname) { showToast('Введите никнейм'); return; }
    
    const result = await callApi('setNickname', {
        lobbyId: currentLobbyId,
        userId: userId,
        nickname: nickname,
        adminId: currentUser?.userId
    });
    
    if (result.success) {
        showToast('✅ Никнейм назначен!');
        closeModal('editModal');
        loadAdminPanel();
        if (userId === currentUser?.userId) {
            currentUser.nickname = nickname;
            document.getElementById('userNicknameDisplay').textContent = nickname;
        }
    } else {
        showToast('❌ Ошибка');
    }
}

function showInviteCodeModal() {
    callApi('getInviteCode', { lobbyId: currentLobbyId }).then(result => {
        if (result && result.inviteCode) {
            document.getElementById('inviteCodeDisplay').textContent = result.inviteCode;
            document.getElementById('inviteCodeModal').classList.add('active');
        }
    });
}

function kickUser(userId) {
    if (!confirm('Вы уверены?')) return;
    showToast('🚫 Функция в разработке');
}
