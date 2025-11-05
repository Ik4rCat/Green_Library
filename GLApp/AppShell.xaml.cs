using System.Collections.ObjectModel;
using System.Windows.Input;
using GLApp.Service;
using GLApp.Models;
using Microsoft.Maui.Controls;

namespace GLApp
{
    public partial class AppShell : Shell
    {
        private readonly DatabaseService _databaseService;

        public AppShell(DatabaseService databaseService)
        {
            InitializeComponent();
            _databaseService = databaseService;
            LoadCategoriesAsync();
        }

        private async void LoadCategoriesAsync()
        {
            try
            {
                if (_databaseService == null)
                {
                    System.Diagnostics.Debug.WriteLine("DatabaseService is null");
                    return;
                }

                System.Diagnostics.Debug.WriteLine("Начинаем загрузку категорий...");
                var categories = await _databaseService.GetCategoriesAsync();
                System.Diagnostics.Debug.WriteLine($"Получено категорий: {categories?.Count ?? 0}");
                
                if (categories == null || categories.Count == 0)
                {
                    System.Diagnostics.Debug.WriteLine("No categories found");
                    // Добавляем тестовую категорию для проверки
                    MainThread.BeginInvokeOnMainThread(() =>
                    {
                        var testItem = new FlyoutItem
                        {
                            Title = "Тестовая категория",
                            FlyoutDisplayOptions = FlyoutDisplayOptions.AsMultipleItems
                        };
                        var testContent = new ShellContent
                        {
                            Title = "Тест",
                            ContentTemplate = new DataTemplate(() => new ContentPage
                            {
                                Title = "Тест",
                                Content = new StackLayout
                                {
                                    Padding = new Thickness(20),
                                    Children = { new Label { Text = "Категории не найдены в базе данных" } }
                                }
                            })
                        };
                        testItem.Items.Add(testContent);
                        Items.Add(testItem);
                    });
                    return;
                }
                
                // Загружаем категории и статьи асинхронно
                foreach (var category in categories)
                {
                    if (string.IsNullOrEmpty(category))
                        continue;

                    System.Diagnostics.Debug.WriteLine($"Добавляем категорию: {category}");
                    
                    // Загружаем статьи для этой категории
                    var articles = await _databaseService.GetArticlesByCategoryAsync(category);
                    System.Diagnostics.Debug.WriteLine($"Найдено статей для категории '{category}': {articles?.Count ?? 0}");
                    
                    // Добавляем на главном потоке
                    MainThread.BeginInvokeOnMainThread(() =>
                    {
                        var flyoutItem = new FlyoutItem
                        {
                            Title = category,
                            FlyoutDisplayOptions = FlyoutDisplayOptions.AsMultipleItems
                        };

                        // Добавляем заголовок категории
                        var categoryShellContent = new ShellContent
                        {
                            Title = category,
                            ContentTemplate = new DataTemplate(() => new ContentPage
                            {
                                Title = category,
                                Content = new StackLayout
                                {
                                    Padding = new Thickness(20),
                                    Children = { new Label { Text = $"Выберите тему из категории: {category}" } }
                                }
                            })
                        };

                        flyoutItem.Items.Add(categoryShellContent);

                        // Добавляем статьи для этой категории
                        if (articles != null)
                        {
                            foreach (var article in articles)
                            {
                                if (article == null)
                                    continue;

                                var articleId = article.Article_id;
                                var articleName = article.Article_name ?? "Без названия";
                                
                                // Создаем класс для страницы статьи
                                var articlePage = new ContentPage
                                {
                                    Title = articleName,
                                    BindingContext = articleId,
                                    Content = new StackLayout
                                    {
                                        Padding = new Thickness(20),
                                        Children = 
                                        { 
                                            new Label 
                                            { 
                                                Text = "Загрузка контента...",
                                                HorizontalOptions = LayoutOptions.Center,
                                                VerticalOptions = LayoutOptions.Center
                                            } 
                                        }
                                    }
                                };
                                
                                // Подписываемся на событие появления страницы
                                articlePage.Appearing += async (s, e) =>
                                {
                                    await LoadArticleContent(articleId);
                                    await GoToAsync("//MainPage");
                                };
                                
                                var articleShellContent = new ShellContent
                                {
                                    Title = articleName,
                                    Content = articlePage
                                };
                                
                                flyoutItem.Items.Add(articleShellContent);
                            }
                        }

                        Items.Add(flyoutItem);
                    });
                }
            }
            catch (Exception ex)
            {
                // Обработка ошибок
                System.Diagnostics.Debug.WriteLine($"Ошибка загрузки категорий: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"StackTrace: {ex.StackTrace}");
            }
        }

        private async Task LoadArticleContent(int articleId)
        {
            try
            {
                if (_databaseService == null)
                {
                    System.Diagnostics.Debug.WriteLine("DatabaseService is null in LoadArticleContent");
                    return;
                }

                var content = await _databaseService.GetContentByArticleIdAsync(articleId);
                if (content != null)
                {
                    // Находим MainPage и обновляем контент
                    if (Shell.Current == null)
                    {
                        System.Diagnostics.Debug.WriteLine("Shell.Current is null");
                        return;
                    }

                    var mainPage = Shell.Current.CurrentPage as MainPage;
                    if (mainPage == null)
                    {
                        // Если MainPage не активна, переходим на неё
                        await Shell.Current.GoToAsync("//MainPage");
                        // Небольшая задержка для завершения навигации
                        await Task.Delay(100);
                        mainPage = Shell.Current.CurrentPage as MainPage;
                    }

                    if (mainPage != null)
                    {
                        string htmlContent = content.FullText ?? content.IntroText ?? "";
                        if (!string.IsNullOrEmpty(htmlContent))
                        {
                            // Обертываем в базовую HTML структуру если нужно
                            if (!htmlContent.Contains("<html", StringComparison.OrdinalIgnoreCase))
                            {
                                htmlContent = $"<html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head><body style='font-family: Arial; padding: 20px;'>{htmlContent}</body></html>";
                            }
                            mainPage.DisplayHtmlContent(htmlContent);
                        }
                    }
                    else
                    {
                        System.Diagnostics.Debug.WriteLine("MainPage is null after navigation");
                    }
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine($"Content not found for articleId: {articleId}");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Ошибка загрузки статьи: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"StackTrace: {ex.StackTrace}");
            }
        }

        private async void OnAiClicked(object sender, EventArgs e)
        {
            if (sender is VisualElement v)
            {
                await v.ScaleTo(0.96, 80, Easing.CubicOut);
                await v.ScaleTo(1.0, 80, Easing.CubicIn);
            }
            await Shell.Current.GoToAsync("ai_chat");
        }

        private void OnSearchTextChanged(object sender, TextChangedEventArgs e)
        {
            var searchBar = sender as SearchBar;
            if (searchBar?.IsFocused == true)
            {
                // Переход на SearchPage при фокусе
                Shell.Current.GoToAsync("search");
                searchBar.Unfocus(); // убираем фокус, чтобы клавиатура не перекрывала searchpage
                return;
            }
            var text = e.NewTextValue ?? string.Empty;
        }
    }

}