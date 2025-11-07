using CommunityToolkit.Maui;
using CommunityToolkit.Maui.Behaviors;
using CommunityToolkit.Maui.Core;

namespace GLApp
{
    public partial class MainPage : ContentPage
    {
        public MainPage()
        {
            InitializeComponent();
        }

        public void DisplayHtmlContent(string htmlContent)
        {
            try
            {
                if (ContentWebView == null)
                {
                    System.Diagnostics.Debug.WriteLine("ContentWebView is null");
                    return;
                }

                if (string.IsNullOrEmpty(htmlContent))
                {
                    ContentWebView.Source = new HtmlWebViewSource { Html = "<html><body><p>Sample text</p></body></html>" };
                }
                else
                {
                    ContentWebView.Source = new HtmlWebViewSource { Html = htmlContent };
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Ошибка отображения HTML контента: {ex.Message}");
            }
        }
    }
}
