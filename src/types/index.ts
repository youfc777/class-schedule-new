export interface TimeSlot {
  id: number;
  slotIndex: number;
  label: string;
  startTime: string;
  endTime: string;
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

export type Screen = 'Home' | 'ClassRecord';

export interface ElectronAPI {
  getTimeSlots: () => Promise<TimeSlot[]>;
  updateTimeSlot: (slotIndex: number, label: string, startTime: string, endTime: string) => Promise<void>;
  getSchedules: () => Promise<ClassSchedule[]>;
  addSchedule: (schedule: Omit<ClassSchedule, 'id'>) => Promise<number>;
  updateSchedule: (schedule: ClassSchedule) => Promise<void>;
  deleteSchedule: (id: number) => Promise<void>;
  getClassRecords: (scheduleId: number) => Promise<ClassRecord[]>;
  addClassRecord: (record: Omit<ClassRecord, 'id'>) => Promise<number>;
  updateClassRecord: (record: ClassRecord) => Promise<void>;
  deleteClassRecord: (id: number) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
