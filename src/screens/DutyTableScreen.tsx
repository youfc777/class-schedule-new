import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DutyTable } from '../types';
import {
  getDutyTables, addDutyTable, updateDutyTable, deleteDutyTable,
  importExcel, exportExcel,
} from '../services/database';
import './DutyTableScreen.css';

interface DutyTableScreenProps {
  buttonId: number;
  buttonLabel: string;
  onNavigate: (screen: string) => void;
}

const DEFAULT_COLS = 5;
const DEFAULT_ROWS = 10;
const DEFAULT_TABLE_NAMES = ['表格一', '表格二', '表格三'];

function createEmptyData(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(''));
}

function colLetter(ci: number): string {
  return String.fromCharCode(65 + ci);
}

function cellKey(r: number, c: number): string { return `${r},${c}`; }

function getTouchDistance(touches: React.TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export const DutyTableScreen: React.FC<DutyTableScreenProps> = ({ buttonId, buttonLabel, onNavigate }) => {
  const [tables, setTables] = useState<DutyTable[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  // Editing
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Selection
  const [selCells, setSelCells] = useState<Set<string>>(new Set());

  // Search
  const [searchText, setSearchText] = useState('');

  // Resize
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const [resizingCol, setResizingCol] = useState<{ index: number; startX: number; startWidth: number } | null>(null);
  const [resizingRow, setResizingRow] = useState<{ index: number; startY: number; startHeight: number } | null>(null);

  // Loading
  const [loading, setLoading] = useState(false);

  // Zoom (Ctrl+scroll)
  const [zoom, setZoom] = useState(1);

  const tableRef = useRef<HTMLDivElement>(null);
  const initGuard = useRef(false);

  // Pinch-to-zoom
  const pinchStartDistRef = useRef<number>(0);
  const pinchStartZoomRef = useRef<number>(1);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const activeTable = tables[activeTab];

  // ====================== DATA LOADING ======================
  const loadTables = useCallback(async () => {
    let data = await getDutyTables(buttonId);
    if (data.length === 0 && !initGuard.current) {
      initGuard.current = true;
      for (let i = 0; i < DEFAULT_TABLE_NAMES.length; i++) {
        const id = await addDutyTable(buttonId, DEFAULT_TABLE_NAMES[i], i, createEmptyData(DEFAULT_ROWS, DEFAULT_COLS));
        data.push({ id, buttonId, name: DEFAULT_TABLE_NAMES[i], sortOrder: i, data: createEmptyData(DEFAULT_ROWS, DEFAULT_COLS) });
      }
    }
    setTables(data);
  }, [buttonId]);

  useEffect(() => { loadTables(); }, [loadTables]);

  // ====================== SAVE ======================
  const saveTable = useCallback(async (table: DutyTable) => {
    await updateDutyTable(table.id, table.name, table.data);
  }, []);

  // ====================== RESIZE ======================
  useEffect(() => {
    if (!resizingCol && !resizingRow) return;
    const handleMove = (e: MouseEvent) => {
      if (resizingCol) {
        const delta = e.clientX - resizingCol.startX;
        setColWidths(prev => ({ ...prev, [resizingCol.index]: Math.max(40, resizingCol.startWidth + delta) }));
      }
      if (resizingRow) {
        const delta = e.clientY - resizingRow.startY;
        setRowHeights(prev => ({ ...prev, [resizingRow.index]: Math.max(20, resizingRow.startHeight + delta) }));
      }
    };
    const handleUp = () => { setResizingCol(null); setResizingRow(null); };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
  }, [resizingCol, resizingRow]);

  // ====================== EDITING ======================
  const startEdit = (ri: number, ci: number) => {
    setEditingCell({ row: ri, col: ci });
    setEditValue(tables[activeTab]?.data[ri]?.[ci] ?? '');
  };

  const commitEdit = () => {
    if (!editingCell || !activeTable) return;
    const { row, col } = editingCell;
    if (activeTable.data[row]?.[col] === editValue) { setEditingCell(null); return; }
    const newTables = tables.map((t, i) => {
      if (i !== activeTab) return t;
      const nd = t.data.map(r => [...r]);
      if (!nd[row]) nd[row] = [];
      nd[row][col] = editValue;
      return { ...t, data: nd };
    });
    setTables(newTables);
    saveTable(newTables[activeTab]);
    setEditingCell(null);
  };

  // ====================== SELECTION ======================
  const handleCellMouseDown = (e: React.MouseEvent, ri: number, ci: number) => {
    if (!activeTable) return;
    if (editingCell) commitEdit();
    tableRef.current?.focus();
    setSelCells(new Set([cellKey(ri, ci)]));
  };

  const handleCellDoubleClick = (ri: number, ci: number) => {
    startEdit(ri, ci);
  };

  const handleRowHeaderClick = (ri: number) => {
    if (!activeTable) return;
    const cols = activeTable.data[0]?.length || 0;
    const s = new Set<string>();
    for (let c = 0; c < cols; c++) s.add(cellKey(ri, c));
    setSelCells(s);
  };

  const handleColHeaderClick = (ci: number) => {
    if (!activeTable) return;
    const rows = activeTable.data.length;
    const s = new Set<string>();
    for (let r = 0; r < rows; r++) s.add(cellKey(r, ci));
    setSelCells(s);
  };

  const selectAll = () => {
    if (!activeTable) return;
    const s = new Set<string>();
    for (let r = 0; r < activeTable.data.length; r++)
      for (let c = 0; c < (activeTable.data[0]?.length || 0); c++)
        s.add(cellKey(r, c));
    setSelCells(s);
  };

  // ====================== SEARCH HIGHLIGHT ======================
  const highlightText = (text: string, term: string): React.ReactNode => {
    if (!term) return text;
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="search-highlight">{text.slice(idx, idx + term.length)}</mark>
        {text.slice(idx + term.length)}
      </>
    );
  };

  // ====================== IMPORT / EXPORT ======================
  const handleImportExcel = async () => {
    setLoading(true);
    try {
      const result = await importExcel();
      if (!result) { setLoading(false); return; }
      const newTables = tables.map((t, i) => i === activeTab ? { ...t, name: result.name, data: result.data } : t);
      setTables(newTables);
      await saveTable(newTables[activeTab]);
    } finally { setLoading(false); }
  };

  const handleExportExcel = () => {
    if (!activeTable) return;
    const rows = activeTable.data.map((row, ri) => [String(ri + 1), ...row]);
    const header = ['', ...activeTable.data[0]?.map((_, ci) => colLetter(ci)) ?? []];
    exportExcel(activeTable.name, [header, ...rows]);
  };

  // ====================== TABLE MANAGEMENT ======================
  const handleAddTable = async () => {
    const sortOrder = tables.length;
    const name = `表格${sortOrder + 1}`;
    const id = await addDutyTable(buttonId, name, sortOrder, createEmptyData(DEFAULT_ROWS, DEFAULT_COLS));
    setTables(prev => [...prev, { id, buttonId, name, sortOrder, data: createEmptyData(DEFAULT_ROWS, DEFAULT_COLS) }]);
    setActiveTab(tables.length);
  };

  const handleDeleteTable = async (tableIdx: number) => {
    const table = tables[tableIdx];
    if (!window.confirm(`确定要删除"${table.name}"吗？`)) return;
    await deleteDutyTable(table.id);
    const newTables = tables.filter((_, i) => i !== tableIdx);
    setTables(newTables);
    if (activeTab >= newTables.length) setActiveTab(Math.max(0, newTables.length - 1));
  };

  const handleRenameTable = async (tableIdx: number) => {
    const table = tables[tableIdx];
    const newName = window.prompt('重命名表格：', table.name);
    if (!newName || !newName.trim()) return;
    const newTables = tables.map((t, i) => i === tableIdx ? { ...t, name: newName.trim() } : t);
    setTables(newTables);
    await saveTable(newTables[tableIdx]);
  };

  // ====================== KEYBOARD ======================
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.ctrlKey && e.key === 'a') { e.preventDefault(); selectAll(); return; }
      if (e.ctrlKey && e.key === '0') { e.preventDefault(); setZoom(1); return; }
      if (e.key === 'Escape') { setSelCells(new Set()); setEditingCell(null); setSearchText(''); return; }
      if (e.key === 'Delete' && selCells.size > 0) {
        if (!activeTable) return;
        const nd = activeTable.data.map(r => [...r]);
        for (const k of selCells) {
          const [rr, cc] = k.split(',').map(Number);
          if (nd[rr]) nd[rr][cc] = '';
        }
        const newTables = tables.map((t, i) => i === activeTab ? { ...t, data: nd } : t);
        setTables(newTables);
        saveTable(newTables[activeTab]);
        setSelCells(new Set());
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selCells, activeTable, tables, activeTab]);

  // --- Native DOM pinch-to-zoom (bypass React synthetic events for Capacitor WebView) ---
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;

    let pinchStartDist = 0;
    let pinchStartZoom = 1;

    const getDist = (t: TouchList) => {
      if (t.length < 2) return 0;
      return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchStartDist = getDist(e.touches);
        pinchStartZoom = zoomRef.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist > 0) {
        e.preventDefault();
        const dist = getDist(e.touches);
        if (dist > 0) {
          const rawZoom = pinchStartZoom * dist / pinchStartDist;
          const newZoom = Math.max(0.4, Math.min(4, rawZoom));
          setZoom(newZoom);
        }
      }
    };

    const onTouchEnd = () => { pinchStartDist = 0; };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [activeTable]); // Re-attach when table becomes available

  // ====================== RENDER ======================
  const cols = activeTable?.data[0]?.length || 0;

  return (
    <div className="duty-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">正在导入，请稍候...</div>
        </div>
      )}

      {/* HEADER */}
      <div className="duty-header">
        <button className="back-btn" onClick={() => onNavigate('Home')}>&larr; 返回</button>
        <h2 className="duty-title">{buttonLabel}</h2>
        <div className="header-spacer" />
      </div>

      {/* TABS */}
      <div className="duty-tabs-row">
        {tables.map((t, i) => (
          <div key={t.id} className={`duty-tab-wrapper ${i === activeTab ? 'active' : ''}`}>
            <span className="duty-tab" onClick={() => setActiveTab(i)}
              onDoubleClick={() => handleRenameTable(i)}
              title="点击切换 | 双击重命名">{t.name}</span>
            {tables.length > 1 && (
              <span className="duty-tab-remove" onClick={() => handleDeleteTable(i)} title="删除表格">×</span>
            )}
          </div>
        ))}
        <button className="duty-tab duty-tab-add" onClick={handleAddTable} title="添加表格">+</button>
      </div>

      {activeTable && (
        <>
          {/* TOOLBAR */}
          <div className="duty-table-toolbar">
            <button className="toolbar-btn" onClick={handleImportExcel}>导入Excel</button>
            <button className="toolbar-btn" onClick={handleExportExcel}>导出Excel</button>
            <div className="search-box">
              <input className="search-input" type="text" placeholder="搜索高亮..." value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setSearchText(''); }} />
              {searchText && <span className="search-clear" onClick={() => setSearchText('')}>×</span>}
            </div>
            <span className="zoom-indicator" title="Ctrl+滚轮 缩放">{Math.round(zoom * 100)}%</span>
          </div>

          {/* TABLE */}
          <div
            className="duty-table-scroll"
            ref={tableRef}
            tabIndex={0}
            onWheel={(e) => {
              if (e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                setZoom(prev => {
                  const delta = e.deltaY > 0 ? -0.1 : 0.1;
                  const next = Math.round((prev + delta) * 10) / 10;
                  return Math.max(0.4, Math.min(4, next));
                });
              }
            }}
          >
            <div className="duty-table-zoom-wrapper" style={{ transform: `scale(${zoom})` }}>
              <table className="duty-data-table">
                <colgroup>
                  <col style={{ width: 40 }} />
                  {Array.from({ length: cols }, (_, ci) => (
                    <col key={ci} style={{ width: colWidths[ci] || 100 }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th className="row-header corner-header" onClick={selectAll} title="全选 Ctrl+A">
                      <span style={{ fontSize: 10, color: '#999' }}>▾</span>
                    </th>
                    {Array.from({ length: cols }, (_, ci) => (
                      <th key={ci}
                        className={`col-header${selCells.size > 0 && Array.from(selCells).every(k => parseInt(k.split(',')[1]) === ci) ? ' col-selected' : ''}`}
                        onClick={() => handleColHeaderClick(ci)}
                        title="点击选中整列">
                        {colLetter(ci)}
                        <div className="col-resize-handle"
                          onMouseDown={e => { e.stopPropagation(); setResizingCol({ index: ci, startX: e.clientX, startWidth: colWidths[ci] || 100 }); }} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeTable.data.map((row, ri) => (
                    <tr key={ri} style={rowHeights[ri] ? { height: rowHeights[ri] } : undefined}>
                      <td
                        className={`row-header${Array.from(selCells).every(k => parseInt(k.split(',')[0]) === ri) ? ' row-selected' : ''}`}
                        onClick={() => handleRowHeaderClick(ri)} title="点击选中整行">
                        {ri + 1}
                        <div className="row-resize-handle"
                          onMouseDown={e => { e.stopPropagation(); setResizingRow({ index: ri, startY: e.clientY, startHeight: rowHeights[ri] || 28 }); }} />
                      </td>
                      {row.map((cell, ci) => {
                        const key = cellKey(ri, ci);
                        const isSel = selCells.has(key);
                        const isEdit = editingCell?.row === ri && editingCell?.col === ci;
                        const isSearchMatch = searchText && cell.toLowerCase().includes(searchText.toLowerCase());

                        return (
                          <td key={ci}
                            className={`data-cell${isSel ? ' cell-selected' : ''}${isSearchMatch ? ' cell-search-match' : ''}`}
                            onMouseDown={e => handleCellMouseDown(e, ri, ci)}
                            onDoubleClick={() => handleCellDoubleClick(ri, ci)}
                          >
                            {isEdit ? (
                              <input className="cell-input" value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                autoFocus />
                            ) : (
                              <span className="cell-text">{highlightText(cell, searchText)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
