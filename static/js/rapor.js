(function () {
    const DEFAULT_COLUMN_COUNT = 15;
    const DEFAULT_ROW_COUNT = 25;

    let headerRow;
    let tableBody;
    let selectAllCheckbox;
    let focusedCell = null;

    document.addEventListener('DOMContentLoaded', () => {
        headerRow = document.getElementById('raporHeader');
        tableBody = document.getElementById('raporBody');

        if (!headerRow || !tableBody) {
            return;
        }

        renderHeaders(DEFAULT_COLUMN_COUNT);
        renderEmptyRows(DEFAULT_ROW_COUNT);
        loadRaporData();

        tableBody.addEventListener('focusin', handleCellFocus, true);
        tableBody.addEventListener('click', handleCellFocus, true);
        document.addEventListener('keydown', handlePasteShortcut);
    });

    function getColumnLabel(index) {
        let label = '';
        let current = index;
        while (current >= 0) {
            label = String.fromCharCode(65 + (current % 26)) + label;
            current = Math.floor(current / 26) - 1;
        }
        return label;
    }

    function getColumnCount() {
        return headerRow.querySelectorAll('th').length - 1;
    }

    function renderHeaders(columnCount) {
        headerRow.innerHTML = '';
        const row = document.createElement('tr');

        const selectTh = document.createElement('th');
        selectTh.style.width = '60px';
        selectTh.style.textAlign = 'center';

        selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = 'form-check-input';
        selectAllCheckbox.addEventListener('change', () => {
            tableBody.querySelectorAll('.rapor-row-checkbox').forEach(cb => {
                cb.checked = selectAllCheckbox.checked;
            });
        });

        selectTh.appendChild(selectAllCheckbox);
        row.appendChild(selectTh);

        for (let i = 0; i < columnCount; i++) {
            const th = document.createElement('th');
            th.textContent = getColumnLabel(i);
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
        selectTd.className = 'checkbox-cell';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input rapor-row-checkbox';
        checkbox.addEventListener('change', () => {
            if (!checkbox.checked && selectAllCheckbox) {
                selectAllCheckbox.checked = false;
            }
        });

        const numberSpan = document.createElement('span');
        numberSpan.className = 'row-number';
        numberSpan.textContent = index;

        selectTd.appendChild(checkbox);
        selectTd.appendChild(numberSpan);
        tr.appendChild(selectTd);

        for (let i = 0; i < getColumnCount(); i++) {
            tr.appendChild(createCell(index, i));
        }

        return tr;
    }

    function createCell(rowIndex, colIndex) {
        const td = document.createElement('td');
        td.contentEditable = true;
        td.dataset.row = rowIndex;
        td.dataset.col = colIndex;
        td.addEventListener('focus', () => (focusedCell = td));
        td.addEventListener('click', () => (focusedCell = td));
        return td;
    }

    function updateRowNumbers() {
        tableBody.querySelectorAll('tr').forEach((row, idx) => {
            const checkbox = row.querySelector('.rapor-row-checkbox');
            const numberSpan = row.querySelector('.row-number');
            if (checkbox) checkbox.value = idx + 1;
            if (numberSpan) numberSpan.textContent = idx + 1;
            row.querySelectorAll('td[data-row]').forEach(cell => {
                cell.dataset.row = idx + 1;
            });
        });
    }

    function ensureRowCount(count) {
        while (tableBody.children.length < count) {
            tableBody.appendChild(createRow(tableBody.children.length + 1));
        }
    }

    function ensureColumnCount(count) {
        while (getColumnCount() < count) {
            addColumnInternal();
        }
    }

    function handleCellFocus(event) {
        const cell = event.target.closest('td[data-row]');
        if (cell) {
            focusedCell = cell;
        }
    }

    function handlePasteShortcut(event) {
        if (event.ctrlKey && event.key.toLowerCase() === 'v') {
            if (focusedCell) {
                event.preventDefault();
                raporPasteFromClipboard();
            }
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
        if (!Array.isArray(data) || !data.length) {
            renderHeaders(DEFAULT_COLUMN_COUNT);
            renderEmptyRows(DEFAULT_ROW_COUNT);
            return;
        }

        const maxColumns = Math.max(...data.map(row => Math.max(0, row.length - 1)));
        const columnCount = Math.max(maxColumns, 1);
        renderHeaders(columnCount);
        renderEmptyRows(Math.max(data.length, 1));

        tableBody.querySelectorAll('tr').forEach((rowElement, idx) => {
            const rowData = data[idx]?.slice(1) || [];
            const cells = Array.from(rowElement.querySelectorAll('td')).slice(1);
            cells.forEach((cell, colIdx) => {
                cell.textContent = rowData[colIdx] || '';
            });
        });
    }

    async function loadRaporData() {
        try {
            const response = await fetch('/api/load_rapor_table');
            const result = await response.json();
            if (result.success && Array.isArray(result.data) && result.data.length) {
                populateTableFromData(result.data);
            }
        } catch (error) {
            console.error('Rapor verileri yüklenirken hata:', error);
        }
    }

    async function raporSaveData() {
        const data = gatherTableData();
        const hasContent = data.some(row => row.slice(1).some(cell => cell !== ''));
        if (!hasContent) {
            showToast('Kaydetmeden önce tabloya veri ekleyin.', 'danger');
            return;
        }

        try {
            const response = await fetch('/api/save_rapor_table', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data }),
            });
            const result = await response.json();
            if (result.success) {
                showToast('Rapor tablosu kaydedildi.', 'success');
            } else {
                showToast(result.message || 'Kaydetme sırasında hata oluştu.', 'danger');
            }
        } catch (error) {
            console.error('Rapor tablosu kaydedilemedi:', error);
            showToast('Kaydetme işlemi sırasında hata oluştu.', 'danger');
        }
    }

    function addRowInternal() {
        const newRow = createRow(tableBody.children.length + 1);
        tableBody.appendChild(newRow);
        updateRowNumbers();
    }

    function deleteRowInternal() {
        if (tableBody.children.length <= 1) {
            showToast('En az bir satır olmalıdır.', 'danger');
            return;
        }
        tableBody.removeChild(tableBody.lastElementChild);
        updateRowNumbers();
    }

    function addColumnInternal() {
        const currentColumns = getColumnCount();
        const th = document.createElement('th');
        th.textContent = getColumnLabel(currentColumns);
        headerRow.querySelector('tr').appendChild(th);

        tableBody.querySelectorAll('tr').forEach(row => {
            const cell = createCell(Number(row.querySelector('.row-number').textContent), currentColumns);
            row.appendChild(cell);
        });
    }

    function deleteColumnInternal() {
        const currentColumns = getColumnCount();
        if (currentColumns <= 1) {
            showToast('En az bir sütun olmalıdır.', 'danger');
            return;
        }

        headerRow.querySelector('tr').lastElementChild.remove();
        tableBody.querySelectorAll('tr').forEach(row => {
            row.lastElementChild.remove();
        });
    }

    function raporAddRow() {
        addRowInternal();
    }

    function raporDeleteRow() {
        deleteRowInternal();
    }

    function raporAddColumn() {
        addColumnInternal();
    }

    function raporDeleteColumn() {
        deleteColumnInternal();
    }

    function raporDeleteSelectedRows() {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const rowsToDelete = rows.filter(row => row.querySelector('.rapor-row-checkbox')?.checked);
        if (!rowsToDelete.length) {
            showToast('Silmek için satır seçin.', 'warning');
            return;
        }

        rowsToDelete.forEach(row => row.remove());
        updateRowNumbers();
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
    }

    async function raporPasteFromClipboard() {
        if (!focusedCell) {
            showToast('Verileri yapıştırmak için önce bir hücre seçin.', 'warning');
            return;
        }

        try {
            let text = '';
            if (navigator.clipboard && navigator.clipboard.readText) {
                text = await navigator.clipboard.readText();
            } else if (window.clipboardData) {
                text = window.clipboardData.getData('Text');
            }

            if (!text) {
                showToast('Panoda yapıştırılacak veri bulunamadı.', 'warning');
                return;
            }

            const rows = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (!rows.length) {
                return;
            }

            const startRow = Number(focusedCell.dataset.row) - 1;
            const startCol = Number(focusedCell.dataset.col);

            ensureRowCount(startRow + rows.length);

            rows.forEach((rowText, rowOffset) => {
                const values = rowText.split('\t');
                ensureColumnCount(startCol + values.length);

                const rowElement = tableBody.children[startRow + rowOffset];
                const cells = Array.from(rowElement.querySelectorAll('td')).slice(1);

                values.forEach((value, colOffset) => {
                    if (cells[startCol + colOffset]) {
                        cells[startCol + colOffset].textContent = value.trim();
                    }
                });
            });
        } catch (error) {
            console.error('Panodan yapıştırma hatası:', error);
            showToast('Panodan veri okunamadı.', 'danger');
        }
    }

    function showToast(message, type) {
        const existing = document.getElementById('rapor-toast');
        if (existing) {
            existing.remove();
        }

        const alert = document.createElement('div');
        alert.id = 'rapor-toast';
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 80px; right: 20px; z-index: 1080; min-width: 280px;';
        alert.innerHTML = `
            ${type === 'success' ? '<i class="fas fa-check-circle me-2"></i>' : '<i class="fas fa-info-circle me-2"></i>'}
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), type === 'success' ? 2500 : 4000);
    }

    window.raporAddRow = raporAddRow;
    window.raporDeleteRow = raporDeleteRow;
    window.raporAddColumn = raporAddColumn;
    window.raporDeleteColumn = raporDeleteColumn;
    window.raporDeleteSelectedRows = raporDeleteSelectedRows;
    window.raporPasteFromClipboard = raporPasteFromClipboard;
    window.raporSaveData = raporSaveData;
})();
