import SwiftUI

struct ReleaseAsset: Decodable { let name: String; let size: Int; let browser_download_url: URL }
struct Release: Decodable { let tag_name: String; let name: String?; let html_url: URL; let draft: Bool; let prerelease: Bool; let assets: [ReleaseAsset] }

@MainActor
final class ReleaseModel: ObservableObject {
    @Published var target = "zhaoryder/releaseguard"
    @Published var status = "Paste owner/repo and press Check."
    @Published var release: Release?
    @Published var busy = false
    func check() {
        let input = target.trimmingCharacters(in: .whitespacesAndNewlines)
        guard input.split(separator: "/").count == 2 else { status = "Expected owner/repo."; return }
        busy = true; status = "Inspecting release…"; release = nil
        let encoded = input.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? input
        guard let url = URL(string: "https://api.github.com/repos/\(encoded)/releases/latest") else { status = "Invalid repository."; busy = false; return }
        var request = URLRequest(url: url); request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept"); request.setValue("ReleaseGuardMac/0.1", forHTTPHeaderField: "User-Agent")
        Task { [weak self] in
            guard let self else { return }
            do {
                let (data, response) = try await URLSession.shared.data(for: request)
                guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { throw URLError(.badServerResponse) }
                let loaded = try JSONDecoder().decode(Release.self, from: data)
                self.release = loaded; self.status = "Release loaded. Download an asset or inspect the report."
            } catch { self.status = "Could not read this public release." }
            self.busy = false
        }
    }
    var score: Int { guard let release else { return 0 }; var value = 100; if release.assets.isEmpty { value -= 40 }; if !release.assets.contains(where: { $0.name.lowercased().contains("sha256") || $0.name.lowercased().contains("checksum") }) { value -= 5 }; for platform in [".dmg", ".exe", ".appimage"] where !release.assets.contains(where: { $0.name.lowercased().hasSuffix(platform) }) { value -= 5 }; return max(value, 0) }
}

struct ContentView: View {
    @StateObject private var model = ReleaseModel()
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack { Image(systemName: "checkmark.shield").font(.title2); Text("ReleaseGuard").font(.title2.weight(.semibold)); Spacer(); Text("Native macOS").foregroundStyle(.secondary).font(.caption) }
            Text("Release quality, before your users find the bug.").font(.system(size: 34, weight: .bold, design: .rounded)).fixedSize(horizontal: false, vertical: true)
            HStack { TextField("owner/repo", text: $model.target).textFieldStyle(.roundedBorder); Button("Check") { model.check() }.keyboardShortcut(.return) }
            Text(model.status).foregroundStyle(.secondary)
            if let release = model.release {
                HStack { VStack(alignment: .leading) { Text(release.name ?? release.tag_name).font(.headline); Text(release.tag_name).foregroundStyle(.secondary) }; Spacer(); Text("\(model.score)/100").font(.title2.weight(.bold)).foregroundStyle(model.score >= 80 ? .green : .orange) }
                List(release.assets, id: \.name) { asset in HStack { VStack(alignment: .leading) { Text(asset.name); Text(ByteCountFormatter.string(fromByteCount: Int64(asset.size), countStyle: .file)).font(.caption).foregroundStyle(.secondary) }; Spacer(); Link("Download", destination: asset.browser_download_url) } }.frame(minHeight: 180)
            } else { Spacer(); Text("Runs locally with URLSession. No embedded web view.").font(.caption).foregroundStyle(.secondary) }
        }.padding(28).frame(minWidth: 650, minHeight: 480)
    }
}

@main struct ReleaseGuardMacApp: App { var body: some Scene { WindowGroup("ReleaseGuard") { ContentView() } } }
