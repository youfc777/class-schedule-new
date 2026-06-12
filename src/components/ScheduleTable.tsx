import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ClassSchedule, TimeSlot, CellStyle } from '../types';
import './ScheduleTable.css';

interface ScheduleTableProps {
  schedules: ClassSchedule[];
  timeSlots: TimeSlot[];
  onCellPress: (row: number, col: number, schedule?: ClassSchedule) => void;
  onCellLongPress: (row: number, col: number, schedule?: ClassSchedule) => void;
  onTimeSlotPress: (slotIndex: number) => void;
  onBatchFormat?: (cells: { row: number; col: number; scheduleId?: number }[], style: CellStyle) => void;
  onBatchColor?: (cells: { row: number; col: number; scheduleId?: number }[], color: string) => void;
  onPaste?: (cells: { row: number; col: number; value: string }[]) => void;
  onExport?: () => void;
  onCellDelete?: (row: number, col: number) => void;
}

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const colors = ['#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9', '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB', '#C8E6C9', '#DCEDC8', '#FFF9C4', '#FFECB3', '#FFE0B2', '#FFCCBC', '#D7CCC8', '#F5F5F5', '#CFD8DC'];

function cellKey(r: number, c: number): string { return `${r},${c}`; }

const FONT_SIZES: Record<string, string> = { small: '11px', medium: '13px', large: '16px' };

// Helper to find cell from touch coordinates (also supports weekday headers)
function getCellFromPoint(x: number, y: number): { row: number; col: number } | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  // Walk up to find the cell td or th
  let target: HTMLElement | null = el as HTMLElement;
  while (target) {
    // Schedule cell with data attributes
    if (target.hasAttribute && target.hasAttribute('data-row') && target.hasAttribute('data-col')) {
      const row = parseInt(target.getAttribute('data-row') || '', 10);
      const col = parseInt(target.getAttribute('data-col') || '', 10);
      if (!isNaN(row) && !isNaN(col)) return { row, col };
    }
    // Weekday header cell
    if (target.classList && target.classList.contains('weekday-cell')) {
      const tr = target.parentElement;
      if (tr) {
        const tbody = tr.parentElement;
        if (tbody && tbody.tagName === 'TBODY') {
          const rowIndex = Array.prototype.indexOf.call(tbody.children, tr);
          if (rowIndex >= 0) return { row: rowIndex, col: -1 };
        }
      }
    }
    // Time column header
    if (target.classList && target.classList.contains('time-header-cell')) {
      const thead = target.closest('thead');
      if (thead) {
        const headers = thead.querySelectorAll('.time-header-cell');
        const colIndex = Array.prototype.indexOf.call(headers, target);
        if (colIndex >= 0) return { row: -1, col: colIndex };
      }
    }
    target = target.parentElement;
    if (target && (target.tagName === 'TABLE' || target.tagName === 'BODY')) break;
  }
  return null;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  schedules,
  timeSlots,
  onCellPress,
  onCellLongPress,
  onTimeSlotPress,
  onBatchFormat,
  onBatchColor,
  onPaste,
  onExport,
  onCellDelete,
}) => {
  const [ctrlSelected, setCtrlSelected] = useState<Set<string>>(new Set());
  const [dragSelected, setDragSelected] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);

  // Row/column selection
  const [rowSelected, setRowSelected] = useState<Set<number>>(new Set());
  const [colSelected, setColSelected] = useState<Set<number>>(new Set());
  const [isRowDragging, setIsRowDragging] = useState(false);
  const [isColDragging, setIsColDragging] = useState(false);
  const [rowDragStart, setRowDragStart] = useState<number | null>(null);
  const [colDragStart, setColDragStart] = useState<number | null>(null);
  const rowDragMoved = { current: false };
  const colDragMoved = { current: false };
  const cellDragMoved = { current: false };

  // Refs for native touch handlers (avoid stale closure issues)
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ row: number; col: number } | null>(null);
  const dragSelectedRef = useRef<Set<string>>(new Set());
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
  useEffect(() => { dragStartRef.current = dragStart; }, [dragStart]);
  useEffect(() => { dragSelectedRef.current = dragSelected; }, [dragSelected]);

  const [showFormatPopup, setShowFormatPopup] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [formatFontSize, setFormatFontSize] = useState<CellStyle['fontSize']>('medium');
  const [formatBold, setFormatBold] = useState(false);
  const [formatItalic, setFormatItalic] = useState(false);
  const [formatUnderline, setFormatUnderline] = useState(false);
  const [formatColor, setFormatColor] = useState('#000000');
  const [formatBgColor, setFormatBgColor] = useState('#FFFFFF');
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const [colorPickerTarget, setColorPickerTarget] = useState<'cells' | 'rows' | 'cols'>('cells');

  // Long press / context menu for mobile
  const wrapperRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const touchStartCellRef = useRef<{ row: number; col: number } | null>(null);
  const [contextMenuCell, setContextMenuCell] = useState<{ row: number; col: number } | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  // Timestamp guard to suppress synthetic mouse events after a long-press
  const suppressMouseUntilRef = useRef(0);

  // Refs for callbacks to avoid stale closures in native event listeners
  const onCellPressRef = useRef(onCellPress);
  const onCellLongPressRef = useRef(onCellLongPress);
  const onCellDeleteRef = useRef(onCellDelete);
  const onTimeSlotPressRef = useRef(onTimeSlotPress);
  const schedulesRef = useRef(schedules);
  useEffect(() => {
    onCellPressRef.current = onCellPress;
    onCellLongPressRef.current = onCellLongPress;
    onCellDeleteRef.current = onCellDelete;
    onTimeSlotPressRef.current = onTimeSlotPress;
    schedulesRef.current = schedules;
  });

  const getSchedule = (row: number, col: number): ClassSchedule | undefined => {
    return schedules.find(s => s.row === row && s.col === col);
  };

  const rangeFromDrag = (r1: number, c1: number, r2: number, c2: number): Set<string> => {
    const s = new Set<string>();
    const rMin = Math.min(r1, r2), rMax = Math.max(r1, r2);
    const cMin = Math.min(c1, c2), cMax = Math.max(c1, c2);
    for (let r = rMin; r <= rMax; r++)
      for (let c = cMin; c <= cMax; c++)
        s.add(cellKey(r, c));
    return s;
  };

  // --- Mouse handlers ---
  const handleMouseDown = (e: React.MouseEvent, row: number, col: number) => {
    if (e.button !== 0) return;
    // Suppress synthetic mouse events after a long-press context menu
    if (Date.now() < suppressMouseUntilRef.current) return;

    if (e.ctrlKey) {
      e.preventDefault();
      setDragSelected(new Set());
      setIsDragging(false);
      setCtrlSelected(prev => {
        const next = new Set(prev);
        const k = cellKey(row, col);
        next.has(k) ? next.delete(k) : next.add(k);
        return next;
      });
      setShowFormatPopup(false);
      setShowColorPicker(false);
      return;
    }

    // Start drag selection
    setIsDragging(true);
    setDragStart({ row, col });
    cellDragMoved.current = false;
    setCtrlSelected(new Set());
    setShowFormatPopup(false);
    setShowColorPicker(false);
    setDragSelected(new Set([cellKey(row, col)]));
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isDragging && dragStart) {
      if (row !== dragStart.row || col !== dragStart.col) {
        cellDragMoved.current = true;
      }
      setDragSelected(rangeFromDrag(dragStart.row, dragStart.col, row, col));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging && cellDragMoved.current && dragSelected.size > 0) {
      // Only show color picker on desktop (real mousedown/mouseup), not touch
      if (!touchLastEventRef.current) {
        e.preventDefault();
        e.stopPropagation();
        setPopupPos({ x: e.clientX, y: e.clientY });
        setColorPickerTarget('cells');
        setShowColorPicker(true);
      }
    } else if (isDragging) {
      // Simple click without drag — clear selection so onClick can proceed
      setDragSelected(new Set());
    }
    setIsDragging(false);
    setDragStart(null);

    if (isRowDragging && rowDragMoved.current && rowSelected.size > 0) {
      setPopupPos({ x: e.clientX, y: e.clientY });
      setColorPickerTarget('rows');
      setShowColorPicker(true);
    }
    setIsRowDragging(false);
    setRowDragStart(null);

    if (isColDragging && colDragMoved.current && colSelected.size > 0) {
      setPopupPos({ x: e.clientX, y: e.clientY });
      setColorPickerTarget('cols');
      setShowColorPicker(true);
    }
    setIsColDragging(false);
    setColDragStart(null);
  };

  const handleCellClick = (e: React.MouseEvent, row: number, col: number, schedule?: ClassSchedule) => {
    if (e.ctrlKey) return;
    // Suppress synthetic click after a long-press context menu
    if (Date.now() < suppressMouseUntilRef.current) return;
    if (ctrlSelected.size > 0) {
      setCtrlSelected(new Set());
      return;
    }
    if (dragSelected.size > 0) {
      setDragSelected(new Set());
      return;
    }
    if (rowSelected.size > 0 || colSelected.size > 0) {
      setRowSelected(new Set());
      setColSelected(new Set());
      return;
    }
    onCellPress(row, col, schedule);
  };

  const handleContextMenu = (e: React.MouseEvent, row: number, col: number, schedule?: ClassSchedule) => {
    e.preventDefault();
    // Suppress synthetic contextmenu after native long-press (mobile)
    if (Date.now() < suppressMouseUntilRef.current) return;
    if (ctrlSelected.size > 0) {
      setPopupPos({ x: e.clientX, y: e.clientY });
      setShowFormatPopup(true);
    } else if (dragSelected.size > 0) {
      setPopupPos({ x: e.clientX, y: e.clientY });
      setColorPickerTarget('cells');
      setShowColorPicker(true);
    } else if (rowSelected.size > 0 || colSelected.size > 0) {
      setPopupPos({ x: e.clientX, y: e.clientY });
      setColorPickerTarget(rowSelected.size > 0 ? 'rows' : 'cols');
      setShowColorPicker(true);
    } else {
      onCellLongPress(row, col, schedule);
    }
  };

  // --- Row header handlers ---
  const handleRowHeaderMouseDown = (e: React.MouseEvent, ri: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (e.ctrlKey) {
      setRowSelected(prev => {
        const next = new Set(prev);
        next.has(ri) ? next.delete(ri) : next.add(ri);
        return next;
      });
      return;
    }
    setDragSelected(new Set());
    setColSelected(new Set());
    setIsRowDragging(true);
    setRowDragStart(ri);
    rowDragMoved.current = false;
    setRowSelected(new Set([ri]));
  };

  const handleRowHeaderMouseEnter = (ri: number) => {
    if (isRowDragging && rowDragStart !== null && ri !== rowDragStart) {
      rowDragMoved.current = true;
      const rMin = Math.min(rowDragStart, ri), rMax = Math.max(rowDragStart, ri);
      const s = new Set<number>();
      for (let r = rMin; r <= rMax; r++) s.add(r);
      setRowSelected(s);
    }
  };

  // --- Column header handlers ---
  const handleColHeaderMouseDown = (e: React.MouseEvent, ci: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (e.ctrlKey) {
      setColSelected(prev => {
        const next = new Set(prev);
        next.has(ci) ? next.delete(ci) : next.add(ci);
        return next;
      });
      return;
    }
    setDragSelected(new Set());
    setRowSelected(new Set());
    setIsColDragging(true);
    setColDragStart(ci);
    colDragMoved.current = false;
    setColSelected(new Set([ci]));
  };

  const handleColHeaderMouseEnter = (ci: number) => {
    if (isColDragging && colDragStart !== null && ci !== colDragStart) {
      colDragMoved.current = true;
      const cMin = Math.min(colDragStart, ci), cMax = Math.max(colDragStart, ci);
      const s = new Set<number>();
      for (let c = cMin; c <= cMax; c++) s.add(c);
      setColSelected(s);
    }
  };

  // --- Actions ---
  const handleApplyFormat = () => {
    if (!onBatchFormat || ctrlSelected.size === 0) return;
    const cells = Array.from(ctrlSelected).map(k => {
      const [r, c] = k.split(',').map(Number);
      const s = getSchedule(r, c);
      return { row: r, col: c, scheduleId: s?.id };
    });
    onBatchFormat(cells, {
      fontSize: formatFontSize,
      bold: formatBold || undefined,
      italic: formatItalic || undefined,
      underline: formatUnderline || undefined,
      color: formatColor !== '#000000' ? formatColor : undefined,
      bgColor: formatBgColor !== '#FFFFFF' ? formatBgColor : undefined,
    });
    setShowFormatPopup(false);
    setCtrlSelected(new Set());
  };

  const handleApplyColor = (color: string) => {
    if (!onBatchColor) return;

    if (colorPickerTarget === 'rows' && rowSelected.size > 0) {
      const cells: { row: number; col: number; scheduleId?: number }[] = [];
      const numCols = timeSlots.length;
      for (const r of rowSelected) {
        for (let c = 0; c < numCols; c++) {
          const s = getSchedule(r, c);
          cells.push({ row: r, col: c, scheduleId: s?.id });
        }
      }
      onBatchColor(cells, color);
      setShowColorPicker(false);
      setRowSelected(new Set());
      return;
    }

    if (colorPickerTarget === 'cols' && colSelected.size > 0) {
      const cells: { row: number; col: number; scheduleId?: number }[] = [];
      const numRows = WEEK_DAYS.length;
      for (const c of colSelected) {
        for (let r = 0; r < numRows; r++) {
          const s = getSchedule(r, c);
          cells.push({ row: r, col: c, scheduleId: s?.id });
        }
      }
      onBatchColor(cells, color);
      setShowColorPicker(false);
      setColSelected(new Set());
      return;
    }

    const source = dragSelected.size > 0 ? dragSelected : ctrlSelected;
    if (source.size === 0) return;
    const cells = Array.from(source).map(k => {
      const [r, c] = k.split(',').map(Number);
      const s = getSchedule(r, c);
      return { row: r, col: c, scheduleId: s?.id };
    });
    onBatchColor(cells, color);
    setShowColorPicker(false);
    setDragSelected(new Set());
    setCtrlSelected(new Set());
  };

  const handleClearColor = () => {
    handleApplyColor('#FFFFFF');
  };

  // --- Keyboard ---
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setCtrlSelected(new Set());
      setDragSelected(new Set());
      setRowSelected(new Set());
      setColSelected(new Set());
      setShowFormatPopup(false);
      setShowColorPicker(false);
    }
    if (e.ctrlKey && e.key === 'v' && onPaste) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const rows = text.trim().split('\n');
        const cells: { row: number; col: number; value: string }[] = [];
        // Paste starting from the first selected cell or from (0,0)
        let startR = 0, startC = 0;
        if (ctrlSelected.size > 0) {
          const first = Array.from(ctrlSelected)[0].split(',').map(Number);
          startR = first[0]; startC = first[1];
        } else if (dragSelected.size > 0) {
          const first = Array.from(dragSelected)[0].split(',').map(Number);
          startR = first[0]; startC = first[1];
        }
        rows.forEach((line, ri) => {
          line.split('\t').forEach((val, ci) => {
            cells.push({ row: startR + ri, col: startC + ci, value: val.trim() });
          });
        });
        if (cells.length > 0) onPaste(cells);
      }).catch((err) => {
        console.warn('Clipboard read failed:', err);
      });
    }
  }, [ctrlSelected, dragSelected, onPaste]);

  // --- Styles ---
  const cellStyleToProps = (s?: CellStyle): React.CSSProperties => {
    if (!s) return {};
    return {
      fontSize: FONT_SIZES[s.fontSize || 'medium'] || FONT_SIZES['medium'],
      fontWeight: s.bold ? 'bold' : 'normal',
      fontStyle: s.italic ? 'italic' : 'normal',
      textDecoration: s.underline ? 'underline' : 'none',
      color: s.color || undefined,
      backgroundColor: s.bgColor || undefined,
      textAlign: s.halign || 'center',
      verticalAlign: s.valign || 'middle',
      whiteSpace: s.wrap ? 'normal' : 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    };
  };

  const anySelected = ctrlSelected.size + dragSelected.size;
  const anyRowColSelected = rowSelected.size + colSelected.size;

  // Long-press guard ref: when true, mouseup/wheel handlers must bail out
  const longPressActiveRef = useRef(false);

  // --- Native DOM touch events (bypass React synthetic events for Capacitor WebView) ---
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    let longPressTimer: number | null = null;
    let touchStartPos = { x: 0, y: 0 };
    let touchStartCell: { row: number; col: number } | null = null;
    let longPressTriggered = false;
    let touchDragStarted = false;

    const onNativeTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchLastEventRef.current = true;
      const touch = e.touches[0];
      const cell = getCellFromPoint(touch.clientX, touch.clientY);
      if (!cell) return;

      touchStartPos = { x: touch.clientX, y: touch.clientY };
      touchStartCell = cell;
      longPressTriggered = false;
      touchDragStarted = false;
      cellDragMoved.current = false;

      // Do NOT start drag immediately — wait for movement to distinguish tap vs drag vs long-press
      // Start 600ms long-press timer
      longPressTimer = window.setTimeout(() => {
        longPressTriggered = true;
        longPressActiveRef.current = true;
        cellDragMoved.current = false;
        touchDragStarted = false;
        // Block synthetic mouse events for 800ms after long press
        suppressMouseUntilRef.current = Date.now() + 800;
        // Clear drag state and close all popups
        setIsDragging(false);
        setDragStart(null);
        setDragSelected(new Set());
        setShowColorPicker(false);
        setShowFormatPopup(false);
        setShowContextMenu(false);
        setContextMenuCell(cell);
        setContextMenuPos({ x: touchStartPos.x, y: touchStartPos.y });
        setShowContextMenu(true);
      }, 600);
    };

    const onNativeTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPos.x);
      const dy = Math.abs(touch.clientY - touchStartPos.y);
      const moved = dx > 10 || dy > 10;

      // Cancel long press if moved > 10px
      if (longPressTimer !== null && moved) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      if (longPressTriggered) return;

      const cell = getCellFromPoint(touch.clientX, touch.clientY);
      if (!cell) return;

      // Start drag selection once finger has moved beyond threshold
      if (!touchDragStarted && moved && touchStartCell) {
        touchDragStarted = true;
        // Start drag from the original touch cell
        setIsDragging(true);
        setDragStart(touchStartCell);
        setDragSelected(new Set([cellKey(touchStartCell.row, touchStartCell.col)]));
        cellDragMoved.current = true;
        setShowColorPicker(false);
        setShowFormatPopup(false);
        setCtrlSelected(new Set());
      }

      // Update drag selection as finger moves
      if (touchDragStarted && touchStartCell) {
        cellDragMoved.current = true;
        const rMin = Math.min(touchStartCell.row, cell.row);
        const rMax = Math.max(touchStartCell.row, cell.row);
        const cMin = Math.min(touchStartCell.col, cell.col);
        const cMax = Math.max(touchStartCell.col, cell.col);
        const s = new Set<string>();
        for (let r = rMin; r <= rMax; r++)
          for (let c = cMin; c <= cMax; c++)
            s.add(cellKey(r, c));
        setDragSelected(s);
      }
    };

    const onNativeTouchEnd = (e: TouchEvent) => {
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      if (longPressTriggered) {
        longPressTriggered = false;
        e.preventDefault();
        touchLastEventRef.current = false;
        touchDragStarted = false;
        return;
      }

      const touch = e.changedTouches[0];
      const cell = getCellFromPoint(touch.clientX, touch.clientY);

      // Handle drag finish
      if (touchDragStarted) {
        touchDragStarted = false;
        if (cell) e.preventDefault();
        // On touch drag, do NOT show color picker — only show on desktop mouse drag
        setIsDragging(false);
        setDragStart(null);
        touchLastEventRef.current = false;
        return;
      }

      // Simple tap — no drag, no long press
      if (cell) {
        e.preventDefault();
      }

      // Clear any residual drag state
      setIsDragging(false);
      setDragStart(null);
      setDragSelected(new Set());

      if (cell && cell.row === -1 && cell.col >= 0) {
        // Time header tapped → edit time slot
        onTimeSlotPressRef.current(cell.col);
      } else if (cell && cell.col === -1 && cell.row >= 0) {
        // Weekday header tapped → select row
        const mockUp = { button: 0, ctrlKey: false, clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {}, stopPropagation: () => {} } as any;
        handleRowHeaderMouseDown(mockUp, cell.row);
      } else if (cell && cell.row >= 0 && cell.col >= 0) {
        // Regular schedule cell tap
        const s = schedulesRef.current.find(sc => sc.row === cell.row && sc.col === cell.col);
        const mockUp = { button: 0, ctrlKey: false, clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {}, stopPropagation: () => {} } as any;
        handleCellClick(mockUp, cell.row, cell.col, s);
      }
      touchLastEventRef.current = false;
    };

    el.addEventListener('touchstart', onNativeTouchStart, { passive: false });
    el.addEventListener('touchmove', onNativeTouchMove, { passive: false });
    el.addEventListener('touchend', onNativeTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onNativeTouchStart);
      el.removeEventListener('touchmove', onNativeTouchMove);
      el.removeEventListener('touchend', onNativeTouchEnd);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wrapped mouseUp to bail out when long-press menu is active
  const handleMouseUpWrapper = (e: React.MouseEvent) => {
    if (Date.now() < suppressMouseUntilRef.current) return;
    if (longPressActiveRef.current) {
      longPressActiveRef.current = false;
      // Clean up drag state that may have been set by an unguarded mousedown
      setIsDragging(false);
      setDragStart(null);
      setDragSelected(new Set());
      return;
    }
    handleMouseUp(e);
  };

  // Track if last event was from touch (to suppress color picker on touch drag)
  const touchLastEventRef = useRef(false);

  return (
    <div
      ref={wrapperRef}
      className="schedule-table-wrapper"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onMouseUp={handleMouseUpWrapper}
    >
      {/* Toolbar */}
      <div className="schedule-toolbar">
        <span className="toolbar-hint">Ctrl+点击 多选单元格 | 拖选单元格/行首/列首 批量改底色 | Ctrl+V 粘贴</span>
        {anySelected > 0 && (
          <span className="toolbar-hint selected-count">已选中 {anySelected} 个单元格</span>
        )}
        {anyRowColSelected > 0 && (
          <span className="toolbar-hint selected-count">
            已选中 {rowSelected.size > 0 && `${rowSelected.size} 行`}{rowSelected.size > 0 && colSelected.size > 0 && '、'}{colSelected.size > 0 && `${colSelected.size} 列`}
          </span>
        )}
        {onExport && (
          <button className="toolbar-btn" onClick={onExport} title="导出课程表为Excel">导出Excel</button>
        )}
      </div>

      <table className="schedule-table">
        <thead>
          <tr>
            <th className="corner-cell">星期</th>
            {Array.from({ length: 12 }, (_, i) => {
              const slot = timeSlots.find(s => s.slotIndex === i);
              const isColSel = colSelected.has(i);
              return (
                <th
                  key={i}
                  className={`time-header-cell${isColSel ? ' col-header-selected' : ''}`}
                  onClick={() => onTimeSlotPress(i)}
                  onMouseDown={(e) => handleColHeaderMouseDown(e, i)}
                  onMouseEnter={() => handleColHeaderMouseEnter(i)}
                  title="点击编辑时间段 | 拖选整列改底色"
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
          {WEEK_DAYS.map((day, rowIndex) => {
            const isRowSel = rowSelected.has(rowIndex);
            return (
            <tr key={rowIndex} className={isRowSel ? 'row-selected-tr' : ''}>
              <td
                className={`weekday-cell${isRowSel ? ' weekday-selected' : ''}`}
                onMouseDown={(e) => handleRowHeaderMouseDown(e, rowIndex)}
                onMouseEnter={() => handleRowHeaderMouseEnter(rowIndex)}
                title="拖选行首 批量改底色"
              >{day}</td>
              {Array.from({ length: 12 }, (_, colIndex) => {
                const schedule = getSchedule(rowIndex, colIndex);
                const hasRealCourse = schedule && schedule.className !== '';
                const key = cellKey(rowIndex, colIndex);
                const isCtrlSel = ctrlSelected.has(key);
                const isDragSel = dragSelected.has(key);
                const isColSel = colSelected.has(colIndex);
                const style = cellStyleToProps(schedule?.cellStyle);
                return (
                  <td
                    key={colIndex}
                    data-row={rowIndex}
                    data-col={colIndex}
                    className={`cell${hasRealCourse ? ' filled-cell' : ''}${schedule?.reminderEnabled ? ' reminder-cell' : ''}${isCtrlSel ? ' ctrl-selected-cell' : ''}${isDragSel ? ' selected-cell' : ''}${isRowSel || isColSel ? ' rowcol-selected-cell' : ''}`}
                    style={style}
                    onClick={(e) => handleCellClick(e, rowIndex, colIndex, schedule)}
                    onMouseDown={(e) => handleMouseDown(e, rowIndex, colIndex)}
                    onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                    onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex, schedule)}
                    title={hasRealCourse ? `${schedule!.className}（右键编辑）` : '点击添加课程'}
                  >
                    {hasRealCourse && (
                      <>
                        <span className="cell-class-name">{schedule!.className}</span>
                        {schedule!.reminderEnabled && <span className="reminder-dot" />}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          );
          })}
        </tbody>
      </table>

      {/* Format popup (Ctrl+click right-click) */}
      {showFormatPopup && ctrlSelected.size > 0 && (
        <div className="format-popup" style={{ left: popupPos.x, top: popupPos.y }}
          onClick={e => e.stopPropagation()}>
          <div className="format-popup-title">设置 {ctrlSelected.size} 个单元格的格式</div>
          <div className="format-popup-row">
            <span className="format-popup-label">字号</span>
            <div className="format-btn-group">
              <button className={`format-btn${formatFontSize === 'small' ? ' active' : ''}`}
                onClick={() => setFormatFontSize('small')}>小</button>
              <button className={`format-btn${formatFontSize === 'medium' ? ' active' : ''}`}
                onClick={() => setFormatFontSize('medium')}>中</button>
              <button className={`format-btn${formatFontSize === 'large' ? ' active' : ''}`}
                onClick={() => setFormatFontSize('large')}>大</button>
            </div>
          </div>
          <div className="format-popup-row">
            <span className="format-popup-label">样式</span>
            <div className="format-btn-group">
              <button className={`format-btn${formatBold ? ' active' : ''}`}
                onClick={() => setFormatBold(!formatBold)}><strong>B</strong></button>
              <button className={`format-btn${formatItalic ? ' active' : ''}`}
                onClick={() => setFormatItalic(!formatItalic)}><em>I</em></button>
              <button className={`format-btn${formatUnderline ? ' active' : ''}`}
                onClick={() => setFormatUnderline(!formatUnderline)}><u>U</u></button>
            </div>
          </div>
          <div className="format-popup-row">
            <span className="format-popup-label">字体色</span>
            <input className="format-color-input" type="color" value={formatColor}
              onChange={e => setFormatColor(e.target.value)} />
          </div>
          <div className="format-popup-row">
            <span className="format-popup-label">背景色</span>
            <input className="format-color-input" type="color" value={formatBgColor}
              onChange={e => setFormatBgColor(e.target.value)} />
          </div>
          <div className="format-popup-actions">
            <button className="format-apply-btn" onClick={handleApplyFormat}>应用</button>
            <button className="format-cancel-btn" onClick={() => setShowFormatPopup(false)}>取消</button>
          </div>
        </div>
      )}

      {/* Color picker popup (drag release or right-click drag) — portaled to body to avoid clipping */}
      {showColorPicker && !showContextMenu && createPortal(
        <>
          <div className="color-picker-overlay"
            onClick={() => { setShowColorPicker(false); setShowFormatPopup(false); setCtrlSelected(new Set()); setDragSelected(new Set()); setRowSelected(new Set()); setColSelected(new Set()); }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setShowColorPicker(false); setShowFormatPopup(false); setCtrlSelected(new Set()); setDragSelected(new Set()); setRowSelected(new Set()); setColSelected(new Set()); }}
          />
          <div className="color-picker-popup" style={{ left: popupPos.x, top: popupPos.y }}
            onClick={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}>
          <div className="format-popup-title">
            选择{colorPickerTarget === 'rows' ? ` ${rowSelected.size} 行` : colorPickerTarget === 'cols' ? ` ${colSelected.size} 列` : '单元格'}背景颜色
          </div>
          <div className="color-picker-grid">
            {colors.map(c => (
              <div
                key={c}
                className="color-swatch"
                style={{ backgroundColor: c, touchAction: 'manipulation' }}
                onClick={() => handleApplyColor(c)}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleApplyColor(c); }}
                title={c}
              />
            ))}
          </div>
          <button className="color-cancel-btn" onClick={handleClearColor} onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleClearColor(); }}>清除底色</button>
          <button className="color-cancel-btn" onClick={() => setShowColorPicker(false)} onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setShowColorPicker(false); }} style={{ marginLeft: 8 }}>取消</button>
        </div>
        </>,
        document.body
      )}
      {/* Cell context menu (mobile long-press) — rendered via Portal to avoid overflow clipping */}
      {showContextMenu && contextMenuCell && createPortal(
        <>
          <div className="cell-context-overlay"
            onClick={() => { setShowContextMenu(false); setShowColorPicker(false); setShowFormatPopup(false); }}
            onTouchEnd={(e) => { e.preventDefault(); setShowContextMenu(false); setShowColorPicker(false); setShowFormatPopup(false); }}
          />
          <div className="cell-context-menu" style={{ left: contextMenuPos.x, top: contextMenuPos.y }}>
            <button
              onClick={() => {
                setShowContextMenu(false);
                const s = schedulesRef.current.find(sc => sc.row === contextMenuCell.row && sc.col === contextMenuCell.col);
                onCellLongPressRef.current(contextMenuCell.row, contextMenuCell.col, s);
              }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setShowContextMenu(false); const s = schedulesRef.current.find(sc => sc.row === contextMenuCell.row && sc.col === contextMenuCell.col); onCellLongPressRef.current(contextMenuCell.row, contextMenuCell.col, s); }}
            >编辑课程</button>
            <button
              onClick={() => {
                setShowContextMenu(false);
                if (onCellDeleteRef.current) onCellDeleteRef.current(contextMenuCell.row, contextMenuCell.col);
              }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setShowContextMenu(false); if (onCellDeleteRef.current) onCellDeleteRef.current(contextMenuCell.row, contextMenuCell.col); }}
            >删除课程</button>
            <button
              onClick={() => setShowContextMenu(false)}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setShowContextMenu(false); }}
            >取消</button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
