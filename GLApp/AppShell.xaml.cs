using System.Collections.ObjectModel;
using System.Windows.Input;

namespace GLApp
{
    public partial class AppShell : Shell
    {


      
        private async void OnFilterClicked(object sender, EventArgs e)
        {
            if (sender is Button button && button.CommandParameter is string filterType)
            {
                // Преобразуем фильтр в категории
                string category = filterType switch
                {
                    "Disease" => "Болезни",
                    "Pest" => "Вредители",
                    "Fertilizer" => "Удобрения",
                    "All" => string.Empty,
                    _ => string.Empty
                };
                await Shell.Current.GoToAsync($"categorylist?Category={category}");
                Shell.Current.FlyoutIsPresented = false;
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
            // Заменяем MessagingCenter на WeakReferenceMessenger
            //WeakReferenceMessenger.Default.Send(new SearchTextChangedMessage(text));
        }

    }

}