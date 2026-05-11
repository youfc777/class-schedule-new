import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { ClassSchedule, TimeSlot } from '../types';

interface ScheduleTableProps {
  schedules: ClassSchedule[];
  timeSlots: TimeSlot[];
  onCellPress: (row: number, col: number, schedule?: ClassSchedule) => void;
  onCellLongPress: (row: number, col: number, schedule?: ClassSchedule) => void;
  onTimeSlotPress: (slotIndex: number) => void;
}

const { width } = Dimensions.get('window');
const CELL_WIDTH = (width - 100) / 7;
const CELL_HEIGHT = 60;
const TIME_CELL_WIDTH = 80;

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

  const getTimeSlot = (index: number): TimeSlot | undefined => {
    return timeSlots.find(s => s.slotIndex === index);
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <View style={[styles.headerCell, styles.cornerCell]}>
        <Text style={styles.headerText}>时间</Text>
      </View>
      {WEEK_DAYS.map((day, index) => (
        <View key={index} style={styles.headerCell}>
          <Text style={styles.headerText}>{day}</Text>
        </View>
      ))}
    </View>
  );

  const renderRow = (rowIndex: number) => {
    const timeSlot = getTimeSlot(rowIndex);
    
    return (
      <View key={rowIndex} style={styles.row}>
        <TouchableOpacity 
          style={styles.timeCell}
          onPress={() => onTimeSlotPress(rowIndex)}
          activeOpacity={0.7}
        >
          <Text style={styles.timeLabel}>{timeSlot?.label || `第${rowIndex + 1}节`}</Text>
          <Text style={styles.timeRange}>
            {timeSlot ? `${timeSlot.startTime}\n${timeSlot.endTime}` : ''}
          </Text>
          <View style={styles.editHint}>
            <Text style={styles.editHintText}>✎</Text>
          </View>
        </TouchableOpacity>
        
        {WEEK_DAYS.map((_, colIndex) => {
          const schedule = getSchedule(rowIndex, colIndex);
          return (
            <TouchableOpacity
              key={colIndex}
              style={[
                styles.cell,
                schedule && styles.filledCell,
                schedule?.reminderEnabled && styles.reminderCell,
              ]}
              onPress={() => onCellPress(rowIndex, colIndex, schedule)}
              onLongPress={() => onCellLongPress(rowIndex, colIndex, schedule)}
              delayLongPress={500}
            >
              {schedule && (
                <Text style={styles.cellText} numberOfLines={2}>
                  {schedule.className}
                </Text>
              )}
              {schedule?.reminderEnabled && (
                <View style={styles.reminderIndicator} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {Array.from({ length: 12 }, (_, index) => renderRow(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
  },
  headerCell: {
    width: CELL_WIDTH,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#fff',
  },
  cornerCell: {
    width: TIME_CELL_WIDTH,
    backgroundColor: '#388E3C',
  },
  headerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
  },
  timeCell: {
    width: TIME_CELL_WIDTH,
    height: CELL_HEIGHT,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#ddd',
    position: 'relative',
  },
  timeLabel: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  timeRange: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 12,
  },
  editHint: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  editHintText: {
    fontSize: 10,
    color: '#4CAF50',
  },
  cell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#ddd',
    padding: 2,
  },
  filledCell: {
    backgroundColor: '#E3F2FD',
  },
  reminderCell: {
    backgroundColor: '#FFF3E0',
  },
  cellText: {
    fontSize: 11,
    color: '#1976D2',
    textAlign: 'center',
  },
  reminderIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF5722',
  },
});
