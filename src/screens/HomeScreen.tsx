import React, { useState, useEffect, useCallback } from 'react';
import { ScheduleTable } from '../components/ScheduleTable';
import { TimePicker } from '../components/TimePicker';
import { ClassSchedule, TimeSlot } from '../types';
import {
  getSchedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  getTimeSlots,
  updateTimeSlot,
} from '../services/database';
import './HomeScreen.css';

interface HomeScreenProps {
  onNavigate: (screen: string, params?: { scheduleId: number; className: string }) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Course modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [className, setClassName] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderMode, setReminderMode] = useState<'before' | 'specific'>('before');
  const [reminderMinutes, setReminderMinutes] = useState('15');
  const [reminderType, setReminderType] = useState<'alarm' | 'vibration' | 'both'>('both');
  const [specificDate, setSpecificDate] = useState('');
  const [specificTime, setSpecificTime] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  // Time slot modal state
  const [timeSlotModalVisible, setTimeSlotModalVisible] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [slotLabel, setSlotLabel] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    const [scheduleData, slotsData] = await Promise.all([
      getSchedules(),
      getTimeSlots(),
    ]);
    setSchedules(scheduleData);
    setTimeSlots(slotsData);
  }, []);

  const handleCellPress = (row: number, col: number, schedule?: ClassSchedule) => {
    if (schedule) {
      onNavigate('ClassRecord', {
        scheduleId: schedule.id,
        className: schedule.className,
      });
    } else {
      setSelectedCell({ row, col });
      setEditingSchedule(null);
      setClassName('');
      setReminderEnabled(false);
      setReminderMode('before');
      setReminderMinutes('15');
      setReminderType('both');
      setSpecificDate('');
      setSpecificTime('');
      setModalVisible(true);
    }
  };

  const handleCellLongPress = (row: number, col: number, schedule?: ClassSchedule) => {
    if (schedule) {
      setSelectedCell({ row, col });
      setEditingSchedule(schedule);
      setClassName(schedule.className);
      setReminderEnabled(schedule.reminderEnabled);
      setReminderMode(schedule.reminderMode || 'before');
      setReminderMinutes(schedule.reminderMinutes.toString());
      setReminderType(schedule.reminderType);
      setSpecificDate(schedule.specificReminderDate || '');
      setSpecificTime(schedule.specificReminderTime || '');
      setModalVisible(true);
    }
  };

  const handleSave = async () => {
    if (!className.trim() || !selectedCell) return;

    const scheduleData = {
      row: selectedCell.row,
      col: selectedCell.col,
      className: className.trim(),
      reminderEnabled,
      reminderMode,
      reminderMinutes: parseInt(reminderMinutes) || 15,
      reminderType,
      specificReminderDate: reminderMode === 'specific' ? specificDate : undefined,
      specificReminderTime: reminderMode === 'specific' ? specificTime : undefined,
    };

    try {
      if (editingSchedule) {
        await updateSchedule({ ...scheduleData, id: editingSchedule.id });
      } else {
        await addSchedule(scheduleData);
      }
      await loadData();
      setModalVisible(false);
      alert('保存成功！提醒功能将在后续版本中启用。');
    } catch {
      alert('保存失败，请重试');
    }
  };

  const handleDelete = () => {
    if (!editingSchedule) return;
    if (window.confirm(`确定要删除课程"${editingSchedule.className}"吗？`)) {
      deleteSchedule(editingSchedule.id).then(loadData);
      setModalVisible(false);
    }
  };

  const handleTimeSlotPress = (slotIndex: number) => {
    const slot = timeSlots.find(s => s.slotIndex === slotIndex);
    setEditingSlotIndex(slotIndex);
    setSlotLabel(slot?.label || `第${slotIndex + 1}节`);
    setSlotStartTime(slot?.startTime || '08:00');
    setSlotEndTime(slot?.endTime || '08:45');
    setTimeSlotModalVisible(true);
  };

  const handleSaveTimeSlot = async () => {
    if (editingSlotIndex === null) return;
    if (!slotLabel.trim()) {
      alert('请输入时间段名称');
      return;
    }
    await updateTimeSlot(editingSlotIndex, slotLabel.trim(), slotStartTime, slotEndTime);
    await loadData();
    setTimeSlotModalVisible(false);
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <h1 className="home-title">课表助手</h1>
        <p className="home-subtitle">点击空单元格添加课程 | 点击课程查看记录 | 右键编辑 | 点击顶部时间段修改时间</p>
      </div>

      <ScheduleTable
        schedules={schedules}
        timeSlots={timeSlots}
        onCellPress={handleCellPress}
        onCellLongPress={handleCellLongPress}
        onTimeSlotPress={handleTimeSlotPress}
      />

      {/* Course edit modal */}
      {modalVisible && (
        <div className="modal-overlay" onClick={() => setModalVisible(false)}>
          <div className="modal-content tall-modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">
              {editingSchedule ? '编辑课程' : '添加课程'}
            </h2>

            <div className="form-group">
              <label className="form-label">班级名称</label>
              <input
                className="form-input"
                type="text"
                placeholder="输入班级名称"
                value={className}
                onChange={e => setClassName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="reminder-section">
              <div className="switch-row">
                <span className="form-label">开启提醒</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={e => setReminderEnabled(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {reminderEnabled && (
                <>
                  <div className="form-group">
                    <label className="form-label">提醒模式</label>
                    <div className="btn-group">
                      <button
                        type="button"
                        className={`btn-option ${reminderMode === 'before' ? 'active' : ''}`}
                        onClick={() => setReminderMode('before')}
                      >
                        课前提醒
                      </button>
                      <button
                        type="button"
                        className={`btn-option ${reminderMode === 'specific' ? 'active' : ''}`}
                        onClick={() => setReminderMode('specific')}
                      >
                        指定时间
                      </button>
                    </div>
                  </div>

                  {reminderMode === 'before' && (
                    <div className="form-group">
                      <label className="form-label">提前提醒（分钟）</label>
                      <input
                        className="form-input small-input"
                        type="number"
                        value={reminderMinutes}
                        onChange={e => setReminderMinutes(e.target.value)}
                        min="1"
                      />
                    </div>
                  )}

                  {reminderMode === 'specific' && (
                    <div className="specific-section">
                      <div className="form-group">
                        <label className="form-label">日期（年-月-日）</label>
                        <input
                          className="form-input"
                          type="text"
                          placeholder="2024-01-01"
                          value={specificDate}
                          onChange={e => setSpecificDate(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">时间</label>
                        <TimePicker
                          value={specificTime}
                          onChange={setSpecificTime}
                        />
                      </div>
                      <p className="hint-text">格式：日期 YYYY-MM-DD，时间 24小时制</p>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">提醒方式</label>
                    <div className="btn-group">
                      {(['alarm', 'vibration', 'both'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          className={`btn-option ${reminderType === type ? 'active' : ''}`}
                          onClick={() => setReminderType(type)}
                        >
                          {type === 'alarm' ? '闹铃' : type === 'vibration' ? '震动' : '两者'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-buttons">
              <button className="btn btn-cancel" onClick={() => setModalVisible(false)}>
                取消
              </button>
              {editingSchedule && (
                <button className="btn btn-delete" onClick={handleDelete}>
                  删除
                </button>
              )}
              <button className="btn btn-save" onClick={handleSave}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time slot edit modal */}
      {timeSlotModalVisible && (
        <div className="modal-overlay" onClick={() => setTimeSlotModalVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">编辑时间段</h2>

            <div className="form-group">
              <label className="form-label">名称</label>
              <input
                className="form-input"
                type="text"
                placeholder="如：第1节"
                value={slotLabel}
                onChange={e => setSlotLabel(e.target.value)}
              />
            </div>

            <div className="time-input-row">
              <div className="time-input-group">
                <label className="form-label">开始时间</label>
                <TimePicker value={slotStartTime} onChange={setSlotStartTime} />
              </div>
              <div className="time-input-group">
                <label className="form-label">结束时间</label>
                <TimePicker value={slotEndTime} onChange={setSlotEndTime} />
              </div>
            </div>

            <p className="hint-text">时间格式：24小时制（HH:MM）</p>

            <div className="modal-buttons">
              <button className="btn btn-cancel" onClick={() => setTimeSlotModalVisible(false)}>
                取消
              </button>
              <button className="btn btn-save" onClick={handleSaveTimeSlot}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
