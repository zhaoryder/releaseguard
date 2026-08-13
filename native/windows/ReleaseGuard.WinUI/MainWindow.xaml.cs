using System.Diagnostics;
using System.Net.Http;
using System.Text.Json;
using System.Windows;
namespace ReleaseGuard.WPF;
public partial class MainWindow : Window {
  private static readonly HttpClient Client = new();
  public MainWindow() { InitializeComponent(); Client.DefaultRequestHeaders.UserAgent.ParseAdd("ReleaseGuardWPF/0.1"); }
  private async void Check_Click(object sender, RoutedEventArgs e) { var repo = TargetBox.Text.Trim(); if (repo.Split('/').Length != 2) { Status.Text = "Expected owner/repo."; return; } Status.Text = "Inspecting release…"; try { using var response = await Client.GetAsync($"https://api.github.com/repos/{repo}/releases/latest"); response.EnsureSuccessStatusCode(); using var json = JsonDocument.Parse(await response.Content.ReadAsStreamAsync()); var root = json.RootElement; var assets = root.GetProperty("assets"); var score = 100 - (assets.GetArrayLength() == 0 ? 40 : 0); Score.Text = $"{root.GetProperty("tag_name").GetString()} · {score}/100"; Assets.Items.Clear(); foreach (var asset in assets.EnumerateArray()) { var item = new System.Windows.Controls.ListBoxItem { Content = asset.GetProperty("name").GetString(), Tag = asset.GetProperty("browser_download_url").GetString() }; item.MouseDoubleClick += (_, _) => { if (item.Tag is string url) Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); }; Assets.Items.Add(item); } Status.Text = "Release loaded. Double-click an asset to open its download."; } catch { Status.Text = "Could not read this public release."; } }
}
