import { ClassSchedule, ClassRecord, TimeSlot } from '../types';

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
