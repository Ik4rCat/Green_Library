using Android.App;
using Android.Content.PM;
using Android.OS;
using SQLitePCL;

namespace GLApp
{
    [Activity(Theme = "@style/Maui.SplashTheme", MainLauncher = true, LaunchMode = LaunchMode.SingleTop, ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation | ConfigChanges.UiMode | ConfigChanges.ScreenLayout | ConfigChanges.SmallestScreenSize | ConfigChanges.Density)]
    public class MainActivity : MauiAppCompatActivity
    {
        protected override void OnCreate(Bundle? savedInstanceState)
        {
            // Инициализация SQLitePCL перед созданием приложения
            Batteries.Init();
            base.OnCreate(savedInstanceState);
        }
    }
}
