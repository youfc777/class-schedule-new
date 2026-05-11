import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScheduleTable } from '../components/ScheduleTable';
import { ClassSchedule, RootStackParamList, TimeSlot } from '../types';
import {
  initDatabase,
  getSchedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  getTimeSlots,
  updateTimeSlotByIndex,
} from '../services/DatabaseService';

type HomeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
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
  
  const [timeSlotModalVisible, setTimeSlotModalVisible] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [slotLabel, setSlotLabel] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');

  useEffect(() => {
    initDatabase();
    loadData();
  }, []);

  const loadData = () => {
    const scheduleData = getSchedules();
    setSchedules(scheduleData);
    const slotsData = getTimeSlots();
    setTimeSlots(slotsData);
  };

  const handleCellPress = (row: number, col: number, schedule?: ClassSchedule) => {
    if (schedule) {
      navigation.navigate('ClassRecord', {
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

  const handleSave = () => {
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
        updateSchedule({ ...scheduleData, id: editingSchedule.id });
      } else {
        addSchedule(scheduleData);
      }

      loadData();
      setModalVisible(false);
      Alert.alert('提示', '保存成功！提醒功能将在正式版中启用。');
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  const handleDelete = () => {
    if (editingSchedule) {
      Alert.alert(
        '确认删除',
        `确定要删除课程"${editingSchedule.className}"吗？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: () => {
              deleteSchedule(editingSchedule.id);
              loadData();
              setModalVisible(false);
            },
          },
        ]
      );
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

  const handleSaveTimeSlot = () => {
    if (editingSlotIndex === null) return;
    
    if (!slotLabel.trim()) {
      Alert.alert('提示', '请输入时间段名称');
      return;
    }
    
    if (!/^\d{2}:\d{2}$/.test(slotStartTime) || !/^\d{2}:\d{2}$/.test(slotEndTime)) {
      Alert.alert('提示', '时间格式应为 HH:MM，如 08:00');
      return;
    }

    updateTimeSlotByIndex(editingSlotIndex, slotLabel.trim(), slotStartTime, slotEndTime);
    loadData();
    setTimeSlotModalVisible(false);
    Alert.alert('成功', '时间段已更新');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>课表助手</Text>
        <Text style={styles.subtitle}>点击单元格添加/查看，长按编辑，点击时间列修改时间</Text>
      </View>

      <ScrollView horizontal>
        <ScrollView>
          <ScheduleTable
            schedules={schedules}
            timeSlots={timeSlots}
            onCellPress={handleCellPress}
            onCellLongPress={handleCellLongPress}
            onTimeSlotPress={handleTimeSlotPress}
          />
        </ScrollView>
      </ScrollView>

      {/* 课程编辑弹窗 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.tallModal]}>
            <Text style={styles.modalTitle}>
              {editingSchedule ? '编辑课程' : '添加课程'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="班级名称"
              value={className}
              onChangeText={setClassName}
            />

            <View style={styles.reminderSection}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>开启提醒</Text>
                <Switch
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                />
              </View>

              {reminderEnabled && (
                <>
                  <View style={styles.reminderModeRow}>
                    <Text style={styles.label}>提醒模式</Text>
                    <View style={styles.typeButtons}>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          reminderMode === 'before' && styles.typeButtonActive,
                        ]}
                        onPress={() => setReminderMode('before')}
                      >
                        <Text style={[
                          styles.typeButtonText,
                          reminderMode === 'before' && styles.typeButtonTextActive,
                        ]}>
                          课前提醒
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          reminderMode === 'specific' && styles.typeButtonActive,
                        ]}
                        onPress={() => setReminderMode('specific')}
                      >
                        <Text style={[
                          styles.typeButtonText,
                          reminderMode === 'specific' && styles.typeButtonTextActive,
                        ]}>
                          指定时间
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {reminderMode === 'before' && (
                    <View style={styles.inputRow}>
                      <Text style={styles.label}>提前提醒（分钟）</Text>
                      <TextInput
                        style={[styles.input, styles.smallInput]}
                        value={reminderMinutes}
                        onChangeText={setReminderMinutes}
                        keyboardType="numeric"
                      />
                    </View>
                  )}

                  {reminderMode === 'specific' && (
                    <View style={styles.specificTimeSection}>
                      <View style={styles.inputRow}>
                        <Text style={styles.label}>日期（年-月-日）</Text>
                        <TextInput
                          style={[styles.input, styles.dateInput]}
                          placeholder="2024-01-01"
                          value={specificDate}
                          onChangeText={setSpecificDate}
                        />
                      </View>
                      <View style={styles.inputRow}>
                        <Text style={styles.label}>时间（时:分）</Text>
                        <TextInput
                          style={[styles.input, styles.dateInput]}
                          placeholder="08:00"
                          value={specificTime}
                          onChangeText={setSpecificTime}
                        />
                      </View>
                      <Text style={styles.hintText}>
                        格式：日期 YYYY-MM-DD，时间 HH:MM
                      </Text>
                    </View>
                  )}

                  <View style={styles.reminderTypeRow}>
                    <Text style={styles.label}>提醒方式</Text>
                    <View style={styles.typeButtons}>
                      {(['alarm', 'vibration', 'both'] as const).map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeButton,
                            reminderType === type && styles.typeButtonActive,
                          ]}
                          onPress={() => setReminderType(type)}
                        >
                          <Text
                            style={[
                              styles.typeButtonText,
                              reminderType === type && styles.typeButtonTextActive,
                            ]}
                          >
                            {type === 'alarm' ? '闹铃' : type === 'vibration' ? '震动' : '两者'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>取消</Text>
              </TouchableOpacity>

              {editingSchedule && (
                <TouchableOpacity
                  style={[styles.button, styles.deleteButton]}
                  onPress={handleDelete}
                >
                  <Text style={styles.buttonText}>删除</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 时间段编辑弹窗 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={timeSlotModalVisible}
        onRequestClose={() => setTimeSlotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>编辑时间段</Text>

            <TextInput
              style={styles.input}
              placeholder="名称（如：第1节）"
              value={slotLabel}
              onChangeText={setSlotLabel}
            />

            <View style={styles.timeInputRow}>
              <View style={styles.timeInputContainer}>
                <Text style={styles.timeLabel}>开始时间</Text>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  placeholder="08:00"
                  value={slotStartTime}
                  onChangeText={setSlotStartTime}
                />
              </View>
              <View style={styles.timeInputContainer}>
                <Text style={styles.timeLabel}>结束时间</Text>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  placeholder="08:45"
                  value={slotEndTime}
                  onChangeText={setSlotEndTime}
                />
              </View>
            </View>

            <Text style={styles.hintText}>
              时间格式：HH:MM（如 08:00）
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setTimeSlotModalVisible(false)}
              >
                <Text style={styles.buttonText}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveTimeSlot}
              >
                <Text style={styles.buttonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#E8F5E9',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  tallModal: {
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  smallInput: {
    width: 80,
    marginBottom: 0,
  },
  dateInput: {
    width: 120,
    marginBottom: 0,
  },
  reminderSection: {
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#333',
  },
  reminderModeRow: {
    marginBottom: 12,
  },
  reminderTypeRow: {
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  typeButtonText: {
    color: '#666',
    fontSize: 14,
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  specificTimeSection: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInputContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timeInput: {
    marginBottom: 0,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
