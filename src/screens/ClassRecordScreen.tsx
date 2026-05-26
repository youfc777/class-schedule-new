import React, { useState, useEffect, useCallback } from 'react';
import { ClassRecord } from '../types';
import {
  getClassRecords,
  addClassRecord,
  updateClassRecord,
  deleteClassRecord,
} from '../services/database';
import './ClassRecordScreen.css';

interface ClassRecordScreenProps {
  scheduleId: number;
  className: string;
  onNavigate: (screen: string) => void;
}

export const ClassRecordScreen: React.FC<ClassRecordScreenProps> = ({
  scheduleId,
  className,
  onNavigate,
}) => {
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ClassRecord | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [note, setNote] = useState('');

  const loadRecords = useCallback(async () => {
    const data = await getClassRecords(scheduleId);
    setRecords(data);
  }, [scheduleId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

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

  const handleSave = async () => {
    if (!content.trim()) {
      alert('请输入上课内容');
      return;
    }

    const recordData = {
      scheduleId,
      date,
      content: content.trim(),
      note: note.trim(),
    };

    if (editingRecord) {
      await updateClassRecord({ ...recordData, id: editingRecord.id });
    } else {
      await addClassRecord(recordData);
    }

    await loadRecords();
    setModalVisible(false);
  };

  const handleDelete = (record: ClassRecord) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      deleteClassRecord(record.id).then(loadRecords);
    }
  };

  return (
    <div className="record-container">
      <div className="record-header">
        <button className="back-btn" onClick={() => onNavigate('Home')}>
          &larr; 返回
        </button>
        <h2 className="record-title">{className} - 上课记录</h2>
        <div className="header-spacer" />
      </div>

      <div className="record-body">
        {records.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">暂无上课记录</p>
            <p className="empty-sub">点击右下角按钮添加</p>
          </div>
        ) : (
          <div className="record-list">
            {records.map(item => (
              <div
                key={item.id}
                className="record-item"
                onClick={() => handleEdit(item)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleDelete(item);
                }}
                title="左键编辑 | 右键删除"
              >
                <div className="record-item-header">
                  <span className="record-date">{item.date}</span>
                </div>
                <p className="record-content">{item.content}</p>
                {item.note && <p className="record-note">备注：{item.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={handleAdd} title="添加记录">
        +
      </button>

      {/* Add/Edit modal */}
      {modalVisible && (
        <div className="modal-overlay" onClick={() => setModalVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">
              {editingRecord ? '编辑记录' : '添加记录'}
            </h2>

            <div className="form-group">
              <label className="form-label">日期</label>
              <input
                className="form-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">上课内容</label>
              <textarea
                className="form-textarea content-textarea"
                placeholder="输入上课内容"
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={4}
              />
            </div>

            <div className="form-group">
              <label className="form-label">备注（可选）</label>
              <textarea
                className="form-textarea note-textarea"
                placeholder="输入备注"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-cancel" onClick={() => setModalVisible(false)}>
                取消
              </button>
              <button className="btn btn-save" onClick={handleSave}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
