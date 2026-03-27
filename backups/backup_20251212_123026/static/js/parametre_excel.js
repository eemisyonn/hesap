// Parametre Excel Tablosu Yönetimi
(function () {
    const DEFAULT_COLUMN_COUNT = 15;
    const DEFAULT_ROW_COUNT = 20;

    let headerRow;
    let tableBody;
    let selectAllCheckbox;
    let currentFocusedCell = null;

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
        document.addEventListener('keydown', handlePasteShortcut);
    });

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
            th.style.width = '120px';
            th.style.textAlign = 'center';
            th.style.backgroundColor = '#f8f9fa';
            th.style.fontWeight = '600';
            row.appendChild(th);
        }

        headerRow.appendChild(row);
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
        }
    }

    function handlePasteShortcut(event) {
        if (event.ctrlKey && event.key.toLowerCase() === 'v') {
            if (currentFocusedCell) {
                event.preventDefault();
                pasteFromClipboard();
            }
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
        th.style.width = '120px';
        th.style.textAlign = 'center';
        th.style.backgroundColor = '#f8f9fa';
        headerRow.querySelector('tr').appendChild(th);

        tableBody.querySelectorAll('tr').forEach(row => {
            const td = document.createElement('td');
            td.contentEditable = true;
            td.style.minHeight = '30px';
            td.style.border = '1px solid #dee2e6';
            td.style.padding = '6px';
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

            const rows = text.split(/\r?\n/).filter(Boolean);
            let rowOffset = Number(currentFocusedCell.dataset.row) - 1;
            const colOffset = Number(currentFocusedCell.dataset.col);

            ensureRowCount(rowOffset + rows.length);

            rows.forEach((rowText, rIdx) => {
                const values = rowText.split('\t');
                const targetRow = tableBody.children[rowOffset + rIdx];
                ensureColumnCount(Math.max(headerRow.querySelectorAll('th').length - 1, colOffset + values.length));
                const cells = Array.from(targetRow.querySelectorAll('td')).slice(1);
                values.forEach((value, cIdx) => {
                    if (cells[colOffset + cIdx]) {
                        cells[colOffset + cIdx].textContent = value.trim();
                    }
                });
            });
        } catch (error) {
            console.error('Panodan yapıştırma hatası:', error);
            showErrorMessage('Panodan veri okunamadı.');
        }
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



