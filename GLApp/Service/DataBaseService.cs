using SQLite;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.IO;
using System.Reflection;
using GLApp.Models; 

namespace GLApp.Service
{
    public class DatabaseService
    {
        private readonly SQLiteAsyncConnection _database;

        public DatabaseService()
        {
            string dbPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "database.s3db");

            // ≈сли базы нет, копируем из ресурсов проекта
            if (!File.Exists(dbPath))
            {
                var assembly = Assembly.GetExecutingAssembly();
                string resourceName = "GLApp.Resources.Raw.flotistx.s3db";

                using Stream stream = assembly.GetManifestResourceStream(resourceName);
                using FileStream fs = File.Create(dbPath);
                stream.CopyTo(fs);
            }

            _database = new SQLiteAsyncConnection(dbPath);

            //_database.CreateTableAsync<Articles>().Wait();
            _database.CreateTableAsync<Content>().Wait();
            _database.CreateTableAsync<ContentContent>().Wait();
            _database.CreateTableAsync<ContentDocsize>().Wait();
            _database.CreateTableAsync<ContentSegdir>().Wait();
            _database.CreateTableAsync<ContentSegments>().Wait();
            _database.CreateTableAsync<ContentStat>().Wait();
            _database.CreateTableAsync<Structure>().Wait();
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
    }
}