import React, { useState, useEffect, useCallback } from 'react';
import { ScheduleTable } from '../components/ScheduleTable';
import { TimePicker } from '../components/TimePicker';
import { ClassSchedule, TimeSlot, DutyButton, CellStyle } from '../types';
import {
  getSchedules, addSchedule, updateSchedule, deleteSchedule,
  addSchedulesBatch, updateSchedulesBatch,
  getTimeSlots, updateTimeSlot,
  getDutyButtons, addDutyButton, deleteDutyButton, updateDutyButton,
  exportExcel,
} from '../services/database';
import './HomeScreen.css';

interface HomeScreenProps {
  onNavigate: (screen: string, params?: { scheduleId: number; className: string } | { buttonId: number; buttonLabel: string }) => void;
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

  // Cell formatting state
  const [cellFontSize, setCellFontSize] = useState<CellStyle['fontSize']>('medium');
  const [cellBold, setCellBold] = useState(false);
  const [cellItalic, setCellItalic] = useState(false);
  const [cellTextColor, setCellTextColor] = useState('#000000');
  const [cellBgColor, setCellBgColor] = useState('#FFFFFF');

  // Time slot modal state
  const [timeSlotModalVisible, setTimeSlotModalVisible] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [slotLabel, setSlotLabel] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Duty buttons state
  const [dutyButtons, setDutyButtons] = useState<DutyButton[]>([]);
  const [showAddDuty, setShowAddDuty] = useState(false);
  const [dutyLabel, setDutyLabel] = useState('');
  const [editingDutyId, setEditingDutyId] = useState<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    const [scheduleData, slotsData, buttonsData] = await Promise.all([
      getSchedules(),
      getTimeSlots(),
      getDutyButtons(),
    ]);
    setSchedules(scheduleData);
    setTimeSlots(slotsData);
    setDutyButtons(buttonsData);
  }, []);

  const handleCellPress = (row: number, col: number, schedule?: ClassSchedule) => {
    if (schedule && schedule.className) {
      onNavigate('ClassRecord', {
        scheduleId: schedule.id,
        className: schedule.className,
      });
    } else {
      setSelectedCell({ row, col });
      setEditingSchedule(schedule || null);
      setClassName(schedule?.className || '');
      setReminderEnabled(schedule?.reminderEnabled || false);
      setReminderMode(schedule?.reminderMode || 'before');
      setReminderMinutes(String(schedule?.reminderMinutes || 15));
      setReminderType(schedule?.reminderType || 'both');
      setSpecificDate(schedule?.specificReminderDate || '');
      setSpecificTime(schedule?.specificReminderTime || '');
      setCellFontSize(schedule?.cellStyle?.fontSize || 'medium');
      setCellBold(schedule?.cellStyle?.bold || false);
      setCellItalic(schedule?.cellStyle?.italic || false);
      setCellTextColor(schedule?.cellStyle?.color || '#000000');
      setCellBgColor(schedule?.cellStyle?.bgColor || '#FFFFFF');
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
      setCellFontSize(schedule.cellStyle?.fontSize || 'medium');
      setCellBold(schedule.cellStyle?.bold || false);
      setCellItalic(schedule.cellStyle?.italic || false);
      setCellTextColor(schedule.cellStyle?.color || '#000000');
      setCellBgColor(schedule.cellStyle?.bgColor || '#FFFFFF');
      setModalVisible(true);
    }
  };

  const handleSave = async () => {
    if (!className.trim() || !selectedCell) return;

    const cellStyle: CellStyle | undefined = (cellFontSize !== 'medium' || cellBold || cellItalic || cellTextColor !== '#000000' || cellBgColor !== '#FFFFFF')
      ? {
          fontSize: cellFontSize !== 'medium' ? cellFontSize : undefined,
          bold: cellBold || undefined,
          italic: cellItalic || undefined,
          color: cellTextColor !== '#000000' ? cellTextColor : undefined,
          bgColor: cellBgColor !== '#FFFFFF' ? cellBgColor : undefined,
        }
      : undefined;

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
      cellStyle,
    };

    try {
      if (editingSchedule) {
        await updateSchedule({ ...scheduleData, id: editingSchedule.id });
      } else {
        await addSchedule(scheduleData);
      }
      await loadData();
      setModalVisible(false);
      showToast('保存成功', 'success');
    } catch (err) {
      console.error('[HomeScreen] handleSave failed:', err);
      showToast('保存失败，请重试', 'error');
    }
  };

  const handleDelete = async () => {
    if (!editingSchedule) return;
    if (window.confirm(`确定要删除课程"${editingSchedule.className}"吗？`)) {
      try {
        await deleteSchedule(editingSchedule.id);
        await loadData();
        setModalVisible(false);
        showToast('删除成功', 'success');
      } catch {
        showToast('删除失败，请重试', 'error');
      }
    }
  };

  const handleCellDeleteFromTable = useCallback(async (row: number, col: number) => {
    const schedule = schedules.find(s => s.row === row && s.col === col);
    if (!schedule) return;
    if (!window.confirm(`确认删除「${schedule.className}」？`)) return;
    try {
      await deleteSchedule(schedule.id);
      await loadData();
      showToast('已删除', 'success');
    } catch (err) {
      console.error('[HomeScreen] handleCellDeleteFromTable failed:', err);
      showToast('删除失败', 'error');
    }
  }, [schedules, loadData]);

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
      showToast('请输入时间段名称', 'error');
      return;
    }
    await updateTimeSlot(editingSlotIndex, slotLabel.trim(), slotStartTime, slotEndTime);
    await loadData();
    setTimeSlotModalVisible(false);
  };

  const handleAddDutyButton = async () => {
    if (!dutyLabel.trim()) return;
    if (editingDutyId !== null) {
      await updateDutyButton(editingDutyId, dutyLabel.trim());
    } else {
      const sortOrder = dutyButtons.length;
      await addDutyButton(dutyLabel.trim(), sortOrder);
    }
    setDutyLabel('');
    setEditingDutyId(null);
    setShowAddDuty(false);
    await loadData();
  };

  const handleEditDutyButton = (btn: DutyButton) => {
    setDutyLabel(btn.label);
    setEditingDutyId(btn.id);
    setShowAddDuty(true);
  };

  const handleDeleteDutyButton = async (id: number) => {
    if (!window.confirm('确定要删除该按钮及其所有表格数据吗？')) return;
    try {
      await deleteDutyButton(id);
      await loadData();
      showToast('删除成功', 'success');
    } catch (err) {
      console.error('[HomeScreen] handleDeleteDutyButton failed:', err);
      showToast('删除失败，请重试', 'error');
    }
  };

  const handleBatchFormat = async (cells: { row: number; col: number; scheduleId?: number }[], style: CellStyle) => {
    // Update existing schedules
    const updatedSchedules = cells
      .filter(c => c.scheduleId !== undefined)
      .map(c => {
        const s = schedules.find(s => s.row === c.row && s.col === c.col);
        if (!s) return null;
        return { ...s, cellStyle: { ...s.cellStyle, ...style } };
      })
      .filter(Boolean) as ClassSchedule[];

    // Create new empty schedule records for cells without data (so bgColor persists)
    const hasBgOnly = style.bgColor && Object.keys(style).length === 1;
    const newSchedules: Omit<ClassSchedule, 'id'>[] = [];
    if (hasBgOnly) {
      for (const c of cells) {
        if (c.scheduleId !== undefined) continue;
        const existing = schedules.find(s => s.row === c.row && s.col === c.col);
        if (!existing) {
          newSchedules.push({
            row: c.row, col: c.col, className: '',
            reminderEnabled: false, reminderMinutes: 15, reminderType: 'both', reminderMode: 'before',
            cellStyle: style,
          });
        }
      }
    }

    let count = 0;
    if (updatedSchedules.length > 0) {
      await updateSchedulesBatch(updatedSchedules);
      count += updatedSchedules.length;
    }
    if (newSchedules.length > 0) {
      await addSchedulesBatch(newSchedules);
      count += newSchedules.length;
    }
    if (count > 0) {
      await loadData();
      showToast(`已更新 ${count} 个单元格格式`, 'success');
    }
  };

  const handleBatchColor = async (cells: { row: number; col: number; scheduleId?: number }[], color: string) => {
    handleBatchFormat(cells, { bgColor: color });
  };

  const handlePaste = async (cells: { row: number; col: number; value: string }[]) => {
    const newSchedules: Omit<ClassSchedule, 'id'>[] = [];
    const updatedSchedules: ClassSchedule[] = [];
    for (const { row, col, value } of cells) {
      const existing = schedules.find(s => s.row === row && s.col === col);
      if (existing) {
        updatedSchedules.push({ ...existing, className: value });
      } else if (value.trim()) {
        newSchedules.push({
          row, col, className: value.trim(),
          reminderEnabled: false, reminderMinutes: 15, reminderType: 'both', reminderMode: 'before',
        });
      }
    }
    if (newSchedules.length > 0) await addSchedulesBatch(newSchedules);
    if (updatedSchedules.length > 0) await updateSchedulesBatch(updatedSchedules);
    await loadData();
    showToast('粘贴成功', 'success');
  };

  const handleExport = () => {
    const grid: string[][] = [];
    grid.push(['星期', ...Array.from({ length: 12 }, (_, i) => timeSlots.find(s => s.slotIndex === i)?.label || `第${i + 1}节`)]);
    for (let r = 0; r < 7; r++) {
      const row: string[] = [WEEK_DAYS[r]];
      for (let c = 0; c < 12; c++) {
        const s = schedules.find(s => s.row === r && s.col === c);
        row.push(s?.className || '');
      }
      grid.push(row);
    }
    exportExcel('课程表', grid);
  };

  const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  // Listen for menu export event
  useEffect(() => {
    if (window.electronAPI?.onMenuExport) {
      const cleanup = window.electronAPI.onMenuExport(() => handleExport());
      return cleanup;
    }
  }, [schedules, timeSlots]);

  return (
    <div className="home-container">
      <div className="home-header">
        <h1 className="home-title">课表助手</h1>
        {/* Duty buttons row below title */}
        <div className="duty-buttons-bar">
          {dutyButtons.map(btn => (
            <div key={btn.id} className="duty-btn-wrapper"
              onContextMenu={(e) => { e.preventDefault(); handleDeleteDutyButton(btn.id); }}>
              <button
                className="duty-nav-btn"
                onClick={() => onNavigate('DutyTable', { buttonId: btn.id, buttonLabel: btn.label })}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); handleEditDutyButton(btn); }}
                title="点击打开 | 右键编辑"
              >
                {btn.label}
              </button>
              <span className="duty-btn-delete" onClick={() => handleDeleteDutyButton(btn.id)} title="删除">×</span>
            </div>
          ))}
          <button
            className="duty-nav-btn duty-add-btn"
            onClick={() => { setDutyLabel(''); setEditingDutyId(null); setShowAddDuty(true); }}
            title="添加值班表按钮"
          >
            +
          </button>
        </div>
      </div>

      <ScheduleTable
        schedules={schedules}
        timeSlots={timeSlots}
        onCellPress={handleCellPress}
        onCellLongPress={handleCellLongPress}
        onCellDelete={handleCellDeleteFromTable}
        onTimeSlotPress={handleTimeSlotPress}
        onBatchFormat={handleBatchFormat}
        onBatchColor={handleBatchColor}
        onPaste={handlePaste}
        onExport={handleExport}
      />

      {/* Add/Edit duty button dialog */}
      {showAddDuty && (
        <div className="modal-overlay" onClick={() => setShowAddDuty(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editingDutyId !== null ? '编辑按钮' : '添加按钮'}</h3>
            <div className="form-group">
              <label className="form-label">按钮名称</label>
              <input
                className="form-input"
                value={dutyLabel}
                onChange={e => setDutyLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddDutyButton(); if (e.key === 'Escape') setShowAddDuty(false); }}
                autoFocus
              />
            </div>
            <div className="modal-buttons">
              <button className="btn btn-cancel" onClick={() => setShowAddDuty(false)}>取消</button>
              <button className="btn btn-save" onClick={handleAddDutyButton}>保存</button>
            </div>
          </div>
        </div>
      )}

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

            {/* Formatting toolbar */}
            <div className="formatting-section">
              <label className="form-label">单元格格式</label>
              <div className="format-row">
                <span className="format-label">字号</span>
                <div className="btn-group">
                  {(['small', 'medium', 'large'] as const).map(size => (
                    <button
                      key={size}
                      type="button"
                      className={`btn-option ${cellFontSize === size ? 'active' : ''}`}
                      onClick={() => setCellFontSize(size)}
                    >
                      {size === 'small' ? '小' : size === 'medium' ? '中' : '大'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="format-row">
                <span className="format-label">样式</span>
                <div className="btn-group">
                  <button
                    type="button"
                    className={`btn-option ${cellBold ? 'active' : ''}`}
                    onClick={() => setCellBold(!cellBold)}
                  ><strong>B</strong></button>
                  <button
                    type="button"
                    className={`btn-option ${cellItalic ? 'active' : ''}`}
                    onClick={() => setCellItalic(!cellItalic)}
                  ><em>I</em></button>
                </div>
              </div>
              <div className="format-row">
                <span className="format-label">字体色</span>
                <input className="color-input" type="color" value={cellTextColor}
                  onChange={e => setCellTextColor(e.target.value)} />
              </div>
              <div className="format-row">
                <span className="format-label">底色</span>
                <input className="color-input" type="color" value={cellBgColor}
                  onChange={e => setCellBgColor(e.target.value)} />
                {cellBgColor !== '#FFFFFF' && (
                  <button type="button" className="btn-option"
                    onClick={() => setCellBgColor('#FFFFFF')}
                    style={{ marginLeft: 8, fontSize: 12 }}>清除底色</button>
                )}
              </div>
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
      {/* Toast notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};
