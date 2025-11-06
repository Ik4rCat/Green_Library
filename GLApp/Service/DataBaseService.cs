using SQLite;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.IO;
using System.Reflection;
using System.Linq;
using SQLitePCL;
using GLApp.Models; 

namespace GLApp.Service
{
    public class DatabaseService
    {
        private readonly SQLiteAsyncConnection _database;

        // Статический конструктор для ранней инициализации SQLite
        static DatabaseService()
        {
            SQLitePCL.Batteries.Init();
        }

        public DatabaseService()
        {
            
            string dbPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "database.s3db");

            // ���� ���� ���, �������� �� �������� �������
            if (!File.Exists(dbPath))
            {
                var assembly = Assembly.GetExecutingAssembly();
                string resourceName = "GLApp.Resources.Raw.floristx.s3db";

                using Stream? stream = assembly.GetManifestResourceStream(resourceName);
                if (stream == null)
                {
                    throw new FileNotFoundException($"Ресурс базы данных не найден: {resourceName}");
                }

                using FileStream fs = File.Create(dbPath);
                stream.CopyTo(fs);
            }

            _database = new SQLiteAsyncConnection(dbPath);

<<<<<<< HEAD
            // Не создаем таблицы, т.к. они уже есть в БД
            // Просто проверяем, что БД доступна
            try
            {
                var tableInfo = _database.GetTableInfoAsync("Structure").Result;
                System.Diagnostics.Debug.WriteLine($"Таблица Structure существует, колонок: {tableInfo?.Count ?? 0}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Ошибка проверки таблицы Structure: {ex.Message}");
            }
=======
            //_database.CreateTableAsync<Articles>().Wait();
            _database.CreateTableAsync<Content>().Wait();
            _database.CreateTableAsync<ContentContent>().Wait();
            _database.CreateTableAsync<ContentDocsize>().Wait();
            _database.CreateTableAsync<ContentSegdir>().Wait();
            _database.CreateTableAsync<ContentSegments>().Wait();
            _database.CreateTableAsync<ContentStat>().Wait();
            _database.CreateTableAsync<Structure>().Wait();
>>>>>>> Withoutdb
        }

        public Task<List<T>> GetAllAsync<T>() where T : new()
        {
            return _database.Table<T>().ToListAsync();
        }

        public Task<T> GetItemAsync<T>(object primaryKey) where T : new()
        {
            return _database.FindAsync<T>(primaryKey);
        }

        public Task<int> SaveItemAsync<T>(T item)
        {
            return _database.InsertOrReplaceAsync(item);
        }

        public Task<int> DeleteItemAsync<T>(T item)
        {
            return _database.DeleteAsync(item);
        }

        // Получить все уникальные категории (где Parent = "root")
        public async Task<List<string>> GetCategoriesAsync()
        {
            try
            {
                System.Diagnostics.Debug.WriteLine("=== Начало GetCategoriesAsync ===");
                
                // Получаем категории из Structure, где parent = "root"
                var allStructures = await _database.Table<Structure>().ToListAsync();
                System.Diagnostics.Debug.WriteLine($"Всего записей в Structure: {allStructures?.Count ?? 0}");
                
                if (allStructures != null && allStructures.Count > 0)
                {
                    // Выводим первые несколько записей для отладки
                    foreach (var s in allStructures.Take(5))
                    {
                        System.Diagnostics.Debug.WriteLine($"  Structure: Category='{s.Category}', Parent='{s.Parent}', Language='{s.Language}'");
                    }
                }
                
                // Ищем категории с parent = "root"
                // Пробуем разные варианты сравнения
                var rootCategories1 = allStructures?
                    .Where(s => s.Parent != null && s.Parent.Equals("root", StringComparison.OrdinalIgnoreCase))
                    .Where(s => !string.IsNullOrEmpty(s.Category))
                    .Select(s => s.Category!)
                    .Distinct()
                    .ToList() ?? new List<string>();
                
                // Также пробуем точное сравнение
                var rootCategories2 = allStructures?
                    .Where(s => s.Parent == "root")
                    .Where(s => !string.IsNullOrEmpty(s.Category))
                    .Select(s => s.Category!)
                    .Distinct()
                    .ToList() ?? new List<string>();
                
                // Используем результат, который дает больше категорий
                var rootCategories = rootCategories1.Count > rootCategories2.Count ? rootCategories1 : rootCategories2;
                
                System.Diagnostics.Debug.WriteLine($"Категорий (ignore case): {rootCategories1.Count}");
                System.Diagnostics.Debug.WriteLine($"Категорий (точное): {rootCategories2.Count}");
                
                System.Diagnostics.Debug.WriteLine($"Категорий с parent='root': {rootCategories.Count}");
                if (rootCategories.Count > 0)
                {
                    System.Diagnostics.Debug.WriteLine($"Найденные категории: {string.Join(", ", rootCategories)}");
                }
                
                // Если не найдено, пробуем получить из Articles как fallback
                if (rootCategories.Count == 0)
                {
                    System.Diagnostics.Debug.WriteLine("Категории не найдены в Structure с parent='root', пробуем Articles");
                    var allArticles = await _database.Table<Articles>().ToListAsync();
                    System.Diagnostics.Debug.WriteLine($"Всего статей: {allArticles?.Count ?? 0}");
                    
                    if (allArticles != null && allArticles.Count > 0)
                    {
                        var categoriesFromArticles = allArticles
                            .Where(a => !string.IsNullOrEmpty(a.Category))
                            .Select(a => a.Category!)
                            .Distinct()
                            .ToList();
                        
                        System.Diagnostics.Debug.WriteLine($"Категорий из Articles: {categoriesFromArticles.Count}");
                        if (categoriesFromArticles.Count > 0)
                        {
                            System.Diagnostics.Debug.WriteLine($"Категории из Articles: {string.Join(", ", categoriesFromArticles.Take(10))}");
                        }
                        return categoriesFromArticles;
                    }
                }
                
                System.Diagnostics.Debug.WriteLine("=== Конец GetCategoriesAsync ===");
                return rootCategories;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"ОШИБКА в GetCategoriesAsync: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Тип ошибки: {ex.GetType().Name}");
                System.Diagnostics.Debug.WriteLine($"StackTrace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    System.Diagnostics.Debug.WriteLine($"Внутренняя ошибка: {ex.InnerException.Message}");
                }
                return new List<string>();
            }
        }

        // Получить темы (статьи) по категории
        public async Task<List<Articles>> GetArticlesByCategoryAsync(string category)
        {
            return await _database.Table<Articles>()
                .Where(a => a.Category == category)
                .ToListAsync();
        }

        // Получить контент статьи по ID
        public async Task<Content?> GetContentByArticleIdAsync(int articleId)
        {
            return await _database.Table<Content>()
                .Where(c => c.ArticleId == articleId)
                .FirstOrDefaultAsync();
        }
    }
}