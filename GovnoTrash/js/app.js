// Простейший SPA-роутер на кнопках. Рендер страниц и взаимодействие с IndexedDB
(async function init() {
    await window.GreenDb.seedIfEmpty();
    bindNav();
    bindAdminShortcut();
    navigate('home');
})();

function bindNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.route));
    });
}

function setActive(route) {
    document.querySelectorAll('.nav-btn').forEach(b => b.removeAttribute('aria-current'));
    const current = document.querySelector(`.nav-btn[data-route="${route}"]`);
    if (current) current.setAttribute('aria-current', 'page');
}

async function navigate(route, params) {
    setActive(route);
    const app = document.getElementById('app');
    if (route === 'home') return renderHome(app);
    if (route === 'catalog') return renderCatalog(app);
    if (route === 'search') return renderSearch(app);
    if (route === 'chat') return renderChat(app);
    if (route === 'settings') {
        if (!isAdmin()) return renderDenied(app);
        return renderSettings(app);
    }
    if (route === 'plant' && params?.id) return renderPlant(app, params.id);
    renderNotFound(app);
}

function renderHome(app) {
    app.innerHTML = `
        <section class="card">
            <h2>Добро пожаловать!</h2>
            <p>Это GLsite — веб-версия «Справочника садовода», основанная на данных без изменения приложения GLApp.</p>
            <p>Используйте навигацию выше: каталог растений, поиск, чат ИИ.</p>
        </section>
    `;
}

async function renderCatalog(app) {
    const plants = await window.GreenDb.getAllPlants();
    app.innerHTML = `
        <section>
            <h2>Каталог</h2>
            <div class="grid" id="catalog-grid"></div>
        </section>
    `;
    const grid = document.getElementById('catalog-grid');
    grid.innerHTML = plants.map(p => plantCardHtml(p)).join('');
    // Переход на страницу растения
    grid.addEventListener('click', (e) => {
        const card = e.target.closest('article.card');
        if (!card) return;
        const id = card.getAttribute('data-id');
        if (id) navigate('plant', { id });
    });
}

function plantCardHtml(p) {
    const imgSrc = resolveImageUrl(p);
    const imgTag = imgSrc ? `<img class="cover" src="${imgSrc}" alt="${escapeAttr(p.name)}" onerror="this.style.display='none'"/>` : '';
    const cat = p.category ? `<div class=\"meta\">Категория: <span class=\"chip\">${escapeHtml(p.category)}</span></div>` : '';
    return `
        <article class="card" data-id="${p.id}">
            ${imgTag}
            <h3>${escapeHtml(p.name)}</h3>
            ${cat}
            <p class="description">${escapeHtml(p.description)}</p>
            <div class="footer"><button class="btn-link">Подробнее →</button></div>
        </article>
    `;
}

async function renderSearch(app) {
    app.innerHTML = `
        <section class="card">
            <h2>Поиск</h2>
            <div class="search-bar">
                <input id="q" class="input" placeholder="Название, описание, теги" />
                <select id="cat" class="select">
                    <option value="all">Все категории</option>
                    <option value="Ягоды">Ягоды</option>
                    <option value="Овощи">Овощи</option>
                    <option value="Плодовые">Плодовые</option>
                    <option value="Цветы">Цветы</option>
                    <option value="Травы">Травы</option>
                </select>
                <button id="doSearch" class="btn-primary">Найти</button>
            </div>
            <div class="grid" id="results"></div>
        </section>
    `;
    document.getElementById('doSearch').addEventListener('click', doSearch);
    async function doSearch() {
        const q = document.getElementById('q').value;
        const cat = document.getElementById('cat').value;
        const res = await window.GreenDb.searchPlants(q, cat);
        const results = document.getElementById('results');
        results.innerHTML = res.map(plantCardHtml).join('') || '<div class="card">Ничего не найдено</div>';
        results.addEventListener('click', (e) => {
            const card = e.target.closest('article.card');
            if (!card) return;
            const id = card.getAttribute('data-id');
            if (id) navigate('plant', { id });
        }, { once: true });
    }
}

async function renderPlant(app, id) {
    const plant = await window.GreenDb.getPlantById(id);
    if (!plant) {
        app.innerHTML = '<div class="card">Растение не найдено</div>';
        return;
    }
    const img = resolveImageUrl(plant);
    const tags = (plant.tags || []).map(t => `<span class="chip">${escapeHtml(t)}</span>`).join(' ');
    app.innerHTML = `
        <section class="card detail">
            <button class="btn-secondary" id="backToCatalog">← Назад</button>
            ${img ? `<img class="cover" src="${img}" alt="${escapeAttr(plant.name)}" onerror="this.style.display='none'"/>` : ''}
            <h2>${escapeHtml(plant.name)}</h2>
            ${plant.category ? `<div class="meta">Категория: <span class=\"chip\">${escapeHtml(plant.category)}</span></div>` : ''}
            ${tags ? `<div class="meta">Теги: ${tags}</div>` : ''}
            <p style="white-space: pre-wrap;">${escapeHtml(plant.description)}</p>
        </section>
    `;
    document.getElementById('backToCatalog').addEventListener('click', () => navigate('catalog'));
}

async function renderChat(app) {
    app.innerHTML = `
        <section class="card">
            <h2>Чат ИИ</h2>
            <div class="chat" id="chat">
                <div class="chat-log" id="chatLog"></div>
                <div class="chat-input">
                    <input id="chatInput" class="input" placeholder="Спросите про растения, уход, удобрения..." />
                    <button id="chatSend" class="btn-primary">Отправить</button>
                </div>
            </div>
        </section>
    `;
    const log = document.getElementById('chatLog');
    const input = document.getElementById('chatInput');
    document.getElementById('chatSend').addEventListener('click', async () => {
        const text = input.value.trim();
        if (!text) return;
        appendMsg(log, 'user', text);
        input.value = '';
        const reply = await window.ChatApi.callAiProvider([{ role: 'user', content: text }]);
        appendMsg(log, reply.role || 'assistant', reply.content || '');
    });
}

function appendMsg(container, role, content) {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${role}`;
    msg.innerHTML = `<div class="bubble">${escapeHtml(content)}</div>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

async function renderSettings(app) {
    const saved = (await window.GreenDb.getSetting('ai_token')) || '';
    app.innerHTML = `
        <section class="card">
            <h2>Настройки</h2>
            <p>Добавьте токен ИИ для работы чата. Токен хранится локально (IndexedDB).</p>
            <div class="search-bar">
                <input id="token" class="input" placeholder="Введите токен ИИ" value="${escapeAttr(saved)}" />
                <button id="saveToken" class="btn-primary">Сохранить</button>
                <button id="clearToken" class="btn-secondary">Очистить</button>
            </div>
            <small>Интеграция будет происходить через безопасные вызовы API. Сейчас подключена заглушка.</small>
            <hr/>
            <h3>Импорт из HTML (Raw/htmlDATA)</h3>
            <p>Если чтение SQLite не работает, выберите файлы из папки <code>GLsite/Raw/htmlDATA</code> для импорта.</p>
            <div class="search-bar">
                <input id="htmlFiles" class="input" type="file" multiple accept=".html,.htm" />
                <button id="doImport" class="btn-primary">Импортировать</button>
            </div>
            <small>Импорт добавит записи в локальную базу IndexedDB.</small>
        </section>
    `;
    document.getElementById('saveToken').addEventListener('click', async () => {
        const token = document.getElementById('token').value.trim();
        await window.GreenDb.setSetting('ai_token', token);
        alert('Токен сохранён');
    });
    document.getElementById('clearToken').addEventListener('click', async () => {
        await window.GreenDb.setSetting('ai_token', '');
        document.getElementById('token').value = '';
        alert('Токен очищен');
    });
    document.getElementById('doImport').addEventListener('click', async () => {
        const files = document.getElementById('htmlFiles').files;
        const count = await window.GreenDb.importFromHtmlFiles(files);
        alert(`Импортировано записей: ${count}`);
    });
}

function renderNotFound(app) {
    app.innerHTML = `<div class="card">Страница не найдена</div>`;
}

function renderDenied(app) {
    app.innerHTML = `<div class="card">Доступ запрещён</div>`;
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(s) { return escapeHtml(s).replace(/\"/g, '&quot;'); }

function resolveImageUrl(p) {
    if (p.image) {
        return `./Images/${encodeURIComponent(p.image)}`;
    }
    if (p.name) {
        const base = p.name
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_');
        return `./Images/${encodeURIComponent(base)}.jpg`;
    }
    return '';
}

// --- Admin gating ---
const ADMIN_CODE = 'greenadmin'; // измените при необходимости
function isAdmin() { return sessionStorage.getItem('gl_admin') === '1'; }
function bindAdminShortcut() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.altKey && (e.key === 's' || e.key === 'S')) {
            const code = prompt('Введите код администратора');
            if (!code) return;
            if (code === ADMIN_CODE) {
                sessionStorage.setItem('gl_admin', '1');
                navigate('settings');
            } else {
                alert('Неверный код');
            }
        }
    });
}


