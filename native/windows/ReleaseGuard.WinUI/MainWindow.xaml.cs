using System.Net.Http; using System.Text.Json; using Microsoft.UI.Xaml; using Windows.System;
namespace ReleaseGuard.WinUI;
public sealed partial class MainWindow : Window {
  private static readonly HttpClient Client = new();
  public MainWindow() { InitializeComponent(); Title = "ReleaseGuard"; }
  private async void Check_Click(object sender, RoutedEventArgs e) { var repo = TargetBox.Text.Trim(); if (repo.Split('/').Length != 2) { Status.Text = "Expected owner/repo."; return; } Status.Text = "Inspecting release…"; try { using var response = await Client.GetAsync($"https://api.github.com/repos/{repo}/releases/latest"); response.EnsureSuccessStatusCode(); using var json = JsonDocument.Parse(await response.Content.ReadAsStreamAsync()); var root = json.RootElement; var assets = root.GetProperty("assets"); var score = 100 - (assets.GetArrayLength() == 0 ? 40 : 0); Score.Text = $"{root.GetProperty("tag_name").GetString()} · {score}/100"; Assets.Items.Clear(); foreach (var asset in assets.EnumerateArray()) Assets.Items.Add(asset.GetProperty("name").GetString()); Status.Text = "Release loaded. Double-click an asset to open its download."; } catch { Status.Text = "Could not read this public release."; } }
}
