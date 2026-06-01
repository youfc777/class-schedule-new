const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

let db;
let dbPath;

const DEFAULT_TIME_SLOTS = [
  { slotIndex: 0, label: '第1节', startTime: '07:15', endTime: '08:00' },
  { slotIndex: 1, label: '第2节', startTime: '08:10', endTime: '08:55' },
  { slotIndex: 2, label: '第3节', startTime: '09:05', endTime: '09:50' },
  { slotIndex: 3, label: '第4节', startTime: '10:00', endTime: '10:45' },
  { slotIndex: 4, label: '第5节', startTime: '14:00', endTime: '14:45' },
  { slotIndex: 5, label: '第6节', startTime: '14:55', endTime: '15:40' },
  { slotIndex: 6, label: '第7节', startTime: '16:00', endTime: '16:45' },
  { slotIndex: 7, label: '第8节', startTime: '16:55', endTime: '17:40' },
  { slotIndex: 8, label: '第9节', startTime: '19:00', endTime: '19:45' },
  { slotIndex: 9, label: '第10节', startTime: '19:55', endTime: '20:40' },
  { slotIndex: 10, label: '第11节', startTime: '20:50', endTime: '21:35' },
  { slotIndex: 11, label: '第12节', startTime: '21:45', endTime: '22:30' },
];

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function runSQL(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

async function initDatabase() {
  dbPath = path.join(app.getPath('userData'), 'class_schedule.db');
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_index INTEGER NOT NULL UNIQUE,
      label TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      row INTEGER NOT NULL,
      col INTEGER NOT NULL,
      class_name TEXT NOT NULL,
      reminder_enabled INTEGER DEFAULT 0,
      reminder_minutes INTEGER DEFAULT 15,
      reminder_type TEXT DEFAULT 'both',
      reminder_mode TEXT DEFAULT 'before',
      specific_reminder_date TEXT,
      specific_reminder_time TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS class_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      content TEXT,
      note TEXT,
      FOREIGN KEY (schedule_id) REFERENCES schedules (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS duty_buttons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS duty_tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      button_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (button_id) REFERENCES duty_buttons (id)
    )
  `);

  const existingSlots = queryAll('SELECT COUNT(*) as count FROM time_slots');

  // Migrations
  try { db.run('ALTER TABLE schedules ADD COLUMN cell_style TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE schedules ADD COLUMN reminder_mode TEXT DEFAULT \'before\''); } catch (_) {}
  if (existingSlots[0].count === 0) {
    for (const slot of DEFAULT_TIME_SLOTS) {
      db.run(
        'INSERT INTO time_slots (slot_index, label, start_time, end_time) VALUES (?, ?, ?, ?)',
        [slot.slotIndex, slot.label, slot.startTime, slot.endTime]
      );
    }
  }

  // Initialize default duty buttons if none exist
  const existingButtons = queryAll('SELECT COUNT(*) as count FROM duty_buttons');
  if (existingButtons[0].count === 0) {
    const DEFAULT_DUTY_BUTTONS = ['楼道值班', '门口值班', '食堂值班', '早午自习', '课后服务'];
    for (let i = 0; i < DEFAULT_DUTY_BUTTONS.length; i++) {
      db.run('INSERT INTO duty_buttons (label, sort_order) VALUES (?, ?)', [DEFAULT_DUTY_BUTTONS[i], i]);
    }
  }

  saveDatabase();
}

function setupIPC() {
  // Time slots
  ipcMain.handle('db:getTimeSlots', () => {
    const rows = queryAll('SELECT * FROM time_slots ORDER BY slot_index');
    return rows.map(r => ({
      id: r.id,
      slotIndex: r.slot_index,
      label: r.label,
      startTime: r.start_time,
      endTime: r.end_time,
    }));
  });

  ipcMain.handle('db:updateTimeSlot', (_e, slotIndex, label, startTime, endTime) => {
    runSQL(
      'UPDATE time_slots SET label = ?, start_time = ?, end_time = ? WHERE slot_index = ?',
      [label, startTime, endTime, slotIndex]
    );
  });

  // Schedules
  ipcMain.handle('db:getSchedules', () => {
    const rows = queryAll('SELECT * FROM schedules');
    return rows.map(r => {
      let cellStyle;
      try { cellStyle = r.cell_style ? JSON.parse(r.cell_style) : undefined; } catch (_) {}
      return {
        id: r.id, row: r.row, col: r.col,
        className: r.class_name,
        reminderEnabled: r.reminder_enabled === 1,
        reminderMinutes: r.reminder_minutes,
        reminderType: r.reminder_type,
        reminderMode: r.reminder_mode || 'before',
        specificReminderDate: r.specific_reminder_date || undefined,
        specificReminderTime: r.specific_reminder_time || undefined,
        cellStyle,
      };
    });
  });

  ipcMain.handle('db:addSchedule', (_e, schedule) => {
    runSQL(
      `INSERT INTO schedules
        (row, col, class_name, reminder_enabled, reminder_minutes, reminder_type, reminder_mode, specific_reminder_date, specific_reminder_time, cell_style)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schedule.row, schedule.col, schedule.className,
        schedule.reminderEnabled ? 1 : 0, schedule.reminderMinutes,
        schedule.reminderType, schedule.reminderMode || 'before',
        schedule.specificReminderDate || null, schedule.specificReminderTime || null,
        schedule.cellStyle ? JSON.stringify(schedule.cellStyle) : null,
      ]
    );
    const rows = queryAll('SELECT last_insert_rowid() as id');
    return rows[0].id;
  });

  ipcMain.handle('db:updateSchedule', (_e, schedule) => {
    runSQL(
      `UPDATE schedules
      SET class_name = ?, reminder_enabled = ?, reminder_minutes = ?, reminder_type = ?,
          reminder_mode = ?, specific_reminder_date = ?, specific_reminder_time = ?, cell_style = ?
      WHERE id = ?`,
      [
        schedule.className, schedule.reminderEnabled ? 1 : 0, schedule.reminderMinutes,
        schedule.reminderType, schedule.reminderMode || 'before',
        schedule.specificReminderDate || null, schedule.specificReminderTime || null,
        schedule.cellStyle ? JSON.stringify(schedule.cellStyle) : null,
        schedule.id,
      ]
    );
  });

  ipcMain.handle('db:addSchedulesBatch', (_e, schedules) => {
    const ids = [];
    for (const s of schedules) {
      runSQL(
        `INSERT INTO schedules
          (row, col, class_name, reminder_enabled, reminder_minutes, reminder_type, reminder_mode, specific_reminder_date, specific_reminder_time, cell_style)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.row, s.col, s.className, s.reminderEnabled ? 1 : 0, s.reminderMinutes,
          s.reminderType, s.reminderMode || 'before',
          s.specificReminderDate || null, s.specificReminderTime || null,
          s.cellStyle ? JSON.stringify(s.cellStyle) : null]
      );
      const rows = queryAll('SELECT last_insert_rowid() as id');
      ids.push(rows[0].id);
    }
    return ids;
  });

  ipcMain.handle('db:updateSchedulesBatch', (_e, schedules) => {
    for (const s of schedules) {
      runSQL(
        `UPDATE schedules SET class_name = ?, reminder_enabled = ?, reminder_minutes = ?,
          reminder_type = ?, reminder_mode = ?, specific_reminder_date = ?, specific_reminder_time = ?, cell_style = ?
        WHERE id = ?`,
        [s.className, s.reminderEnabled ? 1 : 0, s.reminderMinutes,
          s.reminderType, s.reminderMode || 'before',
          s.specificReminderDate || null, s.specificReminderTime || null,
          s.cellStyle ? JSON.stringify(s.cellStyle) : null, s.id]
      );
    }
  });

  ipcMain.handle('db:deleteSchedule', (_e, id) => {
    runSQL('DELETE FROM schedules WHERE id = ?', [id]);
    runSQL('DELETE FROM class_records WHERE schedule_id = ?', [id]);
  });

  // Class records
  ipcMain.handle('db:getClassRecords', (_e, scheduleId) => {
    const rows = queryAll(
      'SELECT * FROM class_records WHERE schedule_id = ? ORDER BY date DESC',
      [scheduleId]
    );
    return rows.map(r => ({
      id: r.id,
      scheduleId: r.schedule_id,
      date: r.date,
      content: r.content || '',
      note: r.note || '',
    }));
  });

  ipcMain.handle('db:addClassRecord', (_e, record) => {
    runSQL(
      'INSERT INTO class_records (schedule_id, date, content, note) VALUES (?, ?, ?, ?)',
      [record.scheduleId, record.date, record.content, record.note]
    );
    const rows = queryAll('SELECT last_insert_rowid() as id');
    return rows[0].id;
  });

  ipcMain.handle('db:updateClassRecord', (_e, record) => {
    runSQL(
      'UPDATE class_records SET date = ?, content = ?, note = ? WHERE id = ?',
      [record.date, record.content, record.note, record.id]
    );
  });

  ipcMain.handle('db:deleteClassRecord', (_e, id) => {
    runSQL('DELETE FROM class_records WHERE id = ?', [id]);
  });

  // Duty buttons
  ipcMain.handle('db:getDutyButtons', () => {
    const rows = queryAll('SELECT * FROM duty_buttons ORDER BY sort_order');
    return rows.map(r => ({ id: r.id, label: r.label, sortOrder: r.sort_order }));
  });

  ipcMain.handle('db:addDutyButton', (_e, label, sortOrder) => {
    runSQL('INSERT INTO duty_buttons (label, sort_order) VALUES (?, ?)', [label, sortOrder]);
    const rows = queryAll('SELECT last_insert_rowid() as id');
    return rows[0].id;
  });

  ipcMain.handle('db:updateDutyButton', (_e, id, label) => {
    runSQL('UPDATE duty_buttons SET label = ? WHERE id = ?', [label, id]);
  });

  ipcMain.handle('db:deleteDutyButton', (_e, id) => {
    runSQL('DELETE FROM duty_tables WHERE button_id = ?', [id]);
    runSQL('DELETE FROM duty_buttons WHERE id = ?', [id]);
  });

  // Duty tables
  ipcMain.handle('db:getDutyTables', (_e, buttonId) => {
    const rows = queryAll('SELECT * FROM duty_tables WHERE button_id = ? ORDER BY sort_order', [buttonId]);
    return rows.map(r => ({
      id: r.id, buttonId: r.button_id, name: r.name, sortOrder: r.sort_order,
      data: JSON.parse(r.data || '[]'),
    }));
  });

  ipcMain.handle('db:addDutyTable', (_e, buttonId, name, sortOrder, data) => {
    runSQL('INSERT INTO duty_tables (button_id, name, sort_order, data) VALUES (?, ?, ?, ?)',
      [buttonId, name, sortOrder, JSON.stringify(data)]);
    const rows = queryAll('SELECT last_insert_rowid() as id');
    return rows[0].id;
  });

  ipcMain.handle('db:updateDutyTable', (_e, id, name, data) => {
    runSQL('UPDATE duty_tables SET name = ?, data = ? WHERE id = ?', [name, JSON.stringify(data), id]);
  });

  ipcMain.handle('db:deleteDutyTable', (_e, id) => {
    runSQL('DELETE FROM duty_tables WHERE id = ?', [id]);
  });

  // Excel import
  ipcMain.handle('db:importExcel', async () => {
    const result = await dialog.showOpenDialog({
      title: '导入 Excel 文件',
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const data = json.map((row) => row.map((cell) => String(cell ?? '')));
    return { name: path.basename(filePath, path.extname(filePath)), data };
  });

  // Excel export
  ipcMain.handle('db:exportExcel', async (_e, name, data) => {
    const result = await dialog.showSaveDialog({
      title: '导出 Excel 文件',
      defaultPath: `${name}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });
    if (result.canceled || !result.filePath) return;
    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, name);
    xlsx.writeFile(wb, result.filePath);
  });
}

function buildMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '导出课程表', accelerator: 'CmdOrCtrl+E', click: () => {
          const win = BrowserWindow.getFocusedWindow();
          if (win) win.webContents.send('menu:export');
        }},
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '放大', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: '重置缩放', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '操作提示',
          enabled: false,
        },
        { type: 'separator' },
        { label: '点击空单元格 → 添加课程' },
        { label: '点击课程单元格 → 查看上课记录' },
        { label: '右键课程单元格 → 编辑课程' },
        { label: '点击顶部时间段 → 修改时间' },
        { label: 'Ctrl+点击 → 多选单元格，右键批量设置格式' },
        { label: '拖选 → 批量改底色' },
        { label: '拖选行首/列首 → 整行/整列改色' },
        { label: 'Ctrl+V → 粘贴课程' },
        { type: 'separator' },
        {
          label: '关于课表助手',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox({
              type: 'info',
              title: '关于课表助手',
              message: '课表助手 v1.0.0',
              detail: '一款面向教师的课表管理与值班安排桌面工具。\n支持课程管理、值班表编辑、Excel导入导出等功能。',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1150,
    height: 650,
    minWidth: 900,
    minHeight: 500,
    title: '课表助手',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    win.loadURL('http://localhost:5199');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await initDatabase();
  buildMenu();
  setupIPC();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
