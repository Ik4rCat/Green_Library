using System.Collections.ObjectModel;
using System.Windows.Input;

namespace GLApp
{
    public partial class AppShell : Shell
    {

        public AppShell()
        {
            InitializeComponent();
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