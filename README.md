# RoastCurve / 乐司特

咖啡烘焙曲线记录与分析桌面应用，支持 macOS 和 Windows。

基于 Tauri 2 + React + TypeScript + Rust 构建。

## 下载安装

前往 [Releases](https://github.com/langgugemaster/roastcurve/releases) 页面，根据你的系统下载对应安装包：

| 系统 | 文件 |
|------|------|
| macOS (Apple Silicon) | `RoastCurve_x.x.x_aarch64.dmg` |
| macOS (Intel) | `RoastCurve_x.x.x_x64.dmg` |
| Windows | `RoastCurve_x.x.x_x64-setup.exe` |

### macOS 安装说明

由于应用未经 Apple 签名，macOS 会阻止直接打开。请按以下步骤操作：

1. 打开下载的 `.dmg` 文件，将 RoastCurve 拖入 Applications 文件夹
2. **不要双击打开**，而是在应用图标上 **右键 → 打开**
3. 在弹出的安全提示中点击 **"打开"**

或者在终端中运行：

```bash
xattr -cr /Applications/RoastCurve.app
```

之后就可以正常双击打开了。

### Windows 安装说明

运行 `.exe` 安装文件，如果 Windows Defender 弹出提示，点击 **"仍要运行"** 即可。

## 功能特性

- 实时烘焙曲线记录与可视化
- 串口连接温度传感器
- 烘焙数据管理（SQLite 本地存储）
- 支持 JSON/CSV 数据导入导出

## 开发

```bash
# 安装依赖
npm install

# 启动开发模式
npm run tauri dev

# 生产构建
npm run tauri build
```
