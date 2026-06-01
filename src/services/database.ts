import { ClassSchedule, ClassRecord, TimeSlot, DutyButton, DutyTable } from '../types';

export async function getTimeSlots(): Promise<TimeSlot[]> {
  return window.electronAPI.getTimeSlots();
}

export async function updateTimeSlot(slotIndex: number, label: string, startTime: string, endTime: string): Promise<void> {
  return window.electronAPI.updateTimeSlot(slotIndex, label, startTime, endTime);
}

export async function getSchedules(): Promise<ClassSchedule[]> {
  return window.electronAPI.getSchedules();
}

export async function addSchedule(schedule: Omit<ClassSchedule, 'id'>): Promise<number> {
  return window.electronAPI.addSchedule(schedule);
}

export async function updateSchedule(schedule: ClassSchedule): Promise<void> {
  return window.electronAPI.updateSchedule(schedule);
}

export async function deleteSchedule(id: number): Promise<void> {
  return window.electronAPI.deleteSchedule(id);
}

export async function addSchedulesBatch(schedules: Omit<ClassSchedule, 'id'>[]): Promise<number[]> {
  return window.electronAPI.addSchedulesBatch(schedules);
}

export async function updateSchedulesBatch(schedules: ClassSchedule[]): Promise<void> {
  return window.electronAPI.updateSchedulesBatch(schedules);
}

export async function getClassRecords(scheduleId: number): Promise<ClassRecord[]> {
  return window.electronAPI.getClassRecords(scheduleId);
}

export async function addClassRecord(record: Omit<ClassRecord, 'id'>): Promise<number> {
  return window.electronAPI.addClassRecord(record);
}

export async function updateClassRecord(record: ClassRecord): Promise<void> {
  return window.electronAPI.updateClassRecord(record);
}

export async function deleteClassRecord(id: number): Promise<void> {
  return window.electronAPI.deleteClassRecord(id);
}

export async function getDutyButtons(): Promise<DutyButton[]> {
  return window.electronAPI.getDutyButtons();
}

export async function addDutyButton(label: string, sortOrder: number): Promise<number> {
  return window.electronAPI.addDutyButton(label, sortOrder);
}

export async function updateDutyButton(id: number, label: string): Promise<void> {
  return window.electronAPI.updateDutyButton(id, label);
}

export async function deleteDutyButton(id: number): Promise<void> {
  return window.electronAPI.deleteDutyButton(id);
}

export async function getDutyTables(buttonId: number): Promise<DutyTable[]> {
  return window.electronAPI.getDutyTables(buttonId);
}

export async function addDutyTable(buttonId: number, name: string, sortOrder: number, data: string[][]): Promise<number> {
  return window.electronAPI.addDutyTable(buttonId, name, sortOrder, data);
}

export async function updateDutyTable(id: number, name: string, data: string[][]): Promise<void> {
  return window.electronAPI.updateDutyTable(id, name, data);
}

export async function deleteDutyTable(id: number): Promise<void> {
  return window.electronAPI.deleteDutyTable(id);
}

export async function importExcel(): Promise<{ name: string; data: string[][] } | null> {
  return window.electronAPI.importExcel();
}

export async function exportExcel(name: string, data: string[][]): Promise<void> {
  return window.electronAPI.exportExcel(name, data);
}
