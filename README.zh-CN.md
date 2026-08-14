<div align="center">

# ReleaseGuard

[![CI](https://github.com/zhaoryder/releaseguard/actions/workflows/ci.yml/badge.svg)](https://github.com/zhaoryder/releaseguard/actions/workflows/ci.yml) [![最新版本](https://img.shields.io/github/v/release/zhaoryder/releaseguard?display_name=tag&sort=semver)](https://github.com/zhaoryder/releaseguard/releases/latest) [![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-ReleaseGuard-2088ff?logo=github)](https://github.com/marketplace/actions/releaseguard-release-asset-quality-gate) [![许可证](https://img.shields.io/github/license/zhaoryder/releaseguard)](LICENSE)

[English](README.md) · 简体中文

### CI 绿了。用户到底该下载哪个文件？

**给 GitHub Release 产物加质量门禁和下载建议。** 在用户发现问题之前，找出缺失的平台、标错的架构、空安装包、版本不一致和缺失的校验文件，并告诉用户当前系统应该下载哪个文件。

[30 秒上手](#30-秒上手) · [在线演示](https://releaseguard.vercel.app/) · [接入 GitHub Actions](#接入-github-actions) · [检查项目](#它能发现什么) · [示例报告](docs/example-report.png)

</div>

![ReleaseGuard 检查真实 Release 并发现缺少校验文件](docs/example-report.png)

```console
$ npx --yes releaseguard check sharkdp/bat

sharkdp/bat v0.26.1  82/100 FAIL
21 assets · 21 passed · 0 warnings · 1 error

× No SHA-256 checksum manifest found.
✓ bat-v0.26.1-aarch64-apple-darwin.tar.gz is non-empty
✓ bat-v0.26.1-x86_64-pc-windows-msvc.zip is non-empty
✓ bat-v0.26.1-x86_64-unknown-linux-gnu.tar.gz is non-empty
```

把安装包编译出来，不等于把安装包正确地发布出去。很多问题发生在构建之后：文件名写着 `arm64`，里面却是 x64；标签已经是 `v2.1.0`，安装包仍叫 `2.0.9`；某个平台的产物根本没上传；下载文件看起来齐全，却没有任何校验文件。

ReleaseGuard 检查的是用户真正会下载到的 Release，而不是你以为已经上传成功的构建目录。

如果你发布桌面端、CLI 或移动端，并且需要覆盖多个平台，这就是发布前值得跑一遍的 30 秒检查。如果它帮你抓到过真实的发布问题，欢迎点 Star，或提交一份脱敏后的 fixture，让项目沿着真实需求继续变好。

## 30 秒上手

检查公开仓库不需要 Token，需要 Node.js 20 或更高版本。

```bash
# 检查最新 Release
npx --yes releaseguard check cli/cli

# 指定设备，直接获得对应下载建议
npx --yes releaseguard check cli/cli --platform macos --arch arm64

# 检查指定标签或完整 GitHub URL
npx --yes releaseguard check owner/repo@v1.2.0
npx --yes releaseguard check https://github.com/owner/repo/releases/tag/v1.2.0

# 同时保存 HTML 和 JSON 报告，队友无需安装工具也能查看
npx --yes releaseguard check owner/repo --html release-report.html --json release-report.json
```

ReleaseGuard 只读取公开的 Release 元数据和有限范围内的二进制文件头，不会执行下载的安装程序。

> **macOS：**当前社区构建包含完整的 ad-hoc 签名，但尚未经过 Apple 公证。首次启动时请按住 Control 点击 App，再选择**打开**。后续会提供 Developer ID 公证版本；请勿全局关闭 Gatekeeper。

## 接入 GitHub Actions

创建 `releaseguard.yml`：

```yaml
requiredPlatforms:
  - macos
  - windows
  - linux
requireChecksums: true
requireVersionInAssets: true
allowPrerelease: false
```

然后添加一个在 Release 发布后运行的工作流：

```yaml
name: Verify release
on:
  release:
    types: [published]

permissions:
  contents: read

jobs:
  releaseguard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: zhaoryder/releaseguard@v0.1.0
        with:
          release: ${{ github.repository }}@${{ github.event.release.tag_name }}
```

Action 会生成 `releaseguard-report.html` 和 `releaseguard-report.json`，方便后续上传或检查。Release 没通过你设定的质量门禁时，任务会以非零状态退出。

## 它能发现什么

| 检查项 | 典型问题 |
|---|---|
| 平台覆盖 | macOS 和 Linux 都有产物，唯独少了 Windows |
| 声明的架构 | 文件名写着 `arm64`，PE/ELF 文件头却显示为 `x64` |
| 空文件 | 上传中断，留下了一个 0 字节的安装包 |
| 版本命名 | Release 已是 `v2.4.0`，产物仍叫 `App-2.3.1.dmg` |
| 校验文件 | Release 没有附带 SHA-256 校验清单 |
| 草稿/预发布策略 | 草稿或不允许的预发布版本进入了发布流程 |
| 大小限制 | 体积异常的安装包混进了 Release |

ReleaseGuard 会直接读取 PE 和 ELF 可执行文件的文件头，也能识别未封装的 Mach-O 文件。深入检查 DMG、MSI、ZIP、DEB 和 RPM 容器内部的文件还在路线图中。

## 它不是什么

ReleaseGuard 是来源证明和安全工具的补充，不是替代品。

- [`gh release verify`](https://cli.github.com/manual/gh_release_verify) 用来验证签名证明和产物来源。
- ReleaseGuard 检查已发布的整套文件是否一致、完整，能否作为一个 Release 交付。
- 它不会声称某个应用绝对没有恶意软件，也不会判断应用功能是否正确。
- 默认检查过程绝不会运行未知安装程序。

## 配置参考

```yaml
requiredPlatforms: [macos, windows, linux]
requireChecksums: true
requireVersionInAssets: true
maxAssetBytes: 1073741824
allowPrerelease: false
```

需要严格把警告也视为失败时使用 `--fail-on warning`；默认使用 `--fail-on error`；如果想先在现有项目里观察结果、不阻断流程，可以使用 `--fail-on never`。

## 真实项目基准

开发阶段的首次扫描得到了两个有用的参考结果：

- `cli/cli v2.97.0`：**100/100**，包含 22 个产物和一份校验清单。
- `sharkdp/bat v0.26.1`：**82/100**，因为扫描时该 Release 没有附带 SHA-256 校验清单。

分数只描述 Release 是否符合当前配置的发布规范，不代表这些项目的安全性或整体质量。

## 本地开发

```bash
npm install
npm run check
npm test
npm run build
```

ReleaseGuard 本地优先、结果确定，不包含遥测，也不会调用任何模型。项目采用 MIT 许可证。
