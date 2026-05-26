const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getTimeSlots: () => ipcRenderer.invoke('db:getTimeSlots'),
  updateTimeSlot: (slotIndex, label, startTime, endTime) =>
    ipcRenderer.invoke('db:updateTimeSlot', slotIndex, label, startTime, endTime),

  getSchedules: () => ipcRenderer.invoke('db:getSchedules'),
  addSchedule: (schedule) => ipcRenderer.invoke('db:addSchedule', schedule),
  updateSchedule: (schedule) => ipcRenderer.invoke('db:updateSchedule', schedule),
  deleteSchedule: (id) => ipcRenderer.invoke('db:deleteSchedule', id),

  getClassRecords: (scheduleId) => ipcRenderer.invoke('db:getClassRecords', scheduleId),
  addClassRecord: (record) => ipcRenderer.invoke('db:addClassRecord', record),
  updateClassRecord: (record) => ipcRenderer.invoke('db:updateClassRecord', record),
  deleteClassRecord: (id) => ipcRenderer.invoke('db:deleteClassRecord', id),
});
