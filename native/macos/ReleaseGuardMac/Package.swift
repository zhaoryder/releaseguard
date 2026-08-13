// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ReleaseGuardMac",
    platforms: [.macOS(.v13)],
    products: [.executable(name: "ReleaseGuardMac", targets: ["ReleaseGuardMac"])],
    targets: [.executableTarget(name: "ReleaseGuardMac")]
)
