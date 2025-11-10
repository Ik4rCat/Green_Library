// Глобальные переменные
let allPlants = [];
let plantsCache = new Map();
let currentPage = 0;
const PLANTS_PER_PAGE = 20;
// Фильтры удалены

// Функция для переключения секций
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const content = section.querySelector('.section-content');
    const header = section.querySelector('.section-header');
    
    // Переключаем класс collapsed
    content.classList.toggle('collapsed');
    
    // Обновляем стрелку в заголовке
    if (header) {
        // Получаем текст заголовка без стрелки
        let headerText = header.textContent.trim();
        // Убираем стрелку, если она есть
        headerText = headerText.replace(/[▲▼]/g, '').trim();
        
        // Обновляем заголовок с правильной стрелкой
        if (content.classList.contains('collapsed')) {
            header.innerHTML = headerText + ' <span class="section-arrow">▼</span>';
        } else {
            header.innerHTML = headerText + ' <span class="section-arrow">▲</span>';
        }
    }
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
            // Популярные - включаем камнеломку (text40.html) и каждое 10-е растение
            const popularIndices = [40]; // Камнеломка
            for (let i = 0; i < files.length; i += 10) {
                if (i !== 40) { // Не дублируем камнеломку
                    popularIndices.push(i);
                }
            }
            displayFiles = popularIndices.map(i => files[i]).filter(f => f).slice(0, PLANTS_PER_PAGE);
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
            // Ищем strong элемент с описанием после h2
            let nextElement = h2.nextElementSibling;
            while (nextElement) {
                // Проверяем, есть ли strong элемент в текущем элементе
                const strong = nextElement.querySelector('strong') || (nextElement.tagName === 'STRONG' ? nextElement : null);
                if (strong) {
                    // Получаем весь текст родительского элемента (включая текст после strong)
                    const parentText = nextElement.textContent.trim();
                    if (parentText) {
                        // Извлекаем описание после названия и латинского названия
                        // Формат: "Название (лат. LatinName) – описание..."
                        const match = parentText.match(/[–—]\s*(.+)/);
                        if (match && match[1]) {
                            let description = match[1].trim();
                            // Убираем HTML теги <br> и заменяем на пробелы
                            description = description.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ');
                            // Убираем вложенные strong элементы из текста
                            description = description.replace(/\*\*([^*]+)\*\*/g, '$1');
                            if (description.length > 0) {
                                return description.substring(0, 120) + (description.length > 120 ? '...' : '');
                            }
                        }
                        // Если нет тире, пытаемся извлечь текст после названия
                        const strongText = strong.textContent.trim();
                        const nameMatch = strongText.match(/^([^(]+)\([^)]+\)/);
                        if (nameMatch) {
                            // Берем текст после strong элемента
                            const afterStrong = parentText.substring(parentText.indexOf(strongText) + strongText.length).trim();
                            if (afterStrong.length > 20) {
                                let description = afterStrong.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ');
                                return description.substring(0, 120) + (description.length > 120 ? '...' : '');
                            }
                        }
                    }
                }
                
                // Ищем параграф после ботанического описания
                if (nextElement.tagName === 'P' && nextElement.textContent.trim()) {
                    let text = nextElement.textContent.trim();
                    // Убираем название растения из начала
                    text = text.replace(/^[^(]+\([^)]+\)\s*/, '');
                    if (text.length > 0) {
                        return text.substring(0, 120) + (text.length > 120 ? '...' : '');
                    }
                }
                
                nextElement = nextElement.nextElementSibling;
            }
        }
    }
    
    // Ищем первый strong элемент и извлекаем текст из родительского элемента
    const strong = doc.querySelector('strong');
    if (strong) {
        const parent = strong.parentElement;
        if (parent) {
            const parentText = parent.textContent.trim();
            if (parentText) {
                // Извлекаем описание после названия
                const match = parentText.match(/[–—]\s*(.+)/);
                if (match && match[1]) {
                    let description = match[1].trim();
                    description = description.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ');
                    if (description.length > 0) {
                        return description.substring(0, 120) + (description.length > 120 ? '...' : '');
                    }
                }
                // Если нет тире, извлекаем текст после strong
                const strongText = strong.textContent.trim();
                const nameMatch = strongText.match(/^([^(]+)\([^)]+\)/);
                if (nameMatch) {
                    const afterStrong = parentText.substring(parentText.indexOf(strongText) + strongText.length).trim();
                    if (afterStrong.length > 20) {
                        let description = afterStrong.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ');
                        return description.substring(0, 120) + (description.length > 120 ? '...' : '');
                    }
                }
            }
        }
        
        // Ищем параграф после strong
        let nextElement = strong.parentElement?.nextElementSibling;
        while (nextElement) {
            if (nextElement.tagName === 'P' && nextElement.textContent.trim()) {
                let text = nextElement.textContent.trim();
                // Убираем название растения из начала, если есть
                text = text.replace(/^[^(]+\([^)]+\)\s*/, '');
                if (text.length > 0) {
                    return text.substring(0, 120) + (text.length > 120 ? '...' : '');
                }
            }
            nextElement = nextElement.nextElementSibling;
        }
    }
    
    // Ищем любой параграф с текстом
    const paragraphs = doc.querySelectorAll('p');
    for (const p of paragraphs) {
        let text = p.textContent.trim();
        if (text.length > 30) {
            // Убираем название растения из начала, если есть
            text = text.replace(/^[^(]+\([^)]+\)\s*/, '');
            if (text.length > 0) {
                return text.substring(0, 120) + (text.length > 120 ? '...' : '');
            }
        }
    }
    
    return 'Информация о растении';
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
    
    // Если путь начинается с images/plants_photo/, преобразуем в Resorses/Images/plants_photo/
    if (src.startsWith('images/plants_photo/')) {
        return `Resorses/Images/plants_photo/${src.replace('images/plants_photo/', '')}`;
    }
    
    // Если путь начинается с images/stati_photo/, преобразуем в Resorses/Images/stati_photo/
    if (src.startsWith('images/stati_photo/')) {
        return `Resorses/Images/stati_photo/${src.replace('images/stati_photo/', '')}`;
    }
    
    // Если путь начинается с images/stati_photo2/, преобразуем в Resorses/Images/stati_photo2/
    if (src.startsWith('images/stati_photo2/')) {
        return `Resorses/Images/stati_photo2/${src.replace('images/stati_photo2/', '')}`;
    }
    
    // Если путь начинается с images/stati_photo3/, преобразуем в Resorses/Images/stati_photo3/
    if (src.startsWith('images/stati_photo3/')) {
        return `Resorses/Images/stati_photo3/${src.replace('images/stati_photo3/', '')}`;
    }
    
    // Если путь начинается с images/stati_photo4/, преобразуем в Resorses/Images/stati_photo4/
    if (src.startsWith('images/stati_photo4/')) {
        return `Resorses/Images/stati_photo4/${src.replace('images/stati_photo4/', '')}`;
    }
    
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
    
    // Описание
    if (plant.description && plant.description !== 'Описание отсутствует' && plant.description !== 'Информация о растении') {
        const p = document.createElement('p');
        p.textContent = plant.description;
        p.className = 'plant-description';
        content.appendChild(p);
    } else {
        // Если описание не найдено, добавляем краткую информацию
        const p = document.createElement('p');
        p.textContent = 'Нажмите, чтобы узнать больше об этом растении';
        p.className = 'plant-description';
        p.style.fontStyle = 'italic';
        p.style.color = '#888';
        content.appendChild(p);
    }
    
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
                    // Исправляем ссылки на изображения в HTML перед загрузкой
                    // Получаем базовый путь от корня сайта
                    const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
                    const baseUrl = basePath ? basePath + '/' : '/';
                    
                    // Заменяем images/plants_photo на Resorses/Images/plants_photo
                    let fixedHtml = html.replace(/src="images\/plants_photo\//g, `src="${baseUrl}Resorses/Images/plants_photo/`);
                    fixedHtml = fixedHtml.replace(/src='images\/plants_photo\//g, `src='${baseUrl}Resorses/Images/plants_photo/`);
                    // Заменяем images/stati_photo на Resorses/Images/stati_photo
                    fixedHtml = fixedHtml.replace(/src="images\/stati_photo\//g, `src="${baseUrl}Resorses/Images/stati_photo/`);
                    fixedHtml = fixedHtml.replace(/src='images\/stati_photo\//g, `src='${baseUrl}Resorses/Images/stati_photo/`);
                    // Заменяем images/stati_photo2 на Resorses/Images/stati_photo2
                    fixedHtml = fixedHtml.replace(/src="images\/stati_photo2\//g, `src="${baseUrl}Resorses/Images/stati_photo2/`);
                    fixedHtml = fixedHtml.replace(/src='images\/stati_photo2\//g, `src='${baseUrl}Resorses/Images/stati_photo2/`);
                    // Заменяем images/stati_photo3 на Resorses/Images/stati_photo3
                    fixedHtml = fixedHtml.replace(/src="images\/stati_photo3\//g, `src="${baseUrl}Resorses/Images/stati_photo3/`);
                    fixedHtml = fixedHtml.replace(/src='images\/stati_photo3\//g, `src='${baseUrl}Resorses/Images/stati_photo3/`);
                    // Заменяем images/stati_photo4 на Resorses/Images/stati_photo4
                    fixedHtml = fixedHtml.replace(/src="images\/stati_photo4\//g, `src="${baseUrl}Resorses/Images/stati_photo4/`);
                    fixedHtml = fixedHtml.replace(/src='images\/stati_photo4\//g, `src='${baseUrl}Resorses/Images/stati_photo4/`);
                    // Общая замена для остальных images/
                    fixedHtml = fixedHtml.replace(/src="images\//g, `src="${baseUrl}Resorses/Images/`);
                    fixedHtml = fixedHtml.replace(/src='images\//g, `src='${baseUrl}Resorses/Images/`);
                    
                    // HTML-сущности &quot; уже исправлены в файлах на одинарные кавычки
                    // Оставляем как есть, так как файлы уже исправлены
            
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
                        
                        // Изображения уже исправлены в HTML перед загрузкой в iframe
                        // Добавляем обработчик ошибок для изображений на случай проблем
                        const images = iframeDoc.querySelectorAll('img');
                        images.forEach(img => {
                            img.onerror = function() {
                                // Если изображение не загрузилось, скрываем его
                                this.style.display = 'none';
                            };
                        });
                        
                        // Добавляем функции jumpToAnchor и checkCache в iframe
                        const script = iframeDoc.createElement('script');
                        script.textContent = `
                            function jumpToAnchor(sectionId, anchorId) {
                                try {
                                    const targetElement = document.querySelector(sectionId);
                                    if (targetElement) {
                                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        const anchor = document.querySelector(anchorId);
                                        if (anchor) {
                                            const allAnchors = document.querySelectorAll('.anchor');
                                            allAnchors.forEach(a => a.style.backgroundColor = '');
                                            anchor.style.backgroundColor = '#d4e8d4';
                                            setTimeout(() => {
                                                anchor.style.backgroundColor = '';
                                            }, 2000);
                                        }
                                    }
                                } catch (e) {
                                    console.log('Ошибка навигации:', e);
                                }
                            }
                            
                            function checkCache(img) {
                                // Пытаемся исправить путь к изображению
                                let src = img.getAttribute('src') || img.src || '';
                                
                                // Если путь начинается с images/, исправляем
                                if (src.includes('images/')) {
                                    src = src.replace(/images\/plants_photo\//g, 'Resorses/Images/plants_photo/');
                                    src = src.replace(/images\/stati_photo\//g, 'Resorses/Images/stati_photo/');
                                    src = src.replace(/images\/stati_photo2\//g, 'Resorses/Images/stati_photo2/');
                                    src = src.replace(/images\/stati_photo3\//g, 'Resorses/Images/stati_photo3/');
                                    src = src.replace(/images\/stati_photo4\//g, 'Resorses/Images/stati_photo4/');
                                    src = src.replace(/images\//g, 'Resorses/Images/');
                                    
                                    // Получаем базовый путь от корня сайта
                                    try {
                                        const parentWindow = window.parent || window;
                                        const basePath = parentWindow.location.pathname.substring(0, parentWindow.location.pathname.lastIndexOf('/'));
                                        if (basePath && !src.startsWith('http') && !src.startsWith('/')) {
                                            src = basePath + '/' + src;
                                        } else if (!src.startsWith('http') && !src.startsWith('/')) {
                                            src = '/' + src;
                                        }
                                    } catch (e) {
                                        // Если не можем получить доступ к parent, используем относительный путь
                                        if (!src.startsWith('http') && !src.startsWith('/')) {
                                            src = '../' + src;
                                        }
                                    }
                                    
                                    img.src = src;
                                    img.setAttribute('src', src);
                                }
                            }
                        `;
                        iframeDoc.head.appendChild(script);
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
    
    if (!query || query.length < 1) {
        // Скрываем результаты поиска
        hideSearchResults();
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        const results = await performSearch(query);
        displaySearchResults(results);
    }, 300);
}

// Выполнение поиска (улучшенный, более гибкий)
async function performSearch(query) {
    const results = [];
    const queryLower = query.toLowerCase().trim();
    
    // Разбиваем запрос на слова для более гибкого поиска
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
    
    // Функция для подсчета релевантности
    const calculateRelevance = (plant) => {
        let score = 0;
        const titleLower = plant.title.toLowerCase();
        const descLower = (plant.description || '').toLowerCase();
        
        // Точное совпадение названия - высший приоритет
        if (titleLower === queryLower) {
            score += 1000;
        }
        // Название начинается с запроса
        else if (titleLower.startsWith(queryLower)) {
            score += 500;
        }
        // Название содержит запрос
        else if (titleLower.includes(queryLower)) {
            score += 300;
        }
        
        // Поиск по словам
        queryWords.forEach(word => {
            if (titleLower.includes(word)) {
                score += 100;
            }
            if (descLower.includes(word)) {
                score += 50;
            }
        });
        
        // Поиск в описании
        if (descLower.includes(queryLower)) {
            score += 20;
        }
        
        // Поиск по частичным совпадениям (для опечаток)
        if (queryLower.length >= 3) {
            const querySubstr = queryLower.substring(0, Math.min(3, queryLower.length));
            if (titleLower.includes(querySubstr)) {
                score += 10;
            }
        }
        
        return score;
    };
    
    // Ищем в уже загруженных растениях
    for (const plant of allPlants) {
        const relevance = calculateRelevance(plant);
        if (relevance > 0) {
            results.push({ plant, relevance });
        }
    }
    
    // Если результатов мало, загружаем больше файлов
    if (results.length < 10) {
        const files = await getPlantFiles();
        const filesToLoad = files.slice(allPlants.length, Math.min(allPlants.length + 100, files.length));
        
        for (const file of filesToLoad) {
            if (results.length >= 50) break;
            
            try {
                const plant = await loadPlantData(file);
                if (plant) {
                    allPlants.push(plant);
                    const relevance = calculateRelevance(plant);
                    if (relevance > 0) {
                        results.push({ plant, relevance });
                    }
                }
            } catch (error) {
                // Игнорируем ошибки
            }
        }
    }
    
    // Сортируем по релевантности
    results.sort((a, b) => b.relevance - a.relevance);
    
    // Возвращаем только растения (без relevance)
    return results.map(r => r.plant).slice(0, 50);
}

// Фильтры удалены

// Отображение результатов поиска
function displaySearchResults(results) {
    const searchResultsContainer = document.getElementById('searchResultsContainer');
    const searchResultsBlocks = document.getElementById('searchResultsBlocks');
    const catalogContainer = document.getElementById('catalogContainer');
    
    if (!searchResultsContainer || !searchResultsBlocks) return;
    
    // Показываем контейнер результатов поиска
    searchResultsContainer.style.display = 'block';
    
    // Скрываем каталог
    if (catalogContainer) {
        catalogContainer.style.display = 'none';
    }
    
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
    const catalogContainer = document.getElementById('catalogContainer');
    
    if (searchResultsContainer) {
        searchResultsContainer.style.display = 'none';
    }
    if (catalogContainer) {
        catalogContainer.style.display = 'block';
    }
}

// Показ категории из leftbar
function showCategory(category, buttonElement) {
    // Скрываем результаты поиска
    hideSearchResults();
    
    // Убираем активный класс со всех кнопок
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Добавляем активный класс к выбранной кнопке
    if (buttonElement) {
        buttonElement.classList.add('active');
    }
    
    // Прокручиваем к нужной секции
    const sectionMap = {
        'allPlants': 'allPlantsSection',
        'popular': 'popularSection',
        'indoor': 'indoorSection',
        'garden': 'gardenSection',
        'families': 'familiesSection',
        'care': 'careSection'
    };
    
    const sectionId = sectionMap[category];
    if (sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            // Раскрываем секцию, если она свернута
            const content = section.querySelector('.section-content');
            if (content && content.classList.contains('collapsed')) {
                toggleSection(sectionId);
            }
            
            // Прокручиваем к секции
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем сохраненную позицию и размер чата
    loadChatPosition();
    
    // Инициализируем обработчик изменения размера
    const resizeHandle = document.getElementById('chatResizeHandle');
    if (resizeHandle) {
        resizeHandle.addEventListener('mousedown', startResize);
    }
    
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
        
        const apiKey = localStorage.getItem('openrouter_api_key') || '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';
        if (apiKey) {
            bubble.textContent = 'Здравствуйте! Я помогу вам с вопросами о растениях. У меня есть доступ к базе данных сайта.';
        } else {
            bubble.textContent = 'Здравствуйте! Я помогу вам с вопросами о растениях.';
        }
        
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

// Функции фильтров удалены

// Отправка сообщения в чат
async function sendChatMessage(message) {
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
    
    // Проверяем наличие API ключа
    const apiKey = localStorage.getItem('openrouter_api_key') || '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';
    
    if (!apiKey) {
        // Если нет API ключа, используем простые ответы
        setTimeout(() => {
            const aiMsg = document.createElement('div');
            aiMsg.className = 'chat-msg assistant';
            const aiBubble = document.createElement('div');
            aiBubble.className = 'bubble';
            
            const response = generateAIResponse(message);
            aiBubble.textContent = response;
            
            aiMsg.appendChild(aiBubble);
            chatMessages.appendChild(aiMsg);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 500);
        return;
    }
    
    // Показываем индикатор загрузки
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'chat-msg assistant';
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'bubble';
    loadingBubble.textContent = 'Думаю...';
    loadingBubble.id = 'loadingMsg';
    loadingMsg.appendChild(loadingBubble);
    chatMessages.appendChild(loadingMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        // Получаем контекст о растениях
        const plantContext = await getPlantContext(message);
        
        // Отправляем запрос к OpenAI API
        const response = await callOpenAI(message, plantContext, apiKey);
        
        // Удаляем индикатор загрузки
        loadingMsg.remove();
        
        // Показываем ответ
        const aiMsg = document.createElement('div');
        aiMsg.className = 'chat-msg assistant';
        const aiBubble = document.createElement('div');
        aiBubble.className = 'bubble';
        aiBubble.textContent = response;
        
        aiMsg.appendChild(aiBubble);
        chatMessages.appendChild(aiMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        // Удаляем индикатор загрузки
        loadingMsg.remove();
        
        // Показываем ошибку
        const errorMsg = document.createElement('div');
        errorMsg.className = 'chat-msg assistant';
        const errorBubble = document.createElement('div');
        errorBubble.className = 'bubble';
        errorBubble.style.color = '#d32f2f';
        errorBubble.textContent = 'Ошибка: ' + (error.message || 'Не удалось получить ответ от ИИ');
        
        errorMsg.appendChild(errorBubble);
        chatMessages.appendChild(errorMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Функция для переключения состояния чата
function toggleChat() {
    const chatWidget = document.getElementById('aiChatWidget');
    if (chatWidget) {
        const isCollapsing = !chatWidget.classList.contains('collapsed');
        chatWidget.classList.toggle('collapsed');
        
        // Сохраняем размер и позицию перед сворачиванием
        if (isCollapsing) {
            const width = chatWidget.offsetWidth;
            const height = chatWidget.offsetHeight;
            const rect = chatWidget.getBoundingClientRect();
            saveChatSize(width, height);
            saveChatPosition(rect.left, rect.top);
        }
        
        // Скрываем настройки при сворачивании
        if (isCollapsing) {
            const settings = document.getElementById('chatApiSettings');
            if (settings) {
                settings.style.display = 'none';
            }
        }
    }
}

// Перетаскивание чата
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

function startDrag(event) {
    event.preventDefault();
    const chatWidget = document.getElementById('aiChatWidget');
    if (!chatWidget) return;
    
    const rect = chatWidget.getBoundingClientRect();
    dragOffset.x = event.clientX - rect.left;
    dragOffset.y = event.clientY - rect.top;
    
    isDragging = true;
    chatWidget.style.cursor = 'grabbing';
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
}

function onDrag(event) {
    if (!isDragging) return;
    
    const chatWidget = document.getElementById('aiChatWidget');
    if (!chatWidget) return;
    
    const newX = event.clientX - dragOffset.x;
    const newY = event.clientY - dragOffset.y;
    
    // Ограничиваем перемещение границами окна
    const maxX = window.innerWidth - chatWidget.offsetWidth;
    const maxY = window.innerHeight - chatWidget.offsetHeight;
    
    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));
    
    chatWidget.style.left = constrainedX + 'px';
    chatWidget.style.top = constrainedY + 'px';
    chatWidget.style.right = 'auto';
    chatWidget.style.bottom = 'auto';
    
    // Сохраняем позицию
    saveChatPosition(constrainedX, constrainedY);
}

function stopDrag() {
    isDragging = false;
    const chatWidget = document.getElementById('aiChatWidget');
    if (chatWidget) {
        chatWidget.style.cursor = '';
    }
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
}

// Изменение размера чата
let isResizing = false;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;

function startResize(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const chatWidget = document.getElementById('aiChatWidget');
    if (!chatWidget) return;
    
    isResizing = true;
    resizeStartX = event.clientX;
    resizeStartY = event.clientY;
    resizeStartWidth = chatWidget.offsetWidth;
    resizeStartHeight = chatWidget.offsetHeight;
    
    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', stopResize);
}

function onResize(event) {
    if (!isResizing) return;
    
    const chatWidget = document.getElementById('aiChatWidget');
    if (!chatWidget) return;
    
    const deltaX = event.clientX - resizeStartX;
    const deltaY = event.clientY - resizeStartY;
    
    const newWidth = Math.max(300, Math.min(800, resizeStartWidth + deltaX));
    const newHeight = Math.max(200, Math.min(window.innerHeight - 100, resizeStartHeight - deltaY));
    
    chatWidget.style.width = newWidth + 'px';
    chatWidget.style.height = newHeight + 'px';
    chatWidget.style.maxHeight = 'none';
    
    // Сохраняем размер
    saveChatSize(newWidth, newHeight);
}

function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', stopResize);
}

// Сохранение и загрузка позиции и размера
function saveChatPosition(x, y) {
    localStorage.setItem('chatPosition', JSON.stringify({ x, y }));
}

function saveChatSize(width, height) {
    localStorage.setItem('chatSize', JSON.stringify({ width, height }));
}

function loadChatPosition() {
    const chatWidget = document.getElementById('aiChatWidget');
    if (!chatWidget) return;
    
    const savedPosition = localStorage.getItem('chatPosition');
    if (savedPosition) {
        try {
            const { x, y } = JSON.parse(savedPosition);
            chatWidget.style.left = x + 'px';
            chatWidget.style.top = y + 'px';
            chatWidget.style.right = 'auto';
            chatWidget.style.bottom = 'auto';
        } catch (e) {
            console.error('Error loading chat position:', e);
        }
    }
    
    const savedSize = localStorage.getItem('chatSize');
    if (savedSize) {
        try {
            const { width, height } = JSON.parse(savedSize);
            chatWidget.style.width = width + 'px';
            chatWidget.style.height = height + 'px';
            chatWidget.style.maxHeight = 'none';
        } catch (e) {
            console.error('Error loading chat size:', e);
        }
    }
}

// Переключение настроек API
function toggleApiSettings(event) {
    if (event) {
        event.stopPropagation();
    }
    const settings = document.getElementById('chatApiSettings');
    if (settings) {
        settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
        
        // Загружаем сохраненный ключ
        const apiKeyInput = document.getElementById('apiKeyInput');
        if (apiKeyInput) {
            const savedKey = localStorage.getItem('openrouter_api_key') || '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';
            if (savedKey) {
                apiKeyInput.value = savedKey;
            }
        }
    }
}

// Сохранение API ключа
function saveApiKey() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('openrouter_api_key', apiKey);
            showApiStatus('API ключ сохранен', 'success');
        } else {
            localStorage.removeItem('openrouter_api_key');
            showApiStatus('API ключ удален', 'info');
        }
    }
}

// Проверка API ключа
async function testApiKey() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (!apiKeyInput) return;
    
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showApiStatus('Введите API ключ', 'error');
        return;
    }
    
    showApiStatus('Проверяю...', 'info');
    
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        if (response.ok) {
            showApiStatus('API ключ действителен ✓', 'success');
            localStorage.setItem('openrouter_api_key', apiKey);
        } else {
            showApiStatus('Неверный API ключ', 'error');
        }
    } catch (error) {
        showApiStatus('Ошибка проверки: ' + error.message, 'error');
    }
}

// Показ статуса API
function showApiStatus(message, type) {
    const statusDiv = document.getElementById('apiStatus');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = 'api-status ' + type;
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'api-status';
        }, 3000);
    }
}

// Получение контекста о растениях для промпта
async function getPlantContext(userMessage) {
    const msg = userMessage.toLowerCase();
    const context = [];
    const words = msg.split(/\s+/).filter(w => w.length > 2);
    
    // Ищем упоминания растений по названию
    for (const plant of allPlants) {
        const plantNameLower = plant.title.toLowerCase();
        
        // Проверяем точное совпадение или частичное
        if (words.some(word => plantNameLower.includes(word)) || 
            plantNameLower.split(' ').some(plantWord => words.includes(plantWord))) {
            
            // Если найдено точное совпадение, загружаем полную информацию
            let fullInfo = plant.description;
            if (plant.filename && context.length < 2) {
                try {
                    const plantData = await loadPlantData(plant.filename);
                    if (plantData && plantData.fullContent) {
                        // Извлекаем текст из HTML
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(plantData.fullContent, 'text/html');
                        const paragraphs = doc.querySelectorAll('p');
                        let fullText = '';
                        paragraphs.forEach(p => {
                            const text = p.textContent.trim();
                            if (text.length > 20) {
                                fullText += text + ' ';
                            }
                        });
                        if (fullText.length > 0) {
                            fullInfo = fullText.substring(0, 500) + '...';
                        }
                    }
                } catch (e) {
                    // Используем описание по умолчанию
                }
            }
            
            context.push({
                name: plant.title,
                description: fullInfo,
                filename: plant.filename
            });
            
            // Ограничиваем количество для промпта
            if (context.length >= 3) break;
        }
    }
    
    // Если не найдено конкретных растений, добавляем общую информацию
    if (context.length === 0 && allPlants.length > 0) {
        // Добавляем несколько популярных растений для контекста
        const popularPlants = allPlants.slice(0, 2);
        popularPlants.forEach(plant => {
            context.push({
                name: plant.title,
                description: plant.description.substring(0, 150) + '...'
            });
        });
    }
    
    return context;
}

// Вызов OpenRouter API
async function callOpenAI(userMessage, plantContext, apiKey) {
    // Формируем системный промпт с контекстом
    let systemPrompt = `Ты помощник по уходу за растениями. Ты помогаешь пользователям с вопросами о растениях, их выращивании, уходе, поливе, освещении и других аспектах садоводства и комнатного цветоводства. Отвечай на русском языке, будь дружелюбным и информативным. Используй информацию из базы данных о растениях, если она доступна.`;
    
    // Добавляем контекст о растениях
    if (plantContext.length > 0) {
        systemPrompt += '\n\nИнформация о растениях из базы данных сайта:\n';
        plantContext.forEach((ctx, index) => {
            if (ctx.name) {
                systemPrompt += `${index + 1}. ${ctx.name}: ${ctx.description}\n`;
            }
        });
        systemPrompt += '\nИспользуй эту информацию для ответов на вопросы пользователя.';
    } else if (allPlants.length > 0) {
        systemPrompt += `\n\nВ базе данных сайта есть информация о ${allPlants.length} растениях. Если пользователь спрашивает о конкретном растении, попробуй найти его в базе или дай общий совет.`;
    }
    
    // Получаем историю сообщений из чата
    const chatHistory = getChatHistory();
    
    // Формируем сообщения для API
    const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-8), // Последние 8 сообщений для контекста (чтобы не превысить лимит токенов)
        { role: 'user', content: userMessage }
    ];
    
    // Список моделей для попытки (от более предпочтительных к менее)
    const models = [
        'openai/gpt-3.5-turbo',
        'gpt-3.5-turbo',
        'meta-llama/llama-3.2-3b-instruct:free',
        'anthropic/claude-3-haiku',
        'openai/gpt-4o-mini'
    ];
    
    let lastError = null;
    
    // Пробуем каждую модель
    for (const model of models) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin || 'https://localhost',
                    'X-Title': 'Green Library'
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 600
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                console.warn(`Model ${model} failed:`, error);
                lastError = error.error?.message || error.message || `HTTP ${response.status}`;
                continue; // Пробуем следующую модель
            }
            
            const data = await response.json();
            
            // Проверяем наличие ответа
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.warn(`Model ${model} returned unexpected format:`, data);
                continue; // Пробуем следующую модель
            }
            
            return data.choices[0].message.content;
        } catch (error) {
            console.warn(`Model ${model} error:`, error);
            lastError = error.message;
            continue; // Пробуем следующую модель
        }
    }
    
    // Если все модели не сработали, выбрасываем ошибку
    throw new Error(lastError || 'Все модели недоступны');
}

// Получение истории чата
function getChatHistory() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return [];
    
    const history = [];
    const messages = chatMessages.querySelectorAll('.chat-msg');
    
    messages.forEach(msg => {
        const bubble = msg.querySelector('.bubble');
        if (bubble && bubble.id !== 'loadingMsg') {
            const role = msg.classList.contains('user') ? 'user' : 'assistant';
            const content = bubble.textContent.trim();
            if (content) {
                history.push({ role, content });
            }
        }
    });
    
    return history;
}

// Генерация ответа AI (fallback, если нет API ключа)
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
    
    return 'Я могу помочь вам с вопросами о поливе, освещении, удобрении, пересадке растений и многом другом.';
}

// Функция для навигации по содержанию в HTML файлах
function jumpToAnchor(sectionId, anchorId) {
    try {
        // Ищем iframe с контентом
        const iframe = document.querySelector('.plant-iframe');
        if (iframe && iframe.contentDocument) {
            const iframeDoc = iframe.contentDocument;
            const targetElement = iframeDoc.querySelector(sectionId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Подсвечиваем активный пункт содержания
                const anchor = iframeDoc.querySelector(anchorId);
                if (anchor) {
                    // Убираем подсветку со всех пунктов
                    const allAnchors = iframeDoc.querySelectorAll('.anchor');
                    allAnchors.forEach(a => a.style.backgroundColor = '');
                    // Подсвечиваем активный
                    anchor.style.backgroundColor = '#d4e8d4';
                    setTimeout(() => {
                        anchor.style.backgroundColor = '';
                    }, 2000);
                }
            }
        }
    } catch (e) {
        console.log('Ошибка навигации:', e);
    }
}