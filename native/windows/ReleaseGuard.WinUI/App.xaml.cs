using Microsoft.UI.Xaml;
namespace ReleaseGuard.WinUI;
public partial class App : Application { public static Window MainWindow { get; private set; } = null!; public App() { InitializeComponent(); } protected override void OnLaunched(LaunchActivatedEventArgs args) { MainWindow = new MainWindow(); MainWindow.Activate(); } }
