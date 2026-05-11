import * as SQLite from 'expo-sqlite';
import { ClassSchedule, ClassRecord, ScheduleSwap, TimeSlot } from '../types';

const db = SQLite.openDatabaseSync('class_schedule.db');

// 默认时间段配置 - 最早时间为07:15
const DEFAULT_TIME_SLOTS: Omit<TimeSlot, 'id'>[] = [
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

export const initDatabase = () => {
  // 创建时间段配置表
  db.execSync(`
    CREATE TABLE IF NOT EXISTS time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_index INTEGER NOT NULL UNIQUE,
      label TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    );
  `);

  // 创建课程表
  db.execSync(`
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
    );
  `);
  
  db.execSync(`
    CREATE TABLE IF NOT EXISTS class_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      content TEXT,
      note TEXT,
      FOREIGN KEY (schedule_id) REFERENCES schedules (id)
    );
  `);

  // 初始化默认时间段
  const existingSlots = db.getAllSync('SELECT * FROM time_slots') as any[];
  if (existingSlots.length === 0) {
    for (const slot of DEFAULT_TIME_SLOTS) {
      db.runSync(
        'INSERT INTO time_slots (slot_index, label, start_time, end_time) VALUES (?, ?, ?, ?)',
        [slot.slotIndex, slot.label, slot.startTime, slot.endTime]
      );
    }
  }
};

// 时间段操作
export const getTimeSlots = (): TimeSlot[] => {
  const rows = db.getAllSync('SELECT * FROM time_slots ORDER BY slot_index') as any[];
  return rows.map(row => ({
    id: row.id,
    slotIndex: row.slot_index,
    label: row.label,
    startTime: row.start_time,
    endTime: row.end_time,
  }));
};

export const updateTimeSlotByIndex = (slotIndex: number, label: string, startTime: string, endTime: string) => {
  db.runSync(
    'UPDATE time_slots SET label = ?, start_time = ?, end_time = ? WHERE slot_index = ?',
    [label, startTime, endTime, slotIndex]
  );
};

// 课程操作
export const addSchedule = (schedule: Omit<ClassSchedule, 'id'>): number => {
  const result = db.runSync(
    `INSERT INTO schedules 
     (row, col, class_name, reminder_enabled, reminder_minutes, reminder_type, reminder_mode, specific_reminder_date, specific_reminder_time) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      schedule.row, 
      schedule.col, 
      schedule.className, 
      schedule.reminderEnabled ? 1 : 0, 
      schedule.reminderMinutes, 
      schedule.reminderType,
      schedule.reminderMode || 'before',
      schedule.specificReminderDate || null,
      schedule.specificReminderTime || null
    ]
  );
  return result.lastInsertRowId;
};

export const updateSchedule = (schedule: ClassSchedule) => {
  db.runSync(
    `UPDATE schedules 
     SET class_name = ?, reminder_enabled = ?, reminder_minutes = ?, reminder_type = ?, 
         reminder_mode = ?, specific_reminder_date = ?, specific_reminder_time = ? 
     WHERE id = ?`,
    [
      schedule.className, 
      schedule.reminderEnabled ? 1 : 0, 
      schedule.reminderMinutes, 
      schedule.reminderType,
      schedule.reminderMode || 'before',
      schedule.specificReminderDate || null,
      schedule.specificReminderTime || null,
      schedule.id
    ]
  );
};

export const deleteSchedule = (id: number) => {
  db.runSync('DELETE FROM schedules WHERE id = ?', [id]);
  db.runSync('DELETE FROM class_records WHERE schedule_id = ?', [id]);
};

export const getSchedules = (): ClassSchedule[] => {
  const rows = db.getAllSync('SELECT * FROM schedules') as any[];
  return rows.map(row => ({
    id: row.id,
    row: row.row,
    col: row.col,
    className: row.class_name,
    reminderEnabled: row.reminder_enabled === 1,
    reminderMinutes: row.reminder_minutes,
    reminderType: row.reminder_type,
    reminderMode: row.reminder_mode || 'before',
    specificReminderDate: row.specific_reminder_date || undefined,
    specificReminderTime: row.specific_reminder_time || undefined,
  }));
};

// 上课记录操作
export const addClassRecord = (record: Omit<ClassRecord, 'id'>): number => {
  const result = db.runSync(
    'INSERT INTO class_records (schedule_id, date, content, note) VALUES (?, ?, ?, ?)',
    [record.scheduleId, record.date, record.content, record.note]
  );
  return result.lastInsertRowId;
};

export const updateClassRecord = (record: ClassRecord) => {
  db.runSync(
    'UPDATE class_records SET date = ?, content = ?, note = ? WHERE id = ?',
    [record.date, record.content, record.note, record.id]
  );
};

export const deleteClassRecord = (id: number) => {
  db.runSync('DELETE FROM class_records WHERE id = ?', [id]);
};

export const getClassRecords = (scheduleId: number): ClassRecord[] => {
  const rows = db.getAllSync('SELECT * FROM class_records WHERE schedule_id = ? ORDER BY date DESC', [scheduleId]) as any[];
  return rows.map(row => ({
    id: row.id,
    scheduleId: row.schedule_id,
    date: row.date,
    content: row.content,
    note: row.note,
  }));
};
