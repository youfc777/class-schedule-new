export interface TimeSlot {
  id: number;
  slotIndex: number;        // 第几节课 (0-11)
  label: string;            // 显示标签，如"第1节"
  startTime: string;        // 开始时间，如"07:15"
  endTime: string;          // 结束时间，如"08:00"
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

export type RootStackParamList = {
  Home: undefined;
  ClassRecord: { scheduleId: number; className: string };
};
