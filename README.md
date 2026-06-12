# 课表助手 (Class Schedule Desktop)

面向教师的课表管理与值班安排桌面工具。支持课程管理、值班表编辑、Excel 导入导出、单元格格式化等功能。

## 功能特性

### 课表管理
- **课程表编辑**：7天×12节 课程表，点击空单元格添加课程，点击课程查看上课记录
- **上课记录**：每门课可记录上课日期、内容、备注
- **课程提醒**：支持课前提醒和指定时间提醒，可设置闹铃/震动方式
- **时间段编辑**：点击顶部时间段可自定义节次名称和时间

### 值班管理
- **预设按钮**：楼道值班、门口值班、食堂值班、早午自习、课后服务
- **按钮自定义**：支持增删改值班按钮，按钮文字可编辑
- **多表格编辑**：每个值班按钮下可创建多个 Excel 表格，支持重命名
- **查找高亮**：表格内搜索文字自动高亮
- **缩放功能**：Ctrl+滚轮 缩放表格（40%~400%），Ctrl+0 重置
- **行列调整**：拖拽行首/列首边缘可调整行高列宽

### 格式化
- **文字格式**：单元格支持大/中/小字号、加粗、倾斜、字体颜色设置
- **背景颜色**：拖选单元格/行/列后选择背景色，支持空单元格着色
- **Ctrl+多选**：Ctrl+点击多选单元格，右键批量设置格式
- **批量改色**：拖选行首选整行、拖选列首选整列，一键改底色

### 数据交换
- **导入 Excel**：从 .xlsx/.xls 文件导入数据到值班表
- **导出 Excel**：课程表和值班表均可导出为 .xlsx 文件
- **复制粘贴**：Ctrl+V 粘贴课程数据到课表中

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 33 |
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 6 |
| 数据库 | SQL.js (SQLite) |
| Excel 处理 | SheetJS (xlsx) |
| 打包工具 | electron-builder (NSIS) |

## 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9

### 安装依赖
```bash
cd class-schedule-desktop
npm install
```

### Windows 桌面版
```bash
# 开发模式
npm run dev

# 生产构建（生成 .exe 安装包）
npm run build

# 直接运行
npm start
```

### Android 手机版

#### 前置条件
1. 安装 [Android Studio](https://developer.android.com/studio)（含 Android SDK）
2. 安装 JDK 21（[Eclipse Temurin](https://adoptium.net/) 推荐）
3. 设置环境变量：
   - `ANDROID_HOME` → `%LOCALAPPDATA%\Android\Sdk`
   - `JAVA_HOME` → JDK 21 安装路径

#### 构建 APK
```bash
# 一键构建（Windows）
scripts\build-android.bat

# 或手动分步操作
npm run android:sync    # 构建 Web + 同步到 Android 项目
npm run android:open    # 在 Android Studio 中打开
# 在 Android Studio 中点击 Build → Build Bundle(s) / APK(s) → Build APK(s)
```

构建成功后，APK 位于：
```
android\app\build\outputs\apk\debug\app-debug.apk
```

将该文件传输到 Android 手机，打开后按提示安装即可。

## 项目结构

```
class-schedule-desktop/
├── src/                          # React 前端源码
│   ├── main.tsx                  # 入口文件
│   ├── App.tsx                   # 根组件 + 路由
│   ├── App.css                   # 全局样式
│   ├── types/index.ts            # TypeScript 类型定义
│   ├── services/database.ts      # 数据库服务层（IPC 封装）
│   ├── components/
│   │   ├── ScheduleTable.tsx     # 课程表组件（拖选/格式化/批量操作）
│   │   ├── ScheduleTable.css
│   │   ├── TimePicker.tsx        # 时间选择器组件
│   │   └── TimePicker.css
│   └── screens/
│       ├── HomeScreen.tsx        # 首页（课程表 + 值班按钮）
│       ├── HomeScreen.css
│       ├── ClassRecordScreen.tsx # 上课记录页
│       ├── ClassRecordScreen.css
│       ├── DutyTableScreen.tsx   # 值班表编辑页（多表格/缩放/导入导出）
│       └── DutyTableScreen.css
├── src-electron/                 # Electron 主进程
│   ├── main.js                   # 主进程（菜单/数据库/IPC）
│   └── preload.js               # 预加载脚本（contextBridge）
├── scripts/
│   └── electron-launcher.js     # Electron 启动器（处理环境变量）
├── package.json
└── index.html
```

## 菜单快捷键

| 菜单 | 快捷键 | 功能 |
|------|--------|------|
| 文件 → 导出课程表 | Ctrl+E | 导出课程表为 Excel |
| 文件 → 退出 | Ctrl+Q | 退出程序 |
| 编辑 → 撤销 | Ctrl+Z | 撤销 |
| 编辑 → 粘贴 | Ctrl+V | 粘贴课程 |
| 编辑 → 全选 | Ctrl+A | 全选 |
| 视图 → 放大 | Ctrl+= | 放大页面 |
| 视图 → 缩小 | Ctrl+- | 缩小页面 |
| 视图 → 重置缩放 | Ctrl+0 | 重置缩放 |
| 视图 → 开发者工具 | F12 | 打开 DevTools |

## 操作指南

- **添加课程**：点击课程表空白单元格
- **查看记录**：点击已有课程的单元格
- **编辑课程**：右键已有课程的单元格
- **修改时间段**：点击顶部时间节次
- **多选单元格**：Ctrl+点击多个单元格，右键批量设置格式
- **改底色**：拖选单元格 / 拖选行首 / 拖选列首
- **粘贴课程**：Ctrl+V（Tab 分隔的多行数据）
- **Ctrl+滚轮**：缩放表格（值班表页面）

## License

MIT
