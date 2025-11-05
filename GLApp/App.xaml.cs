using Microsoft.Extensions.DependencyInjection;
using GLApp.Service;

namespace GLApp
{
    public partial class App : Application
    {
        private static DatabaseService? _databaseService;

        public App()
        {
            InitializeComponent();
        }

        protected override Window CreateWindow(IActivationState? activationState)
        {
            // Получаем сервис из DI контейнера
            DatabaseService databaseService;
            
            if (_databaseService != null)
            {
                databaseService = _databaseService;
            }
            else
            {
                // Пытаемся получить из Handler, если доступен
                var services = Handler?.MauiContext?.Services;
                databaseService = services?.GetService<DatabaseService>() ?? new DatabaseService();
                
                _databaseService = databaseService;
            }
            
            var shell = new AppShell(databaseService);
            return new Window(shell);
        }
    }
}