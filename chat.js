// ==================== ЧАТ ====================
let chatMessages = [];
let chatOffset = 0;
const CHAT_PAGE_SIZE = 50;

async function loadChatMessages() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        // Загружаем сообщения из кэша или API
        const result = await callApi('getChatMessages', {
            lobbyId: currentLobbyId,
            offset: chatOffset,
            limit: CHAT_PAGE_SIZE
        });
        
        if (result && Array.isArray(result)) {
            chatMessages = result;
            renderChatMessages();
        } else {
            container.innerHTML = '<div class="empty-state"><div class="icon">💬</div><h3>Нет сообщений</h3><p>Будьте первым!</p></div>';
        }
        
        // Подписываемся на новые сообщения
        subscribeToChat();
        
    } catch(error) {
        container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Ошибка загрузки</h3></div>';
    }
}

function renderChatMessages() {
    const container = document.getElementById('chatMessages');
    
    if (chatMessages.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">💬</div><h3>Нет сообщений</h3><p>Будьте первым!</p></div>';
        return;
    }
    
    let html = '';
    const userId = currentUser?.userId;
    
    chatMessages.forEach(msg => {
        const isOwn = msg.userId === userId;
        const isDeleted = msg.deleted;
        
        html += `
            <div class="chat-message ${isOwn ? 'own' : 'other'} ${isDeleted ? 'deleted' : ''}" id="msg-${msg.id}">
                ${!isOwn ? `<div class="msg-sender">${msg.senderName || 'Пользователь'}</div>` : ''}
                <div>${isDeleted ? '🗑️ Сообщение удалено' : msg.text}</div>
                <span class="msg-time">${msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}</span>
                ${isAdmin && !isDeleted ? `
                    <button class="btn btn-sm btn-danger" style="margin-top:4px;font-size:10px;padding:2px 8px;" 
                            onclick="deleteMessage('${msg.id}')">🗑️</button>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
    
    // Обновляем бейдж
    updateChatBadge();
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Проверяем, не заблокирован ли пользователь
    if (currentUser?.isBlocked) {
        showToast('❌ Вы заблокированы и не можете отправлять сообщения');
        return;
    }
    
    const message = {
        lobbyId: currentLobbyId,
        userId: currentUser.userId,
        senderName: currentUser.fullName,
        text: text,
        createdAt: new Date().toISOString()
    };
    
    const result = await callApi('sendChatMessage', message);
    
    if (result.success) {
        input.value = '';
        chatMessages.push({
            id: result.messageId,
            ...message
        });
        renderChatMessages();
    } else {
        showToast('❌ Ошибка отправки: ' + (result.error || 'Неизвестная ошибка'));
    }
}

async function deleteMessage(messageId) {
    if (!confirm('Удалить это сообщение?')) return;
    
    const result = await callApi('deleteChatMessage', {
        lobbyId: currentLobbyId,
        messageId: messageId,
        adminId: currentUser.userId
    });
    
    if (result.success) {
        const msg = chatMessages.find(m => m.id === messageId);
        if (msg) msg.deleted = true;
        renderChatMessages();
        showToast('🗑️ Сообщение удалено');
    } else {
        showToast('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
    }
}

function subscribeToChat() {
    // В реальном приложении здесь будет WebSocket или Long Polling
    // Для демонстрации просто обновляем раз в 10 секунд
    if (window.chatInterval) clearInterval(window.chatInterval);
    window.chatInterval = setInterval(() => {
        // Проверяем новые сообщения
        checkNewMessages();
    }, 10000);
}

async function checkNewMessages() {
    try {
        const result = await callApi('getChatMessages', {
            lobbyId: currentLobbyId,
            offset: chatMessages.length,
            limit: 10
        });
        
        if (result && Array.isArray(result) && result.length > 0) {
            const newMessages = result.filter(m => 
                !chatMessages.some(existing => existing.id === m.id)
            );
            if (newMessages.length > 0) {
                chatMessages = [...chatMessages, ...newMessages];
                renderChatMessages();
                // Если вкладка чата не активна, показываем бейдж
                updateChatBadge();
            }
        }
    } catch(error) {
        console.error('Check new messages error:', error);
    }
}

function updateChatBadge() {
    const badge = document.getElementById('chatBadge');
    // Считаем непрочитанные сообщения (не свои)
    const unread = chatMessages.filter(m => m.userId !== currentUser?.userId && !m.read).length;
    if (unread > 0) {
        badge.textContent = unread;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// Обработчик Enter в чате
document.addEventListener('DOMContentLoaded', function() {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});