const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getTimeSlots: () => ipcRenderer.invoke('db:getTimeSlots'),
  updateTimeSlot: (slotIndex, label, startTime, endTime) =>
    ipcRenderer.invoke('db:updateTimeSlot', slotIndex, label, startTime, endTime),

  getSchedules: () => ipcRenderer.invoke('db:getSchedules'),
  addSchedule: (schedule) => ipcRenderer.invoke('db:addSchedule', schedule),
  updateSchedule: (schedule) => ipcRenderer.invoke('db:updateSchedule', schedule),
  deleteSchedule: (id) => ipcRenderer.invoke('db:deleteSchedule', id),
  addSchedulesBatch: (schedules) => ipcRenderer.invoke('db:addSchedulesBatch', schedules),
  updateSchedulesBatch: (schedules) => ipcRenderer.invoke('db:updateSchedulesBatch', schedules),

  getClassRecords: (scheduleId) => ipcRenderer.invoke('db:getClassRecords', scheduleId),
  addClassRecord: (record) => ipcRenderer.invoke('db:addClassRecord', record),
  updateClassRecord: (record) => ipcRenderer.invoke('db:updateClassRecord', record),
  deleteClassRecord: (id) => ipcRenderer.invoke('db:deleteClassRecord', id),

  getDutyButtons: () => ipcRenderer.invoke('db:getDutyButtons'),
  addDutyButton: (label, sortOrder) => ipcRenderer.invoke('db:addDutyButton', label, sortOrder),
  updateDutyButton: (id, label) => ipcRenderer.invoke('db:updateDutyButton', id, label),
  deleteDutyButton: (id) => ipcRenderer.invoke('db:deleteDutyButton', id),

  getDutyTables: (buttonId) => ipcRenderer.invoke('db:getDutyTables', buttonId),
  addDutyTable: (buttonId, name, sortOrder, data) => ipcRenderer.invoke('db:addDutyTable', buttonId, name, sortOrder, data),
  updateDutyTable: (id, name, data) => ipcRenderer.invoke('db:updateDutyTable', id, name, data),
  deleteDutyTable: (id) => ipcRenderer.invoke('db:deleteDutyTable', id),

  importExcel: () => ipcRenderer.invoke('db:importExcel'),
  exportExcel: (name, data) => ipcRenderer.invoke('db:exportExcel', name, data),

  // Menu events
  onMenuExport: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu:export', handler);
    return () => ipcRenderer.removeListener('menu:export', handler);
  },
});
