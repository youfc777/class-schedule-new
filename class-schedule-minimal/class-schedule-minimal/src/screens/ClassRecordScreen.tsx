import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { ClassRecord, RootStackParamList } from '../types';
import {
  getClassRecords,
  addClassRecord,
  updateClassRecord,
  deleteClassRecord,
} from '../services/DatabaseService';

type ClassRecordScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'ClassRecord'>;
  route: RouteProp<RootStackParamList, 'ClassRecord'>;
};

export const ClassRecordScreen: React.FC<ClassRecordScreenProps> = ({
  navigation,
  route,
}) => {
  const { scheduleId, className } = route.params;
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ClassRecord | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: `${className} - 上课记录` });
    loadRecords();
  }, []);

  const loadRecords = () => {
    const data = getClassRecords(scheduleId);
    setRecords(data);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setDate(new Date().toISOString().split('T')[0]);
    setContent('');
    setNote('');
    setModalVisible(true);
  };

  const handleEdit = (record: ClassRecord) => {
    setEditingRecord(record);
    setDate(record.date);
    setContent(record.content);
    setNote(record.note);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!content.trim()) {
      Alert.alert('提示', '请输入上课内容');
      return;
    }

    const recordData = {
      scheduleId,
      date,
      content: content.trim(),
      note: note.trim(),
    };

    if (editingRecord) {
      updateClassRecord({ ...recordData, id: editingRecord.id });
    } else {
      addClassRecord(recordData);
    }

    loadRecords();
    setModalVisible(false);
  };

  const handleDelete = (record: ClassRecord) => {
    Alert.alert(
      '确认删除',
      '确定要删除这条记录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            deleteClassRecord(record.id);
            loadRecords();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ClassRecord }) => (
    <TouchableOpacity
      style={styles.recordItem}
      onPress={() => handleEdit(item)}
      onLongPress={() => handleDelete(item)}
      delayLongPress={500}
    >
      <View style={styles.recordHeader}>
        <Text style={styles.recordDate}>{item.date}</Text>
      </View>
      <Text style={styles.recordContent}>{item.content}</Text>
      {item.note ? (
        <Text style={styles.recordNote}>备注：{item.note}</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>暂无上课记录</Text>
          <Text style={styles.emptySubText}>点击右下角按钮添加</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingRecord ? '编辑记录' : '添加记录'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="日期 (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
            />

            <TextInput
              style={[styles.input, styles.contentInput]}
              placeholder="上课内容"
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
            />

            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="备注（可选）"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>取消</Text>
              </TouchableOpacity>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#bbb',
  },
  recordItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recordDate: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  recordContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  recordNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
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
  contentInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  noteInput: {
    height: 60,
    textAlignVertical: 'top',
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
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
