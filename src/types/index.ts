export interface TimeSlot {
  id: number;
  slotIndex: number;
  label: string;
  startTime: string;
  endTime: string;
}

export interface CellStyle {
  fontSize?: 'small' | 'medium' | 'large';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  bgColor?: string;
  halign?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  wrap?: boolean;
  borderLeft?: string;
  borderRight?: string;
  borderTop?: string;
  borderBottom?: string;
  numberFormat?: 'text' | 'number' | 'date';
}

export interface ClassSchedule {
  id: number;
  row: number;
  col: number;
  className: string;
  reminderEnabled: boolean;
  reminderMinutes: number;
  reminderType: 'alarm' | 'vibration' | 'both';
  reminderMode: 'before' | 'specific';
  specificReminderDate?: string;
  specificReminderTime?: string;
  cellStyle?: CellStyle;
}

export interface ClassRecord {
  id: number;
  scheduleId: number;
  date: string;
  content: string;
  note: string;
}

export interface ScheduleSwap {
  id: number;
  originalScheduleId: number;
  targetScheduleId: number;
  swapDate: string;
  isTemporary: boolean;
}

export interface DutyButton {
  id: number;
  label: string;
  sortOrder: number;
}

export interface DutyTable {
  id: number;
  buttonId: number;
  name: string;
  sortOrder: number;
  data: string[][];
}

export type Screen = 'Home' | 'ClassRecord' | 'DutyTable';

export interface ElectronAPI {
  getTimeSlots: () => Promise<TimeSlot[]>;
  updateTimeSlot: (slotIndex: number, label: string, startTime: string, endTime: string) => Promise<void>;
  getSchedules: () => Promise<ClassSchedule[]>;
  addSchedule: (schedule: Omit<ClassSchedule, 'id'>) => Promise<number>;
  updateSchedule: (schedule: ClassSchedule) => Promise<void>;
  deleteSchedule: (id: number) => Promise<void>;
  addSchedulesBatch: (schedules: Omit<ClassSchedule, 'id'>[]) => Promise<number[]>;
  updateSchedulesBatch: (schedules: ClassSchedule[]) => Promise<void>;
  getClassRecords: (scheduleId: number) => Promise<ClassRecord[]>;
  addClassRecord: (record: Omit<ClassRecord, 'id'>) => Promise<number>;
  updateClassRecord: (record: ClassRecord) => Promise<void>;
  deleteClassRecord: (id: number) => Promise<void>;
  getDutyButtons: () => Promise<DutyButton[]>;
  addDutyButton: (label: string, sortOrder: number) => Promise<number>;
  updateDutyButton: (id: number, label: string) => Promise<void>;
  deleteDutyButton: (id: number) => Promise<void>;
  getDutyTables: (buttonId: number) => Promise<DutyTable[]>;
  addDutyTable: (buttonId: number, name: string, sortOrder: number, data: string[][]) => Promise<number>;
  updateDutyTable: (id: number, name: string, data: string[][]) => Promise<void>;
  deleteDutyTable: (id: number) => Promise<void>;
  importExcel: () => Promise<{ name: string; data: string[][] } | null>;
  exportExcel: (name: string, data: string[][]) => Promise<void>;
  onMenuExport: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
