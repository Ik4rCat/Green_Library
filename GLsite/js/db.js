// Простая обёртка над IndexedDB + сид-инициализация из JSON
const DB_NAME = 'green_lib_db';
const DB_VERSION = 1;
const STORE_PLANTS = 'plants';
const STORE_SETTINGS = 'settings';

function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_PLANTS)) {
                const plants = db.createObjectStore(STORE_PLANTS, { keyPath: 'id' });
                plants.createIndex('name', 'name', { unique: false });
                plants.createIndex('category', 'category', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
                db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function seedIfEmpty() {
    const db = await openDb();
    const tx = db.transaction(STORE_PLANTS, 'readonly');
    const store = tx.objectStore(STORE_PLANTS);
    const count = await new Promise((res, rej) => {
        const r = store.count();
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
    });
    if (count > 0) return; // уже инициализировано

    // Попытка загрузить из SQLite Raw/floristx.s3db через sql.js (CDN)
    let loaded = false;
    try {
        const ok = await (window.__sqlJsCdnLoaded || Promise.resolve(false));
        if (ok && window.initSqlJs) {
            const SQL = await window.initSqlJs({
                locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });
            const buf = await fetch('./Raw/floristx.s3db').then(r => r.arrayBuffer());
            const u8 = new Uint8Array(buf);
            const dbSql = new SQL.Database(u8);
            const plants = await extractPlantsFromSql(dbSql);
            if (plants && plants.length) {
                await bulkInsertPlants(plants);
                loaded = true;
                await setSetting('data_source', 'sqlite');
            }
        }
    } catch (e) {
        // Падаем в сид JSON ниже
        console.warn('SQLite load failed, fallback to seed JSON:', e);
    }

    if (!loaded) {
        const seed = await fetch('./data/plants.seed.json').then(r => r.json());
        await bulkInsertPlants(seed);
        await setSetting('data_source', 'seed');
    }
}

async function bulkInsertPlants(items) {
    const db = await openDb();
    const wtx = db.transaction(STORE_PLANTS, 'readwrite');
    const wstore = wtx.objectStore(STORE_PLANTS);
    await Promise.all(items.map(item => new Promise((res, rej) => {
        const r = wstore.put(item);
        r.onsuccess = () => res(true);
        r.onerror = () => rej(r.error);
    })));
    await new Promise((res, rej) => { wtx.oncomplete = () => res(true); wtx.onerror = () => rej(wtx.error); });
}

async function extractPlantsFromSql(dbSql) {
    // Определяем таблицу и поля эвристически
    try {
        const tables = dbSql.exec("SELECT name FROM sqlite_master WHERE type='table'");
        const tableNames = (tables?.[0]?.values || []).map(v => v[0]);
        let chosen = null;
        for (const t of tableNames) {
            // пробуем выбрать одну запись и посмотреть столбцы
            const res = dbSql.exec(`SELECT * FROM ${t} LIMIT 1`);
            if (!res || !res[0]) continue;
            const cols = res[0].columns.map(c => c.toLowerCase());
            // Ищем набор столбцов
            const hasName = cols.some(c => c.includes('name') || c.includes('title') || c.includes('plant'));
            const hasDesc = cols.some(c => c.includes('desc') || c.includes('text') || c.includes('content'));
            if (hasName && hasDesc) { chosen = { table: t, cols: res[0].columns }; break; }
        }
        if (!chosen) return [];
        const resAll = dbSql.exec(`SELECT * FROM ${chosen.table}`);
        if (!resAll || !resAll[0]) return [];
        const cols = resAll[0].columns;
        const nameIdx = cols.findIndex(c => /name|title|plant/i.test(c));
        const descIdx = cols.findIndex(c => /desc|text|content/i.test(c));
        const catIdx = cols.findIndex(c => /cat|type|group/i.test(c));
        const idIdx = cols.findIndex(c => /id|guid|key/i.test(c));
        const imgIdx = cols.findIndex(c => /img|image|photo|pic|filename/i.test(c));
        const tagIdx = cols.findIndex(c => /tag|keyword/i.test(c));
        const plants = resAll[0].values.map(row => ({
            id: String(idIdx >= 0 ? row[idIdx] : `${row[nameIdx]}`),
            name: String(row[nameIdx] ?? 'Без названия'),
            description: String(row[descIdx] ?? ''),
            category: String(catIdx >= 0 ? (row[catIdx] ?? '') : ''),
            tags: tagIdx >= 0 && row[tagIdx] ? String(row[tagIdx]).split(/[,;\s]+/).filter(Boolean) : [],
            image: imgIdx >= 0 ? String(row[imgIdx] ?? '') : ''
        }));
        return plants;
    } catch (e) {
        console.warn('extractPlantsFromSql failed', e);
        return [];
    }
}

async function getAllPlants() {
    const db = await openDb();
    const tx = db.transaction(STORE_PLANTS, 'readonly');
    const store = tx.objectStore(STORE_PLANTS);
    return new Promise((res, rej) => {
        const r = store.getAll();
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
    });
}

async function getPlantById(id) {
    const db = await openDb();
    const tx = db.transaction(STORE_PLANTS, 'readonly');
    const store = tx.objectStore(STORE_PLANTS);
    return new Promise((res, rej) => {
        const r = store.get(id);
        r.onsuccess = () => res(r.result || null);
        r.onerror = () => rej(r.error);
    });
}

async function searchPlants(query, category) {
    const q = (query || '').trim().toLowerCase();
    const all = await getAllPlants();
    return all.filter(p => {
        const inCat = !category || category === 'all' || p.category === category;
        if (!q) return inCat;
        const hay = `${p.name} ${p.description} ${p.tags?.join(' ')}`.toLowerCase();
        return inCat && hay.includes(q);
    });
}

// Импорт из HTML-файлов: пользователь выбирает файлы в UI (settings)
async function importFromHtmlFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return 0;
    const parsed = await Promise.all(files.map(async (f, idx) => {
        const text = await f.text();
        // Простая эвристика: заголовок из <title> или <h1>, описание — очищенный текст
        const titleMatch = text.match(/<title>([\s\S]*?)<\/title>/i) || text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const name = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : f.name;
        const bodyText = text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
        const description = bodyText.replace(/\s+/g, ' ').trim().slice(0, 2000);
        return {
            id: `html_${Date.now()}_${idx}`,
            name,
            description,
            category: '',
            tags: [],
            image: ''
        };
    }));
    await bulkInsertPlants(parsed);
    await setSetting('data_source', 'html');
    return parsed.length;
}

async function setSetting(key, value) {
    const db = await openDb();
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);
    await new Promise((res, rej) => {
        const r = store.put({ key, value });
        r.onsuccess = () => res(true);
        r.onerror = () => rej(r.error);
    });
}

async function getSetting(key) {
    const db = await openDb();
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const store = tx.objectStore(STORE_SETTINGS);
    return new Promise((res, rej) => {
        const r = store.get(key);
        r.onsuccess = () => res(r.result ? r.result.value : null);
        r.onerror = () => rej(r.error);
    });
}

window.GreenDb = {
    seedIfEmpty,
    getAllPlants,
    getPlantById,
    searchPlants,
    setSetting,
    getSetting,
    importFromHtmlFiles,
};


