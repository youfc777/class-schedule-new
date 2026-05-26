import React from 'react';
import { ClassSchedule, TimeSlot } from '../types';
import './ScheduleTable.css';

interface ScheduleTableProps {
  schedules: ClassSchedule[];
  timeSlots: TimeSlot[];
  onCellPress: (row: number, col: number, schedule?: ClassSchedule) => void;
  onCellLongPress: (row: number, col: number, schedule?: ClassSchedule) => void;
  onTimeSlotPress: (slotIndex: number) => void;
}

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  schedules,
  timeSlots,
  onCellPress,
  onCellLongPress,
  onTimeSlotPress,
}) => {
  const getSchedule = (row: number, col: number): ClassSchedule | undefined => {
    return schedules.find(s => s.row === row && s.col === col);
  };

  const handleContextMenu = (e: React.MouseEvent, row: number, col: number, schedule?: ClassSchedule) => {
    e.preventDefault();
    onCellLongPress(row, col, schedule);
  };

  return (
    <div className="schedule-table-wrapper">
      <table className="schedule-table">
        <thead>
          <tr>
            <th className="corner-cell">星期</th>
            {Array.from({ length: 12 }, (_, i) => {
              const slot = timeSlots.find(s => s.slotIndex === i);
              return (
                <th
                  key={i}
                  className="time-header-cell"
                  onClick={() => onTimeSlotPress(i)}
                  title="点击编辑时间段"
                >
                  <div className="time-header-label">{slot?.label || `第${i + 1}节`}</div>
                  <div className="time-header-range">
                    {slot ? `${slot.startTime}~${slot.endTime}` : ''}
                  </div>
                  <span className="time-edit-hint">&#9998;</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {WEEK_DAYS.map((day, rowIndex) => (
            <tr key={rowIndex}>
              <td className="weekday-cell">{day}</td>
              {Array.from({ length: 12 }, (_, colIndex) => {
                const schedule = getSchedule(rowIndex, colIndex);
                return (
                  <td
                    key={colIndex}
                    className={`cell${schedule ? ' filled-cell' : ''}${schedule?.reminderEnabled ? ' reminder-cell' : ''}`}
                    onClick={() => onCellPress(rowIndex, colIndex, schedule)}
                    onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex, schedule)}
                    title={schedule ? `${schedule.className}（右键编辑）` : '点击添加课程'}
                  >
                    {schedule && (
                      <>
                        <span className="cell-class-name">{schedule.className}</span>
                        {schedule.reminderEnabled && <span className="reminder-dot" />}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
