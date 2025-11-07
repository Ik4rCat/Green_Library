// Заглушка для чата ИИ. Готовая точка интеграции: callAiProvider()

async function callAiProvider(messages) {
    // Здесь будет реальный вызов к провайдеру ИИ.
    // Читает токен из IndexedDB -> settings.ai_token
    const token = await window.GreenDb.getSetting('ai_token');
    if (!token) {
        // Возвращаем мягкое сообщение, предлагая указать токен в настройках
        return { role: 'assistant', content: 'Токен ИИ не задан. Перейдите в «Настройки» и укажите токен.' };
    }
    // Временно имитируем ответ
    const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    return { role: 'assistant', content: `Пока заглушка. Вы спросили: “${lastUser}”. Ответ ИИ появится после подключения API.` };
}

window.ChatApi = { callAiProvider };


