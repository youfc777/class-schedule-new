const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

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

  const existingSlots = queryAll('SELECT COUNT(*) as count FROM time_slots');
  if (existingSlots[0].count === 0) {
    for (const slot of DEFAULT_TIME_SLOTS) {
      db.run(
        'INSERT INTO time_slots (slot_index, label, start_time, end_time) VALUES (?, ?, ?, ?)',
        [slot.slotIndex, slot.label, slot.startTime, slot.endTime]
      );
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
    return rows.map(r => ({
      id: r.id,
      row: r.row,
      col: r.col,
      className: r.class_name,
      reminderEnabled: r.reminder_enabled === 1,
      reminderMinutes: r.reminder_minutes,
      reminderType: r.reminder_type,
      reminderMode: r.reminder_mode || 'before',
      specificReminderDate: r.specific_reminder_date || undefined,
      specificReminderTime: r.specific_reminder_time || undefined,
    }));
  });

  ipcMain.handle('db:addSchedule', (_e, schedule) => {
    runSQL(
      `INSERT INTO schedules
        (row, col, class_name, reminder_enabled, reminder_minutes, reminder_type, reminder_mode, specific_reminder_date, specific_reminder_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schedule.row, schedule.col, schedule.className,
        schedule.reminderEnabled ? 1 : 0, schedule.reminderMinutes,
        schedule.reminderType, schedule.reminderMode || 'before',
        schedule.specificReminderDate || null, schedule.specificReminderTime || null,
      ]
    );
    const rows = queryAll('SELECT last_insert_rowid() as id');
    return rows[0].id;
  });

  ipcMain.handle('db:updateSchedule', (_e, schedule) => {
    runSQL(
      `UPDATE schedules
      SET class_name = ?, reminder_enabled = ?, reminder_minutes = ?, reminder_type = ?,
          reminder_mode = ?, specific_reminder_date = ?, specific_reminder_time = ?
      WHERE id = ?`,
      [
        schedule.className, schedule.reminderEnabled ? 1 : 0, schedule.reminderMinutes,
        schedule.reminderType, schedule.reminderMode || 'before',
        schedule.specificReminderDate || null, schedule.specificReminderTime || null,
        schedule.id,
      ]
    );
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
  setupIPC();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
