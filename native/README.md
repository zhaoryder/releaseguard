# Native clients

These clients are intentionally separate from the Electron desktop app.

- `macos/ReleaseGuardMac`: SwiftUI + `URLSession`, no embedded web view.
- `windows/ReleaseGuard.WinUI`: WPF + `HttpClient`, no embedded web view.
- `linux/releaseguard-gtk`: GTK4 + Rust + `reqwest`, no embedded web view.

All three clients call the public GitHub Releases API directly. The shared
TypeScript package remains the source of truth for the CLI, GitHub Action, and
web API. Native clients are currently a focused release-inspection surface;
the full policy report will be added behind the same API contract.
