// Глобальные переменные
let allPlants = [];
let plantsCache = new Map();
let currentPage = 0;
const PLANTS_PER_PAGE = 20;
let activeFilters = {
    plantType: '',
    light: '',
    care: ''
};
let filteredResults = [];

// Функция для переключения секций
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const content = section.querySelector('.section-content');
    content.classList.toggle('collapsed');
}

// Функция для раскрытия категории
async function expandCategory(category) {
    const categoryMap = {
        'allPlants': 'allPlantsBlocks',
        'families': 'familiesBlocks',
        'popular': 'popularBlocks',
        'indoor': 'indoorBlocks',
        'garden': 'gardenBlocks',
        'care': 'careBlocks'
    };
    
    const blocksContainer = document.getElementById(categoryMap[category]);
    if (!blocksContainer) return;
    
    const hint = blocksContainer.nextElementSibling;
    
    // Если блоки уже загружены (больше 2), просто показываем их
    if (blocksContainer.children.length > 2) {
        blocksContainer.style.display = 'grid';
        if (hint) hint.style.display = 'none';
        return;
    }
    
    // Показываем индикатор загрузки
    blocksContainer.innerHTML = '<div class="loading">Загрузка растений...</div>';
    
    // Загружаем HTML файлы
    await loadPlantFiles(category, blocksContainer);
    
    if (hint) hint.style.display = 'none';
}

// Функция для загрузки HTML файлов растений
async function loadPlantFiles(category, container) {
    try {
        // Получаем список всех HTML файлов
        const files = await getPlantFiles();
        
        // Определяем диапазон файлов для категории
        let displayFiles = [];
        if (category === 'allPlants') {
            displayFiles = files.slice(0, PLANTS_PER_PAGE);
        } else if (category === 'popular') {
            // Популярные - каждое 10-е растение
            displayFiles = files.filter((_, i) => i % 10 === 0).slice(0, PLANTS_PER_PAGE);
        } else if (category === 'indoor') {
            // Комнатные - первые 100 файлов
            displayFiles = files.slice(0, 100).filter((_, i) => i % 5 === 0).slice(0, PLANTS_PER_PAGE);
        } else if (category === 'garden') {
            // Садовые - файлы с 100 по 300
            displayFiles = files.slice(100, 300).filter((_, i) => i % 10 === 0).slice(0, PLANTS_PER_PAGE);
        } else if (category === 'care') {
            // Уход - файлы с 400 по 600
            displayFiles = files.slice(400, 600).filter((_, i) => i % 10 === 0).slice(0, PLANTS_PER_PAGE);
        } else if (category === 'families') {
            // Семейства - файлы с 200 по 400
            displayFiles = files.slice(200, 400).filter((_, i) => i % 10 === 0).slice(0, PLANTS_PER_PAGE);
        } else {
            displayFiles = files.slice(0, PLANTS_PER_PAGE);
        }
        
        container.innerHTML = '';
        container.style.display = 'grid';
        
        for (let i = 0; i < displayFiles.length; i++) {
            const file = displayFiles[i];
            try {
                const plant = await loadPlantData(file);
                if (plant) {
                    // Проверяем, не добавлено ли уже растение
                    if (!allPlants.find(p => p.filename === plant.filename)) {
                        allPlants.push(plant);
                    }
                    const block = createPlantBlock(plant);
                    container.appendChild(block);
                }
            } catch (error) {
                console.error(`Ошибка загрузки ${file}:`, error);
            }
        }
        
        // Загружаем остальные в фоне для поиска
        loadPlantsInBackground(files.slice(PLANTS_PER_PAGE));
        
    } catch (error) {
        console.error('Ошибка загрузки файлов:', error);
        container.innerHTML = '<div class="error">Ошибка загрузки данных</div>';
    }
}

// Загрузка растений в фоне для поиска
async function loadPlantsInBackground(files) {
    for (const file of files) {
        try {
            const plant = await loadPlantData(file);
            if (plant) {
                allPlants.push(plant);
            }
        } catch (error) {
            // Игнорируем ошибки при фоновой загрузке
        }
    }
}

// Загрузка данных растения из HTML файла
async function loadPlantData(filename) {
    // Проверяем кеш
    if (plantsCache.has(filename)) {
        return plantsCache.get(filename);
    }
    
    try {
        const response = await fetch(`Resorses/DATA/${filename}`);
        if (!response.ok) return null;
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Извлекаем информацию о растении
        const plant = {
            filename: filename,
            title: extractPlantTitle(doc),
            description: extractPlantDescription(doc),
            image: extractPlantImage(doc),
            shortInfo: extractShortInfo(doc),
            fullContent: html
        };
        
        // Сохраняем в кеш
        plantsCache.set(filename, plant);
        
        return plant;
    } catch (error) {
        console.error(`Ошибка загрузки ${filename}:`, error);
        return null;
    }
}

// Извлечение названия растения
function extractPlantTitle(doc) {
    // Ищем в ботаническом описании
    const h2Elements = doc.querySelectorAll('h2');
    for (const h2 of h2Elements) {
        if (h2.textContent.includes('Ботаническое описание')) {
            const strong = h2.nextElementSibling?.querySelector('strong');
            if (strong) {
                const text = strong.textContent.trim();
                // Извлекаем название из формата "Название (лат. LatinName)"
                const match = text.match(/^([^(]+)/);
                return match ? match[1].trim() : text;
            }
        }
    }
    
    // Ищем первый strong элемент
    const strong = doc.querySelector('strong');
    if (strong) {
        const text = strong.textContent.trim();
        const match = text.match(/^([^(]+)/);
        return match ? match[1].trim() : text;
    }
    
    return 'Растение';
}

// Извлечение описания
function extractPlantDescription(doc) {
    const h2Elements = doc.querySelectorAll('h2');
    for (const h2 of h2Elements) {
        if (h2.textContent.includes('Ботаническое описание')) {
            const p = h2.nextElementSibling?.nextElementSibling;
            if (p && p.tagName === 'P') {
                let text = p.textContent.trim();
                // Убираем название растения из начала
                text = text.replace(/^[^(]+\([^)]+\)\s*/, '');
                return text.substring(0, 150) + (text.length > 150 ? '...' : '');
            }
        }
    }
    
    // Ищем первый параграф после strong
    const strong = doc.querySelector('strong');
    if (strong) {
        const p = strong.parentElement?.nextElementSibling;
        if (p && p.tagName === 'P') {
            let text = p.textContent.trim();
            return text.substring(0, 150) + (text.length > 150 ? '...' : '');
        }
    }
    
    return 'Описание отсутствует';
}

// Извлечение изображения
function extractPlantImage(doc) {
    // Ищем первое изображение в ботаническом описании
    const h2Elements = doc.querySelectorAll('h2');
    for (const h2 of h2Elements) {
        if (h2.textContent.includes('Ботаническое описание')) {
            const img = h2.nextElementSibling?.nextElementSibling?.querySelector('img');
            if (img && img.src) {
                return convertImagePath(img.src);
            }
        }
    }
    
    // Ищем первое изображение в документе
    const img = doc.querySelector('img');
    if (img && img.src) {
        return convertImagePath(img.src);
    }
    
    return null;
}

// Преобразование пути изображения
function convertImagePath(src) {
    // Убираем протокол и домен, если есть
    src = src.replace(/^https?:\/\/[^\/]+/, '');
    
    // Если путь начинается с images/, преобразуем в Resorses/Images/
    if (src.startsWith('images/')) {
        return `Resorses/Images/${src.replace('images/', '')}`;
    }
    
    // Если путь уже относительный, добавляем Resorses/Images/
    if (!src.startsWith('http') && !src.startsWith('/')) {
        return `Resorses/Images/${src}`;
    }
    
    return src;
}

// Извлечение краткой информации
function extractShortInfo(doc) {
    const shortDiv = doc.getElementById('short');
    if (shortDiv) {
        const items = shortDiv.querySelectorAll('li');
        const info = {};
        items.forEach(item => {
            const text = item.textContent.trim();
            if (text.includes('Цветение:')) {
                info.flowering = text.replace('Цветение:', '').trim();
            } else if (text.includes('Освещение:')) {
                info.light = text.replace('Освещение:', '').trim();
            } else if (text.includes('Температура:')) {
                info.temperature = text.replace('Температура:', '').trim();
            }
        });
        return info;
    }
    return {};
}

// Создание блока растения
function createPlantBlock(plant) {
    const block = document.createElement('div');
    block.className = 'sample-block';
    block.onclick = () => openPlantDetail(plant);
    
    // Изображение
    if (plant.image) {
        const img = document.createElement('img');
        img.src = plant.image;
        img.alt = plant.title;
        img.className = 'plant-image';
        img.onerror = function() {
            this.style.display = 'none';
        };
        block.appendChild(img);
    }
    
    const content = document.createElement('div');
    content.className = 'plant-content';
    
    const h3 = document.createElement('h3');
    h3.textContent = plant.title;
    content.appendChild(h3);
    
    const p = document.createElement('p');
    p.textContent = plant.description;
    p.className = 'plant-description';
    content.appendChild(p);
    
    block.appendChild(content);
    
    return block;
}

// Функция для показа первых двух карточек
async function showFirstTwoCards(container, category) {
    try {
        const files = await getPlantFiles();
        const filesToLoad = category === 'allPlants' ? files.slice(0, 2) : 
                           category === 'popular' ? files.slice(0, 20).filter((_, i) => i % 10 === 0).slice(0, 2) :
                           category === 'indoor' ? files.slice(0, 50).filter((_, i) => i % 25 === 0).slice(0, 2) :
                           category === 'garden' ? files.slice(50, 150).filter((_, i) => i % 50 === 0).slice(0, 2) :
                           category === 'care' ? files.slice(400, 500).filter((_, i) => i % 50 === 0).slice(0, 2) :
                           files.slice(0, 2);
        
        container.innerHTML = '';
        container.style.display = 'grid';
        
        for (const file of filesToLoad) {
            try {
                const plant = await loadPlantData(file);
                if (plant) {
                    allPlants.push(plant);
                    const block = createPlantBlock(plant);
                    container.appendChild(block);
                }
            } catch (error) {
                console.error(`Ошибка загрузки ${file}:`, error);
            }
        }
        
        // Если не удалось загрузить, показываем заглушки
        if (container.children.length === 0) {
            showPlaceholderBlocks(container);
        }
    } catch (error) {
        console.error('Ошибка загрузки первых карточек:', error);
        showPlaceholderBlocks(container);
    }
}

// Функция для показа заглушек
function showPlaceholderBlocks(container) {
    for (let i = 0; i < 2; i++) {
        const block = document.createElement('div');
        block.className = 'sample-block';
        const text = document.createElement('p');
        text.textContent = 'Загрузка...';
        block.appendChild(text);
        container.appendChild(block);
    }
}

// Открытие детальной страницы растения
function openPlantDetail(plant) {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'plantModal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => modal.remove();
    
    // Загружаем HTML и исправляем ссылки
    fetch(`Resorses/DATA/${plant.filename}`)
        .then(response => response.text())
        .then(html => {
            // Исправляем ссылки на изображения
            let fixedHtml = html.replace(/src="images\//g, 'src="Resorses/Images/');
            fixedHtml = fixedHtml.replace(/src='images\//g, "src='Resorses/Images/");
            
            // Создаем iframe для отображения HTML
            const iframe = document.createElement('iframe');
            iframe.className = 'plant-iframe';
            iframe.srcdoc = fixedHtml;
            
            iframe.onload = function() {
                // Добавляем стили в iframe
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (iframeDoc) {
                        // Создаем элемент link для стилей
                        const link = iframeDoc.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/plant-styles.css';
                        iframeDoc.head.appendChild(link);
                        
                        // Также добавляем инлайн стили для надежности
                        const style = iframeDoc.createElement('style');
                        style.textContent = `
                            body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; background: #f7fbf8; padding: 20px; }
                            h2 { color: #0d6f45; font-size: 28px; font-weight: 600; margin-top: 30px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #0d6f45; }
                            h3 { color: #0b5d3a; font-size: 22px; font-weight: 600; margin-top: 25px; margin-bottom: 12px; }
                            .sod { background: #e4f3ea; border-radius: 12px; padding: 20px; margin-bottom: 30px; border-left: 4px solid #0d6f45; }
                            #short { background: #fff9c4; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid #f6c90e; }
                            img { max-width: 100%; height: auto; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
                            strong { color: #0d6f45; font-weight: 600; }
                        `;
                        iframeDoc.head.appendChild(style);
                        
                        // Исправляем все ссылки на изображения в iframe
                        const images = iframeDoc.querySelectorAll('img');
                        images.forEach(img => {
                            if (img.src && img.src.includes('images/')) {
                                img.src = img.src.replace(/images\//g, 'Resorses/Images/');
                            }
                            if (img.getAttribute('src') && img.getAttribute('src').startsWith('images/')) {
                                img.setAttribute('src', img.getAttribute('src').replace('images/', 'Resorses/Images/'));
                            }
                        });
                    }
                } catch (e) {
                    console.log('Не удалось добавить стили в iframe:', e);
                }
            };
            
            modalContent.appendChild(closeBtn);
            modalContent.appendChild(iframe);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Закрытие по клику вне модального окна
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            };
            
            // Закрытие по Escape
            document.addEventListener('keydown', function escapeHandler(e) {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escapeHandler);
                }
            });
        })
        .catch(error => {
            console.error('Ошибка загрузки HTML:', error);
            modalContent.appendChild(closeBtn);
            const errorMsg = document.createElement('div');
            errorMsg.textContent = 'Ошибка загрузки данных';
            errorMsg.style.padding = '20px';
            errorMsg.style.textAlign = 'center';
            modalContent.appendChild(errorMsg);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Закрытие по клику вне модального окна
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            };
            
            // Закрытие по Escape
            document.addEventListener('keydown', function escapeHandler(e) {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escapeHandler);
                }
            });
        });
}

// Получение списка HTML файлов
async function getPlantFiles() {
    const files = [];
    for (let i = 0; i < 1085; i++) {
        files.push(`text${i}.html`);
    }
    return files;
}

// Поиск растений
let searchTimeout;
function searchPlants(query) {
    clearTimeout(searchTimeout);
    
    if (!query || query.length < 2) {
        // Скрываем результаты поиска
        hideSearchResults();
        
        // Если есть активные фильтры, применяем их
        if (hasActiveFilters()) {
            applyFilters();
            return;
        }
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        const results = await performSearch(query);
        displaySearchResults(results);
    }, 300);
}

// Проверка активных фильтров
function hasActiveFilters() {
    return activeFilters.plantType !== '' || 
           activeFilters.light !== '' || 
           activeFilters.care !== '';
}

// Выполнение поиска
async function performSearch(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    // Ищем в уже загруженных растениях
    for (const plant of allPlants) {
        if (plant.title.toLowerCase().includes(queryLower) ||
            plant.description.toLowerCase().includes(queryLower)) {
            // Применяем фильтры
            if (matchesFilters(plant)) {
                results.push(plant);
            }
        }
    }
    
    // Если результатов мало, загружаем больше файлов
    if (results.length < 10) {
        const files = await getPlantFiles();
        const filesToLoad = files.slice(allPlants.length, allPlants.length + 50);
        
        for (const file of filesToLoad) {
            if (results.length >= 20) break;
            
            try {
                const plant = await loadPlantData(file);
                if (plant) {
                    allPlants.push(plant);
                    if (plant.title.toLowerCase().includes(queryLower) ||
                        plant.description.toLowerCase().includes(queryLower)) {
                        if (matchesFilters(plant)) {
                            results.push(plant);
                        }
                    }
                }
            } catch (error) {
                // Игнорируем ошибки
            }
        }
    }
    
    return results;
}

// Проверка соответствия фильтрам
function matchesFilters(plant) {
    if (activeFilters.plantType && !plant.description.toLowerCase().includes(activeFilters.plantType.toLowerCase())) {
        return false;
    }
    if (activeFilters.light && plant.shortInfo.light && !plant.shortInfo.light.toLowerCase().includes(activeFilters.light.toLowerCase())) {
        return false;
    }
    return true;
}

// Отображение результатов поиска
function displaySearchResults(results) {
    const searchResultsContainer = document.getElementById('searchResultsContainer');
    const searchResultsBlocks = document.getElementById('searchResultsBlocks');
    const mainContent = document.querySelector('.main-content');
    
    if (!searchResultsContainer || !searchResultsBlocks) return;
    
    // Показываем контейнер результатов поиска
    searchResultsContainer.style.display = 'block';
    
    // Очищаем и заполняем результатами
    searchResultsBlocks.innerHTML = '';
    searchResultsBlocks.style.display = 'grid';
    
    if (results.length === 0) {
        searchResultsBlocks.innerHTML = '<div class="no-results">Растения не найдены</div>';
        return;
    }
    
    results.forEach(plant => {
        const block = createPlantBlock(plant);
        searchResultsBlocks.appendChild(block);
    });
    
    // Прокручиваем к результатам
    searchResultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Скрытие результатов поиска
function hideSearchResults() {
    const searchResultsContainer = document.getElementById('searchResultsContainer');
    if (searchResultsContainer) {
        searchResultsContainer.style.display = 'none';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Поиск
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            searchPlants(query);
        });
    }
    
    // Чат
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                sendChatMessage(e.target.value);
                e.target.value = '';
            }
        });
    }
    
    // Удаляем начальные сообщения чата
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
        // Добавляем приветственное сообщение
        const welcomeMsg = document.createElement('div');
        welcomeMsg.className = 'chat-msg assistant';
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.textContent = 'Здравствуйте! Я помогу вам с вопросами о растениях.';
        welcomeMsg.appendChild(bubble);
        chatMessages.appendChild(welcomeMsg);
    }
    
    // Загружаем первые две карточки для каждой категории
    const categories = [
        { id: 'allPlantsBlocks', category: 'allPlants' },
        { id: 'familiesBlocks', category: 'families' },
        { id: 'popularBlocks', category: 'popular' },
        { id: 'indoorBlocks', category: 'indoor' },
        { id: 'gardenBlocks', category: 'garden' },
        { id: 'careBlocks', category: 'care' }
    ];
    
    categories.forEach(({ id, category }) => {
        const container = document.getElementById(id);
        if (container && container.children.length === 0) {
            showFirstTwoCards(container, category);
        }
    });
});

// Функции фильтров
function toggleFilters() {
    const panel = document.getElementById('filtersPanel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

function applyFilters() {
    activeFilters.plantType = document.getElementById('plantTypeFilter')?.value || '';
    activeFilters.light = document.getElementById('lightFilter')?.value || '';
    activeFilters.care = document.getElementById('careFilter')?.value || '';
    
    // Применяем фильтры к результатам поиска
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim()) {
        searchPlants(searchInput.value.trim());
    } else {
        // Если нет поискового запроса, показываем отфильтрованные результаты
        filterAllPlants();
    }
}

function clearFilters() {
    activeFilters = {
        plantType: '',
        light: '',
        care: ''
    };
    
    document.getElementById('plantTypeFilter').value = '';
    document.getElementById('lightFilter').value = '';
    document.getElementById('careFilter').value = '';
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Скрываем результаты поиска
    hideSearchResults();
}

function filterAllPlants() {
    const results = allPlants.filter(plant => matchesFilters(plant));
    displaySearchResults(results);
}

// Отправка сообщения в чат
function sendChatMessage(message) {
    if (!message.trim()) return;
    
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // Сообщение пользователя
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user';
    const userBubble = document.createElement('div');
    userBubble.className = 'bubble';
    userBubble.textContent = message;
    userMsg.appendChild(userBubble);
    chatMessages.appendChild(userMsg);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Имитация ответа AI
    setTimeout(() => {
        const aiMsg = document.createElement('div');
        aiMsg.className = 'chat-msg assistant';
        const aiBubble = document.createElement('div');
        aiBubble.className = 'bubble';
        
        // Простые ответы на основе ключевых слов
        const response = generateAIResponse(message);
        aiBubble.textContent = response;
        
        aiMsg.appendChild(aiBubble);
        chatMessages.appendChild(aiMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 500);
}

// Генерация ответа AI
function generateAIResponse(message) {
    const msg = message.toLowerCase();
    
    if (msg.includes('привет') || msg.includes('здравствуй')) {
        return 'Здравствуйте! Чем могу помочь?';
    }
    
    if (msg.includes('полив') || msg.includes('поливать')) {
        return 'Полив растений зависит от вида. Большинство комнатных растений нуждаются в умеренном поливе. Проверяйте влажность почвы перед поливом.';
    }
    
    if (msg.includes('освещение') || msg.includes('свет')) {
        return 'Освещение очень важно для растений. Большинство комнатных растений предпочитают яркий рассеянный свет. Избегайте прямых солнечных лучей в полдень.';
    }
    
    if (msg.includes('удобрение') || msg.includes('подкормка')) {
        return 'Подкармливайте растения в период активного роста (весна-лето) раз в 2-4 недели. Используйте специальные удобрения для комнатных растений.';
    }
    
    if (msg.includes('пересадка') || msg.includes('пересаживать')) {
        return 'Пересаживайте растения весной, когда корни заполнят горшок. Используйте горшок на 2-3 см больше предыдущего.';
    }
    
    if (msg.includes('болезнь') || msg.includes('вредитель')) {
        return 'При появлении болезней или вредителей изолируйте растение, обработайте специальными препаратами. Регулярно осматривайте растения для раннего обнаружения проблем.';
    }
    
    // Поиск по растениям
    for (const plant of allPlants.slice(0, 50)) {
        if (msg.includes(plant.title.toLowerCase())) {
            return `О ${plant.title}: ${plant.description}`;
        }
    }
    
    return 'Я могу помочь вам с вопросами о поливе, освещении, удобрении, пересадке растений и многом другом. Задайте вопрос!';
}
