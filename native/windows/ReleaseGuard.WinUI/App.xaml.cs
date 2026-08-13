using System.Windows;
namespace ReleaseGuard.WPF;
public partial class App : Application { protected override void OnStartup(StartupEventArgs args) { base.OnStartup(args); new MainWindow().Show(); } }
