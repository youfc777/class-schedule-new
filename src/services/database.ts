import { ClassSchedule, ClassRecord, TimeSlot, DutyButton, DutyTable } from '../types';

// ── Platform-aware backend ──────────────────────────────────────────

type DbBackend = {
  getTimeSlots(): Promise<TimeSlot[]>;
  updateTimeSlot(slotIndex: number, label: string, startTime: string, endTime: string): Promise<void>;
  getSchedules(): Promise<ClassSchedule[]>;
  addSchedule(s: Omit<ClassSchedule, 'id'>): Promise<number>;
  updateSchedule(s: ClassSchedule): Promise<void>;
  deleteSchedule(id: number): Promise<void>;
  addSchedulesBatch(ss: Omit<ClassSchedule, 'id'>[]): Promise<number[]>;
  updateSchedulesBatch(ss: ClassSchedule[]): Promise<void>;
  getClassRecords(scheduleId: number): Promise<ClassRecord[]>;
  addClassRecord(r: Omit<ClassRecord, 'id'>): Promise<number>;
  updateClassRecord(r: ClassRecord): Promise<void>;
  deleteClassRecord(id: number): Promise<void>;
  getDutyButtons(): Promise<DutyButton[]>;
  addDutyButton(label: string, sortOrder: number): Promise<number>;
  updateDutyButton(id: number, label: string): Promise<void>;
  deleteDutyButton(id: number): Promise<void>;
  getDutyTables(buttonId: number): Promise<DutyTable[]>;
  addDutyTable(buttonId: number, name: string, sortOrder: number, data: string[][]): Promise<number>;
  updateDutyTable(id: number, name: string, data: string[][]): Promise<void>;
  deleteDutyTable(id: number): Promise<void>;
  importExcel(): Promise<{ name: string; data: string[][] } | null>;
  exportExcel(name: string, data: string[][]): Promise<void>;
};

// ── Electron backend (IPC) ──────────────────────────────────────────

const electronBackend: DbBackend = {
  getTimeSlots: () => window.electronAPI.getTimeSlots(),
  updateTimeSlot: (a, b, c, d) => window.electronAPI.updateTimeSlot(a, b, c, d),
  getSchedules: () => window.electronAPI.getSchedules(),
  addSchedule: (s) => window.electronAPI.addSchedule(s),
  updateSchedule: (s) => window.electronAPI.updateSchedule(s),
  deleteSchedule: (id) => window.electronAPI.deleteSchedule(id),
  addSchedulesBatch: (ss) => window.electronAPI.addSchedulesBatch(ss),
  updateSchedulesBatch: (ss) => window.electronAPI.updateSchedulesBatch(ss),
  getClassRecords: (sid) => window.electronAPI.getClassRecords(sid),
  addClassRecord: (r) => window.electronAPI.addClassRecord(r),
  updateClassRecord: (r) => window.electronAPI.updateClassRecord(r),
  deleteClassRecord: (id) => window.electronAPI.deleteClassRecord(id),
  getDutyButtons: () => window.electronAPI.getDutyButtons(),
  addDutyButton: (l, o) => window.electronAPI.addDutyButton(l, o),
  updateDutyButton: (id, l) => window.electronAPI.updateDutyButton(id, l),
  deleteDutyButton: (id) => window.electronAPI.deleteDutyButton(id),
  getDutyTables: (bid) => window.electronAPI.getDutyTables(bid),
  addDutyTable: (bid, n, o, d) => window.electronAPI.addDutyTable(bid, n, o, d),
  updateDutyTable: (id, n, d) => window.electronAPI.updateDutyTable(id, n, d),
  deleteDutyTable: (id) => window.electronAPI.deleteDutyTable(id),
  importExcel: () => window.electronAPI.importExcel(),
  exportExcel: (n, d) => window.electronAPI.exportExcel(n, d),
};

// ── Capacitor / Browser backend (sql.js in WebView) ──────────────────

const DEFAULT_TABLES = `
CREATE TABLE IF NOT EXISTS time_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_index INTEGER NOT NULL UNIQUE,
  label TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  row INTEGER NOT NULL, col INTEGER NOT NULL,
  class_name TEXT NOT NULL, reminder_enabled INTEGER DEFAULT 0,
  reminder_minutes INTEGER DEFAULT 15, reminder_type TEXT DEFAULT 'both',
  reminder_mode TEXT DEFAULT 'before',
  specific_reminder_date TEXT, specific_reminder_time TEXT,
  cell_style TEXT
);
CREATE TABLE IF NOT EXISTS class_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL, date TEXT NOT NULL, content TEXT, note TEXT
);
CREATE TABLE IF NOT EXISTS duty_buttons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS duty_tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  button_id INTEGER NOT NULL, name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL DEFAULT '[]'
);
`;

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

const DEFAULT_DUTY_BUTTONS = ['楼道值班', '门口值班', '食堂值班', '早午自习', '课后服务'];

let SQL: any = null;
let db: any = null;
let initPromise: Promise<any> | null = null;

async function loadDb(): Promise<any> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log('[DB] Initializing sql.js...');
    const initSqlJs = (await import('sql.js')).default;
    // Fetch WASM manually to avoid streaming compile MIME issues
    const wasmUrl = new URL('/sql-wasm.wasm', window.location.href).href;
    console.log('[DB] Fetching WASM from:', wasmUrl);
    const wasmResponse = await fetch(wasmUrl);
    if (!wasmResponse.ok) throw new Error(`WASM fetch failed: ${wasmResponse.status}`);
    const wasmBuffer = await wasmResponse.arrayBuffer();
    console.log('[DB] WASM loaded, size:', wasmBuffer.byteLength);
    SQL = await initSqlJs({ wasmBinary: wasmBuffer });
    console.log('[DB] sql.js initialized OK');

    const saved = localStorage.getItem('cs_db');
    if (saved) {
      try {
        const bin = atob(saved);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          arr[i] = bin.charCodeAt(i);
        }
        db = new SQL.Database(arr);
      } catch (e) {
        console.error('Failed to load database:', e);
        db = new SQL.Database();
      }
    } else {
      db = new SQL.Database();
    }

    db.run(DEFAULT_TABLES);

    const sc = db.exec('SELECT COUNT(*) as c FROM time_slots');
    const sv = sc.length > 0 ? sc[0].values : [];
    if (!sv.length || sv[0][0] === 0) {
      for (const s of DEFAULT_TIME_SLOTS) {
        db.run('INSERT INTO time_slots (slot_index,label,start_time,end_time) VALUES (?,?,?,?)',
          [s.slotIndex, s.label, s.startTime, s.endTime]);
      }
    }

    const bc = db.exec('SELECT COUNT(*) as c FROM duty_buttons');
    const bv = bc.length > 0 ? bc[0].values : [];
    if (!bv.length || bv[0][0] === 0) {
      for (let i = 0; i < DEFAULT_DUTY_BUTTONS.length; i++) {
        db.run('INSERT INTO duty_buttons (label,sort_order) VALUES (?,?)', [DEFAULT_DUTY_BUTTONS[i], i]);
      }
    }
    return db;
  })();

  // Clear initPromise on failure so subsequent calls retry initialization
  initPromise.catch((e) => {
    console.error('[DB] Initialization failed, clearing initPromise for retry:', e);
    initPromise = null;
    db = null;
    SQL = null;
  });

  return initPromise;
}

function persistDb() {
  if (!db) return;
  const data = db.export();
  // Chunked conversion to avoid stack overflow from spread operator
  const bytes = new Uint8Array(data);
  let bin = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  try { localStorage.setItem('cs_db', btoa(bin)); } catch (e) { console.error('persistDb failed:', e); }
}

function runSP(sql: string, params: any[] = []) {
  db.run(sql, params);
  persistDb();
}

function qAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function lid(): number { return qAll('SELECT last_insert_rowid() as id')[0]?.id ?? 0; }

function mapSch(r: any): ClassSchedule {
  let cs;
  try { cs = r.cell_style ? JSON.parse(r.cell_style) : undefined; } catch { /* */ }
  return {
    id: r.id, row: r.row, col: r.col, className: r.class_name,
    reminderEnabled: r.reminder_enabled === 1, reminderMinutes: r.reminder_minutes,
    reminderType: r.reminder_type, reminderMode: r.reminder_mode || 'before',
    specificReminderDate: r.specific_reminder_date || undefined,
    specificReminderTime: r.specific_reminder_time || undefined,
    cellStyle: cs,
  };
}

const capacitorBackend: DbBackend = {
  async getTimeSlots() { await loadDb(); return qAll('SELECT * FROM time_slots ORDER BY slot_index').map((r: any) => ({ id: r.id, slotIndex: r.slot_index, label: r.label, startTime: r.start_time, endTime: r.end_time })); },
  async updateTimeSlot(a, b, c, d) { await loadDb(); runSP('UPDATE time_slots SET label=?,start_time=?,end_time=? WHERE slot_index=?', [b, c, d, a]); },
  async getSchedules() { await loadDb(); return qAll('SELECT * FROM schedules').map(mapSch); },
  async addSchedule(s) { await loadDb(); runSP('INSERT INTO schedules (row,col,class_name,reminder_enabled,reminder_minutes,reminder_type,reminder_mode,specific_reminder_date,specific_reminder_time,cell_style) VALUES (?,?,?,?,?,?,?,?,?,?)', [s.row, s.col, s.className, s.reminderEnabled ? 1 : 0, s.reminderMinutes, s.reminderType, s.reminderMode || 'before', s.specificReminderDate || null, s.specificReminderTime || null, s.cellStyle ? JSON.stringify(s.cellStyle) : null]); return lid(); },
  async updateSchedule(s) { await loadDb(); runSP('UPDATE schedules SET class_name=?,reminder_enabled=?,reminder_minutes=?,reminder_type=?,reminder_mode=?,specific_reminder_date=?,specific_reminder_time=?,cell_style=? WHERE id=?', [s.className, s.reminderEnabled ? 1 : 0, s.reminderMinutes, s.reminderType, s.reminderMode || 'before', s.specificReminderDate || null, s.specificReminderTime || null, s.cellStyle ? JSON.stringify(s.cellStyle) : null, s.id]); },
  async deleteSchedule(id) { await loadDb(); runSP('DELETE FROM schedules WHERE id=?', [id]); runSP('DELETE FROM class_records WHERE schedule_id=?', [id]); },
  async addSchedulesBatch(ss) { await loadDb(); const ids: number[] = []; for (const s of ss) { runSP('INSERT INTO schedules (row,col,class_name,reminder_enabled,reminder_minutes,reminder_type,reminder_mode,specific_reminder_date,specific_reminder_time,cell_style) VALUES (?,?,?,?,?,?,?,?,?,?)', [s.row, s.col, s.className, s.reminderEnabled ? 1 : 0, s.reminderMinutes, s.reminderType, s.reminderMode || 'before', s.specificReminderDate || null, s.specificReminderTime || null, s.cellStyle ? JSON.stringify(s.cellStyle) : null]); ids.push(lid()); } return ids; },
  async updateSchedulesBatch(ss) { await loadDb(); for (const s of ss) { runSP('UPDATE schedules SET class_name=?,reminder_enabled=?,reminder_minutes=?,reminder_type=?,reminder_mode=?,specific_reminder_date=?,specific_reminder_time=?,cell_style=? WHERE id=?', [s.className, s.reminderEnabled ? 1 : 0, s.reminderMinutes, s.reminderType, s.reminderMode || 'before', s.specificReminderDate || null, s.specificReminderTime || null, s.cellStyle ? JSON.stringify(s.cellStyle) : null, s.id]); } },
  async getClassRecords(sid) { await loadDb(); return qAll('SELECT * FROM class_records WHERE schedule_id=? ORDER BY date DESC', [sid]).map((r: any) => ({ id: r.id, scheduleId: r.schedule_id, date: r.date, content: r.content || '', note: r.note || '' })); },
  async addClassRecord(r) { await loadDb(); runSP('INSERT INTO class_records (schedule_id,date,content,note) VALUES (?,?,?,?)', [r.scheduleId, r.date, r.content, r.note]); return lid(); },
  async updateClassRecord(r) { await loadDb(); runSP('UPDATE class_records SET date=?,content=?,note=? WHERE id=?', [r.date, r.content, r.note, r.id]); },
  async deleteClassRecord(id) { await loadDb(); runSP('DELETE FROM class_records WHERE id=?', [id]); },
  async getDutyButtons() { await loadDb(); return qAll('SELECT * FROM duty_buttons ORDER BY sort_order').map((r: any) => ({ id: r.id, label: r.label, sortOrder: r.sort_order })); },
  async addDutyButton(l, o) { await loadDb(); runSP('INSERT INTO duty_buttons (label,sort_order) VALUES (?,?)', [l, o]); return lid(); },
  async updateDutyButton(id, l) { await loadDb(); runSP('UPDATE duty_buttons SET label=? WHERE id=?', [l, id]); },
  async deleteDutyButton(id) { await loadDb(); runSP('DELETE FROM duty_tables WHERE button_id=?', [id]); runSP('DELETE FROM duty_buttons WHERE id=?', [id]); },
  async getDutyTables(bid) { await loadDb(); return qAll('SELECT * FROM duty_tables WHERE button_id=? ORDER BY sort_order', [bid]).map((r: any) => ({ id: r.id, buttonId: r.button_id, name: r.name, sortOrder: r.sort_order, data: JSON.parse(r.data || '[]') })); },
  async addDutyTable(bid, n, o, d) { await loadDb(); runSP('INSERT INTO duty_tables (button_id,name,sort_order,data) VALUES (?,?,?,?)', [bid, n, o, JSON.stringify(d)]); return lid(); },
  async updateDutyTable(id, n, d) { await loadDb(); runSP('UPDATE duty_tables SET name=?,data=? WHERE id=?', [n, JSON.stringify(d), id]); },
  async deleteDutyTable(id) { await loadDb(); runSP('DELETE FROM duty_tables WHERE id=?', [id]); },
  async importExcel() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.xlsx,.xls';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        try {
          const XLSX = await import('xlsx');
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          resolve({ name: file.name.replace(/\.[^.]+$/, ''), data: json.map(r => r.map((c: any) => String(c ?? ''))) });
        } catch { resolve(null); }
      };
      input.click();
    });
  },
  async exportExcel(name, data) {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, name);
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${name}.xlsx`; a.click();
    URL.revokeObjectURL(url);
    // For Android Capacitor, also try Share API
    if (navigator.share && (navigator as any).canShare?.({ files: [new File([blob], `${name}.xlsx`, { type: blob.type })] })) {
      try {
        await navigator.share({ files: [new File([blob], `${name}.xlsx`, { type: blob.type })] });
      } catch { /* user cancelled */ }
    }
  },
};

// ── Select backend ──────────────────────────────────────────────────

function getBackend(): DbBackend {
  if (typeof window !== 'undefined' && 'electronAPI' in window) return electronBackend;
  return capacitorBackend;
}
const B = getBackend();

// ── Public API ──────────────────────────────────────────────────────

export const getTimeSlots = () => B.getTimeSlots();
export const updateTimeSlot = (a: number, b: string, c: string, d: string) => B.updateTimeSlot(a, b, c, d);
export const getSchedules = () => B.getSchedules();
export const addSchedule = (s: Omit<ClassSchedule, 'id'>) => B.addSchedule(s);
export const updateSchedule = (s: ClassSchedule) => B.updateSchedule(s);
export const deleteSchedule = (id: number) => B.deleteSchedule(id);
export const addSchedulesBatch = (ss: Omit<ClassSchedule, 'id'>[]) => B.addSchedulesBatch(ss);
export const updateSchedulesBatch = (ss: ClassSchedule[]) => B.updateSchedulesBatch(ss);
export const getClassRecords = (sid: number) => B.getClassRecords(sid);
export const addClassRecord = (r: Omit<ClassRecord, 'id'>) => B.addClassRecord(r);
export const updateClassRecord = (r: ClassRecord) => B.updateClassRecord(r);
export const deleteClassRecord = (id: number) => B.deleteClassRecord(id);
export const getDutyButtons = () => B.getDutyButtons();
export const addDutyButton = (l: string, o: number) => B.addDutyButton(l, o);
export const updateDutyButton = (id: number, l: string) => B.updateDutyButton(id, l);
export const deleteDutyButton = (id: number) => B.deleteDutyButton(id);
export const getDutyTables = (bid: number) => B.getDutyTables(bid);
export const addDutyTable = (bid: number, n: string, o: number, d: string[][]) => B.addDutyTable(bid, n, o, d);
export const updateDutyTable = (id: number, n: string, d: string[][]) => B.updateDutyTable(id, n, d);
export const deleteDutyTable = (id: number) => B.deleteDutyTable(id);
export const importExcel = () => B.importExcel();
export const exportExcel = (n: string, d: string[][]) => B.exportExcel(n, d);
