# RoastCurve Cross-Platform (乐司特跨平台版)

## 项目概述
RoastCurve 的跨平台版本，基于 Tauri 2 + React + TypeScript + Rust。
目标平台：macOS / Windows / Linux。

## 技术栈
- **前端**: React 19 + TypeScript + Vite + Recharts
- **后端**: Rust + Tauri 2
- **数据库**: rusqlite (SQLite bundled)
- **串口**: serialport crate
- **设计系统**: CSS Variables，复刻 macOS 原生版建构式主义风格

## 构建命令
```bash
# 安装依赖
npm install

# 前端开发（仅 UI，无 Tauri 后端）
npm run dev

# Tauri 开发（完整应用）
npm run tauri dev

# 生产构建
npm run tauri build

# Rust 检查
cd src-tauri && cargo check

# TypeScript 类型检查
npx tsc --noEmit
```

## 项目结构
```
src/                    # React 前端
  components/           # 视图组件
  hooks/                # React Hooks
  styles/               # CSS（设计系统）
  types/                # TypeScript 类型
src-tauri/              # Rust 后端
  src/
    commands.rs         # Tauri IPC 命令
    database.rs         # SQLite 数据库
    models.rs           # 数据模型
    serial.rs           # 串口通信
    lib.rs              # Tauri 入口
```

## 与 macOS 原生版的关系
- macOS 原生版: `~/Desktop/CoffeeRoastAI/` (Swift + SwiftUI)
- 跨平台版: 本项目 (Rust + React)
- 共享：设计规范、数据格式（JSON/CSV 可互导）、产品逻辑
- 各自维护，不共享代码
