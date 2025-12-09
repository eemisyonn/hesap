// PAR_SAHA tablo yönetimi
(function () {
    const DEFAULT_HEADER_LABELS = [
        { label: 'TOZ, A.MET, SÜLF.A, HF, HCL, AMON., FORM., CR6, FOSF.A., HCN' },
        { label: 'NEM' },
        { label: 'YG' },
        { label: 'TOC' },
        { label: 'VOC' },
        { label: 'PM10' },
        { label: 'ÇT' },
        { label: 'boş' },
        { label: 'boş' }
    ];

    let editModeEnabled = false;
    let currentCell = null;

    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    function getTableBody() {
        return document.querySelector('#importExportTable tbody');
    }

    function getHeaderRows() {
        return document.querySelectorAll('#importExportTable thead tr');
    }

    function getDataColumnCount() {
        const headerRows = getHeaderRows();
        if (!headerRows.length) return 0;
        return headerRows[0].children.length;
    }

    function parSahaImportFields() {
        const input = document.getElementById('parametreFieldsFile');
        if (input) {
            input.click();
        }
    }

    function parSahaHandleFieldsFile(input) {
        const file = input?.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        fetch('/import_parametre_fields', {
            method: 'POST',
            body: formData
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('İçe aktarma hatası');
                }
                return response.json();
            })
            .then((data) => {
                alert(data?.message || 'İçe aktarma tamamlandı.');
                loadImportExportTableData();
            })
            .catch((error) => {
                console.error(error);
                alert('İçe aktarma gerçekleştirilemedi. Lütfen tekrar deneyin.');
            })
            .finally(() => {
                if (input) {
                    input.value = '';
                }
            });
    }

    function parSahaExportFields() {
        fetch('/export_parametre_fields')
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Dışa aktarma hatası');
                }
                return response.blob();
            })
            .then((blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `parametre_fields_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch((error) => {
                console.error(error);
                alert('Dışa aktarma sırasında bir hata oluştu.');
            });
    }

    function parSahaClearFields() {
        if (!confirm('Tüm parametre sahabil alanlarını silmek istediğinize emin misiniz?')) {
            return;
        }

        fetch('/clear_parametre_fields', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Silme hatası');
                }
                alert('Parametre sahabil alanları temizlendi.');
                loadImportExportTableData();
            })
            .catch((error) => {
                console.error(error);
                alert('Silme işlemi gerçekleştirilemedi.');
            });
    }

    function parSahaToggleEdit() {
        editModeEnabled = !editModeEnabled;
        const table = document.getElementById('importExportTable');
        if (table) {
            table.classList.toggle('editing-mode', editModeEnabled);
        }
        table?.querySelectorAll('tbody td').forEach((cell) => {
            cell.contentEditable = editModeEnabled ? 'true' : 'false';
            cell.classList.toggle('table-warning', editModeEnabled);
        });

        const toggleBtn = document.getElementById('toggleEditImportExport');
        if (toggleBtn) {
            toggleBtn.innerHTML = editModeEnabled
                ? '<i class="fas fa-ban me-1"></i>Düzenlemeyi Kapat'
                : '<i class="fas fa-edit me-1"></i>Düzenleme';
        }
    }

    function parSahaAddRow() {
        const tbody = getTableBody();
        if (!tbody) return;

        const columnCount = getDataColumnCount();
        const row = document.createElement('tr');

        for (let i = 0; i < columnCount; i++) {
            const cell = document.createElement('td');
            cell.textContent = '';
            applyCellStyle(cell);
            row.appendChild(cell);
        }

        tbody.appendChild(row);
    }

    function parSahaAddColumn() {
        const headerRows = getHeaderRows();
        const tbody = getTableBody();
        if (!headerRows.length || !tbody) return;

        headerRows.forEach((row, index) => {
            const th = document.createElement('th');
            th.className = index === 0 ? 'table-dark' : 'table-secondary';
            th.textContent = index === 0 ? 'YENİ' : '';
            row.appendChild(th);
        });

        tbody.querySelectorAll('tr').forEach((row) => {
            const cell = document.createElement('td');
            cell.textContent = '';
            applyCellStyle(cell);
            row.appendChild(cell);
        });
    }

    function applyCellStyle(cell) {
        cell.style.minHeight = '30px';
        cell.style.height = '30px';
        cell.style.padding = '8px';
        cell.style.fontSize = '12px';
        cell.style.verticalAlign = 'middle';
        cell.style.border = '1px solid #dee2e6';
    }

    function gatherTableData() {
        const tbody = getTableBody();
        if (!tbody) return [];

        return Array.from(tbody.querySelectorAll('tr')).map((row, index) => {
            const rowData = [`${index + 1}`];
            row.querySelectorAll('td').forEach((cell) => {
                rowData.push(cell.textContent.trim());
            });
            return rowData;
        });
    }

    function parSahaSaveTable() {
        const data = gatherTableData();
        const hasContent = data.some((row) => row.slice(1).some((value) => value !== ''));

        if (!hasContent) {
            alert('Kaydetmeden önce tabloya veri girmeniz gerekiyor.');
            return;
        }

        fetch('/save_parametre_fields_table', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: data.map((row) => row.slice(1)) })
        })
            .then((response) => response.json())
            .then((result) => {
                if (result?.success) {
                    alert(result?.message || 'Tablo başarıyla kaydedildi.');
                    loadImportExportTableData();
                } else {
                    alert(result?.message || 'Tablo kaydedilemedi.');
                }
            })
            .catch((error) => {
                console.error(error);
                alert('Kaydetme işlemi sırasında bir hata oluştu.');
            });
    }

    async function parSahaPasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) {
                alert('Panoda yapıştırılacak veri bulunamadı.');
                return;
            }

            const startRow = currentCell
                ? currentCell.parentElement.rowIndex
                : 0;
            const startCol = currentCell
                ? currentCell.cellIndex
                : 0;

            const rows = text.split(/\r?\n/).filter(Boolean);
            const tbody = getTableBody();
            if (!tbody) return;

            ensureRowCount(startRow + rows.length);

            rows.forEach((rowText, rowOffset) => {
                const values = rowText.split('\t');
                const targetRow = tbody.children[startRow + rowOffset];
                ensureColumnCount(startCol + values.length);
                values.forEach((value, colOffset) => {
                    const cell = targetRow.children[startCol + colOffset];
                    if (cell) {
                        cell.textContent = value.trim();
                    }
                });
            });
        } catch (error) {
            console.error(error);
            alert('Panodan veri okunamadı. Tarayıcınız bu özelliği desteklemiyor olabilir.');
        }
    }

    function ensureRowCount(count) {
        const tbody = getTableBody();
        if (!tbody) return;
        while (tbody.children.length < count) {
            parSahaAddRow();
        }
    }

    function ensureColumnCount(count) {
        while (getDataColumnCount() < count) {
            parSahaAddColumn();
        }
    }

    function loadImportExportTableData() {
        fetch('/api/parametre_sahabil_list')
            .then((response) => response.json())
            .then((data) => {
                if (Array.isArray(data) && data.length) {
                    populateImportExportTable(data);
                } else {
                    renderEmptyTable();
                }
            })
            .catch((error) => {
                console.error(error);
                renderEmptyTable();
            });
    }

    function renderEmptyTable() {
        const tbody = getTableBody();
        if (!tbody) return;
        tbody.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            parSahaAddRow();
        }
    }

    function populateImportExportTable(tableData) {
        const tbody = getTableBody();
        if (!tbody) return;

        tbody.innerHTML = '';
        tableData.forEach((rowData) => {
            const row = document.createElement('tr');
            rowData.forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value || '';
                applyCellStyle(cell);
                row.appendChild(cell);
            });
            tbody.appendChild(row);
        });
    }

    function loadParSahaHeaders() {
        fetch('/api/par_saha_headers')
            .then((response) => response.json())
            .then((result) => {
                const headerRow = document.getElementById('parSahaHeaderRow');
                if (!headerRow) return;
                const groups = (result?.success && Array.isArray(result.groups) && result.groups.length)
                    ? result.groups
                    : DEFAULT_HEADER_LABELS;

                headerRow.innerHTML = '';
                groups.forEach((item) => {
                    const th = document.createElement('th');
                    th.className = 'table-dark';
                    th.textContent = item?.label || '';
                    th.contentEditable = true;
                    th.addEventListener('input', () => th.classList.add('table-warning'));
                    headerRow.appendChild(th);
                });
                // İkinci satır (açıklama satırı) sabit kalıyor, sadece ilk satır güncellendi.
            })
            .catch((error) => {
                console.error(error);
            });
    }

    function parSahaSaveHeaders() {
        const headerRow = document.getElementById('parSahaHeaderRow');
        if (!headerRow) return;

        const groups = Array.from(headerRow.children).map((th) => ({
            label: th.innerText.trim()
        }));

        fetch('/api/par_saha_headers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groups })
        })
            .then((response) => response.json())
            .then((result) => {
                if (result?.success) {
                    headerRow.querySelectorAll('th').forEach((th) => th.classList.remove('table-warning'));
                    alert('Başlıklar kaydedildi.');
                } else {
                    alert(result?.message || 'Başlıklar kaydedilemedi.');
                }
            })
            .catch((error) => {
                console.error(error);
                alert('Başlıklar kaydedilirken hata oluştu.');
            });
    }

    onReady(() => {
        const parSahaTab = document.getElementById('par-saha');
        if (!parSahaTab) return;

        const tbody = getTableBody();
        if (tbody) {
            tbody.addEventListener('focusin', (event) => {
                const cell = event.target.closest('td');
                if (cell) currentCell = cell;
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key.toLowerCase() === 'v' && document.activeElement?.closest('#par-saha')) {
                event.preventDefault();
                parSahaPasteFromClipboard();
            }
        });

        loadParSahaHeaders();
        loadImportExportTableData();
    });

    // Global exposure for inline handlers
    window.parSahaImportFields = parSahaImportFields;
    window.parSahaHandleFieldsFile = parSahaHandleFieldsFile;
    window.parSahaExportFields = parSahaExportFields;
    window.parSahaClearFields = parSahaClearFields;
    window.parSahaToggleEdit = parSahaToggleEdit;
    window.parSahaSaveTable = parSahaSaveTable;
    window.parSahaAddRow = parSahaAddRow;
    window.parSahaAddColumn = parSahaAddColumn;
    window.parSahaPasteFromClipboard = parSahaPasteFromClipboard;
    window.parSahaSaveHeaders = parSahaSaveHeaders;
})();



