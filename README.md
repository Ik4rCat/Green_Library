# Green_Library
dotnet MAUI android app && site

Made by casDev team:
 - Alt
 - ARTA

## GLsite (веб-версия «Справочник садовода»)

Папка: `GLsite`

- Стек: HTML + CSS + JS (без бэкенда).
- Данные хранятся в IndexedDB в браузере и один раз инициализируются из `GLsite/data/plants.seed.json`.
- Приложение `GLApp` не изменяется.

### Запуск локально

Откройте `GLsite/index.html` любым статическим сервером, например:

### Структура

- `GLsite/index.html` — каркас SPA.
- `GLsite/css/styles.css` — тема (зелёный `#0d6f45` и жёлтые акценты).
- `GLsite/js/db.js` — IndexedDB, сид-инициализация, CRUD.
- `GLsite/js/app.js` — роутинг и рендер страниц.
- `GLsite/js/chat.js` — заглушка вызова ИИ, готовая точка интеграции.
- `GLsite/data/plants.seed.json` — примерные данные растений.

### Интеграция ИИ (подготовка)

Добавьте обработчик в `GLsite/js/chat.js` в функцию `callAiProvider(messages)` для вызова нужного API. Токен берётся из IndexedDB (`settings.ai_token`).
