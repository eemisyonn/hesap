// Parametre Excel Tablosu Yönetimi
(function () {
    const DEFAULT_COLUMN_COUNT = 15;
    const DEFAULT_ROW_COUNT = 20;

     const COL_WIDTHS_STORAGE_KEY = 'parametre_excel_col_widths_v1';

    let headerRow;
    let tableBody;
    let selectAllCheckbox;
    let currentFocusedCell = null;

     let selection = null;
     let isSelecting = false;
     let selectionAnchor = null;

     let isResizing = false;
     let resizingColIndex = null;
     let resizingStartX = 0;
     let resizingStartWidth = 0;

    document.addEventListener('DOMContentLoaded', () => {
        headerRow = document.getElementById('excelHeader');
        tableBody = document.getElementById('excelBody');

        if (!headerRow || !tableBody) {
            return;
        }

        renderHeaders(DEFAULT_COLUMN_COUNT);
        renderEmptyRows(DEFAULT_ROW_COUNT);
        loadExcelData();

        tableBody.addEventListener('focusin', handleCellFocus, true);
        tableBody.addEventListener('mousedown', handleMouseDown, true);
        tableBody.addEventListener('mouseover', handleMouseOver, true);
        document.addEventListener('mouseup', handleMouseUp, true);
        tableBody.addEventListener('keydown', handleGridKeyDown, true);
        tableBody.addEventListener('paste', handlePasteEvent, true);
        document.addEventListener('keydown', handleGlobalCopyPasteShortcuts, true);
    });

     function loadColumnWidths() {
         try {
             const raw = localStorage.getItem(COL_WIDTHS_STORAGE_KEY);
             if (!raw) return {};
             const parsed = JSON.parse(raw);
             if (parsed && typeof parsed === 'object') return parsed;
             return {};
         } catch (e) {
             return {};
         }
     }

     function saveColumnWidths(widths) {
         try {
             localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(widths || {}));
         } catch (e) {
         }
     }

     function getStoredColWidth(colIndex) {
         const widths = loadColumnWidths();
         const w = widths[String(colIndex)];
         const num = Number(w);
         if (Number.isFinite(num) && num > 0) return num;
         return null;
     }

     function setStoredColWidth(colIndex, widthPx) {
         const widths = loadColumnWidths();
         widths[String(colIndex)] = Math.max(40, Math.round(widthPx));
         saveColumnWidths(widths);
     }

    function renderHeaders(columnCount) {
        headerRow.innerHTML = '';
        const row = document.createElement('tr');

        const selectTh = document.createElement('th');
        selectTh.style.width = '50px';
        selectTh.style.textAlign = 'center';
        selectTh.style.backgroundColor = '#f8f9fa';

        selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = 'form-check-input';
        selectAllCheckbox.addEventListener('change', () => {
            tableBody.querySelectorAll('.row-checkbox').forEach(cb => {
                cb.checked = selectAllCheckbox.checked;
            });
        });

        selectTh.appendChild(selectAllCheckbox);
        row.appendChild(selectTh);

        for (let i = 0; i < columnCount; i++) {
            const th = document.createElement('th');
            th.textContent = String.fromCharCode(65 + i);
            th.style.position = 'relative';
            const storedWidth = getStoredColWidth(i);
            th.style.width = `${storedWidth || 120}px`;
            th.style.textAlign = 'center';
            th.style.backgroundColor = '#f8f9fa';
            th.style.fontWeight = '600';

            const resizer = document.createElement('div');
            resizer.className = 'excel-col-resizer';
            resizer.dataset.col = String(i);
            resizer.addEventListener('mousedown', startColumnResize);
            th.appendChild(resizer);

            row.appendChild(th);
        }

        headerRow.appendChild(row);

         applyColumnWidthsToBody();
    }

     function applyColumnWidthsToBody() {
         const colCount = headerRow.querySelectorAll('th').length - 1;
         for (let c = 0; c < colCount; c++) {
             const th = headerRow.querySelector(`th:nth-child(${c + 2})`);
             const widthPx = th ? parseInt(th.style.width || '', 10) : null;
             if (!widthPx || !Number.isFinite(widthPx)) continue;
             tableBody.querySelectorAll(`td[data-col="${c}"]`).forEach(td => {
                 td.style.width = `${widthPx}px`;
                 td.style.maxWidth = `${widthPx}px`;
             });
         }
     }

    function renderEmptyRows(rowCount) {
        tableBody.innerHTML = '';
        for (let i = 0; i < rowCount; i++) {
            tableBody.appendChild(createRow(i + 1));
        }
    }

    function createRow(index) {
        const tr = document.createElement('tr');

        const selectTd = document.createElement('td');
        selectTd.style.width = '50px';
        selectTd.style.backgroundColor = '#f8f9fa';
        selectTd.style.textAlign = 'center';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input row-checkbox';
        checkbox.value = index;

        const numberSpan = document.createElement('span');
        numberSpan.className = 'ms-2 text-muted fw-semibold';
        numberSpan.textContent = index;

        selectTd.appendChild(checkbox);
        selectTd.appendChild(numberSpan);
        tr.appendChild(selectTd);

        const columnCount = headerRow.querySelectorAll('th').length - 1;

        for (let i = 0; i < columnCount; i++) {
            const td = document.createElement('td');
            td.contentEditable = true;
            td.style.minHeight = '30px';
            td.style.border = '1px solid #dee2e6';
            td.style.padding = '6px';
            const storedWidth = getStoredColWidth(i);
            if (storedWidth) {
                td.style.width = `${storedWidth}px`;
                td.style.maxWidth = `${storedWidth}px`;
            }
            td.dataset.row = index;
            td.dataset.col = i;
            tr.appendChild(td);
        }

        return tr;
    }

    function updateRowNumbers() {
        tableBody.querySelectorAll('tr').forEach((row, idx) => {
            const checkbox = row.querySelector('.row-checkbox');
            const numberSpan = row.querySelector('td span');
            if (checkbox) checkbox.value = idx + 1;
            if (numberSpan) numberSpan.textContent = idx + 1;
            row.querySelectorAll('td[data-row]').forEach((cell) => {
                cell.dataset.row = idx + 1;
            });
        });
    }

    function handleCellFocus(event) {
        const cell = event.target.closest('td[data-row]');
        if (cell) {
            currentFocusedCell = cell;
            if (!selection || !isSelecting) {
                setSelectionFromCell(cell);
            }
        }
    }

     function handleGlobalCopyPasteShortcuts(event) {
         const key = (event.key || '').toLowerCase();
         if (event.ctrlKey && key === 'c') {
             if (selection) {
                 event.preventDefault();
                 copySelectionToClipboard();
             }
         }
         if (event.ctrlKey && key === 'v') {
             if (currentFocusedCell) {
                 event.preventDefault();
                 pasteFromClipboard();
             }
         }
     }

     function handlePasteEvent(event) {
         const cell = event.target.closest('td[data-row]');
         if (!cell) return;
         currentFocusedCell = cell;
         if (event.clipboardData) {
             const text = event.clipboardData.getData('text/plain');
             if (typeof text === 'string') {
                 event.preventDefault();
                 pasteFromText(text);
             }
         }
     }

     function handleGridKeyDown(event) {
         const cell = event.target.closest('td[data-row]');
         if (!cell) return;

         const key = event.key;
         const row = Number(cell.dataset.row);
         const col = Number(cell.dataset.col);
         if (!Number.isFinite(row) || !Number.isFinite(col)) return;

         let nextRow = row;
         let nextCol = col;

         if (key === 'ArrowUp') {
             nextRow = Math.max(1, row - 1);
         } else if (key === 'ArrowDown') {
             nextRow = row + 1;
         } else if (key === 'ArrowLeft') {
             nextCol = Math.max(0, col - 1);
         } else if (key === 'ArrowRight') {
             nextCol = col + 1;
         } else if (key === 'Enter') {
             nextRow = row + 1;
         } else if (key === 'Tab') {
             nextCol = col + (event.shiftKey ? -1 : 1);
             if (nextCol < 0) nextCol = 0;
         } else {
             return;
         }

         event.preventDefault();
         ensureRowCount(nextRow);
         ensureColumnCount(nextCol + 1);
         const nextCell = getCell(nextRow, nextCol);
         if (!nextCell) return;

         if (event.shiftKey) {
             if (!selectionAnchor) {
                 selectionAnchor = { row, col };
             }
             setSelection(selectionAnchor, { row: nextRow, col: nextCol });
         } else {
             selectionAnchor = { row: nextRow, col: nextCol };
             setSelection({ row: nextRow, col: nextCol }, { row: nextRow, col: nextCol });
         }
         focusCell(nextCell);
     }

     function handleMouseDown(event) {
         if (isResizing) return;
         const cell = event.target.closest('td[data-row]');
         if (!cell) return;

         isSelecting = true;
         currentFocusedCell = cell;
         const start = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
         selectionAnchor = start;
         setSelection(start, start);
         focusCell(cell);
     }

     function handleMouseOver(event) {
         if (!isSelecting) return;
         const cell = event.target.closest('td[data-row]');
         if (!cell) return;
         const end = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
         if (!selectionAnchor) return;
         setSelection(selectionAnchor, end);
     }

     function handleMouseUp() {
         isSelecting = false;
     }

     function focusCell(cell) {
         if (!cell) return;
         cell.focus();
         currentFocusedCell = cell;
     }

     function getCell(row, col) {
         return tableBody.querySelector(`td[data-row="${row}"][data-col="${col}"]`);
     }

     function normalizeRange(a, b) {
         const r1 = Math.min(a.row, b.row);
         const r2 = Math.max(a.row, b.row);
         const c1 = Math.min(a.col, b.col);
         const c2 = Math.max(a.col, b.col);
         return { r1, r2, c1, c2 };
     }

     function clearSelectionStyles() {
         tableBody.querySelectorAll('.excel-selected, .excel-active').forEach(el => {
             el.classList.remove('excel-selected');
             el.classList.remove('excel-active');
         });
     }

     function setSelection(start, end) {
         if (!start || !end) return;
         clearSelectionStyles();
         selection = { start, end };
         const { r1, r2, c1, c2 } = normalizeRange(start, end);
         for (let r = r1; r <= r2; r++) {
             for (let c = c1; c <= c2; c++) {
                 const cell = getCell(r, c);
                 if (cell) cell.classList.add('excel-selected');
             }
         }
         const active = getCell(end.row, end.col);
         if (active) active.classList.add('excel-active');
     }

     function setSelectionFromCell(cell) {
         const row = Number(cell.dataset.row);
         const col = Number(cell.dataset.col);
         if (!Number.isFinite(row) || !Number.isFinite(col)) return;
         selectionAnchor = { row, col };
         setSelection({ row, col }, { row, col });
     }

     function selectionTopLeftCell() {
         if (!selection) return currentFocusedCell;
         const { r1, c1 } = normalizeRange(selection.start, selection.end);
         return getCell(r1, c1) || currentFocusedCell;
     }

     async function copySelectionToClipboard() {
         if (!selection) return;
         const { r1, r2, c1, c2 } = normalizeRange(selection.start, selection.end);
         const lines = [];
         for (let r = r1; r <= r2; r++) {
             const vals = [];
             for (let c = c1; c <= c2; c++) {
                 const cell = getCell(r, c);
                 vals.push((cell?.textContent || '').trim());
             }
             lines.push(vals.join('\t'));
         }
         const text = lines.join('\n');
         try {
             await navigator.clipboard.writeText(text);
         } catch (e) {
             const ta = document.createElement('textarea');
             ta.value = text;
             ta.style.position = 'fixed';
             ta.style.left = '-9999px';
             document.body.appendChild(ta);
             ta.select();
             document.execCommand('copy');
             document.body.removeChild(ta);
         }
     }

    function ensureColumnCount(count) {
        const currentCount = headerRow.querySelectorAll('th').length - 1;
        while (headerRow.querySelectorAll('th').length - 1 < count) {
            addColumn();
        }
        while (headerRow.querySelectorAll('th').length - 1 > count) {
            deleteColumn();
        }
    }

    function gatherTableData() {
        const data = [];
        tableBody.querySelectorAll('tr').forEach((row, rowIndex) => {
            const cells = Array.from(row.querySelectorAll('td')).slice(1);
            const rowData = [String(rowIndex + 1)];
            cells.forEach(cell => rowData.push(cell.textContent.trim()));
            data.push(rowData);
        });
        return data;
    }

    function populateTableFromData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return;
        }

        const maxColumns = Math.max(...data.map(row => row.length - 1));
        ensureColumnCount(Math.max(maxColumns, DEFAULT_COLUMN_COUNT));
        renderEmptyRows(data.length);

        tableBody.querySelectorAll('tr').forEach((rowElement, idx) => {
            const rowData = data[idx]?.slice(1) || [];
            const cells = Array.from(rowElement.querySelectorAll('td')).slice(1);
            cells.forEach((cell, colIdx) => {
                cell.textContent = rowData[colIdx] || '';
            });
        });

         applyColumnWidthsToBody();
    }

    async function loadExcelData() {
        try {
            const response = await fetch('/api/load_excel_data');
            const result = await response.json();
            if (result.success && Array.isArray(result.data) && result.data.length) {
                populateTableFromData(result.data);
            } else {
                renderEmptyRows(DEFAULT_ROW_COUNT);
            }
        } catch (error) {
            console.error('Excel verileri yüklenirken hata oluştu:', error);
            renderEmptyRows(DEFAULT_ROW_COUNT);
        }
    }

    async function saveExcelData() {
        const data = gatherTableData();
        const hasContent = data.some(row => row.slice(1).some(cell => cell !== ''));
        if (!hasContent) {
            showErrorMessage('Kaydetmeden önce tabloya veri ekleyin.');
            return;
        }

        try {
            const response = await fetch('/api/save_excel_data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data })
            });
            const result = await response.json();
            if (result.success) {
                showSuccessMessage('Excel tablosu başarıyla kaydedildi.');
            } else {
                showErrorMessage(result.message || 'Kaydetme sırasında bir hata oluştu.');
            }
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            showErrorMessage('Kaydetme işlemi sırasında bir hata oluştu.');
        }
    }

    function addRow() {
        const row = createRow(tableBody.children.length + 1);
        tableBody.appendChild(row);
        updateRowNumbers();
    }

    function deleteRow() {
        if (tableBody.children.length <= 1) {
            showErrorMessage('En az bir satır olmalıdır.');
            return;
        }
        tableBody.removeChild(tableBody.lastElementChild);
        updateRowNumbers();
    }

    function addColumn() {
        const currentColumns = headerRow.querySelectorAll('th').length - 1;
        const th = document.createElement('th');
        th.textContent = String.fromCharCode(65 + currentColumns);
        th.style.position = 'relative';
        const storedWidth = getStoredColWidth(currentColumns);
        th.style.width = `${storedWidth || 120}px`;
        th.style.textAlign = 'center';
        th.style.backgroundColor = '#f8f9fa';
        headerRow.querySelector('tr').appendChild(th);

        const resizer = document.createElement('div');
        resizer.className = 'excel-col-resizer';
        resizer.dataset.col = String(currentColumns);
        resizer.addEventListener('mousedown', startColumnResize);
        th.appendChild(resizer);

        tableBody.querySelectorAll('tr').forEach(row => {
            const td = document.createElement('td');
            td.contentEditable = true;
            td.style.minHeight = '30px';
            td.style.border = '1px solid #dee2e6';
            td.style.padding = '6px';
            const w = getStoredColWidth(currentColumns);
            if (w) {
                td.style.width = `${w}px`;
                td.style.maxWidth = `${w}px`;
            }
            td.dataset.row = row.querySelector('.row-checkbox').value;
            td.dataset.col = currentColumns;
            row.appendChild(td);
        });
    }

    function deleteColumn() {
        const currentColumns = headerRow.querySelectorAll('th').length - 1;
        if (currentColumns <= 1) {
            showErrorMessage('En az bir sütun olmalıdır.');
            return;
        }

        headerRow.querySelector('tr').lastElementChild.remove();
        tableBody.querySelectorAll('tr').forEach(row => {
            row.lastElementChild.remove();
        });

        const widths = loadColumnWidths();
        delete widths[String(currentColumns - 1)];
        saveColumnWidths(widths);
    }

    function deleteSelectedRows() {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const rowsToDelete = rows.filter(row => row.querySelector('.row-checkbox')?.checked);

        if (!rowsToDelete.length) {
            showErrorMessage('Silmek için satır seçin.');
            return;
        }

        rowsToDelete.forEach(row => row.remove());
        updateRowNumbers();
        selectAllCheckbox.checked = false;
    }

    async function pasteFromClipboard() {
        if (!currentFocusedCell) {
            showErrorMessage('Verileri yapıştırmak için önce bir hücre seçin.');
            return;
        }
        try {
            const text = await navigator.clipboard.readText();
            if (!text) {
                showErrorMessage('Panoda yapıştırılacak veri bulunamadı.');
                return;
            }
            pasteFromText(text);
        } catch (error) {
            console.error('Panodan yapıştırma hatası:', error);
            showErrorMessage('Panodan veri okunamadı.');
        }
    }

     function pasteFromText(text) {
         if (!currentFocusedCell) return;
         const startCell = selectionTopLeftCell() || currentFocusedCell;
         const rows = String(text || '').split(/\r?\n/);
         const normalizedRows = rows.filter(r => r !== '');
         if (!normalizedRows.length) return;

         let rowOffset = Number(startCell.dataset.row) - 1;
         const colOffset = Number(startCell.dataset.col);
         if (!Number.isFinite(rowOffset) || !Number.isFinite(colOffset)) return;

         ensureRowCount(rowOffset + normalizedRows.length);

         normalizedRows.forEach((rowText, rIdx) => {
             const values = String(rowText).split('\t');
             const targetRow = tableBody.children[rowOffset + rIdx];
             if (!targetRow) return;
             ensureColumnCount(Math.max(headerRow.querySelectorAll('th').length - 1, colOffset + values.length));
             const cells = Array.from(targetRow.querySelectorAll('td')).slice(1);
             values.forEach((value, cIdx) => {
                 const cell = cells[colOffset + cIdx];
                 if (cell) {
                     cell.textContent = String(value ?? '').trim();
                 }
             });
         });

         const endRow = rowOffset + normalizedRows.length;
         const endCol = colOffset + String(normalizedRows[0] || '').split('\t').length - 1;
         const endCell = getCell(endRow, Math.max(colOffset, endCol));
         if (endCell) {
             setSelection(
                 { row: rowOffset + 1, col: colOffset },
                 { row: endRow, col: Math.max(colOffset, endCol) }
             );
             focusCell(endCell);
         }
     }

     function startColumnResize(event) {
         event.preventDefault();
         event.stopPropagation();
         const col = Number(event.currentTarget?.dataset?.col);
         if (!Number.isFinite(col)) return;

         const th = headerRow.querySelector(`th:nth-child(${col + 2})`);
         if (!th) return;

         isResizing = true;
         resizingColIndex = col;
         resizingStartX = event.clientX;
         resizingStartWidth = th.getBoundingClientRect().width;

         document.addEventListener('mousemove', handleColumnResizeMove, true);
         document.addEventListener('mouseup', stopColumnResize, true);
     }

     function handleColumnResizeMove(event) {
         if (!isResizing || resizingColIndex === null) return;
         const th = headerRow.querySelector(`th:nth-child(${resizingColIndex + 2})`);
         if (!th) return;
         const delta = event.clientX - resizingStartX;
         const newWidth = Math.max(40, resizingStartWidth + delta);
         th.style.width = `${Math.round(newWidth)}px`;
         tableBody.querySelectorAll(`td[data-col="${resizingColIndex}"]`).forEach(td => {
             td.style.width = `${Math.round(newWidth)}px`;
             td.style.maxWidth = `${Math.round(newWidth)}px`;
         });
     }

     function stopColumnResize() {
         if (!isResizing || resizingColIndex === null) return;
         const th = headerRow.querySelector(`th:nth-child(${resizingColIndex + 2})`);
         if (th) {
             const widthPx = th.getBoundingClientRect().width;
             setStoredColWidth(resizingColIndex, widthPx);
         }
         isResizing = false;
         resizingColIndex = null;
         document.removeEventListener('mousemove', handleColumnResizeMove, true);
         document.removeEventListener('mouseup', stopColumnResize, true);
     }

    function ensureRowCount(count) {
        while (tableBody.children.length < count) {
            addRow();
        }
    }

    function showSuccessMessage(message) {
        showToast(message, 'success');
    }

    function showErrorMessage(message) {
        showToast(message, 'danger');
    }

    function showToast(message, type) {
        const existing = document.getElementById('parametre-excel-toast');
        if (existing) {
            existing.remove();
        }

        const alert = document.createElement('div');
        alert.id = 'parametre-excel-toast';
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 1080; min-width: 280px;';
        alert.innerHTML = `
            ${type === 'success' ? '<i class="fas fa-check-circle me-2"></i>' : '<i class="fas fa-exclamation-circle me-2"></i>'}
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), type === 'success' ? 2500 : 4000);
    }

    // Dışa aktarma (mevcut veriyi CSV olarak indir)
    function exportToExcel() {
        const data = gatherTableData();
        if (!data.length) {
            showErrorMessage('Dışa aktarılacak veri bulunamadı.');
            return;
        }

        const csvRows = data.map(row => row.join(';'));
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `parametre_tablosu_${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // API dışına açılan fonksiyonlar
    window.addRow = addRow;
    window.deleteRow = deleteRow;
    window.addColumn = addColumn;
    window.deleteColumn = deleteColumn;
    window.deleteSelectedRows = deleteSelectedRows;
    window.pasteFromClipboard = pasteFromClipboard;
    window.saveExcelData = saveExcelData;
    window.exportToExcel = exportToExcel;
})();



