// ==================== ЧАТ ====================
async function loadChatMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    try {
        const result = await callApi('getChatMessages', {
            lobbyId: currentLobbyId,
            offset: 0,
            limit: 50
        });
        
        if (!result || !Array.isArray(result) || result.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">💬</div><h3>Нет сообщений</h3><p>Начните общение!</p></div>';
            return;
        }
        
        let html = '';
        const userId = currentUser?.userId;
        
        result.forEach(msg => {
            const isOwn = msg.userId === userId;
            html += `
                <div class="chat-message ${isOwn ? 'own' : 'other'}">
                    ${!isOwn ? `<div class="msg-sender">${msg.senderName || 'Пользователь'}</div>` : ''}
                    <div>${msg.text}</div>
                    <span class="msg-time">${msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}</span>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
        
    } catch(error) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    }
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input?.value.trim();
    if (!text) return;
    
    const message = {
        lobbyId: currentLobbyId,
        userId: currentUser?.userId,
        senderName: currentUser?.fullName || 'Пользователь',
        text: text,
        createdAt: new Date().toISOString()
    };
    
    try {
        const result = await callApi('sendChatMessage', message);
        if (result.success) {
            input.value = '';
            const container = document.getElementById('chatMessages');
            const html = `
                <div class="chat-message own">
                    <div>${text}</div>
                    <span class="msg-time">${new Date().toLocaleTimeString()}</span>
                </div>
            `;
            container.innerHTML += html;
            container.scrollTop = container.scrollHeight;
        } else {
            showToast('❌ Ошибка отправки');
        }
    } catch(error) {
        showToast('❌ Ошибка: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') sendMessage();
        });
    }
});
